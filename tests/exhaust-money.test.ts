import assert from 'node:assert/strict';
import { test } from 'node:test';
import { amountLeak } from '../scripts/exhaust/dom-rules.ts';
import { leakSelectors, moneySelectors } from '../scripts/exhaust/page-checks.ts';

/** Упрощённый элемент: тег и список классов — достаточно для селекторов проверки. */
type FakeEl = Readonly<{ tag: string; classes: readonly string[] }>;
const fake = (tag: string, ...classes: readonly string[]): FakeEl => ({ tag, classes });

/** Простой селектор: необязательный тег плюс .классы и [class*=подстрока]. */
const selMatch = (el: FakeEl, simple: string): boolean => {
  const tag = /^[a-z]+/.exec(simple)?.[0];
  const cls = [...simple.matchAll(/\.([\w-]+)/g)].map((m) => m[1] ?? '');
  const sub = [...simple.matchAll(/\[class\*=([\w-]+)\]/g)].map((m) => m[1] ?? '');
  const okTag = tag === undefined || el.tag === tag;
  return (
    okTag &&
    cls.every((c) => el.classes.includes(c)) &&
    sub.every((s) => el.classes.some((c) => c.includes(s)))
  );
};

/** Части селектора левее найденного: каждая совпадает с предком выше предыдущей. */
const descMatch = (els: readonly FakeEl[], parts: readonly string[]): boolean => {
  const [part, ...rest] = parts;
  const [el, ...above] = els;
  if (part === undefined) return true;
  if (el === undefined) return false;
  return (selMatch(el, part) && descMatch(above, rest)) || descMatch(above, parts);
};

/** Семантика el.closest: элемент или предок совпадает с правым компонентом селектора. */
const closestMatch = (chain: readonly FakeEl[], sel: string): boolean =>
  sel.split(',').some((single) => {
    const parts = single.trim().split(/\s+/);
    return chain.some(
      (_, from) =>
        selMatch(chain.slice(from)[0] ?? fake('x'), parts.at(-1) ?? '') &&
        descMatch(chain.slice(from + 1), parts.slice(0, -1).toReversed()),
    );
  });

/** Именованные денежные слоты из разметки (N4): цепочка «элемент → предки». */
const moneySlots: readonly (readonly [string, readonly FakeEl[]])[] = [
  ['.portfolio-value', [fake('span', 'portfolio-value'), fake('div', 'portfolio-card')]],
  ['.record-values dd', [fake('dd'), fake('dl', 'record-values')]],
  ['.summary-result dd', [fake('dd'), fake('section', 'summary-result')]],
  ['.import-result', [fake('p', 'import-result'), fake('section', 'import-summary')]],
  ['.widget-value', [fake('p', 'widget-value'), fake('div', 'widget-preview')]],
];

await test('named money slots: bare digits caught when hidden, allowed when shown', () => {
  moneySlots.forEach(([name, chain]) => {
    assert.ok(closestMatch(chain.slice(0, 1), leakSelectors), `${name}: не сканируется`);
    const inSlot = closestMatch(chain, moneySelectors);
    assert.ok(inSlot, `${name}: не денежный слот`);
    // Скрытие вкл: голая сумма — находка; дата в слоте по-прежнему легальна.
    assert.equal(amountLeak('42000', inSlot), true, `${name}: утечка при скрытии`);
    assert.equal(amountLeak('30 сент. 2026 г.', inSlot), false, `${name}: дата легальна`);
    // Скрытие выкл: проверочный блок не запускается — цифры показывать можно.
    const flagged = (hide: 'on' | 'off') => hide === 'on' && amountLeak('42000', inSlot);
    assert.equal(flagged('on'), true, `${name}: при скрытии ждём находку`);
    assert.equal(flagged('off'), false, `${name}: при показе цифры разрешены`);
  });
  // Контроль: обычный dd вне именованных слотов денежным не считается.
  const plain = [fake('dd'), fake('dl', 'meta')];
  assert.equal(closestMatch(plain, moneySelectors), false);
  assert.equal(amountLeak('42000', closestMatch(plain, moneySelectors)), false);
});
