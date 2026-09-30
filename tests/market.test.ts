import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assetPrice,
  filterMarkets,
  marketAssets,
  parseThreshold,
  sampleMoney,
} from '../src/market/data.ts';
import { money } from '../src/i18n.ts';
import { historySample, plotPoints } from '../src/market/history-data.ts';

await test('market filters, alert thresholds and price units remain explicit in the demo', () => {
  assert.equal(parseThreshold(' 460,25 '), 460.25);
  assert.equal(parseThreshold('0.5'), 0.5);
  ['', ' ', '0', '-1', 'NaN', 'Infinity', '0x10', '1e5', '1.2.3', '9'.repeat(310)].forEach(
    (value) => assert.equal(parseThreshold(value), undefined),
  );
  assert.deepEqual(
    filterMarkets('stock', ' msft ', 'up').map((asset) => asset.symbol),
    ['MSFT'],
  );
  assert.equal(filterMarkets('stock', 'msft', 'down').length, 0);
  assert.equal(filterMarkets('all', 'unknown', 'all').length, 0);
  assert.equal(filterMarkets('crypto', '', 'all', 'technology').length, 0);
  assert.deepEqual(
    filterMarkets('all', 'технологии', 'all').map((asset) => asset.symbol),
    ['MSFT', 'AAPL'],
  );
  assert.deepEqual(
    filterMarkets('all', '', 'active').map((asset) => asset.symbol),
    ['MSFT', 'BTC', 'ETH'],
  );
  assert.equal(sampleMoney(450, 'RUB', 'ru', false), money(54000, 'RUB', 'ru'));
  assert.equal(sampleMoney(450, 'USD', 'en', true), '••••');
  const index = filterMarkets('index', 'SPX', 'all').at(0);
  assert.ok(index);
  assert.equal(assetPrice(index, 5400, 'RUB', 'en', false), '5,400 points');
  assert.equal(assetPrice(index, 5400, 'USD', 'ru', true), '••••');
  marketAssets.forEach((asset) => {
    assert.equal(historySample(asset.symbol, 'day')?.values.at(-1), asset.price);
    assert.equal(historySample(asset.symbol, 'year')?.values.at(-1), asset.price);
  });
  assert.ok(
    plotPoints([1, 1, 1])
      .split(' ')
      .flatMap((point) => point.split(',').map(Number))
      .every(Number.isFinite),
  );
});
