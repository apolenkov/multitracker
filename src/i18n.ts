import type { Currency } from './model/portfolio.ts';
export type Language = 'ru' | 'en';
export type Screen =
  | 'overview'
  | 'portfolios'
  | 'history'
  | 'markets'
  | 'following'
  | 'analytics'
  | 'events'
  | 'import'
  | 'connections'
  | 'sync'
  | 'settings';
export const copy = {
  ru: {
    overview: 'Обзор',
    portfolios: 'Портфели',
    history: 'Операции',
    markets: 'Рынки',
    following: 'Избранное',
    analytics: 'Аналитика',
    events: 'События',
    recentHistory: 'Последние операции',
    venue: 'Площадка',
    demoBrokerAccount: 'Учебный брокерский счёт',
    demoSpotAccount: 'Учебный спотовый счёт',
    demoAccount: 'Учебный счёт',
    sortBy: 'Сортировать по',
    ascending: 'по возрастанию',
    descending: 'по убыванию',
    chartTitle: 'Стоимость портфеля: вымышленная история',
    chartPeriod: 'Период',
    chartDate: 'Дата',
    chartContributions: 'Внесено',
    chartChange: 'Изменение стоимости за период',
    chartAdded: 'Внесено за период',
    chartDates: 'Суммы по ключевым датам',
    chartSampleNote:
      'Траектория и внесённые суммы вымышлены. Это не история операций и не рыночные котировки.',
    import: 'Импорт',
    connections: 'Подключения',
    sync: 'Синхронизация',
    settings: 'Настройки',
    more: 'Ещё',
    demo: 'Демонстрационные данные',
    memory: 'Все данные — примеры. Записи не сохраняются.',
    skip: 'Перейти к содержимому',
    all: 'Все портфели',
    show: 'Показывать в',
    language: 'Язык',
    total: 'Стоимость сейчас',
    basis: 'Стоимость приобретения',
    result: 'Результат',
    profit: 'Прибыль',
    loss: 'Убыток',
    asOf: 'Оценка на',
    fixed: 'Учебные цены · USD/RUB = 120',
    add: 'Добавить операцию',
    create: 'Создать портфель',
    explanation: 'Что изменило сумму',
    example: 'Почему результат в рублях и долларах разный',
    exampleNote: 'Фиксированный учебный пример — не результат выбранного портфеля.',
    starting: 'Вложено',
    now: 'Сейчас',
    assetPrice: 'Изменение цены',
    exchange: 'Изменение курса',
    joint: 'Совместный эффект',
    exampleText:
      '100 000 RUB → 1 000 USD → 900 USD. При текущем курсе 120 RUB за USD это 108 000 RUB: +8 000 RUB (+8%), но −100 USD (−10%).',
    exampleRule:
      'Разложение при начальных ценах: совместный эффект показан отдельно. Без промежуточных потоков и комиссий.',
    compare: 'Стоимость приобретения и текущая оценка',
    chartNote: 'Две суммы выбранных активов. Это сравнение, а не история рыночных котировок.',
    holdings: 'Активы',
    asset: 'Актив',
    quantity: 'Количество',
    value: 'Стоимость',
    weight: 'Доля',
    empty: 'Этот портфель пока пуст',
    emptyHelp: 'Добавьте первую демонстрационную покупку.',
    count: 'Портфелей',
    select: 'Открыть',
    noHistory: 'Операций пока нет',
    buy: 'Покупка',
    fee: 'Комиссия, USD',
    price: 'Цена за единицу, USD',
    fx: 'USD/RUB на дату покупки',
    date: 'Дата покупки',
    portfolio: 'Портфель',
    name: 'Название портфеля',
    nameHint: 'От 1 до 80 символов',
    close: 'Закрыть',
    cancel: 'Отменить',
    save: 'Сохранить',
    buyNote:
      'Макет учитывает только покупки. Их стоимость с комиссией считается вложенной суммой; денежный остаток и отдельные взносы не ведутся. В полном учёте покупка сама по себе не является взносом.',
    limits:
      'Пределы макета: количество до 1 млн, цена и комиссия до 10 млн USD, курс до 10 000; сумма до 1 млрд USD / 1 трлн RUB.',
    positive: 'Введите конечное положительное число в пределах макета.',
    feeError: 'Введите комиссию от 0 до 10 млн USD.',
    dateError: 'Выберите существующую дату с 01.01.2000 до даты оценки.',
    nameError: 'Введите название от 1 до 80 символов.',
    totalError: 'Сумма покупки превышает предел макета.',
    assetError: 'Выберите актив из списка.',
    created: 'Это пример. Данные не сохранены.',
    purchased: 'Это пример. Данные не сохранены.',
    historyNote: 'Только покупки · исторический курс и комиссия включены в стоимость приобретения.',
    cost: 'Сумма с комиссией',
    demoOnly: 'Используйте только придуманные данные.',
    privacy: 'О приватности',
    assetDetails: 'Сведения об активе',
    currentPrice: 'Цена за единицу',
    source: 'Источник',
    privacyText:
      'Это статический макет: сервера, базы данных и шифрования нет. Значения форм не сохраняются и не передаются. Файлы не читаются; подключения, котировки и синхронизация — только примеры. Не вводите настоящие финансовые данные и ключи.',
    hidden: 'Суммы скрыты',
  },
  en: {
    overview: 'Overview',
    portfolios: 'Portfolios',
    history: 'Transactions',
    markets: 'Markets',
    following: 'Favorites',
    analytics: 'Analytics',
    events: 'Events',
    recentHistory: 'Recent transactions',
    venue: 'Venue',
    demoBrokerAccount: 'Sample brokerage account',
    demoSpotAccount: 'Sample spot account',
    demoAccount: 'Sample account',
    sortBy: 'Sort by',
    ascending: 'ascending',
    descending: 'descending',
    chartTitle: 'Portfolio value: fictional history',
    chartPeriod: 'Period',
    chartDate: 'Date',
    chartContributions: 'Contributed',
    chartChange: 'Value change over the period',
    chartAdded: 'Contributed during the period',
    chartDates: 'Values on key dates',
    chartSampleNote:
      'The trajectory and contributions are fictional. This is neither transaction history nor market prices.',
    import: 'Import',
    connections: 'Connections',
    sync: 'Sync',
    settings: 'Settings',
    more: 'More',
    demo: 'Demonstration data',
    memory: 'All data is illustrative. Records are not saved.',
    skip: 'Skip to content',
    all: 'All portfolios',
    show: 'Display in',
    language: 'Language',
    total: 'Current value',
    basis: 'Acquisition cost',
    result: 'Result',
    profit: 'Profit',
    loss: 'Loss',
    asOf: 'Valued on',
    fixed: 'Illustrative prices · USD/RUB = 120',
    add: 'Add transaction',
    create: 'Create portfolio',
    explanation: 'What changed the amount',
    example: 'Why the result differs in rubles and dollars',
    exampleNote: 'A fixed teaching example, separate from the selected portfolio.',
    starting: 'Invested',
    now: 'Now',
    assetPrice: 'Asset price change',
    exchange: 'Exchange rate change',
    joint: 'Combined effect',
    exampleText:
      '100,000 RUB → 1,000 USD → 900 USD. At the current rate of 120 RUB per USD, this is 108,000 RUB: +8,000 RUB (+8%), but −100 USD (−10%).',
    exampleRule:
      'Decomposition at initial prices: the combined effect is shown separately. No intermediate cash flows or fees.',
    compare: 'Acquisition cost and current valuation',
    chartNote: 'Two amounts for the selected assets. A comparison, not a market price history.',
    holdings: 'Assets',
    asset: 'Asset',
    quantity: 'Quantity',
    value: 'Value',
    weight: 'Weight',
    empty: 'This portfolio is empty',
    emptyHelp: 'Add your first demonstration purchase.',
    count: 'Portfolios',
    select: 'Open',
    noHistory: 'No transactions yet',
    buy: 'Purchase',
    fee: 'Fee, USD',
    price: 'Unit price, USD',
    fx: 'USD/RUB on purchase date',
    date: 'Purchase date',
    portfolio: 'Portfolio',
    name: 'Portfolio name',
    nameHint: '1 to 80 characters',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    buyNote:
      'This prototype tracks purchases only. Cost including fees counts as invested capital; cash balances and separate contributions are not tracked. In a full ledger, a purchase is not a contribution itself.',
    limits:
      'Prototype limits: quantity up to 1 million, price and fee up to 10 million USD, FX up to 10,000; total up to 1 billion USD / 1 trillion RUB.',
    positive: 'Enter a finite positive number within prototype limits.',
    feeError: 'Enter a fee from 0 to 10 million USD.',
    dateError: 'Choose a valid date from Jan 1, 2000 to the valuation date.',
    nameError: 'Enter a name of 1 to 80 characters.',
    totalError: 'The purchase total exceeds prototype limits.',
    assetError: 'Select an asset from the list.',
    created: 'This is a sample. No data was saved.',
    purchased: 'This is a sample. No data was saved.',
    historyNote:
      'Purchases only · historical exchange rates and fees are included in acquisition cost.',
    cost: 'Amount including fee',
    demoOnly: 'Use invented data only.',
    privacy: 'About privacy',
    assetDetails: 'Asset details',
    currentPrice: 'Illustrative unit price',
    source: 'Source',
    privacyText:
      'This is a static prototype: there is no server, database or encryption. Form values are neither saved nor transmitted. Files are not read; connections, prices and synchronization are examples only. Do not enter real financial data or keys.',
    hidden: 'Amounts hidden',
  },
} as const;
export type Labels = (typeof copy)[Language];
export const locale = (language: Language) => (language === 'ru' ? 'ru-RU' : 'en-US');
export const money = (value: number, currency: Currency, language: Language, signed = false) =>
  new Intl.NumberFormat(locale(language), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value);
export const number = (value: number, language: Language) =>
  new Intl.NumberFormat(locale(language), { maximumFractionDigits: 6 }).format(value);
export const date = (value: string, language: Language) =>
  new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );

export const getLabels = (language: Language): Labels => (language === 'ru' ? copy.ru : copy.en);
export const text = (labels: Labels, key: keyof Labels) =>
  new Map(Object.entries(labels)).get(key) ?? key;
export const percentage = (value: number, language: Language) =>
  new Intl.NumberFormat(locale(language), { style: 'percent', maximumFractionDigits: 2 }).format(
    value / 100,
  );

export function demoAccount(portfolioId: string, language: Language) {
  const labels = getLabels(language);
  if (portfolioId === 'tradernet') return labels.demoBrokerAccount;
  if (portfolioId === 'binance' || portfolioId === 'bybit') return labels.demoSpotAccount;
  return labels.demoAccount;
}
