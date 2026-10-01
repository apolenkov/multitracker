import assert from 'node:assert/strict';
import type { Browser } from './ui-driver.ts';
import { content } from './ui-helpers.ts';

export function mappingSamples(browser: Browser, scope: 'page', hidden = false) {
  const sample = (field: string) =>
    content(browser, `label:has(#import-${scope}-map-${field}) small`).trim();
  const quantity = sample('quantity');
  const price = sample('price');
  const asset = sample('asset');
  assert.equal(quantity, hidden ? '••••' : '2', 'Пример количества должен соответствовать CSV');
  assert.equal(price, hidden ? '••••' : '450', 'Пример цены должен соответствовать CSV');
  assert.equal(asset, 'MSFT', 'Название актива должно оставаться видимым');
  return { scope, quantity, price, asset };
}
