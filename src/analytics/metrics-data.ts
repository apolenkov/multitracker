import type { Name, Period } from './types.ts';

type Fees = readonly [trading: number, custody: number, network: number];
type Platform = Readonly<{ name: Name; fees: Readonly<Record<Period, Fees>> }>;
export const feePlatforms: readonly Platform[] = [
  {
    name: { ru: 'Учебный брокер North', en: 'Sample broker North' },
    fees: { month: [12, 3, 0], quarter: [30, 9, 0], year: [80, 27, 0] },
  },
  {
    name: { ru: 'Учебный брокер South', en: 'Sample broker South' },
    fees: { month: [5, 2, 0], quarter: [20, 6, 0], year: [60, 18, 0] },
  },
  {
    name: { ru: 'Учебная биржа Harbor', en: 'Sample exchange Harbor' },
    fees: { month: [8, 0, 2], quarter: [25, 0, 7], year: [70, 0, 15] },
  },
];

export const riskScenes: Readonly<Record<Period, Readonly<{ beta: number; pe: number }>>> = {
  month: { beta: 1.2, pe: 22 },
  quarter: { beta: 1.1, pe: 20 },
  year: { beta: 0.95, pe: 18 },
};

type Decisions = Readonly<{
  count: number;
  win: number;
  average: number;
}>;
export const decisionScenes: Readonly<Record<Period, Decisions>> = {
  month: { count: 1, win: 100, average: 45 },
  quarter: { count: 4, win: 75, average: 35 },
  year: { count: 5, win: 60, average: 10 },
};
