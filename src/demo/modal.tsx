import { useEffect, useEffectEvent, useRef, type ReactNode, type Ref } from 'react';
import { flushSync } from 'react-dom';
import { closeDialog, keepDialogFocus, openDialog } from '../Dialog.tsx';
import { elementInViewport } from '../viewport.ts';
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
  useEffect(() => dialogSession(ref.current, closeEvent), []);
  return (
    <ModalDialog id={id} title={title} language={language} ref={ref}>
      {children}
    </ModalDialog>
  );
}

/**
 * Жизненный цикл смонтированного dialog: открытие, задача события close,
 * размонт. «close» — недискретное событие React: dispatch и setState из
 * onClose ждут очереди, и повторный клик либо схлопывается в bail (диалог
 * навсегда закрыт при open:true), либо устаревшее закрытие коммитится после
 * открытия и размонтирует свежий диалог. Свой слушатель коммитит размонт
 * синхронно внутри задачи close; событие, дошедшее до уже переоткрытого
 * элемента, устарело и пропускается. Перевыставлять showModal по
 * смонтированности нельзя: закрытие пользователя обязано заканчиваться
 * закрытым диалогом при любом onClose родителя — иначе no-op ловит пользователя.
 */
function dialogSession(dialog: HTMLDialogElement | null, closeEvent: () => void) {
  if (!dialog) return;
  const previous = document.activeElement;
  openDialog(dialog.id);
  const closed = () => {
    if (dialog.open) return;
    flushSync(() => closeEvent());
  };
  // Щелчок по подложке (target — сам dialog) — путь закрытия как у Escape/X.
  const dismiss = (event: MouseEvent) => {
    if (event.target === dialog) dialog.close();
  };
  dialog.addEventListener('close', closed);
  dialog.addEventListener('click', dismiss);
  return () => {
    dialog.removeEventListener('close', closed);
    dialog.removeEventListener('click', dismiss);
    if (dialog.open) dialog.close();
    restoreFocus(previous);
  };
}

function ModalDialog({
  id,
  title,
  language,
  ref,
  children,
}: Readonly<Omit<Props, 'onClose'> & { ref: Ref<HTMLDialogElement> }>) {
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
    previous instanceof HTMLElement && previous.isConnected && elementInViewport(previous)
      ? previous
      : document.querySelector<HTMLElement>('main');
  target?.focus();
}
