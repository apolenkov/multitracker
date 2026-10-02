export const demoScreens = ['import', 'connections', 'sync', 'settings'] as const;
export type Screen = (typeof demoScreens)[number];
export type Language = 'ru' | 'en';
export type Currency = 'RUB' | 'USD';
export type Density = 'comfortable' | 'compact';
export type Theme = 'dark' | 'light' | 'system';
export type DemoState = 'ready' | 'loading' | 'empty' | 'missing' | 'error';

export const words = {
  ru: {
    example: 'Пример',
    demoStates: {
      ready: 'Заполнено',
      loading: 'Загрузка',
      empty: 'Пустой портфель',
      missing: 'Нет цены или курса',
      error: 'Ошибка сохранения',
    },
    stateReasons: {
      loading: 'Пример ожидания данных. Запросы не выполняются; загрузка не завершится сама.',
      empty: 'В этом примере у портфеля нет активов и операций. Добавьте заполненный пример.',
      missing: 'Цена актива или валютный курс недоступны. Стоимость не рассчитана: это не ноль.',
      error: 'Пример неудачного сохранения. Данные не отправлены; повторите показ примера.',
    },
    unavailable: '— · Недоступно',
    addExample: 'Добавить пример',
    retry: 'Повторить попытку',
    returnExample: 'Вернуться к примеру',
  },
  en: {
    example: 'Example',
    demoStates: {
      ready: 'Populated',
      loading: 'Loading',
      empty: 'Empty portfolio',
      missing: 'Missing price or exchange rate',
      error: 'Save error',
    },
    stateReasons: {
      loading: 'Sample data wait. No requests are made; loading will not finish automatically.',
      empty: 'This sample portfolio has no assets or activity. Add a populated sample.',
      missing: 'An asset price or exchange rate is unavailable. Value is unknown, not zero.',
      error: 'Sample save failure. No data was sent; try showing the sample again.',
    },
    unavailable: '— · Unavailable',
    addExample: 'Add sample',
    retry: 'Try again',
    returnExample: 'Return to sample',
  },
} as const;

export type Props = Readonly<{
  screen: Screen;
  language: Language;
  currency: Currency;
  baseCurrency: Currency;
  theme: Theme;
  monochrome: boolean;
  onMonochrome: (value: boolean) => void;
  onLanguage: (v: Language) => void;
  onCurrency: (v: Currency) => void;
  onBaseCurrency: (v: Currency) => void;
  onTheme: (v: Theme) => void;
  hidden: boolean;
  onHidden: (v: boolean) => void;
  demoState: DemoState;
  onDemoState: (v: DemoState) => void;
  onShowExample: () => void;
}>;
export type Texts = {
  [K in keyof typeof words.ru]: (typeof words.ru)[K] extends object
    ? { [P in keyof (typeof words.ru)[K]]: string }
    : string;
};
