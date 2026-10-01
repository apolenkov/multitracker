import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formCases } from '../scripts/exhaust/form-cases.ts';
import { probeInput, shortErrors } from '../scripts/exhaust/form-pass.ts';
import { walkSequences, walkSeeds, walkDepth } from '../scripts/exhaust/walk-plan.ts';
import { shrinkWalk } from '../scripts/exhaust/walk-run.ts';
import { findingsMarkdown, verdictOf } from '../scripts/exhaust/findings.ts';

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
    { rule: 'page-overflow', selector: 'html', expected: 'a', actual: 'b', seed: 7, path: 'a>b', env: 'ru|light' },
  ]);
  assert.ok(md.includes('product defect'));
  assert.equal(verdictOf({ rule: 'contrast-text', selector: 's', expected: 'e', actual: 'a' }), 'product defect');
});
