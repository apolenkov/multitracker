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
        '.record-detail-button',
        '.record-menu summary',
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
  const summary = `${rows}:nth-child(${index + 1}) .record-menu summary`;
  browser.run('scrollintoview', summary);
  const before = geometry(browser, index);
  browser.run('click', summary);
  assert.equal(
    evaluate(browser, `document.querySelector('${summary}')?.closest('details')?.open`),
    true,
  );
  assert.deepEqual(geometry(browser, index), before, 'Открытие сдвинуло собственную строку');
  browser.run('focus', summary);
  browser.run('press', 'Enter');
  assert.equal(
    evaluate(browser, `document.querySelector('${summary}')?.closest('details')?.open`),
    false,
  );
  assert.deepEqual(geometry(browser, index), before, 'Закрытие сдвинуло собственную строку');
  assert.equal(
    evaluate(browser, `document.activeElement === document.querySelector('${summary}')`),
    true,
    'Закрытие клавишей Enter должно оставлять фокус на опенере',
  );
  return { index, before, after: geometry(browser, index) };
}

function actionPaths(browser: Browser, index: number) {
  const row = `${rows}:nth-child(${index + 1})`;
  return ['edit', 'delete'].map((action, position) => {
    browser.run('click', `${row} .record-menu summary`);
    browser.run('click', `${row} .record-menu button:nth-child(${position + 1})`);
    const dialog = action === 'edit' ? '#record-edit-dialog' : '#record-dialog';
    browser.run('wait', `${dialog}[open]`);
    browser.run('press', 'Escape');
    browser.run('wait', '--fn', `!document.querySelector('${dialog}[open]')`);
    browser.run('click', `${row} .record-menu summary`);
    return { index, action, openedAndCancelled: true };
  });
}

function resizedLastMenu(browser: Browser) {
  const menu = `${rows}:last-child .record-menu`;
  browser.run('scrollintoview', `${menu} summary`);
  browser.run('click', `${menu} summary`);
  browser.run(
    'wait',
    '--fn',
    `document.querySelector('${menu}')?.open === true && Boolean(document.querySelector('${menu} .record-menu-options')?.style.left)`,
  );
  browser.run('set', 'viewport', '375', '900');
  const ready = `(() => {
    const details = document.querySelector('${menu}');
    const panel = details?.querySelector('.record-menu-options');
    const navigation = document.querySelector('.navigation');
    if (!details?.open || !panel || !navigation) return false;
    const box = panel.getBoundingClientRect();
    const buttons = [...panel.querySelectorAll('button:not(:disabled)')];
    return box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0 &&
      box.right <= innerWidth && box.bottom <= navigation.getBoundingClientRect().top &&
      buttons.length === 2 && buttons.every(button => {
        const target = button.getBoundingClientRect();
        return button.contains(document.elementFromPoint(
          target.left + target.width / 2, target.top + target.height / 2));
      });
  })()`;
  browser.run('wait', '--fn', ready);
  assert.equal(evaluate(browser, ready), true, 'После сужения меню и кнопки должны быть доступны');
  const position = evaluate(
    browser,
    `document.querySelector('${menu} .record-menu-options').getBoundingClientRect().toJSON()`,
  );
  browser.run('focus', `${menu} button:first-child`);
  browser.run('press', 'Escape');
  const closed = `document.querySelector('${menu}')?.open === false && document.activeElement === document.querySelector('${menu} summary')`;
  browser.run('wait', '--fn', closed);
  assert.equal(evaluate(browser, closed), true, 'Escape из кнопки должен вернуть фокус опенеру');
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
      return [0, count - 1].map((index) => ({
        width,
        language,
        ...stableMenu(browser, index),
        actions: actionPaths(browser, index),
      }));
    });
  });
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  return { layout, resized, result: 'Своя строка стабильна; правка и удаление отменены' };
}
