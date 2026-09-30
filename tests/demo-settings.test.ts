import assert from 'node:assert/strict';
import test from 'node:test';
import { validExportDates } from '../src/demo/settings-validation.ts';

await test('export sample rejects missing, impossible, reversed and future dates', () => {
  assert.equal(validExportDates('2026-01-01', '2026-09-30'), true);
  assert.equal(validExportDates('2024-02-29', '2024-02-29'), true);
  assert.equal(validExportDates('', '2026-09-30'), false);
  assert.equal(validExportDates('2026-02-29', '2026-09-30'), false);
  assert.equal(validExportDates('2026-09-30', '2026-01-01'), false);
  assert.equal(validExportDates('2026-01-01', '2026-10-01'), false);
  assert.equal(validExportDates('2026-1-1', '2026-09-30'), false);
});
