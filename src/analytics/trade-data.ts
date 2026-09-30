import type { Period } from './types.ts';

export const tradePlatforms = ['North', 'South', 'Harbor'] as const;
type Trade = Readonly<{
  day: string;
  platform: (typeof tradePlatforms)[number];
  asset: string;
  kind: 'buy' | 'sell';
  units: number;
}>;
export const trades: readonly Trade[] = [
  { day: '2026-01-12', platform: 'North', asset: 'North', kind: 'buy', units: 3 },
  { day: '2026-02-20', platform: 'South', asset: 'South', kind: 'buy', units: 5 },
  { day: '2026-04-11', platform: 'Harbor', asset: 'Beacon', kind: 'buy', units: 2 },
  { day: '2026-05-14', platform: 'North', asset: 'North', kind: 'sell', units: 1 },
  { day: '2026-07-09', platform: 'North', asset: 'North', kind: 'buy', units: 2 },
  { day: '2026-07-20', platform: 'South', asset: 'South', kind: 'sell', units: 2 },
  { day: '2026-08-06', platform: 'Harbor', asset: 'Beacon', kind: 'sell', units: 1 },
  { day: '2026-08-21', platform: 'North', asset: 'North', kind: 'sell', units: 1 },
  { day: '2026-09-03', platform: 'North', asset: 'North', kind: 'buy', units: 2 },
  { day: '2026-09-10', platform: 'South', asset: 'South', kind: 'buy', units: 1 },
  { day: '2026-09-16', platform: 'Harbor', asset: 'Beacon', kind: 'buy', units: 3 },
  { day: '2026-09-23', platform: 'North', asset: 'North', kind: 'sell', units: 1 },
];

const starts = { month: '2026-09-01', quarter: '2026-07-01', year: '2026-01-01' } as const;
export const periodTrades = (period: Period) =>
  trades.filter(
    (trade) => trade.day >= (new Map(Object.entries(starts)).get(period) ?? starts.year),
  );
