import { useState } from 'react';
import { currentFX } from '../model/portfolio.ts';
import { AllocationView } from './AllocationView.tsx';
import { ComparisonView } from './ComparisonView.tsx';
import { sampleNumber } from './format.ts';
import { MetricsView } from './MetricsView.tsx';
import { PerformanceView } from './PerformanceView.tsx';
import type { Analysis, AnalyticsProps, Period, ViewProps } from './types.ts';
import { analyticsLabel, analyticsWords } from './words.ts';
import './analytics.css';

const sections: readonly Analysis[] = [
  'performance',
  'allocation',
  'fees',
  'risk',
  'decisions',
  'comparison',
];
const periods: readonly Period[] = ['month', 'quarter', 'year'];

export function AnalyticsScreen(props: AnalyticsProps) {
  const words = analyticsWords(props.language);
  const [section, setSection] = useState<Analysis>('performance');
  const [period, setPeriod] = useState<Period>('quarter');
  return (
    <section className="analytics-screen" aria-label={words.title}>
      <AnalyticsControls
        language={props.language}
        section={section}
        period={period}
        setSection={setSection}
        setPeriod={setPeriod}
      />
      <p className="quiet analytics-demo-note">{words.disclosure}</p>
      <div className="analytics-panel" data-analysis={section}>
        <h2>{analyticsLabel(props.language, `${section}Question`)}</h2>
        <AnalysisView {...props} section={section} period={period} />
      </div>
      <details className="analytics-about" key={section}>
        <summary>{words.about}</summary>
        <h3>{words.explanation}</h3>
        <p className="quiet">{analyticsLabel(props.language, `${section}Help`)}</p>
        <h3>{words.unitsHelp}</h3>
        <p className="quiet">
          {words.baseNote}: {props.baseCurrency}. {words.displayNote}: {props.currency}.{' '}
          {words.conversion}: {sampleNumber(currentFX, props)}.
        </p>
      </details>
    </section>
  );
}

type ControlsProps = Readonly<{
  language: AnalyticsProps['language'];
  section: Analysis;
  period: Period;
  setSection: (value: Analysis) => void;
  setPeriod: (value: Period) => void;
}>;
function AnalyticsControls({ language, section, period, setSection, setPeriod }: ControlsProps) {
  const words = analyticsWords(language);
  return (
    <div className="analytics-controls">
      <label>
        {words.analysis}
        <select
          data-testid="analytics-section"
          value={section}
          onChange={(event) =>
            setSection(sections.find((item) => item === event.target.value) ?? 'performance')
          }
        >
          {sections.map((item) => (
            <option key={item} value={item}>
              {analyticsLabel(language, item)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {words.period}
        <select
          data-testid="analytics-period"
          value={period}
          onChange={(event) =>
            setPeriod(periods.find((item) => item === event.target.value) ?? 'quarter')
          }
        >
          {periods.map((item) => (
            <option key={item} value={item}>
              {analyticsLabel(language, `period${item.charAt(0).toUpperCase()}${item.slice(1)}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function AnalysisView(props: ViewProps & Readonly<{ section: Analysis }>) {
  if (props.section === 'performance') return <PerformanceView {...props} />;
  if (props.section === 'allocation') return <AllocationView {...props} />;
  if (props.section === 'comparison') return <ComparisonView {...props} />;
  return <MetricsView {...props} section={props.section} />;
}
