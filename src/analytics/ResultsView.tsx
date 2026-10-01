import { resultTone } from '../i18n.ts';
import { sampleMoney } from './format.ts';
import { Answer } from './Answer.tsx';
import type { ViewProps } from './types.ts';
import { analyticsWords } from './words.ts';

const rows = [
  { name: 'North', month: [1000, 120, 100], quarter: [2000, 250, 180], year: [3000, 400, 280] },
  { name: 'South', month: [500, -30, -20], quarter: [800, -80, -50], year: [1000, -150, -80] },
] as const;

export function ResultsView(props: ViewProps) {
  const words = analyticsWords(props.language);
  const total = rows.reduce((sum, row) => sum + row[props.period][1] + row[props.period][2], 0);
  return (
    <>
      <Answer
        label={words.result}
        value={sampleMoney(total, props.baseCurrency, props)}
        context={`${words[props.period]} · ${props.baseCurrency}`}
      />
      <dl className="analytics-distribution">
        {rows.map((row) => (
          <div
            key={row.name}
            className={resultTone(row[props.period][1] + row[props.period][2], props.hidden)}
          >
            <dt>{row.name}</dt>
            <dd>
              {sampleMoney(row[props.period][1] + row[props.period][2], props.baseCurrency, props)}
            </dd>
            {!props.hidden && (
              <span className="analytics-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${(Math.abs(row[props.period][1] + row[props.period][2]) / 800) * 100}%`,
                  }}
                />
              </span>
            )}
          </div>
        ))}
      </dl>
      <details className="analytics-data">
        <summary>{words.results}</summary>
        <p className="quiet">{words.resultHelp}</p>
        <ResultsTable {...props} />
      </details>
    </>
  );
}

function ResultsTable(props: ViewProps) {
  const words = analyticsWords(props.language);
  return (
    <div className="analytics-table-scroll">
      <table>
        <caption>
          {words.results} · {words[props.period]} · {props.baseCurrency}
        </caption>
        <thead>
          <tr>
            <th scope="col">{words.category}</th>
            <th scope="col">{words.cost}</th>
            <th scope="col">{words.realized}</th>
            <th scope="col">{words.unrealized}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              {row[props.period].map((value, index) => (
                <td key={index}>{sampleMoney(value, props.baseCurrency, props)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
