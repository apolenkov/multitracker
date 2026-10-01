import { useEffect, useState } from 'react';
import { getLabels } from '../i18n.ts';
import { openDialog } from '../Dialog.tsx';
import { transactions } from './data.ts';
import type { RecordsProps, Transaction } from './data.ts';
import { initialFilters, filterTransactions } from './filters.ts';
import type { HistoryFilter } from './filters.ts';
import { HistoryFilters } from './HistoryFilters.tsx';
import { HistoryRow } from './HistoryRow.tsx';
import { RecordDialog } from './RecordDialog.tsx';
import type { RecordRequest } from './RecordDialog.tsx';
import { recordsCopy } from './copy.ts';

type Props = RecordsProps & Readonly<{ brief?: boolean }>;
export function History(props: Props) {
  const { filter, setFilter, request, setRequest, saved, save, remove, close, records } =
    useHistory(props);
  const filtered = filterTransactions(records, props.portfolioId, filter).slice(
    0,
    props.brief ? 3 : undefined,
  );
  const copy = recordsCopy(props.language);
  const labels = getLabels(props.language);
  return (
    <section aria-labelledby={props.brief ? 'recent-history-title' : undefined}>
      {props.brief && <h2 id="recent-history-title">{labels.recentHistory}</h2>}
      {props.brief && <p className="quiet history-note">{labels.historyNote}</p>}
      {!props.brief && (
        <HistoryFilters
          filter={filter}
          onChange={setFilter}
          records={records}
          language={props.language}
        />
      )}
      {!props.brief && (
        <p className="history-count">
          {copy.count}: {filtered.length}
        </p>
      )}
      <HistoryRows {...props} records={filtered} onRequest={setRequest} onRemove={remove} />
      {filtered.length === 0 && <p className="empty-state">{copy.empty}</p>}
      {!props.onSaved && (
        <p key={saved.count} role="status">
          {saved.message}
        </p>
      )}
      {request && (
        <RecordDialog
          {...props}
          request={request}
          onClose={close}
          onSaved={save}
          onEdit={() => setRequest({ ...request, mode: 'edit' })}
          onDelete={() => {
            setRequest(null);
            remove(request.record);
          }}
        />
      )}
    </section>
  );
}

function useHistory(props: Props) {
  const [filter, setFilter] = useState<HistoryFilter>(initialFilters);
  const [request, setRequest] = useState<RecordRequest | null>(null);
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const [saved, setSaved] = useState<Readonly<{ count: number; message: string }>>({
    count: 0,
    message: '',
  });
  const save = (message: string, undo?: () => void) => {
    setSaved((current) => ({ count: current.count + 1, message }));
    props.onSaved?.(message, undo);
  };
  const remove = (record: Transaction) => {
    setRemoved((current) => [...current, record.id]);
    save(recordsCopy(props.language).removed, () =>
      setRemoved((current) => current.filter((id) => id !== record.id)),
    );
  };
  const open = (next: RecordRequest | null) => {
    if (next && !request && document.activeElement instanceof HTMLElement)
      setOpener(document.activeElement);
    setRequest(next);
  };
  // Подробности → «Изменить» сменяют диалог: после закрытия правки фокус возвращается к строке.
  const close = () => {
    setRequest(null);
    requestAnimationFrame(() => {
      const active = document.activeElement;
      const lost = !active || active === document.body || active.id === 'main';
      if (lost && opener?.isConnected) opener.focus();
    });
  };
  useEffect(() => {
    if (request) openDialog(request.mode === 'edit' ? 'record-edit-dialog' : 'record-dialog');
  }, [request]);
  const records = transactions(props.state, !props.brief).filter(
    (record) => !removed.includes(record.id),
  );
  return { filter, setFilter, request, setRequest: open, saved, save, remove, close, records };
}

function HistoryRows(
  props: Props &
    Readonly<{
      records: readonly Transaction[];
      onRequest: (request: RecordRequest) => void;
      onRemove: (record: Transaction) => void;
    }>,
) {
  return (
    <>
      {!props.brief && props.records.length > 0 && (
        <div className="history-head" aria-hidden="true">
          <span>{recordsCopy(props.language).amount}</span>
        </div>
      )}
      <div className={props.brief ? 'history-list' : 'history-list with-head'}>
        {props.records.map((record) => (
          <HistoryRow
            key={record.id}
            {...props}
            record={record}
            brief={props.brief ?? false}
            onDetails={() => props.onRequest({ record, mode: 'details' })}
            onEdit={() => props.onRequest({ record, mode: 'edit' })}
            onDelete={() => props.onRemove(record)}
          />
        ))}
      </div>
    </>
  );
}
