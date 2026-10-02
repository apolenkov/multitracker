import { attribution, type Buy, type Currency } from './model/portfolio.ts';
import { money, resultTone, type Language } from './i18n.ts';
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
    <details className="attribution">
      <summary>
        {words.reasons} · {currency}
      </summary>
      <dl className="effects">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={resultTone(value, hidden)}>
              {hidden ? '••••' : money(value, currency, language, true)}
            </dd>
          </div>
        ))}
      </dl>
      <details className="calculation-note">
        <summary>
          {language === 'ru' ? 'Как считается результат' : 'How the result is calculated'}
        </summary>
        <p className="quiet">{words.reasonsNote}</p>
      </details>
    </details>
  );
}
