// Мини-арена волны 2: полные скриншоты затронутых экранов
// (1440/375 × RU/EN × светлая/тёмная) в docs/reviews/2026-10-05-arena-fixes/wave2/.
import { createBrowser, settleLayout, type Browser } from './ui-driver.ts';
import { rehash } from './ui-helpers.ts';

const url = process.env.MULTITRACKER_UI_URL ?? 'http://127.0.0.1:5179';
const dir = 'docs/reviews/2026-10-05-arena-fixes/wave2';
const routes = ['overview', 'portfolios', 'history', 'import', 'connections', 'sync'];
const sizes: readonly (readonly [number, number])[] = [
  [1440, 900],
  [375, 800],
];
const combos = sizes.flatMap(([width, height]) =>
  (['ru', 'en'] as const).flatMap((language) =>
    (['light', 'dark'] as const).map((theme) => ({ width, height, language, theme })),
  ),
);

function combo(browser: Browser, width: number, height: number, language: string, theme: string) {
  browser.run('set', 'viewport', String(width), String(height));
  browser.run('open', url);
  browser.run(
    'wait',
    '--fn',
    'document.fonts.status === "loaded" && !!document.querySelector(".desktop-links a")',
  );
  browser.run('select', '#topbar-language', language);
  browser.run('wait', '--fn', `document.documentElement.lang === '${language}'`);
  browser.run('select', '#topbar-theme', theme);
  browser.run('wait', '--fn', `document.documentElement.dataset.theme === '${theme}'`);
  const tag = `${width}-${language}-${theme}`;
  for (const route of routes) {
    rehash(browser, route);
    browser.run('screenshot', `${dir}/${route}-${tag}.png`);
  }
  rehash(browser, 'overview');
  browser.run('click', '.summary-result button.primary');
  browser.run('wait', '--fn', 'document.getElementById("buy-dialog")?.open === true');
  settleLayout(browser);
  browser.run('screenshot', `${dir}/dialog-buy-${tag}.png`);
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', '!document.querySelector("dialog[open]")');
  rehash(browser, 'history');
  browser.run('click', '.history-row-open');
  browser.run('wait', '--fn', 'document.getElementById("record-dialog")?.open === true');
  settleLayout(browser);
  browser.run('screenshot', `${dir}/dialog-record-${tag}.png`);
}

const browser = createBrowser();
try {
  for (const { width, height, language, theme } of combos) {
    combo(browser, width, height, language, theme);
  }
} finally {
  browser.run('close');
}
console.log('screenshots done');
