/** Блуждание доходит до цели, как человек: раздел, открыватель диалога, свёрнутые раскрытия. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';

const SETTLED = 'document.getAnimations({subtree:true}).every((a)=>a.playState!=="running")';

/** Открыватель диалога: раздел и путь элемента, который его открыл при обходе. */
export type Opener = Readonly<{ route: string; path: string }>;

export type Places = Readonly<{
  routeOf: ReadonlyMap<string, string>;
  openers: ReadonlyMap<string, Opener>;
}>;

/** Раскрыть свёрнутые details над целью кликом по их summary, как сделал бы человек. */
const openDisclosuresProbe = (path: string): string =>
  `(() => { const el = document.querySelector(${JSON.stringify(path)}); if (!el) return false; for (let d = el.closest('details:not([open])'); d; d = d.parentElement?.closest('details:not([open])') ?? null) d.querySelector(':scope > summary')?.click(); return true; })()`;

/** Цель в другом разделе или в свёрнутом раскрытии: перейти в её раздел и раскрыть. */
const goTo = (browser: Browser, route: string): void => {
  if (route === '') return;
  evaluate(browser, `(location.hash === '#${route}' || (location.hash = '${route}'), true)`);
  browser.run(
    'wait',
    '--fn',
    `location.hash === '#${route}' && !!document.querySelector('#main h1')`,
  );
};

/** Открыть диалог цели настоящим кликом по открывателю, который нашёл обход. */
const openDialog = (browser: Browser, id: string, opener: Opener): void => {
  const open = `!!document.querySelector('dialog#${id}[open]')`;
  if (evaluate(browser, open) === true) return;
  goTo(browser, opener.route);
  browser.run('click', opener.path);
  browser.run('wait', '--fn', open);
};

export const dialogOf = (path: string): string => /dialog#([\w-]+)/.exec(path)?.[1] ?? '';

export const reveal = (browser: Browser, path: string, places: Places): void => {
  const id = dialogOf(path);
  const opener = places.openers.get(id);
  if (opener !== undefined) openDialog(browser, id, opener);
  else goTo(browser, places.routeOf.get(path) ?? '');
  evaluate(browser, openDisclosuresProbe(path));
  browser.run('wait', '--fn', SETTLED);
};
