import { useState } from 'react';
import { date } from '../i18n.ts';
import { Answer } from './Answer.tsx';
import { sampleMoney, samplePercent } from './format.ts';
import { performanceScenes } from './performance-data.ts';
import { PerformanceTable } from './PerformanceTable.tsx';
import { ResultsView } from './ResultsView.tsx';
import { SamplePlot, type PlotSeries } from './SamplePlot.tsx';
import type { ViewProps } from './types.ts';
import { analyticsLabel, analyticsWords } from './words.ts';

const modes = ['returns', 'worthHistory', 'flowHistory', 'results'] as const;
type Mode = (typeof modes)[number];

export function PerformanceView(props: ViewProps) {
  const words = analyticsWords(props.language);
  const [mode, setMode] = useState<Mode>('returns');
  const [broad, setBroad] = useState(true);
  const [bond, setBond] = useState(false);
  return (
    <>
      <label className="analytics-slice">
        {words.historyView}
        <select
          data-testid="analytics-history-view"
          value={mode}
          onChange={(event) =>
            setMode(modes.find((item) => item === event.target.value) ?? 'returns')
          }
        >
          {modes.map((item) => (
            <option key={item} value={item}>
              {analyticsLabel(props.language, item)}
            </option>
          ))}
        </select>
      </label>
      {mode === 'results' ? (
        <ResultsView {...props} />
      ) : (
        <HistoryScene {...props} mode={mode} broad={broad} bond={bond} />
      )}
      {mode === 'returns' && (
        <details className="analytics-data">
          <summary>{words.benchmarks}</summary>
          <BenchmarkControls
            {...props}
            broad={broad}
            bond={bond}
            setBroad={setBroad}
            setBond={setBond}
          />
        </details>
      )}
    </>
  );
}

function BenchmarkControls(
  props: ViewProps &
    Readonly<{
      broad: boolean;
      bond: boolean;
      setBroad: (value: boolean) => void;
      setBond: (value: boolean) => void;
    }>,
) {
  const words = analyticsWords(props.language);
  return (
    <fieldset className="analytics-asset-choices">
      <legend className="visually-hidden">{words.benchmarks}</legend>
      <label>
        <input
          type="checkbox"
          checked={props.broad}
          onChange={(event) => props.setBroad(event.target.checked)}
        />
        {words.benchmark}
      </label>
      <label>
        <input
          type="checkbox"
          checked={props.bond}
          onChange={(event) => props.setBond(event.target.checked)}
        />
        {words.secondBenchmark}
      </label>
    </fieldset>
  );
}

function HistoryScene(props: ViewProps & Readonly<{ mode: Mode; broad: boolean; bond: boolean }>) {
  const scene = performanceScenes[props.period];
  const words = analyticsWords(props.language);
  const series = historySeries(props);
  const first = scene.points.at(0)?.[0] ?? '';
  const last = scene.points.at(-1)?.[0] ?? '';
  return (
    <>
      <HistoryAnswer {...props} />
      <SamplePlot
        {...props}
        series={series}
        start={date(first, props.language)}
        end={date(last, props.language)}
      />
      <details className="analytics-data">
        <summary>{words.data}</summary>
        <PerformanceTable {...props} broad={props.broad} bond={props.bond} />
        <dl className="analytics-metrics">
          <div>
            <dt>{words.result}</dt>
            <dd>{sampleMoney(scene.result, props.baseCurrency, props)}</dd>
          </div>
        </dl>
      </details>
    </>
  );
}

function HistoryAnswer(props: ViewProps & Readonly<{ mode: Mode }>) {
  const scene = performanceScenes[props.period];
  const words = analyticsWords(props.language);
  const worth = scene.points.at(-1)?.[1] ?? 0;
  const flows = scene.points.at(-1)?.[2] ?? 0;
  const value =
    props.mode === 'returns'
      ? samplePercent(scene.return, props)
      : sampleMoney(props.mode === 'worthHistory' ? worth : flows, props.baseCurrency, props);
  const label =
    props.mode === 'returns' ? words.return : analyticsLabel(props.language, props.mode);
  return (
    <Answer
      label={label}
      value={value}
      context={`${words[props.period]} · ${props.baseCurrency}`}
    />
  );
}

function historySeries(
  props: ViewProps & Readonly<{ mode: Mode; broad: boolean; bond: boolean }>,
): readonly PlotSeries[] {
  const scene = performanceScenes[props.period];
  const words = analyticsWords(props.language);
  const starting = scene.points.at(0)?.[1] ?? 0;
  if (props.mode === 'flowHistory')
    return [{ name: words.flows, values: scene.points.map((point) => point[2]) }];
  if (props.mode === 'worthHistory')
    return [
      {
        name: `${words.worth} · ${props.baseCurrency}`,
        values: scene.points.map((point) => point[1]),
      },
      {
        name: `${words.capital} · ${props.baseCurrency}`,
        values: scene.points.map((point) => starting + point[2]),
      },
    ];
  return [
    { name: words.portfolio, values: scene.points.map((point) => point[3]), tone: 0 },
    ...(props.broad
      ? [{ name: words.benchmark, values: scene.points.map((point) => point[4]), tone: 1 }]
      : []),
    ...(props.bond
      ? [{ name: words.secondBenchmark, values: scene.points.map((point) => point[5]), tone: 2 }]
      : []),
  ];
}
