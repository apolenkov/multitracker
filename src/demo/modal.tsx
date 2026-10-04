import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { closeDialog, keepDialogFocus, openDialog } from '../Dialog.tsx';
import type { Language } from './words.ts';
import { Icon } from '../Icon.tsx';

type Props = Readonly<{
  id: string;
  title: string;
  language: Language;
  onClose: () => void;
  children: ReactNode;
}>;

export function DemoModal({ id, title, language, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeEvent = useEffectEvent(onClose);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    openDialog(dialog.id);
    // «close» — недискретное событие React: dispatch и setState из onClose ждут
    // очереди, и повторный клик либо схлопывается в bail (диалог навсегда закрыт
    // при open:true), либо устаревшее закрытие коммитится после открытия и
    // размонтирует свежий диалог. Свой слушатель коммитит размонт синхронно
    // внутри задачи close; если родитель оставил компонент смонтированным,
    // диалог открывается заново — пока модальное место не занял другой диалог.
    const closed = () => {
      flushSync(() => closeEvent());
      const dialog = ref.current;
      if (dialog && !dialog.open && !document.querySelector('dialog[open]')) openDialog(dialog.id);
    };
    dialog.addEventListener('close', closed);
    return () => {
      dialog.removeEventListener('close', closed);
      if (dialog.open) dialog.close();
      restoreFocus(previous);
    };
  }, []);
  return (
    <dialog
      id={id}
      ref={ref}
      className="demo-dialog"
      aria-labelledby={`${id}-title`}
      onKeyDown={keepDialogFocus}
    >
      <div className="dialog-heading">
        <h2 id={`${id}-title`}>{title}</h2>
        <button
          type="button"
          className="icon-close"
          aria-label={language === 'ru' ? 'Закрыть' : 'Close'}
          onClick={() => closeDialog(id)}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="demo-dialog-body">{children}</div>
    </dialog>
  );
}

function restoreFocus(previous: Element | null) {
  if (document.querySelector('dialog[open]')) return;
  const target =
    previous instanceof HTMLElement && previous.isConnected && previous.checkVisibility()
      ? previous
      : document.querySelector<HTMLElement>('main');
  target?.focus();
}
