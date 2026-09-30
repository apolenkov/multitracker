import type { Language } from '../i18n.ts';
export const accountSamples = [
  { id: 'tradernet-main', portfolioId: 'tradernet', name: 'Tradernet · main' },
  { id: 'tradernet-savings', portfolioId: 'tradernet', name: 'Tradernet · savings' },
  { id: 'binance-main', portfolioId: 'binance', name: 'Binance · spot' },
  { id: 'bybit-main', portfolioId: 'bybit', name: 'Bybit · spot' },
] as const;
export const firstAccount = (portfolioId: string) =>
  accountSamples.find((account) => account.portfolioId === portfolioId)?.id ?? '';
export const validAccount = (id: string, portfolioId: string) =>
  accountSamples.some((account) => account.id === id && account.portfolioId === portfolioId);

export function accountLabel(id: string, language: Language) {
  const account = accountSamples.find((item) => item.id === id);
  if (!account) return id;
  const names =
    language === 'ru'
      ? [
          'Tradernet · основной',
          'Tradernet · накопительный',
          'Binance · спотовый',
          'Bybit · спотовый',
        ]
      : accountSamples.map((item) => item.name);
  return names.at(accountSamples.indexOf(account)) ?? id;
}
