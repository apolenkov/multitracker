/** Точка входа исчерпывающего прогона: слои 1–3 по всем разделам. */
import assert from 'node:assert/strict';
import { createBrowser, evaluate } from '../ui-driver.ts';
import type { Browser } from '../ui-driver.ts';
import { sweepEnv } from './axes.ts';
import { installHooksSource } from './page-dom.ts';
import { applyEnv } from './envctl.ts';
import { createRunLog } from './records.ts';
import type { RunLog } from './records.ts';
import { visitSection } from './sweep.ts';
import type { SectionResult } from './sweep.ts';
import { clickedSignatures } from './journal.ts';
import { connectPage, startCoverage, stopCoverage, takeCoverage } from './cdp.ts';
import type { CdpSend, ScriptCoverage } from './cdp.ts';
import { fetchSource, fileReports, mergeScripts, newlyCovered } from './coverage.ts';
import type { FileReport, ScriptSource } from './coverage.ts';
import { reportChecks, routes, writeReports } from './reports.ts';
import { routeReady } from './probe.ts';
import type { Acc } from './reports.ts';
import { runPartB } from './part-b.ts';
import type { PartB } from './part-b.ts';

const seedAcc = (scripts: readonly ScriptCoverage[], sources: readonly ScriptSource[]): Acc => ({
  seq: 1,
  openers: {},
  seen: [],
  clicked: [],
  attribution: [],
  errors: [],
  findings: [],
  scripts,
  prev: fileReports(scripts, sources),
  skips: [],
  attempts: 0,
  sweepAttempted: 0,
  sweepSkipped: 0,
});

/** Первый найденный открыватель диалога остаётся: он из раннего, более простого состояния. */
const mergeOpeners = (
  prev: Acc['openers'],
  found: SectionResult['openers'],
  route: string,
): Acc['openers'] => ({
  ...Object.fromEntries(Object.entries(found).map(([id, path]) => [id, { route, path }])),
  ...prev,
});

const nextAcc = (
  prev: Acc,
  result: SectionResult,
  route: string,
  scripts: readonly ScriptCoverage[],
  reports: readonly FileReport[],
): Acc => ({
  seq: prev.seq + result.clicks.length,
  openers: mergeOpeners(prev.openers, result.openers, route),
  seen: [...prev.seen, ...result.seen],
  clicked: [...prev.clicked, ...clickedSignatures(result.seen)],
  attribution: [
    ...prev.attribution,
    { route, fresh: newlyCovered(prev.prev, reports).length, durationMs: result.durationMs },
  ],
  errors: [...prev.errors, ...result.consoleErrors],
  findings: [...prev.findings, ...result.findings],
  scripts,
  prev: reports,
  skips: [...prev.skips, ...result.skips],
  attempts: prev.attempts + result.attempts,
  sweepAttempted: prev.sweepAttempted + result.sweepAttempted,
  sweepSkipped: prev.sweepSkipped + result.sweepSkipped,
});

const collectOne = async (
  browser: Browser,
  log: RunLog,
  send: CdpSend,
  sources: readonly ScriptSource[],
  prev: Acc,
  route: string,
): Promise<Acc> => {
  const result = visitSection(browser, route, prev.seq, sweepEnv);
  log.appendClicks(result.clicks);
  log.appendStates(route, result.doms);
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

const bundleSources = async (
  scripts: readonly ScriptCoverage[],
): Promise<readonly ScriptSource[]> => {
  const urls = scripts
    .filter((script) => script.url.includes('/assets/') && script.url.endsWith('.js'))
    .map((script) => script.url);
  const sources = await Promise.all(urls.map((url) => fetchSource(url)));
  return sources.flatMap((source) => (source === null ? [] : [source]));
};

const savePartB = (log: RunLog, partB: PartB): void => {
  log.saveJson('part-b.json', {
    axisTuples: partB.axisTuples,
    formCases: partB.formCases,
    walks: partB.walks,
    findings: partB.findings.length,
  });
};

const finishRun = async (
  browser: Browser,
  log: RunLog,
  send: CdpSend,
  sources: readonly ScriptSource[],
  acc: Acc,
  started: number,
): Promise<void> => {
  const partB = await runPartB(browser, log, acc.seen, acc.openers);
  const full: Acc = {
    ...acc,
    findings: [...acc.findings, ...partB.findings],
    skips: [...acc.skips, ...partB.skips],
    attempts: acc.attempts + partB.walkSteps,
  };
  savePartB(log, partB);
  const merged = mergeScripts(full.scripts, await takeCoverage(send));
  const finalReports = fileReports(merged, sources);
  log.saveText('timings.txt', `totalMs=${Date.now() - started}\n`);
  reportChecks(writeReports(log, full, finalReports));
};

const coverRun = async (
  browser: Browser,
  log: RunLog,
  base: string,
  started: number,
): Promise<void> => {
  const cdp = await connectPage(browser);
  try {
    await startCoverage(cdp.send);
    openApp(browser, base, log);
    const initial = await takeCoverage(cdp.send);
    const sources = await bundleSources(initial);
    console.log(`cdp: ${initial.length} scripts, ${sources.length} bundle sources`);
    assert.ok(sources.length > 0, 'no bundle sources: source maps missing or bundle URL mismatch');
    const acc = await collectAll(browser, log, cdp.send, sources, initial);
    await finishRun(browser, log, cdp.send, sources, acc, started);
    await stopCoverage(cdp.send);
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
  const applied: unknown = applyEnv(browser, sweepEnv, 'overview');
  browser.run('wait', '--fn', routeReady('#overview'));
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
    browser.run('open', base);
    browser.run(
      'wait',
      '--fn',
      "document.readyState === 'complete' && !!document.querySelector('.desktop-links a')",
    );
    await coverRun(browser, log, base, started);
  } finally {
    browser.run('close');
  }
};

await main();
