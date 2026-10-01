import { capture, save } from './ui-smoke-report.ts';
import { query, entry, type Control, type Outcome, type State } from './ui-smoke-dom.ts';
import { geometryFindings, positionState, shifts } from './ui-smoke-geometry.ts';
import { batch, settleLayout, type Browser } from './ui-driver.ts';
import type { crawl } from './ui-smoke-crawl.ts';

function toggle(browser: Browser, control: Control, keyboard: boolean) {
  settleLayout(browser);
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
function measure(browser: Browser, state: State, control: Control, seen: readonly string[]) {
  settleLayout(browser);
  browser.run('scrollintoview', control.path);
  const before = positionState(browser, control.path);
  const initial = query(browser, control.path, 'element?.parentElement?.open');
  toggle(browser, control, seen.length % 2 === 0);
  const after = positionState(browser, control.path, before);
  const changed = query(browser, control.path, 'element?.parentElement?.open') !== initial;
  const report = capture(browser, state, `disclosure-${seen.length}-open`);
  if (changed) toggle(browser, control, false);
  const restored = positionState(browser, control.path, before);
  const restoredOpen = query(browser, control.path, 'element?.parentElement?.open');
  save(`${state.id}-disclosure-${seen.length}-geometry`, { before, after, restored });
  return { before, after, restored, initial, changed, report, restoredOpen };
}
export function disclosure(
  browser: Browser,
  state: State,
  control: Control,
  seen: readonly string[],
  descend: typeof crawl,
): Outcome {
  const observed = measure(browser, state, control, seen);
  const { initial, changed, report, before, after, restored } = observed;
  if (changed && initial === false) toggle(browser, control, false);
  const children = changed
    ? descend(
        browser,
        state,
        control.path.replace(/ > summary.*$/, ''),
        seen,
        initial === false ? report : undefined,
      )
    : { entries: [], findings: [] };
  if (
    query(
      browser,
      control.path,
      'element?.checkVisibility({checkVisibilityCSS:true}) && element?.parentElement?.open',
    ) === true &&
    initial === false
  )
    toggle(browser, control, false);
  const findings = disclosureFindings(browser, control, observed, children);
  return {
    entries: [
      entry(
        state,
        control,
        changed ? 'tested' : 'failed',
        'Actual center click/Enter, opening, neighbor movement and restoration before child actions',
        { before, after, restored },
      ),
      ...children.entries,
    ],
    findings,
  };
}

function disclosureFindings(
  browser: Browser,
  control: Control,
  observed: ReturnType<typeof measure>,
  children: Outcome,
) {
  const { before, after, restored, report, initial, restoredOpen, changed } = observed;
  return [
    ...shifts(before, after, control.path),
    ...shifts(before, restored, control.path),
    ...geometryFindings(
      report.dom,
      report.controls.filter((item) =>
        item.path.startsWith(control.path.replace(/ > summary.*$/, '')),
      ),
      browser,
    ),
    ...children.findings,
    ...(restoredOpen !== initial
      ? [
          {
            kind: 'disclosure-not-restored',
            path: control.path,
            observed: { initial, restoredOpen },
          },
        ]
      : []),
    ...(!changed
      ? [{ kind: 'disclosure-no-consequence', path: control.path, observed: initial }]
      : []),
  ];
}
