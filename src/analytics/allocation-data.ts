import type { Name, Period } from './types.ts';

export type Slice = 'class' | 'sector' | 'geography' | 'size' | 'location' | 'exchange';
type Row = Readonly<{ name: Name; weights: Readonly<Record<Period, number>> }>;
export const slices: readonly Slice[] = [
  'class',
  'sector',
  'geography',
  'size',
  'location',
  'exchange',
];
export const allocationRows: Readonly<Record<Exclude<Slice, 'size' | 'exchange'>, readonly Row[]>> =
  {
    class: [
      { name: { ru: 'Акции', en: 'Stocks' }, weights: { month: 55, quarter: 50, year: 45 } },
      { name: { ru: 'Облигации', en: 'Bonds' }, weights: { month: 25, quarter: 30, year: 35 } },
      {
        name: { ru: 'Криптоактивы', en: 'Cryptoassets' },
        weights: { month: 15, quarter: 15, year: 10 },
      },
      { name: { ru: 'Деньги', en: 'Cash' }, weights: { month: 5, quarter: 5, year: 10 } },
    ],
    sector: [
      {
        name: { ru: 'Технологии', en: 'Technology' },
        weights: { month: 40, quarter: 35, year: 30 },
      },
      {
        name: { ru: 'Здравоохранение', en: 'Healthcare' },
        weights: { month: 15, quarter: 15, year: 15 },
      },
      {
        name: {
          ru: 'Без сектора: облигации, крипто и деньги',
          en: 'No sector: bonds, crypto and cash',
        },
        weights: { month: 45, quarter: 50, year: 55 },
      },
    ],
    geography: [
      {
        name: { ru: 'Северная Америка', en: 'North America' },
        weights: { month: 55, quarter: 50, year: 45 },
      },
      { name: { ru: 'Европа', en: 'Europe' }, weights: { month: 25, quarter: 30, year: 35 } },
      {
        name: { ru: 'Глобальная / не определена', en: 'Global / unassigned' },
        weights: { month: 20, quarter: 20, year: 20 },
      },
    ],
    location: [
      {
        name: { ru: 'Брокерский счёт', en: 'Brokerage account' },
        weights: { month: 80, quarter: 80, year: 80 },
      },
      {
        name: { ru: 'Спотовая биржа', en: 'Spot exchange' },
        weights: { month: 10, quarter: 8, year: 5 },
      },
      {
        name: { ru: 'Личный кошелёк', en: 'Personal wallet' },
        weights: { month: 5, quarter: 7, year: 5 },
      },
      {
        name: { ru: 'Банковский счёт', en: 'Bank account' },
        weights: { month: 5, quarter: 5, year: 10 },
      },
    ],
  };

export const locationAssets: readonly Row[] = [
  {
    name: { ru: 'North · брокер', en: 'North · broker' },
    weights: { month: 40, quarter: 35, year: 30 },
  },
  {
    name: { ru: 'South · брокер', en: 'South · broker' },
    weights: { month: 15, quarter: 15, year: 15 },
  },
  {
    name: { ru: 'Atlas · брокер', en: 'Atlas · broker' },
    weights: { month: 25, quarter: 30, year: 35 },
  },
  {
    name: { ru: 'Beacon · биржа', en: 'Beacon · exchange' },
    weights: { month: 10, quarter: 8, year: 5 },
  },
  {
    name: { ru: 'Beacon · кошелёк', en: 'Beacon · wallet' },
    weights: { month: 5, quarter: 7, year: 5 },
  },
  { name: { ru: 'Деньги · банк', en: 'Cash · bank' }, weights: { month: 5, quarter: 5, year: 10 } },
];
