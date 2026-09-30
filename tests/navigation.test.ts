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
  ['', '#main', '#UNKNOWN', '#overview/extra', '#%73ettings'].forEach((hash) =>
    assert.equal(parseScreen(hash), 'overview'),
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
