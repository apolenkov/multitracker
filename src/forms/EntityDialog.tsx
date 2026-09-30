import { useState } from 'react';
import type { FormEvent } from 'react';
import { getLabels } from '../i18n.ts';
import { validateName } from '../model/portfolio.ts';
import { closeDialog, DialogHeading, FormActions, keepDialogFocus } from '../Dialog.tsx';
import { getFormCopy } from './copy.ts';
import { EntityFields, EntityError } from './EntityFields.tsx';
import type { EntityProps } from './EntityFields.tsx';
import { presentationCopy } from './presentation.ts';
type Props = EntityProps;
const isDestructive = (action: Props['action']) => action === 'archive' || action === 'delete';
export function EntityDialog(props: Props) {
  const form = useEntity(props);
  const labels = getLabels(props.language);
  const copy = getFormCopy(props.language);
  return (
    <dialog
      className="entity-dialog"
      id={props.id}
      aria-labelledby={`${props.id}-title`}
      onClose={form.reset}
      onKeyDown={keepDialogFocus}
    >
      <form noValidate autoComplete="off" onSubmit={form.submit}>
        <DialogHeading
          title={`${copy.action[props.action]} ${copy.entity[props.entity]}`}
          id={`${props.id}-title`}
          dialog={props.id}
          labels={labels}
        />
        <p className="form-sample">{presentationCopy(props.language).sample}</p>
        {isDestructive(props.action) ? (
          <Confirmation
            props={props}
            error={form.error}
            confirmed={form.confirmed}
            setConfirmed={form.setConfirmed}
          />
        ) : (
          <EntityFields props={props} {...form} />
        )}
        <FormActions
          dialog={props.id}
          labels={labels}
          submitLabel={
            props.action === 'edit'
              ? presentationCopy(props.language).edit
              : `${copy.action[props.action]} ${copy.entity[props.entity]}`
          }
          destructive={props.action === 'delete'}
        />
      </form>
    </dialog>
  );
}
function useEntity(props: Props) {
  const [name, setName] = useState(props.name);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const initialMembers = props.members ?? [];
  const [members, setMembers] = useState<readonly string[]>(initialMembers);
  const onMember = (id: string, checked: boolean) =>
    setMembers((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  const reset = () => {
    setName(props.name);
    setConfirmed(false);
    setError('');
    setMembers(initialMembers);
    document.querySelector<HTMLFormElement>(`#${props.id} form`)?.reset();
    props.onClose?.();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = entityError(props, name, confirmed, members);
    setError(message);
    if (message) {
      focusEntityError(props, message);
      return;
    }
    closeDialog(props.id);
    props.onSaved(getLabels(props.language).created);
  };
  return { name, setName, confirmed, setConfirmed, error, reset, submit, members, onMember };
}
function Confirmation({
  props,
  error,
  confirmed,
  setConfirmed,
}: Readonly<{
  props: Props;
  error: string;
  confirmed: boolean;
  setConfirmed: (confirmed: boolean) => void;
}>) {
  const copy = getFormCopy(props.language);
  return (
    <>
      <p className="entity-subject">{props.name}</p>
      <p>{props.action === 'archive' ? copy.archiveNote : copy.deleteNote}</p>
      <label className="confirmation" htmlFor={`${props.id}-confirm`}>
        <input
          id={`${props.id}-confirm`}
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${props.id}-error` : undefined}
        />
        {copy.confirmation}
      </label>
      {error && <EntityError id={props.id} error={error} />}
    </>
  );
}
function entityError(props: Props, name: string, confirmed: boolean, members: readonly string[]) {
  const copy = getFormCopy(props.language);
  if (isDestructive(props.action)) return confirmed ? '' : copy.confirmError;
  if (validateName(name)) return getLabels(props.language).nameError;
  if (props.entity === 'group' && members.length === 0) return copy.selectionError;
  return '';
}

function focusEntityError(props: Props, message: string) {
  if (props.entity === 'group' && message === getFormCopy(props.language).selectionError) {
    document
      .getElementById(`${props.id}-members`)
      ?.querySelector<HTMLInputElement>('input')
      ?.focus();
    return;
  }
  document
    .getElementById(`${props.id}-${isDestructive(props.action) ? 'confirm' : 'name'}`)
    ?.focus();
}
