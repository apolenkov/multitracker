import { useRef, useState } from 'react';
import { closeDialog, DialogHeading, keepDialogFocus } from '../Dialog.tsx';
import { date, demoAccount, getLabels, money, number, type Language } from '../i18n.ts';
import {
  assessmentDate,
  prices,
  selectedBuys,
  totals,
  type Asset,
  type Buy,
  type Currency,
  type State,
} from '../model/portfolio.ts';
import { insightWords } from './words.ts';
import { ManualValuation } from './ManualValuation.tsx';

type Props = Readonly<{
  asset: Asset;
  state: State;
  portfolioId: string;
  currency: Currency;
  language: Language;
  hidden: boolean;
}>;
type ValuesProps = Props & Readonly<{ buys: readonly Buy[] }>;

export function AssetDetails(props: Props) {
  const labels = getLabels(props.language);
  const words = insightWords(props.language);
  const [editing, setEditing] = useState(false);
  const valuationButton = useRef<HTMLButtonElement>(null);
  const finish = () => {
    setEditing(false);
    valuationButton.current?.focus();
  };
  const [saved, setSaved] = useState(0);
  const buys = selectedBuys(props.state, props.portfolioId).filter(
    (buy) => buy.asset === props.asset,
  );
  return (
    <dialog
      id="asset-dialog"
      aria-labelledby="asset-title"
      onKeyDown={keepDialogFocus}
      onClose={() => setEditing(false)}
    >
      <AssetHeading asset={props.asset} language={props.language} />
      <p className="quiet">{labels.demo}</p>
      <PositionValues {...props} buys={buys} />
      <Quote {...props} buys={buys} />
      <PositionHistory {...props} buys={buys} />
      <PriceGraph {...props} />
      <button type="button" ref={valuationButton} onClick={() => setEditing(true)}>
        {words.valuation}
      </button>
      {editing && (
        <ManualValuation
          language={props.language}
          onCancel={finish}
          onSave={() => {
            finish();
            setSaved((previous) => previous + 1);
          }}
        />
      )}
      {saved > 0 && (
        <p key={saved} role="status">
          {words.saved}
        </p>
      )}
      <CloseAsset language={props.language} />
    </dialog>
  );
}

function PositionValues({ buys, currency, language, hidden }: ValuesProps) {
  const words = insightWords(language);
  const result = totals(buys, currency);
  const rows = [
    [words.current, result.value],
    [words.cost, result.basis],
    [words.unrealized, result.profit],
  ] as const;
  return (
    <div>
      <h3>{words.units}</h3>
      <p>
        {words.quantity}:{' '}
        {hidden
          ? '••••'
          : number(
              buys.reduce((sum, buy) => sum + buy.quantity, 0),
              language,
            )}
      </p>
      <dl className="asset-detail-values">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{hidden ? '••••' : money(value, currency, language)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Quote({ asset, state, buys, language, hidden }: ValuesProps) {
  const words = insightWords(language);
  const sources = buys.map((buy) => {
    const portfolio = state.portfolios.find((item) => item.id === buy.portfolioId);
    return portfolio ? `${portfolio.name} · ${demoAccount(portfolio.id, language)}` : '';
  });
  return (
    <div>
      <h3>{words.quote}</h3>
      <dl className="asset-detail-values">
        <div>
          <dt>{words.amount}</dt>
          <dd>
            {hidden
              ? '••••'
              : money(new Map(Object.entries(prices)).get(asset) ?? 0, 'USD', language)}
          </dd>
        </div>
        <div>
          <dt>{words.assessed}</dt>
          <dd>{date(assessmentDate, language)}</dd>
        </div>
        <div>
          <dt>{words.source}</dt>
          <dd>{words.sourceExample}</dd>
        </div>
        <div>
          <dt>{getLabels(language).portfolio}</dt>
          <dd>{[...new Set(sources)].join(', ') || '—'}</dd>
        </div>
      </dl>
      <p className="quiet">{words.freshness}</p>
    </div>
  );
}

function PositionHistory({ buys, language, hidden }: ValuesProps) {
  const labels = getLabels(language);
  const words = insightWords(language);
  return (
    <details className="asset-timeline">
      <summary>{words.history}</summary>
      <table>
        <caption className="visually-hidden">{words.history}</caption>
        <thead>
          <tr>
            <th scope="col">{words.date}</th>
            <th scope="col">{labels.buy}</th>
            <th scope="col">{words.cost}</th>
          </tr>
        </thead>
        <tbody>
          {buys.map((buy) => (
            <tr key={buy.id}>
              <td>{date(buy.date, language)}</td>
              <td>{hidden ? '••••' : number(buy.quantity, language)}</td>
              <td>{hidden ? '••••' : money(totals([buy], 'USD').basis, 'USD', language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {buys.length === 0 && <p>{labels.noHistory}</p>}
    </details>
  );
}

function PriceGraph({ asset, language, hidden }: Props) {
  const words = insightWords(language);
  const price = new Map(Object.entries(prices)).get(asset) ?? 0;
  const points = [
    ['2026-01-01', price * 0.9],
    ['2026-06-01', price * 1.05],
    [assessmentDate, price],
  ] as const;
  return (
    <details className="asset-timeline">
      <summary>{words.graph}</summary>
      <p className="quiet">{getLabels(language).chartSampleNote}</p>
      {hidden ? (
        <p>{getLabels(language).hidden}</p>
      ) : (
        <svg className="history-plot" viewBox="0 0 600 190" aria-hidden="true">
          <polyline points="20,140 300,50 580,80" className="history-value" />
        </svg>
      )}
      <table>
        <caption className="visually-hidden">{words.graph}</caption>
        <thead>
          <tr>
            <th scope="col">{words.date}</th>
            <th scope="col">USD</th>
          </tr>
        </thead>
        <tbody>
          {points.map(([day, value]) => (
            <tr key={day}>
              <td>{date(day, language)}</td>
              <td>{hidden ? '••••' : money(value, 'USD', language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function CloseAsset({ language }: Readonly<{ language: Language }>) {
  return (
    <div className="form-actions">
      <button className="primary" onClick={() => closeDialog('asset-dialog')}>
        {getLabels(language).close}
      </button>
    </div>
  );
}

function AssetHeading({ asset, language }: Readonly<{ asset: Asset; language: Language }>) {
  const labels = getLabels(language);
  return (
    <DialogHeading
      title={`${labels.assetDetails} · ${asset}`}
      id="asset-title"
      dialog="asset-dialog"
      labels={labels}
    />
  );
}
