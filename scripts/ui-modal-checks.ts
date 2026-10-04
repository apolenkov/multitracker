import assert from 'node:assert/strict';
import { batch, evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { focused, layoutShift } from './ui-helpers.ts';
import { routeReady } from './exhaust/probe.ts';
import { isRecord } from './exhaust/guards.ts';

const SYNC_DIALOG = '#sync-conflict';
const SYNC_OPENER = '.sync-panel section.sync-actions button.quiet';
const LOCAL_RADIO = `${SYNC_DIALOG} input[value="local"]`;
const REMOTE_RADIO = `${SYNC_DIALOG} input[value="remote"]`;
const IMPORT_DIALOG = '#import-history';
const DETAILS_OPENER = '#import-history-details';
const RECONCILE_OPENER = '#import-reconcile';
type Lang = 'ru' | 'en';

const q = (selector: string) => `document.querySelector(${JSON.stringify(selector)})`;
const opened = (selector: string) => `${q(selector)}?.open === true`;

function env(browser: Browser, screen: string, width: number, lang: Lang) {
  browser.run('set', 'viewport', '1440', '900');
  evaluate(browser, `location.hash = ${JSON.stringify(`#${screen}`)}; true`);
  browser.run('wait', '--fn', routeReady(`#${screen}`));
  settleLayout(browser);
  browser.run('select', '#topbar-language', lang);
  browser.run('wait', '--fn', `document.documentElement.lang === '${lang}'`);
  browser.run('set', 'viewport', String(width), '900');
  settleLayout(browser);
}

function openVia(browser: Browser, opener: string, dialog: string) {
  browser.run('click', opener);
  browser.run('wait', '--fn', opened(dialog));
}

const closedOn = (dialog: string, opener: string) =>
  `${q(dialog)}?.open !== true && ${focused(opener)}`;

function escape(browser: Browser, dialog: string) {
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', `!${opened(dialog)}`);
}

function toPoint(value: unknown): Readonly<{ x: number; y: number }> {
  assert.ok(
    isRecord(value) && typeof value.x === 'number' && typeof value.y === 'number',
    'подложка: нет точки вне диалога',
  );
  return { x: value.x, y: value.y };
}

// Подложка модального dialog: координаты вне его рамки, target — сам dialog.
function backdrop(browser: Browser, dialog: string) {
  const point = toPoint(
    evaluate(
      browser,
      `(() => { const box = ${q(dialog)}?.getBoundingClientRect(); return box ? {x: Math.round(innerWidth / 2), y: box.top > 12 ? 4 : innerHeight - 4} : null; })()`,
    ),
  );
  batch(browser, [
    ['mouse', 'move', String(point.x), String(point.y)],
    ['mouse', 'down', 'left'],
    ['mouse', 'up', 'left'],
  ]);
}

const triggers: Readonly<Record<string, (browser: Browser) => void>> = {
  escape: (browser) => browser.run('press', 'Escape'),
  cancel: (browser) => browser.run('click', `${SYNC_DIALOG} .dialog-actions button.quiet`),
  'x-button': (browser) => browser.run('click', `${SYNC_DIALOG} .icon-close`),
  backdrop: (browser) => backdrop(browser, SYNC_DIALOG),
};

// Закрытие пользователя обязано кончаться закрытым диалогом и фокусом на
// открывателе; повторное открытие — свежий экземпляр (выбор сброшен на local).
function closeCycle(browser: Browser, way: string, trigger: () => void) {
  openVia(browser, SYNC_OPENER, SYNC_DIALOG);
  browser.run('click', REMOTE_RADIO);
  trigger();
  browser.run('wait', '--fn', closedOn(SYNC_DIALOG, SYNC_OPENER));
  openVia(browser, SYNC_OPENER, SYNC_DIALOG);
  assert.equal(
    evaluate(browser, `${q(LOCAL_RADIO)}?.checked`),
    true,
    `${way}: повторное открытие обязано давать свежий экземпляр (local)`,
  );
  escape(browser, SYNC_DIALOG);
  return `${way}:closed+focus+reopen`;
}

// Событие close ставится в очередь: клик до его задачи не должен умирать
// вместе с устаревшим закрытием — свежее открытие остаётся открытым.
function race(browser: Browser, dialog: string, first: string, second: string, proof: string) {
  openVia(browser, first, dialog);
  evaluate(
    browser,
    `(() => { const element = ${q(dialog)}; if (element instanceof HTMLDialogElement) element.close(); ${q(second)}?.click(); return true; })()`,
  );
  browser.run('wait', '--fn', opened(dialog));
  assert.equal(
    evaluate(browser, proof),
    true,
    `${dialog}: устаревшее закрытие убило свежее открытие`,
  );
  escape(browser, dialog);
}

export function closePathsIn(browser: Browser, width: number, lang: Lang) {
  env(browser, 'sync', width, lang);
  const ways = Object.entries(triggers).map(([way, trigger]) =>
    closeCycle(browser, way, () => trigger(browser)),
  );
  race(browser, SYNC_DIALOG, SYNC_OPENER, SYNC_OPENER, `${q(LOCAL_RADIO)}?.checked === true`);
  env(browser, 'import', width, lang);
  race(
    browser,
    IMPORT_DIALOG,
    DETAILS_OPENER,
    DETAILS_OPENER,
    `${q(`${IMPORT_DIALOG} .import-result`)} !== null`,
  );
  race(
    browser,
    IMPORT_DIALOG,
    DETAILS_OPENER,
    RECONCILE_OPENER,
    `${q(`${IMPORT_DIALOG} select`)} !== null`,
  );
  return { width, lang, ways, races: 'sync+import same-kind + kind-switch' };
}

export function dialogClosePaths(browser: Browser) {
  return ([1440, 375] as const).flatMap((width) =>
    (['ru', 'en'] as const).map((lang) => closePathsIn(browser, width, lang)),
  );
}

function mountShiftIn(browser: Browser, width: number, lang: Lang) {
  env(browser, 'sync', width, lang);
  layoutShift(
    browser,
    () => openVia(browser, SYNC_OPENER, SYNC_DIALOG),
    `dialog-mount ${width}/${lang}`,
  );
  layoutShift(browser, () => escape(browser, SYNC_DIALOG), `dialog-unmount ${width}/${lang}`);
  return { width, lang, shift: '<=2px' };
}

export function dialogMountStability(browser: Browser) {
  return ([1440, 768, 375, 320] as const).flatMap((width) =>
    (['ru', 'en'] as const).map((lang) => mountShiftIn(browser, width, lang)),
  );
}
