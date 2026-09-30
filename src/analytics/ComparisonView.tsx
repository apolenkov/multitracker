import { useState } from 'react';
import { date } from '../i18n.ts';
import { Answer } from './Answer.tsx';
import { comparisonAssets } from './comparison-data.ts';
import { sampleMoney, sampleNumber } from './format.ts';
import { performanceScenes } from './performance-data.ts';
import { SamplePlot } from './SamplePlot.tsx';
import type { ViewProps } from './types.ts';
import { analyticsWords } from './words.ts';

export function ComparisonView(props: ViewProps) {
  const words = analyticsWords(props.language);
  const [selected, setSelected] = useState<readonly string[]>(['north', 'south', 'atlas']);
  const choose = (id: string) =>
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id].slice(0, 4),
    );
  const assets = comparisonAssets.filter((asset) => selected.includes(asset.id));
  return (
    <>
      <fieldset className="analytics-asset-choices" aria-describedby="analytics-comparison-limit">
        <legend>{words.assets}</legend>
        {comparisonAssets.map((asset) => (
          <label key={asset.id}>
            <input
              type="checkbox"
              checked={selected.includes(asset.id)}
              disabled={!selected.includes(asset.id) && selected.length === 4}
              onChange={() => choose(asset.id)}
            />
            {asset.name[props.language]}
          </label>
        ))}
      </fieldset>
      <p className="quiet" id="analytics-comparison-limit">
        {words.selected}: {selected.length}/4. {words.limit}
      </p>
      {assets.length === 0 ? (
        <p role="status">{words.empty}</p>
      ) : (
        <ComparisonScene {...props} assets={assets} />
      )}
    </>
  );
}

function ComparisonScene(props: ViewProps & Readonly<{ assets: typeof comparisonAssets }>) {
  const points = performanceScenes[props.period].points;
  const words = analyticsWords(props.language);
  const first = props.assets.at(0);
  return (
    <>
      <Answer
        label={first?.name[props.language] ?? words.worth}
        value={sampleMoney(first?.prices[props.period].at(-1) ?? 0, props.currency, props)}
        context={`${words.unitPrice} · ${props.currency} · ${words[props.period]}`}
      />
      <SamplePlot
        {...props}
        series={props.assets.map((asset) => ({
          name: asset.name[props.language],
          values: asset.prices[props.period],
          tone: comparisonAssets.findIndex((item) => item.id === asset.id),
        }))}
        start={date(points.at(0)?.[0] ?? '', props.language)}
        end={date(points.at(-1)?.[0] ?? '', props.language)}
      />
      <details className="analytics-data">
        <summary>{words.data}</summary>
        <ComparisonTable {...props} />
      </details>
    </>
  );
}

function ComparisonTable(props: ViewProps & Readonly<{ assets: typeof comparisonAssets }>) {
  const words = analyticsWords(props.language);
  return (
    <div className="analytics-table-scroll">
      <table>
        <caption>
          {words.comparisonDate} · {words[props.period]} · {props.currency}
        </caption>
        <thead>
          <tr>
            <th scope="col">{words.category}</th>
            <th scope="col">{words.units}</th>
            {performanceScenes[props.period].points.map((point) => (
              <th key={point[0]} scope="col">
                {date(point[0], props.language)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.assets.map((asset) => (
            <tr key={asset.id}>
              <th scope="row">{asset.name[props.language]}</th>
              <td>{sampleNumber(1, props)}</td>
              {asset.prices[props.period].map((value, index) => (
                <td key={index}>{sampleMoney(value, props.currency, props)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
