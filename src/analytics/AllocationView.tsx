import { useState } from 'react';
import { Answer } from './Answer.tsx';
import { allocationRows, locationAssets, slices, type Slice } from './allocation-data.ts';
import { samplePercent } from './format.ts';
import { TradeUsageView } from './TradeUsageView.tsx';
import type { ViewProps } from './types.ts';
import { analyticsLabel, analyticsWords } from './words.ts';

export function AllocationView(props: ViewProps) {
  const words = analyticsWords(props.language);
  const [slice, setSlice] = useState<Slice>('class');
  const [byAsset, setByAsset] = useState(false);
  return (
    <>
      <label className="analytics-slice">
        {words.slice}
        <select
          data-testid="analytics-allocation"
          value={slice}
          onChange={(event) =>
            setSlice(slices.find((item) => item === event.target.value) ?? 'class')
          }
        >
          {slices.map((item) => (
            <option key={item} value={item}>
              {analyticsLabel(props.language, item)}
            </option>
          ))}
        </select>
      </label>
      {slice === 'location' && (
        <label className="analytics-slice">
          {words.custodyView}
          <select
            data-testid="analytics-custody"
            value={byAsset ? 'asset' : 'source'}
            onChange={(event) => setByAsset(event.target.value === 'asset')}
          >
            <option value="source">{words.bySource}</option>
            <option value="asset">{words.byAsset}</option>
          </select>
        </label>
      )}
      <AllocationScene {...props} slice={slice} byAsset={byAsset} />
      {slice === 'location' && (
        <a className="analytics-account-link" href="#portfolios">
          {words.accounts}
        </a>
      )}
    </>
  );
}

function AllocationScene(props: ViewProps & Readonly<{ slice: Slice; byAsset: boolean }>) {
  const words = analyticsWords(props.language);
  if (props.slice === 'size') return <p className="quiet">{words.sizeUnavailable}</p>;
  if (props.slice === 'exchange') return <TradeUsageView {...props} />;
  const rows =
    props.slice === 'location' && props.byAsset
      ? locationAssets
      : (new Map(Object.entries(allocationRows)).get(props.slice) ?? []);
  const largest = rows.toSorted((a, b) => b.weights[props.period] - a.weights[props.period]).at(0);
  return (
    <>
      <Answer
        label={largest?.name[props.language] ?? words.share}
        value={samplePercent(largest?.weights[props.period] ?? 0, props)}
        context={`${words.snapshot} · ${words[props.period]}`}
      />
      <AllocationBars {...props} rows={rows} />
      <details className="analytics-data">
        <summary>{words.data}</summary>
        <table className="analytics-allocation-table">
          <caption className="visually-hidden">
            {analyticsLabel(props.language, props.slice)}
          </caption>
          <thead>
            <tr>
              <th scope="col">{words.category}</th>
              <th scope="col">{words.share}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name.en}>
                <th scope="row">{row.name[props.language]}</th>
                <td>
                  <span>{samplePercent(row.weights[props.period], props)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

function AllocationBars(props: ViewProps & Readonly<{ rows: typeof locationAssets }>) {
  return (
    <dl className="analytics-distribution">
      {props.rows.map((row, index) => (
        <div key={row.name.en} className={`analytics-series-${index}`}>
          <dt>{row.name[props.language]}</dt>
          <dd>{samplePercent(row.weights[props.period], props)}</dd>
          {!props.hidden && (
            <span className="analytics-bar" aria-hidden="true">
              <span style={{ width: `${row.weights[props.period]}%` }} />
            </span>
          )}
        </div>
      ))}
    </dl>
  );
}
