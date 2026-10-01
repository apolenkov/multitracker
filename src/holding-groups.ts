import type { Language } from './i18n.ts';

export type HoldingClass = 'crypto' | 'stock' | 'fund' | 'bond' | 'cash';
export type HoldingGroup<T> = Readonly<{
  kind: HoldingClass;
  rows: readonly T[];
  value: number;
  share: number;
}>;

const order: readonly HoldingClass[] = ['crypto', 'stock', 'fund', 'bond', 'cash'];
const classes = new Map<string, HoldingClass>([
  ['BTC', 'crypto'],
  ['TWT', 'crypto'],
  ['MSFT', 'stock'],
  ['FUND-DEMO', 'fund'],
  ['BOND-DEMO', 'bond'],
  ['RUB', 'cash'],
  ['USD', 'cash'],
]);
const names = new Map<HoldingClass, readonly [string, string]>([
  ['crypto', ['Криптовалюты', 'Crypto']],
  ['stock', ['Акции', 'Stocks']],
  ['fund', ['Фонды', 'Funds']],
  ['bond', ['Облигации', 'Bonds']],
  ['cash', ['Деньги', 'Cash']],
]);

export const holdingClassName = (kind: HoldingClass, language: Language) =>
  names.get(kind)?.[language === 'ru' ? 0 : 1] ?? kind;

// Группы в постоянном порядке; порядок строк внутри группы сохраняется (сортировка — до группировки).
// Сумма и доля группы считаются из уже показанных значений строк; пустая группа не выводится.
export function groupHoldings<T>(
  rows: readonly T[],
  symbol: (row: T) => string,
  value: (row: T) => number,
  total: number,
): readonly HoldingGroup<T>[] {
  return order
    .map((kind) => {
      const members = rows.filter((row) => (classes.get(symbol(row)) ?? 'stock') === kind);
      const sum = members.reduce((result, row) => result + value(row), 0);
      return { kind, rows: members, value: sum, share: total > 0 ? (sum / total) * 100 : 0 };
    })
    .filter((group) => group.rows.length > 0);
}
