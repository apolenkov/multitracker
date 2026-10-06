// Быстрые модульные проверки суженного исключения шапки диалога (R1/R2):
// чистые предикаты dom-rules кормятся реальной геометрией цепочек предков,
// а проводка доказана встраиванием в страницу и живой проверкой
// dialogs:heading-exemption-scope (ui-heading-checks.ts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dialogHeadingClear, overlapExempt, scrollFrees } from '../scripts/exhaust/dom-rules.ts';
import { designScanSource } from '../scripts/exhaust/page-design.ts';
import { structural } from '../scripts/exhaust/page-structure.ts';

/** Узел цепочки предков: позиция слоя, overflowY, текущий ход скроллера. */
type Node = Readonly<{
  position: string;
  overflowY: string;
  scrollTop: number;
  parentElement: Node | null;
}>;

/**
 * Собирает цепочку DOM-предков снизу вверх: el — проверяемый текст, кортежи
 * ancestors идут от ближайшего родителя к корню как [position, overflowY,
 * scrollTop]. Зеркалит buy-dialog: label → .form-field → form → dialog.
 */
const dom = (
  elPosition: string,
  ...ancestors: readonly (readonly [string, string, number])[]
): Node => ({
  position: elPosition,
  overflowY: 'visible',
  scrollTop: 0,
  parentElement: ancestors.reduceRight<Node | null>(
    (parent, [position, overflowY, scrollTop]) => ({
      position,
      overflowY,
      scrollTop,
      parentElement: parent,
    }),
    null,
  ),
});

const id = (n: Node): Node => n;

await test('scrollFrees frees flow text only through a scrolled unpinned scroller', () => {
  // Цепочка метки в buy-dialog на 375 (FORM-031): .form-field → form →
  // dialog{position:fixed; overflow:auto} — диалог прокручен автофокусом.
  assert.equal(
    scrollFrees(
      dom('static', ['static', 'visible', 0], ['static', 'visible', 0], ['fixed', 'auto', 42]),
      id,
    ),
    true,
  );
  // Внутренний скроллер прокручен — освобождает, даже если диалог не крутился.
  assert.equal(scrollFrees(dom('static', ['static', 'auto', 30], ['fixed', 'auto', 0]), id), true);
});

await test('scrollFrees keeps non-scrollable and pinned text as a finding', () => {
  // Диалог без прокрутки: перекрытие откруткой не убрать.
  assert.equal(
    scrollFrees(dom('static', ['static', 'visible', 0], ['fixed', 'auto', 0]), id),
    false,
  );
  // Закреплённый предок (липкий подслой): текст под ним неподвижен.
  assert.equal(
    scrollFrees(dom('static', ['sticky', 'visible', 0], ['fixed', 'auto', 42]), id),
    false,
  );
  // Сам элемент закреплён (fixed-плашка поверх шапки).
  assert.equal(scrollFrees(dom('fixed', ['fixed', 'auto', 42]), id), false);
  // В цепочке нет скроллера — открутить некуда.
  assert.equal(scrollFrees(dom('static', ['static', 'visible', 0]), id), false);
  // overflow:hidden не считается пользовательской прокруткой.
  assert.equal(scrollFrees(dom('static', ['static', 'hidden', 9]), id), false);
});

await test('dialogHeadingClear exempts only a foreign text scrolling out of an opaque heading', () => {
  // (d) задуманный случай: непрозрачная шапка, чужой текст, откручиваемый.
  assert.equal(dialogHeadingClear(true, false, true), true);
  // (a) прозрачная шапка — исключения нет, вердикт уходит в стек слоёв.
  assert.equal(dialogHeadingClear(false, false, true), false);
  // (b) текст самой шапки (заголовок под крестиком) — находка.
  assert.equal(dialogHeadingClear(true, true, true), false);
  // (c) нескроллируемое перекрытие под непрозрачной шапкой — находка.
  assert.equal(dialogHeadingClear(true, false, false), false);
});

await test('overlapExempt honours the composed heading flag, no more unconditional absolution', () => {
  // Внутри dialog{position:fixed} fixedNear-асимметрии нет: единственный путь —
  // составной флаг caller'а head !== null && dialogHeadingClear(...).
  const flag = (paints: boolean, ownText: boolean, scrolls: boolean): boolean =>
    dialogHeadingClear(paints, ownText, scrolls);
  assert.equal(overlapExempt(true, true, false, false, false, flag(true, false, true)), true);
  // (a)-(c): флаг ложный — исключение не срабатывает, решение остаётся за стеком.
  assert.equal(overlapExempt(true, true, false, false, false, flag(false, false, true)), false);
  assert.equal(overlapExempt(true, true, false, false, false, flag(true, true, true)), false);
  assert.equal(overlapExempt(true, true, false, false, false, flag(true, false, false)), false);
  assert.equal(overlapExempt(true, true, false, false, false, false), false);
});

await test('the narrowed gate is wired into the in-page scan, not only into unit tests', () => {
  assert.ok(structural.includes('dialogHeadingClear('));
  assert.ok(structural.includes('scrollFrees('));
  assert.ok(designScanSource.includes('const scrollFrees ='));
  assert.ok(designScanSource.includes('const dialogHeadingClear ='));
});
