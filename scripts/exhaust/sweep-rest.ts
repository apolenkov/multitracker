/** Покой перед перечислением: диалоги закрыты, раскрытия свернуты, прокрутка в начало. */
import { evaluate, settleLayout, type Browser } from '../ui-driver.ts';

export const restState = (browser: Browser): void => {
  evaluate(
    browser,
    `(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); document.querySelectorAll('details[open]').forEach((d) => { d.open = false; }); scrollTo(0, 0); return true; })()`,
  );
  settleLayout(browser);
};
