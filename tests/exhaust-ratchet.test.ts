import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLedger, dumpLedger, ledgerSeal, parseLedger } from '../scripts/exhaust/ledger.ts';
import {
  assertLocalRun,
  baselineText,
  codeExceptions,
  elementExceptions,
} from '../scripts/exhaust/baseline.ts';
import type { ClickSkip } from '../scripts/exhaust/records.ts';
import { reportChecks, skipReport } from '../scripts/exhaust/reports.ts';

await test('ledger ratchet: missing fails and stale fails until baseline regeneration', () => {
  const entries = [
    { signature: 'a|b', reason: 'disabled' },
    { signature: 'c|d', reason: 'not visible' },
  ];
  const ledger = parseLedger(dumpLedger(entries));
  assert.equal(checkLedger(['a|b', 'c|d'], ledger).ok, true);
  const grown = checkLedger(['a|b', 'c|d', 'x|y'], ledger);
  assert.deepEqual(grown.missing, ['x|y']);
  assert.equal(grown.ok, false);
  // Запись c|d стала лишней (элемент кликнут или не встретился сканеру) —
  // книга расходится с замером, прогон падает до явной пересборки (N1).
  const shrunk = checkLedger(['a|b'], ledger);
  assert.deepEqual(shrunk.stale, ['c|d']);
  assert.equal(shrunk.ok, false);
  assert.equal(parseLedger('{"version":2,"exceptions":[]}').version, 2);
});

await test('code ledger reuses the ratchet: unknown functions fail, stale fails too', () => {
  const ledger = parseLedger(
    dumpLedger([{ signature: 'src/a.ts|dead@9', reason: 'not reachable' }]),
  );
  assert.equal(checkLedger(['src/a.ts|dead@9'], ledger).ok, true);
  assert.equal(checkLedger(['src/a.ts|dead@9', 'src/a.ts|new@1'], ledger).ok, false);
  assert.deepEqual(checkLedger([], ledger).stale, ['src/a.ts|dead@9']);
  assert.equal(checkLedger([], ledger).ok, false);
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

await test('baseline extracts uncovered entries from run artifacts, sorted and keyed', () => {
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

const elementDoc = (entries: readonly { signature: string; clicked: boolean }[]) => ({
  entries: entries.map((entry) => ({ ...entry, reason: 'disabled' })),
});

await test('regeneration replaces the book: covered entries shrink away, run passes', () => {
  const book = parseLedger(
    dumpLedger([
      { signature: 'a', reason: 'disabled' },
      { signature: 'gone', reason: 'inside closed details' },
    ]),
  );
  // Покрывшийся gone → stale → прогон падает до пересборки генератором.
  assert.equal(checkLedger(['a'], book).ok, false);
  const ledgers = baselineText(
    elementDoc([
      { signature: 'a', clicked: false },
      { signature: 'gone', clicked: true },
    ]),
    { reports: [] },
  );
  const regen = parseLedger(ledgers.elements);
  assert.deepEqual(
    regen.exceptions.map((entry) => entry.signature),
    ['a'],
  );
  assert.equal(checkLedger(['a'], regen).ok, true);
  // Новый непокрытый после пересборки всё ещё роняет прогон.
  assert.equal(checkLedger(['a', 'n|e|w'], regen).ok, false);
});

const good = {
  element: { missing: [], stale: [], sealed: true, ok: true },
  code: { missing: [], stale: [], sealed: true, ok: true },
  errors: [],
  skips: skipReport([], 0, { attempted: 0, skipped: 0 }),
};

await test('reportChecks lets a stale-only ledger fail the run', () => {
  const staleElement = { missing: [], stale: ['gone|y'], sealed: true, ok: false };
  assert.throws(() => reportChecks({ ...good, element: staleElement }), /element ledger/);
});

const skip = (path: string, stage: ClickSkip['stage']): ClickSkip => ({
  path,
  stage,
  reason: 'unreachable',
});

await test('skipReport gates verification share at 0.4 and reports sweep share', () => {
  const skips: readonly ClickSkip[] = [
    skip('a', 'walk'),
    skip('b', 'walk'),
    { path: 'c', stage: 'trusted', reason: 'click-threw' },
    skip('d', 'walk'),
    { path: 'e', stage: 'walk', reason: 'settle-timeout' },
    skip('f', 'walk'),
  ];
  const report = skipReport(skips, 10, { attempted: 100, skipped: 40 });
  assert.equal(report.skipped, 6);
  assert.equal(report.share, 0.6);
  assert.equal(report.limit, 0.4);
  assert.deepEqual(report.sweep, { attempted: 100, skipped: 40, share: 0.4 });
  assert.deepEqual(report.total, { attempted: 110, skipped: 46, share: 0.418 });
  assert.deepEqual(report.reasons, {
    'walk:unreachable': 4,
    'walk:settle-timeout': 1,
    'trusted:click-threw': 1,
  });
  assert.throws(() => reportChecks({ ...good, skips: report }), /skipped clicks/);
  const calm = skipReport(skips.slice(0, 2), 10, { attempted: 100, skipped: 40 });
  assert.doesNotThrow(() => reportChecks({ ...good, skips: calm }));
});

await test('skip gate: 0.4 boundary passes, one skip over fails', () => {
  const ok = skipReport([skip('a', 'trusted'), skip('b', 'trusted'), skip('c', 'trusted'), skip('d', 'trusted')], 10, {
    attempted: 0,
    skipped: 0,
  });
  assert.equal(ok.share, 0.4);
  assert.doesNotThrow(() => reportChecks({ ...good, skips: ok }));
  const over = skipReport(
    [skip('a', 'trusted'), skip('b', 'trusted'), skip('c', 'trusted'), skip('d', 'trusted'), skip('e', 'trusted')],
    10,
    { attempted: 0, skipped: 0 },
  );
  assert.equal(over.share, 0.5);
  assert.throws(() => reportChecks({ ...good, skips: over }), /skipped clicks/);
});
