import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { capture } from './ui-smoke-report.ts';
import { record, type Outcome, type State, type Finding } from './ui-smoke-dom.ts';

const first = '.history-row:first-child button.action-menu-trigger';
const last = '.history-row:last-child button.action-menu-trigger';
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
  browser.run('wait', '[role="menu"]');
  settleLayout(browser);
  const expandedHeight = rowHeight(browser);
  capture(browser, state, 'last-menu');
  const geometry = menuGeometry(browser);
  browser.run('click', first);
  browser.run('wait', `${first}[aria-expanded="true"]`);
  settleLayout(browser);
  const observed = evaluate(
    browser,
    `({count:document.querySelectorAll('[role="menu"]').length,
    lastClosed:document.querySelector('${last}')?.getAttribute('aria-expanded') === 'false'})`,
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
    ...geometry,
    ...(height !== expandedHeight
      ? [{ kind: 'menu-in-flow', path: last, observed: { height, expandedHeight } }]
      : []),
    ...(observed.count !== 1 || observed.lastClosed !== true
      ? [{ kind: 'menus-not-exclusive', path: first, observed }]
      : []),
  ];
  return { entries: [], findings: [...findings, ...menuEscape(browser)] };
}
function menuGeometry(browser: Browser): readonly Finding[] {
  const observed = evaluate(
    browser,
    `(() => {
      const navigation = document.querySelector('.navigation');
      const fixed = navigation && getComputedStyle(navigation).position === 'fixed';
      const limit = fixed ? navigation.getBoundingClientRect().top : innerHeight;
      const menu = document.querySelector('[role="menu"]')?.getBoundingClientRect();
      const items = [...document.querySelectorAll('[role="menu"] [role="menuitem"]')];
      return {
        items: items.length,
        inside: Boolean(menu) && menu.left >= 0 && menu.right <= innerWidth && menu.bottom <= limit,
        reachable: items.every(item => {
          const box = item.getBoundingClientRect();
          return box.height >= 44 && item.contains(document.elementFromPoint(
            box.left + box.width / 2, box.top + box.height / 2));
        }),
      };
    })()`,
  );
  assert.ok(record(observed));
  return typeof observed.items === 'number' &&
    observed.items > 1 &&
    observed.inside === true &&
    observed.reachable === true
    ? []
    : [{ kind: 'menu-geometry', path: last, observed }];
}
function menuEscape(browser: Browser): readonly Finding[] {
  browser.run('focus', '[role="menu"] [role="menuitem"]');
  browser.run('press', 'Escape');
  const escaped = evaluate(
    browser,
    `({closed:!document.querySelector('[role="menu"]'), focus:document.activeElement?.matches(${JSON.stringify(first)})})`,
  );
  assert.ok(record(escaped));
  return escaped.closed === true && escaped.focus === true
    ? []
    : [{ kind: 'menu-escape-focus', path: first, observed: escaped }];
}
