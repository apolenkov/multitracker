import { money, number, percentage } from '../i18n.ts';
import { currentFX, type Currency } from '../model/portfolio.ts';
import type { AnalyticsProps } from './types.ts';

export const sampleMoney = (usd: number, currency: Currency, props: AnalyticsProps) =>
  props.hidden
    ? '••••'
    : money(usd * (currency === 'RUB' ? currentFX : 1), currency, props.language);
export const samplePercent = (value: number, props: AnalyticsProps) =>
  props.hidden ? '••••' : percentage(value, props.language);
export const sampleNumber = (value: number, props: AnalyticsProps) =>
  props.hidden ? '••••' : number(value, props.language);
