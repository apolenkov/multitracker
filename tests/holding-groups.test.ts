import assert from 'node:assert/strict';
import test from 'node:test';
import { groupHoldings, holdingClassName } from '../src/holding-groups.ts';

const rows = [
  { symbol: 'USD', value: 0 },
  { symbol: 'MSFT', value: 300 },
  { symbol: 'BTC', value: 600 },
  { symbol: 'RUB', value: 0 },
  { symbol: 'TWT', value: 100 },
] as const;

await test('группирует по классу, считает сумму и долю, скрывает пустые группы', () => {
  const groups = groupHoldings(
    rows,
    (row) => row.symbol,
    (row) => row.value,
    1000,
  );
  assert.deepEqual(
    groups.map((group) => [
      group.kind,
      group.rows.map((row) => row.symbol),
      group.value,
      group.share,
    ]),
    [
      ['crypto', ['BTC', 'TWT'], 700, 70],
      ['stock', ['MSFT'], 300, 30],
      ['cash', ['USD', 'RUB'], 0, 0],
    ],
  );
});

await test('нулевая общая стоимость даёт нулевую долю, а не деление на ноль', () => {
  const groups = groupHoldings(
    [{ symbol: 'RUB', value: 0 }],
    (row) => row.symbol,
    (row) => row.value,
    0,
  );
  assert.deepEqual(
    groups.map((group) => group.share),
    [0],
  );
  assert.equal(holdingClassName('cash', 'ru'), 'Деньги');
  assert.equal(holdingClassName('stock', 'en'), 'Stocks');
});
