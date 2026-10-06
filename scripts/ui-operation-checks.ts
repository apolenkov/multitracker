import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { isRecord } from './exhaust/guards.ts';
import { content, go, prepare, reveal, truth } from './ui-helpers.ts';

const additional = '#buy-dialog .operation-additional';
const summary = `${additional} > summary`;

function draftState(browser: Browser) {
  return evaluate(
    browser,
    '({open:document.querySelector("#buy-dialog .operation-additional")?.open,focus:document.activeElement?.id,fee:document.querySelector("#buy-dialog-fee")?.value,note:document.querySelector("#buy-dialog-note")?.value,invalid:document.querySelector("#buy-dialog-fee")?.getAttribute("aria-invalid")})',
  );
}

function fillFocused(browser: Browser, field: 'fee' | 'note', value: string) {
  if (value === '') clearFocused(browser, 'buy-dialog', field);
  else browser.run('fill', `#buy-dialog-${field}`, value);
  truth(
    browser,
    `document.activeElement?.id === 'buy-dialog-${field}' && document.querySelector('${additional}')?.open === true`,
    'Ввод должен оставлять фокус на поле и дополнительные сведения открытыми',
  );
}

function clearFocused(browser: Browser, dialog: string, field: 'fee' | 'note') {
  const selector = `#${dialog}-${field}`;
  browser.run('focus', selector);
  truth(
    browser,
    `(() => { const input = document.querySelector('${selector}'); if (!(input instanceof HTMLInputElement)) return false; input.select(); return document.activeElement === input && input.selectionStart === 0 && input.selectionEnd === input.value.length; })()`,
    'Перед очисткой должно быть выделено всё содержимое поля',
  );
  browser.run('press', 'Backspace');
  truth(browser, `document.querySelector('${selector}')?.value === ''`, 'Поле должно очиститься');
}

function retainedExtras(browser: Browser, reason: string) {
  const entered = draftState(browser);
  browser.run('click', summary);
  truth(browser, `document.querySelector('${additional}')?.open === true`, reason);
  assert.match(content(browser, summary), /Есть данные или ошибки/);
  browser.run('focus', summary);
  browser.run('press', 'Enter');
  truth(browser, `document.querySelector('${additional}')?.open === true`, reason);
  return { entered, afterMouseAndKeyboard: draftState(browser) };
}

function validExtras(browser: Browser) {
  fillFocused(browser, 'fee', '10');
  const fee = retainedExtras(browser, 'Комиссия 10 должна удерживать сведения открытыми');
  fillFocused(browser, 'fee', '0');
  fillFocused(browser, 'note', 'Учебная заметка');
  const note = retainedExtras(browser, 'Примечание должно удерживать сведения открытыми');
  fillFocused(browser, 'note', '');
  browser.run('click', summary);
  truth(
    browser,
    `document.querySelector('${additional}')?.open === false`,
    'Пустые сведения без ошибок должны сворачиваться',
  );
  return { fee, note, cleared: draftState(browser) };
}

export function operationExtras(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  browser.run('click', '.summary-result > button.primary');
  browser.run('wait', '#buy-dialog[open]');
  truth(
    browser,
    'document.querySelectorAll(\'dialog[open] [role="alert"]:not(:empty)\').length === 0',
    'Сразу после открытия покупки ошибок быть не должно',
  );
  browser.run('click', '#buy-dialog button[type="submit"]');
  truth(
    browser,
    'document.querySelector("#buy-dialog-quantity-error")?.textContent === "Введите количество больше 0"',
    'Пустое количество после отправки должно получить собственный текст ошибки',
  );
  browser.run('fill', '#buy-dialog-quantity', '1');
  truth(
    browser,
    '!document.querySelector("#buy-dialog-quantity-error")',
    'Ошибка после отправки должна исчезать сразу при исправлении поля',
  );
  browser.run('click', '#buy-dialog .close-button');
  browser.run('wait', '--fn', '!document.querySelector("#buy-dialog[open]")');
  browser.run('click', '.summary-result > button.primary');
  browser.run('wait', '#buy-dialog[open]');
  reveal(browser, summary);
  const valid = validExtras(browser);
  reveal(browser, summary);
  browser.run('fill', '#buy-dialog-quantity', '1');
  browser.run('fill', '#buy-dialog-price', '100');
  fillFocused(browser, 'fee', 'abc');
  browser.run('click', '#buy-dialog button[type="submit"]');
  truth(
    browser,
    'document.querySelector("#buy-dialog-fee")?.getAttribute("aria-invalid") === "true" && document.activeElement?.id === "buy-dialog-fee"',
    'Неверная комиссия должна получить ошибку и фокус после отправки',
  );
  const invalid = retainedExtras(browser, 'Ошибка комиссии должна оставаться видимой');
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', '!document.querySelector("#buy-dialog[open]")');
  const edited = editedExtras(browser);
  return { valid, invalid, edited, result: 'Проверенные черновики отменены' };
}

function editedExtras(browser: Browser) {
  go(browser, 'history');
  browser.run('click', '.history-row:first-child .row-action:not(.danger)');
  browser.run('wait', '#record-edit-dialog[open]');
  truth(
    browser,
    'document.querySelector("#record-edit-dialog .operation-additional")?.open === true && Boolean(document.querySelector("#record-edit-dialog-note")?.value.trim())',
    'Редактирование должно открыть ранее сохранённое примечание',
  );
  browser.run('fill', '#record-edit-dialog-fee', '0');
  clearFocused(browser, 'record-edit-dialog', 'note');
  truth(
    browser,
    'document.querySelector("#record-edit-dialog-note")?.value === "" && document.querySelector("#record-edit-dialog .operation-additional")?.open === true && document.activeElement?.id === "record-edit-dialog-note" && document.activeElement?.checkVisibility() === true',
    'Очистка сохранённых сведений должна оставлять поле открытым и сохранять фокус',
  );
  browser.run('click', '#record-edit-dialog .operation-additional > summary');
  truth(
    browser,
    'document.querySelector("#record-edit-dialog .operation-additional")?.open === false',
    'Пустой исправленный черновик должен сворачиваться по явному действию',
  );
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', '!document.querySelector("#record-edit-dialog[open]")');
  return 'Исходное примечание → очистка с фокусом → явное сворачивание → отмена';
}

// Сумма строки — в валюте операции: приток «+», отток «−», без знака для
// покупки/продажи; вторая строка с пересчётом не добавляется. Ожидание считает
// тот же Intl.NumberFormat, что и money() — совпадение посимвольное.
function amountsIn(
  browser: Browser,
  lang: 'ru' | 'en',
  cases: readonly (readonly [string, number, boolean])[],
) {
  const pairs = evaluate(
    browser,
    `(() => { const fmt = (v, signed) => new Intl.NumberFormat(
        '${lang === 'ru' ? 'ru-RU' : 'en-US'}',
        { style: 'currency', currency: 'USD', maximumFractionDigits: 2,
          signDisplay: signed ? 'exceptZero' : 'auto' }).format(v);
      const amountOf = (label) => [...document.querySelectorAll('.history-row')]
        .find((row) => row.querySelector('h2')?.textContent?.includes(label))
        ?.querySelector('.record-amount dd')?.textContent ?? null;
      return { ${cases.map(([label, value, signed]) => `${JSON.stringify(label)}: [amountOf(${JSON.stringify(label)}), fmt(${value}, ${signed ? 'true' : 'false'})]`).join(', ')} }; })()`,
  );
  assert.ok(isRecord(pairs), `${lang}: ожидались суммы строк`);
  for (const [label, pair] of Object.entries(pairs)) {
    assert.ok(Array.isArray(pair) && pair.length === 2, `${lang} ${label}: пара`);
    assert.equal(pair[0], pair[1], `${lang} ${label}: сумма в валюте операции со знаком`);
  }
  return pairs;
}

export function rowAmountOperationCurrency(browser: Browser) {
  prepare(browser);
  go(browser, 'history');
  const ru = amountsIn(browser, 'ru', [
    ['Пополнение', 100, true],
    ['Вывод', -100, true],
    ['Комиссия', -5, true],
    ['Дивиденд', 100, true],
    ['Продажа', 600, false],
    ['Начальный остаток', 0, true],
  ]);
  browser.run('select', '#topbar-language', 'en');
  browser.run('wait', '--fn', 'document.documentElement.lang === "en"');
  const en = amountsIn(browser, 'en', [
    ['Deposit', 100, true],
    ['Withdrawal', -100, true],
    ['Fee', -5, true],
    ['Dividend', 100, true],
    ['Sale', 600, false],
  ]);
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  return { ru, en };
}

/** Проверки операций для списка check-ui: сведения черновика и знак суммы. */
export function operationActions(browser: Browser): readonly Readonly<[string, () => unknown]>[] {
  return [
    ['operations:meaningful-extras-visible', () => operationExtras(browser)],
    ['operations:amount-operation-currency', () => rowAmountOperationCurrency(browser)],
  ];
}
