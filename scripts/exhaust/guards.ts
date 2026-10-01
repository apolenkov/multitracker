/** Узкие проверки неизвестных значений: вместо приведений — предикаты и текст. */

export const asText = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : '';

export const isRecord = (value: unknown): value is { readonly [key: string]: unknown } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const asArray = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? value : [];
