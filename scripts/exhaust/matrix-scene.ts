/**
 * Сцена ячейки: сброс перед шагами и возврат после замеров.
 *
 * Каждая ячейка начинается с покоя (диалоги, меню и раскрытия закрыты), а замеры
 * идут на покое: курсор уведён, фокус снят, прокрутка в начало. Так чужие
 * состояния не дают ложных перекрытий и фокусных находок.
 */
import { evaluate, settleLayout, type Browser } from '../ui-driver.ts';
import { asText } from './guards.ts';
import type { EntryPlan } from './matrix-dsl.ts';
import type { StepOutcome } from './matrix-actions.ts';

/** Закрывает открытые диалоги Escape; повторяет, пока они остаются. */
export const closeDialogs = (browser: Browser, attempt: number): void => {
  if (attempt > 3) return;
  const open = evaluate(browser, `document.querySelectorAll('dialog[open]').length`);
  if (typeof open !== 'number' || open === 0) return;
  browser.run('press', 'Escape');
  closeDialogs(browser, attempt + 1);
};

/** Закрывает мобильное меню «Ещё», если оно открыто. */
const closeMenu = (browser: Browser): void => {
  const menuOpen =
    evaluate(
      browser,
      `(() => { const el = document.querySelector('#navigation-more'); return !!el && el.checkVisibility({checkVisibilityCSS:true}); })()`,
    ) === true;
  if (!menuOpen) return;
  try {
    browser.run('click', '#navigation-more-button');
  } catch {
    browser.run('press', 'Escape');
  }
};

const closeDetails = (browser: Browser): void => {
  evaluate(
    browser,
    `(() => { [...document.querySelectorAll('details[open]')].forEach((item) => { item.open = false; }); return true; })()`,
  );
};

/** Каждая ячейка начинается с покоя: чужие диалоги, меню и раскрытия не мешают шагам. */
export const resetScene = (browser: Browser): void => {
  closeDialogs(browser, 1);
  closeMenu(browser);
  closeDetails(browser);
  evaluate(browser, 'scrollTo(0, 0); true');
  settleLayout(browser);
};

/** Возврат состояния: диалоги и меню закрываются Escape, раскрытия — обнулением open. */
export const restore = (browser: Browser, openedDetails: readonly string[]): void => {
  closeDialogs(browser, 1);
  if (openedDetails.length > 0) closeDetails(browser);
  evaluate(browser, 'scrollTo(0, 0); true');
};

const menuOpen = (browser: Browser): boolean =>
  evaluate(
    browser,
    `(() => { const el = document.querySelector('#navigation-more'); return !!el && el.checkVisibility({checkVisibilityCSS:true}); })()`,
  ) === true;

const pageNote = (browser: Browser): string =>
  asText(evaluate(browser, "document.querySelector('#main h1')?.textContent?.trim() ?? ''")) === ''
    ? 'заголовок раздела не найден'
    : '';

/** Семантика ячейки: что именно должно было открыться или появиться после шагов. */
export const expectationNote = (
  browser: Browser,
  plan: EntryPlan,
  outcome: StepOutcome,
): string => {
  if (plan.expect === 'dialog' && !outcome.dialogOpened) return 'диалог не открылся';
  if (plan.expect === 'disclosure' && outcome.openedDetails.length === 0)
    return 'раскрытие не открылось';
  if (plan.expect === 'menu' && !menuOpen(browser)) return 'меню не открылось';
  if (plan.expect === 'page') return pageNote(browser);
  return '';
};

/** Возврат сцены в покой перед замерами: меню закрыто, прокрутка в начало, анимации досчитаны. */
export const quietScene = (browser: Browser): void => {
  const menuOpen =
    evaluate(
      browser,
      `(() => { const el = document.querySelector('#navigation-more'); return !!el && el.checkVisibility({checkVisibilityCSS:true}); })()`,
    ) === true;
  if (menuOpen) {
    try {
      browser.run('click', '#navigation-more-button');
    } catch {
      browser.run('press', 'Escape');
    }
  }
  // Фокус не удерживаем: замеры покоя не должны видеть его под липкими панелями.
  evaluate(
    browser,
    `(() => { const el = document.activeElement; if (el instanceof HTMLElement) el.blur(); return true; })()`,
  );
  evaluate(browser, 'scrollTo(0, 0); true');
  settleLayout(browser);
};

/** Клик с восстановлением: при перекрытии чужой слой убирается и клик повторяется. */
export const clickWithRecovery = (browser: Browser, selector: string): void => {
  browser.run('scrollintoview', selector);
  try {
    browser.run('click', selector);
  } catch {
    closeDialogs(browser, 1);
    closeMenu(browser);
    evaluate(browser, 'scrollTo(0, 0); true');
    settleLayout(browser);
    browser.run('scrollintoview', selector);
    browser.run('click', selector);
  }
  settleLayout(browser);
};
