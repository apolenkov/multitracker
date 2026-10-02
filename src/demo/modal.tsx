import { useEffect, useRef, type ReactNode } from 'react';
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
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement;
    openDialog(dialog.id);
    return () => {
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
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
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
