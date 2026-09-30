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
      <dl className="effects">
        {rows.map((row) => (
          <div key={row.asset}>
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
