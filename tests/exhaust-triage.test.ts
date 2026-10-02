import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  amountLeak,
  amountLike,
  lineDeltaMax,
  overlapExempt,
  paintsBox,
  visiblePoint,
} from '../scripts/exhaust/dom-rules.ts';
import { designScales } from '../scripts/exhaust/tokens.ts';
import { fullInvariantsSource } from '../scripts/exhaust/page-checks.ts';
import { designScanSource } from '../scripts/exhaust/page-design.ts';
import { clickableProbe, execSteps } from '../scripts/exhaust/walk-run.ts';
import type { StepAcc, WalkDriver } from '../scripts/exhaust/walk-run.ts';
import { attemptClick } from '../scripts/exhaust/trusted.ts';
import { record } from '../scripts/exhaust/records.ts';
import type { ClickSkip } from '../scripts/exhaust/records.ts';
import { baseEnv } from '../scripts/exhaust/axes.ts';
import { reportChecks, skipReport } from '../scripts/exhaust/reports.ts';

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

await test('amountLeak flags bare digits only inside money slots', () => {
  // Позитивы: голая сумма в денежном слоте и прежние amountLike-случаи везде.
  assert.equal(amountLeak('5000', true), true);
  assert.equal(amountLeak('Итого 42000', true), true);
  assert.equal(amountLeak('1 234,56 ₽', false), true);
  assert.equal(amountLeak('0.05 BTC', false), true);
  // Негативы: голые цифры вне денежного слота — курс («Исторический USD/RUB»),
  // счётчики, проценты и даты остаются легально видимыми при скрытых суммах.
  assert.equal(amountLeak('100', false), false);
  assert.equal(amountLeak('5000', false), false);
  assert.equal(amountLeak('2026-09-02', true), false);
  assert.equal(amountLeak('30 сент. 2026 г.', true), false);
  assert.equal(amountLeak('Sep 30, 2026', true), false);
  assert.equal(amountLeak('4 из 12', true), false);
  assert.equal(amountLeak('3 of 7', true), false);
  assert.equal(amountLeak('42 %', true), false);
  assert.equal(amountLeak('3/7', true), false);
  assert.equal(amountLeak('••••', true), false);
  // Старое поведение (только amountLike) голую цифру в денежном слоте не ловило.
  assert.equal(amountLike('5000'), false);
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

await test('overlap exemption spares only the bottom mobile nav, other fixed layers stay findings', () => {
  const oldRule = (controlFixed: boolean, textFixed: boolean) => controlFixed !== textFixed;
  // Старое правило прятало любой fixed/sticky слой над текстом потока.
  assert.equal(oldRule(true, false), true);
  assert.equal(overlapExempt(true, false, false), false);
  assert.equal(overlapExempt(true, false, true), true);
  assert.equal(overlapExempt(false, true, false), false);
  assert.equal(overlapExempt(true, true, true), false);
  assert.equal(overlapExempt(false, false, false), false);
  assert.ok(designScanSource.includes('overlapExempt'));
  assert.ok(designScanSource.includes('.mobile-links, .more-menu'));
});

await test('overlap scan uses the hit stack, not a single top element', () => {
  assert.ok(designScanSource.includes('elementsFromPoint'));
  assert.ok(designScanSource.includes('scrollIntoView'));
});

await test('walk probe skips background controls while a modal dialog is open', () => {
  const probe = clickableProbe('header > button');
  assert.ok(probe.includes('dialog[open]'));
  assert.ok(probe.includes('dlg.contains(el)'));
});

const clickRecord = record(1, baseEnv, 'overview', { b: 'x', a: 'x', dur: 0 }, 'sig|x', {
  role: 'button',
  name: 'Go',
  tag: 'button',
  trusted: true,
  purpose: 'verify-nav',
});

await test('attemptClick turns unreachable and throwing clicks into counted skips', () => {
  const unreachable = attemptClick('p1', false, () => clickRecord, () => undefined);
  assert.equal(unreachable.clicks.length, 0);
  assert.deepEqual(unreachable.skips, [{ path: 'p1', stage: 'trusted', reason: 'unreachable' }]);
  const threw = attemptClick(
    'p2',
    true,
    () => {
      throw new Error('click refused');
    },
    () => undefined,
  );
  assert.equal(threw.clicks.length, 0);
  assert.deepEqual(threw.skips, [{ path: 'p2', stage: 'trusted', reason: 'click-threw' }]);
  // Уборка после падения обязательна: её ошибка пробрасывается и доказывает вызов.
  assert.throws(
    () =>
      attemptClick(
        'p3',
        true,
        () => {
          throw new Error('click refused');
        },
        () => {
          throw new Error('cleanup-ran');
        },
      ),
    /cleanup-ran/,
  );
  const ok = attemptClick('p4', true, () => clickRecord, () => undefined);
  assert.equal(ok.clicks.length, 1);
  assert.equal(ok.skips.length, 0);
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

await test('skipReport shares reasons and the ratchet fails over the share limit', () => {
  const skips: readonly ClickSkip[] = [
    { path: 'a', stage: 'walk', reason: 'unreachable' },
    { path: 'b', stage: 'walk', reason: 'unreachable' },
    { path: 'c', stage: 'trusted', reason: 'click-threw' },
  ];
  const report = skipReport(skips, 10);
  assert.equal(report.skipped, 3);
  assert.equal(report.share, 0.3);
  assert.equal(report.limit, 0.2);
  assert.deepEqual(report.reasons, { 'walk:unreachable': 2, 'trusted:click-threw': 1 });
  const base = {
    element: { missing: [], stale: [], ok: true },
    code: { missing: [], stale: [], ok: true },
    errors: [],
  };
  assert.throws(() => reportChecks({ ...base, skips: report }), /skipped clicks/);
  assert.doesNotThrow(() => reportChecks({ ...base, skips: skipReport(skips.slice(0, 1), 10) }));
});
