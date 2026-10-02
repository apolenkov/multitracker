import { money, percentage, type Language } from '../i18n.ts';
import { assets, totals, type Buy, type Currency } from '../model/portfolio.ts';
import { insightWords } from './words.ts';

type Props = Readonly<{
  buys: readonly Buy[];
  currency: Currency;
  language: Language;
  hidden: boolean;
}>;

export function Composition({ buys, currency, language, hidden }: Props) {
  const words = insightWords(language);
  const total = totals(buys, currency).value;
  const rows = assets
    .map((asset) => ({
      asset,
      value: totals(
        buys.filter((buy) => buy.asset === asset),
        currency,
      ).value,
    }))
    .filter((row) => row.value > 0);
  return (
    <section className="allocation-list" aria-labelledby="composition-title">
      <h2 id="composition-title">
        {words.composition} <span className="count">{rows.length}</span>
      </h2>
      <div className="allocation-content">
        <AllocationRing rows={rows} total={total} language={language} hidden={hidden} />
        <div className="allocation-details">
          <dl className="allocation-legend">
            {rows.map((row) => (
              <div key={row.asset} className={`allocation-${row.asset.toLowerCase()}`}>
                <dt>{row.asset}</dt>
                <dd>
                  <span className="allocation-share">
                    {hidden ? '••••' : percentage((row.value / total) * 100, language)}
                  </span>
                  <span>{hidden ? '••••' : money(row.value, currency, language)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {rows.length === 0 && (
        <p>{language === 'ru' ? 'Нет активов в выборке' : 'No assets in selection'}</p>
      )}
    </section>
  );
}

function AllocationRing({
  rows,
  total,
  language,
  hidden,
}: Readonly<{
  rows: readonly Readonly<{ asset: string; value: number }>[];
  total: number;
  language: Language;
  hidden: boolean;
}>) {
  const gradient = rows
    .map((row, index) => {
      const start = (rows.slice(0, index).reduce((sum, item) => sum + item.value, 0) / total) * 100;
      return `var(--paper) ${start}% ${start + 0.5}%, var(--allocation-${row.asset.toLowerCase()}) ${start + 0.5}% ${start + (row.value / total) * 100}%`;
    })
    .join(', ');
  const background = hidden || total === 0 ? 'var(--line)' : `conic-gradient(${gradient})`;
  const largest = rows.toSorted((left, right) => right.value - left.value).at(0);
  return (
    <div className="allocation-ring" style={{ background }} aria-hidden="true">
      <div>
        <strong>{hidden ? '••••' : (largest?.asset ?? '—')}</strong>
        <span>
          {hidden
            ? '••••'
            : largest
              ? percentage((largest.value / total) * 100, language)
              : language === 'ru'
                ? 'нет позиций'
                : 'no holdings'}
        </span>
      </div>
    </div>
  );
}
