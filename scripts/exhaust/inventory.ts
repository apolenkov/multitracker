/** Машиночитаемый разбор инвентаря 135 ID из docs/design/form-inventory.md. */
import { execFileSync } from 'node:child_process';

export type InventoryEntry = Readonly<{
  id: string;
  num: number;
  name: string;
  source: string;
  entry: string;
  family: string;
  scope: 'current' | 'out';
  reason: string;
}>;

export const inventoryPath = 'docs/design/form-inventory.md';
const outMark = 'вне текущего объёма';

const stripLinks = (value: string): string => value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

const splitCells = (line: string): readonly string[] =>
  line
    .replace(/^\|\s*/, '')
    .replace(/\s*\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());

type Row = Readonly<{
  id: string;
  num: number;
  name: string;
  source: string;
  entry: string;
  family: string;
}>;

const rowIdOf = (cells: readonly string[]): Readonly<{ id: string; num: number }> | null => {
  const numCell = cells[0];
  if (numCell === undefined) return null;
  const id = /\*\*(FORM-\d+)\*\*/.exec(numCell)?.[1];
  const num = Number.parseInt(numCell, 10);
  return id === undefined || Number.isNaN(num) ? null : { id, num };
};

const rowOf = (line: string): Row | null => {
  if (!/^\|\s*\d+\s*\/\s*\*\*FORM-/.test(line)) return null;
  const cells = splitCells(line);
  const head = rowIdOf(cells);
  const [name, source, entry, family] = cells.slice(1, 5);
  if (head === null) return null;
  if (name === undefined || source === undefined || entry === undefined || family === undefined)
    return null;
  return {
    id: head.id,
    num: head.num,
    name: stripLinks(name),
    source: stripLinks(source),
    entry: stripLinks(entry),
    family: stripLinks(family),
  };
};

const entryOf = (row: Row): InventoryEntry =>
  row.name.includes(outMark)
    ? { ...row, scope: 'out', reason: 'вне текущего объёма (решение 093)' }
    : { ...row, scope: 'current', reason: '' };

export const parseInventory = (markdown: string): readonly InventoryEntry[] =>
  markdown.split('\n').flatMap((line) => {
    const row = rowOf(line);
    return row === null ? [] : [entryOf(row)];
  });

const problemsOf = (entry: InventoryEntry, index: number): readonly string[] => [
  ...(entry.num === index + 1 ? [] : [`${entry.id}: номер ${entry.num}, ожидался ${index + 1}`]),
  ...(entry.entry.trim() === '' ? [`${entry.id}: пустой вход`] : []),
  ...(entry.family.trim() === '' ? [`${entry.id}: пустое семейство`] : []),
  ...(entry.scope === 'out' && entry.reason === '' ? [`${entry.id}: вне объёма без причины`] : []),
];

export const validateInventory = (entries: readonly InventoryEntry[]): readonly string[] => [
  ...(entries.length === 135 ? [] : [`записей ${entries.length}, ожидалось 135`]),
  ...(new Set(entries.map((entry) => entry.id)).size === entries.length
    ? []
    : ['идентификаторы повторяются']),
  ...entries.flatMap((entry, index) => problemsOf(entry, index)),
];

export const loadInventory = (path = inventoryPath): readonly InventoryEntry[] =>
  parseInventory(execFileSync('cat', [path], { encoding: 'utf8' }));
