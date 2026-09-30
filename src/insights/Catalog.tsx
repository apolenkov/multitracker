import { useState } from 'react';
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
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
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
              {item.id} · {words[item.kind]} +
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p role="status">{words.noMatch}</p>}
    </div>
  );
}
