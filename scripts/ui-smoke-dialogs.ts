import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { operationTypes } from '../src/forms/operations.ts';
import { capture, save } from './ui-smoke-report.ts';
import { record, type Control, type Finding, type State, type Outcome } from './ui-smoke-dom.ts';

function rectangle(box: DOMRect) {
  return {
    x: box.x,
    y: box.y,
    top: box.top,
    bottom: box.bottom,
    width: box.width,
    height: box.height,
  };
}
function primaryVisible(primary: HTMLElement | null, frame: DOMRect) {
  if (!primary) return true;
  const box = primary.getBoundingClientRect();
  const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
  return (
    box.top >= Math.max(0, frame.top) &&
    box.bottom <= Math.min(innerHeight, frame.bottom) + 2 &&
    Boolean(hit && primary.contains(hit))
  );
}
function fold() {
  const dialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);
  if (!dialog) return null;
  const footer = [
    ...dialog.querySelectorAll<HTMLElement>('.form-actions button,.dialog-actions button'),
  ]
    .filter((element) => element.checkVisibility())
    .at(-1);
  const primary =
    footer ?? dialog.querySelector<HTMLElement>('button[type="submit"],button.primary');
  const box = primary?.getBoundingClientRect();
  const frame = dialog.getBoundingClientRect();
  return {
    id: dialog.id,
    primary: primary?.textContent?.trim() ?? null,
    scrollTop: dialog.scrollTop,
    clientHeight: dialog.clientHeight,
    scrollHeight: dialog.scrollHeight,
    box: box ? rectangle(box) : null,
    frame: rectangle(frame),
    visibleWithoutScroll: primaryVisible(primary, frame),
  };
}
export function nestedDialogs(browser: Browser): readonly Finding[] {
  const open = evaluate(
    browser,
    `[...document.querySelectorAll('dialog[open]')].map((dialog) => dialog.id)`,
  );
  return Array.isArray(open) && open.length > 1
    ? [{ kind: 'nested-dialog', path: open.join(' + '), observed: open }]
    : [];
}
export function dialogFold(browser: Browser): readonly Finding[] {
  const nested = nestedDialogs(browser);
  const observed = evaluate(
    browser,
    `(() => { const rectangle = ${rectangle.toString()}; const primaryVisible = ${primaryVisible.toString()}; return (${fold.toString()})(); })()`,
  );
  if (observed === null) return nested;
  assert.ok(record(observed));
  save(`fold-${Date.now()}`, observed);
  return observed.visibleWithoutScroll === true
    ? nested
    : [...nested, { kind: 'dialog-primary-below-fold', path: String(observed.id), observed }];
}
export function operationKinds(browser: Browser, state: State): Outcome {
  const outcomes = operationTypes.map((type) => {
    browser.run('select', '#buy-dialog-type', type);
    const selected = evaluate(browser, 'document.querySelector("#buy-dialog-type")?.value');
    const findings = dialogFold(browser);
    capture(browser, state, `operation-${type}`);
    return {
      findings,
      entries: [
        {
          state: state.id,
          path: '#buy-dialog-type',
          name: type,
          status: selected === type ? ('tested' as const) : ('failed' as const),
          reason: 'Native operation type selection; primary visibility before inspection/scroll',
          observed: selected,
        },
      ],
    };
  });
  browser.run('select', '#buy-dialog-type', 'buy');
  return {
    entries: outcomes.flatMap((item) => item.entries),
    findings: outcomes.flatMap((item) => item.findings),
  };
}

export function escapeDialog(browser: Browser, opener: Control, id: string): readonly Finding[] {
  browser.run('press', 'Escape');
  settleLayout(browser);
  const observed = evaluate(
    browser,
    `({closed:!document.getElementById(${JSON.stringify(id)})?.open,
      focus:document.activeElement===document.querySelector(${JSON.stringify(opener.path)}),
      active:document.activeElement?.id})`,
  );
  assert.ok(record(observed));
  save(`escape-${Date.now()}`, { id, opener: opener.path, observed });
  return observed.closed === true && observed.focus === true
    ? []
    : [{ kind: 'escape-return-focus', path: opener.path, observed }];
}
