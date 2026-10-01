import assert from 'node:assert/strict';
import type { Browser } from './ui-driver.ts';
import { content, go, prepare, reveal, truth } from './ui-helpers.ts';

const card = '.connection-list .connection-row:nth-of-type(1)';
const dialog = '#connection-config';
const status = '.demo-page .demo-status [role=status] span';

function testConnection(browser: Browser) {
  browser.run('click', '#connection-test');
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${dialog} [role=status] p')?.textContent === 'Проверка успешна: доступны только остатки и история.'`,
  );
  reveal(browser, `${dialog} .demo-scenarios > summary`);
  browser.run('select', `${dialog} .demo-scenarios select`, 'error');
  browser.run('click', '#connection-test');
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${dialog} [role=status] p')?.textContent === 'Ошибка: чтение истории недоступно. Повторите проверку.'`,
  );
  browser.run('click', `${dialog} [role=status] button`);
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${dialog} [role=status] p')?.textContent === 'Проверка успешна: доступны только остатки и история.' && document.activeElement?.id === 'connection-test'`,
  );
  return 'Проверка: успех, ошибка доступа, повтор с фокусом на кнопке';
}

export function connectionLifecycle(browser: Browser) {
  prepare(browser);
  go(browser, 'connections');
  assert.match(
    content(browser, `${card} .connection-summary > p`),
    /Не настроено/,
    'Tradernet должен начинаться без настройки',
  );
  browser.run('click', `${card} .connection-actions button`);
  browser.run('wait', `${dialog}[open]`);
  const tested = testConnection(browser);
  browser.run('click', `${dialog} button[type=submit]`);
  browser.run(
    'wait',
    '--fn',
    `!document.querySelector('${dialog}[open]') && document.querySelector('${status}')?.textContent === 'Учебная конфигурация сохранена только в памяти вкладки.'`,
  );
  assert.match(
    content(browser, `${card} .connection-summary > p`),
    /Настроено/,
    'Сохранение должно настроить источник',
  );
  browser.run('click', `${card} button.danger`);
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${status}')?.textContent === 'Источник отключён в примере. Никакие ключи и операции не удалялись.' && Boolean(document.querySelector('.demo-status .undo-action'))`,
  );
  assert.match(
    content(browser, `${card} .connection-summary > p`),
    /Не настроено/,
    'Отключение должно убрать настройку',
  );
  browser.run('click', '.demo-status .undo-action');
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${status}')?.textContent === 'Действие отменено.'`,
  );
  truth(
    browser,
    `document.querySelector('${card} .connection-summary > p')?.textContent === 'Настроено'`,
    'Отмена должна вернуть настройку источника',
  );
  return { tested, saved: 'Карточка «Настроено» после Save', restored: 'Undo вернул настройку' };
}
