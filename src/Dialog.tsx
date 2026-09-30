import { getLabels } from './i18n.ts';
import type { Language, Labels } from './i18n.ts';
import type { KeyboardEvent } from 'react';

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
    dialog.showModal();
  }
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
        ×
      </button>
    </div>
  );
}
export function FormActions({ dialog, labels }: Readonly<{ dialog: string; labels: Labels }>) {
  return (
    <div className="form-actions">
      <button type="button" onClick={() => closeDialog(dialog)}>
        {labels.cancel}
      </button>
      <button type="submit" className="primary">
        {labels.save}
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
      <p>{labels.privacyText}</p>
      <button className="primary" onClick={() => closeDialog('privacy-dialog')}>
        {labels.close}
      </button>
    </dialog>
  );
}
