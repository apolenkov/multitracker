import assert from 'node:assert/strict';
import { batch, evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { content, go, prepare, truth } from './ui-helpers.ts';

const labels = {
  ru: ['Локальная версия', 'Версия из облака'],
  en: ['Local version', 'Cloud version'],
} as const;

function radioLayout(browser: Browser, language: 'ru' | 'en') {
  const expected = JSON.stringify(language === 'ru' ? labels.ru : labels.en);
  truth(
    browser,
    `Array.from(document.querySelectorAll('#sync-conflict input[type="radio"]')).length === 2 && Array.from(document.querySelectorAll('#sync-conflict input[type="radio"]')).every((input, index) => input.getBoundingClientRect().width >= 16 && input.getBoundingClientRect().width <= 28 && input.labels?.length === 1 && input.labels[0].innerText.trim() === ${expected}[index])`,
    'Радиокнопки должны быть компактными и иметь правильные видимые подписи',
  );
  truth(
    browser,
    'Array.from(document.querySelectorAll(".conflict-choices label")).every(label => label.getBoundingClientRect().height >= 44 && label.getBoundingClientRect().left >= 0 && label.getBoundingClientRect().right <= innerWidth && parseFloat(getComputedStyle(label).fontSize) >= 16) && document.querySelector(".conflict-choices").scrollWidth <= document.querySelector(".conflict-choices").clientWidth + 1',
    'Подписи выбора версии должны быть читаемыми и помещаться на экране',
  );
  return evaluate(
    browser,
    'Array.from(document.querySelectorAll("#sync-conflict input[type=radio]"), input => ({value:input.value,width:input.getBoundingClientRect().width,label:input.labels[0].innerText.trim()}))',
  );
}

function chooseConflict(browser: Browser, width: number, language: 'ru' | 'en') {
  browser.run('set', 'viewport', String(width), '900');
  browser.run('select', '#topbar-language', language);
  browser.run('wait', '--fn', `document.documentElement.lang === '${language}'`);
  browser.run(
    'find',
    'role',
    'button',
    'click',
    '--name',
    language === 'ru' ? 'Сравнить версии' : 'Compare versions',
    '--exact',
  );
  browser.run('wait', '#sync-conflict[open]');
  const layout = radioLayout(browser, language);
  truth(
    browser,
    'document.querySelector("#sync-conflict input[value=local]")?.checked === true && document.querySelector("#sync-conflict input[value=remote]")?.checked === false',
    'Новая форма должна показывать исходный выбор локальной версии',
  );
  browser.run('check', '#sync-conflict input[value="remote"]');
  truth(
    browser,
    'document.querySelector("#sync-conflict input[value=remote]")?.checked === true && document.querySelector("#sync-conflict input[value=local]")?.checked === false',
    'Выбор облачной версии должен снять локальную',
  );
  browser.run(
    'find',
    'role',
    'button',
    'click',
    '--name',
    language === 'ru' ? 'Подтвердить выбор' : 'Confirm selection',
    '--exact',
  );
  browser.run('wait', '--fn', '!document.querySelector("#sync-conflict[open]")');
  const result = content(browser, '.sync-actions:has(h2)');
  assert.ok(
    result.includes(language === 'ru' ? labels.ru[1] : labels.en[1]),
    'Результат должен назвать выбранную облачную версию',
  );
  return { width, language, layout, result };
}

export function conflictRadioChoices(browser: Browser) {
  prepare(browser);
  go(browser, 'sync');
  const results = [375, 1440].flatMap((width) =>
    (['ru', 'en'] as const).map((language) => chooseConflict(browser, width, language)),
  );
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  return results;
}

export function syncPostConflictDisclosure(browser: Browser) {
  prepare(browser);
  go(browser, 'sync');
  const welcome = '.footer > .welcome-guide > summary';
  if (evaluate(browser, 'document.querySelector(".footer > .welcome-guide")?.open') === true) {
    browser.run('click', welcome);
    settleLayout(browser);
  }
  browser.run('click', '.sync-panel > .sync-actions:last-child > button');
  browser.run('wait', '#sync-conflict[open]');
  browser.run('click', '#sync-conflict input[value="remote"]');
  settleLayout(browser);
  batch(browser, [
    ['click', '#sync-conflict .dialog-actions button:last-child'],
    ['scrollintoview', welcome],
    ['click', welcome],
  ]);
  settleLayout(browser);
  truth(
    browser,
    '!document.querySelector("#sync-conflict[open]") && document.querySelector(".footer > .welcome-guide")?.open === true',
    'Осмысленный клик по помощи после подтверждения должен открыть её',
  );
  assert.match(content(browser, '.sync-panel > .sync-actions:last-child'), /Версия из облака/);
  browser.run('click', welcome);
  settleLayout(browser);
  return 'Подтверждение облачной версии → прокрутка → один настоящий клик открывает помощь';
}
