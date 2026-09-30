import type { State } from '../model/portfolio.ts';
import { assessmentDate } from '../model/portfolio.ts';
import type { Language } from '../i18n.ts';
import { getFormCopy } from './copy.ts';
import { accountSamples, accountLabel } from './accounts.ts';
import { feeCurrencies, operationAssets, operationFields } from './operations.ts';
import type { Field, OperationInput, OperationErrors } from './operations.ts';
type Props = Readonly<{
  input: OperationInput;
  errors: OperationErrors;
  state: State;
  language: Language;
  prefix: string;
  update: (field: Field, value: string) => void;
}>;
type ControlProps = Readonly<{
  field: Field;
  id: string;
  value: string;
  error: string | undefined;
  update: Props['update'];
}>;
export function OperationFields(props: Props) {
  const fields: readonly Field[] = [
    'portfolioId',
    'account',
    ...operationFields(props.input.type, props.input.asset),
  ];
  return (
    <div className="form-grid">
      {fields.map((field) => (
        <OperationField key={field} {...props} field={field} />
      ))}
    </div>
  );
}
function fieldOptions(field: Field, state: State, input: OperationInput, language: Language) {
  if (field === 'portfolioId' || field === 'targetPortfolio')
    return state.portfolios.map((item) => ({ value: item.id, label: item.name }));
  if (field === 'asset') return operationAssets.map((value) => ({ value, label: value }));
  if (field === 'account' || field === 'targetAccount')
    return accountSamples
      .filter(
        (item) =>
          item.portfolioId === (field === 'account' ? input.portfolioId : input.targetPortfolio),
      )
      .map((item) => ({ value: item.id, label: accountLabel(item.id, language) }));
  if (field === 'feeCurrency')
    return feeCurrencies(input).map((value) => ({ value, label: value }));
  if (['currency', 'targetCurrency', 'priceCurrency'].includes(field))
    return ['RUB', 'USD'].map((value) => ({ value, label: value }));
  return undefined;
}
function OperationField({ field, ...props }: Props & Readonly<{ field: Field }>) {
  const labels = getFormCopy(props.language);
  const id = `${props.prefix}-${field}`;
  const error = new Map(Object.entries(props.errors)).get(field);
  const value = new Map(Object.entries(props.input)).get(field) ?? '';
  const control = { id, field, error, value, update: props.update };
  const options = fieldOptions(field, props.state, props.input, props.language);
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {field === 'external'
          ? props.input.type === 'deposit'
            ? labels.externalSource
            : labels.externalDestination
          : new Map(Object.entries(labels)).get(field)}
      </label>
      {options ? (
        <select
          id={id}
          name={field}
          value={value}
          onChange={(event) => props.update(field, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <option value="">{labels.selectionError}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <OperationInputControl {...control} />
      )}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {errorText(error, props.language)}
        </p>
      )}
    </div>
  );
}
function OperationInputControl({ field, id, value, update, error }: ControlProps) {
  const textField = ['note', 'external'].includes(field);
  return (
    <input
      id={id}
      name={field}
      type={field === 'date' ? 'date' : 'text'}
      inputMode={field === 'date' || textField ? undefined : 'decimal'}
      min={field === 'date' ? '2000-01-01' : undefined}
      max={field === 'date' ? assessmentDate : undefined}
      maxLength={field === 'external' ? 120 : textField ? 200 : 30}
      value={value}
      onChange={(event) => update(field, event.target.value)}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
    />
  );
}
function errorText(error: string, language: Language) {
  const labels = getFormCopy(language);
  const messages = {
    positive: labels.positive,
    fee: labels.positive,
    total: labels.positive,
    date: labels.dateError,
    asset: labels.selectionError,
    portfolio: labels.selectionError,
    destination: labels.destination,
    currency: labels.currencyError,
    cashCurrency: labels.selectionError,
    note: labels.noteError,
    external: labels.externalError,
  };
  return new Map(Object.entries(messages)).get(error) ?? labels.selectionError;
}
