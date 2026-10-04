import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closeSession, openSession } from '../src/demo/modal-session.ts';

// «Закрыть и сразу открыть тот же диалог» не должно схлопываться в bail:
// свежий объект с монотонным nonce перемонтирует диалог через key, и событие
// close, поставленное в очередь до повторного открытия, приходит к уже
// снятому элементу. Nonce не переиспользуется после закрытия.
await test('openSession: повторное открытие — свежая сессия с монотонным nonce', () => {
  const idle = { current: null, next: 0 };
  const first = openSession(idle, 'details');
  assert.deepEqual(first.current, { kind: 'details', nonce: 0 });
  const closed = closeSession(first, 0);
  assert.equal(closed.current, null);
  const second = openSession(closed, 'details');
  assert.notEqual(second.current, first.current, 'тот же kind — новый объект, не bail');
  assert.equal(second.current?.nonce, 1, 'nonce не возвращается к уже бывшему значению');
});

// Событие close — отдельная задача: flushSync внутри неё применяет висячее
// открытие и само закрытие по порядку. Устаревшее закрытие обязано попадать
// только в свою сессию — иначе оно обнуляет свежее открытие, и диалог умирает.
await test('closeSession: устаревшее закрытие не снимает чужую сессию', () => {
  const reopened = openSession({ current: null, next: 1 }, 'details');
  assert.equal(reopened.current?.nonce, 1);
  const stale = closeSession(reopened, 0);
  assert.equal(stale.current?.nonce, 1, 'чужой nonce не закрывает свежее открытие');
  const own = closeSession(reopened, 1);
  assert.equal(own.current, null, 'свой nonce закрывает сессию');
  const empty = closeSession({ current: null, next: 2 }, 5);
  assert.equal(empty.current, null, 'закрытие пустого состояния безопасно');
});
