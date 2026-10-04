import { useState } from 'react';

/** Одно открытие модального диалога: какой диалог и его монотонный nonce. */
export type ModalSession<K> = Readonly<{ kind: K; nonce: number }>;

export type State<K> = Readonly<{ current: ModalSession<K> | null; next: number }>;

export type ModalControl<K> = Readonly<{
  current: ModalSession<K> | null;
  open: (kind: K) => void;
  close: (nonce: number) => void;
  reset: () => void;
}>;

/**
 * Открытие — всегда новая сессия с монотонным nonce: повторное открытие
 * того же kind не схлопывается в bail, key={nonce} перемонтирует диалог,
 * и событие close, поставленное в очередь до повторного открытия, приходит
 * к уже снятому элементу. Счётчик живёт в состоянии и не переиспользуется
 * после закрытия — устаревший nonce всегда отличим от свежего.
 */
export const openSession = <K>(state: State<K>, kind: K): State<K> => ({
  current: { kind, nonce: state.next },
  next: state.next + 1,
});

/**
 * Закрытие по nonce: снимает только свою сессию. Событие close — отдельная
 * задача: flushSync внутри неё применяет и висячее открытие, и само закрытие
 * в порядке постановки — без охраны устаревшее close(null) обнуляет свежую
 * сессию, и повторно открытый диалог умирает, не успев смонтироваться.
 */
export const closeSession = <K>(state: State<K>, nonce: number): State<K> =>
  state.current?.nonce === nonce ? { ...state, current: null } : state;

/**
 * Состояние динамического DemoModal: open(kind) — свежая сессия,
 * close(nonce) — сессия просит закрыться (чужой nonce игнорируется),
 * reset — родитель завершает текущую сессию безусловно (confirm/save).
 */
export function useModalSession<K>(): ModalControl<K> {
  const [state, setState] = useState<State<K>>({ current: null, next: 0 });
  const open = (kind: K) => setState((s) => openSession(s, kind));
  const close = (nonce: number) => setState((s) => closeSession(s, nonce));
  const reset = () => setState((s) => ({ ...s, current: null }));
  return { current: state.current, open, close, reset };
}
