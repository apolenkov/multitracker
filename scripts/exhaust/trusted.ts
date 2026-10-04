/** Доверенные клики выборки: ссылки, открыватели диалогов, инертные элементы. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Env } from './axes.ts';
import { record } from './records.ts';
import type { ClickRecord, ClickSkip } from './records.ts';
import { domHelpers } from './page-dom.ts';
import type { PageState } from './probe.ts';
import { routeReady, stateOf } from './probe.ts';
import type { SweepHit } from './page-rows.ts';
import { signatureFor } from './journal.ts';
import type { RegistryInput } from './registry.ts';

const DESTRUCTIVE = /удал|delete|erase|очист|сброс|reset|отозват|revoke|отключ|disconnect/i;

const TRUSTED_SAMPLE = 8;

type TrustKind = 'nav' | 'dialog' | 'inert';

type TrustPick = Readonly<{ hit: SweepHit; item: RegistryInput; kind: TrustKind }>;

const nameOf = (hit: SweepHit, item: RegistryInput): string => item.name || (hit.meta?.name ?? '');

const disqualified = (hit: SweepHit, item: RegistryInput): boolean =>
  hit.skipped !== '' || hit.path.includes('dialog#') || DESTRUCTIVE.test(nameOf(hit, item));

const trustKind = (hit: SweepHit, item: RegistryInput): TrustKind | null => {
  if (disqualified(hit, item)) return null;
  if ((item.tag || (hit.meta?.tag ?? '')) === 'a') return 'nav';
  if (hit.opened !== '') return 'dialog';
  return hit.before === hit.after ? 'inert' : null;
};

const candidates = (
  seen: readonly RegistryInput[],
  hits: readonly SweepHit[],
): readonly TrustPick[] => {
  const pool = hits.flatMap((hit) => {
    const item = seen.find((entry) => entry.path === hit.path);
    if (item === undefined) return [];
    const kind = trustKind(hit, item);
    return kind === null ? [] : [{ hit, item, kind }];
  });
  const unique = pool.filter(
    (row, index) => pool.findIndex((other) => other.item.path === row.item.path) === index,
  );
  const stride = Math.max(1, Math.ceil(unique.length / TRUSTED_SAMPLE));
  return unique.filter((_, index) => index % stride === 0).slice(0, TRUSTED_SAMPLE);
};

const clickable = (browser: Browser, path: string): boolean =>
  evaluate(
    browser,
    `(() => { const el = document.querySelector(${JSON.stringify(path)}); return !!el && el.checkVisibility(); })()`,
  ) === true;

const restore = (browser: Browser, kind: TrustKind, before: PageState, after: PageState): void => {
  if (kind === 'dialog' && after.dialogs.length > 0) {
    evaluate(
      browser,
      `(() => { ${domHelpers}; for (const d of openDialogs()) d.close(); return true; })()`,
    );
  }
  if (kind === 'nav' && after.hash !== before.hash) {
    evaluate(browser, `location.hash = ${JSON.stringify(before.hash)}; true`);
    // Ждём закоммиченный раздел: hash приходит раньше DOM-патча React,
    // иначе следующий клик попадает в предыдущий раздел.
    if (before.hash !== '') browser.run('wait', '--fn', routeReady(before.hash));
  }
};

const SETTLED = 'document.getAnimations({subtree:true}).every((a)=>a.playState!=="running")';

const trustedRecord = (
  item: RegistryInput,
  env: Env,
  seq: number,
  kind: TrustKind,
  before: PageState,
  after: PageState,
  dur: number,
): ClickRecord =>
  record(seq, env, item.route, { b: before.own, a: after.own, dur }, signatureFor(item), {
    role: item.role,
    name: item.name,
    tag: item.tag,
    trusted: true,
    purpose: `verify-${kind}`,
  });

const trustedOne = (browser: Browser, env: Env, seq: number, pick: TrustPick): ClickRecord => {
  const started = Date.now();
  const before = stateOf(browser);
  browser.run('click', pick.hit.path);
  browser.run('wait', '--fn', SETTLED);
  const after = stateOf(browser);
  restore(browser, pick.kind, before, after);
  return trustedRecord(pick.item, env, seq, pick.kind, before, after, Date.now() - started);
};

export type ClickOutcome = Readonly<{
  clicks: readonly ClickRecord[];
  skips: readonly ClickSkip[];
}>;

/**
 * Ветвление одного доверенного клика: недостижимый элемент или падение клика —
 * пропуск с причиной (виден в отчёте), успех — запись. Пропуск не роняет прогон,
 * но молчать ему запрещено: счётчик идёт в summary, сверх порога роняет ratchet.
 */
export const attemptClick = (
  path: string,
  reachable: boolean,
  click: () => ClickRecord,
  cleanup: () => void,
): ClickOutcome => {
  if (!reachable) return { clicks: [], skips: [{ path, stage: 'trusted', reason: 'unreachable' }] };
  try {
    return { clicks: [click()], skips: [] };
  } catch {
    cleanup();
    return { clicks: [], skips: [{ path, stage: 'trusted', reason: 'click-threw' }] };
  }
};

/** Один доверенный клик без падения прогона: перекрытый элемент пропускается. */
const safeOne = (browser: Browser, env: Env, seq: number, pick: TrustPick): ClickOutcome =>
  attemptClick(
    pick.hit.path,
    clickable(browser, pick.hit.path),
    () => trustedOne(browser, env, seq, pick),
    () => closeDialogs(browser),
  );

const closeDialogs = (browser: Browser): void => {
  evaluate(
    browser,
    "([...document.querySelectorAll('dialog[open]')].forEach((d) => d.close()), true)",
  );
};

export type TrustedResult = ClickOutcome;

/** Выборка настоящих кликов после обхода: stride-семпл подходящих сигнатур. */
export const trustedSample = (
  browser: Browser,
  env: Env,
  start: number,
  seen: readonly RegistryInput[],
  hits: readonly SweepHit[],
): TrustedResult => {
  const outcomes = candidates(seen, hits).map((pick, index) =>
    safeOne(browser, env, start + index, pick),
  );
  closeDialogs(browser);
  return {
    clicks: outcomes.flatMap((outcome) => outcome.clicks),
    skips: outcomes.flatMap((outcome) => outcome.skips),
  };
};
