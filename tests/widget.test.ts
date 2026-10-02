import assert from 'node:assert/strict';
import test from 'node:test';

await test('widget snapshot uses locale grouping and decimal separators', async () => {
  const { widgetNumber } = await import('../src/demo/widget-format.ts');
  assert.equal(widgetNumber('en', 12480), '12,480');
  assert.match(widgetNumber('ru', 12480), /^12\s480$/);
  assert.equal(widgetNumber('ru', 1.46), '1,46');
  assert.equal(widgetNumber('en', 1.46), '1.46');
  assert.equal(widgetNumber('ru', 2.1, true), '+2,1');
  assert.equal(widgetNumber('en', -0.8, true), '-0.8');
});
