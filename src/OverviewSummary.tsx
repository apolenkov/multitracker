import { assessmentDate, summarize } from './model/portfolio.ts';
import { getLabels, date, money, percentage } from './i18n.ts';
import type { Currency } from './model/portfolio.ts';
import type { Language } from './i18n.ts';
import { MoneyAmount } from './MoneyAmount.tsx';

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
      <p id="summary-title" className="summary-label">
        {labels.total}
      </p>
      <p className="main-amount">
        <MoneyAmount value={result.value} currency={currency} language={language} hidden={hidden} />
      </p>
      <p className="valuation">{date(assessmentDate, language)}</p>
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
  return (
    <section className="summary-result" aria-label={`${labels.result} ${currency}`}>
      <dl>
        <dt>
          {language === 'ru' ? 'Результат за всё время' : 'All-time result'} · {currency}
        </dt>
        <dd
          className={
            hidden ? 'result-pill' : `result-pill ${result.profit >= 0 ? 'positive' : 'negative'}`
          }
        >
          {!hidden && <span aria-hidden="true">{result.profit >= 0 ? '▲' : '▼'}</span>}
          {hidden ? '••••' : money(result.profit, currency, language, true)}
          <small>
            {hidden || result.percentage === null ? '—' : percentage(result.percentage, language)}
          </small>
        </dd>
      </dl>
      <button className="primary" onClick={onBuy}>
        {labels.add}
      </button>
    </section>
  );
}

export function OverviewAcquisition({ result, currency, language, hidden }: Props) {
  const labels = getLabels(language);
  return (
    <div className="basis-details">
      <h3>
        {labels.basis} · {currency}
      </h3>
      <p>{hidden ? '••••' : money(result.basis, currency, language)}</p>
      <p className="quiet">
        {language === 'ru'
          ? 'Процент результата рассчитан от этой суммы, включая комиссии.'
          : 'The result percentage uses this amount, including fees, as its basis.'}
      </p>
    </div>
  );
}
