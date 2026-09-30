import { assessmentDate, validateBuy } from '../model/portfolio.ts';
import type { State } from '../model/portfolio.ts';
import type { Language } from '../i18n.ts';
import { firstAccount, validAccount } from './accounts.ts';

export const operationAssets = [
  'BTC',
  'MSFT',
  'TWT',
  'FUND-DEMO',
  'BOND-DEMO',
  'RUB',
  'USD',
] as const;
export const operationTypes = [
  'buy',
  'sell',
  'deposit',
  'withdrawal',
  'transfer',
  'exchange',
  'income',
  'fee',
  'opening',
  'corporate',
] as const;
export type OperationType = (typeof operationTypes)[number];
export type OperationInput = Readonly<
  Record<
    | 'portfolioId'
    | 'asset'
    | 'quantity'
    | 'price'
    | 'amount'
    | 'fee'
    | 'fx'
    | 'date'
    | 'targetPortfolio'
    | 'account'
    | 'targetAccount'
    | 'priceCurrency'
    | 'feeCurrency'
    | 'receivedAmount'
    | 'currency'
    | 'targetCurrency'
    | 'external'
    | 'note',
    string
  > & { type: OperationType }
>;
export type Field = Exclude<keyof OperationInput, 'type'>;
export type OperationErrors = Readonly<Partial<Record<Field, string>>>;
const operationNames = {
  ru: [
    'Покупка',
    'Продажа',
    'Пополнение',
    'Вывод',
    'Внутренний перевод',
    'Обмен валют',
    'Дивиденд / процент',
    'Комиссия',
    'Начальный остаток',
    'Корпоративное действие',
  ],
  en: [
    'Purchase',
    'Sale',
    'Deposit',
    'Withdrawal',
    'Internal transfer',
    'Currency exchange',
    'Dividend / interest',
    'Fee',
    'Opening balance',
    'Corporate action',
  ],
} as const;
export const operationLabel = (type: OperationType, language: Language) =>
  (language === 'ru' ? operationNames.ru : operationNames.en).at(operationTypes.indexOf(type)) ??
  type;
export const isOperationType = (value: unknown): value is OperationType =>
  operationTypes.some((type) => type === value);

export function initialOperation(state: State, portfolioId: string): OperationInput {
  const selected = portfolioId
    .split(',')
    .find((id) => state.portfolios.some((item) => item.id === id));
  return {
    type: 'buy',
    account: firstAccount(selected ?? state.portfolios.at(0)?.id ?? ''),
    targetAccount: '',
    priceCurrency: 'USD',
    feeCurrency: 'USD',
    receivedAmount: '',
    portfolioId: selected ?? state.portfolios.at(0)?.id ?? '',
    asset: 'BTC',
    quantity: '',
    price: '',
    amount: '',
    fee: '0',
    fx: '100',
    date: assessmentDate,
    targetPortfolio: state.portfolios.find((item) => item.id !== selected)?.id ?? '',
    currency: 'USD',
    targetCurrency: 'RUB',
    note: '',
    external: '',
  };
}
export const operationFields = (type: OperationType, asset = 'USD'): readonly Field[] => {
  if (type === 'buy' || type === 'sell')
    return ['asset', 'quantity', 'price', 'priceCurrency', 'fee', 'feeCurrency', 'fx', 'date'];
  if (type === 'transfer') return transferFields(asset);
  if (type === 'deposit' || type === 'withdrawal')
    return ['currency', 'amount', 'external', 'date'];
  if (type === 'exchange')
    return [
      'currency',
      'targetCurrency',
      'amount',
      'receivedAmount',
      'fx',
      'fee',
      'feeCurrency',
      'date',
    ];
  if (type === 'corporate') return ['asset', 'quantity', 'date', 'note'];
  if (type === 'income') return ['asset', 'currency', 'amount', 'fee', 'date'];
  return ['currency', 'amount', 'date'];
};

function transferFields(asset: string): readonly Field[] {
  const amount: readonly Field[] = ['RUB', 'USD'].includes(asset)
    ? ['currency', 'amount']
    : ['quantity'];
  return ['targetPortfolio', 'targetAccount', 'asset', ...amount, 'fee', 'feeCurrency', 'date'];
}

function validNumber(value: string, allowZero: boolean, max: number) {
  const number = Number(value.trim().replace(',', '.'));
  return (
    value.trim().split(/[.,]/u).length <= 2 &&
    value
      .trim()
      .split(/[.,]/u)
      .every((part) => /^\d+$/u.test(part)) &&
    Number.isFinite(number) &&
    (allowZero ? number >= 0 : number > 0) &&
    number <= max
  );
}
function validDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= '2000-01-01' &&
    value <= assessmentDate
  );
}
function selectionError(field: Field, input: OperationInput, state: State, value: string) {
  if (field === 'targetPortfolio')
    return state.portfolios.some((item) => item.id === value) ? undefined : 'destination';
  if (field === 'account') return validAccount(value, input.portfolioId) ? undefined : 'account';
  if (field === 'targetAccount')
    return validAccount(value, input.targetPortfolio) && value !== input.account
      ? undefined
      : 'destination';
  return currencyError(field, input, value);
}
export const feeCurrencies = (input: OperationInput): readonly string[] =>
  input.type === 'transfer' && ['BTC', 'TWT'].includes(input.asset)
    ? ['RUB', 'USD', input.asset]
    : ['RUB', 'USD'];
function currencyError(field: Field, input: OperationInput, value: string) {
  if (field === 'feeCurrency') return feeCurrencies(input).includes(value) ? undefined : 'currency';
  if (input.type === 'transfer' && field === 'currency')
    return value === input.asset ? undefined : 'cashCurrency';
  return ['RUB', 'USD'].includes(value) && (field !== 'targetCurrency' || value !== input.currency)
    ? undefined
    : 'currency';
}
function textError(field: Field, value: string) {
  const max = field === 'external' ? 120 : 200;
  return value.trim().length > 0 && value.length <= max ? undefined : field;
}
function fieldError(field: Field, input: OperationInput, state: State): string | undefined {
  const value = new Map(Object.entries(input)).get(field) ?? '';
  if (field === 'date') return validDate(value) ? undefined : 'date';
  if (field === 'asset')
    return operationAssets.some((asset) => asset === value) ? undefined : 'asset';
  if (['note', 'external'].includes(field)) return textError(field, value);
  if (
    [
      'targetPortfolio',
      'account',
      'targetAccount',
      'currency',
      'targetCurrency',
      'priceCurrency',
      'feeCurrency',
    ].includes(field)
  )
    return selectionError(field, input, state, value);
  return numericError(field, value, input.type);
}
function numericError(field: Field, value: string, type: OperationType) {
  const max =
    new Map([
      ['fx', 10000],
      ['quantity', 1e6],
      ['fee', 1e7],
    ]).get(field) ?? 1e9;
  return validNumber(value, field === 'fee' || type === 'opening', max) ? undefined : 'positive';
}
export function validateOperation(input: OperationInput, state: State): OperationErrors {
  const errors = Object.fromEntries(
    (['account', ...operationFields(input.type, input.asset)] as const).flatMap((field) => {
      const error = fieldError(field, input, state);
      return error ? [[field, error]] : [];
    }),
  );
  const buyErrors =
    input.type === 'buy' || input.type === 'sell'
      ? Object.fromEntries(
          Object.entries(validateBuy(input)).filter(([field]) => field !== 'asset'),
        )
      : {};
  return {
    ...errors,
    ...buyErrors,
    ...(!state.portfolios.some((item) => item.id === input.portfolioId)
      ? { portfolioId: 'portfolio' }
      : {}),
  };
}
