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
      <h2 id="composition-title">{words.composition}</h2>
      <AllocationRing rows={rows} total={total} language={language} hidden={hidden} />
      <dl className="allocation-legend">
        {rows.map((row) => (
          <div key={row.asset} className={`allocation-${row.asset.toLowerCase()}`}>
            <dt>{row.asset}</dt>
            <dd>
              {hidden
                ? '••••'
                : `${percentage((row.value / total) * 100, language)} · ${money(row.value, currency, language)}`}
            </dd>
          </div>
        ))}
      </dl>
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
      return `var(--allocation-${row.asset.toLowerCase()}) ${start}% ${start + (row.value / total) * 100}%`;
    })
    .join(', ');
  const background = hidden || total === 0 ? 'var(--line)' : `conic-gradient(${gradient})`;
  return (
    <div className="allocation-ring" style={{ background }} aria-hidden="true">
      <div>
        <strong>{hidden ? '••••' : rows.length}</strong>
        <span>{language === 'ru' ? 'актива' : 'assets'}</span>
      </div>
    </div>
  );
}
