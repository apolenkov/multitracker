/** Формы части (b): пробный ввод из схемы и короткие коды ошибок. */
import { demoState } from '../../src/model/portfolio.ts';
import { initialOperation, validateOperation } from '../../src/forms/operations.ts';
import type { OperationInput } from '../../src/forms/operations.ts';
import { dateFor, primaryField, valueFor } from './form-cases.ts';
import type { ValueClass } from './form-cases.ts';
import type { OperationType } from '../../src/forms/operations.ts';
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Finding } from './records.ts';
import { asFinding } from './page-rows.ts';
import { asArray } from './guards.ts';

/** Открыть диалог и проверить отсутствие ошибок до отправки. */
const checkBefore = (browser: Browser): readonly Finding[] => {
  evaluate(browser, "(document.querySelector('#buy-dialog')?.showModal(), true)");
  browser.run('wait', '--fn', "!!document.querySelector('#buy-dialog[open]')");
  const before: unknown = evaluate(
    browser,
    'document.querySelectorAll(\'#buy-dialog [aria-invalid="true"]\').length',
  );
  if (before === 0) return [];
  const finding = asFinding({
    rule: 'form-error-before-submit',
    sel: '#buy-dialog',
    expected: '0',
    actual: String(before),
  });
  return finding === null ? [] : [finding];
};

/** Отправить пустую форму и собрать длинные тексты ошибок. */
const checkAfter = (browser: Browser): readonly Finding[] => {
  evaluate(browser, "(document.querySelector('#buy-dialog form')?.requestSubmit(), true)");
  browser.run('wait', '--fn', '!!document.querySelector(\'#buy-dialog [aria-invalid="true"]\')');
  const after: unknown = evaluate(
    browser,
    "[...document.querySelectorAll('#buy-dialog [data-error]')].map((el) => el.textContent)",
  );
  return asArray(after)
    .map(String)
    .filter((text) => text.length > 60)
    .map((text) => ({
      rule: 'form-error-long',
      selector: '#buy-dialog',
      expected: '<=60',
      actual: text.slice(0, 80),
    }));
};

/** Гейт форм в браузере: нет ошибок до отправки, короткие тексты после. */
export const formGating = (browser: Browser): readonly Finding[] => {
  const pre = checkBefore(browser);
  const long = checkAfter(browser);
  evaluate(browser, "(document.querySelector('#buy-dialog')?.close(), true)");
  return [...pre, ...long];
};

/** Пробный ввод: первичное числовое поле или граничная дата из класса значений. */
export const probeInput = (
  type: OperationType,
  valueClass: ValueClass,
  index: number,
): OperationInput => {
  const base = initialOperation(demoState, 'binance');
  const field = primaryField(type);
  if (valueClass === 'date-edge') return { ...base, type, date: dateFor(index) };
  if (field === undefined) return { ...base, type };
  return { ...base, type, [field]: valueFor(valueClass) };
};

/** Коды ошибок валидатора для ввода: короткие тексты по полям. */
export const shortErrors = (input: OperationInput): readonly string[] =>
  Object.values(validateOperation(input, demoState));

const isShort = (code: string): boolean => code.length <= 20 && !code.includes(' ');

export type FormSummary = Readonly<{
  cases: number;
  longErrors: readonly string[];
}>;

/** Все 70 кейсов: короткие коды, длинные — находка. */
export const formSummary = (
  cases: readonly Readonly<{ type: OperationType; valueClass: ValueClass }>[],
): FormSummary => ({
  cases: cases.length,
  longErrors: cases.flatMap((item, index) =>
    shortErrors(probeInput(item.type, item.valueClass, index)).filter((code) => !isShort(code)),
  ),
});
