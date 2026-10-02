/** Перестройка ratchet-базлайнов из артефактов прогона: baseline.ts <run-dir>. */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { asArray, isRecord } from './guards.ts';
import { dumpLedger, ledgerEntry, parseLedger } from './ledger.ts';
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

/**
 * Базлайн пересобирается только явной командой `npm run exhaust:baseline`.
 * В CI генератор отказывается работать: тихий сброс в пайплайне невозможен.
 */
export const assertLocalRun = (env: Readonly<Record<string, string | undefined>>): void => {
  if (env.CI === 'true' || env.CI === '1')
    throw new Error('exhaust baseline: rebuild is manual-only, refusing in CI');
};

/**
 * Пересборка — объединение: свежие непокрытые сигнатуры добавляются к книге,
 * старые записи сохраняются (элемент мог не попасть в скан этого прогона, а не
 * стать покрытым). Книга растёт монотонно и никогда не откатывает подтверждённое.
 */
export const unionEntries = (
  fresh: readonly LedgerEntry[],
  existing: readonly LedgerEntry[],
): readonly LedgerEntry[] => {
  const known = new Set(fresh.map((entry) => entry.signature));
  return [...fresh, ...existing.filter((entry) => !known.has(entry.signature))].toSorted(
    bySignature,
  );
};

const readExceptions = (path: string): readonly LedgerEntry[] => {
  try {
    return parseLedger(execFileSync('cat', [resolve(path)], { encoding: 'utf8' })).exceptions;
  } catch {
    return [];
  }
};

export const rebuild = (dir: string, env: Readonly<Record<string, string | undefined>>): void => {
  assertLocalRun(env);
  const elements = unionEntries(
    elementExceptions(loadJson(dir, 'element-coverage.json')),
    readExceptions('scripts/exhaust/uncovered-ledger.json'),
  );
  writeFileSync('scripts/exhaust/uncovered-ledger.json', dumpLedger(elements));
  const code = unionEntries(
    codeExceptions(loadJson(dir, 'code-coverage.json')),
    readExceptions('scripts/exhaust/uncovered-code-ledger.json'),
  );
  writeFileSync('scripts/exhaust/uncovered-code-ledger.json', dumpLedger(code));
};

const script = process.argv.at(1) ?? '';
const dir = process.argv.at(2);
if (script.endsWith('baseline.ts') && dir !== undefined) rebuild(dir, process.env);
