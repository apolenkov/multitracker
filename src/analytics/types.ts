import type { Language } from '../i18n.ts';
import type { Currency } from '../model/portfolio.ts';

export type AnalyticsProps = Readonly<{
  language: Language;
  currency: Currency;
  baseCurrency: Currency;
  hidden: boolean;
}>;
export type Period = 'month' | 'quarter' | 'year';
export type Analysis = 'performance' | 'allocation' | 'fees' | 'risk' | 'decisions' | 'comparison';
export type ViewProps = AnalyticsProps & Readonly<{ period: Period }>;
export type Name = Readonly<{ ru: string; en: string }>;
