import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditVerdict } from '../scripts/audit-verdict.ts';

const report = (high: number, critical: number) =>
  JSON.stringify({
    metadata: { vulnerabilities: { info: 0, low: 2, moderate: 1, high, critical, total: 3 } },
  });

await test('audit verdict: high or critical fails, lower levels pass', () => {
  assert.equal(auditVerdict(report(0, 0)), 'ok');
  assert.equal(auditVerdict(report(1, 0)), 'vulnerable');
  assert.equal(auditVerdict(report(0, 1)), 'vulnerable');
});

await test('audit verdict: an answer without a vulnerability summary is retried', () => {
  assert.equal(
    auditVerdict(JSON.stringify({ message: 'request failed', error: { code: 'ECONNRESET' } })),
    'retry',
  );
  assert.equal(auditVerdict(''), 'retry');
  assert.equal(auditVerdict('npm error audit endpoint returned an error'), 'retry');
});
