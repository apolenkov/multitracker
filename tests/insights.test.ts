import assert from 'node:assert/strict';
import test from 'node:test';
import { attribution, demoState, selectedBuys, totals } from '../src/model/portfolio.ts';

await test('actual RUB and USD results reconcile price, exchange, interaction and fees', () => {
  const rub = attribution(demoState.buys, 'RUB');
  assert.deepEqual(rub, { price: 6900, fx: 77400, interaction: 2700, fees: -580 });
  const usd = attribution(demoState.buys, 'USD');
  assert.deepEqual(usd, { price: 80, fx: 0, interaction: 0, fees: -6 });
  assert.equal(
    Object.values(rub).reduce((sum, amount) => sum + amount, 0),
    86420,
  );
  assert.equal(
    Object.values(usd).reduce((sum, amount) => sum + amount, 0),
    74,
  );
});

await test('loss-making asset and each portfolio selection reconcile without changing buys', () => {
  const original = JSON.stringify(demoState);
  ['all', 'tradernet', 'binance,bybit', 'bybit', 'unknown'].forEach((selection) => {
    const buys = selectedBuys(demoState, selection);
    (['RUB', 'USD'] as const).forEach((currency) => {
      const sum = Object.values(attribution(buys, currency)).reduce(
        (total, value) => total + value,
        0,
      );
      assert.ok(Math.abs(sum - totals(buys, currency).profit) < 1e-8);
    });
  });
  assert.equal(JSON.stringify(demoState), original);
  assert.deepEqual(attribution([], 'RUB'), { price: 0, fx: 0, interaction: 0, fees: 0 });
});
