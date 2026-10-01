import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Icon } from './Icon.tsx';
import { AssetSymbol } from './AssetSymbol.tsx';
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
      {/* Повторный клик по активной вкладке меняет направление, поэтому выбор — через onClick. */}
      <Tabs value={sort.column} activationMode="manual">
        <TabsList aria-label={labels.sortBy}>
          {(['asset', 'value'] as const).map((column) => (
            <TabsTrigger
              key={column}
              value={column}
              aria-label={`${column === 'asset' ? labels.asset : labels.value}${sort.column === column ? ` · ${direction}` : ''}`}
              onClick={() => toggle(column)}
            >
              {column === 'asset' ? labels.asset : labels.value}
              {sort.column === column && (
                <span className={`sort-marker ${sort.direction}`}>
                  <Icon name="chevron" />
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
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
      <td className="holding-quantity">
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
      <HoldingWeight
        asset={holding.asset}
        weight={(result.value / value) * 100}
        language={language}
        hidden={hidden}
      />
    </tr>
  );
}

function HoldingWeight({
  asset,
  weight,
  language,
  hidden,
}: Readonly<{
  asset: Asset;
  weight: number;
  language: Language;
  hidden: boolean;
}>) {
  return (
    <td className="holding-weight">
      <span className="mobile-label">{getLabels(language).weight}</span>
      {hidden ? '••••' : percentage(weight, language)}
      {!hidden && (
        <span className={`holding-allocation ${asset.toLowerCase()}`} aria-hidden="true">
          <span style={{ width: `${weight}%` }} />
        </span>
      )}
    </td>
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
        <AssetSymbol symbol={asset} />
        <strong>{asset}</strong>
      </button>
    </td>
  );
}
