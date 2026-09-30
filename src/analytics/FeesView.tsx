import { useState } from 'react';
import { Answer } from './Answer.tsx';
import { feePlatforms } from './metrics-data.ts';
import { sampleMoney } from './format.ts';
import type { ViewProps } from './types.ts';
import { analyticsWords } from './words.ts';

export function FeesView(props: ViewProps) {
  const words = analyticsWords(props.language);
  const [platform, setPlatform] = useState('all');
  return (
    <>
      <label className="analytics-slice">
        {words.platform}
        <select
          data-testid="analytics-fee-platform"
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
        >
          <option value="all">{words.allPlatforms}</option>
          {feePlatforms.map((item) => (
            <option key={item.name.en} value={item.name.en}>
              {item.name[props.language]}
            </option>
          ))}
        </select>
      </label>
      <FeeAnswer {...props} platform={platform} />
      <details className="analytics-data">
        <summary>{words.data}</summary>
        <p className="quiet">{words.unitNote}</p>
        <FeeTable {...props} platform={platform} />
      </details>
    </>
  );
}

function FeeAnswer(props: ViewProps & Readonly<{ platform: string }>) {
  const words = analyticsWords(props.language);
  const platforms = feePlatforms.filter(
    (platform) => props.platform === 'all' || props.platform === platform.name.en,
  );
  const totals = platforms.reduce(
    (values, platform) =>
      values.map((value, index) => value + (platform.fees[props.period].at(index) ?? 0)),
    [0, 0, 0],
  );
  const maximum = Math.max(...totals, 1);
  return (
    <>
      <Answer
        label={words.total}
        value={sampleMoney(
          totals.reduce((sum, value) => sum + value, 0),
          props.currency,
          props,
        )}
        context={`${words[props.period]} · ${props.currency}`}
      />
      <dl className="analytics-distribution">
        {[words.trades, words.custody, words.network].map((name, index) => (
          <div key={name} className={`analytics-series-${index}`}>
            <dt>{name}</dt>
            <dd>{sampleMoney(totals.at(index) ?? 0, props.currency, props)}</dd>
            {!props.hidden && (
              <span className="analytics-bar" aria-hidden="true">
                <span style={{ width: `${((totals.at(index) ?? 0) / maximum) * 100}%` }} />
              </span>
            )}
          </div>
        ))}
      </dl>
    </>
  );
}

function FeeTable(props: ViewProps & Readonly<{ platform: string }>) {
  const words = analyticsWords(props.language);
  const amount = (value: number) => sampleMoney(value, props.currency, props);
  return (
    <div className="analytics-table-scroll">
      <table>
        <caption>
          {words.fees} · {words[props.period]} · {props.currency}
        </caption>
        <thead>
          <tr>
            <th scope="col">{words.platform}</th>
            <th scope="col">{words.trades}</th>
            <th scope="col">{words.custody}</th>
            <th scope="col">{words.network}</th>
            <th scope="col">{words.total}</th>
          </tr>
        </thead>
        <tbody>
          {feePlatforms
            .filter((platform) => props.platform === 'all' || props.platform === platform.name.en)
            .map((platform) => (
              <tr key={platform.name.en}>
                <th scope="row">{platform.name[props.language]}</th>
                {platform.fees[props.period].map((value, index) => (
                  <td key={index}>{amount(value)}</td>
                ))}
                <td>
                  {amount(platform.fees[props.period].reduce((sum, value) => sum + value, 0))}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
