/** Оркестрация раздела: навигация, обход с дедлайном, донабор диалогов, доверенные клики. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import { restState } from './sweep-rest.ts';
import type { Env } from './axes.ts';
import { record } from './records.ts';
import type { ClickRecord, ClickSkip, Finding, StateDoms } from './records.ts';
import { enumerateSource } from './page-dom.ts';
import { sweepSource } from './page-sweep.ts';
import { fullInvariantsSource } from './page-checks.ts';
import { asFinding, parseEnumerate, parseSweepRecord } from './page-rows.ts';
import { parseLeftover } from './page-rows.ts';
import type { Enumerated, Leftover, SweepHit } from './page-rows.ts';
import { asArray, asText, isRecord } from './guards.ts';
import type { RegistryInput } from './registry.ts';
import { hitClicks, joinSeen, openersOf } from './journal.ts';
import type { PageState } from './probe.ts';
import { routeReady, stateOf } from './probe.ts';
import { trustedSample } from './trusted.ts';
import { runJob } from './job.ts';

/** Навигация настоящей кнопкой мыши: доверенная запись в журнале. */
export const navClick = (
  browser: Browser,
  from: PageState,
  route: string,
  seq: number,
  env: Env,
): ClickRecord => {
  const started = Date.now();
  browser.run('click', `.desktop-links a[href="#${route}"]`);
  browser.run('wait', '--fn', routeReady(`#${route}`));
  const after = stateOf(browser);
  return record(
    seq,
    env,
    route,
    { b: from.own, a: after.own, dur: Date.now() - started },
    `.desktop-links a[href="#${route}"]`,
    { role: 'link', name: route, tag: 'a', trusted: true, purpose: 'navigate' },
  );
};

type Chunk = Readonly<{
  hits: readonly SweepHit[];
  doms: StateDoms;
  done: readonly string[];
  leftover: readonly Leftover[];
  truncated: boolean;
  errors: readonly string[];
}>;

const JUNK: Chunk = {
  hits: [],
  doms: {},
  done: [],
  leftover: [],
  truncated: false,
  errors: ['job: junk result'],
};

const parseDoms = (value: unknown): StateDoms =>
  isRecord(value)
    ? Object.fromEntries(Object.entries(value).map(([hash, html]) => [hash, asText(html)]))
    : {};

const parseChunk = (value: unknown): Chunk => {
  if (!isRecord(value)) return JUNK;
  const hits = asArray(value.records).flatMap((row) => {
    const hit = parseSweepRecord(row);
    return hit === null ? [] : [hit];
  });
  const left = isRecord(value.consoleLeft) ? asArray(value.consoleLeft.e) : [];
  const thrown = typeof value.error === 'string' ? [value.error] : [];
  return {
    hits,
    doms: parseDoms(value.doms),
    done: asArray(value.done).map((entry) => asText(entry)),
    leftover: parseLeftover(value.leftover),
    truncated: value.truncated === true,
    errors: [...left.map((entry) => asText(entry)), ...thrown],
  };
};

type SweepOutcome = Readonly<{
  hits: readonly SweepHit[];
  doms: StateDoms;
  done: readonly string[];
  leftover: readonly Leftover[];
  errors: readonly string[];
}>;

const mergeChunks = (chunks: readonly Chunk[]): SweepOutcome => ({
  hits: chunks.flatMap((chunk) => chunk.hits),
  doms: Object.fromEntries(chunks.flatMap((chunk) => Object.entries(chunk.doms))),
  done: [...new Set(chunks.flatMap((chunk) => chunk.done))],
  leftover: chunks.at(-1)?.leftover ?? [],
  errors: chunks.flatMap((chunk) => chunk.errors),
});

const sweepStep = (browser: Browser, acc: readonly Chunk[], round: number): readonly Chunk[] => {
  const chunk = parseChunk(
    runJob(browser, sweepSource, {
      done: acc.at(-1)?.done ?? [],
      openers: {},
      budget: 120_000,
      limit: 2000,
      finalize: false,
    }),
  );
  const next = [...acc, chunk];
  return round >= 11 || !chunk.truncated ? next : sweepStep(browser, next, round + 1);
};

const sweepAll = (browser: Browser): SweepOutcome => mergeChunks(sweepStep(browser, [], 0));

const rescue = (browser: Browser, outcome: SweepOutcome, route: string): Chunk => {
  browser.run('wait', '--fn', routeReady(`#${route}`));
  return parseChunk(
    runJob(browser, sweepSource, {
      done: outcome.done,
      openers: openersOf(outcome.hits),
      budget: 120_000,
      limit: 2000,
      finalize: true,
    }),
  );
};

/** Перечисление только на закоммиченном разделе: восстановление тоже асинхронно. */
const enumerateAt = (browser: Browser, route: string): readonly Enumerated[] => {
  browser.run('wait', '--fn', routeReady(`#${route}`));
  return parseEnumerate(evaluate(browser, enumerateSource));
};

const mergeEnumerated = (
  first: readonly Enumerated[],
  last: readonly Enumerated[],
): readonly Enumerated[] => [
  ...new Map([...first, ...last].map((item) => [item.path, item])).values(),
];

export type Visit = Readonly<{
  clicks: readonly ClickRecord[];
  openers: Readonly<Record<string, string>>;
  doms: StateDoms;
  seen: readonly RegistryInput[];
  errors: readonly string[];
  skips: readonly ClickSkip[];
  attempts: number;
  sweepAttempted: number;
  sweepSkipped: number;
}>;

/** Навигация, перечисление, обход и донабор: всё наблюдаемое за один визит. */
export const visitRoute = (browser: Browser, route: string, seq: number, env: Env): Visit => {
  const nav = navClick(browser, stateOf(browser), route, seq, env);
  restState(browser);
  const first = enumerateAt(browser, route);
  const sweep = sweepAll(browser);
  const extra = rescue(browser, sweep, route);
  const last = enumerateAt(browser, route);
  const hits = [...sweep.hits, ...extra.hits];
  const seen = joinSeen(route, mergeEnumerated(first, last), hits);
  const count = hits.filter((hit) => hit.skipped === '').length;
  const verified = trustedSample(browser, env, seq + 1 + count, seen, hits);
  return {
    clicks: [nav, ...hitClicks(route, env, seq + 1, seen, hits), ...verified.clicks],
    seen,
    skips: verified.skips,
    attempts: verified.clicks.length + verified.skips.length,
    sweepAttempted: hits.length,
    sweepSkipped: hits.filter((hit) => hit.skipped !== '').length,
    doms: { ...sweep.doms, ...extra.doms },
    openers: openersOf(hits),
    errors: [...sweep.errors, ...extra.errors, ...hits.flatMap((hit) => hit.errors)],
  };
};

export type SectionResult = Readonly<{
  route: string;
  clicks: readonly ClickRecord[];
  openers: Readonly<Record<string, string>>;
  doms: StateDoms;
  seen: readonly RegistryInput[];
  findings: readonly Finding[];
  consoleErrors: readonly string[];
  skips: readonly ClickSkip[];
  attempts: number;
  sweepAttempted: number;
  sweepSkipped: number;
  durationMs: number;
}>;

const invariantFindings = (browser: Browser, env: Env): readonly Finding[] => {
  const cfg = JSON.stringify({ hideAmounts: env.hideAmounts, langStrings: [], keys: [] });
  const value: unknown = evaluate(browser, `(${fullInvariantsSource})(${cfg})`);
  return asArray(value).flatMap((row) => {
    const finding = asFinding(row);
    return finding === null ? [] : [finding];
  });
};

/** Визит плюс полные инварианты конечного состояния. */
export const visitSection = (
  browser: Browser,
  route: string,
  seq: number,
  env: Env,
): SectionResult => {
  const started = Date.now();
  const visit = visitRoute(browser, route, seq, env);
  return {
    route,
    clicks: visit.clicks,
    doms: visit.doms,
    openers: visit.openers,
    seen: visit.seen,
    findings: invariantFindings(browser, env),
    consoleErrors: visit.errors,
    skips: visit.skips,
    attempts: visit.attempts,
    sweepAttempted: visit.sweepAttempted,
    sweepSkipped: visit.sweepSkipped,
    durationMs: Date.now() - started,
  };
};
