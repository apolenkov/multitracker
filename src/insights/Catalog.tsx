import { useRef, useState } from 'react';
import { openOperation } from '../Forms.tsx';
import { type Language } from '../i18n.ts';
import { insightWords } from './words.ts';

const instruments = [
  { id: 'MSFT', kind: 'stocks' },
  { id: 'FUND-DEMO', kind: 'funds' },
  { id: 'BOND-DEMO', kind: 'bonds' },
  { id: 'BTC', kind: 'crypto' },
  { id: 'TWT', kind: 'crypto' },
] as const;

export function Catalog({ language }: Readonly<{ language: Language }>) {
  const words = insightWords(language);
  const [search, setSearch] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const rows = instruments.filter((item) =>
    `${item.id} ${words[item.kind]}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <section className="asset-catalog" aria-labelledby="asset-catalog-title">
      <h2 id="asset-catalog-title">{words.catalog}</h2>
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
    </section>
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
            aria-label={`${language === 'ru' ? 'Купить' : 'Buy'} ${item.id}`}
            onClick={() =>
              openOperation('buy', {
                asset: item.id,
                currency: 'USD',
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
