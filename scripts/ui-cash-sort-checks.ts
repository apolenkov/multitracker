import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';

type Row = Readonly<{ asset: string; value: number }>;
function isRow(row: unknown): row is Row {
  return (
    row !== null &&
    typeof row === 'object' &&
    'asset' in row &&
    typeof row.asset === 'string' &&
    'value' in row &&
    typeof row.value === 'number' &&
    Number.isFinite(row.value)
  );
}
function rows(browser: Browser): readonly Row[] {
  const observed = evaluate(
    browser,
    `Array.from(document.querySelectorAll('.holdings-table tbody > tr'), row => {
      const cell = row.querySelector('td:nth-child(3)');
      const text = cell?.querySelector('.money-amount > .visually-hidden')?.textContent ?? Array.from(cell?.childNodes ?? []).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('');
      return {asset:row.dataset.currency ?? row.querySelector('.asset-name strong')?.textContent, value:Number(text.replace(/[^0-9,-]/g,'').replace(',','.'))};
    })`,
  );
  assert.ok(Array.isArray(observed) && observed.length === 5);
  assert.ok(observed.every(isRow));
  return observed;
}

export function holdingsSort(browser: Browser) {
  return (['asset', 'value'] as const).flatMap((column) =>
    (['ascending', 'descending'] as const).map((direction) => {
      const header = `.holding-head th:nth-child(${column === 'asset' ? 1 : 3})`;
      const desired = `document.querySelector('${header}')?.getAttribute('aria-sort') === '${direction}'`;
      if (evaluate(browser, desired) !== true)
        browser.run('click', `.holdings-sort button:nth-of-type(${column === 'asset' ? 1 : 2})`);
      assert.equal(evaluate(browser, desired), true, 'Сортировка должна объявить своё направление');
      const actual = rows(browser);
      const sorted = actual.toSorted((left, right) =>
        column === 'asset' ? left.asset.localeCompare(right.asset) : left.value - right.value,
      );
      const expected = direction === 'ascending' ? sorted : sorted.toReversed();
      assert.deepEqual(
        actual.map((row) => (column === 'asset' ? row.asset : row.value)),
        expected.map((row) => (column === 'asset' ? row.asset : row.value)),
        `Все пять строк, включая RUB/USD, должны сортироваться: ${column} ${direction}`,
      );
      return { column, direction, rows: actual };
    }),
  );
}
