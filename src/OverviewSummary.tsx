import { assessmentDate, summarize } from './model/portfolio.ts';
import { getLabels, date, money, percentage } from './i18n.ts';
import type { Currency } from './model/portfolio.ts';
import type { Language } from './i18n.ts';

type Summary = ReturnType<typeof summarize>;

type Props = Readonly<{
  result: Summary;
  currency: Currency;
  language: Language;
  hidden: boolean;
  onBuy: () => void;
}>;

export function OverviewSummary({ result, currency, language, hidden, onBuy }: Props) {
  const labels = getLabels(language);
  const amount = (value: number, signed = false) =>
    hidden ? '••••' : money(value, currency, language, signed);
  const isProfit = result.profit >= 0;

  return (
    <section className="summary" aria-labelledby="summary-title">
      <div className="section-top">
        <p className="eyebrow" id="summary-title">
          {labels.total}
        </p>
        <span className="valuation">
          {labels.asOf} {date(assessmentDate, language)}
        </span>
      </div>
      <p className="main-amount">{amount(result.value)}</p>
      <div className="summary-bottom">
        <dl>
          <div>
            <dt>{labels.basis}</dt>
            <dd>{amount(result.basis)}</dd>
          </div>
          <div>
            <dt>
              {labels.result} · {isProfit ? labels.profit : labels.loss}
            </dt>
            <dd className={isProfit ? 'positive' : 'negative'}>
              {amount(result.profit, true)}{' '}
              <small>
                {hidden || result.percentage === null
                  ? '—'
                  : percentage(result.percentage, language)}
              </small>
            </dd>
          </div>
        </dl>
        <button className="primary" onClick={onBuy}>
          + {labels.add}
        </button>
      </div>
      <p className="quiet">{labels.fixed}</p>
    </section>
  );
}
