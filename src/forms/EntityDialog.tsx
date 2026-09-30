import { useState } from 'react';
import type { FormEvent } from 'react';
import { getLabels } from '../i18n.ts';
import type { Language } from '../i18n.ts';
import { demoState, validateName } from '../model/portfolio.ts';
import type { State } from '../model/portfolio.ts';
import { closeDialog, DialogHeading, FormActions, keepDialogFocus } from '../Dialog.tsx';
import { getFormCopy } from './copy.ts';
type Props = Readonly<{
  id: string;
  language: Language;
  entity: 'portfolio' | 'account' | 'group';
  action: 'create' | 'edit' | 'archive' | 'delete';
  name: string;
  portfolioId?: string;
  onSaved: (message: string) => void;
  onClose?: () => void;
  state?: State;
  members?: readonly string[];
}>;
type FieldsProps = Readonly<{
  props: Props;
  name: string;
  setName: (name: string) => void;
  error: string;
  members: readonly string[];
  onMember: (id: string, checked: boolean) => void;
}>;
const isDestructive = (action: Props['action']) => action === 'archive' || action === 'delete';
export function EntityDialog(props: Props) {
  const form = useEntity(props);
  const labels = getLabels(props.language);
  const copy = getFormCopy(props.language);
  return (
    <dialog
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
        <p className="quiet">{copy.noteSample}</p>
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
        {form.error && (
          <p className="field-error" id={`${props.id}-error`} role="alert">
            {form.error}
          </p>
        )}
        <FormActions dialog={props.id} labels={labels} />
      </form>
    </dialog>
  );
}
function useEntity(props: Props) {
  const [name, setName] = useState(props.name);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const initialMembers =
    props.members ?? (props.state ?? demoState).portfolios.map((item) => item.id);
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
      <p>{props.name}</p>
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
    </>
  );
}
function EntityFields({ props, name, setName, error, members, onMember }: FieldsProps) {
  const copy = getFormCopy(props.language);
  return (
    <>
      <label htmlFor={`${props.id}-name`}>{copy.entityName}</label>
      <input
        id={`${props.id}-name`}
        value={name}
        maxLength={80}
        onChange={(event) => setName(event.target.value)}
        aria-invalid={error === getLabels(props.language).nameError}
        aria-describedby={error ? `${props.id}-error` : `${props.id}-hint`}
      />
      <p className="quiet" id={`${props.id}-hint`}>
        {getLabels(props.language).nameHint}
      </p>
      <label htmlFor={`${props.id}-currency`}>{getLabels(props.language).show}</label>
      <select id={`${props.id}-currency`}>
        <option>RUB</option>
        <option>USD</option>
      </select>
      {props.entity === 'portfolio' && <VenueField props={props} />}
      {props.entity === 'account' && <AccountFields props={props} />}
      {props.entity === 'group' && (
        <GroupFields props={props} members={members} onMember={onMember} error={error} />
      )}
    </>
  );
}
function AccountFields({ props }: Readonly<{ props: Props }>) {
  const copy = getFormCopy(props.language);
  return (
    <>
      <label htmlFor={`${props.id}-kind`}>{copy.accountKind}</label>
      <select id={`${props.id}-kind`}>
        <option>{copy.broker}</option>
        <option>{copy.exchange}</option>
        <option>{copy.bank}</option>
        <option>{copy.wallet}</option>
      </select>
      <label htmlFor={`${props.id}-portfolio`}>{getLabels(props.language).portfolio}</label>
      <select id={`${props.id}-portfolio`} defaultValue={props.portfolioId}>
        {(props.state ?? demoState).portfolios.map((portfolio) => (
          <option key={portfolio.id} value={portfolio.id}>
            {portfolio.name}
          </option>
        ))}
      </select>
    </>
  );
}
function GroupFields({
  props,
  members,
  onMember,
  error,
}: Readonly<{
  props: Props;
  members: readonly string[];
  onMember: (id: string, checked: boolean) => void;
  error: string;
}>) {
  return (
    <fieldset id={`${props.id}-members`} aria-describedby={error ? `${props.id}-error` : undefined}>
      <legend>{getFormCopy(props.language).groupPortfolios}</legend>
      {(props.state ?? demoState).portfolios.map((portfolio) => (
        <label className="confirmation" key={portfolio.id}>
          <input
            type="checkbox"
            checked={members.includes(portfolio.id)}
            onChange={(event) => onMember(portfolio.id, event.target.checked)}
            aria-invalid={members.length === 0 && Boolean(error)}
          />
          {portfolio.name}
        </label>
      ))}
    </fieldset>
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

function VenueField({ props }: Readonly<{ props: Props }>) {
  const copy = getFormCopy(props.language);
  return (
    <>
      <label htmlFor={`${props.id}-venue`}>{getLabels(props.language).venue}</label>
      <select id={`${props.id}-venue`}>
        <option>Tradernet</option>
        <option>Binance</option>
        <option>Bybit</option>
        <option>{copy.bank}</option>
        <option>{copy.wallet}</option>
      </select>
    </>
  );
}
