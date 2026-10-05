import assert from 'node:assert/strict';
import { createBrowser, evaluate } from './ui-driver.ts';
import type { Browser } from './ui-driver.ts';
import { appearanceThemes, independentCurrencies, settingsPersist } from './ui-preferences.ts';
import { reveal, widgetAppearance } from './ui-helpers.ts';
import { connectionLifecycle } from './ui-connection-checks.ts';
import { createCheck, type Result } from './ui-results.ts';
import { conflictRadioChoices, syncPostConflictDisclosure } from './ui-sync-checks.ts';
import { operationExtras } from './ui-operation-checks.ts';
import { mappingSamples } from './ui-import-checks.ts';
import {
  attributionLine,
  initialSkipFocus,
  maskedResultTones,
  narrowAllocation,
} from './ui-overview-checks.ts';
import { stableHeroDisclosure } from './ui-overview-checks.ts';
import { recordRowActions, entityUndo, importAndSyncUndo } from './ui-row-action-checks.ts';
import { feedbackToast, firstLoadHashFocus, hiddenAmountsStable } from './ui-arena-checks.ts';
import { destructiveTargets, settingsDeleteFocus } from './ui-destructive-checks.ts';
import { emptyOverview } from './ui-empty-overview-checks.ts';
import { dialogPointerSave } from './ui-dialog-pointer-checks.ts';
import { dialogClosePaths, dialogMountStability } from './ui-modal-checks.ts';
import { cashFlow } from './ui-cash-flow-checks.ts';
import { unifiedCounters } from './ui-counter-checks.ts';

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
const baseUrl = new URL(process.env.MULTITRACKER_UI_URL ?? 'http://127.0.0.1:5173');
assert.ok(['http:', 'https:'].includes(baseUrl.protocol), 'URL должен быть HTTP(S)');
assert.equal(baseUrl.username + baseUrl.password, '', 'URL не должен содержать credentials');
const browser = createBrowser();
const check = createCheck(browser);
const headingLabel = "document.querySelector('#main h1')?.firstChild?.textContent?.trim()";

function truth(source: string, message: string) {
  assert.equal(evaluate(browser, source), true, message);
}
function navigate(screen: string, width = 1440, language: Language = 'ru') {
  const extra = !['overview', 'portfolios', 'history'].includes(screen);
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
  const scope = width === 375 ? (extra ? '.more-menu' : '.mobile-links') : '.desktop-links';
  const selector = `${scope} a[href="#${screen}"]`;
  browser.run('click', selector);
  const heading = screens.find(([route]) => route === screen)?.[language === 'ru' ? 1 : 2];
  browser.run(
    'wait',
    '--fn',
    `location.hash === '#${screen}' && document.activeElement?.id === 'main' && ${headingLabel} === ${JSON.stringify(heading)}`,
  );
}
function language(value: Language) {
  browser.run('select', '#topbar-language', value);
  browser.run('wait', '--fn', `document.documentElement.lang === '${value}'`);
}
function screenChecks(width: number, locale: Language): readonly Result[] {
  language(locale);
  return screens.map(([screen, ru, en]) =>
    check(`screen:${width}:${locale}:${screen}`, () => {
      navigate(screen, width, locale);
      assert.equal(evaluate(browser, headingLabel), locale === 'ru' ? ru : en);
      if (screen === 'portfolios')
        assert.equal(
          evaluate(browser, 'document.querySelector("#main h1 .count")?.textContent.trim()'),
          '3',
        );
      truth(
        'document.documentElement.scrollWidth <= innerWidth + 1',
        'Горизонтальное переполнение страницы',
      );
      truth(
        '[...document.querySelectorAll("[role=tab][aria-controls]")].every((node) => node.getAttribute("aria-controls").split(" ").every((id) => document.getElementById(id)))',
        'aria-controls вкладки ссылается на несуществующую панель',
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
function importMapping() {
  navigate('import');
  browser.run('select', '#import-page-source', 'Binance');
  reveal(browser, '#import-mapping-options > summary');
  mappingSamples(browser, 'page');
  browser.run('select', '#import-page-map-date', 'skip');
  language('en');
  assert.equal(evaluate(browser, 'document.querySelector("#import-page-map-date")?.value'), 'skip');
  language('ru');
  browser.run('click', '#import-run');
  truth(
    'Boolean(document.querySelector("#import-error")?.textContent?.trim()) && document.querySelector("#import-page-map-date")?.getAttribute("aria-invalid") === "true" && document.activeElement?.id === "import-page-map-date"',
    'Неверное сопоставление блокирует импорт и получает фокус',
  );
  browser.run('select', '#import-page-map-date', 'date');
  return 'skip сохранён RU→EN→RU; ошибка блокирует импорт и ставит фокус в поле';
}
// Один экран: значения по умолчанию верны, импорт — одно нажатие; снятый пропуск даёт ошибку.
function cancelImport() {
  browser.run('find', 'label', 'Пропустить повтор (строка 4)', 'click', '--exact');
  browser.run('click', '#import-run');
  truth(
    'Boolean(document.querySelector("#import-error")) && document.activeElement?.getAttribute("aria-invalid") === "true"',
    'Повтор без пропуска блокирует импорт',
  );
  browser.run('find', 'label', 'Пропустить повтор (строка 4)', 'click', '--exact');
  browser.run('click', '#import-run');
  browser.run(
    'wait',
    '--fn',
    `!document.querySelector("#import-error") && /Добавлено 2, пропущено 2/.test(document.querySelector('.status-message [role=status] p')?.textContent ?? '')`,
  );
  assert.match(
    String(
      evaluate(browser, 'document.querySelector(".status-message [role=status] p")?.textContent'),
    ),
    /Добавлено 2, пропущено 2/,
  );
  return 'Ошибка повтора → пропуск → одно нажатие «Импортировать 2 операции»';
}
function hiddenReconciliation() {
  language('ru');
  navigate('settings');
  browser.run('find', 'label', 'Скрыть суммы', 'check', '--exact');
  navigate('import');
  reveal(browser, '#import-mapping-options > summary');
  mappingSamples(browser, 'page', true);
  browser.run('click', '#import-reconcile');
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
  browser.run(
    'wait',
    '--fn',
    '!document.querySelector("#import-history[open]") && document.activeElement === document.querySelector("#import-reconcile")',
  );
  return [
    maskedResultTones(browser),
    'В открытой сверке: три ••••; нет 0.04, 0.05, +0.01 с точкой или запятой',
  ];
}
function runChecks(driver: Browser): readonly Result[] {
  const pages = [
    check('navigation:initial-skip-focus', () => initialSkipFocus(driver, baseUrl.href)),
    check('navigation:first-load-hash', () => firstLoadHashFocus(driver, baseUrl.href)),
    ...allScreens(),
  ];
  language('ru');
  const actions: readonly Readonly<[string, () => unknown]>[] = [
    ['preferences:appearance-themes', () => appearanceThemes(browser)],
    ['preferences:independent-currencies', () => independentCurrencies(browser)],
    ['navigation:back-main-focus', backFocus],
    ['feedback:repeat-save', repeatSave],
    ['feedback:toast-out-of-flow', () => feedbackToast(browser)],
    ['privacy:hidden-amounts-stable', () => hiddenAmountsStable(browser)],
    ['import:mapping-locale-invalid', importMapping],
    ['import:one-click-run-and-errors', cancelImport],
    ['settings:finance-roundtrip', () => settingsPersist(browser)],
    ['connections:configure-test-save-disconnect-undo', () => connectionLifecycle(browser)],
    ['preferences:widget-monochrome', () => widgetAppearance(browser)],
    ['sync:radio-labels-width-selection', () => conflictRadioChoices(browser)],
    ['operations:meaningful-extras-visible', () => operationExtras(browser)],
    ['overview:narrow-localized-allocation', () => narrowAllocation(browser)],
    ['cash:opening-balance-rows-and-sort', () => cashFlow(browser)],
    ['counters:unified-badge', () => unifiedCounters(browser)],
    ['overview:stable-hero-disclosure', () => stableHeroDisclosure(browser)],
    ['overview:attribution-one-line', () => attributionLine(browser)],
    ['history:row-actions-focus-undo', () => recordRowActions(browser)],
    ['portfolios:archive-delete-undo', () => entityUndo(browser)],
    ['import-sync:visible-actions-undo', () => importAndSyncUndo(browser)],
    ['destructive:visible-targets-named', () => destructiveTargets(browser)],
    ['settings:delete-focus-return', () => settingsDeleteFocus(browser)],
    ['overview:empty-state-restores-example', () => emptyOverview(browser)],
    ['privacy:hidden-import-reconciliation', hiddenReconciliation],
    ['dialogs:rapid-pointer-save-no-fallthrough', () => dialogPointerSave(browser)],
    ['sync:confirm-then-intentional-disclosure', () => syncPostConflictDisclosure(browser)],
    ['dialogs:close-paths-reopen-focus', () => dialogClosePaths(browser)],
    ['dialogs:mount-layout-shift-2px', () => dialogMountStability(browser)],
  ];
  return actions.reduce<readonly Result[]>(
    (results, [id, action]) => [
      ...results,
      check(
        id,
        action,
        results.every((result) => result.status === 'PASS'),
      ),
    ],
    pages,
  );
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
