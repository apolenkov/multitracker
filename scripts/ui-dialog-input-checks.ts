import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { go, prepare, truth } from './ui-helpers.ts';
import { routeReady } from './exhaust/probe.ts';
import { isRecord } from './exhaust/guards.ts';

export type Lang = 'ru' | 'en';

/** Экран/язык/окно для изолированной проверки: закрывает забытый диалог. */
export function env(browser: Browser, screen: string, width: number, height: number, lang: Lang) {
  browser.run('set', 'viewport', '1440', '900');
  if (evaluate(browser, 'Boolean(document.querySelector("dialog[open]"))') === true) {
    browser.run('press', 'Escape');
    browser.run('wait', '--fn', '!document.querySelector("dialog[open]")');
  }
  evaluate(browser, `location.hash = ${JSON.stringify(`#${screen}`)}; true`);
  browser.run('wait', '--fn', routeReady(`#${screen}`));
  settleLayout(browser);
  browser.run('select', '#topbar-language', lang);
  browser.run('wait', '--fn', `document.documentElement.lang === '${lang}'`);
  browser.run('set', 'viewport', String(width), String(height));
  settleLayout(browser);
}

/** Открыть «Добавить операцию» и вернуть открытый buy-dialog. */
function openBuy(browser: Browser, width = 1440, height = 900) {
  env(browser, 'history', width, height, 'ru');
  browser.run('click', '.page-heading-actions .primary');
  browser.run('wait', '#buy-dialog[open]');
}

/** Открыть карандаш денежной строки («Изменить остаток») на обзоре. */
function openBalance(browser: Browser) {
  env(browser, 'overview', 1440, 900, 'ru');
  browser.run('click', '.cash-holding-row[data-currency="RUB"] .row-action');
  browser.run('wait', '#buy-dialog[open]');
}

function close(browser: Browser, dialog: string) {
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', `!document.querySelector('${dialog}[open]')`);
}

const sharedLine = (dialog: string) =>
  `(() => { const head = document.querySelector('${dialog} .dialog-heading');
    const h2 = head.querySelector('h2');
    const range = document.createRange();
    range.selectNodeContents(h2.firstChild);
    const tr = range.getBoundingClientRect();
    const icon = head.querySelector(':is(.close-button,.icon-close) svg').getBoundingClientRect();
    return { text: (tr.top + tr.bottom) / 2, icon: (icon.top + icon.bottom) / 2 }; })()`;

function lineMetrics(raw: unknown) {
  assert.ok(
    isRecord(raw) && typeof raw.text === 'number' && typeof raw.icon === 'number',
    'геометрия шапки не прочитана',
  );
  return { text: raw.text, icon: raw.icon };
}

function formGeometry(raw: unknown) {
  assert.ok(
    isRecord(raw) && typeof raw.footer === 'number' && typeof raw.name === 'number',
    'геометрия формы не прочитана',
  );
  return { footer: raw.footer, name: raw.name };
}

/** При открытии фокус — на первом пустом поле ввода, а не на крестике. */
export function inputInitialFocus(browser: Browser) {
  openBuy(browser);
  truth(
    browser,
    `document.activeElement?.id === 'buy-dialog-quantity'`,
    'Покупка: фокус на первом пустом поле (количество), а не на крестике',
  );
  close(browser, '#buy-dialog');
  env(browser, 'portfolios', 1440, 900, 'ru');
  browser.run('find', 'role', 'button', 'click', '--name', '+ Создать портфель', '--exact');
  browser.run('wait', '#portfolio-dialog[open]');
  truth(
    browser,
    `document.activeElement?.id === 'portfolio-dialog-name'`,
    'Создание портфеля: фокус на имени, а не на крестике',
  );
  close(browser, '#portfolio-dialog');
  openBalance(browser);
  truth(
    browser,
    `document.activeElement?.id === 'buy-dialog-amount'`,
    'Изменить остаток: фокус на сумме остатка',
  );
  return 'покупка → количество, портфель → имя, остаток → сумма';
}

/** Счёт свёрнут в details «Tradernet · основной · Изменить»; тип скрыт в контексте. */
export function accountCollapsed(browser: Browser) {
  openBuy(browser);
  truth(
    browser,
    `(() => { const d = document.querySelector('#buy-dialog .operation-account');
      const s = d?.querySelector('summary')?.textContent?.trim();
      return d?.open === false && s === 'Tradernet · основной · Изменить'; })()`,
    'Счёт свёрнут в строку «Tradernet · основной · Изменить»',
  );
  browser.run('click', '#buy-dialog .operation-account > summary');
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('#buy-dialog .operation-account')?.open === true`,
  );
  truth(
    browser,
    `(() => { const el = document.querySelector('#buy-dialog-portfolioId');
      // checkVisibility() в Chromium возвращает false внутри любого details —
      // видимость доказываем раскрытием и ненулевой рамкой.
      return document.querySelector('#buy-dialog .operation-account')?.open === true &&
        (el?.getBoundingClientRect().height ?? 0) > 0; })()`,
    'Раскрытый счёт показывает выбор портфеля',
  );
  close(browser, '#buy-dialog');
  openBalance(browser);
  truth(
    browser,
    `!document.querySelector('#buy-dialog-type') && document.querySelector('#buy-dialog-title')?.textContent === 'Начальный остаток'`,
    'Изменить остаток: выбор типа скрыт, заголовок — «Начальный остаток»',
  );
  return 'details счёта свёрнут; тип скрыт при изменении остатка';
}

/** «Сравнить версии»: кнопка ниже сгиба — без прокрутки клик молча промахивается. */
function openSyncConflict(browser: Browser) {
  const trigger = '.sync-panel > .sync-actions:last-child > button';
  browser.run('scrollintoview', trigger);
  settleLayout(browser);
  browser.run('click', trigger);
  browser.run('wait', '#sync-conflict[open]');
}

/** На 375×667 количество и цена видны выше липкого подвала. */
export function fieldsAboveFold(browser: Browser) {
  openBuy(browser, 375, 667);
  truth(
    browser,
    `(() => { const d = document.querySelector('#buy-dialog');
      const footerTop = d.querySelector('.form-actions').getBoundingClientRect().top;
      return ['quantity', 'price'].every((f) =>
        d.querySelector('#buy-dialog-' + f).getBoundingClientRect().bottom <= footerTop + 1); })()`,
    'Количество и цена выше сгиба на 375×667',
  );
  return 'количество и цена выше липкого подвала на 375×667';
}

/** Заголовок и крестик на одной линии во всех диалогах: без посторонних полей. */
export function headingSharedLine(browser: Browser) {
  const dialogs: readonly [string, () => void][] = [
    ['#buy-dialog', () => openBuy(browser)],
    [
      '#sync-conflict',
      () => {
        env(browser, 'sync', 1440, 900, 'ru');
        openSyncConflict(browser);
      },
    ],
  ];
  return dialogs.map(([id, open]) => {
    open();
    const observed = lineMetrics(evaluate(browser, sharedLine(id)));
    assert.ok(
      Math.abs(observed.text - observed.icon) <= 1.5,
      `${id}: заголовок и крестик не на одной линии: ${JSON.stringify(observed)}`,
    );
    close(browser, id);
    return { id, ...observed };
  });
}

/** Кнопки синхронизации «Сравнить версии / Отмена» — 16 px. */
export function syncButtonSize(browser: Browser) {
  env(browser, 'sync', 1440, 900, 'ru');
  truth(
    browser,
    `getComputedStyle(document.querySelector('.sync-actions button.quiet')).fontSize === '16px'`,
    '«Сравнить версии» — 16 px',
  );
  openSyncConflict(browser);
  truth(
    browser,
    `getComputedStyle(document.querySelector('#sync-conflict .dialog-actions .quiet')).fontSize === '16px'`,
    '«Отмена» в конфликте — 16 px',
  );
  return 'compare 16px, отмена 16px, подтвердить 16px';
}

/** Открытие не прокручивает форму: подписи не уезжают под липкую шапку (матрица FORM-031..041). */
export function openNoScroll(browser: Browser) {
  openBuy(browser, 375, 800);
  const probe = `(() => { const dialog = document.getElementById('buy-dialog');
    const btn = dialog.querySelector('.close-button').getBoundingClientRect();
    const texts = [...dialog.querySelectorAll('label, legend, p, span')]
      .filter((el) => el.checkVisibility() && el.getBoundingClientRect().width > 0)
      .filter((el) => { const r = el.getBoundingClientRect();
        return r.bottom > btn.top && r.top < btn.bottom && r.right > btn.left && r.left < btn.right; })
      .map((el) => el.tagName + ':' + el.textContent.slice(0, 30));
    return { scroll: dialog.scrollTop, hits: texts }; })()`;
  const raw = evaluate(browser, probe);
  assert.ok(
    isRecord(raw) && raw.scroll === 0 && Array.isArray(raw.hits) && raw.hits.length === 0,
    `открытие прокрутило форму: ${JSON.stringify(raw)}`,
  );
  close(browser, '#buy-dialog');
  return 'scrollTop=0, надписей под крестиком нет';
}

/** Все проверки вводных диалогов одним списком для check-ui. */
export function inputDialogActions(browser: Browser): readonly Readonly<[string, () => unknown]>[] {
  return [
    ['dialogs:input-initial-focus', () => inputInitialFocus(browser)],
    ['dialogs:account-collapsed-summary', () => accountCollapsed(browser)],
    ['dialogs:open-no-scroll', () => openNoScroll(browser)],
    ['dialogs:fields-above-fold-375', () => fieldsAboveFold(browser)],
    ['dialogs:heading-shared-line', () => headingSharedLine(browser)],
    ['dialogs:sync-button-16px', () => syncButtonSize(browser)],
    ['dialogs:error-stable-footer', () => errorStableFooter(browser)],
  ];
}

/** Ошибка в диалоге сущности не двигает поля выше неё и подвал. */
export function errorStableFooter(browser: Browser) {
  prepare(browser);
  go(browser, 'portfolios');
  browser.run('find', 'role', 'button', 'click', '--name', '+ Создать портфель', '--exact');
  browser.run('wait', '#portfolio-dialog[open]');
  const geometry = `(() => { return { footer: document.querySelector('#portfolio-dialog .form-actions').getBoundingClientRect().top,
    name: document.querySelector('#portfolio-dialog-name').getBoundingClientRect().top }; })()`;
  const before = formGeometry(evaluate(browser, geometry));
  evaluate(browser, "(document.querySelector('#portfolio-dialog form')?.requestSubmit(), true)");
  browser.run('wait', '--fn', `!!document.querySelector('#portfolio-dialog .field-error')`);
  const after = formGeometry(evaluate(browser, geometry));
  assert.ok(
    Math.abs(after.footer - before.footer) <= 2 && Math.abs(after.name - before.name) <= 2,
    `Ошибка сдвинула форму: ${JSON.stringify({ before, after })}`,
  );
  truth(
    browser,
    `document.activeElement?.id === 'portfolio-dialog-name'`,
    'Фокус на поле с ошибкой',
  );
  return { before, after };
}
