import assert from 'node:assert/strict';
import type { Browser } from './ui-driver.ts';
import { content, go, prepare, truth } from './ui-exploration.ts';
import { evaluate } from './ui-driver.ts';

export function stableHeroDisclosure(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  const summary = '.balance-panel .summary';
  const result = '.balance-panel .summary-result';
  const disclosure = '.balance-panel .chart-disclosure';
  const geometry = `({summaryHeight:document.querySelector(${JSON.stringify(summary)}).getBoundingClientRect().height,resultTop:document.querySelector(${JSON.stringify(result)}).getBoundingClientRect().top})`;
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
  browser.run('select', '#settings-display-currency', 'RUB');
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

// В режиме скрытия сумм знак результата не раскрывается цветом (DESIGN.md).
export function maskedResultTones(browser: Browser) {
  const tones = ['overview', 'portfolios', 'analytics'].map((screen) => {
    browser.run('click', `.desktop-links a[href="#${screen}"]`);
    browser.run(
      'wait',
      '--fn',
      `location.hash === '#${screen}' && document.activeElement?.id === 'main'`,
    );
    if (screen === 'analytics')
      browser.run('select', '[data-testid="analytics-section"]', 'performance');
    return evaluate(
      browser,
      'Array.from(document.querySelectorAll("#main .positive, #main .negative")).filter((node) => !node.closest("[hidden]")).map((node) => node.textContent?.trim())',
    );
  });
  assert.deepEqual(tones, [[], [], []], 'Скрытый результат раскрывает знак цветом');
  return 'Обзор, Портфели, Аналитика: нет .positive/.negative при скрытых суммах';
}
