import assert from 'node:assert/strict';
import { test } from 'node:test';
import { amountLeak } from '../scripts/exhaust/dom-rules.ts';
import { leakSelectors, moneySelectors } from '../scripts/exhaust/page-checks.ts';
import { closestMatch, fake, queried, type FakeEl } from './dom-match.ts';

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
    assert.ok(queried(chain, leakSelectors), `${name}: не сканируется`);
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
