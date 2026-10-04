/** Применение строки окружения: вьюпорт, медиа, настройки приложения, маршрут. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import type { Env } from './axes.ts';

const applySource = `async (env) => {
  const until = (cond, tries) =>
    new Promise((resolve) => {
      const spin = (left) => (cond() || left <= 0 ? resolve(cond()) : requestAnimationFrame(() => spin(left - 1)));
      spin(tries);
    });
  const setSelect = (selector, value) => {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLSelectElement)) return selector + ':missing';
    if (el.value === value) return 'same';
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value === value ? 'ok' : selector + ':mismatch';
  };
  const setCheck = (selector, on) => {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLInputElement)) return selector + ':missing';
    if (el.checked !== on) el.click();
    return el.checked === on ? 'ok' : selector + ':mismatch';
  };
  const out = [];
  if (location.hash !== '#settings') location.hash = '#settings';
  await until(() => document.querySelector('#settings-density'), 240);
  out.push(setSelect('#topbar-language', env.language));
  out.push(setSelect('#topbar-theme', env.theme));
  out.push(setSelect('#topbar-currency', env.displayCurrency));
  out.push(setSelect('#settings-base-currency', env.calcCurrency));
  out.push(setSelect('#settings-density', env.density));
  out.push(setCheck('#settings-hidden', env.hideAmounts === 'on'));
  out.push(setCheck('#settings-monochrome', env.monochrome === 'on'));
  const demoSel = document.querySelector('.demo-state-settings select');
  out.push(demoSel ? setSelect('.demo-state-settings select', env.demoState) : 'demoState:missing');
  if (location.hash !== '#' + env.route) location.hash = '#' + env.route;
  await until(() => location.hash === '#' + env.route, 240);
  await until(
    () => document.querySelector('a[href="#' + env.route + '"][aria-current="page"]') && document.getAnimations({ subtree: true }).every((a) => a.playState !== 'running'),
    240,
  );
  return { applied: out.filter((s) => s !== 'ok' && s !== 'same'), hash: location.hash };
}`;

export const mediaFor = (env: Env): readonly string[] => [
  'media',
  env.theme === 'system' ? 'dark' : env.theme,
  ...(env.reducedMotion === 'on' ? ['reduced-motion'] : []),
];

export const applyEnv = (browser: Browser, env: Env, route: string): unknown => {
  const height = Number(env.width) <= 420 ? '800' : '900';
  browser.run('set', 'viewport', env.width, height);
  browser.run('set', ...mediaFor(env));
  return evaluate(browser, `(${applySource})(${JSON.stringify({ ...env, route })})`);
};

export const gotoRoute = (browser: Browser, route: string) =>
  evaluate(
    browser,
    `(async () => {
      const until = (cond, left) => new Promise((r) => {
        const spin = (n) => (cond() || n <= 0 ? r(cond()) : requestAnimationFrame(() => spin(n - 1)));
        spin(left);
      });
      if (location.hash !== ${JSON.stringify('#')} + ${JSON.stringify(route)}) location.hash = '#' + ${JSON.stringify(route)};
      await until(() => document.querySelector('a[href="#' + ${JSON.stringify(route)} + '"][aria-current="page"]'), 240);
      await until(() => document.getAnimations({ subtree: true }).every((a) => a.playState !== 'running'), 240);
      return location.hash;
    })()`,
  );
