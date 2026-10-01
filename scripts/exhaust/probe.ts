/** Точечный пробник состояния страницы: хеш, маршрут, открытые диалоги. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import { stateHashSource } from './page-dom.ts';
import { asArray, asText, isRecord } from './guards.ts';

export type PageState = Readonly<{ hash: string; own: string; dialogs: readonly string[] }>;

export const stateOf = (browser: Browser): PageState => {
  const value: unknown = evaluate(browser, stateHashSource);
  if (!isRecord(value)) return { hash: '', own: '', dialogs: [] };
  return {
    hash: asText(value.hash),
    own: asText(value.own),
    dialogs: asArray(value.dialogs).map((entry) => asText(entry)),
  };
};
