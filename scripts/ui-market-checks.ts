import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { content, go, prepare, reveal, truth } from './ui-exploration.ts';

const asset = '[data-market-symbol="MSFT"]';
const assetDialog = '#market-asset-dialog';
const alertDialog = '#market-alert-dialog';
const lastAlert = '.market-alert-list > li:last-child';

function escapeFocus(browser: Browser, dialog: string, opener: string) {
  browser.run('press', 'Escape');
  const ready = `!document.querySelector('${dialog}[open]') && document.activeElement?.matches(${JSON.stringify(opener)})`;
  browser.run('wait', '--fn', ready);
  truth(browser, ready, 'Escape должен закрыть диалог и вернуть фокус');
}

function searchReset(browser: Browser) {
  browser.run('fill', '#market-search', 'no-such-asset-987');
  truth(
    browser,
    'document.querySelectorAll(".market-list li").length === 0 && Boolean(document.querySelector(".market-empty")?.innerText.trim())',
    'Пустой поиск должен показывать понятное состояние',
  );
  browser.run('click', '#market-empty-clear');
  truth(
    browser,
    'document.querySelector("#market-search")?.value === "" && document.querySelectorAll(".market-list li").length > 0',
    'Сброс должен очистить поиск и вернуть список',
  );
  browser.run('fill', '#market-search', 'no-such-asset-987');
  reveal(browser, '#market-filter-disclosure > summary');
  browser.run('click', '#market-clear');
  truth(
    browser,
    'document.querySelector("#market-search")?.value === "" && document.querySelectorAll(".market-list li").length > 0',
    'Сброс раскрытых фильтров должен вернуть список',
  );
}

export function marketFollowing(browser: Browser) {
  prepare(browser);
  go(browser, 'following');
  assert.match(content(browser, '.market-empty'), /нет активов/);
  go(browser, 'markets');
  searchReset(browser);
  browser.run('click', `${asset} .market-open`);
  browser.run('wait', `${assetDialog}[open]`);
  assert.match(content(browser, assetDialog), /MSFT/);
  escapeFocus(browser, assetDialog, `${asset} .market-open`);
  browser.run('click', `${asset} .market-follow`);
  go(browser, 'following');
  truth(
    browser,
    `document.querySelector('${asset} .market-follow')?.getAttribute('aria-pressed') === 'true'`,
    'Выбранный актив должен появиться в наблюдении',
  );
  browser.run('click', `${asset} .market-follow`);
  truth(
    browser,
    'document.querySelectorAll(".market-list li").length === 0 && Boolean(document.querySelector(".market-empty")?.innerText.trim())',
    'Снятие наблюдения должно вернуть пустой список',
  );
  go(browser, 'markets');
  truth(
    browser,
    `document.querySelector('${asset} .market-follow')?.getAttribute('aria-pressed') === 'false'`,
    'Снятие наблюдения должно сохраняться',
  );
  return 'Пустой поиск → сброс; детали Escape → фокус; MSFT → наблюдение → удаление → рынок';
}

function alertCount(browser: Browser) {
  const count = evaluate(browser, 'document.querySelectorAll(".market-alert-list > li").length');
  assert.ok(typeof count === 'number', 'Нет списка уведомлений');
  return count;
}

function openNewAlert(browser: Browser) {
  go(browser, 'markets');
  browser.run('click', `${asset} .market-open`);
  browser.run('wait', `${assetDialog}[open]`);
  browser.run('click', '#market-create-alert');
  browser.run('wait', `${alertDialog}[open]`);
}

function invalidAlert(browser: Browser) {
  const count = alertCount(browser);
  ['', 'abc', '0', '-1'].forEach((value) => {
    browser.run('fill', '#market-threshold', value);
    browser.run('click', '#market-save-alert');
    truth(
      browser,
      'Boolean(document.querySelector("#market-alert-dialog[open]")) && document.querySelector("#market-threshold")?.getAttribute("aria-invalid") === "true" && Boolean(document.querySelector("#market-threshold-error")?.innerText.trim())',
      `Неверный порог ${JSON.stringify(value)} должен блокировать сохранение`,
    );
    assert.equal(alertCount(browser), count, 'Неверный черновик изменил список');
  });
}

function cancelAlertEdit(browser: Browser) {
  const saved = content(browser, lastAlert);
  browser.run('click', `${lastAlert} [data-market-action="edit"]`);
  browser.run('wait', `${alertDialog}[open]`);
  assert.equal(evaluate(browser, 'document.querySelector("#market-threshold")?.value'), '910');
  browser.run('fill', '#market-threshold', '999');
  browser.run('click', '#market-cancel-alert');
  browser.run('wait', '--fn', '!document.querySelector("#market-alert-dialog[open]")');
  assert.equal(content(browser, lastAlert), saved, 'Отмена изменила сохранённый порог');
  browser.run('click', `${lastAlert} [data-market-action="edit"]`);
  browser.run('wait', `${alertDialog}[open]`);
  assert.equal(evaluate(browser, 'document.querySelector("#market-threshold")?.value'), '910');
  escapeFocus(browser, alertDialog, `${lastAlert} [data-market-action="edit"]`);
  return saved;
}

export function alertDraft(browser: Browser) {
  prepare(browser);
  go(browser, 'markets');
  const before = alertCount(browser);
  openNewAlert(browser);
  invalidAlert(browser);
  browser.run('fill', '#market-threshold', '910');
  browser.run('select', '#market-condition', 'below');
  reveal(browser, '#market-frequency-disclosure > summary');
  browser.run('select', '#market-frequency', 'repeat');
  browser.run('click', '#market-save-alert');
  browser.run('wait', '--fn', '!document.querySelector("#market-alert-dialog[open]")');
  assert.equal(alertCount(browser), before + 1, 'Сохранение не добавило уведомление');
  const saved = cancelAlertEdit(browser);
  assert.ok(saved.includes('910,00\u00a0$'), 'Сохранённое условие должно показывать ровно 910 USD');
  assert.match(saved, /Ниже/);
  assert.match(saved, /Повторять/);
  assert.ok(content(browser, '.demo-status'), 'Нет сообщения о сохранении');
  browser.run('click', `${lastAlert} [data-market-action="pause"]`);
  assert.match(content(browser, lastAlert), /Приостановлено/);
  browser.run('click', `${lastAlert} [data-market-action="pause"]`);
  assert.match(content(browser, lastAlert), /Пример включён/);
  deleteAlert(browser, before);
  assert.equal(alertCount(browser), before, 'Удаление не восстановило исходный список');
  return { saved, invalid: ['', 'abc', '0', '-1'], editedDraft: '999 → отмена → 910' };
}

function deleteAlert(browser: Browser, before: number) {
  browser.run('click', `${lastAlert} [data-market-action="delete"]`);
  browser.run('wait', '#market-delete-alert-dialog[open]');
  assert.equal(alertCount(browser), before + 1, 'Открытие подтверждения удалило уведомление');
  browser.run('click', '#market-cancel-delete-alert');
  browser.run('wait', '--fn', '!document.querySelector("#market-delete-alert-dialog[open]")');
  assert.equal(alertCount(browser), before + 1, 'Отмена подтверждения удалила уведомление');
  browser.run('click', `${lastAlert} [data-market-action="delete"]`);
  browser.run('wait', '#market-delete-alert-dialog[open]');
  browser.run('click', '#market-confirm-delete-alert');
  browser.run('wait', '--fn', '!document.querySelector("#market-delete-alert-dialog[open]")');
}

export function marketRouteClosure(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  go(browser, 'markets');
  browser.run('click', `${asset} .market-open`);
  browser.run('wait', `${assetDialog}[open]`);
  browser.run('back');
  const ready =
    'location.hash === "#overview" && !document.querySelector("dialog[open]") && document.activeElement?.id === "main" && document.querySelector("#main h1")?.textContent === "Обзор"';
  browser.run('wait', '--fn', ready);
  truth(browser, ready, 'Назад должен закрыть диалог и вернуть раздел с фокусом');
  go(browser, 'markets');
  browser.run('click', `${asset} .market-open`);
  browser.run('wait', `${assetDialog}[open]`);
  escapeFocus(browser, assetDialog, `${asset} .market-open`);
  return 'Рынок с открытым диалогом → Назад → Обзор без диалогов; повторное открытие и Escape';
}
