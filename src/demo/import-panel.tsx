import { useState } from 'react';
import type { ImportDraft, ImportLanguage } from './import-model';
import { importText, initialImport } from './import-model';
import { ImportSource, ImportMapping } from './import-fields';
import { ImportWizard } from './import-wizard';
import { ImportHistory } from './import-history';
import { accountLabel } from '../forms/accounts';

type Props = Readonly<{
  language: ImportLanguage;
  hidden: boolean;
  notify: (message: string) => void;
}>;

export function ImportPanel({ language, hidden, notify }: Props) {
  const [draft, setDraft] = useState(initialImport);
  const [editing, setEditing] = useState(false);
  function complete(value: ImportDraft) {
    setDraft(value);
    notify(
      importText(
        language,
        'В примере добавлено 2, пропущено 2: 1 ошибка актива и 1 повтор. Данные не сохранены.',
        'Sample complete: added 2, skipped 2: 1 unknown asset and 1 duplicate. Data was not saved.',
      ),
    );
  }
  return (
    <div className="demo-panel">
      <ImportFileSummary language={language} />
      <details id="import-source-options">
        <summary>
          {draft.source || importText(language, 'Выбрать источник', 'Choose source')} ·{' '}
          {accountLabel(draft.account, language)}
        </summary>
        <ImportSource language={language} draft={draft} update={setDraft} />
      </details>
      <details>
        <summary>{importText(language, 'Сопоставление столбцов', 'Column mapping')}</summary>
        <ImportMapping language={language} hidden={hidden} draft={draft} update={setDraft} />
      </details>
      <button type="button" className="primary" onClick={() => setEditing(true)}>
        {importText(language, 'Начать импорт-пример', 'Start sample import')}
      </button>
      <p className="demo-note">
        {importText(
          language,
          'Встроенный файл-пример. Настоящие файлы не читаются.',
          'Built-in sample only. Real files are not read.',
        )}
      </p>
      <ImportHistory language={language} hidden={hidden} notify={notify} />
      {editing && (
        <ImportWizard
          language={language}
          hidden={hidden}
          initial={draft}
          onClose={() => setEditing(false)}
          onComplete={complete}
        />
      )}
    </div>
  );
}

function ImportFileSummary({ language }: Readonly<{ language: ImportLanguage }>) {
  return (
    <div className="import-file-summary">
      <strong>sample-transactions.csv</strong>
      <span>{importText(language, '4 строки · CSV · UTF-8', '4 rows · CSV · UTF-8')}</span>
    </div>
  );
}
