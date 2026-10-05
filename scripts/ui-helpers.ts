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
  // Если предыдущий шаг оставил диалог открытым, он закрывает навигацию — как пользователь, жмём Escape.
  if (evaluate(browser, 'Boolean(document.querySelector("dialog[open]"))') === true) {
    browser.run('press', 'Escape');
    browser.run('wait', '--fn', '!document.querySelector("dialog[open]")');
  }
  browser.run('click', `.desktop-links a[href="#${screen}"]`);
  // h1 «Портфели» несёт счётчик («Портфели 3»), поэтому сравниваем начало заголовка.
  browser.run(
    'wait',
    '--fn',
    `location.hash === '#${screen}' && document.activeElement?.id === 'main' && document.querySelector('#main h1')?.textContent.startsWith(${JSON.stringify(headings.get(screen))})`,
  );
  // Переход анимируется; без остановки анимаций клик может попасть в сайдбар
  // или в соседний экран (падение import-sync:visible-actions-undo 2026-10-02).
  settleLayout(browser);
}

export function truth(browser: Browser, source: string, message: string) {
  assert.equal(evaluate(browser, source), true, message);
}

export function waitTrue(browser: Browser, source: string, message: string) {
  browser.run('wait', '--fn', source);
  assert.equal(evaluate(browser, source), true, message);
}

export const focused = (selector: string) =>
  `document.activeElement === document.querySelector('${selector}')`;
export const undoFocused = `Array.from(document.querySelectorAll('.undo-action')).some(button => button === document.activeElement && button.checkVisibility({checkVisibilityCSS:true}))`;
export const count = (selector: string) => `document.querySelectorAll('${selector}').length`;

// Снимок положений всех элементов #main в координатах документа; ключ — путь по индексам детей.
// Само уведомление и его внутренности — вне потока страницы, они не считаются.
const layoutMap = `(() => {
  const path = (node) => {
    const steps = [];
    for (let item = node; item && item !== document.body; item = item.parentElement)
      steps.unshift(Array.prototype.indexOf.call(item.parentElement?.children ?? [], item));
    return steps.join('/');
  };
  return [...document.querySelectorAll('#main *')].map((element) => {
    const box = element.getBoundingClientRect();
    // Нулевой прямоугольник (display:none, display:contents, option) позиции не имеет:
    // top+scrollY для него — просто scrollY, ложное «движение» при любой прокрутке.
    const inside =
      element.closest('.status-message, .row-notice') || (box.width === 0 && box.height === 0)
        ? 1
        : 0;
    const desc = element.tagName.toLowerCase() + (element.className ? '.' + String(element.className).trim().split(/\\s+/).join('.') : '');
    return [path(element), Math.round(box.top + scrollY), Math.round(box.left), inside, desc];
  });
})()`;

type Slot = Readonly<{ top: number; left: number; inside: boolean; desc: string }>;
type Boxes = ReadonlyMap<string, Slot>;

function boxes(browser: Browser): Boxes {
  const raw = evaluate(browser, layoutMap);
  assert.ok(Array.isArray(raw), 'layoutMap: нужен список позиций');
  const entries = raw.map((entry: unknown) => {
    assert.ok(Array.isArray(entry) && entry.length === 5, 'layoutMap: неверная запись');
    const cells: readonly unknown[] = entry;
    const [path, top, left, inside, desc] = cells;
    assert.ok(
      typeof path === 'string' &&
        typeof top === 'number' &&
        typeof left === 'number' &&
        (inside === 0 || inside === 1) &&
        typeof desc === 'string',
      'layoutMap: неверные типы',
    );
    return [path, { top, left, inside: inside === 1, desc }] as const;
  });
  return new Map(entries);
}

// Действие не должно сдвигать ни один существующий элемент больше чем на 2 px.
export function layoutShift(browser: Browser, act: () => void, label: string) {
  settleLayout(browser);
  const before = boxes(browser);
  const scroll = evaluate(browser, 'scrollY');
  assert.ok(typeof scroll === 'number', `${label}: scrollY не прочитан`);
  act();
  // Клик по строке ниже сгиба прокручивает страницу — поведение указателя, а не сдвиг
  // содержимого. Возвращаем прокрутку и сравниваем положения в координатах документа.
  evaluate(browser, `scrollTo(0, ${scroll}); true`);
  waitTrue(browser, `scrollY === ${scroll}`, `${label}: прокрутка не вернулась`);
  settleLayout(browser);
  const after = boxes(browser);
  const moved = [...before]
    .filter(([path, box]) => {
      const next = after.get(path);
      return (
        next &&
        !box.inside &&
        (Math.abs(box.top - next.top) > 2 || Math.abs(box.left - next.left) > 2)
      );
    })
    .map(([path, box]) => `${box.desc} @ ${path}`);
  assert.deepEqual(moved, [], `${label}: содержимое сдвинулось больше 2 px`);
}

export function content(browser: Browser, selector: string) {
  const target = `document.querySelector(${JSON.stringify(selector)})`;
  const value = evaluate(
    browser,
    `${target}?.checkVisibility({checkVisibilityCSS:true}) ? ${target}.innerText : undefined`,
  );
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
      `(() => { const element = document.querySelector(${selector}); const box = element?.getBoundingClientRect(); return element?.checkVisibility({checkVisibilityCSS:true}) === true && box?.width > 0 && box?.height > 0 && element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)); })()`,
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
    `document.querySelector(${selector})?.checkVisibility({checkVisibilityCSS:true}) === true && document.querySelector(${selector})?.closest('details')?.open === true`,
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
