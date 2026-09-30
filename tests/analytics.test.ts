import assert from 'node:assert/strict';
import test from 'node:test';
import { periodTrades } from '../src/analytics/trade-data.ts';

await test('trade periods select dated examples on their month, quarter and year boundaries', () => {
  const month = periodTrades('month').map((trade) => trade.day);
  const quarter = periodTrades('quarter').map((trade) => trade.day);
  const year = periodTrades('year').map((trade) => trade.day);
  assert.equal(month.length, 4);
  assert.ok(month.includes('2026-09-03') && month.includes('2026-09-23'));
  assert.equal(month.includes('2026-08-21'), false);
  assert.equal(quarter.length, 8);
  assert.ok(quarter.includes('2026-07-09') && quarter.includes('2026-09-23'));
  assert.equal(quarter.includes('2026-05-14'), false);
  assert.equal(year.length, 12);
  assert.ok(year.includes('2026-01-12') && year.includes('2026-09-23'));
});
