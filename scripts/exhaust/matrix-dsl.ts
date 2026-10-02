/** Типы и помощники шагов строгой матрицы. */
export type MatrixContext = Readonly<{
  language: 'ru' | 'en';
  width: 375 | 1440;
  theme: 'light' | 'dark';
}>;

export type MatrixStep =
  | Readonly<{ k: 'route'; hash: string }>
  | Readonly<{ k: 'click'; sel: string; selEn?: string }>
  | Readonly<{ k: 'text'; name: string; within?: string; alt?: readonly string[] }>
  | Readonly<{ k: 'select'; sel: string; value: string }>
  | Readonly<{ k: 'state'; value: string }>
  | Readonly<{ k: 'verify'; sel: string; selEn?: string }>
  | Readonly<{ k: 'escape' }>;

export type EntryExpectation = 'page' | 'dialog' | 'disclosure' | 'menu' | 'inline';

export type EntryPlan = Readonly<{
  expect: EntryExpectation;
  steps: readonly MatrixStep[];
  /** Причина неприменимости в контексте; отсутствие поля — применимо всегда. */
  when?: (context: MatrixContext) => string;
}>;

export const R = (hash: string): MatrixStep => ({ k: 'route', hash });

export const C = (sel: string, selEn?: string): MatrixStep => ({
  k: 'click',
  sel,
  ...(selEn ? { selEn } : {}),
});

export const T = (name: string, within?: string, alt?: readonly string[]): MatrixStep => ({
  k: 'text',
  name,
  ...(within ? { within } : {}),
  ...(alt ? { alt } : {}),
});

export const S = (sel: string, value: string): MatrixStep => ({ k: 'select', sel, value });

export const V = (sel: string, selEn?: string): MatrixStep => ({
  k: 'verify',
  sel,
  ...(selEn ? { selEn } : {}),
});

export const state = (value: string): MatrixStep => ({ k: 'state', value });

export const plan = (
  expect: EntryExpectation,
  steps: readonly MatrixStep[],
  when?: EntryPlan['when'],
): EntryPlan => ({ expect, steps, ...(when ? { when } : {}) });
