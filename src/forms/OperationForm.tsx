import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getLabels } from '../i18n.ts';
import type { Language } from '../i18n.ts';
import type { State } from '../model/portfolio.ts';
import {
  closeDialog,
  DialogHeading,
  FormActions,
  keepDialogFocus,
  openDialog,
} from '../Dialog.tsx';
import { firstAccount } from './accounts.ts';
import { getFormCopy } from './copy.ts';
import {
  initialOperation,
  isOperationType,
  operationLabel,
  operationTypes,
  validateOperation,
} from './operations.ts';
import type { Field, OperationInput, OperationType, OperationErrors } from './operations.ts';
import { OperationFields } from './OperationFields.tsx';
import { presentationCopy, operationSubmit } from './presentation.ts';
export type OperationProps = Readonly<{
  id: string;
  language: Language;
  onSaved: (message: string) => void;
  state: State;
  portfolioId: string;
  initial?: Partial<OperationInput>;
  onClose?: () => void;
  title?: string;
}>;
export function openOperation(type: OperationType, context: Partial<OperationInput> = {}) {
  window.dispatchEvent(new CustomEvent('multitracker-operation', { detail: { ...context, type } }));
  openDialog('buy-dialog');
}
export function OperationForm(props: OperationProps) {
  const form = useOperation(props);
  const labels = getLabels(props.language);
  return (
    <dialog
      id={props.id}
      className="operation-dialog"
      aria-labelledby={`${props.id}-title`}
      onClose={form.reset}
      onKeyDown={keepDialogFocus}
    >
      <form noValidate autoComplete="off" onSubmit={form.submit}>
        <DialogHeading
          title={`${props.title ? `${props.title} · ` : ''}${operationLabel(form.input.type, props.language)}`}
          id={`${props.id}-title`}
          dialog={props.id}
          labels={labels}
        />
        <p className="form-sample">{presentationCopy(props.language).sample}</p>
        <TypeSelector
          type={form.input.type}
          language={props.language}
          id={props.id}
          change={form.changeType}
        />
        <OperationFields
          input={form.input}
          errors={form.errors}
          state={props.state}
          language={props.language}
          prefix={props.id}
          update={form.update}
        />
        <FormActions
          dialog={props.id}
          labels={labels}
          submitLabel={
            props.initial
              ? presentationCopy(props.language).edit
              : operationSubmit(form.input.type, props.language)
          }
        />
      </form>
    </dialog>
  );
}
function TypeSelector({
  type,
  language,
  id,
  change,
}: Readonly<{
  type: OperationType;
  language: Language;
  id: string;
  change: (type: OperationType) => void;
}>) {
  return (
    <div className="operation-kind">
      <label htmlFor={`${id}-type`}>{getFormCopy(language).type}</label>
      <select
        id={`${id}-type`}
        value={type}
        onChange={(event) => {
          if (isOperationType(event.target.value)) change(event.target.value);
        }}
      >
        {operationTypes.map((value) => (
          <option key={value} value={value}>
            {operationLabel(value, language)}
          </option>
        ))}
      </select>
    </div>
  );
}
function useOperation(props: OperationProps) {
  const create = () => operationDraft(props.state, props.portfolioId, props.initial);
  const [input, setInput] = useState<OperationInput>(create);
  const [errors, setErrors] = useState<OperationErrors>({});
  const update = (field: Field, value: string) =>
    setInput((current) => ({
      ...current,
      [field]: value,
      ...transferCurrency(current, field, value),
      ...(field === 'portfolioId' ? { account: firstAccount(value) } : {}),
      ...(field === 'targetPortfolio' ? { targetAccount: firstAccount(value) } : {}),
    }));
  const changeType = (type: OperationType) => {
    setInput((current) => ({ ...current, type }));
    setErrors({});
  };
  const reset = () => {
    setInput(create());
    setErrors({});
    props.onClose?.();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateOperation(input, props.state);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    closeDialog(props.id);
    props.onSaved(getLabels(props.language).purchased);
  };
  useEffect(() => {
    if (Object.keys(errors).length > 0)
      document
        .getElementById(props.id)
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [errors, props.id]);
  useOperationEvent(props.id, props.state, props.portfolioId, setInput, setErrors);
  return { input, errors, update, changeType, reset, submit };
}
function useOperationEvent(
  id: string,
  state: State,
  portfolioId: string,
  setInput: (input: OperationInput) => void,
  setErrors: (errors: OperationErrors) => void,
) {
  useEffect(() => {
    if (id !== 'buy-dialog') return;
    const open = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      if (
        !detail ||
        typeof detail !== 'object' ||
        !('type' in detail) ||
        !isOperationType(detail.type)
      )
        return;
      const base = initialOperation(state, portfolioId);
      const context = Object.fromEntries(
        Object.entries(detail).filter(
          ([field, value]) => Object.hasOwn(base, field) && typeof value === 'string',
        ),
      );
      setInput(operationDraft(state, portfolioId, { ...context, type: detail.type }));
      setErrors({});
    };
    window.addEventListener('multitracker-operation', open);
    return () => window.removeEventListener('multitracker-operation', open);
  }, [id, state, portfolioId, setInput, setErrors]);
}

function operationDraft(
  state: State,
  portfolioId: string,
  initial: Partial<OperationInput> = {},
): OperationInput {
  const base = initialOperation(state, initial.portfolioId ?? portfolioId);
  return { ...base, ...initial, portfolioId: base.portfolioId };
}

function transferCurrency(input: OperationInput, field: Field, value: string) {
  if (input.type !== 'transfer') return {};
  if (field === 'asset' && ['RUB', 'USD'].includes(value)) return { currency: value };
  if (field === 'currency') return { asset: value };
  return {};
}
