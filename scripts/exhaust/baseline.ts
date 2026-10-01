/** Перестройка ratchet-базлайнов из артефактов прогона: baseline.ts <run-dir>. */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { asArray, isRecord } from './guards.ts';
import { ledgerEntry } from './ledger.ts';
import type { LedgerEntry } from './ledger.ts';

const CODE_REASON = 'baseline: not exercised by the layers 1-3 sweep, may only shrink';

const loadJson = (dir: string, name: string): unknown => {
  const raw = execFileSync('cat', [resolve(dir, name)], { encoding: 'utf8' });
  const parsed: unknown = JSON.parse(raw);
  return parsed;
};

const bySignature = (a: LedgerEntry, b: LedgerEntry): number => {
  if (a.signature < b.signature) return -1;
  if (a.signature > b.signature) return 1;
  return 0;
};

/** Непокрытые элементы с причинами реестра: одна запись на сигнатуру. */
export const elementExceptions = (doc: unknown): readonly LedgerEntry[] => {
  if (!isRecord(doc)) return [];
  const rows = asArray(doc.entries).flatMap((row) => {
    if (!isRecord(row) || row.clicked !== false) return [];
    const entry = ledgerEntry({ signature: row.signature, reason: row.reason });
    return entry === null ? [] : [entry];
  });
  return rows.toSorted(bySignature);
};

/** Непокрытые функции с базовой причиной: ключ совпадает с проверкой run.ts. */
export const codeExceptions = (doc: unknown): readonly LedgerEntry[] => {
  if (!isRecord(doc)) return [];
  const rows = asArray(doc.reports).flatMap((report) => {
    if (!isRecord(report) || typeof report.file !== 'string') return [];
    const file = report.file;
    return asArray(report.uncoveredFunctions).flatMap((name) =>
      typeof name === 'string' ? [{ signature: `${file}|${name}`, reason: CODE_REASON }] : [],
    );
  });
  return rows.toSorted(bySignature);
};

const dump = (exceptions: readonly LedgerEntry[]): string =>
  `${JSON.stringify({ version: 1, exceptions }, null, 2)}\n`;

export const rebuild = (dir: string): void => {
  const elements = dump(elementExceptions(loadJson(dir, 'element-coverage.json')));
  writeFileSync('scripts/exhaust/uncovered-ledger.json', elements);
  const code = dump(codeExceptions(loadJson(dir, 'code-coverage.json')));
  writeFileSync('scripts/exhaust/uncovered-code-ledger.json', code);
};

const script = process.argv.at(1) ?? '';
const dir = process.argv.at(2);
if (script.endsWith('baseline.ts') && dir !== undefined) rebuild(dir);
