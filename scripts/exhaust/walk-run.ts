/** Блуждания части (b): seeded walks, инварианты после каждого клика, усадка. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Env } from './axes.ts';
import { ddmin } from './shrink.ts';
import { fullInvariantsSource } from './page-checks.ts';
import { asFinding } from './page-rows.ts';
import { asArray } from './guards.ts';
import type { Finding } from './records.ts';
import type { RegistryInput } from './registry.ts';
import { walkDepth, walkSeeds, walkSequences } from './walk-plan.ts';

/** Тонкая обёртка ddmin для путей: test true, когда сбой воспроизводится. */
export const shrinkWalk = async (
  seq: readonly string[],
  test: (candidate: readonly string[]) => Promise<boolean>,
): Promise<readonly string[]> => await ddmin(seq, test);

export type WalkResult = Readonly<{
  seed: number;
  path: readonly string[];
  findings: readonly Finding[];
  repro: readonly string[];
}>;

const SETTLED = 'document.getAnimations({subtree:true}).every((a)=>a.playState!=="running")';

/** Пул путей для блужданий: только посещённые без пропусков. */
export const walkPool = (seen: readonly RegistryInput[]): readonly string[] =>
  seen.filter((item) => item.skip === '').map((item) => item.path);

/** Пробник: элемент виден и не за модальным диалогом (фон под dialog[open] инертен). */
export const clickableProbe = (path: string): string =>
  `(() => { const el = document.querySelector(${JSON.stringify(path)}); const dlg = document.querySelector('dialog[open]'); return !!el && el.checkVisibility() && (!dlg || dlg.contains(el)); })()`;

const clickable = (browser: Browser, path: string): boolean =>
  evaluate(browser, clickableProbe(path)) === true;

const stepFindings = (browser: Browser, env: Env): readonly Finding[] => {
  const cfg = JSON.stringify({ hideAmounts: env.hideAmounts, langStrings: [], keys: [] });
  const value: unknown = evaluate(browser, `(${fullInvariantsSource})(${cfg})`);
  return asArray(value).flatMap((row) => {
    const finding = asFinding(row);
    return finding === null ? [] : [finding];
  });
};

const closeDialogs = (browser: Browser): void => {
  evaluate(
    browser,
    "([...document.querySelectorAll('dialog[open]')].forEach((d) => d.close()), true)",
  );
};

type StepAcc = Readonly<{ findings: readonly Finding[]; failed: boolean }>;

const stepOne = (browser: Browser, env: Env, path: string, acc: StepAcc): StepAcc => {
  if (!clickable(browser, path)) return acc;
  try {
    browser.run('click', path);
  } catch {
    return {
      findings: [
        ...acc.findings,
        { rule: 'walk-click-fail', selector: path, expected: 'click', actual: 'throw' },
      ],
      failed: true,
    };
  }
  try {
    browser.run('wait', '--fn', SETTLED);
  } catch {
    return acc;
  }
  const fresh = stepFindings(browser, env);
  return { findings: [...acc.findings, ...fresh], failed: acc.failed || fresh.length > 0 };
};

const execSteps = (browser: Browser, env: Env, paths: readonly string[], acc: StepAcc): StepAcc =>
  paths.length === 0
    ? acc
    : execSteps(browser, env, paths.slice(1), stepOne(browser, env, paths.at(0) ?? '', acc));

const replays = (browser: Browser, env: Env, candidate: readonly string[]): Promise<boolean> =>
  Promise.resolve().then(() => {
    closeDialogs(browser);
    const acc: StepAcc = execSteps(browser, env, candidate, { findings: [], failed: false });
    closeDialogs(browser);
    return acc.findings.length > 0;
  });

const shrinkIfFailed = (
  browser: Browser,
  env: Env,
  seq: readonly string[],
  findings: readonly Finding[],
): Promise<readonly string[]> =>
  findings.length === 0
    ? Promise.resolve(seq)
    : shrinkWalk(seq, (cand) => replays(browser, env, cand));

const runOne = async (
  browser: Browser,
  env: Env,
  paths: readonly string[],
  seed: number,
  index: number,
): Promise<WalkResult> => {
  const seq = walkSequences(paths, seed, 1, walkDepth).at(0) ?? [];
  const ordered = walkSequences(paths, seed + index, 1, walkDepth).at(0) ?? seq;
  const acc = execSteps(browser, env, ordered, { findings: [], failed: false });
  const repro = await shrinkIfFailed(browser, env, ordered, acc.findings);
  closeDialogs(browser);
  return { seed: seed + index, path: ordered, findings: acc.findings, repro };
};

const runSeed = (
  browser: Browser,
  env: Env,
  paths: readonly string[],
  seed: number,
  count: number,
): Promise<readonly WalkResult[]> =>
  Promise.all(
    Array.from({ length: count }, (_, index) => runOne(browser, env, paths, seed, index)),
  );

/** Все блуждания: по count на сид, глубина walkDepth, усадка падающих. */
export const runWalks = async (
  browser: Browser,
  env: Env,
  seen: readonly RegistryInput[],
): Promise<readonly WalkResult[]> => {
  const pool = walkPool(seen);
  if (pool.length === 0) return [];
  const per = await Promise.all(walkSeeds.map((seed) => runSeed(browser, env, pool, seed, 2)));
  return per.flatMap((row) => row);
};
