/** Точечный пробник состояния страницы: хеш, маршрут, открытые диалоги. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import { stateHashSource } from './page-dom.ts';
import { asArray, asText, isRecord } from './guards.ts';

export type PageState = Readonly<{ hash: string; own: string; dialogs: readonly string[] }>;

/**
 * «Маршрут закоммичен»: location.hash меняется синхронно, а содержимое раздела —
 * следующим коммитом React. aria-current на ссылке маршрута ставится тем же
 * коммитом, что и #main, поэтому h1 предыдущего раздела — ложный признак
 * готовности: ожидание обязано требовать пару «hash + aria-current».
 */
export const routeReady = (hash: string): string =>
  `location.hash === ${JSON.stringify(hash)} && !!document.querySelector('a[href=${JSON.stringify(hash)}][aria-current="page"]')`;

export const stateOf = (browser: Browser): PageState => {
  const value: unknown = evaluate(browser, stateHashSource);
  if (!isRecord(value)) return { hash: '', own: '', dialogs: [] };
  return {
    hash: asText(value.hash),
    own: asText(value.own),
    dialogs: asArray(value.dialogs).map((entry) => asText(entry)),
  };
};
