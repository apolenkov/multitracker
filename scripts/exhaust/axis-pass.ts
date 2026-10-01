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

const checkRoute = (
  browser: Browser,
  env: Env,
  route: string,
  config: DesignConfig,
): AxisDetail => {
  applyEnv(browser, env, route);
  browser.run('wait', '--fn', "!!document.querySelector('#main h1')");
  return { env, route, findings: pageFindings(browser, env, config) };
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
