import {
  importFields,
  importText,
  sampleImportRows,
  type ImportField,
  type ImportLanguage,
} from './import-model';
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
function rowStatus(status: string, language: ImportLanguage) {
  if (status === 'ready') return importText(language, 'Готово', 'Ready');
  if (status === 'unknown')
    return importText(language, 'Неизвестный актив · пропустить', 'Unknown asset · skip');
  return importText(language, 'Повтор строки 1 · пропустить', 'Duplicate of row 1 · skip');
}
export function ImportSample(props: Readonly<{ language: ImportLanguage; hidden: boolean }>) {
  return (
    <div className="import-preview">
      <ImportRows {...props} />
      <ImportTable {...props} />
    </div>
  );
}
function ImportTable({
  language,
  hidden,
}: Readonly<{ language: ImportLanguage; hidden: boolean }>) {
  return (
    <div
      className="table-scroll import-source-table"
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

function ImportRows({ language, hidden }: Readonly<{ language: ImportLanguage; hidden: boolean }>) {
  return (
    <ol className="import-rows">
      {sampleImportRows.map((row) => (
        <li key={row.id} data-status={row.status}>
          <div className="import-row-heading">
            <strong>{row.asset}</strong>
            <span>{row.date}</span>
          </div>
          <p>
            {importText(language, 'Количество', 'Quantity')}: {hidden ? '••••' : row.quantity} ·{' '}
            {importText(language, 'Цена', 'Price')}: {hidden ? '••••' : row.price} {row.currency}
          </p>
          <p className="import-row-status">{rowStatus(row.status, language)}</p>
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
