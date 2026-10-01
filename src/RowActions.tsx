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

// Удалённая строка уносит с собой открыватель: фокус переходит на «Отменить» видимого сообщения.
export function focusUndo() {
  requestAnimationFrame(() =>
    Array.from(document.querySelectorAll<HTMLElement>('.undo-action'))
      .find((button) => button.checkVisibility())
      ?.focus(),
  );
}

export const undoneText = (language: Language) =>
  language === 'ru' ? 'Действие отменено.' : 'Action undone.';
