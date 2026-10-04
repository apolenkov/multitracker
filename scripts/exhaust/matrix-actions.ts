/** Исполнение шагов матрицы и проверки состояния: имена, клики, восстановление. */
import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from '../ui-driver.ts';
import type { Env } from './axes.ts';
import { localize } from './matrix-labels.ts';
import { clickSource } from './matrix-click.ts';
import { clickWithRecovery, closeDialogs } from './matrix-scene.ts';
import type { MatrixStep } from './matrix-dsl.ts';
import { fullInvariantsSource } from './page-checks.ts';
import { designScan } from './page-design.ts';
import { designConfig } from './design.ts';
import { asArray, asText } from './guards.ts';
import { asFinding } from './page-rows.ts';
import { routeReady } from './probe.ts';
import type { Finding } from './records.ts';

const marker = '[data-matrix-target]';

export type StepOutcome = Readonly<{
  dialogOpened: boolean;
  route: string;
  openedDetails: readonly string[];
}>;

const hashWait = (browser: Browser, hash: string): void => {
  browser.run('wait', '--fn', routeReady(hash));
  settleLayout(browser);
};

const stepRoute = (
  browser: Browser,
  step: Extract<MatrixStep, { k: 'route' }>,
  env: Env,
): string => {
  const link = `.desktop-links a[href='${step.hash}']`;
  try {
    if (Number(env.width) >= 768) browser.run('click', link);
    else evaluate(browser, `location.hash = '${step.hash}'; true`);
  } catch {
    evaluate(browser, `location.hash = '${step.hash}'; true`);
  }
  hashWait(browser, step.hash);
  return step.hash;
};

const clickText = (
  browser: Browser,
  name: string,
  within: string | undefined,
  alt?: readonly string[],
): void => {
  const found: unknown = evaluate(browser, clickSource(name, within, alt));
  assert.equal(found, 'marked', `текст «${name}»${within ? ` в ${within}` : ''}: ${String(found)}`);
  browser.run('scrollintoview', marker);
  browser.run(
    'wait',
    '--fn',
    `(() => { const el = document.querySelector(${JSON.stringify(marker)}); if (!el) return false; const box = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)); })()`,
  );
  clickWithRecovery(browser, marker);
  evaluate(
    browser,
    `document.querySelector(${JSON.stringify(marker)})?.removeAttribute('data-matrix-target'); true`,
  );
};

const stepClick = (browser: Browser, step: Extract<MatrixStep, { k: 'click' }>, env: Env): void => {
  const selector = env.language === 'en' && step.selEn ? step.selEn : step.sel;
  // Чужой открытый диалог поверх цели закрывается: цель вне диалога должна быть доступна.
  const blocked =
    evaluate(
      browser,
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; if (el.closest('dialog[open]')) return false; return document.querySelectorAll('dialog[open]').length > 0; })()`,
    ) === true;
  if (blocked) closeDialogs(browser, 1);
  // Раскрытие нормализуется: если details уже открыт, сначала закрываем его.
  const alreadyOpen =
    evaluate(
      browser,
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el || el.tagName !== 'SUMMARY') return false; const d = el.closest('details'); return !!d && d.open === true; })()`,
    ) === true;
  if (alreadyOpen) clickWithRecovery(browser, selector);
  clickWithRecovery(browser, selector);
};

const stepText = (browser: Browser, step: Extract<MatrixStep, { k: 'text' }>, env: Env): void => {
  const language = env.language === 'en' ? 'en' : 'ru';
  clickText(
    browser,
    localize(step.name, language),
    step.within,
    step.alt?.map((item) => localize(item, language)),
  );
  settleLayout(browser);
};

const stepSelect = (browser: Browser, step: Extract<MatrixStep, { k: 'select' }>): void => {
  browser.run('select', step.sel, step.value);
  settleLayout(browser);
};

const stepVerify = (
  browser: Browser,
  step: Extract<MatrixStep, { k: 'verify' }>,
  env: Env,
): void => {
  const selector = env.language === 'en' && step.selEn ? step.selEn : step.sel;
  browser.run('scrollintoview', selector);
  browser.run(
    'wait',
    '--fn',
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return !!el && el.checkVisibility({checkVisibilityCSS:true}); })()`,
  );
};

const stepEscape = (browser: Browser): void => {
  browser.run('press', 'Escape');
  browser.run('wait', '--fn', '!document.querySelector("dialog[open]")');
};

const runStep = (browser: Browser, step: MatrixStep, env: Env, route: string): string => {
  if (step.k === 'route') return stepRoute(browser, step, env);
  if (step.k === 'click') stepClick(browser, step, env);
  if (step.k === 'text') stepText(browser, step, env);
  if (step.k === 'select') stepSelect(browser, step);
  if (step.k === 'verify') stepVerify(browser, step, env);
  if (step.k === 'escape') stepEscape(browser);
  return route;
};

const openDetails = (browser: Browser): readonly string[] =>
  asArray(
    evaluate(
      browser,
      `[...document.querySelectorAll('details[open]')].map((d) => d.querySelector('summary')?.textContent?.trim() ?? '')`,
    ),
  ).map((item) => asText(item));

export const stateSteps = (
  steps: readonly MatrixStep[],
): readonly Extract<MatrixStep, { k: 'state' }>[] =>
  steps.filter((step): step is Extract<MatrixStep, { k: 'state' }> => step.k === 'state');

/** Шаги, кроме состояния обзора: его применяет вызывающий (нужен полный Env). */
export const runSteps = (browser: Browser, steps: readonly MatrixStep[], env: Env): StepOutcome => {
  const applicable = steps.filter((step) => step.k !== 'state');
  const before = openDetails(browser);
  const route = applicable.reduce((current, step) => runStep(browser, step, env, current), '');
  const dialogs = evaluate(browser, `document.querySelectorAll('dialog[open]').length`);
  const opened = openDetails(browser).filter((text) => !before.includes(text));
  return {
    dialogOpened: typeof dialogs === 'number' && dialogs > 0,
    route,
    openedDetails: opened,
  };
};

/** Проверки ячейки: инварианты состояния и дизайн-скан; возвращает находки. */
export const cellFindings = (browser: Browser, env: Env): readonly Finding[] => {
  const cfg = JSON.stringify({ hideAmounts: env.hideAmounts, langStrings: [], keys: [] });
  const rows = [
    ...asArray(evaluate(browser, `(${fullInvariantsSource})(${cfg})`)),
    ...asArray(
      evaluate(browser, designScan({ ...designConfig(), reducedMotion: env.reducedMotion })),
    ),
  ];
  const findings = rows.flatMap((row) => {
    const finding = asFinding(row);
    return finding === null ? [] : [finding];
  });
  return findings;
};
