import { useState } from 'react';
import { assets, selectedBuys, totals } from './model/portfolio.ts';
import type { Asset, Currency, State } from './model/portfolio.ts';
import { getLabels } from './i18n.ts';
import { AssetDetails } from './insights/AssetDetails.tsx';
import { HoldingsTable } from './HoldingsTable.tsx';
import type { Language } from './i18n.ts';

type Props = Readonly<{
  state: State;
  portfolioId: string;
  currency: Currency;
  baseCurrency: Currency;
  language: Language;
  hidden: boolean;
}>;

export function Holdings(props: Props) {
  const { state, portfolioId, currency, language } = props;
  const labels = getLabels(language);
  const [selected, setSelected] = useState<Asset>('BTC');
  const buys = selectedBuys(state, portfolioId);
  const value = totals(buys, currency).value;
  const rows = assets
    .map((asset) => ({ asset, buys: buys.filter((buy) => buy.asset === asset) }))
    .filter((row) => row.buys.length > 0);

  return (
    <section className="holdings" aria-labelledby="holdings-title">
      <h2 id="holdings-title">
        {labels.holdings} <span className="count">{rows.length + 2}</span>
      </h2>
      <HoldingsTable rows={rows} value={value} {...props} onSelect={setSelected} />
      {rows.length > 0 && <AssetDetails asset={selected} {...props} />}
      {rows.length === 0 && (
        <div className="empty-state">
          <h3>{labels.empty}</h3>
          <p>{labels.emptyHelp}</p>
        </div>
      )}
    </section>
  );
}
