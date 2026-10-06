import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { go, truth, undoFocused, waitTrue } from './ui-helpers.ts';

const rows = '#main .history-list .history-row';

// Отмена убирает встроенное уведомление; возврат фокуса разрешён, только если
// фокус потерян вместе с ним. Фокус, уведённый пользователем до срабатывания
// отмены, уведомление не забирает.
export function undoFocusKeepsPosition(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  go(browser, 'history');
  const row = `${rows}:first-child`;
  const veiled = `document.querySelector('${row}')?.classList.contains('row-removed')`;
  browser.run('click', `${row} .row-action.danger`);
  waitTrue(browser, veiled, 'Строка остаётся под уведомлением');
  waitTrue(browser, undoFocused, 'После удаления фокус на «Отменить»');
  // Пользователь уводит фокус на действие соседней строки до отмены.
  const moved = `${rows}:nth-child(2) .row-action`;
  evaluate(browser, `document.querySelector('${moved}')?.focus(); true`);
  truth(
    browser,
    `document.activeElement === document.querySelector('${moved}')`,
    'Фокус уведён на соседнюю строку',
  );
  // Отмена без перевода фокуса (программный вызов): возврат не должен перебить его.
  evaluate(browser, `document.querySelector('${row} .undo-action')?.click(); true`);
  waitTrue(browser, `!${veiled}`, 'Отмена сняла уведомление');
  settleLayout(browser);
  truth(
    browser,
    `document.activeElement === document.querySelector('${moved}')`,
    'Фокус остался там, куда его увёл пользователь',
  );
  // Быстрая серия удалить → отменить → удалить оставляет фокус на рабочем управлении.
  browser.run('click', `${row} .row-action.danger`);
  waitTrue(browser, veiled, 'Повторное удаление под уведомлением');
  browser.run('click', `${row} .undo-action`);
  waitTrue(browser, `!${veiled}`, 'Отмена вернула строку');
  browser.run('click', `${row} .row-action.danger`);
  waitTrue(browser, veiled, 'Третье удаление под уведомлением');
  waitTrue(browser, undoFocused, 'Быстрая серия: фокус на новом «Отменить»');
  browser.run('click', `${row} .undo-action`);
  waitTrue(browser, `!${veiled}`, 'Финальная отмена вернула строку');
  return 'уведённый фокус не возвращается; быстрая серия — фокус на «Отменить»';
}
