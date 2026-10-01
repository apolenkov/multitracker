import { useState } from 'react';
import type { ImportLanguage } from './import-model';
import { importText } from './import-model';
import { ImportSample } from './import-fields';
import { DemoModal } from './modal';
import { closeDialog } from '../Dialog';
import { ActionMenu } from '../ActionMenu';

type HistoryProps = Readonly<{
  language: ImportLanguage;
  hidden: boolean;
  notify: (message: string) => void;
}>;
type HistoryDialog = 'details' | 'undo' | 'reconcile' | null;
export function ImportHistory({ language, hidden, notify }: HistoryProps) {
  const [dialog, setDialog] = useState<HistoryDialog>(null);
  const title = importText(language, 'История импорта', 'Import history');
  return (
    <section className="import-history" aria-label={title}>
      <h2>{title}</h2>
      <p>2026-09-04 · Binance → Binance · sample-transactions.csv</p>
      <p>
        {importText(
          language,
          'К добавлению: 2 · К пропуску: 2 (1 ошибка актива, 1 повтор)',
          'To add: 2 · To skip: 2 (1 unknown asset, 1 duplicate)',
        )}
      </p>
      <HistoryMenu language={language} open={setDialog} />
      {dialog && (
        <DemoModal
          id="import-history"
          title={
            dialog === 'undo'
              ? importText(language, 'Отменить этот импорт?', 'Undo this import?')
              : title
          }
          language={language}
          onClose={() => setDialog(null)}
        >
          <HistoryDetails kind={dialog} language={language} hidden={hidden} notify={notify} />
        </DemoModal>
      )}
    </section>
  );
}
function HistoryMenu({
  language,
  open,
}: Readonly<{ language: ImportLanguage; open: (dialog: HistoryDialog) => void }>) {
  return (
    <ActionMenu
      className="import-menu"
      label={importText(language, 'Действия: импорт', 'Actions: import')}
      items={[
        {
          label: importText(language, 'Подробности импорта', 'Import details'),
          ariaLabel: importText(language, 'Подробности импорта', 'Import details'),
          onSelect: () => open('details'),
        },
        {
          label: importText(language, 'Сверить остаток', 'Reconcile balance'),
          ariaLabel: importText(language, 'Сверить остаток', 'Reconcile balance'),
          onSelect: () => open('reconcile'),
        },
        {
          label: importText(language, 'Отменить импорт', 'Undo import'),
          ariaLabel: importText(language, 'Отменить импорт', 'Undo import'),
          onSelect: () => open('undo'),
          danger: true,
        },
      ]}
    />
  );
}
function HistoryDetails({
  kind,
  language,
  hidden,
  notify,
}: HistoryProps & Readonly<{ kind: Exclude<HistoryDialog, null> }>) {
  if (kind === 'details')
    return (
      <div>
        <p>
          <strong>sample-transactions.csv</strong> · 2026-09-04
        </p>
        <p className="import-result">
          {importText(language, '2 готовы · 2 исключены', '2 ready · 2 excluded')}
        </p>
        <ImportSample language={language} hidden={hidden} />
        <button type="button" onClick={() => closeDialog('import-history')}>
          {importText(language, 'Закрыть', 'Close')}
        </button>
      </div>
    );
  if (kind === 'reconcile')
    return <Reconciliation language={language} hidden={hidden} notify={notify} />;
  return <UndoImport language={language} hidden={hidden} notify={notify} />;
}
function UndoImport({ language, notify }: HistoryProps) {
  function confirm() {
    notify(
      importText(
        language,
        'Отмена импорта показана. Учебные операции и остатки не изменены.',
        'Import undo previewed. Sample activity and balances are unchanged.',
      ),
    );
    closeDialog('import-history');
  }
  return (
    <div>
      <p>
        {importText(
          language,
          'В продукте отмена удалит только 2 операции этого импорта. Ручные операции и другие импорты останутся. В макете данные не изменяются.',
          'In the product, undo removes only these 2 imported transactions. Manual activity and other imports remain. Mockup data stays unchanged.',
        )}
      </p>
      <div className="form-actions">
        <button type="button" onClick={() => closeDialog('import-history')}>
          {importText(language, 'Отмена', 'Cancel')}
        </button>
        <button type="button" className="danger" onClick={confirm}>
          {importText(language, 'Отменить импорт', 'Undo import')}
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
