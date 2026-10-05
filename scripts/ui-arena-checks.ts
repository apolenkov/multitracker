import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import {
  announcements,
  go,
  hashGo,
  layoutShift,
  prepare,
  savePortfolio,
  truth,
  waitTrue,
} from './ui-helpers.ts';
import { importPriceNoBreak } from './ui-import-checks.ts';
import { hiddenAmountsStable } from './ui-privacy-checks.ts';
import { syncStateOneLine } from './ui-sync-checks.ts';
import { undoFocusKeepsPosition } from './ui-notice-checks.ts';
import { toastLastInMain, toastNoCover } from './ui-toast-checks.ts';

const toast = '.status-message';
const toastText = `${toast} [role=status] p`;
const toastShown = `Boolean(document.querySelector('${toastText}')?.textContent?.trim())`;
const routes = [
  'overview',
  'portfolios',
  'history',
  'import',
  'connections',
  'sync',
  'settings',
] as const;

// Зазор между заголовком и первым содержимым: слот сообщения вне потока.
function headingGap(browser: Browser, screen: string, hash = false) {
  if (hash) hashGo(browser, screen);
  else go(browser, screen);
  const gap = evaluate(
    browser,
    `(() => {
      const head = document.querySelector('.page-heading').getBoundingClientRect();
      const next = document.querySelector('#main > :not(.page-heading):not(${toast})').getBoundingClientRect();
      return Math.round(next.top - head.bottom);
    })()`,
  );
  assert.ok(typeof gap === 'number');
  assert.ok(gap <= 24, `${screen}: зазор под заголовком ${gap} px`);
  return { screen, gap };
}

// Появление плашки внизу: ничего не двигает, сама поверх, не закрывает фокус и навигацию.
function toastOverlay(browser: Browser) {
  truth(
    browser,
    `getComputedStyle(document.querySelector('${toast}')).position === 'fixed'`,
    'Плашка сообщения должна быть вне потока (position: fixed)',
  );
  layoutShift(
    browser,
    () => {
      savePortfolio(browser);
      waitTrue(browser, toastShown, 'Сохранение показывает сообщение');
      waitTrue(
        browser,
        `${announcements} === 1`,
        'После сохранения объявлено ровно одно сообщение',
      );
    },
    'Появление сообщения',
  );
  truth(
    browser,
    `(() => {
      const box = document.querySelector('${toast}').getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return document.querySelector('${toast}').contains(hit);
    })()`,
    'Плашка должна быть поверх содержимого',
  );
  browser.run('set', 'viewport', '375', '900');
  evaluate(browser, 'scrollTo(0, 0); true');
  settleLayout(browser);
  truth(
    browser,
    `(() => {
      const box = document.querySelector('${toast}').getBoundingClientRect();
      const nav = document.querySelector('.navigation').getBoundingClientRect();
      const active = document.activeElement?.getBoundingClientRect();
      const covered = active && active.width > 0 &&
        active.top < box.bottom && active.bottom > box.top;
      return box.bottom <= nav.top + 1 && !covered;
    })()`,
    'На 375 плашка выше нижней навигации и не закрывает сфокусированный элемент',
  );
  browser.run('set', 'viewport', '1440', '900');
  return 'fixed, 0 сдвигов, поверх; на 375 выше навигации и вне фокуса';
}

function toastClearPaths(browser: Browser) {
  browser.run('click', `${toast} .icon-close`);
  waitTrue(browser, `!document.querySelector('${toastText}')`, 'Закрытие скрывает сообщение');
  savePortfolio(browser);
  waitTrue(browser, toastShown, 'Повторное сообщение');
  browser.run('select', '#topbar-language', 'en');
  waitTrue(
    browser,
    `document.documentElement.lang === 'en' && !document.querySelector('${toastText}')`,
    'Смена языка гасит уведомление',
  );
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', `document.documentElement.lang === 'ru'`);
  savePortfolio(browser);
  waitTrue(browser, toastShown, 'Сообщение перед переходом');
  go(browser, 'history');
  truth(browser, `!document.querySelector('${toastText}')`, 'Переход гасит уведомление');
  return 'закрытие, язык и переход гасят плашку';
}

// Удаление строки объявляет ровно один живой регион — встроенное «Отменить», без дубля в плашке.
function singleAnnouncement(browser: Browser) {
  const row = '#main .history-list .history-row:first-child';
  browser.run('click', `${row} .row-action.danger`);
  waitTrue(
    browser,
    `document.querySelector('${row}')?.classList.contains('row-removed')`,
    'Строка остаётся под уведомлением',
  );
  truth(browser, `${announcements} === 1`, 'После удаления объявлен ровно один живой регион');
  browser.run('click', `${row} .undo-action`);
  waitTrue(
    browser,
    `!document.querySelector('${row}')?.classList.contains('row-removed')`,
    'Отмена вернула строку',
  );
  waitTrue(
    browser,
    `${announcements} === 1`,
    'После отмены объявлено ровно одно сообщение — плашка, без снятого региона',
  );
  return 'одно объявление на удаление и на отмену: в строке, потом в плашке';
}

// Подробности импорта: таблица помещается в окно без горизонтальной прокрутки,
// «Проверка» переносится; на 375 вместо таблицы — карточки без обрезки.
export function importDetailsTable(browser: Browser) {
  prepare(browser);
  go(browser, 'import');
  browser.run('click', '#import-history-details');
  browser.run('wait', '#import-history[open]');
  settleLayout(browser);
  assert.deepEqual(
    evaluate(
      browser,
      `Array.from(document.querySelectorAll('#import-history[open] .import-source-table th'), (item) => item.textContent?.trim())`,
    ),
    ['Дата', 'Актив', 'Количество', 'Цена', 'Проверка'],
    'В окне подробностей пять столбцов без «Действие» и «Валюта»',
  );
  waitTrue(
    browser,
    'getComputedStyle(document.querySelector("#import-history[open] .import-source-table td:last-child")).whiteSpace === "normal"',
    'Столбец «Проверка» переносит текст',
  );
  truth(
    browser,
    'document.querySelector("#import-history[open] .import-source-table").scrollWidth <= document.querySelector("#import-history[open] .import-source-table").clientWidth',
    '1440: таблица помещается без обрезанных столбцов',
  );
  browser.run('set', 'viewport', '375', '900');
  settleLayout(browser);
  truth(
    browser,
    'getComputedStyle(document.querySelector("#import-history[open] .import-source-table")).display === "none" && document.querySelector("#import-history[open] .import-rows").checkVisibility({checkVisibilityCSS:true})',
    '375: вместо таблицы карточки',
  );
  truth(
    browser,
    'Array.from(document.querySelectorAll("#import-history[open] .import-rows li")).every((item) => item.scrollWidth <= item.clientWidth)',
    '375: текст карточек не обрезан',
  );
  browser.run('click', '#import-history[open] .icon-close');
  browser.run('wait', '--fn', '!document.querySelector("#import-history[open]")');
  browser.run('set', 'viewport', '1440', '900');
  return '1440: 5 столбцов без прокрутки, «Проверка» переносится; 375: карточки без обрезки';
}

// Действия волны 1 для check-ui: поведенческие прогоны на одном драйвере.
export function arenaWave1(browser: Browser): readonly Readonly<[string, () => unknown]>[] {
  return [
    ['feedback:toast-out-of-flow', () => feedbackToast(browser)],
    ['feedback:toast-last-in-main', () => toastLastInMain(browser)],
    ['feedback:toast-no-stuck-cover', () => toastNoCover(browser)],
    ['privacy:hidden-amounts-stable', () => hiddenAmountsStable(browser)],
    ['import:details-no-clipped-cells', () => importDetailsTable(browser)],
    ['import:price-currency-nobr', () => importPriceNoBreak(browser)],
    ['sync:state-one-line', () => syncStateOneLine(browser)],
    ['undo:focus-kept-when-moved', () => undoFocusKeepsPosition(browser)],
  ];
}

// Характеризационный сторожок, а не регрессионная проверка: дефект «первая
// загрузка #history фокусирует main и рисует рамку заголовка» на текущем
// поведении не воспроизводится — документ грузится целиком с фрагментом,
// hashchange не наступает и readAddress(false) фокус не переводит. Прогон
// фиксирует отсутствие дефекта; «упала на старом поведении» для него нет.
export function firstLoadHashGuard(browser: Browser, url: string) {
  browser.run('open', 'about:blank');
  browser.run('open', `${url.replace(/#.*$/, '')}#history`);
  waitTrue(
    browser,
    `location.hash === '#history' && document.querySelector('#main h1')?.textContent === 'Операции'`,
    'Загрузка #history должна показать Операции',
  );
  truth(
    browser,
    `document.activeElement?.id !== 'main' && getComputedStyle(document.querySelector('#main h1')).outlineStyle === 'none'`,
    'Первая загрузка с фрагментом не должна фокусировать main и рисовать рамку заголовка',
  );
  return 'open url#history: без рамки и без фокуса main — дефект первой загрузки не воспроизводится (характеризация, не регрессия)';
}

export function feedbackToast(browser: Browser) {
  prepare(browser);
  const wide = routes.map((screen) => headingGap(browser, screen));
  browser.run('set', 'viewport', '375', '900');
  const narrow = routes.map((screen) => headingGap(browser, screen, true));
  browser.run('set', 'viewport', '1440', '900');
  go(browser, 'portfolios');
  const overlay = toastOverlay(browser);
  const clears = toastClearPaths(browser);
  const single = singleAnnouncement(browser);
  return { wide, narrow, overlay, clears, single };
}
