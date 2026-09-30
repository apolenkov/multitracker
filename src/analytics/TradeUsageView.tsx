import { date } from '../i18n.ts';
import { Answer } from './Answer.tsx';
import { sampleNumber } from './format.ts';
import { periodTrades, tradePlatforms } from './trade-data.ts';
import type { ViewProps } from './types.ts';
import { analyticsWords } from './words.ts';

export function TradeUsageView(props: ViewProps) {
  const words = analyticsWords(props.language);
  const trades = periodTrades(props.period);
  return (
    <>
      <Answer
        label={words.trades}
        value={sampleNumber(trades.length, props)}
        context={words[props.period]}
      />
      <dl className="analytics-distribution">
        {tradePlatforms.map((platform, index) => (
          <div key={platform} className={`analytics-series-${index}`}>
            <dt>{platform}</dt>
            <dd>
              {sampleNumber(trades.filter((trade) => trade.platform === platform).length, props)}
            </dd>
            {!props.hidden && (
              <span className="analytics-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${(trades.filter((trade) => trade.platform === platform).length / trades.length) * 100}%`,
                  }}
                />
              </span>
            )}
          </div>
        ))}
      </dl>
      <details className="analytics-data">
        <summary>{words.data}</summary>
        <TradeCounts {...props} />
      </details>
      <TradeDetails {...props} />
    </>
  );
}

function TradeCounts(props: ViewProps) {
  const words = analyticsWords(props.language);
  const trades = periodTrades(props.period);
  return (
    <>
      <p className="quiet">{words.tradeNote}</p>
      <table>
        <caption>
          {words.exchange} · {words[props.period]}
        </caption>
        <thead>
          <tr>
            <th scope="col">{words.platform}</th>
            <th scope="col">{words.purchases}</th>
            <th scope="col">{words.sales}</th>
          </tr>
        </thead>
        <tbody>
          {tradePlatforms.map((platform) => (
            <tr key={platform}>
              <th scope="row">{platform}</th>
              <td>
                {sampleNumber(
                  trades.filter((trade) => trade.platform === platform && trade.kind === 'buy')
                    .length,
                  props,
                )}
              </td>
              <td>
                {sampleNumber(
                  trades.filter((trade) => trade.platform === platform && trade.kind === 'sell')
                    .length,
                  props,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function TradeDetails(props: ViewProps) {
  const words = analyticsWords(props.language);
  return (
    <details className="analytics-data">
      <summary>{words.includedTrades}</summary>
      <div className="analytics-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{words.day}</th>
              <th scope="col">{words.platform}</th>
              <th scope="col">{words.category}</th>
              <th scope="col">{words.trades}</th>
              <th scope="col">{words.units}</th>
            </tr>
          </thead>
          <tbody>
            {periodTrades(props.period).map((trade) => (
              <tr key={trade.day}>
                <th scope="row">{date(trade.day, props.language)}</th>
                <td>{trade.platform}</td>
                <td>{trade.asset}</td>
                <td>{trade.kind === 'buy' ? words.purchases : words.sales}</td>
                <td>{sampleNumber(trade.units, props)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
