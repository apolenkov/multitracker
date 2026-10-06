import {
  importFields,
  importText,
  sampleImportRows,
  type ImportField,
  type ImportLanguage,
} from './import-model';
import { StatusChip } from '../StatusChip.tsx';
import { date } from '../i18n.ts';
const fieldNames = [
  { field: 'date', ru: 'Дата', en: 'Date' },
  { field: 'asset', ru: 'Актив', en: 'Asset' },
  { field: 'action', ru: 'Действие', en: 'Action' },
  { field: 'quantity', ru: 'Количество', en: 'Quantity' },
  { field: 'price', ru: 'Цена', en: 'Price' },
  { field: 'currency', ru: 'Валюта', en: 'Currency' },
] as const;
export function fieldName(field: ImportField, language: ImportLanguage) {
  const name = fieldNames.find((item) => item.field === field);
  return name ? importText(language, name.ru, name.en) : field;
}
function RowStatus({ status, language }: Readonly<{ status: string; language: ImportLanguage }>) {
  const label =
    status === 'ready'
      ? importText(language, 'Готово', 'Ready')
      : status === 'unknown'
        ? importText(language, 'Ошибка', 'Error')
        : importText(language, 'Повтор', 'Duplicate');
  return <StatusChip tone={status === 'ready' ? 'ok' : 'warn'} label={label} />;
}
export function ImportSample(props: Readonly<{ language: ImportLanguage; hidden: boolean }>) {
  return (
    <div className="import-preview">
      <ImportRows {...props} />
      <ImportTable {...props} />
    </div>
  );
}
// В окне подробностей «Действие» одинаково во всех строках, а валюта входит в цену —
// два столбца не нужны, «Проверка» читается с переносом и без обрезки. Сумма и код
// валюты соединены U+00A0, пара никогда не разрывается по строкам.
const NBSP = '\u00A0';
const detailFields = importFields.filter((field) => field !== 'action' && field !== 'currency');
function ImportTable({
  language,
  hidden,
}: Readonly<{ language: ImportLanguage; hidden: boolean }>) {
  return (
    <div
      className="table-scroll import-source-table"
      role="region"
      tabIndex={0}
      aria-label={importText(language, 'Строки файла', 'File rows')}
    >
      <table>
        <thead>
          <tr>
            {detailFields.map((field) => (
              <th key={field}>{fieldName(field, language)}</th>
            ))}
            <th>{importText(language, 'Проверка', 'Validation')}</th>
          </tr>
        </thead>
        <tbody>
          {sampleImportRows.map((row) => (
            <tr key={row.id}>
              <td>{date(row.date, language)}</td>
              <td>{row.asset}</td>
              <td>{hidden ? '••••' : row.quantity}</td>
              <td>{hidden ? '••••' : `${row.price}${NBSP}${row.currency}`}</td>
              <td>
                <RowStatus status={row.status} language={language} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportRows({ language, hidden }: Readonly<{ language: ImportLanguage; hidden: boolean }>) {
  return (
    <ol className="import-rows">
      {sampleImportRows.map((row) => (
        <li key={row.id} data-status={row.status}>
          <div className="import-row-heading">
            <strong>{row.asset}</strong>
            <span>{date(row.date, language)}</span>
          </div>
          <p>
            {importText(language, 'Количество', 'Quantity')}: {hidden ? '••••' : row.quantity} ·{' '}
            {importText(language, 'Цена', 'Price')}: {hidden ? '••••' : row.price}
            {NBSP}
            {row.currency}
          </p>
          <p className="import-row-status">
            <RowStatus status={row.status} language={language} />
          </p>
          {row.status !== 'ready' && (
            <p className="demo-note">
              {row.status === 'unknown'
                ? importText(
                    language,
                    'Исправьте тикер в исходном файле.',
                    'Correct the ticker in the source file.',
                  )
                : importText(
                    language,
                    'Исключите повтор строки 1.',
                    'Exclude the duplicate of row 1.',
                  )}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
