import assert from 'node:assert/strict';
import { test } from 'node:test';
import { routeReady } from '../scripts/exhaust/probe.ts';

// Детектор изменений: проверяет форму выражения; поведение ожидания маршрута
// доказывают браузерные проверки (check-ui, ui-smoke), а не этот тест.
await test('routeReady требует hash и маркер aria-current одного коммита', () => {
  const expr = routeReady('#import');
  assert.ok(expr.includes('location.hash === "#import"'));
  assert.ok(expr.includes('a[href="#import"]'));
  assert.ok(expr.includes('aria-current="page"'));
  // h1 прежнего раздела остаётся в DOM до перемонта и не доказывает переход.
  assert.ok(!expr.includes('h1'));
});
