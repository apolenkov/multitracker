import { go, savePortfolio, truth, waitTrue } from './ui-helpers.ts';
import type { Browser } from './ui-driver.ts';

const toast = '.status-message';
const region = `${toast} [role=status]`;

// F2: в DOM плашка — последний ребёнок <main>, поэтому «Закрыть» в порядке
// табуляции идёт после содержимого раздела — как визуально внизу вьюпорта.
// Живой регион смонтирован пустым уже при загрузке, текст вставляется позже,
// поэтому объявление срабатывает и на первом сообщении.
export function toastLastInMain(browser: Browser) {
  browser.run('set', 'viewport', '1440', '900');
  browser.run('select', '#topbar-language', 'ru');
  browser.run('wait', '--fn', 'document.documentElement.lang === "ru"');
  go(browser, 'portfolios');
  truth(
    browser,
    `Boolean(document.querySelector('${region}')) && !document.querySelector('${region}')?.textContent?.trim()`,
    'Живой регион смонтирован при загрузке и пуст: текст появится позже',
  );
  truth(
    browser,
    `document.querySelector('#main')?.lastElementChild === document.querySelector('${toast}')`,
    'Плашка — последний ребёнок <main>: «Закрыть» в табуляции после содержимого',
  );
  savePortfolio(browser);
  waitTrue(
    browser,
    `Boolean(document.querySelector('${region} p')?.textContent?.trim())`,
    'Текст сохранения вставлен в уже смонтированный живой регион',
  );
  truth(
    browser,
    `document.querySelector('${toast} .icon-close')?.checkVisibility({checkVisibilityCSS:true}) === true`,
    'У показанного сообщения есть видимая кнопка закрытия',
  );
  return 'регион смонтирован с загрузки пустым, текст позже; закрытие в табуляции после содержимого';
}
