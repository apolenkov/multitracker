import assert from 'node:assert/strict';
import { settleLayout, type Browser } from './ui-driver.ts';
import { content, go, prepare, truth } from './ui-helpers.ts';

export function mappingSamples(browser: Browser, scope: 'page', hidden = false) {
  const sample = (field: string) =>
    content(browser, `label:has(#import-${scope}-map-${field}) small`).trim();
  const quantity = sample('quantity');
  const price = sample('price');
  const asset = sample('asset');
  assert.equal(quantity, hidden ? '••••' : '2', 'Пример количества должен соответствовать CSV');
  assert.equal(price, hidden ? '••••' : '450', 'Пример цены должен соответствовать CSV');
  assert.equal(asset, 'MSFT', 'Название актива должен оставаться видимым');
  return { scope, quantity, price, asset };
}

const details = '#import-history[open]';
const priceCells = `${details} .import-source-table tbody td:nth-child(4)`;
const cardLines = `${details} .import-rows li > p:first-of-type`;
const noBreakPair = (selector: string) =>
  `(() => { const items = [...document.querySelectorAll('${selector}')];
    return items.length > 0 && items.every((el) => /\\d\\u00A0[A-Z]{3}/u.test(el.textContent ?? '')); })()`;

const openDetails = (browser: Browser) => {
  browser.run('click', '#import-history-details');
  browser.run('wait', details);
  settleLayout(browser);
};

// F4: сумма и код валюты соединены U+00A0 — пара никогда не разрывается
// по строкам ни в таблице, ни в карточках, на обоих языках.
export function importPriceNoBreak(browser: Browser) {
  prepare(browser);
  go(browser, 'import');
  openDetails(browser);
  truth(browser, noBreakPair(priceCells), 'RU 1440 таблица: сумма и валюта неразрывны');
  browser.run('set', 'viewport', '375', '900');
  settleLayout(browser);
  truth(browser, noBreakPair(cardLines), 'RU 375 карточки: сумма и валюта неразрывны');
  browser.run('click', `${details} .icon-close`);
  browser.run('wait', '--fn', `!document.querySelector('${details}')`);
  browser.run('select', '#topbar-language', 'en');
  browser.run('wait', '--fn', `document.documentElement.lang === 'en'`);
  openDetails(browser);
  truth(browser, noBreakPair(cardLines), 'EN 375 карточки: сумма и валюта неразрывны');
  browser.run('set', 'viewport', '1440', '900');
  settleLayout(browser);
  truth(browser, noBreakPair(priceCells), 'EN 1440 таблица: сумма и валюта неразрывны');
  browser.run('click', `${details} .icon-close`);
  browser.run('wait', '--fn', `!document.querySelector('${details}')`);
  return 'U+00A0 между суммой и валютой: таблица и карточки, RU и EN';
}
