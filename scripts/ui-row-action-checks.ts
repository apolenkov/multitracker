import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import {
  announcements,
  count,
  focused,
  go,
  layoutShift,
  undoFocused,
  waitTrue,
} from './ui-helpers.ts';

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
      waitTrue(
        browser,
        `${veiled} && ${count(rows)} === ${total} && Boolean(document.querySelector('${row} .row-notice[role=status] .undo-action'))`,
        'Строка на месте под уведомлением со встроенным «Отменить», число строк не меняется',
      );
      waitTrue(browser, undoFocused, 'После удаления фокус на «Отменить»');
    },
    `Удаление операции (${from})`,
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
  waitTrue(
    browser,
    `${focused(restored)} && ${announcements} === 1`,
    `После отмены фокус на ${restored} и объявлено ровно одно сообщение`,
  );
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
