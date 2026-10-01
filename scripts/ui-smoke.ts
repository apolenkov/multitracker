import assert from 'node:assert/strict';
import { batch, createBrowser, settleLayout } from './ui-driver.ts';
import { crawl } from './ui-smoke-crawl.ts';
import { capture, evidence, finish, save } from './ui-smoke-report.ts';
import type { Outcome, State } from './ui-smoke-dom.ts';
import { operationExtras } from './ui-operation-checks.ts';
import { createCheck } from './ui-results.ts';
import { negativeControls } from './ui-smoke-negative.ts';
import { rowActionGeometry } from './ui-smoke-row-actions.ts';
import { merge } from './ui-smoke-dom.ts';
import { initialSkipFocus } from './ui-overview-checks.ts';

const routes = ['overview', 'portfolios', 'history', 'import', 'connections', 'sync', 'settings'];
const regular = [1440, 375].flatMap((width) =>
  routes.map((route) => ({ id: `${route}-${width}-light`, route, width, theme: 'light' })),
);
const extra = [1440, 375, 320].flatMap((width) =>
  ['overview', 'history'].map((route) => ({
    id: `${route}-${width}-dark`,
    route,
    width,
    theme: 'dark',
  })),
);
const narrow = ['overview', 'history'].map((route) => ({
  id: `${route}-320-light`,
  route,
  width: 320,
  theme: 'light',
}));
const base = new URL(process.env.MULTITRACKER_UI_URL ?? 'http://127.0.0.1:5173');
assert.ok(['http:', 'https:'].includes(base.protocol));
assert.equal(base.username + base.password, '');
const browser = createBrowser();

function navigate(state: State) {
  const extraRoute = !['overview', 'portfolios', 'history'].includes(state.route);
  if (state.width < 768 && extraRoute)
    browser.run('find', 'role', 'button', 'click', '--name', 'Ещё', '--exact');
  const scope = state.width >= 768 ? '.desktop-links' : extraRoute ? '.more-menu' : '.mobile-links';
  browser.run('click', `${scope} a[href="#${state.route}"]`);
  browser.run('wait', '--fn', `location.hash === ${JSON.stringify('#' + state.route)}`);
}

function stateCheck(state: State, shared: readonly string[]): Outcome {
  const start = Date.now();
  batch(browser, [
    ['set', 'viewport', String(state.width), '900'],
    ['open', `${base.origin}${base.pathname}#overview`],
    ['reload'],
    ['select', '#topbar-theme', state.theme],
    ['select', '#topbar-language', 'ru'],
  ]);
  navigate(state);
  browser.run('wait', '#main h1');
  settleLayout(browser);
  const initial = capture(browser, state, 'before');
  // Геометрия действий — до обхода: клики «Удалить» накрывают строки уведомлением.
  const actions = { entries: [], findings: rowActionGeometry(browser, state.route) };
  const content = merge([
    crawl(browser, state, 'main#main', shared, initial),
    ...(state.route === 'overview' ? [crawl(browser, state, 'footer', shared)] : []),
  ]);
  const result = merge([content, actions]);
  capture(browser, state, 'after');
  save(`${state.id}-coverage`, { ...result, durationSeconds: (Date.now() - start) / 1000 });
  console.log(`${state.id}: ${result.entries.length} controls; ${result.findings.length} findings`);
  return result;
}
function attemptState(state: State, shared: readonly string[]): Outcome {
  try {
    return stateCheck(state, shared);
  } catch (error: unknown) {
    const observed = error instanceof Error ? error.message : String(error);
    const result = {
      entries: [],
      findings: [{ kind: 'state-not-verified', path: state.id, observed }],
    };
    save(`${state.id}-coverage`, result);
    console.error(`${state.id}: NOT VERIFIED`, observed);
    return result;
  }
}

function sharedProofs(state: State, outcomes: readonly Outcome[]) {
  const prior = outcomes
    .flatMap((item) => item.entries)
    .filter(
      (item) => item.state.endsWith(`-${state.width}-${state.theme}`) && item.status === 'tested',
    );
  return [
    ...new Set(
      prior.flatMap((item) => {
        const dialog = item.path.match(/dialog#([a-zA-Z0-9-]+)/)?.at(1);
        return [
          ...(dialog ? [`shared-body:${dialog}:${item.state}`] : []),
          ...(item.path === '#buy-dialog-type' ? [`${item.path}|${item.name}`] : []),
        ];
      }),
    ),
  ];
}
function guardChecks(): Outcome {
  const check = createCheck(browser);
  const checks = [
    check('skip-link-focus', () => initialSkipFocus(browser, base.href), true),
    check('operation-additional-guards', () => operationExtras(browser), true),
  ];
  checks.forEach((item) => save(item.id, item));
  return {
    entries: [],
    findings: checks
      .filter((item) => item.status !== 'PASS')
      .map((item) => ({ kind: item.id, path: '#main', observed: item })),
  };
}

function main() {
  const start = Date.now();
  try {
    const outcomes = [...regular, ...extra, ...narrow].reduce<readonly Outcome[]>(
      (previous, state) => [...previous, attemptState(state, sharedProofs(state, previous))],
      [],
    );
    const guardOutcome = guardChecks();
    const negatives =
      process.env.MULTITRACKER_SMOKE_NEGATIVE === '1'
        ? negativeControls(browser, base.href)
        : { entries: [], findings: [] };
    const passed = finish(browser, [...outcomes, guardOutcome, negatives], start);
    return passed;
  } catch (error: unknown) {
    save('fatal', {
      error: error instanceof Error ? error.message : String(error),
      durationSeconds: (Date.now() - start) / 1000,
    });
    console.error('Smoke incomplete; evidence:', evidence, error);
    return false;
  }
}
function closeBrowser() {
  try {
    browser.run('close');
    return true;
  } catch (error: unknown) {
    save('close-failed', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
const passed = main();
const exitCode = closeBrowser() && passed ? 0 : 1;
process.stderr.write('', () => process.stdout.write('', () => process.exit(exitCode)));
