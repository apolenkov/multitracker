/** Блуждания части (b): seeded walks, инварианты после каждого клика, усадка. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Env } from './axes.ts';
import { ddmin } from './shrink.ts';
import { fullInvariantsSource } from './page-checks.ts';
import { clickableNow } from './dom-rules.ts';
import { asFinding } from './page-rows.ts';
import { asArray } from './guards.ts';
import type { ClickSkip, Finding } from './records.ts';
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
  skips: readonly ClickSkip[];
}>;

const SETTLED = 'document.getAnimations({subtree:true}).every((a)=>a.playState!=="running")';

/** Пул путей для блужданий: только посещённые без пропусков. */
export const walkPool = (seen: readonly RegistryInput[]): readonly string[] =>
  seen.filter((item) => item.skip === '').map((item) => item.path);

/** Пробник: элемент виден и не за модальным диалогом (фон под dialog[open] инертен). */
export const clickableProbe = (path: string): string =>
  `(() => { const clickableNow = ${clickableNow.toString()}; const el = document.querySelector(${JSON.stringify(path)}); const dlg = document.querySelector('dialog[open]'); return clickableNow(!!el, !!el && el.checkVisibility(), dlg !== null, dlg !== null && el !== null && dlg.contains(el)); })()`;

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

/** Шаги блуждания через узкий интерфейс: единственная точка, знающая о Browser. */
export type WalkDriver = Readonly<{
  clickable: (path: string) => boolean;
  click: (path: string) => void;
  settle: () => void;
  findings: () => readonly Finding[];
}>;

const browserDriver = (browser: Browser, env: Env): WalkDriver => ({
  clickable: (path) => clickable(browser, path),
  click: (path) => {
    browser.run('click', path);
  },
  settle: () => {
    browser.run('wait', '--fn', SETTLED);
  },
  findings: () => stepFindings(browser, env),
});

export type StepAcc = Readonly<{
  findings: readonly Finding[];
  skips: readonly ClickSkip[];
  failed: boolean;
}>;

const emptyAcc: StepAcc = { findings: [], skips: [], failed: false };

const withSkip = (acc: StepAcc, path: string, reason: ClickSkip['reason']): StepAcc => ({
  ...acc,
  skips: [...acc.skips, { path, stage: 'walk' as const, reason }],
});

const withFail = (acc: StepAcc, path: string): StepAcc => ({
  ...acc,
  findings: [
    ...acc.findings,
    { rule: 'walk-click-fail', selector: path, expected: 'click', actual: 'throw' },
  ],
  failed: true,
});

const stepOne = (drv: WalkDriver, path: string, acc: StepAcc): StepAcc => {
  if (!drv.clickable(path)) return withSkip(acc, path, 'unreachable');
  try {
    drv.click(path);
  } catch {
    return withFail(acc, path);
  }
  try {
    drv.settle();
  } catch {
    // Клик был, усадка не дождалась — инварианты шага не сняты: пропуск с причиной.
    return withSkip(acc, path, 'settle-timeout');
  }
  const fresh = drv.findings();
  return { ...acc, findings: [...acc.findings, ...fresh], failed: acc.failed || fresh.length > 0 };
};

export const execSteps = (drv: WalkDriver, paths: readonly string[], acc: StepAcc): StepAcc =>
  paths.length === 0
    ? acc
    : execSteps(drv, paths.slice(1), stepOne(drv, paths.at(0) ?? '', acc));

const replays = (browser: Browser, env: Env, candidate: readonly string[]): Promise<boolean> =>
  Promise.resolve().then(() => {
    closeDialogs(browser);
    const acc: StepAcc = execSteps(browserDriver(browser, env), candidate, emptyAcc);
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
  const acc = execSteps(browserDriver(browser, env), ordered, emptyAcc);
  const repro = await shrinkIfFailed(browser, env, ordered, acc.findings);
  closeDialogs(browser);
  return { seed: seed + index, path: ordered, findings: acc.findings, repro, skips: acc.skips };
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
