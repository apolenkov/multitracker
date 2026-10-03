/** Часть (b): оси, формы, блуждания — один проход после слоёв 1–3. */
import type { Browser } from '../ui-driver.ts';
import { coveringArray, envKey, partBAxes, sweepEnv } from './axes.ts';
import { axisFindings, axisPass, axisTable, unsettledPoints } from './axis-pass.ts';
import type { AxisDetail } from './axis-pass.ts';
import { designConfig } from './design.ts';
import { formCases } from './form-cases.ts';
import { formGating, formSummary } from './form-pass.ts';
import { runWalks } from './walk-run.ts';
import type { Opener, WalkResult } from './walk-run.ts';
import { findingsMarkdown } from './findings.ts';
import type { ReproFinding } from './findings.ts';
import type { ClickSkip, Finding, RunLog } from './records.ts';
import type { RegistryInput } from './registry.ts';

export type PartB = Readonly<{
  findings: readonly Finding[];
  axisTuples: number;
  formCases: number;
  walks: number;
  walkSteps: number;
  skips: readonly ClickSkip[];
}>;

const axisRepro = (details: readonly AxisDetail[]): readonly ReproFinding[] =>
  details.flatMap((detail) =>
    detail.findings.map((finding) => ({
      rule: finding.rule,
      selector: finding.selector,
      expected: finding.expected,
      actual: finding.actual,
      seed: 0,
      path: detail.route,
      env: envKey(detail.env),
    })),
  );

const walkRepro = (walks: readonly WalkResult[]): readonly ReproFinding[] =>
  walks.flatMap((item) =>
    item.findings.map((finding) => ({
      rule: finding.rule,
      selector: finding.selector,
      expected: finding.expected,
      actual: finding.actual,
      seed: item.seed,
      path: item.path.join('>'),
      env: envKey(sweepEnv),
    })),
  );

const runAxis = (browser: Browser, log: RunLog): readonly AxisDetail[] => {
  const rows = coveringArray(partBAxes());
  const details = axisPass(browser, rows, designConfig());
  log.saveText('axis-table.md', axisTable(rows));
  log.saveJson('axis-details.json', {
    tuples: rows.length,
    routes: details.length,
    unsettled: unsettledPoints(details),
  });
  return details;
};

const runForms = (browser: Browser, log: RunLog): readonly Finding[] => {
  const cases = formCases();
  const summary = formSummary(cases);
  const gating = formGating(browser);
  log.saveJson('form-cases.json', {
    cases: summary.cases,
    long: summary.longErrors,
    gating: gating.length,
  });
  return gating;
};

const runWalkSave = async (
  browser: Browser,
  log: RunLog,
  seen: readonly RegistryInput[],
  openers: Readonly<Record<string, Opener>>,
): Promise<readonly WalkResult[]> => {
  const walks = await runWalks(browser, sweepEnv, seen, openers);
  log.saveJson('walks.json', {
    seeds: walks.map((item) => item.seed),
    count: walks.length,
    repros: walks.map((item) => item.repro),
    skips: walks.flatMap((item) => item.skips),
  });
  return walks;
};

/** Оси × разделы, 70 форм-кейсов, блуждания: артефакты и сводные находки. */
export const runPartB = async (
  browser: Browser,
  log: RunLog,
  seen: readonly RegistryInput[],
  openers: Readonly<Record<string, Opener>>,
): Promise<PartB> => {
  const details = runAxis(browser, log);
  const gating = runForms(browser, log);
  const walks = await runWalkSave(browser, log, seen, openers);
  const axis = axisFindings(details);
  const walkFindings = walks.flatMap((item) => item.findings);
  log.saveText(
    'part-b-findings.md',
    findingsMarkdown([...axisRepro(details), ...walkRepro(walks)]),
  );
  return {
    findings: [...axis, ...gating, ...walkFindings],
    axisTuples: coveringArray(partBAxes()).length,
    formCases: formCases().length,
    walks: walks.length,
    walkSteps: walks.reduce((steps, item) => steps + item.path.length, 0),
    skips: walks.flatMap((item) => item.skips),
  };
};
