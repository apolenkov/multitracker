import { summarize, selectedBuys } from './model/portfolio.ts';
import type { Currency, State } from './model/portfolio.ts';
import type { Language } from './i18n.ts';
import { Holdings } from './Holdings.tsx';
import { OverviewSummary, OverviewResult } from './OverviewSummary.tsx';
import { Example } from './OverviewExample.tsx';
import { Report } from './insights/Report.tsx';
import { Composition } from './insights/Composition.tsx';
import { History } from './Records.tsx';
import { ValueHistory } from './ValueHistory.tsx';

type Props = Readonly<{
  state: State;
  portfolioId: string;
  currency: Currency;
  baseCurrency: Currency;
  language: Language;
  hidden: boolean;
  onBuy: () => void;
}>;

export function Overview(props: Props) {
  const { state, portfolioId, currency, baseCurrency, language, hidden, onBuy } = props;
  const result = summarize(state, portfolioId, currency);
  const performance = summarize(state, portfolioId, baseCurrency);
  const display = { buys: selectedBuys(state, portfolioId), currency, language, hidden };
  return (
    <div className="finance-overview">
      <div className="balance-panel">
        <OverviewSummary result={result} currency={currency} language={language} hidden={hidden} />
        <OverviewResult
          result={performance}
          currency={baseCurrency}
          language={language}
          hidden={hidden}
          onBuy={onBuy}
        />
        <ValueHistory {...result} currency={currency} language={language} hidden={hidden} />
      </div>
      <Holdings {...props} />
      <aside
        className="overview-side"
        aria-label={language === 'ru' ? 'Состав и результат' : 'Composition and result'}
      >
        <Composition {...display} />
        <Example {...display} currency={baseCurrency} />
      </aside>
      <div className="overview-report">
        <Report {...display} />
      </div>
      <div className="overview-history">
        <History {...props} brief />
      </div>
    </div>
  );
}
