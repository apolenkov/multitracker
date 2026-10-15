import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileReports } from '../scripts/exhaust/coverage.ts';
import { decodeMappings, parseMap } from '../scripts/exhaust/sourcemap.ts';

// Сегмент 'SAASA': колонка 9, источник 0, строка 0, колонка исходника 9, имя 0.
const map = JSON.stringify({
  version: 3,
  sources: ['../src/a.tsx'],
  names: ['EmptyOverview'],
  mappings: 'AAAA,SAASA',
});
const bundle = (min: string, body = '(e){}') => ({
  url: 'index-abc.js',
  js: `function ${min}${body}\n`,
  map,
});
const coverage = (min: string, count: number) => [
  {
    scriptId: '1',
    url: 'http://x/assets/index-abc.js',
    functions: [{ functionName: min, ranges: [{ startOffset: 0, endOffset: 20, count }] }],
  },
];

await test('source map names are decoded and carried across segments', () => {
  assert.equal(decodeMappings('AAAA,SAASA').at(0)?.at(1)?.name, 0);
  assert.equal(decodeMappings('AAAA').at(0)?.at(0)?.name, -1);
  assert.deepEqual(parseMap(JSON.parse(map))?.names, ['EmptyOverview']);
  // Индекс имени — дельта с переносом: через сегмент без имени, через строки и вниз.
  const names = decodeMappings('AAAAA,CAAA;AAAAC;AAAAD').map((line) => line.map((s) => s.name));
  assert.deepEqual(names, [[0, -1], [1], [0]]);
});

const custom = (js: string, mappings: string, names: readonly string[]) => ({
  url: 'index-abc.js',
  js,
  map: JSON.stringify({ version: 3, sources: ['../src/a.tsx'], names, mappings }),
});
const start = (min: string, startOffset: number) => [
  {
    scriptId: '1',
    url: 'http://x/assets/index-abc.js',
    functions: [{ functionName: min, ranges: [{ startOffset, endOffset: 30, count: 0 }] }],
  },
];

await test('an arrow takes its name from the left, not from a same-named parameter', () => {
  // `n=(n)=>{}`: старт V8 на «(», слева имя функции, справа параметр с тем же коротким именем.
  const source = custom('const n=(n)=>{}\n', 'AAAA,MAAMA,GAAGC', ['handler', 'event']);
  const reports = fileReports(start('n', 8), [source]);
  assert.deepEqual(reports.at(0)?.uncoveredFunctions, ['handler@1']);
});

await test('a declaration takes its name from the right of `function`', () => {
  // Слева от старта есть одноимённый токен другой привязки и он ближе: имя берём справа.
  const source = custom('x=n;function n(e){}\n', 'EAAEA,WAAWC', ['other', 'real']);
  const reports = fileReports(start('n', 4), [source]);
  assert.deepEqual(reports.at(0)?.uncoveredFunctions, ['real@1']);
});

await test('code ledger keys use the source name, so a renamed bundle keeps the key', () => {
  const keys = (min: string) =>
    fileReports(coverage(min, 0), [bundle(min)]).flatMap((report) =>
      report.uncoveredFunctions.map((name) => `${report.file}|${name}`),
    );
  assert.deepEqual(keys('Su'), ['src/a.tsx|EmptyOverview@1']);
  assert.deepEqual(keys('Tc'), keys('Su'));
});

await test('a function without a named segment keeps the bundle name', () => {
  const plain = JSON.stringify({ version: 3, sources: ['../src/a.tsx'], mappings: 'AAAA' });
  const reports = fileReports(coverage('Su', 0), [{ ...bundle('Su'), map: plain }]);
  assert.deepEqual(reports.at(0)?.uncoveredFunctions, ['Su@1']);
});

await test('a longer identifier at the same column is not taken for the minified name', () => {
  const reports = fileReports(coverage('Su', 0), [bundle('SuMore')]);
  assert.deepEqual(reports.at(0)?.uncoveredFunctions, ['Su@1']);
});
