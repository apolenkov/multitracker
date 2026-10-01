import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';

const headings = new Map([
  ['overview', 'Обзор'],
  ['portfolios', 'Портфели'],
  ['history', 'Операции'],
  ['import', 'Импорт'],
  ['connections', 'Подключения'],
  ['sync', 'Синхронизация'],
  ['settings', 'Настройки'],
]);
const hiddenControl = '#settings-hidden';

export function go(browser: Browser, screen: string) {
  browser.run('click', `.desktop-links a[href="#${screen}"]`);
  browser.run(
    'wait',
    '--fn',
    `location.hash === '#${screen}' && document.activeElement?.id === 'main' && document.querySelector('#main h1')?.textContent === ${JSON.stringify(headings.get(screen))}`,
  );
}

export function truth(browser: Browser, source: string, message: string) {
  assert.equal(evaluate(browser, source), true, message);
}

export function content(browser: Browser, selector: string) {
  const target = `document.querySelector(${JSON.stringify(selector)})`;
  const value = evaluate(browser, `${target}?.checkVisibility() ? ${target}.innerText : undefined`);
  assert.ok(typeof value === 'string' && value.trim(), `Нет видимого содержимого: ${selector}`);
  return value;
}

export function reveal(browser: Browser, summary: string) {
  const selector = JSON.stringify(summary);
  settleLayout(browser);
  if (
    evaluate(browser, `document.querySelector(${selector})?.closest('details')?.open === false`)
  ) {
    browser.run('scrollintoview', summary);
    browser.run(
      'wait',
      '--fn',
      `(() => { const element = document.querySelector(${selector}); const box = element?.getBoundingClientRect(); return element?.checkVisibility() === true && box?.width > 0 && box?.height > 0 && element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)); })()`,
    );
    browser.run('click', summary);
    browser.run(
      'wait',
      '--fn',
      `document.querySelector(${selector})?.closest('details')?.open === true`,
    );
  }
  settleLayout(browser);
  truth(
    browser,
    `document.querySelector(${selector})?.checkVisibility() === true && document.querySelector(${selector})?.closest('details')?.open === true`,
    'Раскрывающийся блок должен быть открыт и доступен',
  );
}

export function prepare(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  go(browser, 'settings');
  const selector = JSON.stringify(hiddenControl);
  truth(
    browser,
    `document.querySelectorAll(${selector}).length === 1 && document.querySelector(${selector})?.labels?.[0]?.innerText.trim() === 'Скрыть суммы'`,
    'Сброс приватности должен находить единственный подписанный переключатель',
  );
  browser.run('uncheck', hiddenControl);
  browser.run('uncheck', '#settings-monochrome');
  browser.run('select', '#topbar-currency', 'USD');
  browser.run('select', '#settings-base-currency', 'RUB');
  browser.run('select', '#topbar-theme', 'light');
}

function widgetChanges(browser: Browser) {
  browser.run('select', '#widget-layout', 'compact');
  browser.run('check', '#widget-changes');
  const compact = content(browser, '#widget-preview');
  browser.run('select', '#widget-layout', 'detailed');
  const detailed = content(browser, '#widget-preview');
  assert.notEqual(compact, detailed, 'Подробный вид должен менять предпросмотр');
  truth(browser, 'document.querySelectorAll("#widget-preview dd").length >= 3', 'Нет разбивки');
  browser.run('uncheck', '#widget-changes');
  assert.doesNotMatch(content(browser, '#widget-preview'), /[+−-]\d/, 'Изменение дня не скрыто');
  browser.run('check', '#widget-changes');
  return { compact, detailed };
}

function widgetColors(browser: Browser) {
  return evaluate(
    browser,
    'Array.from(document.querySelectorAll("#widget-preview .positive, #widget-preview .negative"), element => getComputedStyle(element).color)',
  );
}

export function widgetAppearance(browser: Browser) {
  prepare(browser);
  const previews = widgetChanges(browser);
  const colored = widgetColors(browser);
  assert.ok(Array.isArray(colored) && new Set(colored).size > 1, 'Исходные цвета не различаются');
  browser.run('check', '#settings-monochrome');
  const monochrome = widgetColors(browser);
  assert.ok(Array.isArray(monochrome) && new Set(monochrome).size === 1, 'Цвета остались разными');
  const text = content(browser, '#widget-preview');
  assert.match(text, /\+\d/);
  assert.match(text, /[−-]\d/);
  truth(
    browser,
    'getComputedStyle(document.querySelector("#widget-preview .negative")).textDecorationLine.includes("underline")',
    'В монохроме отрицательное значение должно различаться также начертанием',
  );
  browser.run('find', 'label', 'Скрыть суммы', 'check', '--exact');
  const masked = evaluate(
    browser,
    'Array.from(document.querySelectorAll("#widget-preview dd"), element => element.innerText).join(" ")',
  );
  assert.ok(typeof masked === 'string');
  assert.match(masked, /••••/);
  assert.doesNotMatch(masked, /\d/, 'Предпросмотр раскрывает скрытые значения');
  browser.run('uncheck', hiddenControl);
  browser.run('uncheck', '#settings-monochrome');
  return { ...previews, colored, monochrome, signs: 'Положительный и отрицательный знак видимы' };
}
