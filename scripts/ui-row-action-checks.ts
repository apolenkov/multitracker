import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { count, focused, go, layoutShift, reveal, undoFocused, waitTrue } from './ui-helpers.ts';

const rows = '#main .history-list .history-row';
const words = {
  ru: { edit: 'Изменить', delete: 'Удалить' },
  en: { edit: 'Edit', delete: 'Delete' },
} as const;
type Language = keyof typeof words;

// Оба значка строки: имя с объектом, подсказка, цель 44×44 и попадание в центр значка.
function rowButtons(browser: Browser, index: number, language: Language) {
  const row = `${rows}:nth-child(${index + 1})`;
  const names = language === 'ru' ? words.ru : words.en;
  browser.run('scrollintoview', row);
  const observed = evaluate(
    browser,
    `(() => {
      const row = document.querySelector('${row}');
      const subject = row.querySelector('.history-row-open').getAttribute('aria-label').split(': ').slice(1).join(': ');
      const expected = [${JSON.stringify(names.edit)}, ${JSON.stringify(names.delete)}];
      const items = [...row.querySelectorAll('.row-action')].map((button, position) => {
        const box = button.getBoundingClientRect();
        return { name: button.getAttribute('aria-label'), title: button.title,
          named: button.getAttribute('aria-label') === expected[position] + ': ' + subject && button.title === expected[position],
          size: Math.round(box.width) + 'x' + Math.round(box.height),
          hit: button.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)) };
      });
      return { ok: items.length === 2 && items.every(item => item.named && item.hit && item.size === '44x44'), items };
    })()`,
  );
  assert.equal(
    typeof observed === 'object' && observed !== null && 'ok' in observed && observed.ok,
    true,
    `Два действия: имя с объектом, подсказка, 44×44, попадание: ${JSON.stringify(observed)}`,
  );
  return observed;
}

// Растянутая кнопка строки открывает подробности везде, кроме значков действий.
function rowHitArea(browser: Browser, index: number) {
  const row = `${rows}:nth-child(${index + 1})`;
  const misses = evaluate(
    browser,
    `(() => {
      const row = document.querySelector('${row}');
      const box = row.getBoundingClientRect();
      const actions = row.querySelector('.row-actions').getBoundingClientRect();
      const points = [[box.left + 2, box.top + 2], [box.left + 2, box.bottom - 2],
        [(box.left + actions.left) / 2, box.top + box.height / 2]];
      return points.filter(([x, y]) => !document.elementFromPoint(x, y)?.closest('.history-row-open'))
        .map(point => point.map(Math.round).join(','));
    })()`,
  );
  assert.deepEqual(misses, [], 'Строка операции вне значков должна открывать подробности');
}

// Карандаш → правка → Escape: фокус на карандаше. Подробности → «Изменить» → Escape: фокус на строке.
function editPaths(browser: Browser, index: number) {
  const row = `${rows}:nth-child(${index + 1})`;
  const pencil = `${row} .row-action:not(.danger)`;
  browser.run('click', pencil);
  browser.run('wait', '#record-edit-dialog[open]');
  browser.run('press', 'Escape');
  waitTrue(browser, focused(pencil), 'Escape правки должен вернуть фокус на карандаш');
  browser.run('click', `${row} .history-row-open`);
  browser.run('wait', '#record-dialog[open]');
  browser.run('click', '#record-dialog .form-actions button.primary');
  browser.run('wait', '#record-edit-dialog[open]');
  browser.run('press', 'Escape');
  waitTrue(
    browser,
    focused(`${row} .history-row-open`),
    'Правка из подробностей возвращает фокус на строку',
  );
  return { index, pencil: 'Escape → карандаш', details: 'Изменить → Escape → строка' };
}

// Удаление прячет строку под встроенное «Отменить» без сдвига; отмена возвращает ту же запись на место.
function deleteUndo(browser: Browser, from: 'row' | 'details') {
  const total = evaluate(browser, count(rows));
  assert.ok(typeof total === 'number' && total > 0, 'Нужны строки операций');
  const row = `${rows}:last-child`;
  const name = evaluate(browser, `document.querySelector('${row} .history-row-open').ariaLabel`);
  assert.ok(typeof name === 'string');
  const veiled = `document.querySelector('${row}')?.classList.contains('row-removed')`;
  layoutShift(
    browser,
    () => {
      if (from === 'row') browser.run('click', `${row} .row-action.danger`);
      else {
        browser.run('click', `${row} .history-row-open`);
        browser.run('wait', '#record-dialog[open]');
        browser.run('click', '#record-dialog .form-actions button.destructive');
      }
      waitTrue(browser, veiled, 'Строка остаётся на месте под уведомлением');
      waitTrue(
        browser,
        `Boolean(document.querySelector('${row} .row-notice[role=status] .undo-action'))`,
        'В строке нужно встроенное «Отменить»',
      );
      waitTrue(browser, undoFocused, 'После удаления фокус на «Отменить»');
    },
    `Удаление операции (${from})`,
  );
  waitTrue(
    browser,
    `${count(rows)} === ${total}`,
    'Число строк не меняется: убранная строка остаётся под уведомлением',
  );
  layoutShift(
    browser,
    () => {
      browser.run('click', `${row} .row-notice .undo-action`);
      waitTrue(browser, `!${veiled}`, 'Отмена снимает уведомление со строки');
    },
    'Отмена удаления',
  );
  // Фокус возвращается на действие строки: удаление — если строка убрана из неё,
  // открытие — если удаление нажималось в закрывшемся диалоге.
  const restored = from === 'row' ? `${row} .row-action.danger` : `${row} .history-row-open`;
  waitTrue(browser, focused(restored), `После отмены фокус на ${restored}`);
  assert.equal(
    evaluate(browser, `document.querySelector('${row} .history-row-open').ariaLabel`),
    name,
    'Отмена возвращает ту же операцию на прежнее место',
  );
  return { from, name, restored: true };
}

export function recordRowActions(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  go(browser, 'history');
  const total = evaluate(browser, count(rows));
  assert.ok(typeof total === 'number' && total > 1, 'Нужны первая и последняя операции');
  const layout = (['ru', 'en'] as const).flatMap((language) => {
    browser.run('select', '#topbar-language', language);
    return [1440, 768, 375, 320].flatMap((width) => {
      browser.run('set', 'viewport', String(width), '900');
      return [0, total - 1].map((index) => {
        const buttons = rowButtons(browser, index, language);
        rowHitArea(browser, index);
        return { width, language, index, buttons, paths: editPaths(browser, index) };
      });
    });
  });
  browser.run('select', '#topbar-language', 'ru');
  const removal = [1440, 375].flatMap((width) => {
    browser.run('set', 'viewport', String(width), '900');
    return [deleteUndo(browser, 'row'), deleteUndo(browser, 'details')];
  });
  browser.run('set', 'viewport', '1440', '900');
  return { layout, removal };
}

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
}

export function importAndSyncUndo(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  importUndo(browser);
  deviceUndo(browser);
  return { import: 'Подробности → Отменить импорт → Отменить', sync: 'Отозвать → Отменить' };
}
