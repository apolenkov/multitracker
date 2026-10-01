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
import { fieldName, ImportSample } from './import-preview';
export { ImportSample } from './import-preview';

export type ImportFieldsProps = Readonly<{
  language: ImportLanguage;
  draft: ImportDraft;
  update: (draft: ImportDraft) => void;
  error?: string;
}>;
export function ImportSource({ language, draft, update, error }: ImportFieldsProps) {
  return (
    <div className="form-grid">
      <label>
        {importText(language, 'Источник', 'Source')}
        <select
          required
          id="import-page-source"
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
  hidden,
  draft,
  update,
  error,
}: ImportFieldsProps & Readonly<{ hidden: boolean }>) {
  return (
    <fieldset className="mapping-list">
      <legend>{importText(language, 'Обязательные столбцы', 'Required columns')}</legend>
      {importFields.map((field) => (
        <label key={field}>
          <span>
            {fieldName(field, language)} <small>{mappingExample(field, language, hidden)}</small>
          </span>
          <select
            id={`import-page-map-${field}`}
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
export function ImportReview({
  language,
  hidden,
  draft,
  update,
  error,
}: ImportFieldsProps & Readonly<{ hidden: boolean }>) {
  return (
    <div>
      <p className="import-result">
        {importText(language, '2 готовы · 1 ошибка · 1 повтор', '2 ready · 1 error · 1 duplicate')}
      </p>
      <ImportSample language={language} hidden={hidden} />
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

function mappingExample(field: ImportField, language: ImportLanguage, hidden: boolean) {
  if (hidden && (field === 'quantity' || field === 'price')) return '••••';
  if (field === 'action') return importText(language, 'Покупка', 'Buy');
  return new Map(Object.entries(sampleImportRows.at(0) ?? {})).get(field);
}
