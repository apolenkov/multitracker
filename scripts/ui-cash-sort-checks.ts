import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';

type Row = Readonly<{ group: string; asset: string; value: number }>;
function isRow(row: unknown): row is Row {
  return (
    row !== null &&
    typeof row === 'object' &&
    'group' in row &&
    typeof row.group === 'string' &&
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
    `Array.from(document.querySelectorAll('.holdings-table tbody > tr.holding-row'), row => {
      const cell = row.querySelector('td:nth-child(3)');
      const text = cell?.querySelector('.money-amount > .visually-hidden')?.textContent ?? Array.from(cell?.childNodes ?? []).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('');
      return {group:row.closest('tbody')?.dataset.holdingGroup ?? '', asset:row.dataset.currency ?? row.querySelector('.asset-name strong')?.textContent, value:Number(text.replace(/[^0-9,-]/g,'').replace(',','.'))};
    })`,
  );
  assert.ok(Array.isArray(observed) && observed.length === 5);
  assert.ok(observed.every(isRow));
  return observed;
}

const groups = ['crypto', 'stock', 'fund', 'bond', 'cash'];
const names = new Map([
  ['asset', 'Актив'],
  ['value', 'Стоимость'],
]);
const directions = new Map([
  ['ascending', 'по возрастанию'],
  ['descending', 'по убыванию'],
]);

export function holdingsSort(browser: Browser) {
  return (['asset', 'value'] as const).flatMap((column) =>
    (['ascending', 'descending'] as const).map((direction) => {
      const header = `.holding-head th:nth-child(${column === 'asset' ? 1 : 3})`;
      const desired = `document.querySelector('${header}')?.getAttribute('aria-sort') === '${direction}'`;
      const tab = `.holdings-sort [role=group] button:nth-of-type(${column === 'asset' ? 1 : 2})`;
      if (evaluate(browser, desired) !== true) browser.run('click', tab);
      assert.equal(evaluate(browser, desired), true, 'Сортировка должна объявить своё направление');
      assert.deepEqual(
        evaluate(
          browser,
          `[...document.querySelectorAll('.holdings-sort [role=group] button')].map(b => [b.getAttribute('aria-pressed'), b.getAttribute('aria-label')])`,
        ),
        (['asset', 'value'] as const).map((name) => [
          String(name === column),
          `${names.get(name) ?? ''}${name === column ? ` · ${directions.get(direction) ?? ''}` : ''}`,
        ]),
        'Нажатая кнопка сортировки и направление в доступном имени',
      );
      const actual = rows(browser);
      assert.deepEqual(
        [...new Set(actual.map((row) => row.group))],
        ['crypto', 'stock', 'cash'],
        'Группы идут в постоянном порядке: криптовалюты, акции, деньги',
      );
      const sorted = actual.toSorted(
        (left, right) =>
          groups.indexOf(left.group) - groups.indexOf(right.group) ||
          (direction === 'ascending' ? 1 : -1) *
            (column === 'asset' ? left.asset.localeCompare(right.asset) : left.value - right.value),
      );
      assert.deepEqual(
        actual.map((row) => (column === 'asset' ? row.asset : row.value)),
        sorted.map((row) => (column === 'asset' ? row.asset : row.value)),
        `Пять строк, включая RUB/USD, сортируются внутри групп: ${column} ${direction}`,
      );
      return { column, direction, rows: actual };
    }),
  );
}
