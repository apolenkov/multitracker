import { useState } from 'react';
import { Answer } from './Answer.tsx';
import { riskScenes } from './metrics-data.ts';
import { sampleNumber } from './format.ts';
import type { ViewProps } from './types.ts';
import { analyticsWords } from './words.ts';

export function RiskView(props: ViewProps) {
  const words = analyticsWords(props.language);
  const scene = riskScenes[props.period];
  const [company, setCompany] = useState('north');
  return (
    <>
      <label className="analytics-slice">
        {words.peAsset}
        <select
          data-testid="analytics-pe-asset"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        >
          <option value="north">{words.companyNorth}</option>
          <option value="south">{words.companySouth}</option>
          <option value="beacon">{words.crypto}</option>
        </select>
      </label>
      <Answer
        label={words.beta}
        value={sampleNumber(scene.beta, props)}
        context={words[props.period]}
      />
      <RiskBars {...props} />
      <dl className="analytics-metrics">
        <div>
          <dt>{words.pe}</dt>
          <dd>{company === 'north' ? sampleNumber(scene.pe, props) : words.notApplicable}</dd>
        </div>
      </dl>
      {company !== 'north' && <p className="quiet">{words.peUnavailable}</p>}
      <details className="analytics-data">
        <summary>
          {words.metric} · {words[props.period]}
        </summary>
        <p className="quiet">{words.riskBasis}</p>
      </details>
    </>
  );
}

function RiskBars(props: ViewProps) {
  const words = analyticsWords(props.language);
  const rows = [
    { name: words.portfolio, value: riskScenes[props.period].beta },
    { name: words.benchmark, value: 1 },
  ];
  return (
    <dl className="analytics-distribution">
      {rows.map((row, index) => (
        <div key={row.name} className={`analytics-series-${index}`}>
          <dt>{row.name}</dt>
          <dd>{sampleNumber(row.value, props)}</dd>
          {!props.hidden && (
            <span className="analytics-bar" aria-hidden="true">
              <span style={{ width: `${(row.value / 1.5) * 100}%` }} />
            </span>
          )}
        </div>
      ))}
    </dl>
  );
}
