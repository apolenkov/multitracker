import assert from 'node:assert/strict';
import type { Browser } from './ui-driver.ts';
import { content, go, prepare, truth } from './ui-exploration.ts';
import { evaluate } from './ui-driver.ts';

const catalogTrigger = '.cash-catalog-open, .cash-balances > summary';

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

function catalogGeometry(browser: Browser, width: number) {
  browser.run('set', 'viewport', String(width), width === 375 ? '812' : '900');
  browser.run('scrollintoview', catalogTrigger);
  const geometry =
    '({scroll:scrollY,side:document.querySelector(".overview-side").getBoundingClientRect().top,report:document.querySelector(".overview-report").getBoundingClientRect().top})';
  const before = evaluate(browser, geometry);
  browser.run('click', catalogTrigger);
  assert.deepEqual(evaluate(browser, geometry), before, 'Каталог не должен сдвигать обзор');
  truth(
    browser,
    'document.querySelector("#cash-catalog-dialog")?.open === true',
    'Нет диалога каталога',
  );
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', '!document.querySelector("#cash-catalog-dialog[open]")');
  assert.deepEqual(evaluate(browser, geometry), before, 'Закрытие не должно сдвигать обзор');
  browser.run('wait', '--fn', 'document.activeElement?.matches(".cash-catalog-open") === true');
  truth(
    browser,
    'document.activeElement?.matches(".cash-catalog-open") === true',
    'Фокус должен вернуться на кнопку каталога',
  );
}

export function catalogDialog(browser: Browser) {
  prepare(browser);
  go(browser, 'overview');
  catalogGeometry(browser, 375);
  catalogGeometry(browser, 1440);
  browser.run('set', 'viewport', '375', '812');
  browser.run('scrollintoview', '.cash-catalog-open');
  browser.run('click', '.cash-catalog-open');
  browser.run('click', '#cash-catalog-dialog .asset-catalog li:first-child button');
  truth(
    browser,
    'document.querySelector("#buy-dialog")?.open === true && document.querySelector("#buy-dialog [name=asset]")?.value === "MSFT" && document.querySelector("#cash-catalog-dialog")?.open === true',
    'Покупка из каталога должна открыть форму MSFT',
  );
  browser.run('press', 'Escape');
  truth(
    browser,
    'document.querySelector("#cash-catalog-dialog")?.open === true && document.activeElement?.closest(".asset-catalog li:first-child") !== null',
    'После формы фокус должен вернуться к активу',
  );
  browser.run('press', 'Escape');
  truth(
    browser,
    'document.activeElement?.matches(".cash-catalog-open") === true',
    'После каталога фокус должен вернуться в обзор',
  );
  return '375/1440: обзор неподвижен; Escape и вложенная покупка возвращают фокус';
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
