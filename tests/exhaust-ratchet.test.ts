import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLedger, dumpLedger, ledgerSeal, parseLedger } from '../scripts/exhaust/ledger.ts';
import {
  assertLocalRun,
  codeExceptions,
  elementExceptions,
  unionEntries,
} from '../scripts/exhaust/baseline.ts';
import type { ClickSkip } from '../scripts/exhaust/records.ts';
import { reportChecks, skipReport } from '../scripts/exhaust/reports.ts';

await test('ledger ratchet: sealed only — missing fails, stale is reported only', () => {
  const entries = [{ signature: 'a|b', reason: 'disabled' }];
  const ledger = parseLedger(dumpLedger(entries));
  assert.equal(checkLedger(['a|b'], ledger).ok, true);
  const grown = checkLedger(['a|b', 'x|y'], ledger);
  assert.deepEqual(grown.missing, ['x|y']);
  assert.equal(grown.ok, false);
  const shrunk = checkLedger([], ledger);
  assert.deepEqual(shrunk.stale, ['a|b']);
  assert.equal(shrunk.ok, true);
  assert.equal(parseLedger('{"version":2,"exceptions":[]}').version, 2);
});

await test('code ledger reuses the ratchet: unknown functions fail, covered reported', () => {
  const ledger = parseLedger(
    dumpLedger([{ signature: 'src/a.ts|dead@9', reason: 'not reachable' }]),
  );
  assert.equal(checkLedger(['src/a.ts|dead@9'], ledger).ok, true);
  assert.equal(checkLedger(['src/a.ts|dead@9', 'src/a.ts|new@1'], ledger).ok, false);
  const shrunk = checkLedger([], ledger);
  assert.deepEqual(shrunk.stale, ['src/a.ts|dead@9']);
  assert.equal(shrunk.ok, true);
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

await test('baseline union keeps acknowledged entries and adds fresh uncovered', () => {
  const merged = unionEntries(
    [
      { signature: 'b', reason: 'disabled' },
      { signature: 'c', reason: 'not visible' },
    ],
    [
      { signature: 'a', reason: 'inside closed details' },
      { signature: 'b', reason: 'old reason' },
    ],
  );
  assert.deepEqual(
    merged.map((entry) => entry.signature),
    ['a', 'b', 'c'],
  );
  assert.equal(merged.find((entry) => entry.signature === 'b')?.reason, 'disabled');
});

await test('baseline rebuilds ledgers from run artifacts, sorted and keyed', () => {
  const elements = elementExceptions({
    entries: [
      { signature: 'b', clicked: false, reason: 'disabled' },
      { signature: 'a', clicked: false, reason: 'not visible' },
      { signature: 'c', clicked: true, reason: '' },
    ],
  });
  assert.deepEqual(
    elements.map((entry) => entry.signature),
    ['a', 'b'],
  );
  assert.equal(elements.at(0)?.reason, 'not visible');
  const code = codeExceptions({
    reports: [{ file: 'src/a.ts', uncoveredFunctions: ['z@3', 'a@1'] }],
  });
  assert.deepEqual(
    code.map((entry) => entry.signature),
    ['src/a.ts|a@1', 'src/a.ts|z@3'],
  );
  assert.ok(code.every((entry) => entry.reason.length > 0));
  assert.deepEqual(elementExceptions({ nope: 1 }), []);
  assert.deepEqual(codeExceptions(null), []);
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
