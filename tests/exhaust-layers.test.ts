import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { baseEnv } from '../scripts/exhaust/axes.ts';
import { createRunLog, record, shotName } from '../scripts/exhaust/records.ts';
import {
  buildRegistry,
  sectionCoverage,
  elementMarkdown,
  coveragePercent,
} from '../scripts/exhaust/registry.ts';
import { codeMarkdown, fileReports, newlyCovered } from '../scripts/exhaust/coverage.ts';
import { asFinding, parseEnumerate, parseSweepRecord } from '../scripts/exhaust/page-rows.ts';
import type { Enumerated, SweepHit } from '../scripts/exhaust/page-rows.ts';
import { clickedSignatures, hitClicks, joinSeen } from '../scripts/exhaust/journal.ts';
import { parseLedger, checkLedger } from '../scripts/exhaust/ledger.ts';
import type { FunctionCoverage, Range, ScriptCoverage } from '../scripts/exhaust/cdp.ts';

const range = (start: number, end: number, count: number): Range => ({
  startOffset: start,
  endOffset: end,
  count,
});
const fn = (name: string, ranges: readonly Range[]): FunctionCoverage => ({
  functionName: name,
  ranges,
});
const script = (functions: readonly FunctionCoverage[]): ScriptCoverage => ({
  scriptId: '1',
  url: 'http://x/assets/index-abc.js',
  functions,
});
const sweepHit = (path: string, skipped = ''): SweepHit => ({
  path,
  before: 'a',
  after: 'b',
  duration: 1,
  dialogs: [],
  errors: [],
  warnings: [],
  skipped,
  meta: null,
  findings: [],
  purpose: 'sweep',
  opened: '',
});
const enumerated = (path: string): Enumerated => ({
  path,
  role: 'button',
  name: 'Go',
  tag: 'button',
  visible: true,
  disabled: false,
  skip: '',
});

const tmpRoot = `docs/audits/tmp-exhaust-test-${process.pid}`;
const rmTmp = () => execFileSync('rm', ['-rf', tmpRoot]);
const catTmp = (name: string) =>
  execFileSync('cat', [`${tmpRoot}/stamp-exhaust/${process.pid}/${name}`], { encoding: 'utf8' });

const sampleClick = () =>
  record(1, baseEnv, 'overview', { b: 'h1', a: 'h2', dur: 3 }, 'sig|1', {
    role: 'button',
    name: 'Save',
    tag: 'button',
    trusted: false,
    purpose: 'sweep',
  });

await test('run log appends click records as jsonl', () => {
  rmTmp();
  const log = createRunLog(tmpRoot, 'stamp', String(process.pid));
  const rec = sampleClick();
  assert.equal(rec.seq, 1);
  assert.equal(rec.stateBefore, 'h1');
  assert.equal(rec.duration, 3);
  log.appendClicks([rec, { ...rec, seq: 2 }]);
  const lines = catTmp('clicks.jsonl').trim().split('\n');
  assert.equal(lines.length, 2);
  const parsed: unknown = JSON.parse(lines.at(0) ?? '');
  assert.ok(parsed !== null && typeof parsed === 'object' && 'seq' in parsed);
  rmTmp();
});

await test('run log saves artifacts and rejects unsafe names', () => {
  rmTmp();
  const log = createRunLog(tmpRoot, 'stamp', String(process.pid));
  log.saveJson('summary.json', { clicks: 1 });
  log.saveText('notes.txt', 'hello');
  const summary: unknown = JSON.parse(catTmp('summary.json'));
  assert.deepEqual(summary, { clicks: 1 });
  assert.equal(catTmp('notes.txt'), 'hello');
  assert.throws(() => log.saveText('../evil', 'x'));
  assert.equal(shotName('ab:cd', '-full'), 'shots/ab_cd-full.png');
  rmTmp();
});

await test('registry marks clicked signatures and explains the rest', () => {
  const entries = buildRegistry(
    [
      {
        route: 'r',
        role: 'button',
        name: 'Go',
        tag: 'button',
        path: 'html > body > button',
        visible: true,
        disabled: false,
        skip: '',
      },
      {
        route: 'r',
        role: 'button',
        name: 'Nope',
        tag: 'button',
        path: 'html > body > dialog#d > button',
        visible: true,
        disabled: true,
        skip: 'disabled',
      },
      {
        route: 'r',
        role: 'link',
        name: 'More',
        tag: 'a',
        path: 'html > body > details > a',
        visible: false,
        disabled: false,
        skip: 'closed-disclosure',
      },
    ],
    new Set(['r|-|button|go|html > body > button']),
  );
  assert.equal(entries.length, 3);
  const clicked = entries.filter((entry) => entry.clicked);
  assert.equal(clicked.length, 1);
  const reasons = entries.filter((entry) => !entry.clicked).map((entry) => entry.reason);
  assert.ok(reasons.includes('disabled'));
  assert.ok(reasons.some((reason) => reason.includes('closed details')));
  const sections = sectionCoverage(entries);
  assert.equal(sections.length, 1);
  assert.equal(sections.at(0)?.seen, 3);
  assert.equal(sections.at(0)?.clicked, 1);
  assert.equal(coveragePercent(1, 3), 33);
  const md = elementMarkdown(sections, entries);
  assert.ok(md.includes('| r | 3 | 1 | 33% |'));
});

await test('file reports map bundle functions back to src files', () => {
  const map = JSON.stringify({ version: 3, sources: ['../src/a.ts'], mappings: 'AAAA,IAAI;AACJ' });
  const js = 'const a = 1;\nconst b = 2;\n';
  const sources = [{ url: 'index-abc.js', js, map }];
  const reports = fileReports(
    [script([fn('first', [range(0, 5, 1)]), fn('second', [range(13, 20, 0), range(14, 18, 0)])])],
    sources,
  );
  assert.equal(reports.length, 1);
  const only = reports.at(0);
  assert.equal(only?.file, 'src/a.ts');
  assert.equal(only.functionsTotal, 2);
  assert.equal(only.functionsCovered, 1);
  assert.deepEqual(only.uncoveredFunctions, ['second@2']);
  assert.equal(only.branchesTotal, 1);
  assert.equal(only.branchesCovered, 0);
  const next = fileReports(
    [script([fn('first', [range(0, 5, 2)]), fn('second', [range(13, 20, 1)])])],
    sources,
  );
  assert.deepEqual(newlyCovered(reports, next), ['src/a.ts|second@2']);
});

await test('enumerate and sweep rows parse to typed rows, junk is dropped', () => {
  const items = parseEnumerate({
    items: [
      ['html > body > button', 'button', 'Go', 'button', '', true, false, 'none', 1, 2, 30, 10, ''],
      ['broken'],
      'junk',
    ],
  });
  assert.equal(items.length, 1);
  assert.equal(items.at(0)?.name, 'Go');
  const hit = parseSweepRecord({
    p: 'html > body > button',
    b: 'h1',
    a: 'h2',
    dur: 4,
    dlg: ['d'],
    err: ['boom'],
  });
  assert.ok(hit !== null && hit.before === 'h1' && hit.after === 'h2');
  assert.deepEqual(hit.dialogs, ['d']);
  assert.deepEqual(hit.errors, ['boom']);
  assert.equal(parseSweepRecord({ p: 'x', skip: 'disabled', b: '', a: '' })?.skipped, 'disabled');
  assert.equal(parseSweepRecord('junk'), null);
});

await test('code markdown totals functions and branches', () => {
  const md = codeMarkdown([
    {
      file: 'src/a.ts',
      functionsCovered: 1,
      functionsTotal: 2,
      branchesCovered: 0,
      branchesTotal: 1,
      uncoveredFunctions: ['f@1'],
    },
    {
      file: 'src/b.ts',
      functionsCovered: 2,
      functionsTotal: 2,
      branchesCovered: 3,
      branchesTotal: 3,
      uncoveredFunctions: [],
    },
  ]);
  assert.ok(md.includes('Total: 3/4 functions (75%), 3/4 branches (75%)'));
  assert.ok(md.includes('- src/a.ts|f@1'));
});

await test('joinSeen merges enumerate info with sweep skips by path', () => {
  const seen = joinSeen('r', [enumerated('p1')], [sweepHit('p1'), sweepHit('p2', 'disabled')]);
  assert.equal(seen.length, 2);
  assert.equal(seen.at(0)?.name, 'Go');
  assert.equal(seen.at(0)?.skip, '');
  assert.equal(seen.at(1)?.skip, 'disabled');
  const sigs = clickedSignatures(seen);
  assert.deepEqual(sigs, ['r|-|button|go|p1']);
  const clicks = hitClicks('r', baseEnv, 10, seen, [sweepHit('p1')]);
  assert.equal(clicks.length, 1);
  assert.equal(clicks.at(0)?.seq, 10);
  assert.equal(clicks.at(0)?.signature, sigs.at(0));
  assert.equal(clicks.at(0)?.trusted, false);
});

await test('asFinding maps invariant rows and drops junk', () => {
  assert.deepEqual(asFinding({ rule: 'x', sel: 's', expected: 'e', actual: 'a' }), {
    rule: 'x',
    selector: 's',
    expected: 'e',
    actual: 'a',
  });
  assert.equal(asFinding({ rule: 'x' }), null);
});

await test('code ledger reuses the ratchet: unknown functions fail, fixed ones shrink', () => {
  const ledger = parseLedger(
    JSON.stringify({
      version: 1,
      exceptions: [{ signature: 'src/a.ts|dead@9', reason: 'not reachable' }],
    }),
  );
  assert.equal(checkLedger(['src/a.ts|dead@9'], ledger).ok, true);
  assert.equal(checkLedger(['src/a.ts|dead@9', 'src/a.ts|new@1'], ledger).ok, false);
  assert.equal(checkLedger([], ledger).ok, false);
});
