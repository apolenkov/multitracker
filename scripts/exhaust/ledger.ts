/** Книга принятых исключений покрытия: каждая запись обязана иметь причину. */
import { asArray, isRecord } from './guards.ts';

export type LedgerEntry = Readonly<{ signature: string; reason: string }>;
export type Ledger = Readonly<{ version: number; exceptions: readonly LedgerEntry[] }>;

export type LedgerCheck = Readonly<{
  missing: readonly string[];
  stale: readonly string[];
  ok: boolean;
}>;

export const ledgerEntry = (entry: unknown): LedgerEntry | null => {
  if (!isRecord(entry)) return null;
  const signature = entry.signature;
  const reason = entry.reason;
  return typeof signature === 'string' && typeof reason === 'string' ? { signature, reason } : null;
};

export const parseLedger = (text: string): Ledger => {
  const raw: unknown = JSON.parse(text);
  if (!isRecord(raw)) return { version: 1, exceptions: [] };
  const exceptions = asArray(raw.exceptions).flatMap((entry) => {
    const parsed = ledgerEntry(entry);
    return parsed === null ? [] : [parsed];
  });
  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    exceptions,
  };
};

/**
 * missing — открытые сигнатуры без записи (запуск падает);
 * stale — записи, чьи сигнатуры уже покрыты: книге разрешено только уменьшаться.
 */
export const checkLedger = (uncovered: readonly string[], ledger: Ledger): LedgerCheck => {
  const known = new Set(ledger.exceptions.map((entry) => entry.signature));
  const seen = new Set(uncovered);
  const missing = uncovered.filter((signature) => !known.has(signature));
  const stale = ledger.exceptions
    .map((entry) => entry.signature)
    .filter((signature) => !seen.has(signature));
  return { missing, stale, ok: missing.length === 0 && stale.length === 0 };
};
