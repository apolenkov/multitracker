import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  amountLeak,
  amountLike,
  clickableNow,
  lineDeltaMax,
  overlapExempt,
  paintsBox,
  stackCoversText,
  visiblePoint,
} from '../scripts/exhaust/dom-rules.ts';
import { designScales } from '../scripts/exhaust/tokens.ts';
import { fullInvariantsSource } from '../scripts/exhaust/page-checks.ts';
import { designScanSource } from '../scripts/exhaust/page-design.ts';
import { clickableProbe } from '../scripts/exhaust/walk-run.ts';
import { attemptClick } from '../scripts/exhaust/trusted.ts';
import { record } from '../scripts/exhaust/records.ts';
import { baseEnv } from '../scripts/exhaust/axes.ts';
import { closestMatch, fake } from './dom-match.ts';

await test('amountLike flags real sums but spares dates, ordinals and masked marks', () => {
  assert.equal(amountLike('Стоимость сейчас••••30 сент. 2026 г.'), false);
  assert.equal(amountLike('Current value••••Sep 30, 2026'), false);
  assert.equal(amountLike('2026-09-02'), false);
  assert.equal(amountLike('Duplicate of row 1 · skip'), false);
  assert.equal(amountLike('строки 4 · без повторов'), false);
  assert.equal(amountLike('••••'), false);
  assert.equal(amountLike('1 234,56 ₽'), true);
  assert.equal(amountLike('Баланс 86 420 RUB'), true);
  assert.equal(amountLike('95.50 USD'), true);
  assert.equal(amountLike('2 BTC'), true);
});

await test('amountLike replaces the regex that misread a date next to ••••', () => {
  const oldCheck = (t: string) =>
    /\d/.test(t) &&
    !/[0-9]{2}[:./-][0-9]{2}/.test(t.replace(/\d/g, '')) &&
    /\d/.test(t.replace(/20\d\d/g, ''));
  const leaked = 'Стоимость сейчас••••30 сент. 2026 г.';
  assert.equal(oldCheck(leaked), true);
  assert.equal(amountLike(leaked), false);
});

await test('amountLeak flags bare digits only inside money slots', () => {
  // Позитивы: голая сумма в денежном слоте и прежние amountLike-случаи везде.
  assert.equal(amountLeak('5000', true), true);
  assert.equal(amountLeak('Итого 42000', true), true);
  assert.equal(amountLeak('1 234,56 ₽', false), true);
  assert.equal(amountLeak('0.05 BTC', false), true);
  // Негативы: голые цифры вне денежного слота — курс («Исторический USD/RUB»),
  // счётчики, проценты и даты остаются легально видимыми при скрытых суммах.
  assert.equal(amountLeak('100', false), false);
  assert.equal(amountLeak('5000', false), false);
  assert.equal(amountLeak('2026-09-02', true), false);
  assert.equal(amountLeak('30 сент. 2026 г.', true), false);
  assert.equal(amountLeak('Sep 30, 2026', true), false);
  assert.equal(amountLeak('4 из 12', true), false);
  assert.equal(amountLeak('3 of 7', true), false);
  assert.equal(amountLeak('42 %', true), false);
  assert.equal(amountLeak('3/7', true), false);
  assert.equal(amountLeak('••••', true), false);
  // Старое поведение (только amountLike) голую цифру в денежном слоте не ловило.
  assert.equal(amountLike('5000'), false);
});

await test('visiblePoint returns the centre of the on-screen part, null off-screen', () => {
  assert.deepEqual(visiblePoint(0, 64, 320, 1359, 320, 800), [160, 432]);
  assert.deepEqual(visiblePoint(-10, -50, 100, 10, 320, 800), [50, 5]);
  assert.equal(visiblePoint(0, -200, 100, -10, 320, 800), null);
  assert.equal(visiblePoint(0, 900, 100, 950, 320, 800), null);
});

await test('lineDeltaMax groups children per visual line, wraps start new lines', () => {
  assert.equal(
    lineDeltaMax([
      [100, 140],
      [102, 142],
      [100, 140],
    ]),
    2,
  );
  assert.equal(
    lineDeltaMax([
      [640, 664],
      [680, 704],
      [720, 744],
    ]),
    0,
  );
  assert.equal(
    lineDeltaMax([
      [100, 140],
      [130, 150],
    ]),
    20,
  );
  assert.equal(lineDeltaMax([]), 0);
});

await test('paintsBox sees only opaque paint, not transparent click layers', () => {
  assert.equal(paintsBox(0, 0, 0, false), false);
  assert.equal(paintsBox(0.5, 0, 0, false), true);
  assert.equal(paintsBox(0, 1, 1, false), true);
  assert.equal(paintsBox(0, 0, 0, true), true);
});

await test('design scales keep em sizes apart and carry the contract 14px gap', () => {
  const scales = designScales(readFileSync('DESIGN.md', 'utf8'));
  assert.ok(scales.fontEm.includes(0.65), String(scales.fontEm));
  assert.ok(!scales.fontSizes.includes(0.65), String(scales.fontSizes));
  assert.ok(scales.spacings.includes(14), String(scales.spacings));
});

await test('page probes embed the corrected helpers (smoke)', () => {
  assert.ok(fullInvariantsSource.includes('amountLeak'));
  assert.ok(fullInvariantsSource.includes('visiblePoint'));
  assert.ok(designScanSource.includes('stackCoversText'));
  assert.ok(designScanSource.includes('.mobile-links'));
  assert.ok(!designScanSource.includes('mobile-links, .more-menu'));
  assert.ok(clickableProbe('x').includes('clickableNow'));
});

await test('overlap exemption spares only the bottom mobile nav, other fixed layers stay findings', () => {
  const oldRule = (controlFixed: boolean, textFixed: boolean) => controlFixed !== textFixed;
  // Старое правило прятало любой fixed/sticky слой над текстом потока.
  assert.equal(oldRule(true, false), true);
  assert.equal(overlapExempt(true, false, false), false);
  assert.equal(overlapExempt(true, false, true), true);
  assert.equal(overlapExempt(false, true, false), false);
  assert.equal(overlapExempt(true, true, true), false);
  assert.equal(overlapExempt(false, false, false), false);
  // Закреплённый подвал диалога закрывает прокручиваемое содержимое намеренно.
  assert.equal(overlapExempt(true, true, false, true), true);
  assert.equal(overlapExempt(false, false, false, true), true);
  assert.equal(overlapExempt(true, false, false, false), false);
});

await test('open more-menu loses the overlap exemption; closed bottom nav keeps it', () => {
  // Разметка Navigation.tsx: .more-menu — сосед .mobile-links и есть в DOM только
  // при expanded; его контролы не попадают под освобождение нижней панели (N5).
  const navSel = '.mobile-links';
  const navButton = [fake('a'), fake('div', 'mobile-links'), fake('nav', 'navigation')];
  const menuButton = [fake('a'), fake('div', 'more-menu'), fake('nav', 'navigation')];
  const navInBar = closestMatch(navButton, navSel);
  const menuInBar = closestMatch(menuButton, navSel);
  assert.equal(navInBar, true);
  assert.equal(menuInBar, false);
  // Одно и то же геометрическое перекрытие: закрытая панель освобождена, открытое меню — находка.
  assert.equal(overlapExempt(true, false, navInBar), true);
  assert.equal(overlapExempt(true, false, menuInBar), false);
  // Старое освобождение пропускало меню: проверка селектора — из изменённого источника.
  assert.ok(designScanSource.includes("closest('.mobile-links')"));
});

await test('opaque dialog heading exempts text passing under it', () => {
  // Крестик в непрозрачной липкой шапке над откручиваемым текстом — то же
  // устройство, что и закреплённый подвал: внутри dialog с position: fixed
  // асимметрии fixed/flow нет, флаг означает доказанную безвредность
  // (dialogHeadingClear: краска, чужой текст, scrollFrees — см. exhaust-heading).
  assert.equal(overlapExempt(true, false, false, false, false, true), true);
  assert.equal(overlapExempt(true, true, false, false, false, true), true);
  // Без доказанной безвредности (прозрачная, свой текст, нескроллируемое) — находка.
  assert.equal(overlapExempt(true, false, false, false, false, false), false);
  assert.equal(overlapExempt(true, true, false, false, false, false), false);
  // Caller передаёт признак только для непрозрачной шапки чужого откручиваемого текста.
  assert.ok(designScanSource.includes(".closest('dialog .dialog-heading')"));
  assert.ok(designScanSource.includes('paints(head)'));
});

await test('padded fixed toast is exempt over flow text only', () => {
  // Плашка .status-message (fixed) при активном отступе .workspace: потоковый
  // текст уходит прокруткой выше её края — устройство раскладки, не дефект.
  // Старые 4 аргумента оставляли эту пару находкой (матрица CI: 58 FAIL).
  assert.equal(overlapExempt(true, false, false, false, true), true);
  // Плашка без активного отступа — обычный закреплённый слой и находка.
  assert.equal(overlapExempt(true, false, false, false, false), false);
  // Текст другого закреплённого слоя (нижняя навигация, диалог) — находка.
  assert.equal(overlapExempt(true, true, false, false, true), false);
  // Нефиксированный контрол под потоком освобождения не получает.
  assert.equal(overlapExempt(false, false, false, false, true), false);
  assert.ok(designScanSource.includes("closest('.status-message')"));
});

const hit = (control: boolean, text: boolean, opaque: boolean) => ({ control, text, opaque });

await test('hit-stack coverage counts only an opaque control layer above text', () => {
  // Контрол над текстом и непрозрачен — текст закрыт.
  assert.equal(stackCoversText([hit(true, false, true)]), true);
  // Контрол под текстом — слой ниже текста ничего не закрывает.
  assert.equal(stackCoversText([hit(false, true, false), hit(true, false, true)]), false);
  // Прозрачный кликабельный слой над текстом видимости не крадёт.
  assert.equal(stackCoversText([hit(true, false, false)]), false);
  // Над текстом чужой непрозрачный элемент, а контрол ниже текста — находки нет.
  assert.equal(
    stackCoversText([hit(false, false, true), hit(false, true, false), hit(true, false, true)]),
    false,
  );
});

await test('walk clickability needs a visible element outside modal dialogs', () => {
  assert.equal(clickableNow(true, true, false, false), true);
  // Открытый диалог делает фон инертным: кликабелен только его контент.
  assert.equal(clickableNow(true, true, true, false), false);
  assert.equal(clickableNow(true, true, true, true), true);
  assert.equal(clickableNow(false, true, false, false), false);
  assert.equal(clickableNow(true, false, false, false), false);
});

const clickRecord = record(1, baseEnv, 'overview', { b: 'x', a: 'x', dur: 0 }, 'sig|x', {
  role: 'button',
  name: 'Go',
  tag: 'button',
  trusted: true,
  purpose: 'verify-nav',
});

await test('attemptClick turns unreachable and throwing clicks into counted skips', () => {
  const unreachable = attemptClick(
    'p1',
    false,
    () => clickRecord,
    () => undefined,
  );
  assert.equal(unreachable.clicks.length, 0);
  assert.deepEqual(unreachable.skips, [{ path: 'p1', stage: 'trusted', reason: 'unreachable' }]);
  const threw = attemptClick(
    'p2',
    true,
    () => {
      throw new Error('click refused');
    },
    () => undefined,
  );
  assert.equal(threw.clicks.length, 0);
  assert.deepEqual(threw.skips, [{ path: 'p2', stage: 'trusted', reason: 'click-threw' }]);
  // Уборка после падения обязательна: её ошибка пробрасывается и доказывает вызов.
  assert.throws(
    () =>
      attemptClick(
        'p3',
        true,
        () => {
          throw new Error('click refused');
        },
        () => {
          throw new Error('cleanup-ran');
        },
      ),
    /cleanup-ran/,
  );
  const ok = attemptClick(
    'p4',
    true,
    () => clickRecord,
    () => undefined,
  );
  assert.equal(ok.clicks.length, 1);
  assert.equal(ok.skips.length, 0);
});
