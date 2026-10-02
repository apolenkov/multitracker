import { useEffect, useRef, useState } from 'react';
import type { ImportDraft, ImportLanguage } from './import-model';
import { importError, importText, initialImport } from './import-model';
import { ImportSource, ImportMapping, ImportReview } from './import-fields';
import { ImportHistory } from './import-history';

type Props = Readonly<{
  language: ImportLanguage;
  hidden: boolean;
  notify: (message: string) => void;
}>;

// Один экран: источник и назначение, предпросмотр строк с ошибкой и повтором, одна кнопка импорта.
export function ImportPanel({ language, hidden, notify }: Props) {
  const [draft, setDraft] = useState<ImportDraft>({
    ...initialImport,
    source: 'Tradernet',
    fileSelected: true,
  });
  const [attempt, setAttempt] = useState(0);
  const error = attempt > 0 ? importError(draft, 3, language) : '';
  const run = () => {
    setAttempt((current) => current + 1);
    if (importError(draft, 3, language)) return;
    notify(
      importText(
        language,
        'Добавлено 2, пропущено 2: 1 ошибка актива и 1 повтор. Данные не сохранены.',
        'Added 2, skipped 2: 1 unknown asset and 1 duplicate. Data was not saved.',
      ),
    );
  };
  const fields = { language, draft, update: setDraft, error };
  return (
    <div className="demo-panel import-panel">
      <ImportFileSummary language={language} />
      <ImportSource {...fields} />
      <details id="import-mapping-options">
        <summary>{importText(language, 'Сопоставление столбцов', 'Column mapping')}</summary>
        <ImportMapping {...fields} hidden={hidden} />
      </details>
      <ImportReview {...fields} hidden={hidden} />
      <ImportError error={error} attempt={attempt} />
      <button type="button" id="import-run" className="primary" onClick={run}>
        {importText(language, 'Импортировать 2 операции', 'Import 2 transactions')}
      </button>
      <ImportHistory language={language} hidden={hidden} notify={notify} />
    </div>
  );
}

// Ошибка ставит фокус в первое неверное поле и раскрывает его группу.
function ImportError({ error, attempt }: Readonly<{ error: string; attempt: number }>) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!error) return;
    const field = ref.current
      ?.closest('.import-panel')
      ?.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.closest('details')?.setAttribute('open', '');
    (field ?? ref.current)?.focus();
  }, [error, attempt]);
  return error ? (
    <p id="import-error" ref={ref} tabIndex={-1} role="alert" className="field-error">
      {error}
    </p>
  ) : null;
}

function ImportFileSummary({ language }: Readonly<{ language: ImportLanguage }>) {
  return (
    <div className="import-file-summary">
      <strong>sample-transactions.csv</strong>
      <span>
        {importText(
          language,
          '4 строки · CSV · встроенный пример, настоящие файлы не читаются',
          '4 rows · CSV · built-in sample, real files are not read',
        )}
      </span>
    </div>
  );
}
