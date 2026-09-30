import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { capture } from './ui-smoke-report.ts';
import { geometryFindings } from './ui-smoke-geometry.ts';
import { record, type Outcome, type State, type Finding } from './ui-smoke-dom.ts';

const first = '.history-row:first-child .record-menu > summary';
const last = '.history-row:last-child .record-menu > summary';
function rowHeight(browser: Browser) {
  return evaluate(
    browser,
    'document.querySelector(".history-row:last-child")?.getBoundingClientRect().height',
  );
}
export function menus(browser: Browser, state: State): Outcome {
  settleLayout(browser);
  browser.run('scrollintoview', last);
  const following = evaluate(
    browser,
    'document.querySelector(".history-row:nth-child(2)")?.getBoundingClientRect().top + scrollY',
  );
  const height = rowHeight(browser);
  browser.run('click', last);
  settleLayout(browser);
  const expandedHeight = rowHeight(browser);
  const report = capture(browser, state, 'last-menu');
  browser.run('click', first);
  settleLayout(browser);
  const observed = evaluate(
    browser,
    `({count:document.querySelectorAll('.history-row .record-menu[open]').length,
    lastClosed:document.querySelector('.history-row:last-child .record-menu')?.open === false})`,
  );
  assert.ok(record(observed));
  const followingAfter = evaluate(
    browser,
    'document.querySelector(".history-row:nth-child(2)")?.getBoundingClientRect().top + scrollY',
  );
  assert.ok(typeof following === 'number' && typeof followingAfter === 'number');
  const findings = [
    ...(Math.abs(followingAfter - following) > 2
      ? [
          {
            kind: 'menu-moves-following-row',
            path: first,
            observed: { before: following, after: followingAfter, dy: followingAfter - following },
          },
        ]
      : []),
    ...menuGeometry(browser, report),
    ...(height !== expandedHeight
      ? [{ kind: 'menu-in-flow', path: last, observed: { height, expandedHeight } }]
      : []),
    ...(observed.count !== 1 || observed.lastClosed !== true
      ? [{ kind: 'menus-not-exclusive', path: first, observed }]
      : []),
  ];
  return { entries: [], findings: [...findings, ...menuEscape(browser)] };
}
function menuGeometry(browser: Browser, report: ReturnType<typeof capture>) {
  const trigger = report.dom.controls
    .filter((item) => item.expanded === true && String(item.path).includes(' > summary'))
    .at(-1);
  assert.ok(typeof trigger?.parent === 'string', 'Open menu trigger was not inventoried');
  const controls = report.controls.filter((item) => item.path.startsWith(String(trigger.parent)));
  assert.ok(controls.length > 1, 'Open menu controls were not inventoried');
  return geometryFindings(report.dom, controls, browser);
}
function menuEscape(browser: Browser): readonly Finding[] {
  browser.run(
    'focus',
    '.history-row:first-child .record-menu[open] .record-menu-options button:first-child',
  );
  browser.run('press', 'Escape');
  const escaped = evaluate(
    browser,
    `({closed:!document.querySelector('.history-row .record-menu[open]'), focus:document.activeElement?.matches(${JSON.stringify(first)})})`,
  );
  assert.ok(record(escaped));
  return escaped.closed === true && escaped.focus === true
    ? []
    : [{ kind: 'menu-escape-focus', path: first, observed: escaped }];
}
