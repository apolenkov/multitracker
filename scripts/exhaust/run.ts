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
import type { RegistryInput } from './registry.ts';
import { checkLedger, parseLedger } from './ledger.ts';
import type { LedgerCheck } from './ledger.ts';
import { clickedSignatures, sweepSection } from './sweep.ts';
import {
  codeMarkdown,
  connectPage,
  fetchSource,
  fileReports,
  startCoverage,
  stopCoverage,
  takeCoverage,
} from './coverage.ts';
import type { CdpSend, FileReport, ScriptSource } from './coverage.ts';

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
  prev: readonly FileReport[];
}>;

const empty: Acc = {
  seq: 1,
  seen: [],
  clicked: [],
  attribution: [],
  errors: [],
  findings: 0,
  prev: [],
};

const collectOne = async (
  browser: Browser,
  log: RunLog,
  send: CdpSend,
  sources: readonly ScriptSource[],
  prev: Acc,
  route: string,
): Promise<Acc> => {
  const result = await sweepSection(
    browser,
    log,
    send,
    route,
    prev.seq,
    baseEnv,
    sources,
    prev.prev,
  );
  return {
    seq: prev.seq + result.clicks.length,
    seen: [...prev.seen, ...result.seen],
    clicked: [...prev.clicked, ...clickedSignatures(result.seen)],
    attribution: [
      ...prev.attribution,
      { route, fresh: result.newKeys.length, durationMs: result.durationMs },
    ],
    errors: [...prev.errors, ...result.consoleErrors],
    findings: prev.findings + result.findings.length,
    prev: result.reports,
  };
};

const collectAll = async (
  browser: Browser,
  log: RunLog,
  send: CdpSend,
  sources: readonly ScriptSource[],
): Promise<Acc> =>
  routes.reduce<Promise<Acc>>(
    async (prevP, route) => collectOne(browser, log, send, sources, await prevP, route),
    Promise.resolve(empty),
  );

type Checks = Readonly<{ element: LedgerCheck; code: LedgerCheck; errors: readonly string[] }>;

const writeReports = (log: RunLog, acc: Acc, finalReports: readonly FileReport[]): Checks => {
  const entries = buildRegistry(acc.seen, new Set(acc.clicked));
  const sections = sectionCoverage(entries);
  log.saveText('element-coverage.md', elementMarkdown(sections, entries));
  log.saveJson('element-coverage.json', { sections, entries });
  const element = checkLedger(
    sections.flatMap((section) => section.uncovered),
    parseLedger(readFileSync('scripts/exhaust/uncovered-ledger.json', 'utf8')),
  );
  const codeKeys = finalReports.flatMap((report) =>
    report.uncoveredFunctions.map((fn) => `${report.file}|${fn}`),
  );
  const code = checkLedger(
    codeKeys,
    parseLedger(readFileSync('scripts/exhaust/uncovered-code-ledger.json', 'utf8')),
  );
  const attribution = acc.attribution.map(
    (item) => `- ${item.route}: +${item.fresh} functions (${item.durationMs}ms)`,
  );
  log.saveText(
    'code-coverage.md',
    [codeMarkdown(finalReports), '', '# Per-section attribution', ...attribution].join('\n'),
  );
  log.saveJson('code-coverage.json', { reports: finalReports, attribution: acc.attribution });
  const summary = {
    routes: routes.length,
    clicks: acc.seq - 1,
    element: sections.map((section) => ({
      route: section.route,
      pct: coveragePercent(section.clicked, section.seen),
    })),
    functions: [
      finalReports.reduce((sum, report) => sum + report.functionsCovered, 0),
      finalReports.reduce((sum, report) => sum + report.functionsTotal, 0),
    ],
    branches: [
      finalReports.reduce((sum, report) => sum + report.branchesCovered, 0),
      finalReports.reduce((sum, report) => sum + report.branchesTotal, 0),
    ],
    consoleErrors: acc.errors.length,
    findings: acc.findings,
    elementLedger: element,
    codeLedger: code,
  };
  log.saveJson('summary.json', summary);
  console.log(JSON.stringify(summary, null, 2));
  return { element, code, errors: acc.errors };
};

const main = async (): Promise<void> => {
  const base = process.env.MULTITRACKER_UI_URL ?? 'http://127.0.0.1:5179';
  const stamp = new Date().toISOString().slice(0, 10);
  const runId = `${Date.now().toString(36)}-${process.pid}`;
  const log = createRunLog('docs/audits', stamp, runId);
  const started = Date.now();
  const browser = createBrowser();
  try {
    browser.run('open', base);
    evaluate(browser, installHooksSource);
    const applied: unknown = applyEnv(browser, baseEnv, 'overview');
    log.saveJson('env.json', { base: process.env.MULTITRACKER_UI_URL ?? null, applied });
    const cdp = await connectPage(browser);
    try {
      await startCoverage(cdp.send);
      const urls = (await takeCoverage(cdp.send))
        .filter((script) => script.url.includes('/assets/') && script.url.endsWith('.js'))
        .map((script) => script.url);
      const sources = (await Promise.all(urls.map((url) => fetchSource(url)))).flatMap((source) =>
        source === null ? [] : [source],
      );
      const acc = await collectAll(browser, log, cdp.send, sources);
      const finalReports = fileReports(await takeCoverage(cdp.send), sources);
      await stopCoverage(cdp.send);
      log.saveText('timings.txt', `totalMs=${Date.now() - started}\n`);
      const checks = writeReports(log, acc, finalReports);
      assert.equal(
        checks.errors.length,
        0,
        `console errors: ${checks.errors.slice(0, 3).join(' | ')}`,
      );
      assert.ok(checks.element.ok, `element ledger: ${JSON.stringify(checks.element)}`);
      assert.ok(checks.code.ok, `code ledger: ${JSON.stringify(checks.code)}`);
    } finally {
      cdp.close();
    }
  } finally {
    browser.run('close');
  }
};

await main();
