/** Планы блужданий части (b): детерминированные последовательности путей по сиду. */
import { shuffle } from './prng.ts';

export const walkSeeds = [7, 42] as const;
export const walkDepth = 6;

const oneWalk = (
  paths: readonly string[],
  seed: number,
  index: number,
  depth: number,
): readonly string[] => shuffle(paths, seed + index).slice(0, depth);

/** count последовательностей длиной depth из путей, сид сдвигается по индексу. */
export const walkSequences = (
  paths: readonly string[],
  seed: number,
  count: number,
  depth: number,
): readonly (readonly string[])[] =>
  Array.from({ length: count }, (_, index) => oneWalk(paths, seed, index, depth));
