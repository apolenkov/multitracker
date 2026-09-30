export type Currency = 'RUB' | 'USD';
export type Asset = 'BTC' | 'MSFT' | 'TWT';
export type Portfolio = Readonly<{ id: string; name: string }>;
export type Buy = Readonly<{
  id: string;
  portfolioId: string;
  asset: Asset;
  quantity: number;
  price: number;
  fee: number;
  fx: number;
  date: string;
}>;
export type State = Readonly<{ portfolios: readonly Portfolio[]; buys: readonly Buy[] }>;
export type BuyInput = Readonly<{
  portfolioId: string;
  asset: string;
  quantity: string;
  price: string;
  fee: string;
  fx: string;
  date: string;
}>;
export type ErrorCode = 'positive' | 'fee' | 'date' | 'asset' | 'name' | 'total';
export type BuyErrors = Readonly<Partial<Record<keyof BuyInput, ErrorCode>>>;
export const assessmentDate = '2026-09-30';
export const currentFX = 120;
export const prices: Readonly<Record<Asset, number>> = { BTC: 60000, MSFT: 450, TWT: 0.7 };
export const assets = ['BTC', 'MSFT', 'TWT'] as const;
export const demoState: State = {
  portfolios: [
    { id: 'tradernet', name: 'Tradernet' },
    { id: 'binance', name: 'Binance' },
    { id: 'bybit', name: 'Bybit' },
  ],
  buys: [
    {
      id: 'msft',
      portfolioId: 'tradernet',
      asset: 'MSFT',
      quantity: 2,
      price: 500,
      fee: 0,
      fx: 100,
      date: '2026-01-15',
    },
    {
      id: 'btc',
      portfolioId: 'binance',
      asset: 'BTC',
      quantity: 0.04,
      price: 55000,
      fee: 5,
      fx: 95,
      date: '2026-04-10',
    },
    {
      id: 'twt',
      portfolioId: 'bybit',
      asset: 'TWT',
      quantity: 200,
      price: 0.8,
      fee: 1,
      fx: 105,
      date: '2026-07-02',
    },
  ],
};

export function selectedBuys(state: State, portfolioId: string) {
  const ids = portfolioId.split(',').map((id) => id.trim());
  return state.buys.filter((buy) => portfolioId === 'all' || ids.includes(buy.portfolioId));
}

export function totals(buys: readonly Buy[], currency: Currency) {
  const value =
    buys.reduce((sum, buy) => sum + buy.quantity * prices[buy.asset], 0) *
    (currency === 'RUB' ? currentFX : 1);
  const basis = buys.reduce(
    (sum, buy) => sum + (buy.quantity * buy.price + buy.fee) * (currency === 'RUB' ? buy.fx : 1),
    0,
  );
  const profit = value - basis;
  return { value, basis, profit, percentage: basis > 0 ? (profit / basis) * 100 : null };
}

export function summarize(state: State, portfolioId: string, currency: Currency) {
  return totals(selectedBuys(state, portfolioId), currency);
}

export function attribution(buys: readonly Buy[], currency: Currency) {
  return buys.reduce(
    (effects, buy) => {
      const difference = buy.quantity * prices[buy.asset] - buy.quantity * buy.price;
      const rateChange = currency === 'RUB' ? currentFX - buy.fx : 0;
      const initialRate = currency === 'RUB' ? buy.fx : 1;
      return {
        price: effects.price + difference * initialRate,
        fx: effects.fx + buy.quantity * buy.price * rateChange,
        interaction: effects.interaction + difference * rateChange,
        fees: effects.fees - buy.fee * initialRate,
      };
    },
    { price: 0, fx: 0, interaction: 0, fees: 0 },
  );
}

export function validateName(name: string): 'name' | undefined {
  return name.trim().length > 0 && name.trim().length <= 80 ? undefined : 'name';
}

function decimalNumber(value: string) {
  const trimmed = value.trim();
  return /^(?:\d+|\d+[.,]\d+)$/u.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN;
}

function validNumber(number: number, max: number, allowZero = false) {
  return Number.isFinite(number) && (allowZero ? number >= 0 : number > 0) && number <= max;
}

function validDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/u.test(date) &&
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    date >= '2000-01-01' &&
    date <= assessmentDate
  );
}

export function validateBuy(input: BuyInput): BuyErrors {
  const quantity = decimalNumber(input.quantity);
  const price = decimalNumber(input.price);
  const fee = decimalNumber(input.fee);
  const fx = decimalNumber(input.fx);
  const amount = quantity * price + fee;
  return {
    ...(!validNumber(quantity, 1e6) ? { quantity: 'positive' as const } : {}),
    ...(!validNumber(price, 1e7) ? { price: 'positive' as const } : {}),
    ...(!validNumber(fx, 10000) ? { fx: 'positive' as const } : {}),
    ...(!validNumber(fee, 1e7, true) ? { fee: 'fee' as const } : {}),
    ...(!validDate(input.date) ? { date: 'date' as const } : {}),
    ...(!assets.some((asset) => asset === input.asset) ? { asset: 'asset' as const } : {}),
    ...(amount > 1e9 || amount * fx > 1e12 ? { price: 'total' as const } : {}),
  };
}
