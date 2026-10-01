import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';

const headings = new Map([
  ['overview', 'Обзор'],
  ['settings', 'Настройки'],
  ['markets', 'Рынки'],
  ['following', 'Избранное'],
  ['analytics', 'Аналитика'],
  ['events', 'События'],
  ['sync', 'Синхронизация'],
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

function revealAnalyticsData(browser: Browser) {
  const selector = '.analytics-panel details.analytics-data:not([open]) > summary';
  const count = evaluate(browser, `document.querySelectorAll(${JSON.stringify(selector)}).length`);
  assert.ok(typeof count === 'number');
  Array.from({ length: count }).forEach(() => browser.run('find', 'first', selector, 'click'));
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
  browser.run('select', '#settings-display-currency', 'USD');
  browser.run('select', '#settings-base-currency', 'RUB');
  browser.run('select', '#settings-theme', 'light');
}

function analyticsValues(browser: Browser) {
  revealAnalyticsData(browser);
  const values = evaluate(
    browser,
    'Array.from(document.querySelectorAll(".analytics-panel dd, .analytics-panel td")).filter(element => element.checkVisibility()).map(element => element.innerText.trim()).join(" | ")',
  );
  assert.ok(typeof values === 'string' && values, 'Нет значений аналитического примера');
  return values;
}

function analysisPeriod(browser: Browser, section: string) {
  browser.run('select', '[data-testid="analytics-section"]', section);
  browser.run('wait', `.analytics-panel[data-analysis="${section}"]`);
  const heading = content(browser, '.analytics-panel h2');
  browser.run('select', '[data-testid="analytics-period"]', 'month');
  const month = analyticsValues(browser);
  browser.run('select', '[data-testid="analytics-period"]', 'year');
  const year = analyticsValues(browser);
  assert.notEqual(year, month, `${heading}: период должен менять сами значения`);
  reveal(browser, '.analytics-about summary');
  truth(
    browser,
    'document.querySelector(".analytics-about")?.open === true && Boolean(document.querySelector(".analytics-about p")?.innerText.trim())',
    `${heading}: пояснение должно раскрыться`,
  );
  return { section, heading, month, year };
}

export function analyticsChanges(browser: Browser) {
  prepare(browser);
  go(browser, 'analytics');
  const sections = ['performance', 'allocation', 'fees', 'risk', 'decisions', 'comparison'].map(
    (section) => analysisPeriod(browser, section),
  );
  const currencies = analyticsCurrency(browser);
  const responsive = analyticsNarrow(browser);
  const allocation = analyticsAllocationNarrow(browser);
  return { sections, currencies, responsive, allocation };
}

export function analyticsAllocationNarrow(browser: Browser) {
  prepare(browser);
  go(browser, 'analytics');
  browser.run('select', '[data-testid="analytics-section"]', 'allocation');
  return ['sector', 'exchange'].flatMap((slice) => {
    browser.run('select', '[data-testid="analytics-allocation"]', slice);
    reveal(browser, '.analytics-panel details.analytics-data:first-of-type > summary');
    return [375, 320, 1440].flatMap((width) =>
      (['ru', 'en'] as const).map((locale) => {
        browser.run('set', 'viewport', String(width), '900');
        browser.run('select', '#topbar-language', locale);
        truth(
          browser,
          'document.documentElement.scrollWidth <= innerWidth + 1',
          `Распределение ${slice} ${width} ${locale}: переполнение страницы`,
        );
        truth(
          browser,
          'document.querySelector(".analytics-panel details.analytics-data table")?.checkVisibility() === true && document.querySelector(".analytics-panel details.analytics-data table")?.getBoundingClientRect().right <= innerWidth + 1 && document.querySelector(".analytics-panel details.analytics-data")?.open === true',
          `Распределение ${slice} ${width} ${locale}: таблица недоступна`,
        );
        return { slice, width, locale };
      }),
    );
  });
}

export function analyticsNarrow(browser: Browser) {
  prepare(browser);
  go(browser, 'analytics');
  browser.run('select', '[data-testid="analytics-section"]', 'performance');
  reveal(browser, '.analytics-panel details.analytics-data:first-of-type > summary');
  reveal(browser, '.analytics-panel details.analytics-data:nth-of-type(2) > summary');
  browser.run('check', '.analytics-asset-choices label:nth-of-type(2) input');
  return [375, 320, 1440].flatMap((width) =>
    (['ru', 'en'] as const).flatMap((locale) => {
      browser.run('set', 'viewport', String(width), '900');
      browser.run('select', '#topbar-language', locale);
      return (['month', 'year'] as const).map((period) => {
        browser.run('select', '[data-testid="analytics-period"]', period);
        truth(
          browser,
          'document.documentElement.scrollWidth <= innerWidth + 1',
          `Аналитика ${width} ${locale} ${period}: переполнение страницы`,
        );
        truth(
          browser,
          'document.querySelector(".analytics-table-scroll")?.checkVisibility() === true',
          `Аналитика ${width} ${locale} ${period}: таблица недоступна`,
        );
        if (width < 500)
          truth(
            browser,
            'document.querySelector(".analytics-table-scroll")?.scrollWidth > document.querySelector(".analytics-table-scroll")?.clientWidth',
            `Аналитика ${width} ${locale} ${period}: таблица не прокручивается внутри блока`,
          );
        truth(
          browser,
          'document.querySelectorAll(".analytics-panel details[open]").length >= 2',
          `Аналитика ${width} ${locale} ${period}: раскрытые блоки потеряны`,
        );
        return {
          width,
          locale,
          period,
          scrollWidth: evaluate(browser, 'document.documentElement.scrollWidth'),
        };
      });
    }),
  );
}

function analyticsCurrency(browser: Browser) {
  browser.run('select', '[data-testid="analytics-section"]', 'fees');
  const dollars = analyticsValues(browser);
  assert.equal(content(browser, '.analytics-answer dd'), '270,00\u00a0$');
  assert.match(content(browser, '.analytics-answer-context'), /USD/);
  go(browser, 'settings');
  browser.run('select', '#settings-display-currency', 'RUB');
  go(browser, 'analytics');
  const rubles = analyticsValues(browser);
  assert.equal(content(browser, '.analytics-answer dd'), '32\u00a0400,00\u00a0₽');
  assert.match(content(browser, '.analytics-answer-context'), /RUB/);
  assert.notEqual(
    dollars.replaceAll('$', ''),
    rubles.replaceAll('₽', ''),
    'Валюта должна менять числа',
  );
  go(browser, 'settings');
  browser.run('select', '#settings-display-currency', 'USD');
  return { dollars, rubles };
}

export function analyticsPrivacy(browser: Browser) {
  prepare(browser);
  go(browser, 'analytics');
  browser.run('select', '[data-testid="analytics-section"]', 'performance');
  const visible = analyticsValues(browser);
  assert.match(visible, /\d/, 'Открытый пример должен содержать значения');
  go(browser, 'settings');
  browser.run('find', 'label', 'Скрыть суммы', 'check', '--exact');
  go(browser, 'analytics');
  const masked = ['performance', 'fees', 'decisions', 'comparison'].map((section) => {
    browser.run('select', '[data-testid="analytics-section"]', section);
    const values = analyticsValues(browser);
    assert.match(values, /••••/, `${section}: суммы должны быть маскированы`);
    assert.doesNotMatch(values, /\d/, `${section}: скрытые суммы или количества раскрыты`);
    return { section, values };
  });
  browser.run('select', '[data-testid="analytics-section"]', 'performance');
  truth(browser, '!document.querySelector(".analytics-plot")', 'Скрытая серия раскрывает значения');
  go(browser, 'settings');
  browser.run('uncheck', hiddenControl);
  return masked;
}

function widgetChanges(browser: Browser) {
  browser.run('select', '#widget-kind', 'portfolio');
  browser.run('select', '#widget-layout', 'compact');
  browser.run('check', '#widget-changes');
  const compact = content(browser, '#widget-preview');
  browser.run('select', '#widget-layout', 'detailed');
  const detailed = content(browser, '#widget-preview');
  assert.notEqual(compact, detailed, 'Подробный вид должен менять предпросмотр');
  truth(browser, 'document.querySelectorAll("#widget-preview dd").length >= 3', 'Нет разбивки');
  browser.run('select', '#widget-kind', 'market');
  const market = content(browser, '#widget-preview');
  assert.notEqual(detailed, market, 'Выбор рынка должен менять предпросмотр');
  browser.run('uncheck', '#widget-changes');
  assert.doesNotMatch(content(browser, '#widget-preview'), /[+−-]\d/, 'Изменение дня не скрыто');
  browser.run('check', '#widget-changes');
  return { compact, detailed, market };
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
