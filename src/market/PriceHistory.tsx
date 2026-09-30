import { useState } from 'react';
import { date, type Language } from '../i18n.ts';
import type { Currency } from '../model/portfolio.ts';
import { assetPrice, type MarketAsset } from './data.ts';
import { historySample, plotPoints, type HistoryPeriod } from './history-data.ts';
import { marketWords } from './words.ts';

type Props = Readonly<{
  asset: MarketAsset;
  language: Language;
  currency: Currency;
  hidden: boolean;
}>;
export function PriceHistory(props: Props) {
  const [period, setPeriod] = useState<HistoryPeriod>('day');
  const words = marketWords(props.language);
  const sample = historySample(props.asset.symbol, period);
  if (!sample) return null;
  return (
    <section className="market-history">
      <h3>{words.history}</h3>
      <label htmlFor="market-period">{words.period}</label>
      <select
        id="market-period"
        value={period}
        onChange={(event) =>
          setPeriod(
            event.target.value === 'month'
              ? 'month'
              : event.target.value === 'year'
                ? 'year'
                : 'day',
          )
        }
      >
        <option value="day">{words.day}</option>
        <option value="month">{words.month}</option>
        <option value="year">{words.year}</option>
      </select>
      <HistoryRange {...props} values={sample.values} />
      {!props.hidden && (
        <svg viewBox="0 0 300 140" aria-hidden="true">
          <polyline points={plotPoints(sample.values)} />
        </svg>
      )}
      <details className="market-chart-data">
        <summary>{words.chartData}</summary>
        <HistoryTable {...props} period={period} sample={sample} />
      </details>
    </section>
  );
}

function HistoryRange(props: Props & Readonly<{ values: readonly number[] }>) {
  const words = marketWords(props.language);
  return (
    <p className="quiet">
      {words.sampleRange}:{' '}
      {assetPrice(
        props.asset,
        Math.min(...props.values),
        props.currency,
        props.language,
        props.hidden,
      )}{' '}
      —{' '}
      {assetPrice(
        props.asset,
        Math.max(...props.values),
        props.currency,
        props.language,
        props.hidden,
      )}
    </p>
  );
}

function HistoryTable(
  props: Props &
    Readonly<{ period: HistoryPeriod; sample: NonNullable<ReturnType<typeof historySample>> }>,
) {
  const words = marketWords(props.language);
  return (
    <div className="table-scroll">
      <table>
        <caption>
          {words.history} · {props.asset.kind === 'index' ? words.points : props.currency}
        </caption>
        <thead>
          <tr>
            <th scope="col">{words.date}</th>
            <th scope="col">{words.price}</th>
          </tr>
        </thead>
        <tbody>
          {props.sample.values.map((value, index) => (
            <tr key={props.sample.dates.at(index)}>
              <td>
                {props.period === 'day'
                  ? props.sample.dates.at(index)
                  : date(props.sample.dates.at(index) ?? '2026-09-30', props.language)}
              </td>
              <td>
                {assetPrice(props.asset, value, props.currency, props.language, props.hidden)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
