import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextSession } from '../src/demo/modal-session.ts';

// «Закрыть и сразу открыть тот же диалог» не должно схлопываться в bail:
// свежий объект с растущим nonce перемонтирует диалог через key, и событие
// close, поставленное в очередь до повторного открытия, приходит к уже
// снятому элементу.
await test('nextSession: повторное открытие — свежая сессия с растущим nonce', () => {
  const first = nextSession(null, 'details');
  assert.deepEqual(first, { kind: 'details', nonce: 0 });
  const again = nextSession(first, 'details');
  assert.notEqual(again, first, 'тот же kind не должен возвращать прежний объект');
  assert.equal(again.nonce, 1, 'nonce растёт — key={nonce} перемонтирует диалог');
  const other = nextSession(again, 'reconcile');
  assert.deepEqual(other, { kind: 'reconcile', nonce: 2 });
  assert.deepEqual(first, { kind: 'details', nonce: 0 }, 'прежняя сессия не изменена');
});
