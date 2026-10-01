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

// Встроенное уведомление вместо убранной строки: та же высота, фокус на «Отменить».
export function RowNotice({
  text,
  language,
  onUndo,
}: Readonly<{ text: string; language: Language; onUndo: () => void }>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLElement>('.undo-action')?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div ref={ref} className="row-notice" role="status" aria-atomic="true">
      <span>{text}</span>
      <UndoButton language={language} onUndo={onUndo} />
    </div>
  );
}

export const undoneText = (language: Language) =>
  language === 'ru' ? 'Действие отменено.' : 'Action undone.';
