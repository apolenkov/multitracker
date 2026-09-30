import { useState } from 'react';
import { openDialog } from './Forms.tsx';
import { totals, type Asset, type Buy, type Currency } from './model/portfolio.ts';
import { getLabels, money, number, percentage, type Language } from './i18n.ts';

type Holding = Readonly<{ asset: Asset; buys: readonly Buy[] }>;
type SortColumn = 'asset' | 'value';
type Sort = Readonly<{ column: SortColumn; direction: 'ascending' | 'descending' }>;
type TableProps = Readonly<{
  rows: readonly Holding[];
  value: number;
  currency: Currency;
  baseCurrency: Currency;
  language: Language;
  hidden: boolean;
  onSelect: (asset: Asset) => void;
}>;

export function HoldingsTable(props: TableProps) {
  const [sort, setSort] = useState<Sort>({ column: 'asset', direction: 'ascending' });
  const toggle = (column: SortColumn) =>
    setSort({
      column,
      direction:
        sort.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending',
    });
  const rows = props.rows.toSorted((left, right) => {
    const difference =
      sort.column === 'asset'
        ? left.asset.localeCompare(right.asset)
        : totals(left.buys, props.currency).value - totals(right.buys, props.currency).value;
    return sort.direction === 'ascending' ? difference : -difference;
  });
  return (
    <>
      <SortControls sort={sort} language={props.language} toggle={toggle} />
      <AssetTable {...props} rows={rows} sort={sort} />
    </>
  );
}

function SortControls({
  sort,
  language,
  toggle,
}: Readonly<{ sort: Sort; language: Language; toggle: (column: SortColumn) => void }>) {
  const labels = getLabels(language);
  const direction = sort.direction === 'ascending' ? labels.ascending : labels.descending;
  return (
    <div className="holdings-sort">
      <span>{labels.sortBy}:</span>
      {(['asset', 'value'] as const).map((column) => (
        <button
          type="button"
          key={column}
          aria-pressed={sort.column === column}
          onClick={() => toggle(column)}
        >
          {column === 'asset' ? labels.asset : labels.value}
          {sort.column === column && ` · ${direction}`}
        </button>
      ))}
    </div>
  );
}

function AssetTable({
  rows,
  value,
  currency,
  baseCurrency,
  language,
  hidden,
  onSelect,
  sort,
}: TableProps & Readonly<{ sort: Sort }>) {
  const labels = getLabels(language);
  return (
    <table className="holdings-table">
      <caption className="visually-hidden">{labels.holdings}</caption>
      <thead>
        <tr className="holding-head">
          <th scope="col" aria-sort={sort.column === 'asset' ? sort.direction : undefined}>
            {labels.asset}
          </th>
          <th scope="col">{labels.quantity}</th>
          <th scope="col" aria-sort={sort.column === 'value' ? sort.direction : undefined}>
            {labels.value}
          </th>
          <th scope="col">
            {labels.result} · {baseCurrency}
          </th>
          <th scope="col">{labels.weight}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <HoldingRow
            key={row.asset}
            holding={row}
            value={value}
            currency={currency}
            baseCurrency={baseCurrency}
            language={language}
            hidden={hidden}
            onSelect={onSelect}
          />
        ))}
      </tbody>
    </table>
  );
}

function HoldingRow({
  holding,
  value,
  currency,
  baseCurrency,
  language,
  hidden,
  onSelect,
}: Omit<TableProps, 'rows'> & Readonly<{ holding: Holding }>) {
  const labels = getLabels(language);
  const result = totals(holding.buys, currency);
  const performance = totals(holding.buys, baseCurrency);
  const amount = (amountValue: number, displayCurrency = currency, signed = false) =>
    hidden ? '••••' : money(amountValue, displayCurrency, language, signed);

  return (
    <tr className="holding-row">
      <HoldingAsset asset={holding.asset} onSelect={onSelect} />
      <td>
        <span className="mobile-label">{labels.quantity}</span>
        {hidden
          ? '••••'
          : number(
              holding.buys.reduce((sum, buy) => sum + buy.quantity, 0),
              language,
            )}
      </td>
      <td>
        <span className="mobile-label">{labels.value}</span>
        {amount(result.value)}
      </td>
      <td className={performance.profit >= 0 ? 'positive' : 'negative'}>
        <span className="mobile-label">
          {labels.result} · {baseCurrency}
        </span>
        {amount(performance.profit, baseCurrency, true)}
      </td>
      <td>
        <span className="mobile-label">{labels.weight}</span>
        {hidden ? '••••' : percentage((result.value / value) * 100, language)}
      </td>
    </tr>
  );
}

function HoldingAsset({
  asset,
  onSelect,
}: Readonly<{ asset: Asset; onSelect: (asset: Asset) => void }>) {
  return (
    <td>
      <button
        className="asset-name"
        onClick={() => {
          onSelect(asset);
          openDialog('asset-dialog');
        }}
      >
        <span className={`asset-symbol ${asset.toLowerCase()}`} aria-hidden="true">
          {asset === 'BTC' ? '₿' : asset.slice(0, 1)}
        </span>
        <strong>{asset}</strong>
      </button>
    </td>
  );
}
