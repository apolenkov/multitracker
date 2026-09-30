import { money, number, type Language } from '../i18n.ts';
import { currentFX, type Currency } from '../model/portfolio.ts';

export type AssetClass =
  'all' | 'stock' | 'crypto' | 'fund' | 'bond' | 'commodity' | 'forex' | 'index';
export type Mover = 'all' | 'up' | 'down' | 'active';
export type Sector = 'all' | 'technology' | 'other';
export type MarketAsset = Readonly<{
  symbol: string;
  name: string;
  kind: Exclude<AssetClass, 'all'>;
  price: number;
  change: number;
  low: number;
  high: number;
}>;
export type PriceAlert = Readonly<{
  id: number;
  symbol: string;
  usd: number;
  direction: 'above' | 'below';
  repeat: boolean;
  paused: boolean;
}>;

export const marketAssets: readonly MarketAsset[] = [
  {
    symbol: 'MSFT',
    name: 'Microsoft',
    kind: 'stock',
    price: 450,
    change: 1.4,
    low: 441,
    high: 455,
  },
  { symbol: 'AAPL', name: 'Apple', kind: 'stock', price: 210, change: -0.8, low: 208, high: 214 },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    kind: 'crypto',
    price: 60000,
    change: 2.8,
    low: 58100,
    high: 60500,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    kind: 'crypto',
    price: 2400,
    change: -1.2,
    low: 2380,
    high: 2460,
  },
  {
    symbol: 'SPY',
    name: 'S&P 500 ETF',
    kind: 'fund',
    price: 540,
    change: 0.6,
    low: 534,
    high: 542,
  },
  {
    symbol: 'BOND',
    name: 'Sample Treasury',
    kind: 'bond',
    price: 98,
    change: -0.1,
    low: 97,
    high: 99,
  },
  {
    symbol: 'XAU',
    name: 'Gold · 1 oz',
    kind: 'commodity',
    price: 2300,
    change: 0.9,
    low: 2270,
    high: 2310,
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro · 1 EUR',
    kind: 'forex',
    price: 1.1,
    change: -0.3,
    low: 1.08,
    high: 1.12,
  },
  {
    symbol: 'SPX',
    name: 'S&P 500',
    kind: 'index',
    price: 5400,
    change: 0.6,
    low: 5320,
    high: 5420,
  },
  {
    symbol: 'NDX',
    name: 'NASDAQ 100',
    kind: 'index',
    price: 17800,
    change: -0.4,
    low: 17720,
    high: 17940,
  },
  { symbol: 'MOEX', name: 'MOEX', kind: 'index', price: 2700, change: 0.8, low: 2670, high: 2720 },
];
export const classes: readonly AssetClass[] = [
  'all',
  'stock',
  'crypto',
  'fund',
  'bond',
  'commodity',
  'forex',
  'index',
];
export const initialAlerts: readonly PriceAlert[] = [
  { id: 1, symbol: 'MSFT', usd: 460, direction: 'above', repeat: false, paused: false },
];

export function filterMarkets(
  kind: AssetClass,
  query: string,
  mover: Mover,
  sector: Sector = 'all',
) {
  const search = query.trim().toLocaleLowerCase();
  return marketAssets.filter(
    (asset) =>
      (kind === 'all' || asset.kind === kind) &&
      searchText(asset).includes(search) &&
      matchesMover(asset, mover) &&
      (sector === 'all' ||
        (sector === 'technology' ? asset.kind === 'stock' : asset.kind !== 'stock')),
  );
}

function searchText(asset: MarketAsset) {
  const sector = asset.kind === 'stock' ? 'technology технологии' : 'other прочие';
  return `${asset.symbol} ${asset.name} ${assetName(asset, 'ru')} ${sector}`.toLocaleLowerCase();
}

function matchesMover(asset: MarketAsset, mover: Mover) {
  if (mover === 'up') return asset.change > 0;
  if (mover === 'down') return asset.change < 0;
  if (mover === 'active') return Math.abs(asset.change) >= 1;
  return true;
}

export function parseThreshold(value: string) {
  const trimmed = value.trim();
  const result = /^(?:\d+|\d+[.,]\d+)$/u.test(trimmed)
    ? Number(trimmed.replace(',', '.'))
    : Number.NaN;
  return Number.isFinite(result) && result > 0 ? result : undefined;
}

export function sampleMoney(usd: number, currency: Currency, language: Language, hidden: boolean) {
  return hidden ? '••••' : money(usd * (currency === 'RUB' ? currentFX : 1), currency, language);
}

export function assetPrice(
  asset: MarketAsset,
  value: number,
  currency: Currency,
  language: Language,
  hidden: boolean,
) {
  if (hidden) return '••••';
  if (asset.kind === 'index')
    return `${number(value, language)} ${language === 'ru' ? 'пунктов' : 'points'}`;
  return sampleMoney(value, currency, language, false);
}

export function assetName(asset: MarketAsset, language: Language) {
  if (language === 'en') return asset.name;
  const names = new Map([
    ['BOND', 'Учебная казначейская облигация'],
    ['XAU', 'Золото · 1 тройская унция'],
    ['EUR/USD', 'Евро · 1 EUR'],
    ['SPY', 'Фонд S&P 500 ETF'],
  ]);
  return names.get(asset.symbol) ?? asset.name;
}

export function assetUnit(asset: MarketAsset, language: Language) {
  if (asset.kind === 'crypto')
    return language === 'ru' ? `за 1 ${asset.symbol}` : `per 1 ${asset.symbol}`;
  const units = new Map([
    ['stock', ['за 1 акцию', 'per share']],
    ['fund', ['за 1 пай', 'per fund unit']],
    ['bond', ['за 1 учебную облигацию', 'per sample bond']],
    ['commodity', ['за 1 тройскую унцию', 'per troy ounce']],
    ['forex', ['за 1 EUR', 'per 1 EUR']],
    ['index', ['пункты индекса', 'index points']],
  ]);
  return units.get(asset.kind)?.[language === 'ru' ? 0 : 1] ?? '';
}
