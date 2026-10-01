import { useState } from 'react';
import { tabsListClass, tabsTriggerClass } from '@/components/ui/tabs.tsx';
import { Icon } from './Icon.tsx';
import { AssetSymbol } from './AssetSymbol.tsx';
import { openDialog, openOperation } from './Forms.tsx';
import { totals, type Asset, type Buy, type Currency } from './model/portfolio.ts';
import { getLabels, money, number, percentage, resultTone, type Language } from './i18n.ts';
import { groupHoldings, holdingClassName, type HoldingGroup } from './holding-groups.ts';

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
type TableRow = Holding | Currency;
type SortedTableProps = Omit<TableProps, 'rows'> & Readonly<{ rows: readonly TableRow[] }>;

export function HoldingsTable(props: TableProps) {
  const [sort, setSort] = useState<Sort>({ column: 'asset', direction: 'ascending' });
  const toggle = (column: SortColumn) =>
    setSort({
      column,
      direction:
        sort.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending',
    });
  const cashRows = ['RUB', 'USD'] as const;
  const rows = [...props.rows, ...cashRows].toSorted((left, right) => {
    const difference =
      sort.column === 'asset'
        ? rowSymbol(left).localeCompare(rowSymbol(right))
        : rowValue(left, props.currency) - rowValue(right, props.currency);
    return sort.direction === 'ascending' ? difference : -difference;
  });
  return (
    <>
      <SortControls sort={sort} language={props.language} toggle={toggle} />
      <AssetTable {...props} rows={rows} sort={sort} />
    </>
  );
}

const rowSymbol = (row: TableRow) => (typeof row === 'string' ? row : row.asset);
const rowValue = (row: TableRow, currency: Currency) =>
  typeof row === 'string' ? 0 : totals(row.buys, currency).value;

// Заголовок группы: класс, сумма и доля группы; при скрытии сумм — «••••».
function GroupRow({
  group,
  currency,
  language,
  hidden,
}: Readonly<{
  group: HoldingGroup<TableRow>;
  currency: Currency;
  language: Language;
  hidden: boolean;
}>) {
  const share = group.value > 0 ? percentage(group.share, language) : '—';
  return (
    <tr className="holding-group">
      <th scope="rowgroup" colSpan={2}>
        {holdingClassName(group.kind, language)}
      </th>
      <td>{hidden ? '••••' : money(group.value, currency, language)}</td>
      <td />
      <td>{hidden ? '••••' : share}</td>
    </tr>
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
      {/* Не вкладки: кнопки с aria-pressed, повторный клик меняет направление. */}
      <div role="group" aria-label={labels.sortBy} className={tabsListClass}>
        {(['asset', 'value'] as const).map((column) => (
          <button
            type="button"
            key={column}
            className={tabsTriggerClass}
            data-state={sort.column === column ? 'active' : 'inactive'}
            aria-pressed={sort.column === column}
            aria-label={`${column === 'asset' ? labels.asset : labels.value}${sort.column === column ? ` · ${direction}` : ''}`}
            onClick={() => toggle(column)}
          >
            {column === 'asset' ? labels.asset : labels.value}
            {sort.column === column && (
              <span className={`sort-marker ${sort.direction}`}>
                <Icon name="chevron" />
              </span>
            )}
          </button>
        ))}
      </div>
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
}: SortedTableProps & Readonly<{ sort: Sort }>) {
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
      {groupHoldings(rows, rowSymbol, (row) => rowValue(row, currency), value).map((group) => (
        <tbody key={group.kind} data-holding-group={group.kind}>
          <GroupRow group={group} currency={currency} language={language} hidden={hidden} />
          <HoldingRows
            {...{ value, currency, baseCurrency, language, hidden, onSelect }}
            rows={group.rows}
          />
        </tbody>
      ))}
    </table>
  );
}

function HoldingRows(props: SortedTableProps) {
  return props.rows.map((holding) =>
    typeof holding === 'string' ? (
      <CashHoldingRow
        key={holding}
        currency={holding}
        language={props.language}
        hidden={props.hidden}
      />
    ) : (
      <HoldingRow key={holding.asset} {...props} holding={holding} />
    ),
  );
}

function CashHoldingRow({
  currency,
  language,
  hidden,
}: Pick<TableProps, 'currency' | 'language' | 'hidden'>) {
  const labels = getLabels(language);
  const action = language === 'ru' ? 'Задать остаток' : 'Set balance';
  const balance = language === 'ru' ? 'Остаток' : 'Balance';
  return (
    <tr className="holding-row cash-holding-row" data-currency={currency}>
      <td className="cash-holding-identity">
        <div className="asset-name">
          <AssetSymbol symbol={currency} />
          <strong>{currency}</strong>
        </div>
        <button
          type="button"
          aria-label={`${action} · ${currency}`}
          onClick={() => openOperation('opening', { asset: currency, currency })}
        >
          {action}
        </button>
      </td>
      <td className="holding-quantity">
        <span className="mobile-label">{labels.quantity}</span>
        {hidden ? '••••' : number(0, language)}
      </td>
      <td>
        <span className="mobile-label">
          {balance} · {currency}
        </span>
        {hidden ? '••••' : money(0, currency, language)}
      </td>
      <td>
        <span className="mobile-label">{labels.result}</span>—
      </td>
      <td className="holding-weight">—</td>
    </tr>
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
      <td className={resultTone(performance.profit, hidden)}>
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
