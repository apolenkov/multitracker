/** Формы части (b): пробный ввод из схемы и короткие коды ошибок. */
import { demoState } from '../../src/model/portfolio.ts';
import { initialOperation, validateOperation } from '../../src/forms/operations.ts';
import type { OperationInput } from '../../src/forms/operations.ts';
import { dateFor, primaryField, valueFor } from './form-cases.ts';
import type { ValueClass } from './form-cases.ts';
import type { OperationType } from '../../src/forms/operations.ts';

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
