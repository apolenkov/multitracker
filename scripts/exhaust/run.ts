/** Точка входа исчерпывающего прогона: слои 1–3 по всем разделам. */
import assert from 'node:assert/strict';
import { createBrowser, evaluate } from '../ui-driver.ts';
import type { Browser } from '../ui-driver.ts';
import { baseEnv } from './axes.ts';
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
import type { Acc } from './reports.ts';

const seedAcc = (scripts: readonly ScriptCoverage[], sources: readonly ScriptSource[]): Acc => ({
  seq: 1,
  seen: [],
  clicked: [],
  attribution: [],
  errors: [],
  findings: [],
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
  findings: [...prev.findings, ...result.findings],
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

const bundleSources = async (
  scripts: readonly ScriptCoverage[],
): Promise<readonly ScriptSource[]> => {
  const urls = scripts
    .filter((script) => script.url.includes('/assets/') && script.url.endsWith('.js'))
    .map((script) => script.url);
  const sources = await Promise.all(urls.map((url) => fetchSource(url)));
  return sources.flatMap((source) => (source === null ? [] : [source]));
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
