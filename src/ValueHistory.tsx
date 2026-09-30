import { useState } from 'react';
import { date, getLabels, money, type Language } from './i18n.ts';
import type { Currency } from './model/portfolio.ts';
import './charts.css';

const periods = [
  {
    id: 'month',
    ru: '1М',
    en: '1M',
    points: [
      ['2026-09-01', 0.91, 0.92],
      ['2026-09-10', 0.96, 0.92],
      ['2026-09-20', 0.93, 1],
      ['2026-09-30', 1, 1],
    ],
  },
  {
    id: 'quarter',
    ru: '3М',
    en: '3M',
    points: [
      ['2026-07-01', 0.82, 0.8],
      ['2026-08-01', 0.88, 0.92],
      ['2026-09-01', 0.91, 0.92],
      ['2026-09-30', 1, 1],
    ],
  },
  {
    id: 'year',
    ru: '1Г',
    en: '1Y',
    points: [
      ['2025-09-30', 0.48, 0.5],
      ['2026-01-30', 0.65, 0.7],
      ['2026-05-30', 0.6, 0.8],
      ['2026-09-30', 1, 1],
    ],
  },
  {
    id: 'all',
    ru: 'Всё',
    en: 'All',
    points: [
      ['2025-01-01', 0.3, 0.35],
      ['2025-09-30', 0.48, 0.5],
      ['2026-05-30', 0.6, 0.8],
      ['2026-09-30', 1, 1],
    ],
  },
] as const;

type Period = (typeof periods)[number];
type Props = Readonly<{
  basis: number;
  value: number;
  currency: Currency;
  language: Language;
  hidden: boolean;
}>;

export function ValueHistory(props: Props) {
  const labels = getLabels(props.language);
  const [period, setPeriod] = useState<Period>(periods[0]);
  return (
    <section className="value-history" aria-labelledby="value-history-title">
      <div className="section-top">
        <h2 id="value-history-title">
          {labels.chartTitle} <span className="unit">{props.currency}</span>
        </h2>
        <div className="period-controls" role="group" aria-label={labels.chartPeriod}>
          {periods.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={item.id === period.id}
              onClick={() => setPeriod(item)}
            >
              {props.language === 'ru' ? item.ru : item.en}
            </button>
          ))}
        </div>
      </div>
      <p className="quiet">{labels.chartSampleNote}</p>
      <HistoryPlot {...props} period={period} />
      <HistorySummary {...props} period={period} />
      <HistoryDates {...props} period={period} />
    </section>
  );
}

function HistoryPlot({ basis, value, language, hidden, period }: Props & { period: Period }) {
  const labels = getLabels(language);
  const max = Math.max(basis, value, 1);
  const firstDate = Date.parse(period.points[0][0]);
  const duration = Date.parse('2026-09-30') - firstDate;
  const coordinates = (series: 'value' | 'basis') =>
    period.points
      .map(([day, valueFactor, basisFactor]) => {
        const amount = series === 'value' ? value * valueFactor : basis * basisFactor;
        const x = 20 + ((Date.parse(day) - firstDate) / duration) * 560;
        return `${x},${170 - (amount / max) * 150}`;
      })
      .join(' ');
  return (
    <>
      {hidden ? (
        <p className="history-plot-hidden">{labels.hidden}</p>
      ) : (
        <svg
          className="history-plot"
          viewBox="0 0 600 190"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[20, 70, 120, 170].map((y) => (
            <line key={y} x1="20" x2="580" y1={y} y2={y} className="history-grid" />
          ))}
          <polyline points={coordinates('basis')} className="history-basis" />
          <polyline points={coordinates('value')} className="history-value" />
        </svg>
      )}
      <div className="history-axis" aria-hidden="true">
        <span>{date(period.points[0][0], language)}</span>
        <span>{date('2026-09-30', language)}</span>
      </div>
    </>
  );
}

function HistorySummary({
  basis,
  value,
  currency,
  language,
  hidden,
  period,
}: Props & {
  period: Period;
}) {
  const labels = getLabels(language);
  const [, firstValue, firstBasis] = period.points[0];
  const amount = (sum: number, signed = false) =>
    hidden ? '••••' : money(sum, currency, language, signed);
  return (
    <>
      <dl className="chart-key">
        <div>
          <dt>
            <span className="key-line" />
            {labels.total}
          </dt>
          <dd>{amount(value)}</dd>
        </div>
        <div>
          <dt>
            <span className="key-line dashed" />
            {labels.chartContributions}
          </dt>
          <dd>{amount(basis)}</dd>
        </div>
      </dl>
      <p className="quiet" aria-live="polite">
        {labels.chartChange}: {amount(value * (1 - firstValue), true)}. {labels.chartAdded}:{' '}
        {amount(basis * (1 - firstBasis))}.
      </p>
    </>
  );
}

function HistoryDates({
  basis,
  value,
  currency,
  language,
  hidden,
  period,
}: Props & {
  period: Period;
}) {
  const labels = getLabels(language);
  const amount = (sum: number) => (hidden ? '••••' : money(sum, currency, language));
  return (
    <details className="history-dates">
      <summary>{labels.chartDates}</summary>
      <div className="history-date-scroll">
        <table>
          <caption className="visually-hidden">{labels.chartTitle}</caption>
          <thead>
            <tr>
              <th scope="col">{labels.chartDate}</th>
              <th scope="col">{labels.total}</th>
              <th scope="col">{labels.chartContributions}</th>
            </tr>
          </thead>
          <tbody>
            {period.points.map(([day, valueFactor, basisFactor]) => (
              <tr key={day}>
                <th scope="row">{date(day, language)}</th>
                <td>{amount(value * valueFactor)}</td>
                <td>{amount(basis * basisFactor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
