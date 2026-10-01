/** Книга принятых исключений покрытия: каждая запись обязана иметь причину. */
export type LedgerEntry = Readonly<{ signature: string; reason: string }>;
export type Ledger = Readonly<{ version: number; exceptions: readonly LedgerEntry[] }>;

export type LedgerCheck = Readonly<{
  missing: readonly string[];
  stale: readonly string[];
  ok: boolean;
}>;

export const parseLedger = (text: string): Ledger => {
  const raw: unknown = JSON.parse(text);
  const value = raw as Readonly<Record<string, unknown>>;
  const exceptions = Array.isArray(value.exceptions) ? value.exceptions : [];
  return {
    version: typeof value.version === 'number' ? value.version : 1,
    exceptions: exceptions.flatMap((entry: unknown) => {
      const item = entry as Readonly<Record<string, unknown>>;
      return typeof item.signature === 'string' && typeof item.reason === 'string'
        ? [{ signature: item.signature, reason: item.reason }]
        : [];
    }),
  };
};

/**
 * missing — открытые сигнатуры без записи (запуск падает);
 * stale — записи, чьи сигнатуры уже покрыты: книге разрешено только уменьшаться.
 */
export const checkLedger = (
  uncovered: readonly string[],
  ledger: Ledger,
): LedgerCheck => {
  const known = new Set(ledger.exceptions.map((entry) => entry.signature));
  const seen = new Set(uncovered);
  const missing = uncovered.filter((signature) => !known.has(signature));
  const stale = ledger.exceptions
    .map((entry) => entry.signature)
    .filter((signature) => !seen.has(signature));
  return { missing, stale, ok: missing.length === 0 && stale.length === 0 };
};
