/** Решение по выводу `npm audit --json`: уязвимость роняет, сбой сети повторяется. */

export type AuditVerdict = 'ok' | 'vulnerable' | 'retry';

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const parse = (stdout: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(stdout);
    return parsed;
  } catch {
    return null;
  }
};

const count = (value: unknown): number => (typeof value === 'number' ? value : 0);

/**
 * Ответ со сводкой уязвимостей решает сразу: high или critical — провал.
 * Ответ без сводки (обрыв TLS, ошибка endpoint) ничего не говорит о
 * зависимостях — его можно повторить.
 */
export const auditVerdict = (stdout: string): AuditVerdict => {
  const doc = parse(stdout);
  const metadata = isObject(doc) ? doc.metadata : undefined;
  const found = isObject(metadata) ? metadata.vulnerabilities : undefined;
  if (!isObject(found)) return 'retry';
  return count(found.high) + count(found.critical) > 0 ? 'vulnerable' : 'ok';
};
