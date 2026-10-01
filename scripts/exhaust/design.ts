/** Конфигурация детерминированных дизайн-проверок: шкалы из DESIGN.md и CSS. */
import { readFileSync } from 'node:fs';
import { designScales, cssRadii, tokenNames } from './tokens.ts';
import type { Finding } from './records.ts';

export type DesignConfig = Readonly<{
  fontSizes: readonly number[];
  fontWeights: readonly number[];
  spacings: readonly number[];
  radii: readonly string[];
  tokenNames: readonly string[];
}>;

export const designConfig = (): DesignConfig => {
  const scales = designScales(readFileSync('DESIGN.md', 'utf8'));
  const css = ['src/appearance.css', 'src/charts.css', 'src/base.css', 'src/forms/forms.css']
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  return {
    fontSizes: scales.fontSizes,
    fontWeights: scales.fontWeights,
    spacings: scales.spacings,
    radii: [...new Set([...scales.radii, ...cssRadii(css)])],
    tokenNames: tokenNames(readFileSync('src/appearance.css', 'utf8')),
  };
};

const critical = ['console-error', 'page-overflow', 'multi-dialog', 'contrast-text'];
const important = [
  'missing-accessible-name',
  'duplicate-id',
  'clipped-text',
  'overlap',
  'outside-viewport',
  'sticky-covers-focus',
  'focus-style',
  'h1-count',
  'heading-skip',
  'hidden-amount-digit',
  'hidden-amount-tone',
  'hidden-amount-arrow',
  'i18n-leak',
  'i18n-key',
  'layout-shift',
];

/** Серьёзность правила: критические ломают смысл, важные — доступность, прочие — шероховатости. */
export const severity = (rule: string): 'critical' | 'important' | 'minor' =>
  critical.includes(rule) ? 'critical' : important.includes(rule) ? 'important' : 'minor';

export type FindingSeen = Finding & Readonly<{ severity: string }>;

export const withSeverity = (finding: Finding): FindingSeen => ({
  ...finding,
  severity: severity(finding.rule),
});

/** Ключ дедупликации находки: правило + селектор + суть расхождения. */
export const findingKey = (finding: Finding) =>
  [finding.rule, finding.selector, finding.expected, finding.actual].join('|');
