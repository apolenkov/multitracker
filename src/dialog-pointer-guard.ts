import { useEffect } from 'react';

export function useDialogPointerGuard() {
  useEffect(() => {
    const lifetime = new AbortController();
    document.addEventListener('click', (event) => guardActivation(event, lifetime.signal), {
      capture: true,
      signal: lifetime.signal,
    });
    return () => lifetime.abort();
  }, []);
}

function pointerActivation(event: MouseEvent) {
  return event.isTrusted && event.button === 0 && (event.type !== 'click' || event.detail > 0);
}

function insideButton(event: MouseEvent, rect: DOMRectReadOnly) {
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function dialogContext() {
  return document.activeElement?.closest('dialog[open]') ?? null;
}

function guardActivation(event: MouseEvent, lifetime: AbortSignal) {
  if (!pointerActivation(event) || !(event.target instanceof Element)) return;
  const button = event.target.closest('button');
  if (!(button instanceof HTMLButtonElement)) return;
  const context = button.closest('dialog[open]');
  const rect = button.getBoundingClientRect();
  const controller = new AbortController();
  // Same-position repeats expire 500 ms after a modal context transition.
  const signal = AbortSignal.any([lifetime, controller.signal, AbortSignal.timeout(500)]);
  const cancel = () => controller.abort();
  const blockRepeat = (next: MouseEvent) => {
    if (next.type === 'pointerdown' && next.isTrusted && !insideButton(next, rect)) {
      cancel();
      return;
    }
    if (!pointerActivation(next)) return;
    if (dialogContext() === context) return;
    if (!insideButton(next, rect)) return;
    next.preventDefault();
    next.stopImmediatePropagation();
  };
  window.addEventListener('pointerdown', blockRepeat, { capture: true, signal });
  window.addEventListener('click', blockRepeat, { capture: true, signal });
  window.addEventListener('keydown', cancel, { capture: true, signal });
  window.addEventListener('input', cancel, { capture: true, signal });
  window.addEventListener('change', cancel, { capture: true, signal });
  document.addEventListener(
    'click',
    () => {
      // A click microtask can run before the native submit default action.
      const cleanup = window.setTimeout(() => {
        if (dialogContext() === context) controller.abort();
      }, 0);
      signal.addEventListener('abort', () => window.clearTimeout(cleanup), { once: true });
    },
    { once: true, signal },
  );
}
