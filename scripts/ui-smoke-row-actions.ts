import assert from 'node:assert/strict';
import { evaluate, settleLayout, type Browser } from './ui-driver.ts';
import { record, type Finding } from './ui-smoke-dom.ts';

// Видимые действия строк вместо «⋯»: цель 44×44, внутри своей строки, имя с объектом и
// подсказкой, центр попадает в саму кнопку и не перекрывает сумму операции.
export function rowActionGeometry(browser: Browser, route: string): readonly Finding[] {
  settleLayout(browser);
  const observed = evaluate(
    browser,
    `(() => {
      const buttons = [...document.querySelectorAll('#main .row-action')].filter(button => button.checkVisibility());
      return { count: buttons.length, bad: buttons.map(button => {
        button.scrollIntoView({ block: 'center' });
        const row = button.closest('.history-row, .portfolio-record, li');
        const box = button.getBoundingClientRect();
        const area = row.getBoundingClientRect();
        const amount = row.querySelector(':scope > .record-summary')?.getBoundingClientRect();
        const overlaps = Boolean(amount) && !(box.right <= amount.left || box.left >= amount.right ||
          box.bottom <= amount.top || box.top >= amount.bottom);
        const hit = button.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
        const name = button.getAttribute('aria-label') ?? '';
        return { name, title: button.title, width: box.width, height: box.height, hit, overlaps,
          inside: box.left >= area.left - 1 && box.right <= area.right + 1 && box.top >= area.top - 1 && box.bottom <= area.bottom + 1 };
      }).filter(item => item.width < 44 || item.height < 44 || !item.hit || item.overlaps || !item.inside ||
        !item.title || !item.name.startsWith(item.title + ': ')) };
    })()`,
  );
  assert.ok(record(observed));
  const expected = route === 'history' || route === 'portfolios';
  const count = typeof observed.count === 'number' ? observed.count : 0;
  const bad = Array.isArray(observed.bad) ? observed.bad : [];
  return bad.length === 0 && (!expected || count > 1)
    ? []
    : [{ kind: 'row-action-geometry', path: `#main .row-action (${route})`, observed }];
}
