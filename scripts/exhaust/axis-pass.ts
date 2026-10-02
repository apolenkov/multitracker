/** Проход осей части (b): покрывающий массив × разделы, инварианты и дизайн. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Env } from './axes.ts';
import { envKey } from './axes.ts';
import { applyEnv } from './envctl.ts';
import { fullInvariantsSource } from './page-checks.ts';
import { designScan } from './page-design.ts';
import type { DesignConfig } from './design.ts';
import { asFinding } from './page-rows.ts';
import { asArray } from './guards.ts';
import type { Finding } from './records.ts';
import { routes } from './reports.ts';

export type AxisDetail = Readonly<{
  env: Env;
  route: string;
  findings: readonly Finding[];
  /** false — скан снят посреди перехода/раскладки: точка видима в журнале. */
  settled: boolean;
}>;

const cfgOf = (env: Env) =>
  JSON.stringify({ hideAmounts: env.hideAmounts, langStrings: [], keys: [] });

const pageFindings = (browser: Browser, env: Env, config: DesignConfig): readonly Finding[] => {
  const invariants: unknown = evaluate(browser, `(${fullInvariantsSource})(${cfgOf(env)})`);
  const design: unknown = evaluate(
    browser,
    designScan({ ...config, reducedMotion: env.reducedMotion }),
  );
  return [...asArray(invariants), ...asArray(design)].flatMap((row) => {
    const finding = asFinding(row);
    return finding === null ? [] : [finding];
  });
};

const SETTLED = 'document.getAnimations({subtree:true}).every((a)=>a.playState!=="running")';

const waitSettled = (browser: Browser): boolean => {
  try {
    browser.run('wait', '--fn', SETTLED);
    return true;
  } catch {
    return false;
  }
};

const waitLaidOut = (browser: Browser): boolean => {
  try {
    evaluate(
      browser,
      '(async()=>{await new Promise((r)=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(0))))})()',
    );
    return true;
  } catch {
    return false;
  }
};

const checkRoute = (
  browser: Browser,
  env: Env,
  route: string,
  config: DesignConfig,
): AxisDetail => {
  applyEnv(browser, env, route);
  browser.run('wait', '--fn', "!!document.querySelector('#main h1')");
  // Цвета и контраст меряем после CSS-переходов и JS-раскладки (два кадра):
  // снятие посреди transition даёт ложные значения. Таймаут не теряет точку
  // осей — сканируем как есть, но помечаем settled:false в журнале.
  const settled = waitSettled(browser) && waitLaidOut(browser);
  return { env, route, settled, findings: pageFindings(browser, env, config) };
};

const checkRow = (browser: Browser, env: Env, config: DesignConfig): readonly AxisDetail[] =>
  routes.map((route) => checkRoute(browser, env, route, config));

/** Все кортежи × все разделы: последовательно, один eval инвариантов и дизайна на точку. */
export const axisPass = (
  browser: Browser,
  rows: readonly Env[],
  config: DesignConfig,
): readonly AxisDetail[] => rows.flatMap((env) => checkRow(browser, env, config));

/** Таблица покрывающего массива для отчёта: ключ env × маршрут. */
export const axisTable = (rows: readonly Env[]): string =>
  [
    '# Axis covering array (pairwise, part b)',
    '',
    `rows: ${rows.length}`,
    '',
    ...rows.map((env, index) => `${index + 1}. ${envKey(env)}`),
  ].join('\n');

export const axisFindings = (details: readonly AxisDetail[]): readonly Finding[] =>
  details.flatMap((detail) => detail.findings);

/** Точки, снятые до конца усадки: «env маршрут» по одной строке для журнала. */
export const unsettledPoints = (details: readonly AxisDetail[]): readonly string[] =>
  details.filter((detail) => !detail.settled).map((d) => `${envKey(d.env)} ${d.route}`);
