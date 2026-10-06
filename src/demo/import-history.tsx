import { useState } from 'react';
import type { ImportLanguage } from './import-model';
import { importText } from './import-model';
import { ImportSample } from './import-fields';
import { date } from '../i18n.ts';
import { DemoModal } from './modal';
import { useModalSession } from './modal-session';
import { closeDialog } from '../Dialog';
import { RowNotice, undoneText } from '../RowActions.tsx';

type HistoryProps = Readonly<{
  language: ImportLanguage;
  hidden: boolean;
  notify: (message: string) => void;
}>;
type HistoryDialog = 'details' | 'reconcile';
export function ImportHistory({ language, hidden, notify }: HistoryProps) {
  const modal = useModalSession<HistoryDialog>();
  const session = modal.current;
  const [undone, setUndone] = useState(false);
  const title = importText(language, 'История импорта', 'Import history');
  // Отмена импорта выполняется сразу; запись остаётся под встроенным «Отменить» на месте.
  // Объявление одно — в записи (RowNotice несёт тот же смысл в имени региона).
  const undoImport = () => {
    closeDialog('import-history');
    setUndone(true);
  };
  const restoreImport = () => {
    setUndone(false);
    notify(undoneText(language));
  };
  return (
    <section className="import-history" aria-label={title}>
      <h2>{title}</h2>
      <HistoryEntry
        language={language}
        undone={undone}
        open={modal.open}
        onRestore={restoreImport}
      />
      {session && (
        <DemoModal
          key={session.nonce}
          id="import-history"
          title={title}
          language={language}
          onClose={() => modal.close(session.nonce)}
        >
          {session.kind === 'details' ? (
            <HistoryDetails language={language} hidden={hidden} onUndo={undoImport} />
          ) : (
            <Reconciliation language={language} hidden={hidden} notify={notify} />
          )}
        </DemoModal>
      )}
    </section>
  );
}
function HistoryEntry({
  language,
  undone,
  open,
  onRestore,
}: Readonly<{
  language: ImportLanguage;
  undone: boolean;
  open: (dialog: HistoryDialog) => void;
  onRestore: () => void;
}>) {
  return (
    <div className={undone ? 'import-entry row-removed' : 'import-entry'}>
      <p>{date('2026-09-04', language)} · Binance → Binance · sample-transactions.csv</p>
      <p>
        {importText(
          language,
          'К добавлению: 2 · К пропуску: 2 (1 ошибка актива, 1 повтор)',
          'To add: 2 · To skip: 2 (1 unknown asset, 1 duplicate)',
        )}
      </p>
      <div className="record-actions">
        <button type="button" id="import-history-details" onClick={() => open('details')}>
          {importText(language, 'Подробности', 'Details')}
        </button>
        <button type="button" id="import-reconcile" onClick={() => open('reconcile')}>
          {importText(language, 'Сверить остаток', 'Reconcile balance')}
        </button>
      </div>
      {undone && (
        <RowNotice
          text={importText(language, 'Импорт отменён', 'Import undone')}
          detail={importText(
            language,
            'Импорт отменён. Данные не изменялись.',
            'Import undone. No data was changed.',
          )}
          language={language}
          onUndo={onRestore}
        />
      )}
    </div>
  );
}
function HistoryDetails({
  language,
  hidden,
  onUndo,
}: Readonly<{ language: ImportLanguage; hidden: boolean; onUndo: () => void }>) {
  return (
    <div>
      <p>
        <strong>sample-transactions.csv</strong> · {date('2026-09-04', language)}
      </p>
      <p className="import-result">
        {importText(language, '2 готовы · 2 исключены', '2 ready · 2 excluded')}
      </p>
      <ImportSample language={language} hidden={hidden} />
      <p>
        {importText(
          language,
          'Отмена удалит только 2 операции этого импорта; ручные операции и другие импорты останутся.',
          'Undo removes only these 2 imported transactions; manual activity and other imports remain.',
        )}
      </p>
      <div className="dialog-actions">
        <button type="button" className="danger" onClick={onUndo}>
          {importText(language, 'Отменить импорт', 'Undo import')}
        </button>
        <button type="button" onClick={() => closeDialog('import-history')}>
          {importText(language, 'Закрыть', 'Close')}
        </button>
      </div>
    </div>
  );
}
function Reconciliation({ language, hidden, notify }: HistoryProps) {
  const [resolution, setResolution] = useState('history');
  function confirm() {
    const choice =
      resolution === 'history'
        ? importText(language, 'Проверка истории', 'History review')
        : importText(language, 'Начальный остаток', 'Opening balance');
    notify(
      importText(
        language,
        `Выбран пример: ${choice}. Остаток не изменён.`,
        `Selected sample: ${choice}. Balance is unchanged.`,
      ),
    );
    closeDialog('import-history');
  }
  return (
    <div>
      <ReconciliationSummary language={language} hidden={hidden} />
      <label>
        {importText(language, 'Как исправить', 'Resolution')}
        <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
          <option value="history">
            {importText(language, 'Проверить историю операций', 'Review transaction history')}
          </option>
          <option value="opening">
            {importText(language, 'Указать начальный остаток', 'Set opening balance')}
          </option>
        </select>
      </label>
      <div className="form-actions">
        <button type="button" onClick={() => closeDialog('import-history')}>
          {importText(language, 'Отмена', 'Cancel')}
        </button>
        <button type="button" className="primary" onClick={confirm}>
          {importText(language, 'Показать решение', 'Preview resolution')}
        </button>
      </div>
    </div>
  );
}

function ReconciliationSummary({
  language,
  hidden,
}: Readonly<{ language: ImportLanguage; hidden: boolean }>) {
  return (
    <>
      <h3>{importText(language, 'Расхождение BTC · Binance', 'BTC discrepancy · Binance')}</h3>
      <dl className="detail-list">
        <dt>{importText(language, 'В выписке-примере', 'Sample statement')}</dt>
        <dd>{hidden ? '••••' : '0.05 BTC'}</dd>
        <dt>{importText(language, 'В макете портфеля', 'Portfolio mockup')}</dt>
        <dd>{hidden ? '••••' : '0.04 BTC'}</dd>
        <dt>{importText(language, 'Расхождение', 'Difference')}</dt>
        <dd>{hidden ? '••••' : '+0.01 BTC'}</dd>
      </dl>
      <p>
        {importText(
          language,
          'Проверьте пропущенную покупку, ввод и комиссию. Не добавляйте расхождение автоматически.',
          'Check for a missing purchase, deposit or fee. Do not add the discrepancy automatically.',
        )}
      </p>
    </>
  );
}
