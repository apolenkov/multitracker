import assert from 'node:assert/strict';
import { test } from 'node:test';
import { demoState } from '../src/model/portfolio.ts';
import { initialOperation, validateOperation } from '../src/forms/operations.ts';

await test('a multi-portfolio selection starts with one valid portfolio', () => {
  assert.equal(initialOperation(demoState, 'binance,bybit').portfolioId, 'binance');
  assert.equal(initialOperation(demoState, 'all').portfolioId, 'tradernet');
});

await test('transfer cannot target its source account', () => {
  const input = {
    ...initialOperation(demoState, 'binance'),
    type: 'transfer' as const,
    amount: '12',
    targetPortfolio: 'binance',
    targetAccount: 'binance-main',
  };
  assert.equal(validateOperation(input, demoState).targetAccount, 'destination');
});

await test('cash operations reject invalid sums, dates and portfolios', () => {
  const input = {
    ...initialOperation(demoState, 'binance'),
    type: 'deposit' as const,
    amount: '-1',
    date: '2026-02-30',
    portfolioId: 'unknown',
  };
  const errors = validateOperation(input, demoState);
  assert.equal(errors.amount, 'positive');
  assert.equal(errors.date, 'date');
  assert.equal(errors.portfolioId, 'portfolio');
});

await test('exchange currencies must differ', () => {
  const input = {
    ...initialOperation(demoState, 'binance'),
    type: 'exchange' as const,
    amount: '10',
    receivedAmount: '1000',
    targetCurrency: 'USD',
  };
  assert.equal(validateOperation(input, demoState).targetCurrency, 'currency');
});

await test('all operation types accept their meaningful valid fields', () => {
  const base = {
    ...initialOperation(demoState, 'binance'),
    quantity: '1',
    price: '10',
    amount: '100',
    receivedAmount: '10000',
    targetAccount: 'bybit-main',
    targetPortfolio: 'bybit',
    targetCurrency: 'RUB',
    note: 'Split 2:1',
    external: 'Example bank account',
  };
  const types = [
    'buy',
    'sell',
    'deposit',
    'withdrawal',
    'transfer',
    'exchange',
    'income',
    'fee',
    'opening',
    'corporate',
  ] as const;
  types.forEach((type) => assert.deepEqual(validateOperation({ ...base, type }, demoState), {}));
});

await test('a transfer between different accounts in one portfolio is valid', () => {
  const input = {
    ...initialOperation(demoState, 'tradernet'),
    type: 'transfer' as const,
    targetPortfolio: 'tradernet',
    targetAccount: 'tradernet-savings',
    amount: '12',
    asset: 'USD',
  };
  assert.deepEqual(validateOperation(input, demoState), {});
});

await test('cash and security forms validate only their active fields', () => {
  const base = initialOperation(demoState, 'tradernet');
  assert.deepEqual(
    validateOperation(
      { ...base, type: 'opening', amount: '0', fee: '-1', quantity: 'invalid' },
      demoState,
    ),
    {},
  );
  assert.deepEqual(
    validateOperation({ ...base, asset: 'FUND-DEMO', quantity: '2', price: '10' }, demoState),
    {},
  );
  assert.equal(
    validateOperation({ ...base, asset: 'unknown', quantity: '2', price: '10' }, demoState).asset,
    'asset',
  );
  assert.equal(
    validateOperation(
      { ...base, type: 'deposit', amount: '12', account: 'binance-main' },
      demoState,
    ).account,
    'account',
  );
});

await test('crypto transfers require quantity and ignore the hidden cash amount', () => {
  const base = {
    ...initialOperation(demoState, 'binance'),
    type: 'transfer' as const,
    asset: 'BTC',
    targetPortfolio: 'bybit',
    targetAccount: 'bybit-main',
    quantity: '0.04',
    feeCurrency: 'BTC',
    amount: 'invalid',
  };
  assert.deepEqual(validateOperation(base, demoState), {});
  assert.equal(validateOperation({ ...base, quantity: '' }, demoState).quantity, 'positive');
});

await test('cash transfers require amount and ignore the hidden security quantity', () => {
  const base = {
    ...initialOperation(demoState, 'tradernet'),
    type: 'transfer' as const,
    asset: 'RUB',
    currency: 'RUB',
    targetPortfolio: 'tradernet',
    targetAccount: 'tradernet-savings',
    amount: '1000',
    quantity: 'invalid',
  };
  assert.deepEqual(validateOperation(base, demoState), {});
  assert.equal(validateOperation({ ...base, asset: 'unknown' }, demoState).asset, 'asset');
});

await test('deposit and withdrawal require an external sample source or destination', () => {
  const base = { ...initialOperation(demoState, 'tradernet'), amount: '1000', external: '' };
  for (const type of ['deposit', 'withdrawal'] as const) {
    assert.equal(
      new Map(Object.entries(validateOperation({ ...base, type }, demoState))).get('external'),
      'external',
    );
    assert.deepEqual(
      validateOperation({ ...base, type, external: 'Example bank account' }, demoState),
      {},
    );
  }
});
