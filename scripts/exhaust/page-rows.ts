/** Типизированные строки страничных проб: перечисление и записи обхода кликов. */
import { asArray, asText, isRecord } from './guards.ts';
import type { RegistryInput } from './registry.ts';

export type Enumerated = Omit<RegistryInput, 'route'>;

const one = <T>(value: T | null): readonly T[] => (value === null ? [] : [value]);

const asEnumerated = (row: unknown): Enumerated | null => {
  const cells = asArray(row);
  if (cells.length < 8) return null;
  const path = cells.at(0);
  const role = cells.at(1);
  const name = cells.at(2);
  const tag = cells.at(3);
  if (
    typeof path !== 'string' ||
    typeof role !== 'string' ||
    typeof name !== 'string' ||
    typeof tag !== 'string'
  ) {
    return null;
  }
  return {
    path,
    role,
    name,
    tag,
    visible: cells.at(5) === true,
    disabled: cells.at(6) === true,
    skip: '',
  };
};

/** Строки enumerateSource в типизированные записи; мусор отбрасывается. */
export const parseEnumerate = (value: unknown): readonly Enumerated[] => {
  if (!isRecord(value)) return [];
  return asArray(value.items).flatMap((row) => one(asEnumerated(row)));
};

export type SweepHit = Readonly<{
  path: string;
  before: string;
  after: string;
  duration: number;
  dialogs: readonly string[];
  errors: readonly string[];
  warnings: readonly string[];
  skipped: string;
  meta: Readonly<{ role: string; name: string; tag: string; dialog: string }> | null;
}>;

const strings = (value: unknown): readonly string[] =>
  asArray(value).map((entry) => asText(entry));

const metaOf = (value: unknown): SweepHit['meta'] => {
  const cells = asArray(value);
  if (cells.length < 5) return null;
  const role = cells.at(1);
  const name = cells.at(2);
  const tag = cells.at(3);
  const dialog = cells.at(4);
  return typeof role === 'string' &&
    typeof name === 'string' &&
    typeof tag === 'string' &&
    typeof dialog === 'string'
    ? { role, name, tag, dialog }
    : null;
};

/** Одна запись sweepSource/clickSource: пропуск, клик или мусор. */
export const parseSweepRecord = (value: unknown): SweepHit | null => {
  if (!isRecord(value) || typeof value.p !== 'string') return null;
  if (typeof value.skip === 'string') {
    return {
      path: value.p,
      before: '',
      after: '',
      duration: 0,
      dialogs: [],
      errors: [],
      warnings: [],
      skipped: value.skip,
      meta: null,
    };
  }
  return {
    path: value.p,
    before: asText(value.b),
    after: asText(value.a),
    duration: typeof value.dur === 'number' ? value.dur : 0,
    dialogs: strings(value.dlg),
    errors: strings(value.err),
    warnings: strings(value.warn),
    skipped: '',
    meta: metaOf(value.meta),
  };
};
