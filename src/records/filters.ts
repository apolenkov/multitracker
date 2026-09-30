import type { Transaction } from './data.ts';

export type HistoryFilter = Readonly<{
  search: string;
  account: string;
  type: string;
  asset: string;
  from: string;
  to: string;
  order: string;
}>;
export const initialFilters: HistoryFilter = {
  search: '',
  account: 'all',
  type: 'all',
  asset: 'all',
  from: '',
  to: '',
  order: 'newest',
};
function matchesText(record: Transaction, search: string) {
  return [record.asset, record.portfolioId, record.type, record.note.ru, record.note.en]
    .join(' ')
    .toLocaleLowerCase()
    .includes(search.trim().toLocaleLowerCase());
}
function matchesDates(record: Transaction, filter: HistoryFilter) {
  return (
    (filter.from === '' || record.date >= filter.from) &&
    (filter.to === '' || record.date <= filter.to)
  );
}
function matchesFilter(record: Transaction, filter: HistoryFilter) {
  return (
    (filter.account === 'all' || filter.account === record.account) &&
    (filter.type === 'all' || filter.type === record.type) &&
    (filter.asset === 'all' || filter.asset === record.asset) &&
    matchesDates(record, filter) &&
    matchesText(record, filter.search)
  );
}
export function filterTransactions(
  records: readonly Transaction[],
  portfolioId: string,
  filter: HistoryFilter,
) {
  const selected = portfolioId.split(',');
  return records
    .filter(
      (record) =>
        (portfolioId === 'all' || selected.includes(record.portfolioId)) &&
        matchesFilter(record, filter),
    )
    .toSorted((a, b) =>
      filter.order === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
    );
}
