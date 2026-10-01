/** Точка входа исчерпывающего прогона: слои 1–3 по всем разделам. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBrowser, evaluate } from '../ui-driver.ts';
import type { Browser } from '../ui-driver.ts';
import { baseEnv } from './axes.ts';
import { installHooksSource } from './page-dom.ts';
import { applyEnv } from './envctl.ts';
import { createRunLog } from './records.ts';
import type { RunLog } from './records.ts';
import { buildRegistry, coveragePercent, elementMarkdown, sectionCoverage } from './registry.ts';
import type { RegistryInput, SectionCoverage } from './registry.ts';
import { checkLedger, parseLedger } from './ledger.ts';
import type { LedgerCheck } from './ledger.ts';
import { visitSection } from './sweep.ts';
import type { SectionResult } from './sweep.ts';
import { clickedSignatures } from './journal.ts';
import { connectPage, startCoverage, stopCoverage, takeCoverage } from './cdp.ts';
import type { CdpSend, ScriptCoverage } from './cdp.ts';
import { codeMarkdown, fetchSource, fileReports, mergeScripts, newlyCovered } from './coverage.ts';
import type { FileReport, ScriptSource } from './coverage.ts';

const routes = [
  'overview',
  'portfolios',
  'history',
  'import',
  'connections',
  'sync',
  'settings',
] as const;

type Attribution = Readonly<{ route: string; fresh: number; durationMs: number }>;
type Acc = Readonly<{
  seq: number;
  seen: readonly RegistryInput[];
  clicked: readonly string[];
  attribution: readonly Attribution[];
  errors: readonly string[];
  findings: number;
  scripts: readonly ScriptCoverage[];
  prev: readonly FileReport[];
}>;

const seedAcc = (scripts: readonly ScriptCoverage[], sources: readonly ScriptSource[]): Acc => ({
  seq: 1,
  seen: [],
  clicked: [],
  attribution: [],
  errors: [],
  findings: 0,
  scripts,
  prev: fileReports(scripts, sources),
});

const nextAcc = (
  prev: Acc,
  result: SectionResult,
  route: string,
  scripts: readonly ScriptCoverage[],
  reports: readonly FileReport[],
): Acc => ({
  seq: prev.seq + result.clicks.length,
  seen: [...prev.seen, ...result.seen],
  clicked: [...prev.clicked, ...clickedSignatures(result.seen)],
  attribution: [
    ...prev.attribution,
    { route, fresh: newlyCovered(prev.prev, reports).length, durationMs: result.durationMs },
  ],
  errors: [...prev.errors, ...result.consoleErrors],
  findings: prev.findings + result.findings.length,
  scripts,
  prev: reports,
});

const collectOne = async (
  browser: Browser,
  log: RunLog,
  send: CdpSend,
  sources: readonly ScriptSource[],
  prev: Acc,
  route: string,
): Promise<Acc> => {
  const result = visitSection(browser, route, prev.seq, baseEnv);
  log.appendClicks(result.clicks);
  const scripts = mergeScripts(prev.scripts, await takeCoverage(send));
  return nextAcc(prev, result, route, scripts, fileReports(scripts, sources));
};

const collectAll = (
  browser: Browser,
  log: RunLog,
  send: CdpSend,
  sources: readonly ScriptSource[],
  initial: readonly ScriptCoverage[],
): Promise<Acc> =>
  routes.reduce<Promise<Acc>>(
    async (prevP, route) => await collectOne(browser, log, send, sources, await prevP, route),
    Promise.resolve(seedAcc(initial, sources)),
  );

type Checks = Readonly<{ element: LedgerCheck; code: LedgerCheck; errors: readonly string[] }>;

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

const totals = (reports: readonly FileReport[], pick: (r: FileReport) => number) =>
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
    totals(finalReports, (r) => r.functionsCovered),
    totals(finalReports, (r) => r.functionsTotal),
  ],
  branches: [
    totals(finalReports, (r) => r.branchesCovered),
    totals(finalReports, (r) => r.branchesTotal),
  ],
  consoleErrors: acc.errors.length,
  findings: acc.findings,
  elementLedger: checks.element,
  codeLedger: checks.code,
});

const writeReports = (log: RunLog, acc: Acc, finalReports: readonly FileReport[]): Checks => {
  const entries = buildRegistry(acc.seen, new Set(acc.clicked));
  const sections = sectionCoverage(entries);
  log.saveText('element-coverage.md', elementMarkdown(sections, entries));
  log.saveJson('element-coverage.json', { sections, entries });
  const checks = ledgerChecks(sections, finalReports);
  writeCodeReports(log, acc, finalReports);
  const summary = summaryOf(acc, sections, finalReports, checks);
  log.saveJson('summary.json', summary);
  console.log(JSON.stringify(summary, null, 2));
  return { ...checks, errors: acc.errors };
};

const bundleSources = async (
  scripts: readonly ScriptCoverage[],
): Promise<readonly ScriptSource[]> => {
  const urls = scripts
    .filter((script) => script.url.includes('/assets/') && script.url.endsWith('.js'))
    .map((script) => script.url);
  const sources = await Promise.all(urls.map((url) => fetchSource(url)));
  return sources.flatMap((source) => (source === null ? [] : [source]));
};

const reportChecks = (checks: Checks): void => {
  assert.equal(checks.errors.length, 0, `console errors: ${checks.errors.slice(0, 3).join(' | ')}`);
  assert.ok(checks.element.ok, `element ledger: ${JSON.stringify(checks.element)}`);
  assert.ok(checks.code.ok, `code ledger: ${JSON.stringify(checks.code)}`);
};

const coverRun = async (browser: Browser, log: RunLog, started: number): Promise<void> => {
  const cdp = await connectPage(browser);
  try {
    await startCoverage(cdp.send);
    const initial = await takeCoverage(cdp.send);
    const sources = await bundleSources(initial);
    const acc = await collectAll(browser, log, cdp.send, sources, initial);
    const merged = mergeScripts(acc.scripts, await takeCoverage(cdp.send));
    const finalReports = fileReports(merged, sources);
    await stopCoverage(cdp.send);
    log.saveText('timings.txt', `totalMs=${Date.now() - started}\n`);
    reportChecks(writeReports(log, acc, finalReports));
  } finally {
    cdp.close();
  }
};

const openApp = (browser: Browser, base: string, log: RunLog): void => {
  browser.run('open', base);
  browser.run(
    'wait',
    '--fn',
    "document.readyState === 'complete' && !!document.querySelector('.desktop-links a')",
  );
  evaluate(browser, installHooksSource);
  const applied: unknown = applyEnv(browser, baseEnv, 'overview');
  browser.run(
    'wait',
    '--fn',
    "location.hash === '#overview' && !!document.querySelector('#main h1')",
  );
  log.saveJson('env.json', { base: process.env.MULTITRACKER_UI_URL ?? null, applied });
};

const main = async (): Promise<void> => {
  const base = process.env.MULTITRACKER_UI_URL ?? 'http://127.0.0.1:5179';
  const stamp = new Date().toISOString().slice(0, 10);
  const runId = `${Date.now().toString(36)}-${process.pid}`;
  const log = createRunLog('docs/audits', stamp, runId);
  const started = Date.now();
  const browser = createBrowser();
  try {
    openApp(browser, base, log);
    await coverRun(browser, log, started);
  } finally {
    browser.run('close');
  }
};

await main();
