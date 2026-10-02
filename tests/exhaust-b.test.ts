import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formCases } from '../scripts/exhaust/form-cases.ts';
import { probeInput, shortErrors } from '../scripts/exhaust/form-pass.ts';
import { walkSequences, walkSeeds, walkDepth } from '../scripts/exhaust/walk-plan.ts';
import { shrinkWalk } from '../scripts/exhaust/walk-run.ts';
import { findingsMarkdown, verdictOf } from '../scripts/exhaust/findings.ts';
import { checkLedger, dumpLedger, ledgerSeal, parseLedger } from '../scripts/exhaust/ledger.ts';
import { assertLocalRun } from '../scripts/exhaust/baseline.ts';
import { execSteps } from '../scripts/exhaust/walk-run.ts';
import type { StepAcc, WalkDriver } from '../scripts/exhaust/walk-run.ts';
import type { ClickSkip } from '../scripts/exhaust/records.ts';
import { reportChecks, skipReport } from '../scripts/exhaust/reports.ts';
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

await test('ledger seal: hand edits and forged seals fail the ratchet', () => {
  const entries = [{ signature: 'a|b', reason: 'disabled' }];
  const unsigned = parseLedger(JSON.stringify({ version: 1, exceptions: entries }));
  assert.equal(checkLedger(['a|b'], unsigned).sealed, false);
  assert.equal(checkLedger(['a|b'], unsigned).ok, false);
  const sealedText = dumpLedger(entries);
  const wrongSeal = sealedText.replace(ledgerSeal(1, entries), '0'.repeat(64));
  assert.equal(checkLedger(['a|b'], parseLedger(wrongSeal)).ok, false);
  const edited = sealedText.replace('"reason": "disabled"', '"reason": "edited by hand"');
  assert.equal(checkLedger(['a|b'], parseLedger(edited)).ok, false);
  assert.equal(checkLedger(['a|b'], parseLedger(sealedText)).ok, true);
});

await test('baseline generator refuses to run inside CI', () => {
  assert.throws(() => assertLocalRun({ CI: 'true' }), /manual-only/);
  assert.throws(() => assertLocalRun({ CI: '1' }), /manual-only/);
  assert.doesNotThrow(() => assertLocalRun({}));
  assert.doesNotThrow(() => assertLocalRun({ CI: 'false' }));
});

const quietDriver: WalkDriver = {
  clickable: () => true,
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

await test('skipReport shares reasons and the ratchet fails over the share limit', () => {
  const skips: readonly ClickSkip[] = [
    { path: 'a', stage: 'walk', reason: 'unreachable' },
    { path: 'b', stage: 'walk', reason: 'unreachable' },
    { path: 'c', stage: 'trusted', reason: 'click-threw' },
    { path: 'd', stage: 'walk', reason: 'unreachable' },
    { path: 'e', stage: 'walk', reason: 'settle-timeout' },
    { path: 'f', stage: 'walk', reason: 'unreachable' },
  ];
  const report = skipReport(skips, 10);
  assert.equal(report.skipped, 6);
  assert.equal(report.share, 0.6);
  assert.equal(report.limit, 0.5);
  assert.deepEqual(report.reasons, {
    'walk:unreachable': 4,
    'walk:settle-timeout': 1,
    'trusted:click-threw': 1,
  });
  const base = {
    element: { missing: [], stale: [], sealed: true, ok: true },
    code: { missing: [], stale: [], sealed: true, ok: true },
    errors: [],
  };
  assert.throws(() => reportChecks({ ...base, skips: report }), /skipped clicks/);
  assert.doesNotThrow(() => reportChecks({ ...base, skips: skipReport(skips.slice(0, 2), 10) }));
});
