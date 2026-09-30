import { useState } from 'react';
import { closeDialog, DialogHeading, keepDialogFocus } from '../Dialog.tsx';
import { OperationForm } from '../Forms.tsx';
import { date, getLabels } from '../i18n.ts';
import { operationLabel } from '../forms/operations.ts';
import { accountLabel } from '../forms/accounts.ts';
import { operationInput } from './data.ts';
import type { RecordsProps, Transaction } from './data.ts';
import { recordsCopy } from './copy.ts';
import { RecordValues, RecordSummary } from './HistoryRow.tsx';

export type RecordRequest = Readonly<{ mode: 'details' | 'edit' | 'delete'; record: Transaction }>;
type Props = RecordsProps &
  Readonly<{ request: RecordRequest; onClose: () => void; onSaved: (message: string) => void }>;
export function RecordDialog(props: Props) {
  if (props.request.mode === 'edit') return <EditRecord {...props} />;
  const labels = getLabels(props.language);
  const copy = recordsCopy(props.language);
  const title =
    props.request.mode === 'delete'
      ? copy.deleteTitle
      : `${operationLabel(props.request.record.type, props.language)} · ${props.request.record.asset}`;
  return (
    <dialog
      className="record-dialog"
      id="record-dialog"
      aria-labelledby="record-title"
      onKeyDown={keepDialogFocus}
      onClose={props.onClose}
    >
      <DialogHeading title={title} id="record-title" dialog="record-dialog" labels={labels} />
      <p>
        {operationLabel(props.request.record.type, props.language)} · {props.request.record.asset} ·{' '}
        {date(props.request.record.date, props.language)}
      </p>
      <p className="form-sample">
        {props.language === 'ru'
          ? 'Учебный пример · данные не сохраняются'
          : 'Teaching sample · records are not saved'}
      </p>
      {props.request.mode === 'delete' ? (
        <RecordSummary {...props} record={props.request.record} />
      ) : (
        <RecordValues {...props} record={props.request.record} />
      )}
      {props.request.mode === 'delete' ? <DeleteRecord {...props} /> : <RecordDetails {...props} />}
    </dialog>
  );
}
function DeleteRecord({ language, onSaved }: Props) {
  const labels = getLabels(language);
  const copy = recordsCopy(language);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(false);
  const submit = () => {
    if (!confirmed) {
      setError(true);
      document.getElementById('delete-record-confirm')?.focus();
      return;
    }
    closeDialog('record-dialog');
    onSaved(copy.entitySaved);
  };
  return (
    <>
      <p>{copy.deleteNote}</p>
      <label className="checkbox-field">
        <input
          id="delete-record-confirm"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          aria-invalid={error}
          aria-describedby={error ? 'delete-record-error' : undefined}
        />
        {copy.confirmDelete}
      </label>
      {error && (
        <p className="field-error" id="delete-record-error" role="alert">
          {copy.confirmDelete}
        </p>
      )}
      <div className="form-actions">
        <button onClick={() => closeDialog('record-dialog')}>{labels.cancel}</button>
        <button className="destructive" onClick={submit}>
          {copy.delete}
        </button>
      </div>
    </>
  );
}

function RecordDetails(props: Props) {
  const copy = recordsCopy(props.language);
  const labels = getLabels(props.language);
  return (
    <>
      <p>
        {copy.comment}: {props.request.record.note[props.language]}
      </p>
      <p>
        {copy.source}: {copy.example}
      </p>
      {['deposit', 'withdrawal'].includes(props.request.record.type) && (
        <p>
          {props.request.record.type === 'deposit' ? copy.externalSource : copy.externalDestination}
          : {copy.bank}
        </p>
      )}
      {props.request.record.targetPortfolio && (
        <p>
          {copy.destination}: {props.request.record.targetPortfolio} ·{' '}
          {accountLabel(props.request.record.targetAccount ?? '', props.language)}
        </p>
      )}
      <div className="form-actions">
        <button onClick={() => closeDialog('record-dialog')}>{labels.close}</button>
      </div>
    </>
  );
}

function EditRecord(props: Props) {
  return (
    <OperationForm
      id="record-edit-dialog"
      title={`${recordsCopy(props.language).edit} ${recordsCopy(props.language).transaction.toLocaleLowerCase()}`}
      state={props.state}
      language={props.language}
      portfolioId={props.request.record.portfolioId}
      initial={{
        ...operationInput(props.request.record, props.hidden),
        note: props.request.record.note[props.language],
        external: props.language === 'ru' ? 'Учебный банковский счёт' : 'Sample bank account',
      }}
      onSaved={props.onSaved}
      onClose={props.onClose}
    />
  );
}
