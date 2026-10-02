import { validAccount } from '../forms/accounts.ts';
export type ImportLanguage = 'ru' | 'en';
export type ImportField = 'date' | 'asset' | 'action' | 'quantity' | 'price' | 'currency';
export const importFields: readonly ImportField[] = [
  'date',
  'asset',
  'action',
  'quantity',
  'price',
  'currency',
];
export const importSources = ['Tradernet', 'Binance', 'Bybit', 'CSV'] as const;
export const importPortfolios = ['tradernet', 'binance', 'bybit'] as const;
export type ImportDraft = Readonly<{
  source: string;
  portfolio: string;
  account: string;
  mapping: Readonly<Record<ImportField, string>>;
  fileSelected: boolean;
  skipUnknown: boolean;
  skipDuplicates: boolean;
}>;
export const initialImport: ImportDraft = {
  source: '',
  portfolio: 'tradernet',
  account: 'tradernet-main',
  mapping: {
    date: 'date',
    asset: 'asset',
    action: 'action',
    quantity: 'quantity',
    price: 'price',
    currency: 'currency',
  },
  fileSelected: false,
  skipUnknown: true,
  skipDuplicates: true,
};
export function importText(language: ImportLanguage, ru: string, en: string) {
  return language === 'ru' ? ru : en;
}
export function importError(draft: ImportDraft, step: number, language: ImportLanguage) {
  if (!importSources.some((source) => source === draft.source)) {
    return importText(language, 'Выберите источник.', 'Choose a source.');
  }
  if (!importPortfolios.some((portfolio) => portfolio === draft.portfolio)) {
    return importText(language, 'Выберите портфель.', 'Choose a portfolio.');
  }
  if (!validAccount(draft.account, draft.portfolio)) {
    return importText(
      language,
      'Выберите счёт внутри портфеля.',
      'Choose an account within the portfolio.',
    );
  }
  if (step >= 1 && !draft.fileSelected) {
    return importText(language, 'Выберите файл.', 'Select the file.');
  }
  if (step >= 2 && importFields.some((field) => importColumn(draft, field) !== field)) {
    return importText(
      language,
      'Сопоставьте все обязательные поля с одноимёнными столбцами файла.',
      'Map all required fields to the matching columns in the file.',
    );
  }
  if (step >= 3 && !safeImportRows(draft)) {
    return importText(
      language,
      'Пропустите неизвестный актив и повтор: эти строки нельзя принять в примере.',
      'Skip the unknown asset and duplicate: these rows cannot be accepted in this sample.',
    );
  }
  return '';
}
function safeImportRows(draft: ImportDraft) {
  return draft.skipUnknown && draft.skipDuplicates;
}
export function importColumn(draft: ImportDraft, field: ImportField) {
  return (
    Object.entries(draft.mapping)
      .find(([key]) => key === field)
      ?.at(1) ?? ''
  );
}
export function mapImportField(
  draft: ImportDraft,
  field: ImportField,
  column: string,
): ImportDraft {
  return { ...draft, mapping: { ...draft.mapping, [field]: column } };
}
export const sampleImportRows = [
  {
    id: '1',
    date: '2026-09-02',
    asset: 'MSFT',
    quantity: '2',
    price: '450',
    currency: 'USD',
    status: 'ready',
  },
  {
    id: '2',
    date: '2026-09-04',
    asset: 'BTC',
    quantity: '0.01',
    price: '60000',
    currency: 'USD',
    status: 'ready',
  },
  {
    id: '3',
    date: '2026-09-06',
    asset: 'UNKNOWN',
    quantity: '3',
    price: '10',
    currency: 'USD',
    status: 'unknown',
  },
  {
    id: '4',
    date: '2026-09-02',
    asset: 'MSFT',
    quantity: '2',
    price: '450',
    currency: 'USD',
    status: 'duplicate',
  },
] as const;
