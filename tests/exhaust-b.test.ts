import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formCases } from '../scripts/exhaust/form-cases.ts';
import { probeInput, shortErrors } from '../scripts/exhaust/form-pass.ts';
import { walkSequences, walkSeeds, walkDepth } from '../scripts/exhaust/walk-plan.ts';
import { shrinkWalk } from '../scripts/exhaust/walk-run.ts';
import { findingsMarkdown, verdictOf } from '../scripts/exhaust/findings.ts';
import { checkLedger, dumpLedger, ledgerSeal, parseLedger } from '../scripts/exhaust/ledger.ts';
import { assertLocalRun } from '../scripts/exhaust/baseline.ts';

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
