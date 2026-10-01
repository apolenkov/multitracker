import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { capture, save } from './ui-smoke-report.ts';
import { positionState, shifts } from './ui-smoke-geometry.ts';
import type { Finding, Outcome, State } from './ui-smoke-dom.ts';
import { menuGeometry } from './ui-smoke-menus.ts';

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
// Меню вынесено в портал, поэтому прежнюю регрессию «меню в потоке строки» воспроизвести нельзя.
// Проба снимает позиционирование Radix: меню оказывается в конце документа, и проверка
// геометрии меню обязана покраснеть.
function menuProbe(browser: Browser, url: string): readonly Finding[] {
  const trigger = '.history-row:last-child button.action-menu-trigger';
  const css =
    '[data-radix-popper-content-wrapper] { position: static !important; transform: none !important }';
  browser.run('set', 'viewport', '1440', '900');
  browser.run('open', `${url.split('#')[0]}#history`);
  browser.run('reload');
  browser.run('scrollintoview', trigger);
  browser.run('click', trigger);
  browser.run('wait', '[role="menu"]');
  const current = menuGeometry(browser);
  try {
    evaluate(browser, `(${temporaryStyle.toString()})(${JSON.stringify(css)})`);
    settleLayout(browser);
    const historical = menuGeometry(browser);
    save('historical-F2-menu', { explicitlyHistorical: true, css, current, historical });
    return [
      ...current,
      ...(historical.length === 0
        ? [{ kind: 'negative-control-not-detected', path: 'historical-F2-menu', observed: css }]
        : []),
    ];
  } finally {
    evaluate(browser, 'document.getElementById("smoke-historical-css")?.remove(); true');
    browser.run('press', 'Escape');
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
  return { entries: [], findings: [...findings, ...menuProbe(browser, url)] };
}
