import assert from 'node:assert/strict';
import test from 'node:test';
import { parseScreen, routeFor, type Route } from '../src/navigation.ts';

await test('only seven known fragments resolve, invalid input falls back to overview', () => {
  const screens = [
    'overview',
    'portfolios',
    'history',
    'import',
    'connections',
    'sync',
    'settings',
  ];
  screens.forEach((screen) => assert.equal(parseScreen(`#${screen}`), screen));
  const removed = ['markets', 'following', 'analytics', 'events'];
  const unknown = ['', '#main', '#UNKNOWN', '#overview/extra', '#%73ettings', ...removed];
  unknown.forEach((hash) =>
    assert.equal(parseScreen(hash.startsWith('#') ? hash : `#${hash}`), 'overview'),
  );
});

await test('financial navigation preserves the last auxiliary page without mutating the route', () => {
  const initial: Route = Object.freeze({ screen: 'import', demoScreen: 'import' });
  const settings = routeFor(initial, 'settings');
  const finance = routeFor(settings, 'history');
  assert.deepEqual(settings, { screen: 'settings', demoScreen: 'settings' });
  assert.deepEqual(finance, { screen: 'history', demoScreen: 'settings' });
  assert.deepEqual(initial, { screen: 'import', demoScreen: 'import' });
});

await test('every demo route is retained when returning to financial screens', () => {
  const initial: Route = Object.freeze({ screen: 'overview', demoScreen: 'settings' });
  (['import', 'connections', 'sync', 'settings'] as const).forEach((screen) => {
    const demo = routeFor(initial, screen);
    assert.deepEqual(demo, { screen, demoScreen: screen });
    assert.deepEqual(routeFor(demo, 'overview'), { screen: 'overview', demoScreen: screen });
  });
  assert.deepEqual(initial, { screen: 'overview', demoScreen: 'settings' });
});
