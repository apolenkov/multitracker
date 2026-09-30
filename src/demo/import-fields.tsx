import type { ImportDraft, ImportField, ImportLanguage } from './import-model';
import {
  importColumn,
  importFields,
  importSources,
  importText,
  mapImportField,
  sampleImportRows,
} from './import-model';
import { accountSamples, firstAccount, accountLabel } from '../forms/accounts';
import { demoState } from '../model/portfolio';

export type ImportFieldsProps = Readonly<{
  language: ImportLanguage;
  draft: ImportDraft;
  update: (draft: ImportDraft) => void;
  error?: string;
  scope?: 'page' | 'wizard';
}>;
const fieldNames = [
  { field: 'date', ru: 'Дата', en: 'Date' },
  { field: 'asset', ru: 'Актив', en: 'Asset' },
  { field: 'action', ru: 'Действие', en: 'Action' },
  { field: 'quantity', ru: 'Количество', en: 'Quantity' },
  { field: 'price', ru: 'Цена', en: 'Price' },
  { field: 'currency', ru: 'Валюта', en: 'Currency' },
] as const;
function fieldName(field: ImportField, language: ImportLanguage) {
  const name = fieldNames.find((item) => item.field === field);
  return name ? importText(language, name.ru, name.en) : field;
}
export function ImportSource({
  language,
  draft,
  update,
  error,
  scope = 'page',
}: ImportFieldsProps) {
  return (
    <div className="form-grid">
      <label>
        {importText(language, 'Источник', 'Source')}
        <select
          required
          id={`import-${scope}-source`}
          value={draft.source}
          aria-invalid={!!error && !draft.source}
          aria-describedby={error && !draft.source ? 'import-error' : undefined}
          onChange={(e) => update({ ...draft, source: e.target.value })}
        >
          <option value="">{importText(language, 'Выберите источник', 'Choose a source')}</option>
          {importSources.map((source) => (
            <option key={source}>{source}</option>
          ))}
        </select>
      </label>
      <ImportDestination language={language} draft={draft} update={update} />
    </div>
  );
}
function ImportDestination({ language, draft, update }: ImportFieldsProps) {
  return (
    <>
      <label>
        {importText(language, 'Портфель назначения', 'Destination portfolio')}
        <select
          value={draft.portfolio}
          onChange={(e) =>
            update({ ...draft, portfolio: e.target.value, account: firstAccount(e.target.value) })
          }
        >
          {demoState.portfolios.map((portfolio) => (
            <option key={portfolio.id} value={portfolio.id}>
              {portfolio.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {importText(language, 'Счёт назначения', 'Destination account')}
        <select
          value={draft.account}
          onChange={(e) => update({ ...draft, account: e.target.value })}
        >
          {accountSamples
            .filter((account) => account.portfolioId === draft.portfolio)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account.id, language)}
              </option>
            ))}
        </select>
      </label>
    </>
  );
}
export function ImportMapping({
  language,
  draft,
  update,
  error,
  scope = 'page',
}: ImportFieldsProps) {
  return (
    <fieldset className="mapping-list">
      <legend>{importText(language, 'Обязательные столбцы', 'Required columns')}</legend>
      {importFields.map((field) => (
        <label key={field}>
          {fieldName(field, language)}
          <select
            id={`import-${scope}-map-${field}`}
            value={importColumn(draft, field)}
            aria-invalid={!!error && importColumn(draft, field) !== field}
            aria-describedby={
              error && importColumn(draft, field) !== field ? 'import-error' : undefined
            }
            onChange={(e) => update(mapImportField(draft, field, e.target.value))}
          >
            <option value="skip">
              {importText(language, 'Пропустить столбец', 'Skip column')}
            </option>
            {importFields.map((column) => (
              <option key={column} value={column}>
                {fieldName(column, language)}
              </option>
            ))}
          </select>
        </label>
      ))}
    </fieldset>
  );
}
export function ImportFile({ language, draft, update, error }: ImportFieldsProps) {
  return (
    <div>
      <p>
        {importText(
          language,
          'Учебный CSV: sample-transactions.csv · 4 строки · UTF-8',
          'Sample CSV: sample-transactions.csv · 4 rows · UTF-8',
        )}
      </p>
      <p>
        {importText(
          language,
          'Используется встроенный пример. Настоящие файлы не читаются и не отправляются.',
          'Uses a built-in sample. Real files are neither read nor uploaded.',
        )}
      </p>
      <button
        type="button"
        id="import-sample-file"
        aria-pressed={draft.fileSelected}
        aria-describedby={error && !draft.fileSelected ? 'import-error' : undefined}
        onClick={() => update({ ...draft, fileSelected: true })}
      >
        {draft.fileSelected
          ? importText(language, 'Файл-пример выбран', 'Sample file selected')
          : importText(language, 'Выбрать файл-пример', 'Select sample file')}
      </button>
    </div>
  );
}
function rowStatus(status: string, language: ImportLanguage) {
  if (status === 'ready') return importText(language, 'Готово', 'Ready');
  if (status === 'unknown')
    return importText(language, 'Неизвестный актив · пропустить', 'Unknown asset · skip');
  return importText(language, 'Повтор строки 1 · пропустить', 'Duplicate of row 1 · skip');
}
export function ImportSample({
  language,
  hidden,
}: Readonly<{ language: ImportLanguage; hidden: boolean }>) {
  return (
    <div
      className="table-scroll"
      role="region"
      tabIndex={0}
      aria-label={importText(language, 'Строки учебного файла', 'Sample file rows')}
    >
      <table>
        <thead>
          <tr>
            {importFields.map((field) => (
              <th key={field}>{fieldName(field, language)}</th>
            ))}
            <th>{importText(language, 'Проверка', 'Validation')}</th>
          </tr>
        </thead>
        <tbody>
          {sampleImportRows.map((row) => (
            <tr key={row.id}>
              <td>{row.date}</td>
              <td>{row.asset}</td>
              <td>{importText(language, 'Покупка', 'Buy')}</td>
              <td>{hidden ? '••••' : row.quantity}</td>
              <td>{hidden ? '••••' : row.price}</td>
              <td>{row.currency}</td>
              <td>{rowStatus(row.status, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ImportReview({
  language,
  hidden,
  draft,
  update,
  error,
}: ImportFieldsProps & Readonly<{ hidden: boolean }>) {
  return (
    <div>
      <p>
        {importText(
          language,
          'Готовы 2 из 4 строк. Ошибочная строка и повтор исключены по умолчанию.',
          '2 of 4 rows are ready. The invalid row and duplicate are excluded by default.',
        )}
      </p>
      <ImportSample language={language} hidden={hidden} />
      <ImportIssues language={language} />
      <ImportRowPolicy
        language={language}
        draft={draft}
        update={update}
        error={error ?? ''}
        field="skipUnknown"
      />
      <ImportRowPolicy
        language={language}
        draft={draft}
        update={update}
        error={error ?? ''}
        field="skipDuplicates"
      />
    </div>
  );
}
function ImportRowPolicy({
  language,
  draft,
  update,
  error,
  field,
}: ImportFieldsProps & Readonly<{ error: string; field: 'skipUnknown' | 'skipDuplicates' }>) {
  const unknown = field === 'skipUnknown';
  const checked = unknown ? draft.skipUnknown : draft.skipDuplicates;
  const invalid = !!error && !checked;
  const label = unknown
    ? importText(language, 'Пропустить неизвестный актив (строка 3)', 'Skip unknown asset (row 3)')
    : importText(language, 'Пропустить повтор (строка 4)', 'Skip duplicate (row 4)');
  return (
    <label className="checkbox-row">
      <input
        type="checkbox"
        checked={checked}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'import-error' : undefined}
        onChange={(event) => update({ ...draft, [field]: event.target.checked })}
      />
      {label}
    </label>
  );
}

export function ImportIssues({ language }: Readonly<{ language: ImportLanguage }>) {
  return (
    <p>
      {importText(
        language,
        'Строка 3: неизвестный актив — исправьте тикер в исходном файле. Строка 4: повтор строки 1 — исключите повтор.',
        'Row 3: unknown asset — correct the ticker in the source file. Row 4: duplicate of row 1 — exclude the duplicate.',
      )}
    </p>
  );
}
