import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';

const rows = '#main .history-list .history-row';

function geometry(browser: Browser, index: number) {
  return evaluate(
    browser,
    `(() => {
      const row = document.querySelectorAll('${rows}')[${index}];
      const origin = row.getBoundingClientRect();
      return [
        '.record-heading',
        '.record-summary',
        '.record-summary dt',
        '.record-summary dd',
        '.history-row-open',
        '.record-menu',
      ]
        .map(selector => {
          const box = row.querySelector(selector).getBoundingClientRect();
          return [box.left - origin.left, box.top - origin.top, box.width, box.height]
            .map(value => Math.round(value * 100) / 100);
        });
    })()`,
  );
}

function stableMenu(browser: Browser, index: number) {
  const trigger = `${rows}:nth-child(${index + 1}) button.action-menu-trigger.record-menu`;
  browser.run('scrollintoview', trigger);
  const before = geometry(browser, index);
  browser.run('click', trigger);
  browser.run('wait', '[role="menu"]');
  assert.equal(
    evaluate(browser, `document.querySelector('${trigger}')?.getAttribute('aria-haspopup')`),
    'menu',
  );
  assert.deepEqual(geometry(browser, index), before, 'Открытие сдвинуло собственную строку');
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', `!document.querySelector('[role="menu"]')`);
  assert.deepEqual(geometry(browser, index), before, 'Закрытие сдвинуло собственную строку');
  browser.run('wait', '--fn', `document.activeElement === document.querySelector('${trigger}')`);
  assert.equal(
    evaluate(browser, `document.activeElement === document.querySelector('${trigger}')`),
    true,
    'Закрытие клавишей Escape должно оставлять фокус на опенере',
  );
  return { index, before, after: geometry(browser, index) };
}

function headVisibility(browser: Browser, width: number) {
  const display = evaluate(
    browser,
    `getComputedStyle(document.querySelector('.history-head')).display`,
  );
  assert.equal(
    display === 'none',
    width <= 600,
    `Шапка колонки суммы: display=${String(display)} при ${width} px`,
  );
}

// The 27 px row button stretches ::after over the whole row: any point outside the menu opens details.
function rowHitArea(browser: Browser, index: number) {
  const row = `${rows}:nth-child(${index + 1})`;
  browser.run('scrollintoview', row);
  const misses = evaluate(
    browser,
    `(() => {
      const row = document.querySelector('${row}');
      const box = row.getBoundingClientRect();
      const menu = row.querySelector('.record-menu').getBoundingClientRect();
      const points = [
        [box.left + 2, box.top + 2],
        [box.left + 2, box.bottom - 2],
        [(box.left + menu.left) / 2, box.top + box.height / 2],
        [menu.left - 2, box.bottom - 2],
      ];
      return points.filter(([x, y]) => !document.elementFromPoint(x, y)?.closest('.history-row-open'))
        .map(point => point.map(Math.round).join(','));
    })()`,
  );
  assert.deepEqual(misses, [], 'Вся строка операции должна открывать подробности');
  return 'whole row';
}

function actionPaths(browser: Browser, index: number) {
  const row = `${rows}:nth-child(${index + 1})`;
  const trigger = `${row} button.action-menu-trigger`;
  // Правка закрывается настоящим Escape, удаление — кнопкой X; оба возвращают фокус на «⋯».
  return ['edit', 'delete'].map((action) => {
    browser.run('click', trigger);
    browser.run('wait', '[role="menu"]');
    const item = action === 'edit' ? '[role="menuitem"]:not(.danger)' : '[role="menuitem"].danger';
    browser.run('click', `[role="menu"] ${item}`);
    const dialog = action === 'edit' ? '#record-edit-dialog' : '#record-dialog';
    browser.run('wait', `${dialog}[open]`);
    if (action === 'edit') browser.run('press', 'Escape');
    else browser.run('click', `${dialog} .close-button`);
    browser.run('wait', '--fn', `!document.querySelector('${dialog}[open]')`);
    const focused = `document.activeElement === document.querySelector('${trigger}')`;
    browser.run('wait', '--fn', focused);
    assert.equal(evaluate(browser, focused), true, `${action}: фокус должен вернуться на «⋯»`);
    return { index, action, closedBy: action === 'edit' ? 'Escape' : 'X', triggerFocus: true };
  });
}

function resizedLastMenu(browser: Browser) {
  const trigger = `${rows}:last-child button.action-menu-trigger`;
  browser.run('scrollintoview', trigger);
  browser.run('click', trigger);
  browser.run('wait', '[role="menu"]');
  browser.run('set', 'viewport', '375', '900');
  browser.run('scrollintoview', trigger);
  const ready = `(() => {
    const panel = document.querySelector('[role="menu"].record-menu-options');
    const navigation = document.querySelector('.navigation');
    if (!panel || !navigation) return false;
    const box = panel.getBoundingClientRect();
    const items = [...panel.querySelectorAll('[role="menuitem"]')];
    return box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0 &&
      box.right <= innerWidth && box.bottom <= navigation.getBoundingClientRect().top &&
      items.length === 2 && items.every(item => {
        const target = item.getBoundingClientRect();
        return item.contains(document.elementFromPoint(
          target.left + target.width / 2, target.top + target.height / 2));
      });
  })()`;
  browser.run('wait', '--fn', ready);
  assert.equal(evaluate(browser, ready), true, 'После сужения меню и пункты должны быть доступны');
  const position = evaluate(
    browser,
    `document.querySelector('[role="menu"].record-menu-options').getBoundingClientRect().toJSON()`,
  );
  browser.run('press', 'Escape');
  const closed = `!document.querySelector('[role="menu"]') && document.activeElement === document.querySelector('${trigger}')`;
  browser.run('wait', '--fn', closed);
  assert.equal(evaluate(browser, closed), true, 'Escape должен вернуть фокус опенеру');
  browser.run('set', 'viewport', '1440', '900');
  return { from: 1440, to: 375, position, escapedWithOpenerFocus: true };
}

export function recordMenuStability(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('click', '.desktop-links a[href="#history"]');
  browser.run('wait', '--fn', 'location.hash === "#history"');
  const count = evaluate(browser, `document.querySelectorAll('${rows}').length`);
  assert.ok(typeof count === 'number' && count > 1, 'Нужны первая и последняя операции');
  const resized = resizedLastMenu(browser);
  const layout = ['ru', 'en'].flatMap((language) => {
    browser.run('select', '#topbar-language', language);
    return [1440, 375, 320].flatMap((width) => {
      browser.run('set', 'viewport', String(width), '900');
      headVisibility(browser, width);
      return [0, count - 1].map((index) => ({
        width,
        language,
        hitArea: rowHitArea(browser, index),
        ...stableMenu(browser, index),
        actions: actionPaths(browser, index),
      }));
    });
  });
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  return { layout, resized, result: 'Своя строка стабильна; правка и удаление отменены' };
}
