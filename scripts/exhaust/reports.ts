/** Отчёты прогона: реестр элементов, покрытие кода, сводка и проверки ratchet. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Finding, RunLog } from './records.ts';
import { buildRegistry, coveragePercent, elementMarkdown, sectionCoverage } from './registry.ts';
import type { RegistryInput, SectionCoverage } from './registry.ts';
import { checkLedger, parseLedger } from './ledger.ts';
import type { LedgerCheck } from './ledger.ts';
import { codeMarkdown } from './coverage.ts';
import type { FileReport } from './coverage.ts';
import type { ScriptCoverage } from './cdp.ts';

export const routes = [
  'overview',
  'portfolios',
  'history',
  'import',
  'connections',
  'sync',
  'settings',
] as const;

export type Attribution = Readonly<{ route: string; fresh: number; durationMs: number }>;
export type Acc = Readonly<{
  seq: number;
  seen: readonly RegistryInput[];
  clicked: readonly string[];
  attribution: readonly Attribution[];
  errors: readonly string[];
  findings: readonly Finding[];
  scripts: readonly ScriptCoverage[];
  prev: readonly FileReport[];
}>;

export type Checks = Readonly<{
  element: LedgerCheck;
  code: LedgerCheck;
  errors: readonly string[];
}>;

const ledgerChecks = (
  sections: readonly SectionCoverage[],
  finalReports: readonly FileReport[],
): Readonly<{ element: LedgerCheck; code: LedgerCheck }> => ({
  element: checkLedger(
    sections.flatMap((section) => section.uncovered),
    parseLedger(readFileSync('scripts/exhaust/uncovered-ledger.json', 'utf8')),
  ),
  code: checkLedger(
    finalReports.flatMap((report) => report.uncoveredFunctions.map((fn) => `${report.file}|${fn}`)),
    parseLedger(readFileSync('scripts/exhaust/uncovered-code-ledger.json', 'utf8')),
  ),
});

const writeCodeReports = (log: RunLog, acc: Acc, finalReports: readonly FileReport[]): void => {
  const attribution = acc.attribution.map(
    (item) => `- ${item.route}: +${item.fresh} functions (${item.durationMs}ms)`,
  );
  log.saveText(
    'code-coverage.md',
    [codeMarkdown(finalReports), '', '# Per-section attribution', ...attribution].join('\n'),
  );
  log.saveJson('code-coverage.json', { reports: finalReports, attribution: acc.attribution });
};

const totals = (reports: readonly FileReport[], pick: (report: FileReport) => number) =>
  reports.reduce((sum, report) => sum + pick(report), 0);

const summaryOf = (
  acc: Acc,
  sections: readonly SectionCoverage[],
  finalReports: readonly FileReport[],
  checks: Readonly<{ element: LedgerCheck; code: LedgerCheck }>,
) => ({
  routes: routes.length,
  clicks: acc.seq - 1,
  element: sections.map((section) => ({
    route: section.route,
    pct: coveragePercent(section.clicked, section.seen),
  })),
  functions: [
    totals(finalReports, (report) => report.functionsCovered),
    totals(finalReports, (report) => report.functionsTotal),
  ],
  branches: [
    totals(finalReports, (report) => report.branchesCovered),
    totals(finalReports, (report) => report.branchesTotal),
  ],
  consoleErrors: acc.errors.length,
  findings: acc.findings.length,
  elementLedger: checks.element,
  codeLedger: checks.code,
});

/** Реестр, покрытие кода, находки и сводка: всё в каталог запуска. */
export const writeReports = (
  log: RunLog,
  acc: Acc,
  finalReports: readonly FileReport[],
): Checks => {
  const entries = buildRegistry(acc.seen, new Set(acc.clicked));
  const sections = sectionCoverage(entries);
  log.saveText('element-coverage.md', elementMarkdown(sections, entries));
  log.saveJson('element-coverage.json', { sections, entries });
  const checks = ledgerChecks(sections, finalReports);
  writeCodeReports(log, acc, finalReports);
  log.saveJson('findings.json', acc.findings);
  const summary = summaryOf(acc, sections, finalReports, checks);
  log.saveJson('summary.json', summary);
  console.log(JSON.stringify(summary, null, 2));
  return { ...checks, errors: acc.errors };
};

export const reportChecks = (checks: Checks): void => {
  assert.equal(checks.errors.length, 0, `console errors: ${checks.errors.slice(0, 3).join(' | ')}`);
  assert.ok(checks.element.ok, `element ledger: ${JSON.stringify(checks.element)}`);
  assert.ok(checks.code.ok, `code ledger: ${JSON.stringify(checks.code)}`);
};
