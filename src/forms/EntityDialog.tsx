import { useState } from 'react';
import type { FormEvent } from 'react';
import { getLabels } from '../i18n.ts';
import { validateName } from '../model/portfolio.ts';
import { closeDialog, DialogHeading, FormActions, keepDialogFocus } from '../Dialog.tsx';
import { getFormCopy } from './copy.ts';
import { EntityFields } from './EntityFields.tsx';
import type { EntityProps } from './EntityFields.tsx';
import { presentationCopy } from './presentation.ts';
type Props = EntityProps;
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
        <EntityFields props={props} {...form} />
        <FormActions
          dialog={props.id}
          labels={labels}
          submitLabel={
            props.action === 'edit'
              ? presentationCopy(props.language).edit
              : `${copy.action.create} ${copy.entity[props.entity]}`
          }
          extra={props.action === 'edit' && <RemoveActions {...props} />}
        />
      </form>
    </dialog>
  );
}
// Архив и удаление выполняются сразу; убранная строка показывает «Отменить».
function RemoveActions(props: Props) {
  const copy = getFormCopy(props.language);
  const onRemove = props.onRemove;
  if (!onRemove) return null;
  return (['archive', 'delete'] as const).map((action) => (
    <button
      key={action}
      type="button"
      className={action === 'delete' ? 'danger' : undefined}
      aria-label={`${action === 'archive' ? copy.remove.archive : copy.remove.delete}: ${props.name}`}
      onClick={() => {
        closeDialog(props.id);
        onRemove(action);
      }}
    >
      {action === 'archive' ? copy.remove.archive : copy.remove.delete}
    </button>
  ));
}
function useEntity(props: Props) {
  const [name, setName] = useState(props.name);
  const [error, setError] = useState('');
  const initialMembers = props.members ?? [];
  const [members, setMembers] = useState<readonly string[]>(initialMembers);
  const onMember = (id: string, checked: boolean) =>
    setMembers((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  const reset = () => {
    setName(props.name);
    setError('');
    setMembers(initialMembers);
    document.querySelector<HTMLFormElement>(`#${props.id} form`)?.reset();
    props.onClose?.();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = entityError(props, name, members);
    setError(message);
    if (message) {
      focusEntityError(props, message);
      return;
    }
    closeDialog(props.id);
    props.onSaved(getLabels(props.language).created);
  };
  return { name, setName, error, reset, submit, members, onMember };
}
function entityError(props: Props, name: string, members: readonly string[]) {
  const copy = getFormCopy(props.language);
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
  document.getElementById(`${props.id}-name`)?.focus();
}
