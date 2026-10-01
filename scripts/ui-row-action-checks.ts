import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';

const rows = '#main .history-list .history-row';
const words = {
  ru: { edit: 'Изменить', delete: 'Удалить' },
  en: { edit: 'Edit', delete: 'Delete' },
} as const;
type Language = keyof typeof words;

function waitTrue(browser: Browser, source: string, message: string) {
  browser.run('wait', '--fn', source);
  assert.equal(evaluate(browser, source), true, message);
}
const focused = (selector: string) =>
  `document.activeElement === document.querySelector('${selector}')`;
const undoFocused = `Array.from(document.querySelectorAll('.undo-action')).some(button => button === document.activeElement && button.checkVisibility())`;
const count = (selector: string) => `document.querySelectorAll('${selector}').length`;

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

// Удаление сразу убирает строку, ставит фокус на «Отменить»; отмена возвращает ту же операцию.
function deleteUndo(browser: Browser, from: 'row' | 'details') {
  const before = evaluate(browser, count(rows));
  assert.ok(typeof before === 'number' && before > 1);
  const row = `${rows}:last-child`;
  const name = evaluate(browser, `document.querySelector('${row} .history-row-open').ariaLabel`);
  assert.ok(typeof name === 'string');
  if (from === 'row') browser.run('click', `${row} .row-action.danger`);
  else {
    browser.run('click', `${row} .history-row-open`);
    browser.run('wait', '#record-dialog[open]');
    browser.run('click', '#record-dialog .form-actions button.destructive');
  }
  waitTrue(browser, `${count(rows)} === ${before - 1}`, 'Удаление убирает строку из списка');
  waitTrue(browser, undoFocused, 'После удаления фокус на «Отменить»');
  const present = `[...document.querySelectorAll('${rows} .history-row-open')].some(item => item.ariaLabel === ${JSON.stringify(name)})`;
  assert.equal(evaluate(browser, present), false, 'Удалённая строка не должна оставаться');
  browser.run('click', '.status-message .undo-action');
  waitTrue(browser, `${count(rows)} === ${before} && ${present}`, 'Отмена возвращает операцию');
  return { from, name, before, after: before - 1, restored: true };
}

export function recordRowActions(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('click', '.desktop-links a[href="#history"]');
  browser.run('wait', '--fn', 'location.hash === "#history"');
  const total = evaluate(browser, count(rows));
  assert.ok(typeof total === 'number' && total > 1, 'Нужны первая и последняя операции');
  const layout = (['ru', 'en'] as const).flatMap((language) => {
    browser.run('select', '#topbar-language', language);
    return [1440, 375, 320].flatMap((width) => {
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

// Архив и удаление портфеля, счёта и группы — из подвала правки, сразу, с «Отменить».
export function entityUndo(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('click', '.desktop-links a[href="#portfolios"]');
  browser.run('wait', '--fn', 'location.hash === "#portfolios"');
  const cases = [
    ['.portfolio-record', '.portfolio-record:first-child .portfolio-manage .row-action', 'В архив'],
    ['.account-list li:has(.row-action)', '.account-list li:first-child .row-action', 'Удалить'],
  ] as const;
  return cases.map(([items, opener, action]) => {
    const before = evaluate(browser, count(items));
    assert.ok(typeof before === 'number' && before > 0);
    browser.run('click', opener);
    browser.run('wait', '#entity-dialog[open]');
    browser.run('find', 'role', 'button', 'click', '--name', action, '--exact');
    waitTrue(browser, `${count(items)} === ${before - 1}`, `${action}: строка убрана`);
    waitTrue(browser, undoFocused, `${action}: фокус на «Отменить»`);
    browser.run('click', '.status-message .undo-action');
    waitTrue(browser, `${count(items)} === ${before}`, `${action}: отмена вернула строку`);
    waitTrue(browser, focused('#main'), `${action}: после отмены фокус на основном содержимом`);
    return { items, action, before, restored: true };
  });
}

// Импорт: видимые «Подробности» и «Сверить остаток»; отмена импорта — сразу, с «Отменить».
// Синхронизация: видимая «Отозвать доступ» вместо меню из одного пункта.
export function importAndSyncUndo(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('click', '.desktop-links a[href="#import"]');
  browser.run('click', '#import-history-details');
  browser.run('wait', '#import-history[open]');
  browser.run('find', 'role', 'button', 'click', '--name', 'Отменить импорт', '--exact');
  waitTrue(browser, '!document.querySelector("#import-history-details")', 'Импорт отменён');
  waitTrue(browser, undoFocused, 'Отмена импорта: фокус на «Отменить»');
  browser.run('click', '.demo-page > .demo-status .undo-action');
  waitTrue(
    browser,
    'Boolean(document.querySelector("#import-history-details"))',
    'Импорт возвращён',
  );
  browser.run('click', '.desktop-links a[href="#sync"]');
  const revoke = '#sync-revoke-mobile';
  browser.run('wait', revoke);
  assert.equal(
    evaluate(browser, `document.querySelector('${revoke}').getAttribute('aria-label')`),
    'Отозвать доступ: Телефон',
  );
  browser.run('click', revoke);
  waitTrue(browser, `!document.querySelector('${revoke}')`, 'Доступ отозван сразу');
  waitTrue(browser, undoFocused, 'Отзыв: фокус на «Отменить»');
  browser.run('click', '.demo-page > .demo-status .undo-action');
  waitTrue(browser, `Boolean(document.querySelector('${revoke}'))`, 'Отмена вернула доступ');
  return { import: 'Подробности → Отменить импорт → Отменить', sync: 'Отозвать → Отменить' };
}
