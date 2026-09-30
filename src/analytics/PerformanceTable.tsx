import { date } from '../i18n.ts';
import { sampleMoney, samplePercent } from './format.ts';
import { performanceScenes } from './performance-data.ts';
import type { ViewProps } from './types.ts';
import { analyticsWords } from './words.ts';

export function PerformanceTable(props: ViewProps & Readonly<{ broad: boolean; bond: boolean }>) {
  const words = analyticsWords(props.language);
  const starting = performanceScenes[props.period].points.at(0)?.[1] ?? 0;
  return (
    <div className="analytics-table-scroll">
      <table>
        <caption>
          {words.history} · {props.baseCurrency}
        </caption>
        <thead>
          <tr>
            <th scope="col">{words.day}</th>
            <th scope="col">{words.worth}</th>
            <th scope="col">{words.capital}</th>
            <th scope="col">{words.flows}</th>
            <th scope="col">{words.return}</th>
            {props.broad && <th scope="col">{words.benchmark}</th>}
            {props.bond && <th scope="col">{words.secondBenchmark}</th>}
          </tr>
        </thead>
        <tbody>
          {performanceScenes[props.period].points.map(
            ([day, worth, flows, result, broad, bond]) => (
              <tr key={day}>
                <th scope="row">{date(day, props.language)}</th>
                <td>{sampleMoney(worth, props.baseCurrency, props)}</td>
                <td>{sampleMoney(starting + flows, props.baseCurrency, props)}</td>
                <td>{sampleMoney(flows, props.baseCurrency, props)}</td>
                <td>{samplePercent(result, props)}</td>
                {props.broad && <td>{samplePercent(broad, props)}</td>}
                {props.bond && <td>{samplePercent(bond, props)}</td>}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
