import { useRef, useState } from 'react';
import { openOperation } from '../Forms.tsx';
import { money, type Language } from '../i18n.ts';
import { insightWords } from './words.ts';

const instruments = [
  { id: 'MSFT', kind: 'stocks' },
  { id: 'FUND-DEMO', kind: 'funds' },
  { id: 'BOND-DEMO', kind: 'bonds' },
  { id: 'BTC', kind: 'crypto' },
  { id: 'TWT', kind: 'crypto' },
  { id: 'RUB', kind: 'money' },
  { id: 'USD', kind: 'money' },
] as const;

export function CashAndCatalog({
  language,
  hidden,
}: Readonly<{ language: Language; hidden: boolean }>) {
  const words = insightWords(language);
  return (
    <details className="cash-balances">
      <summary>{words.cash}</summary>
      <h3>{words.balance}</h3>
      <dl className="effects">
        {(['RUB', 'USD'] as const).map((currency) => (
          <div key={currency}>
            <dt>{currency}</dt>
            <dd>{hidden ? '••••' : money(0, currency, language)}</dd>
          </div>
        ))}
      </dl>
      <p className="quiet">{words.cashNote}</p>
      <button type="button" onClick={() => openOperation('opening')}>
        {words.opening}
      </button>
      <Catalog language={language} />
    </details>
  );
}

function Catalog({ language }: Readonly<{ language: Language }>) {
  const words = insightWords(language);
  const [search, setSearch] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const rows = instruments.filter((item) =>
    `${item.id} ${words[item.kind]}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <div className="asset-catalog">
      <h3>{words.catalog}</h3>
      <p className="quiet">{words.catalogNote}</p>
      <label>
        {words.catalogSearch}
        <input
          ref={searchInput}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <CatalogRows rows={rows} language={language} />
      {rows.length === 0 && (
        <div>
          <p role="status">{words.noMatch}</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              searchInput.current?.focus();
            }}
          >
            {words.resetSearch}
          </button>
        </div>
      )}
    </div>
  );
}

function CatalogRows({
  rows,
  language,
}: Readonly<{
  rows: readonly (typeof instruments)[number][];
  language: Language;
}>) {
  const words = insightWords(language);
  return (
    <ul>
      {rows.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            aria-label={`${language === 'ru' ? 'Добавить операцию для' : 'Add a transaction for'} ${item.id}`}
            onClick={() =>
              openOperation(item.kind === 'money' ? 'opening' : 'buy', {
                asset: item.id,
                currency: item.id === 'RUB' ? 'RUB' : 'USD',
              })
            }
          >
            <strong>{item.id}</strong>
            <span>{words[item.kind]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
