import { PriceHistory } from './PriceHistory.tsx';
import { TradingSession, AssetQuote } from './TradingSession.tsx';
import { DemoModal } from '../demo/modal.tsx';
import { openOperation } from '../Forms.tsx';
import type { Language } from '../i18n.ts';
import type { Currency } from '../model/portfolio.ts';
import { assetName, type MarketAsset } from './data.ts';
import { className, marketWords } from './words.ts';

type Props = Readonly<{
  asset: MarketAsset;
  language: Language;
  currency: Currency;
  hidden: boolean;
  followed: boolean;
  onClose: () => void;
  onFollow: () => void;
  onAlert: () => void;
}>;

export function AssetDialog(props: Props) {
  const words = marketWords(props.language);
  return (
    <DemoModal
      id="market-asset-dialog"
      title={`${props.asset.symbol} · ${assetName(props.asset, props.language)}`}
      language={props.language}
      onClose={props.onClose}
    >
      <p className="quiet">
        {className(props.asset.kind, props.language)} · {words.shortSample}
      </p>
      {props.asset.kind === 'stock' ? <TradingSession {...props} /> : <AssetQuote {...props} />}
      <PriceHistory {...props} />
      <PriceExplanation {...props} />
      <details className="market-disclosure">
        <summary>{words.noteTitle}</summary>
        <p>{props.asset.kind === 'index' ? words.pointsNote : words.fixed}</p>
        <p>{words.source}</p>
      </details>
      <div className="dialog-actions">
        <button type="button" aria-pressed={props.followed} onClick={props.onFollow}>
          {props.followed ? words.unfollow : words.follow}
        </button>
        {props.asset.kind !== 'index' && (
          <button
            id="market-create-alert"
            type="button"
            className={buyable(props.asset) ? undefined : 'primary'}
            onClick={props.onAlert}
          >
            {words.newAlert}
          </button>
        )}
        {buyable(props.asset) && (
          <button
            id="market-buy"
            type="button"
            className="primary"
            onClick={() => openOperation('buy', { asset: props.asset.symbol, currency: 'USD' })}
          >
            {props.language === 'ru' ? 'Купить' : 'Buy'} {props.asset.symbol}
          </button>
        )}
      </div>
    </DemoModal>
  );
}

// Ответ «почему изменилась цена» — открытым текстом; свёрнуты только таблица значений и «О ценах».
function PriceExplanation({ asset, language }: Props) {
  const words = marketWords(language);
  return (
    <section className="market-explanation">
      <h3>{words.explanation}</h3>
      <p>{asset.kind === 'stock' ? words.explanationStock : words.explanationOther}</p>
    </section>
  );
}

// Покупка доступна для активов учебного набора операций.
const buyable = (asset: MarketAsset) => ['MSFT', 'BTC'].includes(asset.symbol);
