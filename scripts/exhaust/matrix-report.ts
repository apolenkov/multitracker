/** Ячейки матрицы и итоговый отчёт: счёт, падения, артефакты. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { RunLog } from './records.ts';
import type { Finding } from './records.ts';

export type MatrixCellStatus = 'PASS' | 'N/A' | 'FAIL';
export type MatrixCell = Readonly<{
  id: string;
  context: string;
  status: MatrixCellStatus;
  note: string;
  durationMs: number;
  findings: readonly Finding[];
  /** DOM состояния ячейки; в журнал уходит хеш, сам DOM — в states.jsonl. */
  dom?: string;
}>;

const stateHash = (dom: string): string =>
  createHash('sha256').update(dom).digest('hex').slice(0, 12);

/** Строка журнала: ячейка с хешем состояния вместо самого DOM. */
const journalRow = ({ dom, ...cell }: MatrixCell): string =>
  JSON.stringify(dom === undefined ? cell : { ...cell, state: stateHash(dom) });

/** DOM каждого уникального состояния матрицы: одна строка на хеш. */
const stateRows = (cells: readonly MatrixCell[]): string =>
  [
    ...new Map(
      cells.flatMap(({ dom, id, context }) =>
        dom === undefined
          ? []
          : [[stateHash(dom), JSON.stringify({ hash: stateHash(dom), id, context, html: dom })]],
      ),
    ).values(),
  ]
    .map((row) => `${row}\n`)
    .join('');

const reportText = (cells: readonly MatrixCell[], durationMs: number, expected: number): string => {
  const count = (status: MatrixCellStatus) => cells.filter((cell) => cell.status === status).length;
  const failures = cells.filter((cell) => cell.status === 'FAIL');
  const head = [
    '# Строгая матрица 135×8',
    '',
    `- Ячеек: ${cells.length} (ожидалось ${expected})`,
    `- PASS: ${count('PASS')}; N/A: ${count('N/A')}; FAIL: ${failures.length}`,
    `- Длительность: ${(durationMs / 1000).toFixed(1)} с`,
    '',
  ];
  const tail =
    failures.length === 0
      ? []
      : ['## Падения', ...failures.map((cell) => `- ${cell.id} ${cell.context}: ${cell.note}`)];
  return [...head, ...tail].join('\n') + '\n';
};

/** Записывает журнал и отчёт, печатает итог и падает на любом FAIL. */
export const writeMatrixReport = (
  cells: readonly MatrixCell[],
  log: RunLog,
  started: number,
  expected: number,
): void => {
  const failures = cells.filter((cell) => cell.status === 'FAIL');
  const passed = cells.filter((cell) => cell.status === 'PASS').length;
  log.saveText('matrix-journal.jsonl', cells.map((cell) => journalRow(cell)).join('\n') + '\n');
  log.saveText('states.jsonl', stateRows(cells));
  log.saveText('matrix-report.md', reportText(cells, Date.now() - started, expected));
  console.log(`матрица: ${cells.length} ячеек, ${passed} PASS, ${failures.length} FAIL`);
  console.log(`артефакты: ${log.dir}`);
  assert.equal(cells.length, expected, `ячеек ${cells.length}, ожидалось ${expected}`);
  assert.deepEqual(
    failures.map((cell) => `${cell.id} ${cell.context}: ${cell.note}`).slice(0, 20),
    [],
    'есть FAIL в матрице',
  );
};
