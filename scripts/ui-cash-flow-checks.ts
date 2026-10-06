import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { go, prepare, truth } from './ui-helpers.ts';
import { holdingsSort } from './ui-cash-sort-checks.ts';

type Close = 'Escape' | 'Cancel' | 'X';
const exits: readonly Close[] = ['Escape', 'Cancel', 'X'];

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
    `document.querySelectorAll('dialog[open]').length === 1 && document.querySelector('#buy-dialog-title')?.textContent === 'Начальный остаток' && document.querySelector('#buy-dialog [name=${field}]')?.value === ${JSON.stringify(value)}`,
    `Нужен один диалог ${type} с предвыбранным ${field}=${value}`,
  );
}

function cashAtWidth(browser: Browser, width: number) {
  browser.run('set', 'viewport', '1440', '900');
  go(browser, 'overview');
  browser.run('set', 'viewport', String(width), width === 375 ? '812' : '900');
  truth(
    browser,
    `document.querySelectorAll('#main .cash-holding-row').length === 2 && document.querySelectorAll('#main .holding-row:not(.cash-holding-row)').length === 3 && document.querySelector('#holdings-title .count')?.textContent === '5'`,
    'Обзор должен показывать три инвестиции и две денежные строки',
  );
  return ['RUB', 'USD'].flatMap((currency) =>
    exits.map((exit) => {
      const trigger = `.cash-holding-row[data-currency="${currency}"] .row-action`;
      const name = `Изменить остаток: ${currency}`;
      truth(
        browser,
        `document.querySelector(${JSON.stringify(trigger)})?.getAttribute('aria-label') === ${JSON.stringify(name)} && (rect => rect?.width >= 44 && rect?.height >= 44)(document.querySelector(${JSON.stringify(trigger)})?.getBoundingClientRect())`,
        `Действие денежной строки ${currency}: имя «${name}» и цель не меньше 44 px`,
      );
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

// Денежные строки той же высоты, что инвестиционные; карандаш — в конечной ячейке справа.
function cashRowGeometry(browser: Browser, language: 'ru' | 'en', width: number) {
  browser.run('select', '#topbar-language', language);
  browser.run('wait', '--fn', `document.documentElement.lang === '${language}'`);
  browser.run('set', 'viewport', String(width), '900');
  const observed = evaluate(
    browser,
    `(() => {
      const asset = document.querySelector('.holding-row:not(.cash-holding-row)');
      const base = asset?.getBoundingClientRect().height ?? 0;
      return [...document.querySelectorAll('.cash-holding-row')].map((row) => {
        const box = row.getBoundingClientRect();
        const cell = row.querySelector('.holding-actions');
        const target = cell?.querySelector('.row-action')?.getBoundingClientRect();
        const right = target ? Math.round(box.right - target.right) : -1;
        const size = target ? Math.round(target.width) + 'x' + Math.round(target.height) : 'none';
        return { currency: row.dataset.currency, right, size,
          ok: Math.abs(box.height - base) <= 2 && cell === row.querySelector('td:last-child')
            && right <= 24 && size === '44x44' };
      });
    })()`,
  );
  const list = Array.isArray(observed) ? observed : [];
  assert.equal(list.length, 2, 'Нужны две денежные строки');
  const valid = (row: unknown) =>
    typeof row === 'object' && row !== null && 'ok' in row && row.ok === true;
  assert.ok(
    list.every(valid),
    `Денежная строка ${width} ${language}: высота, конечная ячейка, 44×44: ${JSON.stringify(list)}`,
  );
  return { width, language, rows: list };
}

export function cashFlow(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  const sorting = holdingsSort(browser);
  const cash = [375, 1440].flatMap((width) => cashAtWidth(browser, width));
  const geometry = (['ru', 'en'] as const).flatMap((language) =>
    (language === 'ru' ? [1440, 768, 375, 320] : [1440]).map((width) =>
      cashRowGeometry(browser, language, width),
    ),
  );
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  return { sorting, cash, geometry };
}
