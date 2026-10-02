import { useState } from 'react';
import { OperationField } from './OperationControl.tsx';
import type { OperationFieldsProps } from './OperationControl.tsx';
import { operationFields } from './operations.ts';
import type { Field } from './operations.ts';
import { getFormCopy } from './copy.ts';
import { presentationCopy } from './presentation.ts';

type Props = OperationFieldsProps;
export function OperationFields(props: Props) {
  const copy = presentationCopy(props.language);
  const fields = operationFields(props.input.type, props.input.asset);
  return (
    <div className="operation-groups">
      <OperationGroup
        {...props}
        title={props.input.type === 'transfer' ? copy.source : copy.context}
        fields={['portfolioId', 'account']}
        className="operation-context"
      />
      {props.input.type === 'transfer' && (
        <OperationGroup
          {...props}
          title={copy.destination}
          fields={['targetPortfolio', 'targetAccount']}
        />
      )}
      <PrimaryFields {...props} />
      <OperationGroup
        {...props}
        title={fields.includes('fx') ? copy.timing : copy.date}
        fields={fields.includes('fx') ? ['fx', 'date'] : ['date']}
      />
      <AdditionalFields {...props} fields={fields} />
    </div>
  );
}
function PrimaryFields(props: Props) {
  const copy = presentationCopy(props.language);
  const type = props.input.type;
  if (type === 'exchange') return <ExchangeFields {...props} />;
  if (type === 'buy' || type === 'sell')
    return (
      <>
        <OperationGroup {...props} title={copy.asset} fields={['asset']} hideLegend />
        <OperationGroup
          {...props}
          title={copy.trade}
          fields={['quantity', 'price', 'priceCurrency']}
        />
      </>
    );
  if (type === 'corporate')
    return (
      <>
        <OperationGroup {...props} title={copy.asset} fields={['asset', 'quantity']} />
        <OperationGroup {...props} title={copy.corporateNote} fields={['note']} hideLegend />
      </>
    );
  if (type === 'transfer') return <TransferFields {...props} />;
  return <CashFields {...props} />;
}
function TransferFields(props: Props) {
  const cash = ['RUB', 'USD'].includes(props.input.asset);
  const fields: readonly Field[] = cash ? ['asset', 'amount', 'currency'] : ['asset', 'quantity'];
  return (
    <OperationGroup {...props} title={presentationCopy(props.language).asset} fields={fields} />
  );
}
function CashFields(props: Props) {
  const copy = presentationCopy(props.language);
  const type = props.input.type;
  return (
    <>
      {type === 'income' && (
        <OperationGroup {...props} title={copy.asset} fields={['asset']} hideLegend />
      )}
      {['deposit', 'withdrawal'].includes(type) && (
        <OperationGroup
          {...props}
          title={type === 'deposit' ? copy.source : copy.destination}
          fields={['external']}
        />
      )}
      <OperationGroup
        {...props}
        title={type === 'opening' ? copy.balance : copy.amount}
        fields={['amount', 'currency']}
      />
      {type === 'opening' && <p className="form-hint">{copy.zero}</p>}
    </>
  );
}
function ExchangeFields(props: Props) {
  const copy = presentationCopy(props.language);
  return (
    <div className="exchange-pair">
      <OperationGroup {...props} title={copy.spent} fields={['amount', 'currency']} />
      <OperationGroup
        {...props}
        title={copy.received}
        fields={['receivedAmount', 'targetCurrency']}
      />
    </div>
  );
}
function OperationGroup({
  title,
  fields,
  className = '',
  hideLegend = false,
  ...props
}: Props &
  Readonly<{ title: string; fields: readonly Field[]; className?: string; hideLegend?: boolean }>) {
  const Group = hideLegend ? 'div' : 'fieldset';
  return (
    <Group className={`operation-group ${className}`}>
      {!hideLegend && <legend>{title}</legend>}
      <div className="form-grid">
        {fields.map((field) => (
          <OperationField key={field} {...props} field={field} />
        ))}
      </div>
    </Group>
  );
}
function AdditionalFields({ fields, ...props }: Props & Readonly<{ fields: readonly Field[] }>) {
  const extra: readonly Field[] = [
    ...fields.filter((field) => ['fee', 'feeCurrency'].includes(field)),
    ...(props.input.type === 'corporate' ? [] : (['note'] as const)),
  ];
  const meaningful = meaningfulExtras(props);
  const invalid = extra.some((field) => new Map(Object.entries(props.errors)).has(field));
  const locked = meaningful || invalid;
  const [opened, setOpened] = useState(locked);
  if (extra.length === 0) return null;
  return (
    <details
      className="operation-additional"
      open={opened || locked}
      onToggle={(event) => setOpened(event.currentTarget.open)}
    >
      <summary
        aria-disabled={locked}
        onClick={(event) => {
          if (locked) event.preventDefault();
        }}
      >
        {presentationCopy(props.language).additional}
        {locked && (
          <span className="additional-status">
            {props.language === 'ru' ? ' · Есть данные или ошибки' : ' · Contains data or errors'}
          </span>
        )}
      </summary>
      <div className="form-grid">
        {extra.map((field) => (
          <OperationField key={field} {...props} field={field} />
        ))}
      </div>
      <p className="form-hint">{getFormCopy(props.language).limits}</p>
    </details>
  );
}
function meaningfulExtras(props: Props) {
  return (
    (props.input.fee !== '' && Number(props.input.fee.replace(',', '.')) !== 0) ||
    (props.input.type !== 'corporate' && props.input.note.trim() !== '')
  );
}
