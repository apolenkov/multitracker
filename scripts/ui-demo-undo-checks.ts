import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { announcements, count, focused, go, reveal, undoFocused, waitTrue } from './ui-helpers.ts';

const entities: readonly {
  items: string;
  veil: string;
  opener: string;
  action: string;
  names: string;
  inside?: string;
}[] = [
  {
    items: '.portfolio-record',
    veil: '.portfolio-record:first-child',
    opener: '.portfolio-record:first-child .portfolio-manage .row-action',
    action: 'В архив',
    names:
      '[...document.querySelectorAll(".portfolio-record .portfolio-name strong")].map(i => i.textContent)',
  },
  {
    items: '.account-list li:has(.row-action)',
    veil: '.account-list li:has(.row-action)',
    opener: '.account-list li:first-child .row-action',
    action: 'Удалить',
    names: '[...document.querySelectorAll(".account-list li strong")].map(i => i.textContent)',
  },
  {
    items: '.group-slot',
    veil: '.group-slot',
    opener: '.group-slot button[aria-label^="Изменить группу"]',
    action: 'В архив',
    names: '[...document.querySelectorAll(".group-slot button")].map(i => i.textContent)',
    inside: '.portfolio-selection > summary',
  },
];

// Архив и удаление портфеля, счёта и группы — из подвала правки, на месте, с «Отменить».
export function entityUndo(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  go(browser, 'portfolios');
  return entities.map(({ items, veil, opener, action, names, inside }) => {
    if (inside) {
      reveal(browser, inside);
      // details::details-content растёт с анимацией: ждём, пока цель перестанет быть перекрытой.
      waitTrue(
        browser,
        `(() => { const b = document.querySelector('${opener}'); const r = b?.getBoundingClientRect(); return Boolean(r && r.width > 0) && b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })()`,
        'Кнопка группы должна быть доступна для клика',
      );
    }
    const before = evaluate(browser, names);
    const total = evaluate(browser, count(items));
    assert.ok(typeof total === 'number' && total > 0, `Нужны пункты ${items}`);
    browser.run('click', opener);
    browser.run('wait', '#entity-dialog[open]');
    browser.run('find', 'role', 'button', 'click', '--name', `${action}:`);
    waitTrue(
      browser,
      `document.querySelector('${veil}')?.classList.contains('row-removed')`,
      `${action}: строка остаётся на месте под уведомлением`,
    );
    waitTrue(browser, undoFocused, `${action}: фокус на «Отменить»`);
    browser.run('click', `${veil} .undo-action`);
    waitTrue(
      browser,
      `!document.querySelector('${veil}')?.classList.contains('row-removed')`,
      `${action}: отмена сняла уведомление`,
    );
    // Кнопка «В архив/Удалить» нажималась в диалоге и ушла с ним — фокус на действии записи.
    waitTrue(
      browser,
      `document.querySelector('${veil}')?.contains(document.activeElement) === true`,
      `${action}: после отмены фокус на действии записи`,
    );
    waitTrue(
      browser,
      `${announcements} === 1`,
      `${action}: после отмены объявлено ровно одно сообщение`,
    );
    assert.deepEqual(evaluate(browser, names), before, `${action}: тот же пункт на прежнем месте`);
    return { items, action, restored: true };
  });
}

// Импорт: видимые «Подробности» и «Сверить остаток»; отмена импорта — встроенное «Отменить».
function importUndo(browser: Browser) {
  go(browser, 'import');
  browser.run('click', '#import-history-details');
  browser.run('wait', '#import-history[open]');
  browser.run('find', 'role', 'button', 'click', '--name', 'Отменить импорт', '--exact');
  waitTrue(
    browser,
    'document.querySelector(".import-entry")?.classList.contains("row-removed")',
    'Запись импорта остаётся под уведомлением',
  );
  waitTrue(
    browser,
    'document.querySelector("#import-history-details")?.checkVisibility({checkVisibilityCSS:true}) === false',
    'Действия убранной записи скрыты',
  );
  waitTrue(browser, undoFocused, 'Отмена импорта: фокус на «Отменить»');
  browser.run('click', '.import-entry .undo-action');
  waitTrue(
    browser,
    'document.querySelector("#import-history-details")?.checkVisibility({checkVisibilityCSS:true}) === true',
    'Отмена вернула запись импорта',
  );
  // «Отменить импорт» нажималась в диалоге — фокус на первом действии записи.
  waitTrue(
    browser,
    'document.querySelector(".import-entry")?.contains(document.activeElement) === true',
    'Отмена импорта: фокус на действии записи',
  );
  waitTrue(browser, `${announcements} === 1`, 'Отмена импорта: объявлено ровно одно сообщение');
}

// Синхронизация: видимая «Отозвать доступ» вместо меню из одного пункта.
function deviceUndo(browser: Browser) {
  go(browser, 'sync');
  const revoke = '#sync-revoke-mobile';
  browser.run('wait', revoke);
  assert.equal(
    evaluate(browser, `document.querySelector('${revoke}').getAttribute('aria-label')`),
    'Отозвать доступ: Телефон',
  );
  browser.run('scrollintoview', revoke);
  browser.run('click', revoke);
  waitTrue(
    browser,
    'Boolean(document.querySelector(".sync-devices article.row-removed"))',
    'Устройство остаётся на месте под уведомлением',
  );
  waitTrue(browser, undoFocused, 'Отзыв: фокус на «Отменить»');
  browser.run('click', '.sync-devices .undo-action');
  waitTrue(
    browser,
    `document.querySelector('${revoke}')?.checkVisibility({checkVisibilityCSS:true}) === true`,
    'Отмена вернула доступ устройства',
  );
  waitTrue(browser, focused(revoke), 'Отзыв: после отмены фокус на «Отозвать доступ»');
  waitTrue(browser, `${announcements} === 1`, 'Отзыв: после отмены объявлено ровно одно сообщение');
}

export function importAndSyncUndo(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  importUndo(browser);
  deviceUndo(browser);
  return { import: 'Подробности → Отменить импорт → Отменить', sync: 'Отозвать → Отменить' };
}
