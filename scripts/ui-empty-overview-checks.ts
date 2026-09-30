import type { Browser } from './ui-driver.ts';
import { go, prepare, reveal, truth } from './ui-exploration.ts';

function emptyAtWidth(browser: Browser, width: number) {
  browser.run('set', 'viewport', '1440', '900');
  go(browser, 'settings');
  browser.run('set', 'viewport', String(width), width === 375 ? '812' : '900');
  reveal(browser, '.settings-panel > .demo-scenarios > summary');
  browser.run('select', '.demo-state-settings select', 'empty');
  browser.run('scrollintoview', '.demo-state-settings button');
  browser.run('click', '.demo-state-settings button');
  browser.run(
    'wait',
    '--fn',
    'location.hash === "#overview" && document.querySelector("#holdings-title .count")?.textContent === "0" && document.querySelector("#composition-title .count")?.textContent === "0"',
  );
  truth(
    browser,
    'document.querySelector("#holdings-title")?.checkVisibility() === true && document.querySelector("#composition-title")?.checkVisibility() === true && document.querySelectorAll("#main .holding-row, #main .allocation-legend > div").length === 0 && !document.querySelector("#main .value-history, #main .history-plot") && !document.querySelector("#main")?.innerText.includes("NaN")',
    `${width}: пустой обзор должен показывать пустые активы и состав без истории и NaN`,
  );
  browser.run('scrollintoview', '.static-state button');
  browser.run('click', '.static-state button');
  browser.run(
    'wait',
    '--fn',
    'document.querySelectorAll("#main .holding-row").length === 3 && document.querySelector("#holdings-title .count")?.textContent === "3"',
  );
  truth(
    browser,
    'document.querySelectorAll("#main .allocation-legend > div").length === 3 && !document.querySelector("#main .static-state") && !document.querySelector("#main")?.innerText.includes("NaN")',
    `${width}: возврат к примеру должен восстановить три актива и состав`,
  );
  return { width, emptyRows: 0, emptyComposition: 0, restoredRows: 3 };
}

export function emptyOverview(browser: Browser) {
  prepare(browser);
  const states = [375, 1440].map((width) => emptyAtWidth(browser, width));
  browser.run('set', 'viewport', '1440', '900');
  return states;
}
