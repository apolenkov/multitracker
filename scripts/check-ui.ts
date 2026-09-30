import assert, { AssertionError } from 'node:assert/strict';
import { createBrowser, evaluate } from './ui-driver.ts';
import type { Browser } from './ui-driver.ts';

const screens = [
  ['overview', 'Обзор', 'Overview'],
  ['portfolios', 'Портфели', 'Portfolios'],
  ['history', 'Операции', 'Transactions'],
  ['import', 'Импорт', 'Import'],
  ['connections', 'Подключения', 'Connections'],
  ['sync', 'Синхронизация', 'Sync'],
  ['settings', 'Настройки', 'Settings'],
] as const;
type Language = 'ru' | 'en';
type Result = Readonly<{ id: string; status: string; observed: unknown }>;
const baseUrl = new URL(process.env.MULTITRACKER_UI_URL ?? 'http://127.0.0.1:5173');
assert.ok(['http:', 'https:'].includes(baseUrl.protocol), 'URL должен быть HTTP(S)');
assert.equal(baseUrl.username + baseUrl.password, '', 'URL не должен содержать credentials');
const browser = createBrowser();

function truth(source: string, message: string) {
  assert.equal(evaluate(browser, source), true, message);
}
function check(id: string, action: () => unknown): Result {
  try {
    return { id, status: 'PASS', observed: action() };
  } catch (error: unknown) {
    return {
      id,
      status: error instanceof AssertionError ? 'FAIL' : 'NOT VERIFIED',
      observed: error instanceof Error ? error.message : String(error),
    };
  }
}
function navigate(screen: string, width = 1440, language: Language = 'ru') {
  const extra = ['import', 'connections', 'sync', 'settings'].includes(screen);
  if (width === 375 && extra) {
    browser.run(
      'find',
      'role',
      'button',
      'click',
      '--name',
      language === 'ru' ? 'Ещё' : 'More',
      '--exact',
    );
  }
  const scope = width === 375 && extra ? '.more-menu' : '.navigation';
  const selector = `${scope} a[href="#${screen}"]`;
  browser.run('click', selector);
  browser.run(
    'wait',
    '--fn',
    `location.hash === '#${screen}' && document.activeElement?.id === 'main'`,
  );
}
function language(value: Language) {
  browser.run('select', '.topbar label:first-of-type select', value);
  browser.run('wait', '--fn', `document.documentElement.lang === '${value}'`);
}
function screenChecks(width: number, locale: Language): readonly Result[] {
  language(locale);
  return screens.map(([screen, ru, en]) =>
    check(`screen:${width}:${locale}:${screen}`, () => {
      navigate(screen, width, locale);
      assert.equal(
        evaluate(browser, 'document.querySelector("#main h1")?.textContent'),
        locale === 'ru' ? ru : en,
      );
      truth(
        'document.documentElement.scrollWidth <= innerWidth + 1',
        'Горизонтальное переполнение страницы',
      );
      return evaluate(
        browser,
        '({hash:location.hash,lang:document.documentElement.lang,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,focus:document.activeElement?.id})',
      );
    }),
  );
}
function allScreens(): readonly Result[] {
  return [375, 1440].flatMap((width) => {
    browser.run('set', 'viewport', String(width), '900');
    return (['ru', 'en'] as const).flatMap((locale) => screenChecks(width, locale));
  });
}
function backFocus() {
  language('ru');
  navigate('overview');
  navigate('portfolios');
  browser.run('back');
  browser.run(
    'wait',
    '--fn',
    'location.hash === "#overview" && document.activeElement?.id === "main"',
  );
  truth(
    'location.hash === "#overview" && document.activeElement?.id === "main"',
    'Back должен вернуть Обзор и фокус main',
  );
  return 'Back → #overview; focus=#main';
}
function savePortfolio() {
  browser.run('find', 'role', 'button', 'click', '--name', '+ Создать портфель', '--exact');
  browser.run('wait', '#portfolio-dialog[open]');
  browser.run('fill', '#portfolio-dialog-name', 'Учебная проверка');
  browser.run('click', '#portfolio-dialog button[type="submit"]');
  browser.run('wait', '--fn', '!document.querySelector("#portfolio-dialog[open]")');
}
function repeatSave() {
  navigate('portfolios');
  savePortfolio();
  truth(
    'Boolean(document.querySelector(".status-message p")?.textContent?.trim())',
    'Первое сохранение должно сообщить результат',
  );
  // Только тестовая WeakRef: сравнивает DOM-узлы, не изменяет модель или storage приложения.
  evaluate(
    browser,
    'Object.defineProperty(window, "__multitrackerUiStatus", {value: new WeakRef(document.querySelector(".status-message p")), configurable: true}); true',
  );
  savePortfolio();
  truth(
    'Boolean(document.querySelector(".status-message p")?.textContent?.trim()) && window.__multitrackerUiStatus.deref() !== document.querySelector(".status-message p")',
    'Повторное сохранение должно заменить узел уведомления',
  );
  return 'Два Save: непустой результат, второй DOM-узел отличается';
}
function startImport() {
  browser.run('find', 'role', 'button', 'click', '--name', 'Начать импорт-пример', '--exact');
  browser.run('wait', '#import-wizard[open]');
}
function importMapping() {
  navigate('import');
  browser.run('select', '#import-page-source', 'Binance');
  browser.run('click', '.demo-panel details summary');
  browser.run('select', '#import-page-map-date', 'skip');
  language('en');
  assert.equal(evaluate(browser, 'document.querySelector("#import-page-map-date")?.value'), 'skip');
  language('ru');
  startImport();
  browser.run('click', '#import-next');
  browser.run('click', '#import-sample-file');
  browser.run('click', '#import-next');
  assert.equal(
    evaluate(browser, 'document.querySelector("#import-wizard-map-date")?.value'),
    'skip',
  );
  browser.run('click', '#import-next');
  truth(
    'Boolean(document.querySelector("#import-error")?.textContent?.trim()) && document.querySelector("#import-wizard-map-date")?.getAttribute("aria-invalid") === "true"',
    'Неверное обязательное сопоставление должно блокировать следующий шаг',
  );
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', '!document.querySelector("#import-wizard[open]")');
  return 'skip сохранён RU→EN→RU и в wizard; ошибка блокирует переход';
}
function cancelImport() {
  startImport();
  browser.run('select', '#import-wizard-source', 'Bybit');
  browser.run('find', 'role', 'button', 'click', '--name', 'Отмена', '--exact');
  browser.run('wait', '--fn', '!document.querySelector("#import-wizard[open]")');
  assert.equal(
    evaluate(browser, 'document.querySelector("#import-page-source")?.value'),
    'Binance',
  );
  return 'Bybit в черновике → Cancel → page Binance';
}
function settingsPersist() {
  navigate('settings');
  browser.run('click', '#settings-open-notifications');
  browser.run('wait', '#settings-dialog[open]');
  browser.run('check', '#settings-notification-price');
  browser.run('click', '#settings-dialog button[type="submit"]');
  browser.run('wait', '--fn', '!document.querySelector("#settings-dialog[open]")');
  navigate('overview');
  navigate('settings');
  browser.run('click', '#settings-open-notifications');
  browser.run('wait', '#settings-dialog[open]');
  truth(
    'document.querySelector("#settings-notification-price")?.checked === true',
    'Настройка должна пережить переход в финансовый раздел',
  );
  browser.run('press', 'Escape');
  const closed =
    '!document.querySelector("#settings-dialog") && document.activeElement?.id === "settings-open-notifications"';
  browser.run('wait', '--fn', closed);
  truth(closed, 'Escape должен закрыть настройки и вернуть фокус исходной кнопке');
  return 'Price notification сохранена settings→overview→settings; Escape закрывает и возвращает фокус';
}
function hiddenReconciliation() {
  language('ru');
  navigate('settings');
  browser.run('find', 'label', 'Скрыть суммы', 'check', '--exact');
  navigate('import');
  browser.run('find', 'role', 'button', 'click', '--name', 'Сверить остаток', '--exact');
  browser.run('wait', '#import-history[open]');
  assert.deepEqual(
    evaluate(
      browser,
      'Array.from(document.querySelectorAll("#import-history[open] dd"), (item) => item.textContent?.trim())',
    ),
    ['••••', '••••', '••••'],
    'Все три суммы открытого диалога сверки должны быть скрыты',
  );
  const text = evaluate(browser, 'document.querySelector("#import-history[open]")?.textContent');
  assert.ok(typeof text === 'string', 'Открытый диалог сверки отсутствует');
  assert.equal(/\+?0[.,]0[145]/.test(text), false, 'Диалог раскрывает исходные суммы');
  browser.run('click', '#import-history[open] .icon-close');
  browser.run('wait', '--fn', '!document.querySelector("#import-history[open]")');
  return 'В открытой сверке: три ••••; нет 0.04, 0.05, +0.01 с точкой или запятой';
}
function runChecks(driver: Browser): readonly Result[] {
  driver.run('open', baseUrl.href);
  driver.run('wait', '#main h1');
  const pages = allScreens();
  return [
    ...pages,
    check('navigation:back-main-focus', backFocus),
    check('feedback:repeat-save', repeatSave),
    check('import:mapping-locale-invalid', importMapping),
    check('import:cancel-source', cancelImport),
    check('settings:finance-roundtrip', settingsPersist),
    check('privacy:hidden-import-reconciliation', hiddenReconciliation),
  ];
}
function main() {
  const start = new Date().toISOString();
  try {
    const results = runChecks(browser);
    console.log(
      JSON.stringify(
        {
          start,
          end: new Date().toISOString(),
          url: baseUrl.href,
          session: browser.session,
          namespace: browser.namespace,
          version: browser.version,
          results,
        },
        null,
        2,
      ),
    );
    assert.ok(
      results.every((result) => result.status === 'PASS'),
      'UI: есть FAIL / NOT VERIFIED',
    );
  } finally {
    browser.run('close');
  }
}
main();
