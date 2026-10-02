import test from 'node:test';
import assert from 'node:assert/strict';
import { loadInventory, validateInventory } from '../scripts/exhaust/inventory.ts';
import { entryPlans, planFor } from '../scripts/exhaust/matrix-steps.ts';

await test('inventory parses 135 entries: 82 applicable and 53 out-of-scope with reasons', () => {
  const entries = loadInventory();
  assert.deepEqual(validateInventory(entries), []);
  const scope = entries.filter((entry) => entry.scope === 'current');
  const out = entries.filter((entry) => entry.scope === 'out');
  assert.equal(scope.length, 82);
  assert.equal(out.length, 53);
  assert.ok(out.every((entry) => entry.reason !== ''));
});

await test('every applicable entry has a plan and no plan is extra', () => {
  const scope = loadInventory().filter((entry) => entry.scope === 'current');
  assert.deepEqual(
    scope.filter((entry) => planFor(entry.id) === null).map((entry) => entry.id),
    [],
  );
  assert.deepEqual(
    Object.keys(entryPlans).filter((id) => !scope.some((entry) => entry.id === id)),
    [],
  );
});

await test('mobile-only entries declare a context reason and routes map to sections', () => {
  const plan = planFor('FORM-013');
  assert.ok(plan);
  const when = plan.when;
  assert.ok(when);
  assert.equal(
    when({ language: 'ru', width: 1440, theme: 'light' }),
    'мобильное меню видно только при узкой ширине',
  );
  assert.equal(when({ language: 'ru', width: 375, theme: 'light' }), '');
  const routePlan = planFor('FORM-002');
  assert.ok(routePlan);
  assert.deepEqual(routePlan.steps, [{ k: 'route', hash: '#portfolios' }]);
});
