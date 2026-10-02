/** Находки части (b): markdown с повтором и вердиктом продукта/проверяльщика. */

export type ReproFinding = Readonly<{
  rule: string;
  selector: string;
  expected: string;
  actual: string;
  seed: number;
  path: string;
  env: string;
}>;

export type Verdict = 'product defect' | 'checker defect';

/** Пока все находки детерминированных проверок — дефекты продукта. */
export const verdictOf = (finding: Readonly<{ rule: string }>): Verdict =>
  finding.rule === '__checker__' ? 'checker defect' : 'product defect';

const oneRow = (finding: ReproFinding): string =>
  [
    `## ${finding.rule} — ${finding.selector}`,
    '',
    `- verdict: ${verdictOf(finding)}`,
    `- repro: seed=${finding.seed} path=${finding.path} env=${finding.env}`,
    `- expected: ${finding.expected}`,
    `- actual: ${finding.actual}`,
  ].join('\n');

/** Markdown находок: заголовок, число и по разделу на находку с повтором. */
export const findingsMarkdown = (rows: readonly ReproFinding[]): string =>
  ['# Exhaust (b) findings', '', `count: ${rows.length}`, '', ...rows.map(oneRow)].join('\n');
