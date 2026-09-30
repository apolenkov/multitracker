import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { reveal } from './ui-exploration.ts';

function navigate(browser: Browser, screen: 'settings' | 'overview') {
  browser.run('click', `.desktop-links a[href="#${screen}"]`);
  const ready =
    screen === 'overview'
      ? 'Boolean(document.querySelector(".summary, .summary-result"))'
      : 'document.querySelector("#settings-display-currency")?.checkVisibility() === true';
  browser.run(
    'wait',
    '--fn',
    `location.hash === '#${screen}' && document.activeElement?.id === 'main' && ${ready}`,
  );
  if (screen === 'overview') reveal(browser, '.chart-disclosure > summary');
}

function summary(browser: Browser) {
  return evaluate(
    browser,
    'Array.from(document.querySelectorAll(".summary, .summary-result, .basis-details")).filter(element => element.checkVisibility()).map(element => element.innerText).join(" ")',
  );
}

export function independentCurrencies(browser: Browser) {
  navigate(browser, 'settings');
  browser.run('select', '#settings-base-currency', 'RUB');
  browser.run('select', '#settings-display-currency', 'USD');
  navigate(browser, 'overview');
  const dollarValue = String(summary(browser)).replaceAll(/\s/g, '');
  assert.match(dollarValue, /3440[,.]00/);
  assert.match(dollarValue, /\+86420[,.]00/);
  navigate(browser, 'settings');
  browser.run('select', '#settings-base-currency', 'USD');
  browser.run('select', '#settings-display-currency', 'RUB');
  navigate(browser, 'overview');
  const rubleValue = String(summary(browser)).replaceAll(/\s/g, '');
  assert.match(rubleValue, /412800[,.]00/);
  assert.match(rubleValue, /\+74[,.]00/);
  assert.doesNotMatch(rubleValue, /\+86420[,.]00/);
  navigate(browser, 'settings');
  browser.run('select', '#settings-base-currency', 'RUB');
  navigate(browser, 'overview');
  return 'Display USD/base RUB: 3440 and +86420; display RUB/base USD: 412800 and +74';
}

function surface(browser: Browser) {
  return evaluate(
    browser,
    'getComputedStyle(document.querySelector(".app-shell")).getPropertyValue("--paper").trim()',
  );
}

function assertAppearance(browser: Browser, paper: unknown, scheme: 'light' | 'dark') {
  browser.run(
    'wait',
    '--fn',
    `getComputedStyle(document.documentElement).colorScheme === '${scheme}' &&
      document.querySelector('meta[name="theme-color"]')?.content ===
        getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim()`,
  );
  assert.equal(surface(browser), paper);
  assert.deepEqual(
    evaluate(
      browser,
      `({root:getComputedStyle(document.documentElement).colorScheme,
        app:getComputedStyle(document.querySelector('.app-shell')).colorScheme,
        metadata:document.querySelector('meta[name="theme-color"]').content ===
          getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim()})`,
    ),
    { root: scheme, app: scheme, metadata: true },
    'Surfaces, native controls and browser theme color must agree',
  );
}

export function appearanceThemes(browser: Browser) {
  browser.run('select', '#topbar-theme', 'dark');
  const dark = surface(browser);
  browser.run('select', '#topbar-theme', 'light');
  const light = surface(browser);
  assert.ok(dark && light);
  assert.notEqual(dark, light, 'Light and dark must render different surfaces');
  browser.run('set', 'media', 'dark');
  assertAppearance(browser, light, 'light');
  browser.run('select', '#topbar-theme', 'system');
  const prefersDark = evaluate(browser, 'matchMedia("(prefers-color-scheme: dark)").matches');
  assertAppearance(browser, prefersDark ? dark : light, prefersDark ? 'dark' : 'light');
  browser.run('set', 'media', 'dark');
  assertAppearance(browser, dark, 'dark');
  browser.run('set', 'media', 'light');
  assertAppearance(browser, light, 'light');
  navigate(browser, 'settings');
  assert.equal(evaluate(browser, 'document.querySelector("#settings-theme")?.value'), 'system');
  browser.run('select', '#settings-theme', 'dark');
  navigate(browser, 'overview');
  assert.equal(evaluate(browser, 'document.querySelector("#topbar-theme")?.value'), 'dark');
  assertAppearance(browser, dark, 'dark');
  return 'Light/dark/system: surfaces, native controls and theme-color agree; explicit choice ignores OS';
}
