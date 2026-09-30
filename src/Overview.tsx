import { summarize, selectedBuys } from './model/portfolio.ts';
import type { Currency, State } from './model/portfolio.ts';
import type { Language } from './i18n.ts';
import { Holdings } from './Holdings.tsx';
import { OverviewSummary } from './OverviewSummary.tsx';
import { Example } from './OverviewExample.tsx';
import { Report } from './insights/Report.tsx';
import { Composition } from './insights/Composition.tsx';
import { History } from './Records.tsx';
import { ValueHistory } from './ValueHistory.tsx';

type Props = Readonly<{
  state: State;
  portfolioId: string;
  currency: Currency;
  language: Language;
  hidden: boolean;
  onBuy: () => void;
}>;

export function Overview(props: Props) {
  const { state, portfolioId, currency, language, hidden, onBuy } = props;
  const result = summarize(state, portfolioId, currency);
  const buys = selectedBuys(state, portfolioId);
  const display = { buys, currency, language, hidden };

  return (
    <>
      <OverviewSummary
        result={result}
        currency={currency}
        language={language}
        hidden={hidden}
        onBuy={onBuy}
      />
      <Example {...display} />
      <ValueHistory {...result} currency={currency} language={language} hidden={hidden} />
      <Composition {...display} />
      <Report {...display} />
      <Holdings {...props} />
      <History {...props} brief />
    </>
  );
}
