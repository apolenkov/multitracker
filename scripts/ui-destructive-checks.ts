import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { focused, go, prepare, waitTrue } from './ui-helpers.ts';

const target = (selector: string, label: string) => `(() => {
  const b = document.querySelector('${selector}');
  const r = b?.getBoundingClientRect();
  return r && r.height >= 44 && r.width >= 44 && b.checkVisibility({checkVisibilityCSS:true})
    && b.getAttribute('aria-label')?.includes(':')
    && b.getAttribute('aria-label')?.includes(${JSON.stringify(label)});
})()`;

// Разрушительные кнопки вне значков строк: видимая цель от 44×44 и имя с объектом.
export function destructiveTargets(browser: Browser) {
  prepare(browser);
  go(browser, 'history');
  browser.run('click', '#main .history-list .history-row:first-child .history-row-open');
  browser.run('wait', '#record-dialog[open]');
  waitTrue(
    browser,
    target('#record-dialog .destructive', ' BTC'),
    'Удаление операции: цель 44×44 и имя с активом',
  );
  browser.run('press', 'Escape');
  go(browser, 'portfolios');
  const name = evaluate(
    browser,
    `document.querySelector('.portfolio-record:first-child .portfolio-name strong')?.textContent?.trim()`,
  );
  assert.ok(typeof name === 'string' && name.length > 0, 'Нужно название первого портфеля');
  browser.run('click', '.portfolio-record:first-child .portfolio-manage .row-action');
  browser.run('wait', '#entity-dialog[open]');
  waitTrue(
    browser,
    target('#entity-dialog .form-actions button.danger', name),
    'Удаление портфеля: цель 44×44 и имя с названием',
  );
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', '!document.querySelector("#entity-dialog[open]")');
  go(browser, 'settings');
  waitTrue(
    browser,
    `(() => { const r = document.querySelector('#settings-open-delete')?.getBoundingClientRect();
      return r && r.height >= 44; })()`,
    'Ссылка «Удаление данных» не ниже 44 px',
  );
  return 'Удаление операции и портфеля: видимые цели ≥44×44, имена с объектом';
}

// «Удаление данных» возвращает фокус на кнопку-источник после закрытия (DESIGN.md).
export function settingsDeleteFocus(browser: Browser) {
  prepare(browser);
  go(browser, 'settings');
  browser.run('click', '#settings-open-delete');
  browser.run('wait', '#settings-dialog[open]');
  browser.run('press', 'Escape');
  waitTrue(
    browser,
    '!document.querySelector("#settings-dialog[open]")',
    'Диалог удаления данных закрыт',
  );
  waitTrue(
    browser,
    focused('#settings-open-delete'),
    'После закрытия «Удаления данных» фокус возвращается на её кнопку',
  );
  const state = evaluate(browser, 'document.activeElement?.id');
  assert.equal(state, 'settings-open-delete', 'Фокус остался на кнопке-источнике');
  return 'Escape → фокус на «Удаление данных»';
}
