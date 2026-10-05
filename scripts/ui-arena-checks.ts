import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { go, layoutShift, prepare, truth, waitTrue } from './ui-helpers.ts';

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

function hashGo(browser: Browser, screen: string) {
  evaluate(browser, `location.assign('#${screen}'); true`);
  waitTrue(
    browser,
    `location.hash === '#${screen}' && document.activeElement?.id === 'main'`,
    `Переход на ${screen}`,
  );
  settleLayout(browser);
}

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

function savePortfolio(browser: Browser) {
  browser.run('find', 'role', 'button', 'click', '--name', '+ Создать портфель', '--exact');
  browser.run('wait', '#portfolio-dialog[open]');
  browser.run('fill', '#portfolio-dialog-name', 'Учебная проверка');
  browser.run('click', '#portfolio-dialog button[type="submit"]');
  browser.run('wait', '--fn', '!document.querySelector("#portfolio-dialog[open]")');
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
  truth(
    browser,
    `Array.from(document.querySelectorAll('[role=status]'))
      .filter((el) => el.textContent?.trim() && el.checkVisibility()).length === 1`,
    'После удаления объявлен ровно один живой регион',
  );
  browser.run('click', `${row} .undo-action`);
  waitTrue(
    browser,
    `!document.querySelector('${row}')?.classList.contains('row-removed')`,
    'Отмена вернула строку',
  );
  return 'одно объявление на удаление: в строке, без дубля в плашке';
}

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

// Скрытие сумм не должно сдвигать панель баланса и то, что ниже её.
export function hiddenAmountsStable(browser: Browser) {
  prepare(browser);
  const run = (width: number) => {
    browser.run('set', 'viewport', String(width), '900');
    hashGo(browser, 'overview');
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
      assert.ok(Math.abs(diff) <= 2, `${width}px: ${key} при скрытии сумм изменился на ${diff} px`);
    }
    return { width, visible, hidden };
  };
  const wide = run(1440);
  const narrow = run(375);
  browser.run('set', 'viewport', '1440', '900');
  return { wide, narrow };
}

// Первая загрузка адреса с фрагментом: документ грузится целиком, hashchange нет,
// штатный перевод фокуса не срабатывает — рамка заголовка не появляется.
export function firstLoadHashFocus(browser: Browser, url: string) {
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
  return 'open url#history: без рамки и без фокуса main — дефект первой загрузки не воспроизводится';
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
