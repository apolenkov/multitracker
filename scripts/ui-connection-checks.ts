import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { content, go, prepare, reveal, truth, waitTrue } from './ui-helpers.ts';

const card = '.connection-list .connection-row:nth-of-type(1)';
const dialog = '#connection-config';
const status = '.status-message [role=status] p';

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
  disconnectUndo(browser);
  return { tested, saved: 'Карточка «Настроено» после Save', restored: 'Undo вернул настройку' };
}

// Отключение накрывает карточку встроенным «Отменить»; отмена возвращает настройку.
function disconnectUndo(browser: Browser) {
  const disconnect = `${card} button.danger`;
  assert.equal(
    evaluate(
      browser,
      `document.querySelector(${JSON.stringify(disconnect)})?.getAttribute('aria-label')`,
    ),
    'Отключить: Tradernet',
    'Отключение источника называет провайдера',
  );
  browser.run('click', disconnect);
  // Объявление одно — в карточке; плашка без таймера может держать прошлое
  // сохранение, но не должна объявлять отключение.
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${card} .row-notice[role=status]')?.getAttribute('aria-label') === 'Источник отключён в примере. Никакие ключи и операции не удалялись.' && document.querySelector('${card}')?.classList.contains('row-removed') && !document.querySelector('${status}')?.textContent?.includes('Источник отключён')`,
  );
  // Фокус ставится в requestAnimationFrame: ждём кадр, а не читаем состояние мгновенно.
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${card} .undo-action') === document.activeElement`,
    '--timeout',
    '5000',
  );
  truth(
    browser,
    `document.querySelector('${card} .undo-action') === document.activeElement`,
    'Отключение переводит фокус на встроенное «Отменить»',
  );
  browser.run('click', `${card} .undo-action`);
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${status}')?.textContent === 'Действие отменено.' && !document.querySelector('${card}')?.classList.contains('row-removed')`,
  );
  // Фокус возвращается кадром после размонтирования уведомления — ждём его.
  waitTrue(
    browser,
    `document.querySelector('${card} .connection-actions .danger') === document.activeElement`,
    'Отмена возвращает фокус на «Отключить» карточки',
  );
  truth(
    browser,
    `document.querySelector('${card} .connection-summary > p')?.textContent === 'Настроено'`,
    'Отмена должна вернуть настройку источника',
  );
}
