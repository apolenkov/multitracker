import { Icon } from '../Icon.tsx';
import { AssetSymbol } from '../AssetSymbol.tsx';
import { percentage, type Language } from '../i18n.ts';
import type { Currency } from '../model/portfolio.ts';
import {
  classes,
  assetPrice,
  assetName,
  type AssetClass,
  type MarketAsset,
  type Mover,
  type Sector,
  marketAssets,
} from './data.ts';
import { className, marketWords } from './words.ts';

type Display = Readonly<{ language: Language; currency: Currency; hidden: boolean }>;
export type FilterProps = Readonly<{
  language: Language;
  kind: AssetClass;
  query: string;
  mover: Mover;
  sector: Sector;
  onSector: (sector: Sector) => void;
  onKind: (kind: AssetClass) => void;
  onQuery: (query: string) => void;
  onMover: (mover: Mover) => void;
  onClear: () => void;
}>;

export function MarketFilters(props: FilterProps) {
  const words = marketWords(props.language);
  const active = [props.kind !== 'all', props.sector !== 'all', props.mover !== 'all'].filter(
    Boolean,
  ).length;
  return (
    <div className="market-tools">
      <label className="market-search-field" htmlFor="market-search">
        {words.search}
        <span>
          <Icon name="search" />
          <input
            id="market-search"
            type="search"
            autoComplete="off"
            value={props.query}
            onChange={(event) => props.onQuery(event.target.value)}
          />
        </span>
      </label>
      <details id="market-filter-disclosure" className="market-filter-disclosure">
        <summary>
          {words.filters}
          {active > 0 && <span className="count">{active}</span>}
        </summary>
        <div className="market-filters">
          <ClassFilter {...props} />
          <SectorFilter {...props} />
          <MoverFilter {...props} />
          <button id="market-clear" type="button" onClick={props.onClear}>
            {words.clear}
          </button>
        </div>
      </details>
    </div>
  );
}

function ClassFilter(props: FilterProps) {
  const words = marketWords(props.language);
  return (
    <label htmlFor="market-class">
      {words.class}
      <select
        id="market-class"
        value={props.kind}
        onChange={(event) =>
          props.onKind(classes.find((kind) => kind === event.target.value) ?? 'all')
        }
      >
        {classes.map((kind) => (
          <option key={kind} value={kind}>
            {className(kind, props.language)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MarketList(
  props: Display &
    Readonly<{
      assets: readonly MarketAsset[];
      followed: readonly string[];
      onOpen: (asset: MarketAsset) => void;
      onFollow: (symbol: string) => void;
    }>,
) {
  const words = marketWords(props.language);
  return (
    <ul className="market-list">
      {props.assets.map((asset) => (
        <li key={asset.symbol} data-market-symbol={asset.symbol}>
          <button type="button" className="market-open" onClick={() => props.onOpen(asset)}>
            <span className="market-asset-identity">
              <AssetSymbol symbol={asset.symbol} />
              <span className="market-identity">
                <strong>{asset.symbol}</strong>
                <span>
                  {assetName(asset, props.language)} · {className(asset.kind, props.language)}
                </span>
              </span>
            </span>
            <span className="market-quote">
              <strong>
                {assetPrice(asset, asset.price, props.currency, props.language, props.hidden)}
              </strong>
              <PriceChange change={asset.change} language={props.language} hidden={props.hidden} />
            </span>
          </button>
          <button
            type="button"
            className="market-follow"
            aria-pressed={props.followed.includes(asset.symbol)}
            aria-label={`${props.followed.includes(asset.symbol) ? words.unfollow : words.follow} · ${asset.symbol}`}
            onClick={() => props.onFollow(asset.symbol)}
          >
            <Icon name="following" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function PriceChange({
  change,
  language,
  hidden,
}: Readonly<{
  change: number;
  language: Language;
  hidden: boolean;
}>) {
  return (
    <span className={`market-change ${hidden ? '' : change > 0 ? 'positive' : 'negative'}`}>
      {hidden ? '••••' : `${change > 0 ? '+' : ''}${percentage(change, language)}`}
    </span>
  );
}

export function MarketIndices(props: Display & Readonly<{ onOpen: (asset: MarketAsset) => void }>) {
  const words = marketWords(props.language);
  return (
    <section className="market-indices" aria-label={words.indices}>
      <h2>{words.indices}</h2>
      <div className="market-index-links">
        {marketAssets
          .filter((asset) => asset.kind === 'index')
          .map((asset) => (
            <button
              type="button"
              key={asset.symbol}
              data-market-index={asset.symbol}
              onClick={() => props.onOpen(asset)}
            >
              <span>{asset.name}</span>
              <strong>
                {assetPrice(asset, asset.price, props.currency, props.language, props.hidden)}
              </strong>
            </button>
          ))}
      </div>
    </section>
  );
}

function MoverFilter(props: FilterProps) {
  const words = marketWords(props.language);
  return (
    <label htmlFor="market-mover">
      {words.movers}
      <select
        id="market-mover"
        value={props.mover}
        onChange={(event) =>
          props.onMover(
            event.target.value === 'active'
              ? 'active'
              : event.target.value === 'up'
                ? 'up'
                : event.target.value === 'down'
                  ? 'down'
                  : 'all',
          )
        }
      >
        <option value="all">{words.all}</option>
        <option value="up">{words.up}</option>
        <option value="down">{words.down}</option>
        <option value="active">{words.activeMovers}</option>
      </select>
    </label>
  );
}

function SectorFilter(props: FilterProps) {
  const words = marketWords(props.language);
  return (
    <label htmlFor="market-sector">
      {words.sector}
      <select
        id="market-sector"
        value={props.sector}
        onChange={(event) =>
          props.onSector(
            event.target.value === 'technology'
              ? 'technology'
              : event.target.value === 'other'
                ? 'other'
                : 'all',
          )
        }
      >
        <option value="all">{words.all}</option>
        <option value="technology">{words.technology}</option>
        <option value="other">{words.other}</option>
      </select>
    </label>
  );
}
