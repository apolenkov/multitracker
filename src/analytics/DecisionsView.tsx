import { useState } from 'react';
import { date } from '../i18n.ts';
import { Answer } from './Answer.tsx';
import { decisionScenes } from './metrics-data.ts';
import { sampleMoney, sampleNumber, samplePercent } from './format.ts';
import { periodTrades } from './trade-data.ts';
import { SamplePlot } from './SamplePlot.tsx';
import { TradeDetails } from './TradeUsageView.tsx';
import type { ViewProps } from './types.ts';
import { analyticsLabel, analyticsWords } from './words.ts';

const decisions = [
  { id: 'saleNorth', day: '2026-09-23', asset: 'North', deal: 110, later: 95, change: -13.64 },
  { id: 'saleSouth', day: '2026-09-18', asset: 'South', deal: 45, later: 60, change: 33.33 },
  { id: 'buyNorth', day: '2026-09-03', asset: 'North', deal: 90, later: 110, change: 22.22 },
] as const;

export function DecisionsView(props: ViewProps) {
  const words = analyticsWords(props.language);
  const scene = decisionScenes[props.period];
  const trades = periodTrades(props.period);
  const entries = [
    [words.purchases, sampleNumber(trades.filter((trade) => trade.kind === 'buy').length, props)],
    [words.sales, sampleNumber(trades.filter((trade) => trade.kind === 'sell').length, props)],
    [words.popular, 'North'],
    [words.count, sampleNumber(scene.count, props)],
    [words.win, samplePercent(scene.win, props)],
    [words.average, sampleMoney(scene.average, props.currency, props)],
  ] as const;
  return (
    <>
      <DecisionExample {...props} />
      <details className="analytics-data">
        <summary>{words.tradeStatistics}</summary>
        <p className="quiet">
          {words.tradeNote} {words.statistics}
        </p>
        <dl className="analytics-metrics">
          {entries.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </details>
      <TradeDetails {...props} />
    </>
  );
}

function DecisionExample(props: ViewProps) {
  const words = analyticsWords(props.language);
  const [selected, setSelected] = useState('saleNorth');
  const decision = decisions.find((item) => item.id === selected) ?? decisions[0];
  return (
    <>
      <label className="analytics-slice">
        {words.chooseDecision}
        <select
          data-testid="analytics-decision"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {decisions.map((item) => (
            <option key={item.id} value={item.id}>
              {analyticsLabel(props.language, item.id)}
            </option>
          ))}
        </select>
      </label>
      <Answer
        label={words.laterChange}
        value={samplePercent(decision.change, props)}
        context={analyticsLabel(props.language, decision.id)}
      />
      <SamplePlot
        {...props}
        series={[
          {
            name: `${decision.asset} · ${props.currency}`,
            values: [decision.deal, decision.later],
          },
        ]}
        start={date(decision.day, props.language)}
        end={date('2026-09-30', props.language)}
      />
      <DecisionDetails {...props} decision={decision} />
    </>
  );
}

function DecisionDetails(props: ViewProps & Readonly<{ decision: (typeof decisions)[number] }>) {
  const words = analyticsWords(props.language);
  const decision = props.decision;
  return (
    <details className="analytics-data">
      <summary>{words.data}</summary>
      <p className="quiet">
        {decision.id === 'saleSouth' ? words.badDecision : words.goodDecision}
      </p>
      <dl className="analytics-metrics">
        <div>
          <dt>{words.dealPrice}</dt>
          <dd>{sampleMoney(decision.deal, props.currency, props)}</dd>
        </div>
        <div>
          <dt>{words.laterDate}</dt>
          <dd>{sampleMoney(decision.later, props.currency, props)}</dd>
        </div>
      </dl>
    </details>
  );
}
