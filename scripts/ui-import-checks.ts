import assert from 'node:assert/strict';
import { settleLayout, type Browser } from './ui-driver.ts';
import { content, go, prepare, truth } from './ui-helpers.ts';
import { env } from './ui-dialog-input-checks.ts';

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

/** «Импортировать 2 операции» без прокрутки на 1440×900. */
function runAboveFold(browser: Browser) {
  env(browser, 'import', 1440, 900, 'ru');
  truth(
    browser,
    `(() => { const r = document.querySelector('#import-run').getBoundingClientRect();
      return r.top > 0 && r.bottom <= innerHeight; })()`,
    'Кнопка импорта за сгибом 1440×900',
  );
  return 'кнопка в первом экране 1440×900';
}

/** Ошибка/повтор помечены чипом «значок + слово» в таблице и в карточках. */
function statusChips(browser: Browser) {
  const probe = (scope: string) =>
    `(() => { const chips = [...document.querySelectorAll('${scope} .status-chip')];
      return chips.every((el) => el.querySelector('svg')) &&
        chips.map((el) => el.textContent?.trim()).join(','); })()`;
  env(browser, 'import', 1440, 900, 'ru');
  truth(
    browser,
    `${probe('.import-source-table')} === 'Готово,Готово,Ошибка,Повтор'`,
    'Таблица: чипы «значок + слово» для ошибки и повтора',
  );
  env(browser, 'import', 375, 667, 'en');
  truth(
    browser,
    `${probe('.import-rows')} === 'Ready,Ready,Error,Duplicate'`,
    'Карточки 375: те же чипы по-английски',
  );
  return 'таблица и карточки: чипы «значок + слово» одинаковы';
}

/** Даты строк и истории — в формате языка, не ISO. */
function localizedDates(browser: Browser) {
  for (const lang of ['ru', 'en'] as const) {
    env(browser, 'import', 1440, 900, lang);
    truth(
      browser,
      `[...document.querySelectorAll('.import-source-table tbody td:first-child')]
         .every((td) => !/^\\d{4}-\\d{2}-\\d{2}/.test(td.textContent ?? '')) &&
        !/2026-09-04/.test(document.querySelector('.import-entry')?.textContent ?? '')`,
      `Даты импорта не локализованы (${lang})`,
    );
  }
  return 'ISO-дат нет ни в строках, ни в записи истории (ru/en)';
}

export function importActions(browser: Browser): readonly Readonly<[string, () => unknown]>[] {
  return [
    ['import:run-above-fold-1440', () => runAboveFold(browser)],
    ['import:status-chips-both-layouts', () => statusChips(browser)],
    ['import:localized-dates', () => localizedDates(browser)],
  ];
}
