import { useState } from 'react';

/** Одно открытие модального диалога: какой диалог и его монотонный nonce. */
export type ModalSession<K> = Readonly<{ kind: K; nonce: number }>;

export type ModalControl<K> = Readonly<{
  current: ModalSession<K> | null;
  open: (kind: K) => void;
  close: () => void;
}>;

/**
 * Следующая сессия — всегда новый объект, даже при том же kind: повторное
 * открытие не схлопывается в bail, а key={nonce} перемонтирует диалог, и
 * событие close, поставленное в очередь до повторного открытия, приходит к
 * уже снятому элементу.
 */
export const nextSession = <K>(prev: ModalSession<K> | null, kind: K): ModalSession<K> => ({
  kind,
  nonce: (prev?.nonce ?? -1) + 1,
});

/** Состояние динамического DemoModal: open(kind) — свежая сессия, close — null. */
export function useModalSession<K>(): ModalControl<K> {
  const [current, setCurrent] = useState<ModalSession<K> | null>(null);
  const open = (kind: K) => setCurrent((prev) => nextSession(prev, kind));
  const close = () => setCurrent(null);
  return { current, open, close };
}
