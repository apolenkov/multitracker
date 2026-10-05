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

// Фокус потерян вместе с уведомлением: сброшен в body/ничего или ещё внутри
// снятого узла. Фокус, уведённый пользователем или навигацией, не трогаем.
const focusLost = (notice: HTMLElement | null) => {
  const active = document.activeElement;
  return !active || active === document.body || notice?.contains(active) === true;
};

// Цель возврата: действие, с которого убрали строку; иначе первое видимое
// действие записи; в крайнем случае — main. body — «никто»: диалог мог
// захлопнуться до эффекта и вернуть activeElement в документ.
const returnTarget = (opener: Element | null, container: Element | null | undefined) => {
  const fallback = container?.querySelector<HTMLElement>('.history-row-open, .row-action, button');
  if (visible(opener) && opener !== document.body) return opener;
  return visible(fallback) ? fallback : document.getElementById('main');
};

// При повторном монтировании (StrictMode) узел остаётся в DOM и запасной кадр
// сам себя отменяет по isConnected — общего состояния не нужно.
const restoreNoticeFocus = (
  notice: HTMLElement | null,
  opener: Element | null,
  container: Element | null | undefined,
) => {
  if (notice?.isConnected === true || !focusLost(notice)) return;
  // Прокрутку не отменяем: scroll-padding документа выводит цель
  // из-под закреплённой навигации и показанной плашки.
  returnTarget(opener, container)?.focus();
};

// Встроенное уведомление вместо убранной строки: та же высота, фокус на «Отменить».
// detail несёт контекст («расчёт не изменён») в имя живого региона. При монтировании
// запоминается действие строки (удаление/отзыв); отмена возвращает на него фокус —
// только если фокус потерян вместе с уведомлением; уведённый фокус остаётся у
// пользователя. Если действие исчезло вместе с диалогом — первое видимое в записи.
export function RowNotice({
  text,
  detail,
  language,
  onUndo,
}: Readonly<{ text: string; detail?: string; language: Language; onUndo: () => void }>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const notice = ref.current;
    const opener = document.activeElement;
    const container = notice?.parentElement;
    const frame = requestAnimationFrame(() =>
      notice?.querySelector<HTMLElement>('.undo-action')?.focus(),
    );
    return () => {
      cancelAnimationFrame(frame);
      // Кадр после размонтирования: запись снова видна и её действия доступны.
      requestAnimationFrame(() => restoreNoticeFocus(notice, opener, container));
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
