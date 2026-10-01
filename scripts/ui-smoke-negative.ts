import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { capture, save } from './ui-smoke-report.ts';
import { positionState, shifts } from './ui-smoke-geometry.ts';
import type { Finding, Outcome, State } from './ui-smoke-dom.ts';
import { rowActionGeometry } from './ui-smoke-row-actions.ts';

const probes = [
  {
    route: 'overview',
    selector: '.chart-disclosure > summary',
    css: '.balance-panel { grid-template-rows: auto auto !important }',
    id: 'historical-F1',
  },
];
function temporaryStyle(css: string) {
  const style = document.createElement('style');
  style.setAttribute('id', 'smoke-historical-css');
  style.append(document.createTextNode(css));
  document.head.append(style);
  return 'Isolated historical CSS; application files unchanged';
}
function measure(browser: Browser, state: State, selector: string, label: string) {
  settleLayout(browser);
  browser.run('scrollintoview', selector);
  const before = positionState(browser, selector);
  browser.run('click', selector);
  settleLayout(browser);
  const after = positionState(browser, selector, before);
  capture(browser, state, label);
  browser.run('click', selector);
  settleLayout(browser);
  const restored = positionState(browser, selector, before);
  return {
    before,
    after,
    restored,
    findings: shifts(before, after, selector),
    restoration: shifts(before, restored, selector),
  };
}
// Отрицательная проба действий строк: уменьшенные значки обязаны покраснеть в проверке геометрии.
function rowActionProbe(browser: Browser, url: string): readonly Finding[] {
  const css =
    '.row-action { width: 24px !important; height: 24px !important; min-height: 0 !important }';
  browser.run('set', 'viewport', '1440', '900');
  browser.run('open', `${url.split('#')[0]}#history`);
  browser.run('reload');
  browser.run('wait', '#main .row-action');
  const current = rowActionGeometry(browser, 'history');
  try {
    evaluate(browser, `(${temporaryStyle.toString()})(${JSON.stringify(css)})`);
    const historical = rowActionGeometry(browser, 'history');
    save('negative-row-actions', { explicitlyHistorical: true, css, current, historical });
    return [
      ...current,
      ...(historical.length === 0
        ? [{ kind: 'negative-control-not-detected', path: 'negative-row-actions', observed: css }]
        : []),
    ];
  } finally {
    evaluate(browser, 'document.getElementById("smoke-historical-css")?.remove(); true');
  }
}
export function negativeControls(browser: Browser, url: string): Outcome {
  const findings = probes.flatMap((probe): readonly Finding[] => {
    const state = { id: probe.id, route: probe.route, width: 1440, theme: 'light' };
    browser.run('set', 'viewport', '1440', '900');
    browser.run('open', `${url.split('#')[0]}#${probe.route}`);
    browser.run('reload');
    browser.run('select', '#topbar-theme', 'light');
    const current = measure(browser, state, probe.selector, 'current');
    try {
      evaluate(browser, `(${temporaryStyle.toString()})(${JSON.stringify(probe.css)})`);
      const historical = measure(browser, state, probe.selector, 'negative');
      save(probe.id, { explicitlyHistorical: true, css: probe.css, current, historical });
      return [
        ...current.findings,
        ...current.restoration,
        ...(historical.findings.length === 0
          ? [{ kind: 'negative-control-not-detected', path: probe.id, observed: historical }]
          : []),
      ];
    } finally {
      evaluate(browser, 'document.getElementById("smoke-historical-css")?.remove(); true');
    }
  });
  assert.equal(evaluate(browser, 'document.getElementById("smoke-historical-css") === null'), true);
  return { entries: [], findings: [...findings, ...rowActionProbe(browser, url)] };
}
