import { useState } from 'react';
import { Icon } from '../Icon.tsx';
import { assessmentDate } from '../model/portfolio.ts';
import { operationTypes, operationLabel } from '../forms/operations.ts';
import { accountSamples, accountLabel } from '../forms/accounts.ts';
import type { Language } from '../i18n.ts';
import { recordsCopy } from './copy.ts';
import { initialFilters } from './filters.ts';
import type { HistoryFilter } from './filters.ts';
import type { Transaction } from './data.ts';

type Props = Readonly<{
  filter: HistoryFilter;
  onChange: (filter: HistoryFilter) => void;
  records: readonly Transaction[];
  language: Language;
}>;
export function HistoryFilters(props: Props) {
  const copy = recordsCopy(props.language);
  const [opened, setOpened] = useState(false);
  const update = (key: keyof HistoryFilter, value: string) =>
    props.onChange({ ...props.filter, [key]: value });
  const count = Object.entries(props.filter).filter(
    ([key, value]) => key !== 'search' && key !== 'order' && value !== '' && value !== 'all',
  ).length;
  return (
    <div className="history-filter-panel">
      <label className="history-search">
        <span className="visually-hidden">{copy.search}</span>
        <div>
          <Icon name="search" />
          <input
            type="search"
            value={props.filter.search}
            placeholder={copy.searchHint}
            onChange={(event) => update('search', event.target.value)}
          />
        </div>
      </label>
      <details
        className="history-filters"
        open={opened}
        onToggle={(event) => setOpened(event.currentTarget.open)}
      >
        <summary>
          {copy.filter}
          {count > 0 ? ` · ${count}` : ''}
        </summary>
        <div className="filter-grid">
          <TypeFilter {...props} update={update} />
          <AssetFilter {...props} update={update} />
          <AccountFilter {...props} update={update} />
          <DateFilters {...props} update={update} />
          <OrderFilter {...props} update={update} />
        </div>
        <button className="filter-reset" onClick={() => props.onChange(initialFilters)}>
          {copy.reset}
        </button>
      </details>
    </div>
  );
}
type UpdatedProps = Props & Readonly<{ update: (key: keyof HistoryFilter, value: string) => void }>;
function TypeFilter({ filter, language, update }: UpdatedProps) {
  const copy = recordsCopy(language);
  return (
    <label>
      {copy.type}
      <select value={filter.type} onChange={(event) => update('type', event.target.value)}>
        <option value="all">{copy.allTypes}</option>
        {operationTypes.map((type) => (
          <option value={type} key={type}>
            {operationLabel(type, language)}
          </option>
        ))}
      </select>
    </label>
  );
}
function OrderFilter({ filter, language, update }: UpdatedProps) {
  const copy = recordsCopy(language);
  return (
    <label>
      {copy.order}
      <select value={filter.order} onChange={(event) => update('order', event.target.value)}>
        <option value="newest">{copy.newest}</option>
        <option value="oldest">{copy.oldest}</option>
      </select>
    </label>
  );
}
function AssetFilter({
  filter,
  language,
  records,
  update,
}: Props & Readonly<{ update: (key: keyof HistoryFilter, value: string) => void }>) {
  const copy = recordsCopy(language);
  return (
    <label>
      {copy.asset}
      <select value={filter.asset} onChange={(event) => update('asset', event.target.value)}>
        <option value="all">{copy.allAssets}</option>
        {Array.from(new Set(records.map((record) => record.asset)))
          .toSorted()
          .map((asset) => (
            <option key={asset}>{asset}</option>
          ))}
      </select>
    </label>
  );
}
function AccountFilter({
  filter,
  language,
  update,
}: Props & Readonly<{ update: (key: keyof HistoryFilter, value: string) => void }>) {
  const copy = recordsCopy(language);
  return (
    <label>
      {copy.account}
      <select value={filter.account} onChange={(event) => update('account', event.target.value)}>
        <option value="all">{language === 'ru' ? 'Все счета' : 'All accounts'}</option>
        {accountSamples.map((account) => (
          <option key={account.id} value={account.id}>
            {accountLabel(account.id, language)}
          </option>
        ))}
      </select>
    </label>
  );
}
function DateFilters({
  filter,
  language,
  update,
}: Props & Readonly<{ update: (key: keyof HistoryFilter, value: string) => void }>) {
  const copy = recordsCopy(language);
  const invalid = filter.from !== '' && filter.to !== '' && filter.from > filter.to;
  return (
    <>
      <label>
        {copy.from}
        <input
          type="date"
          min="2000-01-01"
          max={assessmentDate}
          value={filter.from}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'history-date-error' : undefined}
          onChange={(event) => update('from', event.target.value)}
        />
      </label>
      <label>
        {copy.to}
        <input
          type="date"
          min="2000-01-01"
          max={assessmentDate}
          value={filter.to}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'history-date-error' : undefined}
          onChange={(event) => update('to', event.target.value)}
        />
      </label>
      {invalid && (
        <p id="history-date-error" role="alert" className="field-error">
          {copy.dateError}
        </p>
      )}
    </>
  );
}
