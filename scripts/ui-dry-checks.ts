import { truth } from './ui-helpers.ts';
import { type Browser } from './ui-driver.ts';
import { env } from './ui-dialog-input-checks.ts';

/** Счета: обычное начертание, остаток с валютой справа, одна ссылка добавления. */
function accountRows(browser: Browser) {
  env(browser, 'portfolios', 1440, 900, 'ru');
  truth(
    browser,
    `(() => { const rows = [...document.querySelectorAll('.account-list li')]
        .filter((li) => li.querySelector('.row-action'));
      return rows.length >= 4 && rows.every((li) => {
        const name = li.querySelector('.account-name');
        const balance = li.querySelector('.account-balance');
        return name && !li.querySelector('strong') &&
          Number(getComputedStyle(name).fontWeight) <= 500 &&
          balance && /\\d/.test(balance.textContent ?? '') &&
          balance.getBoundingClientRect().right <=
            li.querySelector('.row-action').getBoundingClientRect().left; }) &&
        [...document.querySelectorAll('.account-list')].every(
          (ul) => ul.querySelectorAll('.add-account').length === 1); })()`,
    'Счёт: обычное начертание, остаток с валютой справа, одна ссылка',
  );
  env(browser, 'portfolios', 375, 667, 'en');
  truth(
    browser,
    `document.querySelectorAll('.account-balance').length >= 4 &&
     [...document.querySelectorAll('.account-balance')].every(
       (el) => /[\\d$€₽£]/.test(el.textContent ?? '') || el.textContent === '••••')`,
    'Остаток счёта читается и на 375 px',
  );
  env(browser, 'portfolios', 375, 667, 'ru');
  truth(
    browser,
    `[...document.querySelectorAll('.account-list li')].every((li) => {
      const name = li.querySelector('.account-name');
      const balance = li.querySelector('.account-balance');
      if (!name || !balance) return true;
      const range = document.createRange();
      range.selectNodeContents(name);
      const ink = range.getBoundingClientRect();
      const box = balance.getBoundingClientRect();
      return ink.right <= box.left + 1 || ink.bottom <= box.top + 1; })`,
    'Имя счёта не наезжает на остаток на 375 px',
  );
  return 'счета: имя без жирного, остаток справа, одна ссылка «+ Добавить счёт»';
}

/** Подключения: одинаковые плитки, состояние — чип со значком. */
function connectionChips(browser: Browser) {
  env(browser, 'connections', 1440, 900, 'ru');
  truth(
    browser,
    `(() => { const rows = [...document.querySelectorAll('.connection-row')];
      return rows.length === 5 && rows.every((row) => row.querySelector('.status-chip svg')) &&
        new Set(rows.map((row) => getComputedStyle(row).gridTemplateColumns)).size === 1; })()`,
    'Плитки подключений: 5 строк, у каждой чип статуса, колонки одинаковы',
  );
  env(browser, 'connections', 375, 667, 'en');
  truth(
    browser,
    `document.querySelectorAll('.connection-row .status-chip-muted').length === 5`,
    'Не настроено — чипом и на 375 px',
  );
  return 'плитки одинаковы, статус чипом «значок + слово»';
}

/** Устройства синхронизации: строки делят общие колонки. */
function deviceColumns(browser: Browser) {
  env(browser, 'sync', 1440, 900, 'ru');
  truth(
    browser,
    `(() => { const rows = [...document.querySelectorAll('.sync-devices article')];
      if (rows.length !== 2) return false;
      const slot = (row, i) => [...row.children].at(i)?.getBoundingClientRect().left;
      return [0, 1, 2].every((i) => Math.abs(slot(rows[0], i) - slot(rows[1], i)) <= 1) &&
        rows.every((row) => row.querySelector('.status-chip svg')); })()`,
    'Строки устройств: общие колонки имя/метка/активность',
  );
  return 'устройства в общих колонках, статус чипом';
}

/** N2: .sync-state — видимая метка без role=status; запуск объявляет только плашка. */
function singleSyncAnnouncement(browser: Browser) {
  // stateRun оставляет флажок «имитировать ошибку»: перезагрузка возвращает
  // панель в ожидание и снимает флажок перед проверкой успешного запуска.
  browser.run('reload');
  env(browser, 'sync', 1440, 900, 'ru');
  truth(
    browser,
    `!document.querySelector('.sync-state[role="status"]') &&
     !!document.querySelector('.sync-state .status-chip')`,
    'Строка состояния — чип без живого региона',
  );
  browser.run('click', '#sync-run');
  browser.run('wait', '--fn', `!!document.querySelector('.sync-state .status-chip-ok')`);
  truth(
    browser,
    `[...document.querySelectorAll('[role="status"]')]
       .filter((el) => el.textContent?.trim() && el.checkVisibility()).length === 1`,
    'Запуск объявляет ровно одна плашка',
  );
  return 'объявление запуска одно — плашка; строка без role=status';
}

export function dryChecks(browser: Browser): readonly Readonly<[string, () => unknown]>[] {
  return [
    ['portfolios:account-rows-balance', () => accountRows(browser)],
    ['connections:status-chips', () => connectionChips(browser)],
    ['sync:device-columns', () => deviceColumns(browser)],
    ['sync:single-status-announcement', () => singleSyncAnnouncement(browser)],
  ];
}
