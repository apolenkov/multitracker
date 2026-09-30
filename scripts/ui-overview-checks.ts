import assert from 'node:assert/strict';
import type { Browser } from './ui-driver.ts';
import { content, go, prepare, truth } from './ui-exploration.ts';

export function narrowAllocation(browser: Browser) {
  prepare(browser);
  browser.run('select', '#settings-display-currency', 'RUB');
  go(browser, 'overview');
  browser.run('set', 'viewport', '320', '480');
  browser.run('select', '#topbar-language', 'en');
  browser.run('wait', '--fn', 'document.querySelector("#main h1")?.textContent === "Overview"');
  truth(
    browser,
    'document.documentElement.scrollWidth <= innerWidth + 1 && Array.from(document.querySelectorAll(".allocation-legend dd, .allocation-legend dd span")).every(element => element.checkVisibility() && element.scrollWidth <= element.clientWidth + 1 && element.getBoundingClientRect().left >= 0 && element.getBoundingClientRect().right <= innerWidth)',
    'На 320 px состав портфеля должен показывать полные суммы без переполнения',
  );
  const allocation = content(browser, '.allocation-legend');
  assert.ok(allocation.replaceAll(/\s/g, '').includes('RUB108,000.00'));
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.querySelector("#main h1")?.textContent === "Обзор"');
  return { width: 320, language: 'en', allocation };
}
