import { assessmentDate, summarize } from './model/portfolio.ts';
import { getLabels, date, money, percentage } from './i18n.ts';
import type { Currency } from './model/portfolio.ts';
import type { Language } from './i18n.ts';

type Props = Readonly<{
  result: ReturnType<typeof summarize>;
  currency: Currency;
  language: Language;
  hidden: boolean;
}>;

export function OverviewSummary({ result, currency, language, hidden }: Props) {
  const labels = getLabels(language);
  return (
    <section className="summary" aria-labelledby="summary-title">
      <div className="section-top">
        <p id="summary-title">{labels.total}</p>
        <span className="valuation">{date(assessmentDate, language)}</span>
      </div>
      <p className="main-amount">{hidden ? '••••' : money(result.value, currency, language)}</p>
    </section>
  );
}

export function OverviewResult({
  result,
  currency,
  language,
  hidden,
  onBuy,
}: Props & Readonly<{ onBuy: () => void }>) {
  const labels = getLabels(language);
  const amount = (value: number, signed = false) =>
    hidden ? '••••' : money(value, currency, language, signed);
  return (
    <section className="summary-result" aria-label={`${labels.result} ${currency}`}>
      <dl>
        <div>
          <dt>
            {labels.basis} · {currency}
          </dt>
          <dd>{amount(result.basis)}</dd>
        </div>
        <div>
          <dt>
            {language === 'ru' ? 'Результат за всё время' : 'All-time result'} · {currency}
          </dt>
          <dd className={result.profit >= 0 ? 'positive' : 'negative'}>
            {amount(result.profit, true)}
            <small>
              {hidden || result.percentage === null ? '—' : percentage(result.percentage, language)}
            </small>
          </dd>
        </div>
      </dl>
      <button className="primary" onClick={onBuy}>
        + {labels.add}
      </button>
    </section>
  );
}
