/** Детерминированный mulberry32: следующее состояние и значение без изменения входа. */
export const nextRandom = (state: number): Readonly<{ value: number; state: number }> => {
  const next = (state + 0x6d2b79f5) >>> 0;
  const a = Math.imul(next ^ (next >>> 15), next | 1);
  const b = a ^ (a + Math.imul(a ^ (a >>> 7), a | 61));
  return { value: ((b ^ (b >>> 14)) >>> 0) / 4294967296, state: next };
};

export const randoms = (seed: number, count: number): readonly number[] =>
  Array.from({ length: count }, () => 0).reduce<{
    state: number;
    values: readonly number[];
  }>(
    (acc) => {
      const next = nextRandom(acc.state);
      return { state: next.state, values: [...acc.values, next.value] };
    },
    { state: seed >>> 0, values: [] },
  ).values;

export const pick = <T>(items: readonly T[], value: number): T | undefined =>
  items.at(Math.min(items.length - 1, Math.floor(value * items.length)));

export const shuffle = <T>(items: readonly T[], seed: number): readonly T[] => {
  const orders = randoms(seed, items.length);
  return items
    .map((item, index) => ({ item, order: orders.at(index) ?? 0 }))
    .toSorted((a, b) => a.order - b.order)
    .map((pair) => pair.item);
};
