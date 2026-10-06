import { Icon } from './Icon.tsx';
import { getLabels } from './i18n.ts';
import type { Language, Labels } from './i18n.ts';
import type { KeyboardEvent, ReactNode } from 'react';

export function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return;
  const dialog = event.currentTarget;
  const controls = Array.from(
    dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'),
  ).filter(
    (control) =>
      control.tabIndex >= 0 &&
      !control.matches(':disabled') &&
      !control.closest('[hidden], [inert]') &&
      (control.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) ??
        (control.getClientRects().length > 0 &&
          getComputedStyle(control).visibility === 'visible')),
  );
  const first = controls.at(0);
  const last = controls.at(-1);
  if (!first) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const active = dialog.ownerDocument.activeElement;
  const [boundary, target] = event.shiftKey ? [first, last] : [last, first];
  if (active === boundary || active === dialog) {
    event.preventDefault();
    target?.focus();
  }
}

export function openDialog(id: string) {
  const dialog = document.getElementById(id);
  if (dialog instanceof HTMLDialogElement && !dialog.open && !dialog.closest('[hidden]')) {
    document
      .querySelectorAll<HTMLDialogElement>('dialog[open]')
      .forEach((current) => current.close());
    dialog.showModal();
    focusFirstEmptyField(dialog);
  }
}
/** showModal() ставит фокус на первый фокусируемый (крестик шапки); начало ввода —
    первое пустое доступное поле. Заполненные и недоступные поля пропускаются. */
function focusFirstEmptyField(dialog: HTMLDialogElement) {
  const field = Array.from(
    dialog.querySelectorAll<HTMLInputElement>('input:not([type=checkbox])'),
  ).find((input) => !input.disabled && !input.readOnly && input.value === '');
  field?.focus();
}
export function closeDialog(id: string) {
  const dialog = document.getElementById(id);
  if (dialog instanceof HTMLDialogElement) dialog.close();
}
export function DialogHeading({
  title,
  id,
  dialog,
  labels,
}: Readonly<{ title: string; id: string; dialog: string; labels: Labels }>) {
  return (
    <div className="dialog-heading">
      <h2 id={id}>{title}</h2>
      <button
        type="button"
        className="close-button"
        aria-label={labels.close}
        onClick={() => closeDialog(dialog)}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
export function FormActions({
  dialog,
  labels,
  submitLabel,
  extra,
}: Readonly<{
  dialog: string;
  labels: Labels;
  submitLabel?: string;
  extra?: ReactNode;
}>) {
  return (
    <div className="form-actions">
      {extra}
      <button type="button" onClick={() => closeDialog(dialog)}>
        {labels.cancel}
      </button>
      <button type="submit" className="primary">
        {submitLabel ?? labels.save}
      </button>
    </div>
  );
}
export function PrivacyDialog({ language }: Readonly<{ language: Language }>) {
  const labels = getLabels(language);
  return (
    <dialog id="privacy-dialog" aria-labelledby="privacy-title" onKeyDown={keepDialogFocus}>
      <DialogHeading
        title={labels.privacy}
        id="privacy-title"
        dialog="privacy-dialog"
        labels={labels}
      />
      <div className="privacy-summary">
        <p>
          {language === 'ru'
            ? 'Это учебный макет на вымышленных данных. Записи действуют только в этой вкладке.'
            : 'This is a teaching prototype with fictional data. Records last only in this tab.'}
        </p>
        <p>
          {language === 'ru'
            ? 'Файлы не читаются, данные не передаются. Не вводите настоящие сведения или ключи.'
            : 'Files are not read and data is not transmitted. Do not enter real information or keys.'}
        </p>
        <details>
          <summary>{language === 'ru' ? 'Границы макета' : 'Prototype limits'}</summary>
          <p>{labels.privacyText}</p>
        </details>
      </div>
      <button className="primary" onClick={() => closeDialog('privacy-dialog')}>
        {labels.close}
      </button>
    </dialog>
  );
}
