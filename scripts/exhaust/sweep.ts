/** Оркестрация раздела: навигация, обход с дедлайном, донабор диалогов, доверенные клики. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Env } from './axes.ts';
import { record } from './records.ts';
import type { ClickRecord, Finding } from './records.ts';
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
import { stateOf } from './probe.ts';
import { trustedSample } from './trusted.ts';

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
  browser.run(
    'wait',
    '--fn',
    `location.hash === '#${route}' && !!document.querySelector('#main h1')`,
  );
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

const SLOT = 'window.__mtJob';

const kick = (browser: Browser, source: string, opts: string) =>
  evaluate(
    browser,
    `${SLOT} = null; (${source})(${opts}).then((r) => { ${SLOT} = r; }, (e) => { ${SLOT} = { error: String(e) }; }); 'started'`,
  );

const jobStatus = (browser: Browser): string =>
  asText(
    evaluate(browser, `${SLOT} === undefined ? 'none' : ${SLOT} === null ? 'pending' : 'ready'`),
  );

const awaitJob = (browser: Browser, left: number): unknown => {
  if (jobStatus(browser) === 'ready') return evaluate(browser, SLOT);
  if (left <= 0) throw new Error('in-page job did not finish in time');
  try {
    browser.run('wait', '--fn', `${SLOT} !== null && ${SLOT} !== undefined`);
  } catch {
    // Таймаут опроса не равен сбою работы: проверяем слот ещё раз.
  }
  return awaitJob(browser, left - 1);
};

const runJob = (
  browser: Browser,
  source: string,
  opts: Readonly<Record<string, unknown>>,
): unknown => {
  kick(browser, source, JSON.stringify(opts));
  const result = awaitJob(browser, 4);
  if (isRecord(result) && typeof result.error === 'string')
    throw new Error(`page job: ${result.error}`);
  return result;
};

type Chunk = Readonly<{
  hits: readonly SweepHit[];
  done: readonly string[];
  leftover: readonly Leftover[];
  truncated: boolean;
  errors: readonly string[];
}>;

const parseChunk = (value: unknown): Chunk => {
  if (!isRecord(value))
    return { hits: [], done: [], leftover: [], truncated: false, errors: ['job: junk result'] };
  const hits = asArray(value.records).flatMap((row) => {
    const hit = parseSweepRecord(row);
    return hit === null ? [] : [hit];
  });
  const left = isRecord(value.consoleLeft) ? asArray(value.consoleLeft.e) : [];
  const thrown = typeof value.error === 'string' ? [value.error] : [];
  return {
    hits,
    done: asArray(value.done).map((entry) => asText(entry)),
    leftover: parseLeftover(value.leftover),
    truncated: value.truncated === true,
    errors: [...left.map((entry) => asText(entry)), ...thrown],
  };
};

type SweepOutcome = Readonly<{
  hits: readonly SweepHit[];
  done: readonly string[];
  leftover: readonly Leftover[];
  errors: readonly string[];
}>;

const mergeChunks = (chunks: readonly Chunk[]): SweepOutcome => ({
  hits: chunks.flatMap((chunk) => chunk.hits),
  done: [...new Set(chunks.flatMap((chunk) => chunk.done))],
  leftover: chunks.at(-1)?.leftover ?? [],
  errors: chunks.flatMap((chunk) => chunk.errors),
});

const sweepStep = (browser: Browser, acc: readonly Chunk[], round: number): readonly Chunk[] => {
  const chunk = parseChunk(
    runJob(browser, sweepSource, {
      done: acc.at(-1)?.done ?? [],
      openers: {},
      budget: 20_000,
      limit: 700,
      finalize: false,
    }),
  );
  const next = [...acc, chunk];
  return round >= 3 || !chunk.truncated ? next : sweepStep(browser, next, round + 1);
};

const sweepAll = (browser: Browser): SweepOutcome => mergeChunks(sweepStep(browser, [], 0));

const rescue = (browser: Browser, outcome: SweepOutcome): Chunk =>
  parseChunk(
    runJob(browser, sweepSource, {
      done: outcome.done,
      openers: openersOf(outcome.hits),
      budget: 20_000,
      limit: 700,
      finalize: true,
    }),
  );

const mergeEnumerated = (
  first: readonly Enumerated[],
  last: readonly Enumerated[],
): readonly Enumerated[] => [
  ...new Map([...first, ...last].map((item) => [item.path, item])).values(),
];

export type Visit = Readonly<{
  clicks: readonly ClickRecord[];
  seen: readonly RegistryInput[];
  errors: readonly string[];
}>;

/** Навигация, перечисление, обход и донабор: всё наблюдаемое за один визит. */
export const visitRoute = (browser: Browser, route: string, seq: number, env: Env): Visit => {
  const nav = navClick(browser, stateOf(browser), route, seq, env);
  const first = parseEnumerate(evaluate(browser, enumerateSource));
  const sweep = sweepAll(browser);
  const extra = rescue(browser, sweep);
  const last = parseEnumerate(evaluate(browser, enumerateSource));
  const hits = [...sweep.hits, ...extra.hits];
  const seen = joinSeen(route, mergeEnumerated(first, last), hits);
  const count = hits.filter((hit) => hit.skipped === '').length;
  const verified = trustedSample(browser, env, seq + 1 + count, seen, hits);
  return {
    clicks: [nav, ...hitClicks(route, env, seq + 1, seen, hits), ...verified],
    seen,
    errors: [...sweep.errors, ...extra.errors, ...hits.flatMap((hit) => hit.errors)],
  };
};

export type SectionResult = Readonly<{
  route: string;
  clicks: readonly ClickRecord[];
  seen: readonly RegistryInput[];
  findings: readonly Finding[];
  consoleErrors: readonly string[];
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
    seen: visit.seen,
    findings: invariantFindings(browser, env),
    consoleErrors: visit.errors,
    durationMs: Date.now() - started,
  };
};
