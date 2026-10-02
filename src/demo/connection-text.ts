export const connectionText = {
  ru: {
    title: 'Подключения источников',
    configure: 'Настроить',
    edit: 'Изменить настройки',
    disconnected: 'Не настроено',
    configured: 'Настроено',
    disconnect: 'Отключить',
    destination: 'Портфель назначения',
    account: 'Счёт назначения',
    start: 'Начало истории',
    dateError: 'Выберите дату с 01.01.2000 по 30.09.2026.',
    token: 'Ключ, только чтение',
    rights: 'Разрешения: чтение остатков и истории. Торговля и вывод запрещены.',
    privacy:
      'В будущем ключ источника должен оставаться на вашем устройстве. Серверная синхронизация с брокером потребует отдельного решения о приватности.',
    onlyDemo: 'Это макет: настоящих ключей, подключений и сетевых запросов нет.',
    test: 'Проверить подключение',
    result: 'Результат проверки',
    success: 'Успешная проверка',
    error: 'Ошибка доступа',
    retry: 'Повторить проверку',
    passed: 'Проверка успешна: доступны только остатки и история.',
    failed: 'Ошибка: чтение истории недоступно. Повторите проверку.',
    save: 'Сохранить',
    cancel: 'Отмена',
    bank: 'Банковский счёт',
    wallet: 'Криптокошелёк',
    saved: 'Учебная конфигурация сохранена только в памяти вкладки.',
    removed: 'Источник отключён в примере. Никакие ключи и операции не удалялись.',
    removedRow: 'Источник отключён',
    history: 'История с',
  },
  en: {
    title: 'Source connections',
    configure: 'Configure',
    edit: 'Edit settings',
    disconnected: 'Not configured',
    configured: 'Configured',
    disconnect: 'Disconnect',
    destination: 'Destination portfolio',
    account: 'Destination account',
    start: 'History starts on',
    dateError: 'Choose a date from 2000-01-01 to 2026-09-30.',
    token: 'Read-only key',
    rights: 'Permissions: read balances and history. Trading and withdrawals are prohibited.',
    privacy:
      'Future source credentials should remain on your device. Server-side broker sync needs a separate privacy decision.',
    onlyDemo: 'Mockup only: no real credentials, connections or network requests.',
    test: 'Test connection',
    result: 'Test outcome',
    success: 'Successful test',
    error: 'Access error',
    retry: 'Retry test',
    passed: 'Test passed: only balances and history are accessible.',
    failed: 'Error: history access is unavailable. Retry the test.',
    save: 'Save',
    cancel: 'Cancel',
    bank: 'Bank account',
    wallet: 'Crypto wallet',
    saved: 'Sample configuration retained only in this tab’s memory.',
    removed: 'Source disconnected in the sample. No credentials or activity were deleted.',
    removedRow: 'Source disconnected',
    history: 'History since',
  },
};
export type ConnectionWords = (typeof connectionText)['ru'];
export type Connection = Readonly<{
  provider: string;
  portfolio: string;
  account: string;
  start: string;
}>;
export type ConnectionProps = Readonly<{
  language: 'ru' | 'en';
  notify: (message: string) => void;
}>;
export const providers = ['Tradernet', 'Binance', 'Bybit', 'wallet', 'bank'];
export function providerLabel(provider: string, t: ConnectionWords) {
  if (provider === 'wallet') return t.wallet;
  return provider === 'bank' ? t.bank : provider;
}
