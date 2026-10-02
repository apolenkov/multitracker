import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { capture } from './ui-smoke-report.ts';
import {
  entry,
  query,
  record,
  merge,
  type Control,
  type Outcome,
  type State,
} from './ui-smoke-dom.ts';
import { geometryFindings } from './ui-smoke-geometry.ts';
import { dialogFold, escapeDialog, operationKinds } from './ui-smoke-dialogs.ts';
import type { crawl } from './ui-smoke-crawl.ts';

type Activate = (browser: Browser, control: Control, keyboard: boolean) => void;

function dialogContent(
  browser: Browser,
  state: State,
  seen: readonly string[],
  id: string,
  descend: typeof crawl,
): Outcome {
  const report = capture(browser, state, `dialog-${id}-${seen.length}`);
  const shared = seen.find((item) => item.startsWith(`shared-body:${id}:`));
  const geometry = geometryFindings(report.dom, report.controls, browser);
  const content =
    shared || seen.some((item) => item.includes(`dialog#${id}`))
      ? {
          entries: report.controls
            .filter((item) => item.modalScope === 'inside')
            .map((item) =>
              entry(
                state,
                item,
                'skipped',
                `Shared dialog body already exercised: ${shared ?? state.id}`,
              ),
            ),
          findings: [],
        }
      : descend(browser, state, `dialog#${id}`, seen, report);
  return { entries: content.entries, findings: [...geometry, ...content.findings] };
}

export function auditDialog(
  browser: Browser,
  state: State,
  control: Control,
  seen: readonly string[],
  id: string,
  descend: typeof crawl,
  activate: Activate,
): Outcome {
  const returned = escapeDialog(browser, control, id);
  activate(browser, control, false);
  const reopened = query(browser, `dialog#${id}`, 'element?.open') === true;
  if (!reopened)
    return {
      entries: [],
      findings: [...returned, { kind: 'dialog-not-reopened', path: control.path, observed: id }],
    };
  const fold = dialogFold(browser);
  const kinds =
    id === 'buy-dialog' && !seen.some((item) => item.startsWith('#buy-dialog-type|'))
      ? operationKinds(browser, state)
      : { entries: [], findings: [] };
  const content = dialogContent(browser, state, seen, id, descend);
  const cleanup =
    query(browser, `dialog#${id}`, 'element?.open') === true
      ? escapeDialog(browser, control, id)
      : [];
  return merge([kinds, content, { entries: [], findings: [...returned, ...fold, ...cleanup] }]);
}

function manualContent(
  browser: Browser,
  state: State,
  seen: readonly string[],
  descend: typeof crawl,
) {
  const report = capture(browser, state, 'manual-edit');
  const scope = report.controls
    .find((item) => item.path.includes('dialog#asset-dialog') && item.path.includes(' > form'))
    ?.path.match(/^(.* > form[^>]+) > /)
    ?.at(1);
  if (!scope) throw new Error('Manual edit form controls were not inventoried');
  return descend(browser, state, scope, seen, report);
}

function manualEscape(browser: Browser, state: State, control: Control): Outcome {
  browser.run('press', 'Escape');
  settleLayout(browser);
  const observed = evaluate(
    browser,
    `({open:document.querySelector('#asset-dialog')?.open,
    editing:Boolean(document.querySelector('#asset-dialog .asset-price-form')),
    focus:document.activeElement===document.querySelector(${JSON.stringify(control.path)})})`,
  );
  const valid =
    record(observed) &&
    observed.open === true &&
    observed.editing === false &&
    observed.focus === true;
  return {
    entries: [
      entry(
        state,
        { ...control, name: 'Manual edit Escape' },
        valid ? 'tested' : 'failed',
        'Escape returns from manual edit to asset view and valuation trigger',
        observed,
      ),
    ],
    findings: valid ? [] : [{ kind: 'manual-edit-escape', path: control.path, observed }],
  };
}

export function manualStage(
  browser: Browser,
  state: State,
  control: Control,
  seen: readonly string[],
  before: unknown,
  after: unknown,
  descend: typeof crawl,
): Outcome {
  if (!record(before) || !record(after) || before.assetEditing || !after.assetEditing)
    return { entries: [], findings: [] };
  const initialFold = dialogFold(browser);
  const returned = manualEscape(browser, state, control);
  browser.run('click', control.path);
  settleLayout(browser);
  const reopened = query(browser, '#asset-dialog .asset-price-form', 'Boolean(element)') === true;
  if (!reopened)
    return merge([
      returned,
      {
        entries: [],
        findings: [{ kind: 'manual-edit-not-reopened', path: control.path, observed: null }],
      },
    ]);
  const fold = dialogFold(browser);
  const content = manualContent(browser, state, seen, descend);
  const cleanup =
    query(browser, '#asset-dialog .asset-price-form', 'Boolean(element)') === true
      ? manualEscape(browser, state, control)
      : { entries: [], findings: [] };
  return merge([returned, content, cleanup, { entries: [], findings: [...initialFold, ...fold] }]);
}
