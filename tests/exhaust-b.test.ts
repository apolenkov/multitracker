import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formCases } from '../scripts/exhaust/form-cases.ts';
import { probeInput, shortErrors } from '../scripts/exhaust/form-pass.ts';
import { walkSequences, walkSeeds, walkDepth } from '../scripts/exhaust/walk-plan.ts';
import { shrinkWalk } from '../scripts/exhaust/walk-run.ts';
import { findingsMarkdown, verdictOf } from '../scripts/exhaust/findings.ts';
import { execSteps } from '../scripts/exhaust/walk-run.ts';
import type { StepAcc, WalkDriver } from '../scripts/exhaust/walk-run.ts';
import { unsettledPoints } from '../scripts/exhaust/axis-pass.ts';
import { baseEnv } from '../scripts/exhaust/axes.ts';

await test('probe inputs derive one field from schema per case', () => {
  const first = formCases().at(0);
  assert.ok(first);
  const input = probeInput(first.type, first.valueClass, 0);
  assert.equal(input.type, first.type);
  assert.ok(shortErrors(input).every((code) => code.length <= 20 && !code.includes(' ')));
});

await test('walk shrinking keeps only the failing suffix', async () => {
  const seq = walkSequences(['a', 'b', 'c', 'd', 'e', 'f'], walkSeeds[0], 1, walkDepth).at(0);
  assert.ok(seq?.length === walkDepth);
  const shrunk = await shrinkWalk(['x', 'fail', 'y'], (cand) =>
    Promise.resolve(cand.includes('fail')),
  );
  assert.deepEqual(shrunk, ['fail']);
});

await test('findings markdown records repro and product verdict', () => {
  const md = findingsMarkdown([
    {
      rule: 'page-overflow',
      selector: 'html',
      expected: 'a',
      actual: 'b',
      seed: 7,
      path: 'a>b',
      env: 'ru|light',
    },
  ]);
  assert.ok(md.includes('product defect'));
  assert.equal(verdictOf({ rule: 'contrast-text' }), 'product defect');
});

const quietDriver: WalkDriver = {
  clickable: () => true,
  obstructed: () => false,
  closeDialogs: () => undefined,
  click: () => undefined,
  settle: () => undefined,
  findings: () => [],
};

const stepInit: StepAcc = { findings: [], skips: [], failed: false };

await test('walk steps count every skipped click with its reason', () => {
  const blocked = execSteps(
    { ...quietDriver, clickable: (path) => path !== 'behind-dialog' },
    ['ok', 'behind-dialog', 'ok2'],
    stepInit,
  );
  assert.deepEqual(blocked.skips, [
    { path: 'behind-dialog', stage: 'walk', reason: 'unreachable' },
  ]);
  const unsettled = execSteps(
    {
      ...quietDriver,
      settle: () => {
        throw new Error('timeout');
      },
    },
    ['slow'],
    stepInit,
  );
  assert.deepEqual(unsettled.skips, [{ path: 'slow', stage: 'walk', reason: 'settle-timeout' }]);
  const refused = execSteps(
    {
      ...quietDriver,
      click: () => {
        throw new Error('refused');
      },
    },
    ['x'],
    stepInit,
  );
  assert.equal(refused.skips.length, 0);
  assert.ok(refused.findings.some((f) => f.rule === 'walk-click-fail'));
  assert.equal(refused.failed, true);
});

await test('unsettledPoints names every axis point scanned mid-transition', () => {
  const detail = (settled: boolean, route: string) => ({
    env: baseEnv,
    route,
    findings: [],
    settled,
  });
  const points = unsettledPoints([
    detail(true, 'overview'),
    detail(false, 'history'),
    detail(false, 'sync'),
  ]);
  assert.deepEqual(
    points.map((point) => point.split(' ').at(-1)),
    ['history', 'sync'],
  );
});
