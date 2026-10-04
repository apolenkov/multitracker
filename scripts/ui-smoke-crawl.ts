import { batch, evaluate, settleLayout, type Browser } from './ui-driver.ts';
import {
  inspect,
  query,
  entry,
  merge,
  type Control,
  type Outcome,
  type State,
} from './ui-smoke-dom.ts';
import { geometryFindings } from './ui-smoke-geometry.ts';
import { disclosure } from './ui-smoke-disclosures.ts';
import {
  currentControl,
  ancestorSummaries,
  restoreNavigation,
  prepareReset,
  selectedChoice,
  snapshotDialogs,
} from './ui-smoke-context.ts';
import { dialogFold } from './ui-smoke-dialogs.ts';
import { auditDialog, manualStage } from './ui-smoke-stages.ts';

function label(control: Control) {
  return `${control.path}|${control.name}`;
}
function skipReason(browser: Browser, control: Control, scope: string): string {
  if (!control.visible)
    return 'Hidden/inactive route or closed disclosure; discovered again when revealed';
  if (control.disabled) return 'Disabled: user activation unavailable';
  if (!control.eligible) return 'Background of modal/inert: user activation unavailable';
  if (!control.path.includes(scope))
    return 'Shared navigation/preferences: exercised by matrix setup';
  if (['Закрыть', 'Отмена', 'Close', 'Cancel'].includes(control.name))
    return 'Close/cancel consequence and focus checked through Escape';
  if (control.role === 'textbox')
    return 'Form field: operation validation/P02 or dedicated test:ui scenario';
  if (
    query(
      browser,
      control.path,
      'element?.matches("button[type=submit], .close-button, .icon-close")',
    ) === true
  )
    return 'Submit/close: fold and Escape checked; save/validation covered by test:ui and P02';
  return '';
}
function semanticState(browser: Browser) {
  return evaluate(
    browser,
    `({hash:location.hash,
    heading:document.querySelector('#main h1')?.textContent,
    text:document.querySelector('dialog[open]:last-of-type')?.textContent ?? document.querySelector('#main')?.textContent,
    expanded:Array.from(document.querySelectorAll('[aria-expanded],details'),e=>[e.id,e.getAttribute('aria-expanded'),e.open]),
    controls:Array.from(document.querySelectorAll('select,input'),e=>[e.id,e.value,e.checked]),
    selection:Array.from(document.querySelectorAll('[aria-pressed],[aria-sort],[aria-selected]'),e=>[e.getAttribute('aria-label'),e.getAttribute('aria-pressed'),e.getAttribute('aria-sort'),e.getAttribute('aria-selected')]),
    assetEditing:Boolean(document.querySelector('#asset-dialog .asset-price-form')),
    dialogs:Array.from(document.querySelectorAll('dialog[open]'),e=>e.id)})`,
  );
}
function activate(browser: Browser, control: Control, keyboard: boolean) {
  settleLayout(browser, control.path);
  batch(browser, [
    ['scrollintoview', control.path],
    ...(keyboard
      ? [
          ['focus', control.path],
          ['press', 'Enter'],
        ]
      : [['click', control.path]]),
  ]);
  settleLayout(browser);
}
function selectAlternative(browser: Browser, control: Control) {
  const choices = query(
    browser,
    control.path,
    'element instanceof HTMLSelectElement ? Array.from(element.options).map(o=>({value:o.value,selected:o.selected,disabled:o.disabled})) : []',
  );
  if (!Array.isArray(choices)) throw new Error('Invalid select choices');
  const selected: unknown = choices.find(
    (value: unknown) =>
      typeof value === 'object' && value !== null && 'selected' in value && value.selected === true,
  );
  const next: unknown = choices.find(
    (value: unknown) =>
      typeof value === 'object' &&
      value !== null &&
      'selected' in value &&
      value.selected === false &&
      'disabled' in value &&
      value.disabled === false,
  );
  if (
    !selected ||
    !next ||
    typeof selected !== 'object' ||
    typeof next !== 'object' ||
    !('value' in selected) ||
    !('value' in next)
  )
    return 'Only one available option';
  browser.run('select', control.path, String(next.value));
  const value = query(browser, control.path, 'element?.value');
  browser.run('select', control.path, String(selected.value));
  if (value !== next.value) throw new Error('Select did not change');
  if (query(browser, control.path, 'element?.value') !== selected.value)
    throw new Error('Select did not restore');
  return { selected: selected.value, tested: next.value, restored: true };
}

function selectCheck(browser: Browser, state: State, control: Control): Outcome {
  const observed = selectAlternative(browser, control);
  return {
    entries: [
      entry(
        state,
        control,
        typeof observed === 'string' ? 'skipped' : 'tested',
        typeof observed === 'string' ? observed : 'Native selection and restoration',
        observed,
      ),
    ],
    findings: [],
  };
}

function changedDialogFold(browser: Browser, opened: readonly string[], stepChanged: boolean) {
  return opened.length > 0 || stepChanged ? dialogFold(browser) : [];
}
function action(
  browser: Browser,
  state: State,
  control: Control,
  seen: readonly string[],
): Outcome {
  const idempotent = selectedChoice(browser, control);
  prepareReset(browser, control, state);
  const before = semanticState(browser);
  const originalDialogs = snapshotDialogs(before);
  if (control.role === 'combobox') return selectCheck(browser, state, control);
  activate(browser, control, false);
  const after = semanticState(browser);
  const opened = snapshotDialogs(after).filter((id) => !originalDialogs.includes(id));
  const folds = changedDialogFold(browser, opened, false);
  const retained =
    idempotent &&
    selectedChoice(browser, control) &&
    JSON.stringify(before) === JSON.stringify(after);
  const changed = retained || JSON.stringify(before) !== JSON.stringify(after);
  restoreNavigation(browser, state, before, after, opened, ancestorSummaries(control));
  const children = [
    ...opened.map((id) => auditDialog(browser, state, control, seen, id, crawl, activate)),
    manualStage(browser, state, control, seen, before, after, crawl),
  ];
  return {
    entries: [
      entry(
        state,
        control,
        changed ? 'tested' : 'failed',
        idempotent
          ? 'Actual center click retains the selected choice/current route and stable semantic text'
          : 'Actual center click and observable DOM consequence',
        { before, after, opened },
      ),
      ...children.flatMap((item) => item.entries),
    ],
    findings: [
      ...folds,
      ...(!changed
        ? [{ kind: 'action-no-consequence', path: control.path, observed: control.name }]
        : []),
      ...children.flatMap((item) => item.findings),
    ],
  };
}

function attempt(
  browser: Browser,
  state: State,
  control: Control,
  seen: readonly string[],
): Outcome {
  try {
    return control.path.includes(' > summary')
      ? disclosure(browser, state, control, seen, crawl)
      : action(browser, state, control, seen);
  } catch (error: unknown) {
    const observed = error instanceof Error ? error.message : String(error);
    return {
      entries: [entry(state, control, 'failed', 'Activation/audit did not complete', observed)],
      findings: [{ kind: 'not-verified', path: control.path, observed }],
    };
  }
}
export function crawl(
  browser: Browser,
  state: State,
  scope: string,
  seen: readonly string[] = [],
  existing?: ReturnType<typeof inspect>,
): Outcome {
  const report = existing ?? inspect(browser);
  const items = report.controls.filter((item) => item.path.includes(scope));
  return items.reduce<Outcome>(
    (result, control) => {
      const checked = [
        ...seen,
        ...result.entries
          .filter((item) => item.status !== 'skipped')
          .map((item) => `${item.path}|${item.name}`),
      ];
      if (checked.includes(label(control))) return result;
      const live =
        control.visible && control.modalScope !== 'background'
          ? currentControl(browser, control)
          : control;
      const reason = skipReason(browser, live, scope);
      if (reason)
        return merge([result, { entries: [entry(state, live, 'skipped', reason)], findings: [] }]);
      const next = attempt(browser, state, live, [...checked, label(control)]);
      return merge([result, next]);
    },
    { entries: [], findings: geometryFindings(report.dom, items, browser) },
  );
}
