import { closeDialog, DialogHeading, keepDialogFocus } from '../Dialog.tsx';
import { OperationForm } from '../Forms.tsx';
import { date, getLabels } from '../i18n.ts';
import { operationLabel } from '../forms/operations.ts';
import { accountLabel } from '../forms/accounts.ts';
import { operationInput } from './data.ts';
import type { RecordsProps, Transaction } from './data.ts';
import { recordsCopy } from './copy.ts';
import { RecordValues } from './HistoryRow.tsx';

export type RecordRequest = Readonly<{ mode: 'details' | 'edit'; record: Transaction }>;
type Props = RecordsProps &
  Readonly<{
    request: RecordRequest;
    onClose: () => void;
    onSaved: (message: string) => void;
    onEdit: () => void;
    onDelete: () => void;
  }>;
export function RecordDialog(props: Props) {
  if (props.request.mode === 'edit') return <EditRecord {...props} />;
  const labels = getLabels(props.language);
  const title = `${operationLabel(props.request.record.type, props.language)} · ${props.request.record.asset}`;
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
        {props.language === 'ru' ? 'Данные не сохраняются' : 'Records are not saved'}
      </p>
      <RecordValues {...props} record={props.request.record} />
      <RecordDetails {...props} />
    </dialog>
  );
}
function RecordDetails(props: Props) {
  const copy = recordsCopy(props.language);
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
        <button
          className="destructive"
          onClick={() => {
            closeDialog('record-dialog');
            props.onDelete();
          }}
        >
          {copy.delete}
        </button>
        <button className="primary" onClick={props.onEdit}>
          {copy.edit}
        </button>
      </div>
    </>
  );
}

function EditRecord(props: Props) {
  return (
    <OperationForm
      id="record-edit-dialog"
      title={props.language === 'ru' ? 'Изменить операцию' : 'Edit transaction'}
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
