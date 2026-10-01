import { settleLayout, type Browser } from './ui-driver.ts';
import { query, record, type Control, type State } from './ui-smoke-dom.ts';

export function currentControl(browser: Browser, control: Control): Control {
  const observed = query(
    browser,
    control.path,
    `element ? {
    visible:element.checkVisibility() && !Array.from(document.querySelectorAll('details:not([open])')).some(d=>d.contains(element)&&!d.querySelector(':scope > summary')?.contains(element)),
    disabled:element.matches(':disabled') || element.getAttribute('aria-disabled')==='true'
  } : {visible:false,disabled:false}`,
  );
  if (!record(observed)) throw new Error('Invalid live control state');
  return { ...control, visible: observed.visible === true, disabled: observed.disabled === true };
}
export function ancestorSummaries(control: Control): readonly string[] {
  const parts = control.path.split(' > ');
  return parts.flatMap((part, index) =>
    part.startsWith('details') ? [parts.slice(0, index + 1).join(' > ') + ' > summary'] : [],
  );
}
export function restoreNavigation(
  browser: Browser,
  state: State,
  before: unknown,
  after: unknown,
  opened: readonly string[],
  ancestors: readonly string[],
) {
  if (record(before) && record(after) && before.hash !== after.hash && opened.length === 0) {
    browser.run('back');
    browser.run(
      'wait',
      '--fn',
      `location.hash === ${JSON.stringify('#' + state.route)} && document.activeElement?.id === 'main'`,
    );
    ancestors.forEach((path) => {
      if (query(browser, path, 'element?.parentElement?.open') === false) {
        settleLayout(browser);
        browser.run('scrollintoview', path);
        browser.run('click', path);
        settleLayout(browser);
      }
    });
  }
}
export function prepareReset(browser: Browser, control: Control, state: State) {
  if (state.route === 'history' && control.name === 'Сбросить фильтры') {
    browser.run('select', '.history-filters select', 'buy');
    if (query(browser, '.history-filters select', 'element?.value') !== 'buy')
      throw new Error('Reset precondition did not select buy filter');
    return;
  }
}

export function selectedChoice(browser: Browser, control: Control) {
  return (
    query(
      browser,
      control.path,
      `Boolean(
    (element?.getAttribute('aria-pressed')==='true' && element.closest('.holdings-sort') || element?.getAttribute('aria-selected')==='true' && element.closest('.period-controls')) ||
    element?.matches('input[type=radio]:checked') ||
    element?.closest('.welcome-guide') && (
      element.textContent==='Открыть портфели' && location.hash==='#portfolios' ||
      element.textContent==='Открыть импорт' && location.hash==='#import'
    )
  )`,
    ) === true
  );
}

export function snapshotDialogs(snapshot: unknown): readonly string[] {
  if (!record(snapshot) || !Array.isArray(snapshot.dialogs))
    throw new Error('Invalid dialog snapshot');
  if (!snapshot.dialogs.every((item: unknown) => typeof item === 'string'))
    throw new Error('Invalid dialog identifiers');
  return snapshot.dialogs.filter((item: unknown): item is string => typeof item === 'string');
}
