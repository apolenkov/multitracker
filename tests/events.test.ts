import assert from 'node:assert/strict';
import test from 'node:test';
import { validReminder } from '../src/events/reminder.ts';

await test('reminder accepts whole minutes within one week and rejects unusable drafts', () => {
  ['', ' ', '0', '-1', '1.5', 'Infinity', '10081', '1e2'].forEach((value) => {
    assert.equal(validReminder(value), false, value);
  });
  ['1', '15', '10080'].forEach((value) => {
    assert.equal(validReminder(value), true, value);
  });
});

await test('widget snapshot uses locale grouping and decimal separators', async () => {
  const { widgetNumber } = await import('../src/events/widget-format.ts');
  assert.equal(widgetNumber('en', 12480), '12,480');
  assert.match(widgetNumber('ru', 12480), /^12\s480$/);
  assert.equal(widgetNumber('ru', 1.46), '1,46');
  assert.equal(widgetNumber('en', 1.46), '1.46');
  assert.equal(widgetNumber('ru', 2.1, true), '+2,1');
  assert.equal(widgetNumber('en', -0.8, true), '-0.8');
});
