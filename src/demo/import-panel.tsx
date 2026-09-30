import { useState } from 'react';
import type { ImportDraft, ImportLanguage } from './import-model';
import { importText, initialImport } from './import-model';
import { ImportSource, ImportMapping } from './import-fields';
import { ImportWizard } from './import-wizard';
import { ImportHistory } from './import-history';

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
      <p>
        {importText(
          language,
          'Выберите источник и счёт. Затем пройдите проверку учебного файла перед подтверждением.',
          'Choose a source and account. Review the sample file before confirming.',
        )}
      </p>
      <ImportSource language={language} draft={draft} update={setDraft} />
      <details>
        <summary>
          {importText(language, 'Сопоставление по умолчанию', 'Default column mapping')}
        </summary>
        <ImportMapping language={language} draft={draft} update={setDraft} />
      </details>
      <button type="button" className="primary" onClick={() => setEditing(true)}>
        {importText(language, 'Начать импорт-пример', 'Start sample import')}
      </button>
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
