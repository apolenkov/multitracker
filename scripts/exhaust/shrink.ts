/** Сокращение падающей последовательности до минимального воспроизведения (ddmin). */

export const splitChunks = <T>(items: readonly T[], count: number): readonly (readonly T[])[] => {
  const size = Math.max(1, Math.ceil(items.length / count));
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => i * size)
    .map((start) => items.slice(start, start + size))
    .filter((chunk) => chunk.length > 0);
};

const firstReproducing = async <T>(
  current: readonly T[],
  chunks: readonly (readonly T[])[],
  test: (candidate: readonly T[]) => Promise<boolean>,
): Promise<readonly T[] | null> =>
  await chunks.reduce<Promise<readonly T[] | null>>(async (found, chunk) => {
    const done = await found;
    if (done !== null) return done;
    const candidate = current.filter((item) => !chunk.includes(item));
    return candidate.length > 0 && candidate.length < current.length && (await test(candidate))
      ? candidate
      : null;
  }, Promise.resolve(null));

/**
 * Классический ddmin: test(candidate) = true, когда сбой воспроизводится.
 * Гранулярность растёт, пока ни одно удаление чанка не воспроизводит сбой.
 */
export const ddmin = async <T>(
  items: readonly T[],
  test: (candidate: readonly T[]) => Promise<boolean>,
): Promise<readonly T[]> => {
  const round = async (current: readonly T[], granularity: number): Promise<readonly T[]> => {
    const reduced = await firstReproducing(current, splitChunks(current, granularity), test);
    if (reduced !== null) return await round(reduced, Math.max(granularity - 1, 2));
    return granularity >= current.length ? current : await round(current, current.length);
  };
  if (!(await test(items)) || items.length < 2) return items;
  return await round(items, 2);
};
