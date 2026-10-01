export type HistoryPeriod = 'day' | 'month' | 'year';
export type HistoryValues = readonly [number, number, number];
type SampleHistory = Readonly<{
  symbol: string;
  day: HistoryValues;
  month: HistoryValues;
  year: HistoryValues;
}>;

const histories: readonly SampleHistory[] = [
  { symbol: 'MSFT', day: [441, 448, 450], month: [460, 435, 450], year: [405, 472, 450] },
  { symbol: 'AAPL', day: [214, 208, 210], month: [198, 216, 210], year: [180, 230, 210] },
  {
    symbol: 'BTC',
    day: [58100, 59200, 60000],
    month: [56000, 63000, 60000],
    year: [65000, 55000, 60000],
  },
  { symbol: 'ETH', day: [2460, 2380, 2400], month: [2600, 2250, 2400], year: [2800, 2100, 2400] },
  { symbol: 'SPY', day: [534, 542, 540], month: [510, 550, 540], year: [490, 565, 540] },
  { symbol: 'BOND', day: [97, 99, 98], month: [100, 96, 98], year: [102, 95, 98] },
  { symbol: 'XAU', day: [2270, 2310, 2300], month: [2190, 2320, 2300], year: [2050, 2450, 2300] },
  { symbol: 'EUR/USD', day: [1.08, 1.12, 1.1], month: [1.05, 1.15, 1.1], year: [1.02, 1.18, 1.1] },
  { symbol: 'SPX', day: [5320, 5420, 5400], month: [5100, 5500, 5400], year: [4900, 5650, 5400] },
  {
    symbol: 'NDX',
    day: [17940, 17720, 17800],
    month: [18000, 17300, 17800],
    year: [16600, 18200, 17800],
  },
  { symbol: 'MOEX', day: [2670, 2720, 2700], month: [2600, 2740, 2700], year: [2450, 2900, 2700] },
];

export function historySample(symbol: string, period: HistoryPeriod) {
  const sample = histories.find((item) => item.symbol === symbol);
  if (!sample) return undefined;
  if (period === 'month')
    return { values: sample.month, dates: ['2026-09-01', '2026-09-15', '2026-09-30'] };
  if (period === 'year')
    return { values: sample.year, dates: ['2026-01-01', '2026-06-30', '2026-09-30'] };
  return { values: sample.day, dates: ['13:00 UTC', '16:00 UTC', '18:00 UTC'] };
}

export function plotPoints(values: HistoryValues) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = high > low ? high - low : 1;
  return values
    .map((value, index) => `${index * 150},${120 - ((value - low) / range) * 100}`)
    .join(' ');
}
