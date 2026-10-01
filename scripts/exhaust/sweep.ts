/** Один раздел за проход: навигация, перечисление, обход, инварианты, снимок покрытия. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Env } from './axes.ts';
import { dialogOf, elementSignature } from './signature.ts';
import { record } from './records.ts';
import type { ClickRecord, Finding, RunLog } from './records.ts';
import { enumerateSource, stateHashSource, sweepSource } from './page-dom.ts';
import { fullInvariantsSource } from './page-checks.ts';
import { parseEnumerate, parseSweepRecord } from './page-rows.ts';
import type { Enumerated, SweepHit } from './page-rows.ts';
import { fileReports, newlyCovered, takeCoverage } from './coverage.ts';
import type { CdpSend, FileReport, ScriptSource } from './coverage.ts';
import { asArray, asText, isRecord } from './guards.ts';
import type { RegistryInput } from './registry.ts';

export type SectionResult = Readonly<{
  route: string;
  clicks: readonly ClickRecord[];
  seen: readonly RegistryInput[];
  reports: readonly FileReport[];
  newKeys: readonly string[];
  findings: readonly Finding[];
  consoleErrors: readonly string[];
  durationMs: number;
}>;

export type PageState = Readonly<{ hash: string; own: string; dialogs: readonly string[] }>;

export const stateOf = (browser: Browser): PageState => {
  const value: unknown = evaluate(browser, stateHashSource);
  if (!isRecord(value)) return { hash: '', own: '', dialogs: [] };
  return {
    hash: asText(value.hash),
    own: asText(value.own),
    dialogs: asArray(value.dialogs).map((entry) => asText(entry)),
  };
};

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
  return {
    seq,
    route,
    env,
    signature: `.desktop-links a[href="#${route}"]`,
    role: 'link',
    name: route,
    tag: 'a',
    trusted: true,
    stateBefore: from.own,
    stateAfter: after.own,
    dialogOpen: after.dialogs,
    consoleErrors: [],
    consoleWarnings: [],
    duration: Date.now() - started,
    purpose: 'navigate',
    shifted: [],
    design: [],
    shot: '',
  };
};

const fallbackEnumerated = (path: string): Enumerated => ({
  path,
  role: '',
  name: '',
  tag: '',
  visible: false,
  disabled: false,
  skip: '',
});

const hitSkip = (hits: readonly SweepHit[], path: string): string =>
  hits.find((hit) => hit.path === path)?.skipped ?? 'not-visited';

/** Объединение перечисления и обхода по пути: одна запись на элемент раздела. */
export const joinSeen = (
  route: string,
  items: readonly Enumerated[],
  hits: readonly SweepHit[],
): readonly RegistryInput[] => {
  const paths = [...new Set([...items.map((item) => item.path), ...hits.map((hit) => hit.path)])];
  return paths.map((path) => {
    const info = items.find((item) => item.path === path) ?? fallbackEnumerated(path);
    return {
      route,
      path,
      role: info.role,
      name: info.name,
      tag: info.tag,
      visible: info.visible,
      disabled: info.disabled,
      skip: hitSkip(hits, path),
    };
  });
};

const signatureFor = (item: RegistryInput): string =>
  elementSignature({
    route: item.route,
    dialog: dialogOf(item.path),
    role: item.role,
    name: item.name,
    path: item.path,
  });

/** Сигнатуры кликнутых: те же ключи, что уйдут в реестр. */
export const clickedSignatures = (seen: readonly RegistryInput[]): readonly string[] =>
  seen.filter((item) => item.skip === '').map((item) => signatureFor(item));

const blankHit: SweepHit = {
  path: '',
  before: '',
  after: '',
  duration: 0,
  dialogs: [],
  errors: [],
  warnings: [],
  skipped: '',
  meta: null,
};

/** Записи журнала по кликнутым: время и хеши из обхода, мета из реестра. */
export const hitClicks = (
  route: string,
  env: Env,
  start: number,
  seen: readonly RegistryInput[],
  hits: readonly SweepHit[],
): readonly ClickRecord[] => {
  const live = seen.filter((item) => item.skip === '');
  return live.map((item, index) => {
    const hit = hits.find((row) => row.path === item.path) ?? blankHit;
    return record(
      start + index,
      env,
      route,
      {
        b: hit.before,
        a: hit.after,
        dlg: hit.dialogs,
        err: hit.errors,
        warn: hit.warnings,
        dur: hit.duration,
      },
      signatureFor(item),
      { role: item.role, name: item.name, tag: item.tag, trusted: false, purpose: 'sweep' },
    );
  });
};

/** Строка полных инвариантов в находку журнала; мусор отбрасывается. */
export const asFinding = (value: unknown): Finding | null => {
  if (!isRecord(value)) return null;
  const rule = value.rule;
  const selector = value.sel;
  return typeof rule === 'string' && typeof selector === 'string'
    ? { rule, selector, expected: asText(value.expected), actual: asText(value.actual) }
    : null;
};

const sweepHits = (browser: Browser): readonly SweepHit[] => {
  const value: unknown = evaluate(
    browser,
    `(${sweepSource})(${JSON.stringify({ scope: 'main', limit: 600, chrome: true })})`,
  );
  if (!isRecord(value)) return [];
  const left = isRecord(value.consoleLeft) ? asArray(value.consoleLeft.e) : [];
  const consoleLeft = left.map((entry) => asText(entry));
  const hits = asArray(value.records).flatMap((row) => {
    const hit = parseSweepRecord(row);
    return hit === null ? [] : [hit];
  });
  return consoleLeft.length > 0
    ? [
        ...hits,
        {
          ...blankHit,
          path: '(console-leftovers)',
          errors: consoleLeft,
        },
      ]
    : hits;
};

const invariantFindings = (browser: Browser, env: Env): readonly Finding[] => {
  const cfg = JSON.stringify({ hideAmounts: env.hideAmounts, langStrings: [], keys: [] });
  const value: unknown = evaluate(browser, `(${fullInvariantsSource})(${cfg})`);
  return asArray(value).flatMap((row) => {
    const finding = asFinding(row);
    return finding === null ? [] : [finding];
  });
};

export type Visit = Readonly<{
  clicks: readonly ClickRecord[];
  seen: readonly RegistryInput[];
  hits: readonly SweepHit[];
}>;

/** Навигация, перечисление и обход раздела: всё наблюдаемое за один визит. */
export const visitRoute = (browser: Browser, route: string, seq: number, env: Env): Visit => {
  const nav = navClick(browser, stateOf(browser), route, seq, env);
  const items = parseEnumerate(evaluate(browser, enumerateSource));
  const hits = sweepHits(browser);
  const seen = joinSeen(route, items, hits);
  return { clicks: [nav, ...hitClicks(route, env, seq + 1, seen, hits)], seen, hits };
};

/** Визит плюс инварианты, снимок покрытия и запись в журнал. */
export const sweepSection = async (
  browser: Browser,
  log: RunLog,
  send: CdpSend,
  route: string,
  seq: number,
  env: Env,
  sources: readonly ScriptSource[],
  prev: readonly FileReport[],
): Promise<SectionResult> => {
  const started = Date.now();
  const visit = visitRoute(browser, route, seq, env);
  const findings = invariantFindings(browser, env);
  const reports = fileReports(await takeCoverage(send), sources);
  log.appendClicks(visit.clicks);
  return {
    route,
    clicks: visit.clicks,
    seen: visit.seen,
    reports,
    newKeys: newlyCovered(prev, reports),
    findings,
    consoleErrors: visit.hits.flatMap((hit) => hit.errors),
    durationMs: Date.now() - started,
  };
};
