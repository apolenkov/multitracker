import { useState } from 'react';
import type { Language } from '../i18n.ts';
import { MoneyAmount } from '../MoneyAmount.tsx';
import { currentFX, type Currency } from '../model/portfolio.ts';
import { assetPrice, assetUnit, type MarketAsset } from './data.ts';
import { marketWords } from './words.ts';

type Props = Readonly<{
  asset: MarketAsset;
  language: Language;
  currency: Currency;
  hidden: boolean;
}>;
export function TradingSession(props: Props) {
  const words = marketWords(props.language);
  const [session, setSession] = useState('regular');
  const sample =
    session === 'pre'
      ? { time: '13:00 UTC', value: props.asset.low }
      : session === 'post'
        ? { time: '21:00 UTC', value: props.asset.high }
        : { time: '18:00 UTC', value: props.asset.price };
  return (
    <section className="market-session">
      <AssetQuote {...props} value={sample.value} />
      <div className="market-session-control">
        <label htmlFor="market-session">{words.sessionSelect}</label>
        <select
          id="market-session"
          value={session}
          onChange={(event) => setSession(event.target.value)}
        >
          <option value="regular">{words.regular}</option>
          <option value="pre">{words.premarket}</option>
          <option value="post">{words.postmarket}</option>
        </select>
        <small>{sample.time}</small>
      </div>
    </section>
  );
}

export function AssetQuote(props: Props & Readonly<{ value?: number }>) {
  const words = marketWords(props.language);
  return (
    <div className="market-asset-quote">
      <p className="quiet">
        {words.price} · {assetUnit(props.asset, props.language)}
      </p>
      {props.asset.kind === 'forex' && <p className="quiet">EUR/{props.currency}</p>}
      <p className="market-leading-price">
        <LeadingPrice {...props} />
      </p>
      <p className="quiet">
        {words.range}:{' '}
        {assetPrice(props.asset, props.asset.low, props.currency, props.language, props.hidden)} —{' '}
        {assetPrice(props.asset, props.asset.high, props.currency, props.language, props.hidden)}
      </p>
      <p className="quiet">
        {words.valuationDate}
        {props.asset.kind === 'crypto' && ` · ${words.roundTheClock}`}
      </p>
    </div>
  );
}

function LeadingPrice(props: Props & Readonly<{ value?: number }>) {
  const value = props.value ?? props.asset.price;
  return props.asset.kind === 'index' ? (
    assetPrice(props.asset, value, props.currency, props.language, props.hidden)
  ) : (
    <MoneyAmount
      value={value * (props.currency === 'RUB' ? currentFX : 1)}
      currency={props.currency}
      language={props.language}
      hidden={props.hidden}
    />
  );
}
