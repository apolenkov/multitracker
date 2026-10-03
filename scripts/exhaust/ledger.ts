/** Книга принятых исключений покрытия: каждая запись обязана иметь причину. */
import { createHash } from 'node:crypto';
import { asArray, isRecord } from './guards.ts';

export type LedgerEntry = Readonly<{ signature: string; reason: string }>;
export type Ledger = Readonly<{
  version: number;
  exceptions: readonly LedgerEntry[];
  seal: string | null;
}>;

export type LedgerCheck = Readonly<{
  missing: readonly string[];
  stale: readonly string[];
  sealed: boolean;
  ok: boolean;
}>;

const SEAL_DOMAIN = 'mt-exhaust-ledger v1\n';

/**
 * Печать генератора над каноническим содержимым. Ручная правка файла
 * печать не воспроизводит: единственный честный способ получить валидный
 * леджер — пересобрать его командой baseline.
 */
export const ledgerSeal = (version: number, exceptions: readonly LedgerEntry[]): string =>
  createHash('sha256')
    .update(SEAL_DOMAIN)
    .update(JSON.stringify({ version, exceptions }))
    .digest('hex');

/** Канонический текст леджера с печатью: пишется только из baseline. */
export const dumpLedger = (exceptions: readonly LedgerEntry[]): string =>
  `${JSON.stringify({ version: 1, exceptions, seal: ledgerSeal(1, exceptions) }, null, 2)}\n`;

export const ledgerEntry = (entry: unknown): LedgerEntry | null => {
  if (!isRecord(entry)) return null;
  const signature = entry.signature;
  const reason = entry.reason;
  return typeof signature === 'string' && typeof reason === 'string' ? { signature, reason } : null;
};

export const parseLedger = (text: string): Ledger => {
  const raw: unknown = JSON.parse(text);
  if (!isRecord(raw)) return { version: 1, exceptions: [], seal: null };
  const exceptions = asArray(raw.exceptions).flatMap((entry) => {
    const parsed = ledgerEntry(entry);
    return parsed === null ? [] : [parsed];
  });
  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    exceptions,
    seal: typeof raw.seal === 'string' ? raw.seal : null,
  };
};

/**
 * sealed — файл целиком написан генератором (ручная правка ломает печать);
 * missing — открытые сигнатуры без записи (регрессия вперёд, запуск падает);
 * stale — записи, чьи сигнатуры в этом прогоне не непокрыты: элемент либо
 * кликнут, либо не встретился сканеру — книга расходится с замером. Любое
 * расхождение роняет прогон до явной пересборки базлайна генератором:
 * книга обязана быть точным снимком принятого непокрытого набора.
 */
export const checkLedger = (uncovered: readonly string[], ledger: Ledger): LedgerCheck => {
  const known = new Set(ledger.exceptions.map((entry) => entry.signature));
  const seen = new Set(uncovered);
  const missing = uncovered.filter((signature) => !known.has(signature));
  const stale = ledger.exceptions
    .map((entry) => entry.signature)
    .filter((signature) => !seen.has(signature));
  const sealed = ledger.seal === ledgerSeal(ledger.version, ledger.exceptions);
  // Храповик допускает только уменьшение книги: рост (missing) — провал,
  // сокращение (stale) — законный результат и материал для пересборки книг.
  return { missing, stale, sealed, ok: sealed && missing.length === 0 };
};
