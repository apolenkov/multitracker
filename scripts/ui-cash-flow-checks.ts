import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { go, prepare, truth } from './ui-exploration.ts';
import { holdingsSort } from './ui-cash-sort-checks.ts';

const instruments = ['MSFT', 'FUND-DEMO', 'BOND-DEMO', 'BTC', 'TWT'];
type Close = 'Escape' | 'Cancel' | 'X';
const exits: readonly Close[] = ['Escape', 'Cancel', 'X'];

function clearSearch(browser: Browser, selector: string) {
  browser.run('click', selector);
  browser.run('press', 'Control+a');
  browser.run('press', 'Backspace');
  browser.run('wait', '--fn', `document.querySelector(${JSON.stringify(selector)})?.value === ''`);
}

function dismiss(browser: Browser, exit: Close, trigger: string, route: string) {
  if (exit === 'Escape') browser.run('press', 'Escape');
  else
    browser.run(
      'click',
      exit === 'Cancel'
        ? '#buy-dialog .form-actions button:first-child'
        : '#buy-dialog .close-button',
    );
  browser.run(
    'wait',
    '--fn',
    `!document.querySelector('dialog[open]') && document.activeElement === document.querySelector(${JSON.stringify(trigger)})`,
  );
  truth(browser, `location.hash === ${JSON.stringify(route)}`, 'Закрытие изменило маршрут');
}

function operation(browser: Browser, trigger: string, type: string, field: string, value: string) {
  browser.run('scrollintoview', trigger);
  settleLayout(browser);
  browser.run('click', trigger);
  browser.run('wait', '#buy-dialog[open]');
  truth(
    browser,
    `document.querySelectorAll('dialog[open]').length === 1 && !document.querySelector('#cash-catalog-dialog') && document.querySelector('#buy-dialog-type')?.value === ${JSON.stringify(type)} && document.querySelector('#buy-dialog [name=${field}]')?.value === ${JSON.stringify(value)}`,
    `Нужен один диалог ${type} с предвыбранным ${field}=${value}`,
  );
}

function cashAtWidth(browser: Browser, width: number) {
  browser.run('set', 'viewport', '1440', '900');
  go(browser, 'overview');
  browser.run('set', 'viewport', String(width), width === 375 ? '812' : '900');
  truth(
    browser,
    `document.querySelectorAll('#main .cash-holding-row').length === 2 && document.querySelectorAll('#main .holding-row:not(.cash-holding-row)').length === 3 && document.querySelector('#holdings-title .count')?.textContent === '5' && !document.querySelector('#main .asset-catalog')?.checkVisibility()`,
    'Обзор должен показывать три инвестиции и две денежные строки без каталога',
  );
  return ['RUB', 'USD'].flatMap((currency) =>
    exits.map((exit) => {
      const trigger = `.cash-holding-row[data-currency="${currency}"] button`;
      browser.run('scrollintoview', trigger);
      settleLayout(browser);
      const geometry = `({scroll:scrollY,side:document.querySelector('.overview-side').getBoundingClientRect().top,report:document.querySelector('.overview-report').getBoundingClientRect().top})`;
      const before = evaluate(browser, geometry);
      operation(browser, trigger, 'opening', 'currency', currency);
      assert.deepEqual(evaluate(browser, geometry), before, 'Форма остатка сдвинула обзор');
      dismiss(browser, exit, trigger, '#overview');
      assert.deepEqual(evaluate(browser, geometry), before, 'Закрытие сдвинуло обзор');
      return { width, currency, exit };
    }),
  );
}

function marketAtWidth(browser: Browser, width: number) {
  browser.run('set', 'viewport', '1440', '900');
  go(browser, 'markets');
  browser.run('set', 'viewport', String(width), width === 375 ? '812' : '900');
  const rows = '.asset-catalog li button strong';
  assert.deepEqual(
    evaluate(
      browser,
      `Array.from(document.querySelectorAll('${rows}'), element => element.textContent)`,
    ),
    instruments,
    'Каталог должен содержать пять инвестиционных инструментов без RUB/USD',
  );
  browser.run('fill', '#market-search', 'MSFT');
  browser.run('fill', '.asset-catalog input[type=search]', 'MSFT');
  const trigger = '.asset-catalog button[aria-label="Купить MSFT"]';
  const states = exits.map((exit) => {
    operation(browser, trigger, 'buy', 'asset', 'MSFT');
    dismiss(browser, exit, trigger, '#markets');
    truth(
      browser,
      `document.querySelector('#market-search')?.value === 'MSFT' && document.querySelector('.asset-catalog input[type=search]')?.value === 'MSFT' && document.querySelectorAll('.asset-catalog li').length === 1`,
      'Закрытие должно сохранить оба фильтра и найденный MSFT',
    );
    return { width, asset: 'MSFT', exit };
  });
  clearSearch(browser, '.asset-catalog input[type=search]');
  browser.run('wait', '--fn', 'document.querySelectorAll(".asset-catalog li").length === 5');
  const otherAssets = instruments.slice(1).map((asset) => {
    const button = `.asset-catalog button[aria-label="Купить ${asset}"]`;
    operation(browser, button, 'buy', 'asset', asset);
    dismiss(browser, 'Escape', button, '#markets');
    return { width, asset, exit: 'Escape' };
  });
  clearSearch(browser, '#market-search');
  return [...states, ...otherAssets];
}

export function cashFlow(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  const sorting = holdingsSort(browser);
  const cash = [375, 1440].flatMap((width) => cashAtWidth(browser, width));
  const catalog = [375, 1440].flatMap((width) => marketAtWidth(browser, width));
  browser.run('set', 'viewport', '1440', '900');
  return { sorting, cash, catalog };
}
