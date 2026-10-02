import test from 'node:test';
import assert from 'node:assert/strict';
import { transactions, operationInput } from '../src/records/data.ts';
import { filterTransactions, initialFilters } from '../src/records/filters.ts';
import { accountWord } from '../src/records/copy.ts';
import { demoState } from '../src/model/portfolio.ts';

const records = transactions(demoState);

await test('journal combines selected portfolios and searches without changing fixtures', () => {
  const filtered = filterTransactions(records, 'tradernet,binance', {
    ...initialFilters,
    type: 'buy',
  });
  assert.deepEqual(
    filtered.map((record) => record.id),
    ['btc', 'msft'],
  );
  assert.equal(records.length, 12);
  assert.equal(demoState.buys.length, 3);
});

await test('journal applies inclusive dates, asset and case-insensitive search', () => {
  const filtered = filterTransactions(records, 'all', {
    ...initialFilters,
    asset: 'USD',
    from: '2026-09-12',
    to: '2026-09-14',
    search: 'BANK',
    order: 'oldest',
  });
  assert.deepEqual(
    filtered.map((record) => record.id),
    ['withdraw-sample', 'deposit-sample'],
  );
  assert.equal(
    filterTransactions(records, 'all', { ...initialFilters, from: '2026-10-01', to: '2026-01-01' })
      .length,
    0,
  );
});

await test('editing a hidden transaction does not prefill financial amounts', () => {
  const record = records.at(0);
  assert.ok(record);
  const input = operationInput(record, true);
  assert.equal(input.quantity, '');
  assert.equal(input.price, '');
  assert.equal(input.amount, '');
  assert.equal(input.fee, '');
  assert.equal(input.asset, 'MSFT');
});

await test('account counter declines Russian numerals and stays plain in English', () => {
  assert.equal(accountWord('ru', 1), 'Счёт');
  assert.equal(accountWord('ru', 2), 'Счёта');
  assert.equal(accountWord('ru', 4), 'Счёта');
  assert.equal(accountWord('ru', 5), 'Счетов');
  assert.equal(accountWord('ru', 11), 'Счетов');
  assert.equal(accountWord('ru', 21), 'Счёт');
  assert.equal(accountWord('ru', 112), 'Счетов');
  assert.equal(accountWord('en', 1), 'Accounts');
});
