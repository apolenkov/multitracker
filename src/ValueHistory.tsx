import { useState, type ReactNode } from 'react';
import { date, getLabels, money, type Language } from './i18n.ts';
import type { Currency } from './model/portfolio.ts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import './charts.css';

const periods = [
  {
    id: 'month',
    ru: '1М',
    en: '1M',
    ruName: 'Один месяц',
    enName: 'One month',
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
    ruName: 'Три месяца',
    enName: 'Three months',
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
    ruName: 'Один год',
    enName: 'One year',
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
    ruName: 'Вся история',
    enName: 'Full history',
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
  children?: ReactNode;
}>;

export function ValueHistory(props: Props) {
  const [period, setPeriod] = useState<Period>(periods[0]);
  return (
    <section className="value-history" aria-labelledby="value-history-title">
      <div className="chart-heading">
        <h2 id="value-history-title">
          {props.language === 'ru' ? 'История стоимости' : 'Value history'}{' '}
          <span className="unit">{props.currency}</span>
        </h2>
        <PeriodControls period={period} language={props.language} onSelect={setPeriod} />
      </div>
      <HistoryPlot {...props} period={period} />
      <div className="history-axis" aria-hidden="true">
        <span>{date(period.points[0][0], props.language)}</span>
        <span>{date('2026-09-30', props.language)}</span>
      </div>
      <HistoryData {...props} period={period} />
    </section>
  );
}

function HistoryPlot({ value, currency, language, hidden, period }: Props & { period: Period }) {
  const labels = getLabels(language);
  if (hidden) return <p className="history-plot-hidden">{labels.hidden}</p>;
  const amounts = period.points.map(([, factor]) => value * factor);
  const minimum = Math.min(...amounts);
  const maximum = Math.max(...amounts);
  const range = Math.max(maximum - minimum, 1);
  const firstDate = Date.parse(period.points[0][0]);
  const duration = Date.parse('2026-09-30') - firstDate;
  const coordinates = () =>
    period.points
      .map(([day, valueFactor]) => {
        const amount = value * valueFactor;
        const x = 20 + ((Date.parse(day) - firstDate) / duration) * 560;
        return `${x},${170 - ((amount - minimum) / range) * 150}`;
      })
      .join(' ');
  return (
    <HistorySvg
      value={coordinates()}
      endpointY={170 - ((value - minimum) / range) * 150}
      label={money(value, currency, language)}
    />
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
          <dt>{labels.chartContributions}</dt>
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
    <div className="history-dates">
      <div
        className="history-date-scroll"
        tabIndex={0}
        role="region"
        aria-label={labels.chartDates}
      >
        <table>
          <caption>
            {language === 'ru' ? period.ruName : period.enName} · {currency}
          </caption>
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
    </div>
  );
}

function PeriodControls({
  period,
  language,
  onSelect,
}: Readonly<{
  period: Period;
  language: Language;
  onSelect: (period: Period) => void;
}>) {
  return (
    <Tabs
      value={period.id}
      onValueChange={(id) => onSelect(periods.find((item) => item.id === id) ?? period)}
    >
      <TabsList className="period-controls" aria-label={getLabels(language).chartPeriod}>
        {periods.map((item) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            aria-label={`${language === 'ru' ? item.ru : item.en}: ${language === 'ru' ? item.ruName : item.enName}`}
          >
            {language === 'ru' ? item.ru : item.en}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function HistoryData(props: Props & Readonly<{ period: Period }>) {
  const { currency, language, hidden, period, value } = props;
  const labels = getLabels(language);
  const values = period.points.map(([, factor]) => value * factor);
  return (
    <details className="chart-disclosure">
      <summary>{language === 'ru' ? 'Данные и расчёт' : 'Data and calculation'}</summary>
      {props.children}
      <p className="quiet">
        {labels.chartSampleNote} {labels.fixed}
      </p>
      <p className="chart-range">
        {language === 'ru' ? 'Диапазон' : 'Range'}:{' '}
        {hidden
          ? '••••'
          : `${money(Math.min(...values), currency, language)} – ${money(Math.max(...values), currency, language)}`}
      </p>
      <HistorySummary {...props} />
      <HistoryDates {...props} />
    </details>
  );
}

function HistorySvg({
  value,
  endpointY,
  label,
}: Readonly<{ value: string; endpointY: number; label: string }>) {
  return (
    <div className="history-chart">
      <span
        className="history-endpoint-label"
        style={{ top: `${(endpointY / 190) * 100}%` }}
        aria-hidden="true"
      >
        {label}
      </span>
      <svg
        className="history-plot"
        viewBox="0 0 600 190"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="portfolio-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--chart)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 70, 120, 170].map((y) => (
          <line key={y} x1="20" x2="580" y1={y} y2={y} className="history-grid" />
        ))}
        <polygon points={`${value} 580,180 20,180`} className="history-area" />
        <polyline points={value} className="history-value" pathLength="1" />
        <circle cx="580" cy={endpointY} r="4" className="history-endpoint" />
      </svg>
    </div>
  );
}
