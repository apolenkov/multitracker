import type { Language } from './words';

export function widgetNumber(language: Language, value: number, signed = false) {
  return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
    signDisplay: signed ? 'always' : 'auto',
  }).format(value);
}
