/** Блуждания части (b): усадка падающей последовательности до минимальной. */
import { ddmin } from './shrink.ts';

/** Тонкая обёртка ddmin для путей: test true, когда сбой воспроизводится. */
export const shrinkWalk = async (
  seq: readonly string[],
  test: (candidate: readonly string[]) => Promise<boolean>,
): Promise<readonly string[]> => await ddmin(seq, test);
