import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { amountLike, lineDeltaMax, paintsBox, visiblePoint } from '../scripts/exhaust/dom-rules.ts';
import { designScales } from '../scripts/exhaust/tokens.ts';
import { fullInvariantsSource } from '../scripts/exhaust/page-checks.ts';
import { designScanSource } from '../scripts/exhaust/page-design.ts';
import { clickableProbe } from '../scripts/exhaust/walk-run.ts';

await test('amountLike flags real sums but spares dates, ordinals and masked marks', () => {
  assert.equal(amountLike('Стоимость сейчас••••30 сент. 2026 г.'), false);
  assert.equal(amountLike('Current value••••Sep 30, 2026'), false);
  assert.equal(amountLike('2026-09-02'), false);
  assert.equal(amountLike('Duplicate of row 1 · skip'), false);
  assert.equal(amountLike('строки 4 · без повторов'), false);
  assert.equal(amountLike('••••'), false);
  assert.equal(amountLike('1 234,56 ₽'), true);
  assert.equal(amountLike('Баланс 86 420 RUB'), true);
  assert.equal(amountLike('95.50 USD'), true);
  assert.equal(amountLike('2 BTC'), true);
});

await test('amountLike replaces the regex that misread a date next to ••••', () => {
  const oldCheck = (t: string) =>
    /\d/.test(t) &&
    !/[0-9]{2}[:./-][0-9]{2}/.test(t.replace(/\d/g, '')) &&
    /\d/.test(t.replace(/20\d\d/g, ''));
  const leaked = 'Стоимость сейчас••••30 сент. 2026 г.';
  assert.equal(oldCheck(leaked), true);
  assert.equal(amountLike(leaked), false);
});

await test('visiblePoint returns the centre of the on-screen part, null off-screen', () => {
  assert.deepEqual(visiblePoint(0, 64, 320, 1359, 320, 800), [160, 432]);
  assert.deepEqual(visiblePoint(-10, -50, 100, 10, 320, 800), [50, 5]);
  assert.equal(visiblePoint(0, -200, 100, -10, 320, 800), null);
  assert.equal(visiblePoint(0, 900, 100, 950, 320, 800), null);
});

await test('lineDeltaMax groups children per visual line, wraps start new lines', () => {
  assert.equal(
    lineDeltaMax([
      [100, 140],
      [102, 142],
      [100, 140],
    ]),
    2,
  );
  assert.equal(
    lineDeltaMax([
      [640, 664],
      [680, 704],
      [720, 744],
    ]),
    0,
  );
  assert.equal(
    lineDeltaMax([
      [100, 140],
      [130, 150],
    ]),
    20,
  );
  assert.equal(lineDeltaMax([]), 0);
});

await test('paintsBox sees only opaque paint, not transparent click layers', () => {
  assert.equal(paintsBox(0, 0, 0, false), false);
  assert.equal(paintsBox(0.5, 0, 0, false), true);
  assert.equal(paintsBox(0, 1, 1, false), true);
  assert.equal(paintsBox(0, 0, 0, true), true);
});

await test('design scales keep em sizes apart and carry the contract 14px gap', () => {
  const scales = designScales(readFileSync('DESIGN.md', 'utf8'));
  assert.ok(scales.fontEm.includes(0.65), String(scales.fontEm));
  assert.ok(!scales.fontSizes.includes(0.65), String(scales.fontSizes));
  assert.ok(scales.spacings.includes(14), String(scales.spacings));
});

await test('page probes embed the corrected helpers and checks', () => {
  assert.ok(fullInvariantsSource.includes('amountLike'));
  assert.ok(fullInvariantsSource.includes('visiblePoint'));
  assert.ok(fullInvariantsSource.includes('el.type'));
  assert.ok(designScanSource.includes('lineDeltaMax'));
  assert.ok(designScanSource.includes('paintsBox'));
  assert.ok(designScanSource.includes('cfg.fontEm'));
});

await test('overlap scan uses the hit stack, not a single top element', () => {
  assert.ok(designScanSource.includes('elementsFromPoint'));
  assert.ok(designScanSource.includes('fixedNear(c) !== fixedNear(t)'));
  assert.ok(designScanSource.includes('scrollIntoView'));
});

await test('walk probe skips background controls while a modal dialog is open', () => {
  const probe = clickableProbe('header > button');
  assert.ok(probe.includes('dialog[open]'));
  assert.ok(probe.includes('dlg.contains(el)'));
});
