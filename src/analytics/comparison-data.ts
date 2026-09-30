import type { Name, Period } from './types.ts';

type ComparisonAsset = Readonly<{
  id: string;
  name: Name;
  prices: Readonly<Record<Period, readonly number[]>>;
}>;
export const comparisonAssets: readonly ComparisonAsset[] = [
  {
    id: 'north',
    name: { ru: 'Акция North', en: 'North stock' },
    prices: { month: [100, 105, 99, 110], quarter: [80, 88, 90, 95], year: [60, 66, 72, 80] },
  },
  {
    id: 'south',
    name: { ru: 'Акция South', en: 'South stock' },
    prices: { month: [60, 55, 50, 45], quarter: [50, 55, 53, 60], year: [45, 42, 49, 55] },
  },
  {
    id: 'atlas',
    name: { ru: 'Облигация Atlas', en: 'Atlas bond' },
    prices: { month: [99, 100, 100, 101], quarter: [97, 98, 99, 99], year: [96, 98, 99, 100] },
  },
  {
    id: 'beacon',
    name: { ru: 'Монета Beacon', en: 'Beacon coin' },
    prices: { month: [20, 25, 22, 18], quarter: [16, 14, 19, 23], year: [8, 13, 10, 12] },
  },
  {
    id: 'cedar',
    name: { ru: 'Фонд Cedar', en: 'Cedar fund' },
    prices: { month: [70, 71, 73, 75], quarter: [60, 65, 62, 68], year: [50, 55, 61, 65] },
  },
];
