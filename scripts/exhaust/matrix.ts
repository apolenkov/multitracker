/** Строгая матрица 135×8: каждая запись инвентаря в каждом обязательном контексте. */
import assert from 'node:assert/strict';
import { createBrowser, evaluate, settleLayout } from '../ui-driver.ts';
import { baseEnv, type Env } from './axes.ts';
import { applyEnv } from './envctl.ts';
import { installHooksSource } from './page-dom.ts';
import { cellFindings, runSteps, stateSteps } from './matrix-actions.ts';
import { expectationNote, quietScene, resetScene, restore } from './matrix-scene.ts';
import { severity } from './design.ts';
import { planFor, planProblems } from './matrix-steps.ts';
import type { EntryPlan, MatrixContext } from './matrix-dsl.ts';
import { loadInventory, validateInventory, type InventoryEntry } from './inventory.ts';
import { createRunLog } from './records.ts';
import { writeMatrixReport, type MatrixCell } from './matrix-report.ts';
import { asText, isRecord } from './guards.ts';
import type { Finding } from './records.ts';

type Browser = ReturnType<typeof createBrowser>;

const allContexts: readonly MatrixContext[] = (['ru', 'en'] as const).flatMap((language) =>
  ([1440, 375] as const).flatMap((width) =>
    (['light', 'dark'] as const).map((theme) => ({ language, width, theme })),
  ),
);

const contextKey = (context: MatrixContext): string =>
  `${context.language}/${context.width}/${context.theme}`;

const selected = (process.env.MULTITRACKER_MATRIX_CONTEXTS ?? '')
  .split(',')
  .filter((item) => item !== '');

const contexts: readonly MatrixContext[] =
  selected.length > 0
    ? allContexts.filter((context) => selected.includes(contextKey(context)))
    : allContexts;

const envFor = (context: MatrixContext): Env => ({
  ...baseEnv,
  language: context.language,
  theme: context.theme,
  width: String(context.width),
});

const appliedFailures = (applied: unknown): readonly string[] => {
  if (!isRecord(applied)) return ['<нет ответа>'];
  const list = applied.applied;
  return Array.isArray(list) ? list.map((item) => asText(item)) : ['<нет ответа>'];
};

const skipped = (entry: InventoryEntry, context: MatrixContext): MatrixCell => ({
  id: entry.id,
  context: contextKey(context),
  status: 'N/A',
  note: entry.reason,
  durationMs: 0,
  findings: [],
});

const failed = (entry: InventoryEntry, context: MatrixContext, error: unknown): MatrixCell => ({
  id: entry.id,
  context: contextKey(context),
  status: 'FAIL',
  note: error instanceof Error ? error.message : String(error),
  durationMs: 0,
  findings: [],
});

const envWithState = (env: Env, plan: EntryPlan): Env => {
  const states = stateSteps(plan.steps);
  return states.length > 0 ? { ...env, demoState: states[0]?.value ?? baseEnv.demoState } : env;
};

const prepareState = (browser: Browser, entry: InventoryEntry, env: Env, plan: EntryPlan): Env => {
  const cellEnv = envWithState(env, plan);
  if (cellEnv === env) return env;
  const failures = appliedFailures(applyEnv(browser, cellEnv, 'overview'));
  assert.deepEqual(failures, [], `${entry.id}: состояние не применилось`);
  return cellEnv;
};

const resetState = (browser: Browser, env: Env): void => {
  applyEnv(browser, env, 'overview');
};

type Scored = Readonly<{ note: string; findings: readonly Finding[]; dom: string }>;

/** DOM открытого состояния ячейки — доказательство в states.jsonl. */
const STATE_DOM =
  "(document.querySelector('dialog[open]') ?? document.querySelector('#main') ?? document.body).outerHTML";

const scoreCell = (browser: Browser, plan: EntryPlan, cellEnv: Env): Scored => {
  resetScene(browser);
  const outcome = runSteps(browser, plan.steps, cellEnv);
  // Семантика ячейки и DOM состояния фиксируются сразу после шагов, пока меню или диалог открыты.
  const expectation = expectationNote(browser, plan, outcome);
  const dom = asText(evaluate(browser, STATE_DOM));
  // Замеры идут на покое: меню закрыто, прокрутка в начало, курсор уведён.
  quietScene(browser);
  browser.run('mouse', 'move', '0', '0');
  settleLayout(browser);
  const findings = cellFindings(browser, cellEnv);
  // Минорные шероховатости — предупреждения в журнале; ячейку роняют только
  // критические и важные находки (доступность, маскировка, перекрытия управления).
  const important = findings.filter((finding) => severity(finding.rule) !== 'minor');
  const note =
    expectation !== ''
      ? expectation
      : important.map((finding) => `${finding.rule} ${finding.selector}`).join('; ');
  restore(browser, outcome.openedDetails);
  return { note, findings, dom };
};

const cellOf = (
  entry: InventoryEntry,
  context: MatrixContext,
  scored: Scored,
  started: number,
): MatrixCell => ({
  id: entry.id,
  context: contextKey(context),
  status: scored.note === '' ? 'PASS' : 'FAIL',
  note: scored.note,
  durationMs: Date.now() - started,
  findings: scored.findings,
  dom: scored.dom,
});

const scoredCell = (
  browser: Browser,
  entry: InventoryEntry,
  env: Env,
  context: MatrixContext,
  plan: EntryPlan,
): MatrixCell => {
  const started = Date.now();
  const cellEnv = prepareState(browser, entry, env, plan);
  try {
    return cellOf(entry, context, scoreCell(browser, plan, cellEnv), started);
  } catch (error) {
    restore(browser, []);
    throw error;
  } finally {
    if (cellEnv !== env) resetState(browser, env);
  }
};

const runCell = (
  browser: Browser,
  entry: InventoryEntry,
  env: Env,
  context: MatrixContext,
): MatrixCell => {
  const plan = planFor(entry.id);
  assert.ok(plan, `${entry.id}: нет плана`);
  const reason = plan.when?.(context) ?? '';
  if (reason !== '') return skipped(entry, context);
  return scoredCell(browser, entry, env, context, plan);
};

const runContext = (
  browser: Browser,
  context: MatrixContext,
  scope: readonly InventoryEntry[],
): readonly MatrixCell[] => {
  const env = envFor(context);
  const failures = appliedFailures(applyEnv(browser, env, 'overview'));
  assert.deepEqual(failures, [], `${contextKey(context)}: окружение не применилось`);
  return scope.flatMap((entry) => {
    try {
      return [runCell(browser, entry, env, context)];
    } catch (error) {
      return [failed(entry, context, error)];
    }
  });
};

const collectCells = (
  browser: Browser,
  scope: readonly InventoryEntry[],
  out: readonly InventoryEntry[],
): readonly MatrixCell[] => {
  const base = process.env.MULTITRACKER_UI_URL ?? 'http://127.0.0.1:4180';
  browser.run('open', base);
  browser.run(
    'wait',
    '--fn',
    "document.readyState === 'complete' && !!document.querySelector('.desktop-links a')",
  );
  evaluate(browser, installHooksSource);
  return contexts.flatMap((context) => {
    const scored = runContext(browser, context, scope);
    const passed = scored.filter((cell) => cell.status === 'PASS').length;
    const broken = scored.filter((cell) => cell.status === 'FAIL').length;
    console.log(`${contextKey(context)}: ${passed} PASS, ${broken} FAIL`);
    return [...scored, ...out.map((entry) => skipped(entry, context))];
  });
};

const runAll = (
  scope: readonly InventoryEntry[],
  out: readonly InventoryEntry[],
): readonly MatrixCell[] => {
  const browser = createBrowser();
  try {
    return collectCells(browser, scope, out);
  } finally {
    browser.run('close');
  }
};

const main = (): void => {
  const entries = loadInventory();
  assert.deepEqual(validateInventory(entries), [], 'инвентарь не прошёл валидацию');
  const only = (process.env.MULTITRACKER_MATRIX_ONLY ?? '')
    .split(',')
    .filter((item) => item !== '');
  const full = entries.filter((entry) => entry.scope === 'current');
  assert.deepEqual(planProblems(full), [], 'планы не совпадают с инвентарём');
  const scope = full.filter((entry) => only.length === 0 || only.includes(entry.id));
  const out = entries.filter((entry) => entry.scope === 'out');
  const log = createRunLog(
    process.env.MULTITRACKER_MATRIX_OUT ?? 'docs/audits',
    new Date().toISOString().slice(0, 10),
    `${Date.now().toString(36)}-${process.pid}`,
    'matrix',
  );
  const started = Date.now();
  writeMatrixReport(
    runAll(scope, out),
    log,
    started,
    contexts.length * (scope.length + out.length),
  );
};

main();
