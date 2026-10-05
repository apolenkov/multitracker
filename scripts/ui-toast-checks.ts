import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { go, hashGo, prepare, savePortfolio, truth, waitTrue } from './ui-helpers.ts';

const toast = '.status-message';
const region = `${toast} [role=status]`;
const toastShown = `Boolean(document.querySelector('${region} p')?.textContent?.trim())`;
type Route = 'overview' | 'portfolios' | 'history' | 'import' | 'connections' | 'sync' | 'settings';

// F2: в DOM плашка — последний ребёнок <main>, поэтому «Закрыть» в порядке
// табуляции идёт после содержимого раздела — как визуально внизу вьюпорта.
// Живой регион смонтирован пустым уже при загрузке, текст вставляется позже,
// поэтому объявление срабатывает и на первом сообщении.
export function toastLastInMain(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  go(browser, 'portfolios');
  truth(
    browser,
    `Boolean(document.querySelector('${region}')) && !document.querySelector('${region}')?.textContent?.trim()`,
    'Живой регион смонтирован при загрузке и пуст: текст появится позже',
  );
  truth(
    browser,
    `document.querySelector('#main')?.lastElementChild === document.querySelector('${toast}')`,
    'Плашка — последний ребёнок <main>: «Закрыть» в табуляции после содержимого',
  );
  savePortfolio(browser);
  waitTrue(
    browser,
    `Boolean(document.querySelector('${region} p')?.textContent?.trim())`,
    'Текст сохранения вставлен в уже смонтированный живой регион',
  );
  truth(
    browser,
    `document.querySelector('${toast} .icon-close')?.checkVisibility({checkVisibilityCSS:true}) === true`,
    'У показанного сообщения есть видимая кнопка закрытия',
  );
  return 'регион смонтирован с загрузки пустым, текст позже; закрытие в табуляции после содержимого';
}

const row = '#main .history-list .history-row:first-child';

// Короткий путь к объявлению в плашке на каждом из семи разделов.
const producers: readonly (readonly [Route, (browser: Browser) => void])[] = [
  [
    'overview',
    (browser) => {
      browser.run('click', '.summary-result .primary');
      browser.run('wait', '#buy-dialog[open]');
      browser.run('select', '#buy-dialog-portfolioId', 'tradernet');
      browser.run('select', '#buy-dialog-asset', 'MSFT');
      browser.run('select', '#buy-dialog-priceCurrency', 'USD');
      browser.run('fill', '#buy-dialog-quantity', '1');
      browser.run('fill', '#buy-dialog-price', '100');
      browser.run('click', '#buy-dialog button[type="submit"]');
    },
  ],
  ['portfolios', savePortfolio],
  [
    'history',
    (browser) => {
      browser.run('click', `${row} .row-action.danger`);
      waitTrue(
        browser,
        `document.querySelector('${row}')?.classList.contains('row-removed')`,
        'Строка под уведомлением',
      );
      browser.run('click', `${row} .undo-action`);
    },
  ],
  ['import', (browser) => browser.run('click', '#import-run')],
  [
    'connections',
    (browser) => {
      browser.run(
        'click',
        '.connection-list .connection-row:nth-of-type(1) .connection-actions button',
      );
      browser.run('wait', '#connection-config[open]');
      browser.run('click', '#connection-config button[type="submit"]');
    },
  ],
  ['sync', (browser) => browser.run('click', '#sync-run')],
  [
    'settings',
    (browser) => {
      browser.run('scrollintoview', '#settings-open-notifications');
      browser.run('click', '#settings-open-notifications');
      browser.run('wait', '#settings-dialog[open]');
      browser.run('click', '#settings-dialog button[type="submit"]');
    },
  ],
];

// Управление под прямоугольником плашки, которое не увести прокруткой:
// оставшегося места прокрутки не хватает поднять его выше плашки.
const coveredByToast = `(() => {
  const toastEl = document.querySelector('${toast}');
  const box = toastEl.getBoundingClientRect();
  const room = document.documentElement.scrollHeight - innerHeight - scrollY;
  return [...document.querySelectorAll('a[href], button, input, select, textarea, summary')]
    .filter((el) => !el.disabled && !toastEl.contains(el))
    .filter((el) => el.checkVisibility({checkVisibilityCSS:true}))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const overlap = r.bottom > box.top && r.top < box.bottom && r.right > box.left && r.left < box.right;
      return overlap && room + 1 < r.bottom - box.top;
    })
    .map((el) => el.getAttribute('aria-label') || el.id || el.tagName);
})()`;

const uncoveredAt = (browser: Browser, position: 'top' | 'bottom') => {
  evaluate(browser, `scrollTo(0, ${position === 'top' ? '0' : '1e6'}); true`);
  settleLayout(browser);
  const found = evaluate(browser, coveredByToast);
  assert.ok(Array.isArray(found), 'Нужен список накрытых элементов');
  return found.map((name) => `${position}: ${String(name)}`);
};

// F7+F6: плашка не должна накрывать управление, от которого не уйти прокруткой.
// Семь разделов × три ширины (1440, 375, 320) × верх и низ страницы.
export function toastNoCover(browser: Browser) {
  prepare(browser);
  const found = [1440, 375, 320].flatMap((width) => {
    browser.run('set', 'viewport', String(width), '900');
    return producers.flatMap(([screen, produce]) => {
      hashGo(browser, screen);
      produce(browser);
      waitTrue(browser, toastShown, `${screen} @${width}: сообщение показано`);
      return (['top', 'bottom'] as const).flatMap((position) =>
        uncoveredAt(browser, position).map((name) => `${screen} @${width}px ${name}`),
      );
    });
  });
  assert.deepEqual(found, [], 'Плашка накрывает управление без выхода прокруткой');
  browser.run('set', 'viewport', '1440', '900');
  return 'ни одно управление под плашкой не застревает: 7 разделов × 3 ширины × верх/низ';
}
