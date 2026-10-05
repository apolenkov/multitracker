import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { hashGo, prepare, rehash } from './ui-helpers.ts';

// Панель баланса и соседи: высота и верхняя кромка блоков ниже в координатах документа.
const hiddenProbes = `(() => {
  const rect = (s) => document.querySelector(s).getBoundingClientRect();
  return {
    panel: Math.round(rect('.balance-panel').height),
    history: Math.round(rect('.value-history').height),
    holdingsTop: Math.round(rect('.holdings').top + scrollY),
  };
})()`;

function toggleHidden(browser: Browser, checked: boolean) {
  hashGo(browser, 'settings');
  browser.run('scrollintoview', '#settings-hidden');
  settleLayout(browser);
  browser.run(checked ? 'check' : 'uncheck', '#settings-hidden');
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('#settings-hidden')?.checked === ${String(checked)}`,
  );
  hashGo(browser, 'overview');
}

type Probes = Readonly<{ panel: number; history: number; holdingsTop: number }>;

// evaluate отдаёт unknown: поля проверяются по одному, без приведения типов.
function measureProbes(browser: Browser): Probes {
  const raw = evaluate(browser, hiddenProbes);
  assert.ok(typeof raw === 'object' && raw !== null, 'probes: нужен объект');
  const nums = new Map(
    Object.entries(raw).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  );
  const value = (key: keyof Probes) => {
    const entry = nums.get(key);
    assert.ok(typeof entry === 'number', `probes: нет числа ${key}`);
    return entry;
  };
  return { panel: value('panel'), history: value('history'), holdingsTop: value('holdingsTop') };
}

// Скрытие сумм не должно сдвигать панель баланса и то, что ниже её — в RU и EN.
export function hiddenAmountsStable(browser: Browser) {
  prepare(browser);
  const run = (width: number, language: 'ru' | 'en') => {
    browser.run('set', 'viewport', String(width), '900');
    browser.run('select', '#topbar-language', language);
    browser.run('wait', '--fn', `document.documentElement.lang === '${language}'`);
    rehash(browser, 'overview');
    const visible = measureProbes(browser);
    toggleHidden(browser, true);
    const hidden = measureProbes(browser);
    toggleHidden(browser, false);
    const diffs = {
      panel: hidden.panel - visible.panel,
      history: hidden.history - visible.history,
      holdingsTop: hidden.holdingsTop - visible.holdingsTop,
    };
    for (const [key, diff] of Object.entries(diffs)) {
      assert.ok(
        Math.abs(diff) <= 2,
        `${width}px ${language}: ${key} при скрытии сумм изменился на ${diff} px`,
      );
    }
    return { width, language, visible, hidden };
  };
  const results = [run(1440, 'ru'), run(375, 'ru'), run(1440, 'en'), run(375, 'en')];
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  browser.run('set', 'viewport', '1440', '900');
  return results;
}
