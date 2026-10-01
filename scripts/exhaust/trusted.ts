/** Доверенные клики выборки: ссылки, открыватели диалогов, инертные элементы. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Env } from './axes.ts';
import { record } from './records.ts';
import type { ClickRecord } from './records.ts';
import { domHelpers } from './page-dom.ts';
import type { PageState } from './probe.ts';
import { stateOf } from './probe.ts';
import type { SweepHit } from './page-rows.ts';
import type { RegistryInput } from './registry.ts';

const DESTRUCTIVE = /удал|delete|erase|очист|сброс|reset|отозват|revoke|отключ|disconnect/i;

const TRUSTED_SAMPLE = 8;

type TrustKind = 'nav' | 'dialog' | 'inert';

type TrustPick = Readonly<{ hit: SweepHit; kind: TrustKind }>;

const nameOf = (hit: SweepHit, item: RegistryInput | undefined): string =>
  item?.name ?? hit.meta?.name ?? '';

const tagOf = (hit: SweepHit, item: RegistryInput | undefined): string =>
  item?.tag ?? hit.meta?.tag ?? '';

const disqualified = (hit: SweepHit, item: RegistryInput | undefined): boolean =>
  hit.skipped !== '' || hit.path.includes('dialog#') || DESTRUCTIVE.test(nameOf(hit, item));

const trustKind = (hit: SweepHit, item: RegistryInput | undefined): TrustKind | null => {
  if (disqualified(hit, item)) return null;
  if (tagOf(hit, item) === 'a') return 'nav';
  if (hit.opened !== '') return 'dialog';
  return hit.before === hit.after ? 'inert' : null;
};

const candidates = (
  seen: readonly RegistryInput[],
  hits: readonly SweepHit[],
): readonly TrustPick[] => {
  const pool = hits.flatMap((hit) => {
    const kind = trustKind(
      hit,
      seen.find((item) => item.path === hit.path),
    );
    return kind === null ? [] : [{ hit, kind }];
  });
  const unique = pool.filter(
    (row, index) => pool.findIndex((other) => other.hit.path === row.hit.path) === index,
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
    evaluate(browser, 'history.back(); true');
    browser.run('wait', '--fn', `location.hash === ${JSON.stringify(before.hash)}`);
  }
};

const SETTLED = 'document.getAnimations({subtree:true}).every((a)=>a.playState!=="running")';

const trustMeta = (kind: TrustKind) => ({
  role: '',
  name: '',
  tag: '',
  trusted: true,
  purpose: `verify-${kind}`,
});

const trustedRecord = (
  route: string,
  env: Env,
  seq: number,
  path: string,
  kind: TrustKind,
  before: PageState,
  after: PageState,
  dur: number,
): ClickRecord =>
  record(seq, env, route, { b: before.own, a: after.own, dur }, `trusted:${path}`, trustMeta(kind));

const trustedOne = (
  browser: Browser,
  route: string,
  env: Env,
  seq: number,
  path: string,
  kind: TrustKind,
): ClickRecord => {
  const started = Date.now();
  const before = stateOf(browser);
  browser.run('click', path);
  browser.run('wait', '--fn', SETTLED);
  const after = stateOf(browser);
  restore(browser, kind, before, after);
  return trustedRecord(route, env, seq, path, kind, before, after, Date.now() - started);
};

/** Выборка настоящих кликов после обхода: stride-семпл подходящих сигнатур. */
export const trustedSample = (
  browser: Browser,
  route: string,
  env: Env,
  start: number,
  seen: readonly RegistryInput[],
  hits: readonly SweepHit[],
): readonly ClickRecord[] =>
  candidates(seen, hits).flatMap((pick, index) =>
    clickable(browser, pick.hit.path)
      ? [trustedOne(browser, route, env, start + index, pick.hit.path, pick.kind)]
      : [],
  );
