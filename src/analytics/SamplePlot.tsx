import type { AnalyticsProps } from './types.ts';
import { analyticsWords } from './words.ts';

export type PlotSeries = Readonly<{ name: string; values: readonly number[]; tone?: number }>;
type Props = AnalyticsProps &
  Readonly<{ series: readonly PlotSeries[]; start: string; end: string }>;

export function SamplePlot(props: Props) {
  const words = analyticsWords(props.language);
  return (
    <div>
      <div className="analytics-legend">
        {props.series.map((series, index) => (
          <span key={series.name} className={`analytics-series-${series.tone ?? index}`}>
            {series.name}
          </span>
        ))}
      </div>
      {props.hidden ? (
        <p className="analytics-hidden">{words.hidden}</p>
      ) : (
        <PlotLines series={props.series} />
      )}
      <div className="analytics-axis">
        <span>{props.start}</span>
        <span>{props.end}</span>
      </div>
    </div>
  );
}

function PlotLines({ series }: Readonly<{ series: readonly PlotSeries[] }>) {
  const values = series.flatMap((item) => item.values);
  const minimum = Math.min(...values);
  const range = Math.max(Math.max(...values) - minimum, 1);
  const coordinates = (line: PlotSeries) =>
    line.values
      .map(
        (value, index) =>
          `${20 + (index * 540) / Math.max(line.values.length - 1, 1)},${170 - ((value - minimum) / range) * 140}`,
      )
      .join(' ');
  return (
    <svg
      className="analytics-plot"
      viewBox="0 0 580 190"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {[30, 100, 170].map((y) => (
        <line key={y} className="analytics-grid" x1="20" y1={y} x2="560" y2={y} />
      ))}
      {series.map((line, index) => (
        <polyline
          key={line.name}
          className={`analytics-line analytics-series-${line.tone ?? index}`}
          points={coordinates(line)}
        />
      ))}
    </svg>
  );
}
