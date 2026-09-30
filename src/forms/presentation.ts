import type { Language } from '../i18n.ts';
import type { Field, OperationInput, OperationType } from './operations.ts';

const copy = {
  ru: {
    sample: 'Учебный пример · данные не сохраняются',
    context: 'Счёт',
    source: 'Откуда',
    destination: 'Куда',
    asset: 'Актив',
    trade: 'Количество и цена',
    amount: 'Сумма',
    spent: 'Отдаю',
    received: 'Получаю',
    timing: 'Курс и дата',
    date: 'Дата',
    additional: 'Дополнительные сведения',
    accountIn: 'Счёт зачисления',
    accountOut: 'Счёт списания',
    portfolio: 'Портфель',
    portfolioId: 'Портфель',
    targetPortfolio: 'Портфель получателя',
    targetAccount: 'Счёт получателя',
    quantity: 'Количество',
    sellQuantity: 'Продать, единиц',
    ratio: 'Коэффициент дробления',
    note: 'Заметка',
    corporateNote: 'Описание действия',
    fee: 'Комиссия',
    amountIn: 'Зачислить',
    amountOut: 'Списать',
    balance: 'Остаток на дату',
    zero: 'Ноль допустим. Это остаток, а не доход.',
    fx: 'Курс на дату операции: RUB за 1 USD',
    saves: [
      'Добавить покупку',
      'Добавить продажу',
      'Добавить пополнение',
      'Добавить вывод',
      'Добавить перевод',
      'Добавить обмен',
      'Добавить доход',
      'Добавить комиссию',
      'Указать остаток',
      'Добавить действие',
    ],
    edit: 'Сохранить изменения',
    display: 'Валюта показа',
    parent: 'В составе портфеля',
    selected: 'Выбрано портфелей',
    selection: 'Объединить для просмотра',
  },
  en: {
    sample: 'Teaching sample · records are not saved',
    context: 'Account',
    source: 'From',
    destination: 'To',
    asset: 'Asset',
    trade: 'Quantity and price',
    amount: 'Amount',
    spent: 'Give',
    received: 'Receive',
    timing: 'Rate and date',
    date: 'Date',
    additional: 'Additional details',
    accountIn: 'Receiving account',
    accountOut: 'Paying account',
    portfolio: 'Portfolio',
    portfolioId: 'Portfolio',
    targetPortfolio: 'Receiving portfolio',
    targetAccount: 'Receiving account',
    quantity: 'Quantity',
    sellQuantity: 'Units to sell',
    ratio: 'Split ratio',
    note: 'Note',
    corporateNote: 'Action description',
    fee: 'Fee',
    amountIn: 'Credit',
    amountOut: 'Debit',
    balance: 'Balance on date',
    zero: 'Zero is valid. This is a balance, not income.',
    fx: 'Rate on transaction date: RUB per 1 USD',
    saves: [
      'Add purchase',
      'Add sale',
      'Add deposit',
      'Add withdrawal',
      'Add transfer',
      'Add exchange',
      'Add income',
      'Add fee',
      'Set opening balance',
      'Add action',
    ],
    edit: 'Save changes',
    display: 'Display currency',
    parent: 'Within portfolio',
    selected: 'Portfolios selected',
    selection: 'Combine for viewing',
  },
} as const;
export const presentationCopy = (language: Language) => (language === 'ru' ? copy.ru : copy.en);
const types: readonly OperationType[] = [
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
];
export const operationSubmit = (type: OperationType, language: Language) =>
  presentationCopy(language).saves.at(types.indexOf(type)) ?? presentationCopy(language).edit;
export function subjectLabel(
  field: Field,
  input: OperationInput,
  language: Language,
): string | undefined {
  const labels = presentationCopy(language);
  const amounts = new Map([
    ['amount', amountLabel(input, language)],
    ['receivedAmount', `${labels.received}, ${input.targetCurrency}`],
    ['price', `${language === 'ru' ? 'Цена за единицу' : 'Unit price'}, ${input.priceCurrency}`],
    ['fee', `${labels.fee}, ${input.type === 'income' ? input.currency : input.feeCurrency}`],
  ]);
  if (field === 'account') return accountTitle(input, language);
  if (field === 'quantity') return quantityLabel(input, language);
  if (field === 'note') return input.type === 'corporate' ? labels.corporateNote : labels.note;
  return amounts.get(field) ?? structuralLabels(language).get(field);
}
function amountLabel(input: OperationInput, language: Language) {
  const labels = presentationCopy(language);
  if (input.type === 'opening') return `${labels.balance}, ${input.currency}`;
  const direction = ['deposit', 'income'].includes(input.type) ? labels.amountIn : labels.amountOut;
  return `${direction}, ${input.currency}`;
}
function quantityLabel(input: OperationInput, language: Language) {
  const labels = presentationCopy(language);
  if (input.type === 'corporate') return labels.ratio;
  return input.type === 'sell' ? labels.sellQuantity : `${labels.quantity}, ${input.asset}`;
}

function structuralLabels(language: Language) {
  const labels = presentationCopy(language);
  return new Map([
    ['portfolioId', labels.portfolio],
    ['targetPortfolio', labels.targetPortfolio],
    ['targetAccount', labels.targetAccount],
    ['fx', labels.fx],
  ]);
}

function accountTitle(input: OperationInput, language: Language) {
  const labels = presentationCopy(language);
  if (['deposit', 'income'].includes(input.type)) return labels.accountIn;
  if (['withdrawal', 'transfer'].includes(input.type)) return labels.accountOut;
  return labels.context;
}
