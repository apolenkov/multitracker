import assert from 'node:assert/strict';
import test from 'node:test';
import { initialImport, importError, mapImportField } from '../src/demo/import-model.ts';

await test('import requires a valid destination, file, mapping and safe row policies', () => {
  assert.match(importError(initialImport, 0, 'en'), /source/u);
  const chosen = { ...initialImport, source: 'Binance' };
  assert.equal(importError(chosen, 0, 'ru'), '');
  assert.match(importError({ ...chosen, portfolio: 'missing' }, 0, 'en'), /portfolio/u);
  assert.match(importError(chosen, 1, 'en'), /file/u);
  const ready = { ...chosen, fileSelected: true };
  assert.equal(importError(ready, 4, 'en'), '');
  for (const field of ['date', 'asset', 'action', 'quantity', 'price', 'currency'] as const) {
    assert.notEqual(importError(mapImportField(ready, field, 'skip'), 4, 'en'), '');
  }
  assert.notEqual(importError(mapImportField(ready, 'date', 'asset'), 2, 'en'), '');
  assert.notEqual(importError({ ...ready, skipUnknown: false }, 3, 'en'), '');
  assert.notEqual(importError({ ...ready, skipDuplicates: false }, 3, 'en'), '');
});

await test('stable mapping updates preserve the original page draft across translations', () => {
  const page = { ...initialImport, source: 'Binance', fileSelected: true };
  const dialog = mapImportField(page, 'date', 'skip');
  assert.equal(page.mapping.date, 'date');
  assert.equal(dialog.mapping.date, 'skip');
  assert.notEqual(importError(dialog, 2, 'ru'), '');
  assert.notEqual(importError(dialog, 2, 'en'), '');
  assert.equal(dialog.mapping.date, 'skip');
  assert.equal(page.source, 'Binance');
});
