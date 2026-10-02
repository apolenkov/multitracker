import { locale, type Language } from './i18n.ts';
import type { Currency } from './model/portfolio.ts';
import './money-amount.css';

type Props = Readonly<{
  value: number;
  currency: Currency;
  language: Language;
  hidden: boolean;
  signed?: boolean;
  currencySuffix?: boolean;
}>;

export function MoneyAmount({
  value,
  currency,
  language,
  hidden,
  signed = false,
  currencySuffix = false,
}: Props) {
  if (hidden) return <span className="money-amount">••••</span>;
  const parts = new Intl.NumberFormat(locale(language), {
    style: currencySuffix ? 'decimal' : 'currency',
    currency,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).formatToParts(value);
  const suffix = currencySuffix ? ` ${currency}` : '';
  const fullAmount = parts.map((part) => part.value).join('') + suffix;
  return (
    <span className="money-amount">
      <span className="visually-hidden">{fullAmount}</span>
      <span aria-hidden="true">
        {parts.map((part, index) => (
          <span
            key={`${part.type}-${index}`}
            className={['decimal', 'fraction', 'currency'].includes(part.type) ? 'money-minor' : ''}
          >
            {part.value}
          </span>
        ))}
        {suffix && <span className="money-minor">{suffix}</span>}
      </span>
    </span>
  );
}
