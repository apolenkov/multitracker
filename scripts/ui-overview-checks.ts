import assert from 'node:assert/strict';
import type { Browser } from './ui-driver.ts';
import { content, go, prepare, truth } from './ui-helpers.ts';
import { evaluate, settleLayout } from './ui-driver.ts';

export function stableHeroDisclosure(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  const summary = '.balance-panel .summary';
  const result = '.balance-panel .summary-result';
  const disclosure = '.balance-panel .chart-disclosure';
  const geometry = `({summaryHeight:document.querySelector(${JSON.stringify(summary)}).getBoundingClientRect().height,resultTop:document.querySelector(${JSON.stringify(result)}).getBoundingClientRect().top})`;
  settleLayout(browser, summary);
  const before = evaluate(browser, geometry);
  browser.run('click', `${disclosure} > summary`);
  browser.run(
    'wait',
    '--fn',
    `document.querySelector(${JSON.stringify(disclosure)})?.open === true`,
  );
  assert.deepEqual(
    evaluate(browser, geometry),
    before,
    'Данные графика не должны сдвигать сумму и результат',
  );
  browser.run('click', `${disclosure} > summary`);
  browser.run(
    'wait',
    '--fn',
    `document.querySelector(${JSON.stringify(disclosure)})?.open === false`,
  );
  assert.deepEqual(
    evaluate(browser, geometry),
    before,
    'После закрытия левая часть должна остаться на месте',
  );
  return '1440: раскрытие данных графика не двигает сумму, результат и кнопку';
}

export function narrowAllocation(browser: Browser) {
  prepare(browser);
  browser.run('select', '#topbar-currency', 'RUB');
  go(browser, 'overview');
  browser.run('set', 'viewport', '320', '480');
  browser.run('select', '#topbar-language', 'en');
  browser.run('wait', '--fn', 'document.querySelector("#main h1")?.textContent === "Overview"');
  truth(
    browser,
    'document.documentElement.scrollWidth <= innerWidth + 1 && Array.from(document.querySelectorAll(".allocation-legend dd, .allocation-legend dd span")).every(element => element.checkVisibility() && element.scrollWidth <= element.clientWidth + 1 && element.getBoundingClientRect().left >= 0 && element.getBoundingClientRect().right <= innerWidth)',
    'На 320 px состав портфеля должен показывать полные суммы без переполнения',
  );
  const allocation = content(browser, '.allocation-legend');
  assert.ok(allocation.replaceAll(/\s/g, '').includes('RUB108,000.00'));
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.querySelector("#main h1")?.textContent === "Обзор"');
  return { width: 320, language: 'en', allocation };
}

export function initialSkipFocus(browser: Browser, url: string) {
  browser.run('open', url.split('#')[0] ?? url);
  browser.run('wait', '#main h1');
  browser.run('wait', '--fn', 'location.hash === "#overview"');
  truth(
    browser,
    'document.activeElement?.id !== "main" && getComputedStyle(document.querySelector("#main h1")).outlineStyle === "none"',
    'Начальная загрузка не должна фокусировать main или выделять заголовок рамкой',
  );
  browser.run('press', 'Tab');
  truth(
    browser,
    'document.activeElement?.matches(".skip-link:focus-visible") === true && document.activeElement.getBoundingClientRect().top >= 0',
    'Первый Tab должен показать ссылку пропуска с видимым фокусом',
  );
  browser.run('press', 'Enter');
  truth(
    browser,
    'document.activeElement?.id === "main" && document.activeElement.matches(":focus-visible") && [document.activeElement, document.querySelector("#main h1")].some(element => getComputedStyle(element).outlineStyle !== "none" && parseFloat(getComputedStyle(element).outlineWidth) > 0)',
    'Enter на ссылке пропуска должен перевести видимый фокус в main',
  );
  return 'Свежая загрузка → #overview без рамки; Tab → ссылка пропуска; Enter → видимый фокус main';
}

// Подпись разложения «Что дало результат · RUB» — одна строка на 1440 и 1100 в RU и EN.
export function attributionLine(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  const observed = (['ru', 'en'] as const).flatMap((language) =>
    [1440, 1100].map((width) => {
      browser.run('select', '#topbar-language', language);
      browser.run('set', 'viewport', String(width), '900');
      const metrics = evaluate(
        browser,
        `(() => { const s = document.querySelector('.attribution > summary');
          const box = s?.getBoundingClientRect();
          const line = parseFloat(getComputedStyle(s).lineHeight) || 24;
          return { text: s?.innerText, height: box?.height, line,
            clipped: s && s.scrollWidth > s.clientWidth + 1 }; })()`,
      );
      assert.ok(
        typeof metrics === 'object' &&
          metrics !== null &&
          'height' in metrics &&
          typeof metrics.height === 'number' &&
          'line' in metrics &&
          typeof metrics.line === 'number' &&
          'clipped' in metrics &&
          metrics.clipped === false &&
          metrics.height <= metrics.line * 2,
        `Подпись должна оставаться одной строкой без обрезки: ${JSON.stringify(metrics)}`,
      );
      return { width, language, ...(typeof metrics === 'object' ? metrics : {}) };
    }),
  );
  browser.run('select', '#topbar-language', 'ru');
  return observed;
}

// Задача 10 (находка 15): легенда называет только нарисованную серию — линия
// одна, «Внесено» остаётся фактом; строки активов имеют видимое «Подробнее:
// <актив>» с целью 44×44.
export function chartLegendAndAssetDetails(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  browser.run('click', '.balance-panel .chart-disclosure > summary');
  browser.run(
    'wait',
    '--fn',
    'document.querySelector(".balance-panel .chart-disclosure")?.open === true',
  );
  truth(
    browser,
    `(() => { const key = document.querySelector('.chart-disclosure .chart-key');
      const section = key?.closest('.value-history');
      return key?.querySelectorAll('dt').length === 1 &&
        key.querySelectorAll('.key-line').length === 1 &&
        key.textContent?.includes('Внесено') === false &&
        section?.querySelectorAll('.history-value').length === 1 &&
        document.querySelector('.chart-disclosure')?.textContent?.includes('Внесено') === true; })()`,
    'Легенда — одна серия при одной линии; «Внесено» — фактом, не серией',
  );
  const target44 = `(() => { const buttons = [...document.querySelectorAll('.holding-row button.asset-name')];
    return buttons.length >= 3 && buttons.every((btn) => {
      const r = btn.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44 && btn.querySelector('.ui-icon') &&
        btn.getAttribute('aria-label')?.startsWith('Подробнее:') === true; }); })()`;
  truth(browser, target44, 'Строки активов: «Подробнее: <актив>» с целью 44×44');
  browser.run('select', '#topbar-language', 'en');
  browser.run('wait', '--fn', 'document.documentElement.lang === "en"');
  truth(
    browser,
    `[...document.querySelectorAll('.holding-row button.asset-name')].length >= 3 &&
     [...document.querySelectorAll('.holding-row button.asset-name')].every(
       (btn) => btn.getAttribute('aria-label')?.startsWith('Details:') === true)`,
    'EN: цель называется «Details: <asset>»',
  );
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  browser.run('click', '.balance-panel .chart-disclosure > summary');
  return 'легенда — одна серия «Итого»; активы — «Подробнее: <актив>» 44×44 RU/EN';
}

/** Проверки обзора для списка check-ui: состав, раскрытие, атрибуция, легенда. */
export function overviewActions(browser: Browser): readonly Readonly<[string, () => unknown]>[] {
  return [
    ['overview:narrow-localized-allocation', () => narrowAllocation(browser)],
    ['overview:stable-hero-disclosure', () => stableHeroDisclosure(browser)],
    ['overview:attribution-one-line', () => attributionLine(browser)],
    ['overview:chart-legend-asset-details', () => chartLegendAndAssetDetails(browser)],
  ];
}

// В режиме скрытия сумм знак результата не раскрывается цветом (DESIGN.md).
export function maskedResultTones(browser: Browser) {
  const tones = ['overview', 'portfolios', 'history', 'settings'].map((screen) => {
    go(browser, screen);
    return evaluate(
      browser,
      'Array.from(document.querySelectorAll("#main .positive, #main .negative")).filter((node) => !node.closest("[hidden]")).map((node) => node.textContent?.trim())',
    );
  });
  assert.deepEqual(tones, [[], [], [], []], 'Скрытый результат раскрывает знак цветом');
  truth(
    browser,
    '!/[▲▼]/.test(document.querySelector("#main")?.textContent ?? "")',
    'Скрытые суммы не должны показывать стрелки знака',
  );
  return 'Обзор, Портфели, Операции, Настройки: нет .positive/.negative и стрелок при скрытых суммах';
}
