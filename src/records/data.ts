import type { Language } from '../i18n.ts';
import type { Currency, State } from '../model/portfolio.ts';
import type { OperationType, OperationInput } from '../forms/operations.ts';

export type RecordsProps = Readonly<{
  state: State;
  portfolioId: string;
  language: Language;
  currency: Currency;
  baseCurrency: Currency;
  hidden: boolean;
  onSaved?: (message: string) => void;
}>;
export type Transaction = Readonly<{
  id: string;
  portfolioId: string;
  type: OperationType;
  asset: string;
  date: string;
  quantity: number;
  price: number;
  amount: number;
  fee: number;
  fx: number;
  currency: Currency;
  account: string;
  sample: boolean;
  note: Readonly<{ ru: string; en: string }>;
  targetPortfolio?: string;
  targetAccount?: string;
  targetCurrency?: Currency;
}>;
const sampleBase = {
  portfolioId: 'binance',
  quantity: 1,
  price: 0,
  amount: 100,
  fee: 0,
  fx: 100,
  currency: 'USD' as const,
  account: 'binance-main',
  sample: true,
};
export const operationSamples: readonly Transaction[] = [
  {
    ...sampleBase,
    id: 'sale-sample',
    type: 'sell',
    asset: 'BTC',
    quantity: 0.01,
    price: 60000,
    amount: 600,
    date: '2026-09-15',
    note: { ru: 'Частичная продажа', en: 'Partial sale' },
  },
  {
    ...sampleBase,
    id: 'deposit-sample',
    type: 'deposit',
    asset: 'USD',
    date: '2026-09-14',
    note: { ru: 'Пополнение со своего банка', en: 'Deposit from own bank' },
  },
  {
    ...sampleBase,
    id: 'withdraw-sample',
    type: 'withdrawal',
    asset: 'USD',
    date: '2026-09-13',
    note: { ru: 'Вывод в свой банк', en: 'Withdrawal to own bank' },
  },
  {
    ...sampleBase,
    id: 'transfer-sample',
    type: 'transfer',
    asset: 'BTC',
    quantity: 0.001,
    amount: 0,
    fee: 1,
    targetPortfolio: 'bybit',
    targetAccount: 'bybit-main',
    date: '2026-09-12',
    note: {
      ru: 'Перевод BTC между своими счетами, не доход',
      en: 'BTC transfer between own accounts, not income',
    },
  },
  {
    ...sampleBase,
    id: 'fx-sample',
    type: 'exchange',
    asset: 'USD',
    targetCurrency: 'RUB',
    date: '2026-09-11',
    note: { ru: 'Обмен USD в RUB', en: 'Exchange USD for RUB' },
  },
  {
    ...sampleBase,
    portfolioId: 'tradernet',
    account: 'tradernet-main',
    id: 'income-sample',
    type: 'income',
    asset: 'MSFT',
    date: '2026-09-10',
    note: { ru: 'Пример дивиденда', en: 'Dividend sample' },
  },
  {
    ...sampleBase,
    id: 'fee-sample',
    type: 'fee',
    asset: 'USD',
    amount: 5,
    date: '2026-09-09',
    note: { ru: 'Комиссия обслуживания', en: 'Service fee' },
  },
  {
    ...sampleBase,
    id: 'opening-sample',
    type: 'opening',
    asset: 'USD',
    amount: 0,
    date: '2026-01-01',
    note: { ru: 'Начальный денежный остаток', en: 'Opening cash balance' },
  },
  {
    ...sampleBase,
    portfolioId: 'tradernet',
    account: 'tradernet-main',
    id: 'corporate-sample',
    type: 'corporate',
    asset: 'MSFT',
    quantity: 2,
    date: '2026-09-08',
    note: { ru: 'Пример дробления 1:2', en: 'Sample 1:2 split' },
  },
];
export function transactions(state: State, examples = true): readonly Transaction[] {
  const buys: readonly Transaction[] = state.buys.map((buy) => ({
    ...buy,
    account: `${buy.portfolioId}-main`,
    type: 'buy',
    currency: 'USD',
    amount: buy.quantity * buy.price + buy.fee,
    sample: false,
    note: { ru: 'Ручная учебная запись', en: 'Manual teaching entry' },
  }));
  return examples ? [...buys, ...operationSamples] : buys;
}
export function operationInput(record: Transaction, hidden = false): Partial<OperationInput> {
  const amount = (value: number) => (hidden ? '' : String(value));
  return {
    type: record.type,
    portfolioId: record.portfolioId,
    asset: record.asset,
    date: record.date,
    quantity: amount(record.quantity),
    price: amount(record.price),
    amount: amount(record.amount),
    fee: amount(record.fee),
    fx: String(record.fx),
    external: 'Банковский счёт',
    currency: record.currency,
    account: record.account,
    targetPortfolio: record.targetPortfolio ?? 'bybit',
    targetAccount: record.targetAccount ?? 'bybit-main',
    receivedAmount: amount(record.amount * record.fx),
    priceCurrency: record.currency,
    feeCurrency: record.currency,
    targetCurrency: record.targetCurrency ?? 'RUB',
    note: record.note.ru,
  };
}
