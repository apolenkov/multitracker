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
import { undoneText } from '../RowActions.tsx';
import { focusMain } from '../navigation.ts';

type Props = RecordsProps & Readonly<{ brief?: boolean }>;
export function History(props: Props) {
  const h = useHistory(props);
  const filtered = filterTransactions(h.records, props.portfolioId, h.filter).slice(
    0,
    props.brief ? 3 : undefined,
  );
  const copy = recordsCopy(props.language);
  return (
    <section aria-labelledby={props.brief ? 'recent-history-title' : undefined}>
      <HistoryIntro {...props} filter={h.filter} onFilter={h.setFilter} records={h.records} />
      {!props.brief && (
        <p className="history-count">
          {copy.count}: {filtered.length}
        </p>
      )}
      <HistoryRows
        {...props}
        records={filtered}
        removed={h.removed}
        onRequest={h.setRequest}
        onRemove={h.remove}
        onRestore={h.restore}
      />
      {filtered.length === 0 && <p className="empty-state">{copy.empty}</p>}
      <RecordHost props={props} history={h} />
    </section>
  );
}

function HistoryIntro({
  brief,
  filter,
  onFilter,
  records,
  language,
}: Props &
  Readonly<{
    filter: HistoryFilter;
    onFilter: (filter: HistoryFilter) => void;
    records: readonly Transaction[];
  }>) {
  const labels = getLabels(language);
  if (!brief)
    return (
      <HistoryFilters filter={filter} onChange={onFilter} records={records} language={language} />
    );
  return (
    <>
      <h2 id="recent-history-title">{labels.recentHistory}</h2>
      <p className="quiet history-note">{labels.historyNote}</p>
    </>
  );
}

function RecordHost({
  props,
  history,
}: Readonly<{ props: Props; history: ReturnType<typeof useHistory> }>) {
  const request = history.request;
  return (
    <>
      {!props.onSaved && (
        <div className="status-message">
          <div role="status" aria-atomic="true">
            {history.saved.message && <p key={history.saved.count}>{history.saved.message}</p>}
          </div>
        </div>
      )}
      {request && (
        <RecordDialog
          {...props}
          request={request}
          onClose={history.close}
          onSaved={history.save}
          onEdit={() => history.setRequest({ ...request, mode: 'edit' })}
          onDelete={() => {
            history.setRequest(null);
            history.remove(request.record);
          }}
        />
      )}
    </>
  );
}

function useSaved(onSaved: Props['onSaved']) {
  const [saved, setSaved] = useState<Readonly<{ count: number; message: string }>>({
    count: 0,
    message: '',
  });
  const save = (message: string) => {
    setSaved((current) => ({ count: current.count + 1, message }));
    onSaved?.(message);
  };
  return { saved, save };
}

// После закрытия фокус возвращается к строке-открывателю, пока виден её раздел:
// после перехода фокус уже в основном содержимом и отдавать его скрытой строке нельзя.
function restoreRowFocus(opener: HTMLElement | null) {
  requestAnimationFrame(() => {
    const active = document.activeElement;
    const lost = !active || active === document.body || active.id === 'main';
    const stillHere = ['#history', '#overview'].includes(window.location.hash);
    if (lost && stillHere && opener?.isConnected && opener.checkVisibility()) opener.focus();
  });
}

function useHistory(props: Props) {
  const [filter, setFilter] = useState<HistoryFilter>(initialFilters);
  const [request, setRequest] = useState<RecordRequest | null>(null);
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const { saved, save } = useSaved(props.onSaved);
  // Удалённая строка остаётся на месте под уведомлением; отмена возвращает ту же запись.
  const remove = (record: Transaction) => {
    setRemoved((current) => [...current, record.id]);
    save(recordsCopy(props.language).removed);
  };
  const restore = (id: string) => {
    setRemoved((current) => current.filter((item) => item !== id));
    save(undoneText(props.language));
    focusMain({ preventScroll: true });
  };
  const open = (next: RecordRequest | null) => {
    if (next && !request && document.activeElement instanceof HTMLElement)
      setOpener(document.activeElement);
    setRequest(next);
  };
  // Подробности → «Изменить» сменяют диалог: после закрытия правки фокус возвращается к строке.
  const close = () => {
    setRequest(null);
    restoreRowFocus(opener);
  };
  useEffect(() => {
    if (request) openDialog(request.mode === 'edit' ? 'record-edit-dialog' : 'record-dialog');
  }, [request]);
  const records = transactions(props.state, !props.brief);
  return {
    filter,
    setFilter,
    request,
    setRequest: open,
    saved,
    save,
    removed,
    remove,
    restore,
    close,
    records,
  };
}

function HistoryRows(
  props: Props &
    Readonly<{
      records: readonly Transaction[];
      removed: readonly string[];
      onRequest: (request: RecordRequest) => void;
      onRemove: (record: Transaction) => void;
      onRestore: (id: string) => void;
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
            removed={props.removed.includes(record.id)}
            onDetails={() => props.onRequest({ record, mode: 'details' })}
            onEdit={() => props.onRequest({ record, mode: 'edit' })}
            onDelete={() => props.onRemove(record)}
            onRestore={() => props.onRestore(record.id)}
          />
        ))}
      </div>
    </>
  );
}
