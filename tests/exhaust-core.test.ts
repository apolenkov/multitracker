import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextRandom, randoms, shuffle, pick } from '../scripts/exhaust/prng.ts';
import {
  axisOptions,
  axisOrder,
  axisValue,
  axisValues,
  baseEnv,
  cartesian,
  coveringArray,
  layoutGrid,
  partBAxes,
  rowPairs,
  uncoveredPairs,
} from '../scripts/exhaust/axes.ts';
import {
  elementSignature,
  normalizeName,
  stripIndices,
  dialogOf,
} from '../scripts/exhaust/signature.ts';
import { checkLedger, parseLedger } from '../scripts/exhaust/ledger.ts';
import { codeExceptions, elementExceptions } from '../scripts/exhaust/baseline.ts';
import { splitChunks, ddmin } from '../scripts/exhaust/shrink.ts';
import { contrastRatio, luminance, over, parseColor } from '../scripts/exhaust/contrast.ts';
import { decodeMappings, mapPosition, parseMap, positionOf } from '../scripts/exhaust/sourcemap.ts';
import { designScales, tokenNames, cssRadii } from '../scripts/exhaust/tokens.ts';
import { asArray, asText, isRecord } from '../scripts/exhaust/guards.ts';
import { formCases, primaryField, valueFor } from '../scripts/exhaust/form-cases.ts';
import { walkDepth, walkSeeds, walkSequences } from '../scripts/exhaust/walk-plan.ts';
import { axisTable } from '../scripts/exhaust/axis-pass.ts';
import { readFileSync } from 'node:fs';

await test('prng is deterministic and covers the unit interval', () => {
  assert.equal(nextRandom(42).value, nextRandom(42).value);
  assert.notEqual(nextRandom(42).value, nextRandom(43).value);
  const values = randoms(7, 500);
  assert.ok(values.every((value) => value >= 0 && value < 1));
  assert.ok(new Set(values).size > 490, 'sequence should not repeat');
  assert.deepEqual(randoms(7, 3), randoms(7, 3));
  assert.equal(pick(['a', 'b', 'c'], 0.99), 'c');
  assert.equal(shuffle([1, 2, 3, 4], 9).toSorted().join(','), '1,2,3,4');
});

await test('covering array covers every pair of axis values', () => {
  const rows = coveringArray(axisValues);
  assert.ok(rows.length >= 12 && rows.length <= 40, `size ${rows.length}`);
  assert.deepEqual(uncoveredPairs(rows, axisValues), []);
  assert.deepEqual(coveringArray(axisValues), rows, 'deterministic');
  assert.ok(
    rows.every((row) =>
      axisOrder.every((axis) => axisOptions(axisValues, axis).includes(axisValue(row, axis))),
    ),
  );
});

await test('cartesian of a narrowed axis set is the exact product', () => {
  const rows = cartesian({ ...axisValues, language: ['ru'], width: ['375', '768'] });
  assert.equal(rows.length, 2 * 3 * 2 * 2 * 2 * 2 * 2 * 5 * 2);
  assert.ok(rows.every((row) => row.language === 'ru'));
  assert.equal(new Set(rows.map((row) => row.width)).size, 2);
});

await test('decodeMappings keeps one span list per generated line', () => {
  const lines = decodeMappings('AAAA;AACA');
  assert.equal(lines.length, 2);
  assert.equal(lines.at(1)?.length, 1);
});

await test('cartesian produces the full product for the layout grid', () => {
  const grid = layoutGrid();
  assert.equal(grid.length, 4 * 3 * 2);
  assert.ok(grid.every((row) => row.language === 'ru' && row.hideAmounts === 'off'));
  assert.equal(new Set(grid.map((row) => row.width)).size, 4);
});

await test('signature normalizes names, strips indices and keeps context', () => {
  assert.equal(normalizeName('  Купить  BTC  12 '), 'купить btc #');
  assert.equal(
    stripIndices('html > body > div:nth-of-type(2) > button:nth-of-type(1)'),
    'html > body > div > button',
  );
  assert.equal(dialogOf('html > body > dialog#buy-dialog > form > button'), 'buy-dialog');
  const sig = elementSignature({
    route: 'overview',
    dialog: 'buy-dialog',
    role: 'button',
    name: 'Сохранить 3',
    path: 'html > body > dialog#buy-dialog:nth-of-type(2) > form > button',
  });
  assert.equal(
    sig,
    'overview|buy-dialog|button|сохранить #|html > body > dialog#buy-dialog > form > button',
  );
  assert.equal(
    elementSignature({ route: 'r', dialog: '-', role: 'a', name: 'x', path: 'p' }),
    elementSignature({ route: 'r', dialog: '-', role: 'a', name: 'X', path: 'p' }),
  );
});

await test('ledger ratchet: uncovered must be listed, covered entries must shrink away', () => {
  const ledger = parseLedger(
    JSON.stringify({ version: 1, exceptions: [{ signature: 'a|b', reason: 'disabled' }] }),
  );
  assert.equal(checkLedger(['a|b'], ledger).ok, true);
  assert.deepEqual(checkLedger(['a|b', 'x|y'], ledger).missing, ['x|y']);
  assert.deepEqual(checkLedger([], ledger).stale, ['a|b']);
  assert.equal(parseLedger('{"version":2,"exceptions":[]}').version, 2);
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

await test('ddmin shrinks a failing sequence to its minimal repro', async () => {
  const reproduces = (items: readonly number[]) =>
    Promise.resolve(items.includes(3) && items.includes(9));
  assert.deepEqual(await ddmin([1, 2, 3, 4, 9, 8], reproduces), [3, 9]);
  assert.deepEqual(await ddmin([1, 2], reproduces), [1, 2]);
  assert.deepEqual(splitChunks([1, 2, 3, 4, 5], 2), [
    [1, 2, 3],
    [4, 5],
  ]);
  assert.deepEqual(splitChunks([1], 4), [[1]]);
});

await test('contrast math matches published WCAG ratios', () => {
  const black = parseColor('#000000');
  const white = parseColor('#ffffff');
  assert.ok(black && white);
  assert.equal(Math.round(contrastRatio(black, white) * 100) / 100, 21);
  const green = parseColor('rgb(29 105 59)');
  assert.ok(green);
  assert.ok(contrastRatio(green, white) < 21 && contrastRatio(green, white) > 3);
  const half = parseColor('rgb(0 0 0 / 50%)');
  assert.equal(half?.a, 0.5);
  assert.deepEqual(over(half, white).r, 128);
  assert.equal(luminance(white), 1);
  assert.equal(parseColor('not-a-color'), null);
});

await test('source map decode maps generated offsets back to sources', () => {
  const map = parseMap({
    version: 3,
    sources: ['../src/a.ts'],
    mappings: 'AAAA,IAAI;AACJ',
  });
  assert.ok(map);
  assert.equal(map.lines.length, 2);
  const first = mapPosition(map, 0, 0);
  assert.ok(first);
  assert.equal(first.source, '../src/a.ts');
  assert.equal(first.line, 1);
  assert.equal(mapPosition(map, 99, 0), null);
  assert.deepEqual(positionOf('ab\ncd\n', 3), { line: 1, column: 0 });
  assert.equal(parseMap({ nope: 1 }), null);
});

await test('rowPairs enumerates each axis pair exactly once', () => {
  assert.equal(rowPairs(baseEnv).length, (axisOrder.length * (axisOrder.length - 1)) / 2);
});

await test('guards coerce unknown values without throwing', () => {
  assert.equal(asText('a'), 'a');
  assert.equal(asText(7), '7');
  assert.equal(asText(true), 'true');
  assert.equal(asText({}), '');
  assert.equal(asText(undefined), '');
  assert.ok(isRecord({ a: 1 }) && !isRecord(null) && !isRecord([1]));
  assert.deepEqual(asArray([1, 'x']), [1, 'x']);
  assert.deepEqual(asArray('nope'), []);
});

await test('design scales come from DESIGN.md and token names from appearance.css', () => {
  const design = readFileSync('DESIGN.md', 'utf8');
  const scales = designScales(design);
  assert.ok(
    scales.fontSizes.includes(16) && scales.fontSizes.includes(28),
    String(scales.fontSizes),
  );
  assert.ok(scales.fontWeights.includes(400) && scales.fontWeights.includes(700));
  [8, 12, 16, 20, 24, 28, 32].forEach((step) =>
    assert.ok(scales.spacings.includes(step), `${step}`),
  );
  assert.ok(scales.radii.includes('8px') && scales.radii.includes('12px'));
  const css = [
    readFileSync('src/appearance.css', 'utf8'),
    readFileSync('src/charts.css', 'utf8'),
    readFileSync('src/base.css', 'utf8'),
  ].join('\n');
  assert.ok(cssRadii(css).includes('50%'));
  const names = tokenNames(readFileSync('src/appearance.css', 'utf8'));
  assert.ok(names.includes('--ink') && names.includes('--canvas') && names.includes('--green'));
  assert.ok(!names.includes('--select-chevron'));
});

await test('form cases cover 10 types times 7 value classes from schema', () => {
  const cases = formCases();
  assert.equal(cases.length, 70);
  assert.equal(new Set(cases.map((c) => c.type)).size, 10);
  assert.equal(new Set(cases.map((c) => c.valueClass)).size, 7);
  assert.ok(cases.every((c) => primaryField(c.type) !== undefined));
  assert.equal(valueFor('empty'), '');
});

await test('walk sequences are deterministic with depth from seeds', () => {
  const paths = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const first = walkSequences(paths, walkSeeds[0], 3, walkDepth);
  assert.equal(first.length, 3);
  assert.ok(first.every((seq) => seq.length === walkDepth));
  assert.deepEqual(first, walkSequences(paths, walkSeeds[0], 3, walkDepth));
});

await test('part b covering array and axis table record every tuple', () => {
  const rows = coveringArray(partBAxes());
  assert.deepEqual(uncoveredPairs(rows, partBAxes()), []);
  const table = axisTable(rows);
  assert.ok(table.includes(`rows: ${rows.length}`));
  assert.equal(table.split('\n').filter((l) => /^\d+\. /.test(l)).length, rows.length);
});
