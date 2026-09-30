import { summarize, selectedBuys } from './model/portfolio.ts';
import type { Currency, State } from './model/portfolio.ts';
import { getLabels, text, type Language } from './i18n.ts';
import { Icon } from './Icon.tsx';
import { Holdings } from './Holdings.tsx';
import { OverviewSummary, OverviewResult, OverviewAcquisition } from './OverviewSummary.tsx';
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
        <ValueHistory {...result} currency={currency} language={language} hidden={hidden}>
          <OverviewAcquisition
            result={performance}
            currency={baseCurrency}
            language={language}
            hidden={hidden}
          />
        </ValueHistory>
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
        <OverviewLinks language={language} />
        <Report {...display} />
      </div>
      <div className="overview-history">
        <History {...props} brief />
      </div>
    </div>
  );
}

function OverviewLinks({ language }: Readonly<{ language: Language }>) {
  const labels = getLabels(language);
  return (
    <nav
      className="overview-links"
      aria-label={language === 'ru' ? 'Другие учебные разделы' : 'Other sample sections'}
    >
      {(['analytics', 'markets', 'events'] as const).map((screen) => (
        <a key={screen} href={`#${screen}`}>
          {text(labels, screen)} <Icon name="chevron" />
        </a>
      ))}
    </nav>
  );
}
