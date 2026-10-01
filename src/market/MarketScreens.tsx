import { useState } from 'react';
import type { Language } from '../i18n.ts';
import type { Currency } from '../model/portfolio.ts';
import { AlertDialog } from './AlertDialog.tsx';
import { AlertList } from './AlertList.tsx';
import { AssetDialog } from './AssetDialog.tsx';
import {
  filterMarkets,
  initialAlerts,
  marketAssets,
  type AssetClass,
  type MarketAsset,
  type Mover,
  type PriceAlert,
  type Sector,
} from './data.ts';
import { MarketFilters, MarketIndices, MarketList } from './MarketList.tsx';
import { NotificationPreview } from './NotificationPreview.tsx';
import { marketWords } from './words.ts';
import './market.css';

type Props = Readonly<{
  screen: 'markets' | 'following';
  language: Language;
  currency: Currency;
  hidden: boolean;
}>;
type Status = Readonly<{ kind: 'saved' | 'updated' | 'removed'; symbol: string; revision: number }>;
type Dialog =
  | Readonly<{ kind: 'asset'; asset: MarketAsset }>
  | Readonly<{ kind: 'alert'; symbol: string; value: PriceAlert | undefined }>;

function useMarketState() {
  const [followed, setFollowed] = useState<readonly string[]>([]);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [dialog, setDialog] = useState<Dialog>();
  const [status, setStatus] = useState<Status>();
  const onFollow = (symbol: string) =>
    setFollowed((previous) =>
      previous.includes(symbol)
        ? previous.filter((item) => item !== symbol)
        : [...previous, symbol],
    );
  const onSave = (alert: PriceAlert) => {
    setAlerts((previous) => [...previous.filter((item) => item.id !== alert.id), alert]);
    setDialog(undefined);
    setStatus((previous) => ({
      kind: 'saved',
      symbol: alert.symbol,
      revision: (previous?.revision ?? 0) + 1,
    }));
  };
  const onPause = (alert: PriceAlert) => {
    setAlerts((previous) =>
      previous.map((item) => (item.id === alert.id ? { ...item, paused: !item.paused } : item)),
    );
    setStatus((previous) => ({
      kind: 'updated',
      symbol: alert.symbol,
      revision: (previous?.revision ?? 0) + 1,
    }));
  };
  const onDelete = (id: number) => {
    setAlerts((previous) => previous.filter((item) => item.id !== id));
    setStatus((previous) => ({
      kind: 'removed',
      symbol: alerts.find((item) => item.id === id)?.symbol ?? '',
      revision: (previous?.revision ?? 0) + 1,
    }));
  };
  return { followed, alerts, dialog, status, onFollow, onSave, onPause, onDelete, setDialog };
}

export function MarketScreens(props: Props) {
  const model = useMarketState();
  const filters = useMarketFilters();
  const { kind, query, mover, sector } = filters;
  const assets =
    props.screen === 'following'
      ? marketAssets.filter((asset) => model.followed.includes(asset.symbol))
      : filterMarkets(kind, query, mover, sector);
  return (
    <section className="market-page" data-market-screen={props.screen}>
      {props.screen === 'markets' && <MarketFilters language={props.language} {...filters} />}
      {props.screen === 'markets' && (
        <MarketIndices {...props} onOpen={(asset) => model.setDialog({ kind: 'asset', asset })} />
      )}
      <MarketList
        {...props}
        {...model}
        assets={assets}
        onOpen={(asset) => model.setDialog({ kind: 'asset', asset })}
        onFollow={(symbol) => {
          model.onFollow(symbol);
          if (props.screen === 'following') requestAnimationFrame(focusFollowing);
        }}
      />
      {assets.length === 0 && <MarketEmpty {...props} onClear={filters.onClear} />}
      <MarketDisclosure language={props.language} />
      <AlertList
        {...props}
        {...model}
        onEdit={(value) => model.setDialog({ kind: 'alert', symbol: value.symbol, value })}
      />
      <div hidden={props.screen !== 'following'}>
        <NotificationPreview {...props} alerts={model.alerts} />
      </div>
      <MarketStatus language={props.language} status={model.status} />
      <MarketDialog {...props} model={model} />
    </section>
  );
}

function MarketDialog(props: Props & Readonly<{ model: ReturnType<typeof useMarketState> }>) {
  const model = props.model;
  const dialog = model.dialog;
  if (!dialog) return null;
  const onClose = () => model.setDialog(undefined);
  if (dialog.kind === 'alert')
    return (
      <AlertDialog
        {...props}
        symbol={dialog.symbol}
        value={dialog.value}
        onClose={onClose}
        onSave={model.onSave}
      />
    );
  return (
    <AssetDialog
      {...props}
      asset={dialog.asset}
      followed={model.followed.includes(dialog.asset.symbol)}
      onClose={onClose}
      onFollow={() => model.onFollow(dialog.asset.symbol)}
      onAlert={() =>
        model.setDialog({ kind: 'alert', symbol: dialog.asset.symbol, value: undefined })
      }
    />
  );
}

function useMarketFilters() {
  const [kind, onKind] = useState<AssetClass>('all');
  const [query, onQuery] = useState('');
  const [mover, onMover] = useState<Mover>('all');
  const [sector, onSector] = useState<Sector>('all');
  const onClear = () => {
    onKind('all');
    onQuery('');
    onMover('all');
    onSector('all');
  };
  return { kind, query, mover, sector, onKind, onQuery, onMover, onSector, onClear };
}

function MarketDisclosure({ language }: Readonly<{ language: Language }>) {
  const words = marketWords(language);
  return (
    <details className="market-disclosure">
      <summary>{words.shortSample}</summary>
      <p className="quiet">
        {words.sample} {words.fixed}
      </p>
    </details>
  );
}

function MarketEmpty(props: Props & Readonly<{ onClear: () => void }>) {
  const words = marketWords(props.language);
  return (
    <div className="market-empty">
      <p role="status">{props.screen === 'following' ? words.emptyFollowing : words.empty}</p>
      {props.screen === 'following' ? (
        <a id="following-find" className="primary" href="#markets">
          {words.find}
        </a>
      ) : (
        <button id="market-empty-clear" type="button" onClick={props.onClear}>
          {words.clear}
        </button>
      )}
    </div>
  );
}

function focusFollowing() {
  const target = document.querySelector<HTMLElement>(
    '[data-market-screen="following"] .market-open, #following-find',
  );
  target?.focus();
}

function MarketStatus({
  language,
  status,
}: Readonly<{ language: Language; status: Status | undefined }>) {
  const words = marketWords(language);
  const message =
    status?.kind === 'saved'
      ? words.saved
      : status?.kind === 'updated'
        ? words.updated
        : status?.kind === 'removed'
          ? words.removed
          : '';
  return (
    <p className="demo-status" role="status">
      <span key={status?.revision}>{status ? `${status.symbol} · ${message}` : ''}</span>
    </p>
  );
}
