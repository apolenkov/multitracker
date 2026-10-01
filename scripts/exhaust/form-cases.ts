/** Кейсы форм части (b): 10 типов операций × 7 классов значений из схемы. */
import { operationFields, operationTypes } from '../../src/forms/operations.ts';
import type { Field, OperationType } from '../../src/forms/operations.ts';

export const valueClasses = [
  'empty',
  'zero',
  'negative',
  'huge',
  'decimal',
  'text',
  'date-edge',
] as const;
export type ValueClass = (typeof valueClasses)[number];
export type FormCase = Readonly<{ type: OperationType; valueClass: ValueClass }>;

const probeValues = new Map<ValueClass, string>([
  ['empty', ''],
  ['zero', '0'],
  ['negative', '-5'],
  ['huge', '9999999999999'],
  ['decimal', '1,5'],
  ['text', 'abc'],
  ['date-edge', ''],
]);

/** Представительное значение класса для числового поля. */
export const valueFor = (valueClass: ValueClass): string => probeValues.get(valueClass) ?? '';

const boundaryDates = ['2000-01-01', '2026-09-30', '1999-12-31', '2026-10-01'] as const;

/** Граничная дата по индексу кейса (цикл из четырёх). */
export const dateFor = (index: number): string =>
  boundaryDates[index % boundaryDates.length] ?? '2000-01-01';

const numericFields = ['quantity', 'price', 'amount', 'fee', 'fx', 'receivedAmount'] as const;

/** Первое числовое поле типа по схеме (куда кладём класс значения). */
export const primaryField = (type: OperationType): Field | undefined =>
  operationFields(type).find((field): field is Field =>
    (numericFields as readonly string[]).includes(field),
  );

/** Все 70 кейсов: каждый тип × каждый класс значений. */
export const formCases = (): readonly FormCase[] =>
  operationTypes.flatMap((type) => valueClasses.map((valueClass) => ({ type, valueClass })));
