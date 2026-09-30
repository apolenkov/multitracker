import { useState } from 'react';
import type { Currency } from '../model/portfolio.ts';
import { sampleMoney, type PriceAlert } from './data.ts';
import type { Language } from '../i18n.ts';
import { marketWords } from './words.ts';

type Props = Readonly<{
  language: Language;
  currency: Currency;
  hidden: boolean;
  alerts: readonly PriceAlert[];
}>;
export function NotificationPreview(props: Props) {
  const words = marketWords(props.language);
  const [category, setCategory] = useState('price');
  const [shown, setShown] = useState(false);
  const [revision, setRevision] = useState(0);
  return (
    <section className="market-notifications">
      <label htmlFor="market-message-category">{words.channel}</label>
      <select
        id="market-message-category"
        value={category}
        onChange={(event) => {
          setCategory(event.target.value);
          setShown(false);
        }}
      >
        <option value="price">{words.categoryPrice}</option>
        <option value="event">{words.categoryEvent}</option>
        <option value="recap">{words.categoryRecap}</option>
      </select>
      <button
        id="market-message-preview"
        type="button"
        onClick={() => {
          setShown(true);
          setRevision((previous) => previous + 1);
        }}
      >
        {words.preview}
      </button>
      <PreviewMessage {...props} category={category} shown={shown} revision={revision} />
    </section>
  );
}

function PreviewMessage(
  props: Props & Readonly<{ category: string; shown: boolean; revision: number }>,
) {
  const words = marketWords(props.language);
  const alert = props.alerts.at(0);
  const message =
    props.category === 'event'
      ? words.eventMessage
      : props.category === 'recap'
        ? words.recapMessage
        : words.priceMessage;
  return (
    <div className="market-message-result" role="status">
      <span key={props.revision}>
        {props.shown && (
          <>
            <strong>{alert?.symbol ?? 'MSFT'} · 18:00 UTC</strong>
            {props.category === 'price' && alert && (
              <p>
                {alert.direction === 'above' ? words.above : words.below}{' '}
                {sampleMoney(alert.usd, props.currency, props.language, props.hidden)}
              </p>
            )}
            <p>{message}</p>
          </>
        )}
      </span>
    </div>
  );
}
