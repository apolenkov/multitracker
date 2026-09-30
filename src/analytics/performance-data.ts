import type { Period } from './types.ts';

type Point = readonly [
  day: string,
  worth: number,
  flows: number,
  result: number,
  benchmark: number,
  bond: number,
];
type Scene = Readonly<{ result: number; return: number; points: readonly Point[] }>;

export const performanceScenes: Readonly<Record<Period, Scene>> = {
  month: {
    result: 200,
    return: 1.82,
    points: [
      ['2026-09-01', 11000, 0, 0, 0, 0],
      ['2026-09-10', 11110, 0, 1, 0.5, 0.2],
      ['2026-09-20', 10945, 0, -0.5, 1, 0.4],
      ['2026-09-30', 11700, 500, 1.82, 1.5, 0.6],
    ],
  },
  quarter: {
    result: 1200,
    return: 12,
    points: [
      ['2026-07-01', 10000, 0, 0, 0, 0],
      ['2026-08-01', 10600, 0, 6, 3, 0.5],
      ['2026-09-01', 10900, 0, 9, 2, 1],
      ['2026-09-30', 11700, 500, 12, 8, 1.5],
    ],
  },
  year: {
    result: 1200,
    return: 15,
    points: [
      ['2026-01-01', 8000, 0, 0, 0, 0],
      ['2026-04-01', 7600, 0, -5, -2, 1],
      ['2026-07-01', 8640, 0, 8, 6, 2],
      ['2026-09-30', 11700, 2500, 15, 10, 3],
    ],
  },
};
