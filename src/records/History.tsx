import { useEffect, useState } from 'react';
import { getLabels } from '../i18n.ts';
import { openDialog } from '../Dialog.tsx';
import { transactions } from './data.ts';
import type { RecordsProps } from './data.ts';
import { initialFilters, filterTransactions } from './filters.ts';
import type { HistoryFilter } from './filters.ts';
import { HistoryFilters } from './HistoryFilters.tsx';
import { HistoryRow } from './HistoryRow.tsx';
import { RecordDialog } from './RecordDialog.tsx';
import type { RecordRequest } from './RecordDialog.tsx';
import { recordsCopy } from './copy.ts';

type Props = RecordsProps & Readonly<{ brief?: boolean }>;
export function History(props: Props) {
  const { filter, setFilter, request, setRequest, saved, save } = useHistory(props);
  const records = transactions(props.state, !props.brief);
  const filtered = filterTransactions(records, props.portfolioId, filter).slice(
    0,
    props.brief ? 3 : undefined,
  );
  const copy = recordsCopy(props.language);
  const labels = getLabels(props.language);
  return (
    <section aria-labelledby={props.brief ? 'recent-history-title' : undefined}>
      {props.brief && <h2 id="recent-history-title">{labels.recentHistory}</h2>}
      <HistoryNote language={props.language} brief={props.brief ?? false} />
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
      <HistoryRows {...props} records={filtered} onRequest={setRequest} />
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
          onClose={() => setRequest(null)}
          onSaved={save}
        />
      )}
    </section>
  );
}

function useHistory(props: Props) {
  const [filter, setFilter] = useState<HistoryFilter>(initialFilters);
  const [request, setRequest] = useState<RecordRequest | null>(null);
  const [saved, setSaved] = useState<Readonly<{ count: number; message: string }>>({
    count: 0,
    message: '',
  });
  const save = (message: string) => {
    setSaved((current) => ({ count: current.count + 1, message }));
    props.onSaved?.(message);
  };
  useEffect(() => {
    if (request) openDialog(request.mode === 'edit' ? 'record-edit-dialog' : 'record-dialog');
  }, [request]);
  return { filter, setFilter, request, setRequest, saved, save };
}

function HistoryRows(
  props: Props &
    Readonly<{
      records: readonly import('./data.ts').Transaction[];
      onRequest: (request: RecordRequest) => void;
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
            onDelete={() => props.onRequest({ record, mode: 'delete' })}
          />
        ))}
      </div>
    </>
  );
}

function HistoryNote({
  language,
  brief,
}: Readonly<{ language: Props['language']; brief: boolean }>) {
  const message =
    language === 'ru'
      ? 'Покупки в расчёте. Остальные типы — примеры.'
      : 'Purchases count toward results. Other types are samples.';
  return <p className="quiet history-note">{brief ? getLabels(language).historyNote : message}</p>;
}
