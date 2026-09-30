import { attribution, type Buy, type Currency } from './model/portfolio.ts';
import { money, type Language } from './i18n.ts';
import { insightWords } from './insights/words.ts';

type Props = Readonly<{
  buys: readonly Buy[];
  currency: Currency;
  language: Language;
  hidden: boolean;
}>;

export function Example({ buys, currency, language, hidden }: Props) {
  const words = insightWords(language);
  const effects = attribution(buys, currency);
  const rows = [
    [words.price, effects.price],
    [words.fx, effects.fx],
    [words.interaction, effects.interaction],
    [words.fees, effects.fees],
    [words.total, Object.values(effects).reduce((sum, value) => sum + value, 0)],
  ] as const;
  return (
    <section className="attribution" aria-labelledby="attribution-title">
      <h2 id="attribution-title">{words.reasons}</h2>
      <dl className="effects">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={value >= 0 ? 'positive' : 'negative'}>
              {hidden ? '••••' : money(value, currency, language, true)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="quiet">{words.reasonsNote}</p>
    </section>
  );
}
