import assert from 'node:assert/strict';
import test from 'node:test';
import {
  demoState,
  attribution,
  selectedBuys,
  summarize,
  totals,
  validateBuy,
  validateName,
} from '../src/model/portfolio.ts';

const valid = {
  portfolioId: 'tradernet',
  asset: 'MSFT',
  quantity: '2',
  price: '500',
  fee: '5',
  fx: '100',
  date: '2026-09-01',
} as const;

await test('historical RUB gain can coexist with a USD loss for the same position', () => {
  const buys = selectedBuys(demoState, 'tradernet');
  assert.equal(totals(buys, 'RUB').basis, 100000);
  assert.equal(totals(buys, 'RUB').value, 108000);
  assert.equal(totals(buys, 'RUB').profit, 8000);
  assert.equal(totals(buys, 'USD').profit, -100);
  assert.deepEqual(attribution(buys, 'RUB'), {
    price: -10000,
    fx: 20000,
    interaction: -2000,
    fees: 0,
  });
});

await test('historical fee-inclusive cost is aggregated without mutating frozen fixtures', () => {
  const buy = Object.freeze({
    id: 'example',
    portfolioId: 'sample',
    asset: 'MSFT' as const,
    quantity: 2,
    price: 500,
    fee: 5,
    fx: 100,
    date: '2026-01-01',
  });
  const buys = Object.freeze([buy]);
  assert.deepEqual(totals(buys, 'RUB'), {
    value: 108000,
    basis: 100500,
    profit: 7500,
    percentage: (7500 / 100500) * 100,
  });
  assert.equal(totals(buys, 'USD').basis, 1005);
  assert.equal(buys[0]?.fee, 5);
  assert.deepEqual(totals([], 'RUB'), { value: 0, basis: 0, profit: 0, percentage: null });
});

await test('portfolio filter aggregates actual purchases and excludes other portfolios', () => {
  assert.equal(summarize(demoState, 'tradernet', 'USD').value, 900);
  assert.equal(summarize(demoState, 'all', 'USD').value, 3440);
  assert.equal(summarize(demoState, 'tradernet', 'RUB').basis, 100000);
});

await test('numeric boundaries reject blanks, nonfinite, negative, zero and oversized purchases', () => {
  const invalid = ['', ' ', '0', '-1', 'NaN', 'Infinity', '1000000000000'];
  invalid.forEach((quantity) =>
    assert.equal(validateBuy({ ...valid, quantity }).quantity, 'positive'),
  );
  ['price', 'fx'].forEach((field) =>
    invalid.forEach((value) =>
      assert.ok(Object.keys(validateBuy({ ...valid, [field]: value })).length > 0),
    ),
  );
  ['', '-1', 'NaN', 'Infinity', '1000000000000'].forEach((fee) =>
    assert.equal(validateBuy({ ...valid, fee }).fee, 'fee'),
  );
  assert.deepEqual(validateBuy({ ...valid, fee: '0' }), {});
});

await test('decimal input accepts comma or dot while enforcing syntax and total limits', () => {
  const fields = ['quantity', 'price', 'fee', 'fx'] as const;
  fields.forEach((field) =>
    ['0,02', '0.02', ' 0,02 '].forEach((value) =>
      assert.deepEqual(validateBuy({ ...valid, [field]: value }), {}),
    ),
  );
  const malformed = ['0x10', '0b10', '0o10', '1e2', '+1', '-0', '1,2.3', '1..2', '1,,2', '1 2'];
  fields.forEach((field) =>
    malformed.forEach((value) =>
      assert.ok(Object.keys(validateBuy({ ...valid, [field]: value })).length > 0),
    ),
  );
  assert.deepEqual(
    validateBuy({ ...valid, quantity: '1000,0', price: '1000000,0', fee: '0,0', fx: '1000,0' }),
    {},
  );
  [
    { quantity: '1000,01', price: '1000000', fee: '0', fx: '1' },
    { quantity: '1000', price: '1000000,01', fee: '0', fx: '1' },
    { quantity: '1000', price: '1000000', fee: '0,01', fx: '1' },
    { quantity: '1000', price: '1000000', fee: '0', fx: '1000,01' },
  ].forEach((values) => assert.equal(validateBuy({ ...valid, ...values }).price, 'total'));
});

await test('invalid names, dates and unknown assets cannot reach the model', () => {
  assert.equal(validateName('  '), 'name');
  assert.equal(validateName('x'.repeat(81)), 'name');
  ['2026-10-01', '2026-02-30', '', '1999-01-01'].forEach((date) =>
    assert.equal(validateBuy({ ...valid, date }).date, 'date'),
  );
  assert.equal(validateBuy({ ...valid, asset: 'UNKNOWN' }).asset, 'asset');
});

await test('CSV selection includes each named portfolio once and ignores unknown IDs', () => {
  assert.equal(summarize(demoState, 'tradernet,binance,tradernet', 'USD').value, 3300);
  assert.equal(summarize(demoState, ' bybit , unknown ', 'RUB').value, 16800);
  assert.equal(summarize(demoState, '', 'USD').value, 0);
});
