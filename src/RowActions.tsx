import { useEffect, useRef } from 'react';
import { Icon } from './Icon.tsx';
import type { Language } from './i18n.ts';

type RowActionProps = Readonly<{
  icon: 'edit' | 'trash';
  label: string;
  subject: string;
  onClick: () => void;
}>;

// Видимое действие строки: значок 22 px в цели 44×44, подсказка title и имя с объектом.
export function RowAction({ icon, label, subject, onClick }: RowActionProps) {
  return (
    <button
      type="button"
      className={icon === 'trash' ? 'row-action danger' : 'row-action'}
      aria-label={`${label}: ${subject}`}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  );
}

export function UndoButton({
  language,
  onUndo,
}: Readonly<{ language: Language; onUndo: () => void }>) {
  return (
    <button type="button" className="undo-action" onClick={onUndo}>
      {language === 'ru' ? 'Отменить' : 'Undo'}
    </button>
  );
}

const visible = (element: Element | null | undefined): element is HTMLElement =>
  element instanceof HTMLElement && element.isConnected && element.checkVisibility();

// Встроенное уведомление вместо убранной строки: та же высота, фокус на «Отменить».
// detail несёт контекст («расчёт не изменён») в имя живого региона. При монтировании
// запоминается действие строки (удаление/отзыв); отмена возвращает на него фокус —
// а если оно исчезло вместе с диалогом, на первое видимое действие записи.
export function RowNotice({
  text,
  detail,
  language,
  onUndo,
}: Readonly<{ text: string; detail?: string; language: Language; onUndo: () => void }>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement;
    const container = ref.current?.parentElement;
    const frame = requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLElement>('.undo-action')?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      // Кадр после размонтирования: запись снова видна и её действия доступны.
      // При переходе на другой раздел все цели отцеплены — остаётся #main, как у hashchange.
      requestAnimationFrame(() => {
        const fallback = container?.querySelector<HTMLElement>(
          '.history-row-open, .row-action, button',
        );
        // body — «никто»: диалог захлопнулся до эффекта и вернул activeElement в документ.
        const target =
          visible(opener) && opener !== document.body
            ? opener
            : visible(fallback)
              ? fallback
              : null;
        (target ?? document.getElementById('main'))?.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <div ref={ref} className="row-notice" role="status" aria-atomic="true" aria-label={detail}>
      <span>{text}</span>
      <UndoButton language={language} onUndo={onUndo} />
    </div>
  );
}

export const undoneText = (language: Language) =>
  language === 'ru' ? 'Действие отменено.' : 'Action undone.';
