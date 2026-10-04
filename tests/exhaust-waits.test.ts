import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { routeReady } from '../scripts/exhaust/probe.ts';
import { sweepSource } from '../scripts/exhaust/page-sweep.ts';
import { domHelpers } from '../scripts/exhaust/page-dom.ts';

await test('routeReady требует hash и маркер aria-current одного коммита', () => {
  const expr = routeReady('#import');
  assert.ok(expr.includes('location.hash === "#import"'));
  assert.ok(expr.includes('a[href="#import"]'));
  assert.ok(expr.includes('aria-current="page"'));
  // h1 прежнего раздела остаётся в DOM до перемонта и не доказывает переход.
  assert.ok(!expr.includes('h1'));
});

await test('все ожидания маршрута на стороне прогонов используют метку коммита', () => {
  const sources = [
    ['sweep.ts', readFileSync('scripts/exhaust/sweep.ts', 'utf8')],
    ['walk-reach.ts', readFileSync('scripts/exhaust/walk-reach.ts', 'utf8')],
    ['trusted.ts', readFileSync('scripts/exhaust/trusted.ts', 'utf8')],
    ['run.ts', readFileSync('scripts/exhaust/run.ts', 'utf8')],
    ['matrix-actions.ts', readFileSync('scripts/exhaust/matrix-actions.ts', 'utf8')],
    ['axis-pass.ts', readFileSync('scripts/exhaust/axis-pass.ts', 'utf8')],
    ['envctl.ts', readFileSync('scripts/exhaust/envctl.ts', 'utf8')],
  ] as const;
  for (const [file, src] of sources)
    assert.ok(
      src.includes('routeReady') || src.includes('aria-current'),
      `${file}: ожидание hash или #main h1 пропускает незакоммиченный раздел`,
    );
  const smoke =
    readFileSync('scripts/ui-smoke.ts', 'utf8') +
    readFileSync('scripts/ui-smoke-context.ts', 'utf8');
  assert.ok(smoke.includes('aria-current'), 'smoke: навигация ждёт закоммиченный раздел');
});

await test('внутристраничный обход ждёт коммит раздела и открытие диалога', () => {
  assert.ok(domHelpers.includes('routeCommitted'), 'пробник восстановления маршрута');
  assert.ok(sweepSource.includes('routeCommitted(before.hash)'), 'restore после клика');
  assert.match(sweepSource, /waitFor\(\(\) => openDialogs\(\)\.some/, 'reopen ждёт диалог');
  assert.ok(sweepSource.includes('settleAfter'), 'поздний коммит не теряет «opened»');
});

await test('DemoModal коммитит закрытие внутри задачи события close', () => {
  const src = readFileSync('src/demo/modal.tsx', 'utf8');
  // «close» — недискретное событие: React откладывает и dispatch onClose,
  // и setState из него. Собственный слушатель с flushSync коммитит размонт
  // внутри задачи события — иначе повторный клик схлопывается в bail либо
  // устаревшее закрытие убивает свежий диалог.
  assert.ok(
    src.includes(`dialog.addEventListener('close', closed)`),
    'нужен собственный слушатель close, а не отложенный React onClose',
  );
  assert.ok(src.includes('flushSync('), 'слушатель обязан коммитить синхронно');
  assert.ok(
    src.indexOf(`dialog.removeEventListener('close', closed)`) <
      src.indexOf('if (dialog.open) dialog.close()'),
    'cleanup размонта снимает слушатель до dialog.close() — без flushSync из размонта',
  );
});

await test('схлопнутый батч «закрыть и открыть» возвращает диалог через openDialog', () => {
  const src = readFileSync('src/demo/modal.tsx', 'utf8');
  // Если состояние родителя оставило DemoModal смонтированным (батч до того же
  // значения без коммита), слушатель close обязан заново открыть диалог —
  // но не тогда, когда модальное место уже занял другой диалог.
  assert.match(
    src,
    /if \(dialog && !dialog\.open && !document\.querySelector\('dialog\[open\]'\)\)\s*openDialog\(dialog\.id\)/,
    'нужен охраняемый openDialog после синхронного коммита закрытия',
  );
});

await test('монтирование dialog не отнимает отбивку у последней секции панели', () => {
  const src = readFileSync('src/demo.css', 'utf8');
  // <dialog> монтируется последним ребёнком .sync-panel: селектор :last-child
  // снимал бы margin/padding/border секции при каждом открытии — страница
  // прыгает на ~52px и повторный клик летит в соседний элемент.
  assert.match(
    src,
    /\.sync-panel > section\.sync-actions:last-of-type/,
    'отбивка секции конфликта не должна зависеть от позиции смонтированного dialog',
  );
  assert.ok(
    !/\.sync-panel > \.sync-actions:last-child/.test(src),
    'dialog — последний ребёнок панели, :last-child теряет отбивку',
  );
});

await test('повторное открытие монтирует свежий диалог (nonce в key)', () => {
  const src = readFileSync('src/demo/sync-panel.tsx', 'utf8');
  // Событие close ставится в очередь: повторный клик до его задачи менял бы
  // open на true на том же смонтированном диалоге, а устаревшее событие
  // размонтировало бы его. Перемонтирование по nonce гарантирует, что
  // устаревший close приходит к снятому элементу.
  assert.match(
    src,
    /openNonce: current\.openNonce \+ 1/,
    'открытие обязано увеличивать nonce в состоянии конфликта',
  );
  assert.ok(src.includes('key={conflict.openNonce}'), 'SyncConflict перемонтируется по nonce');
});

await test('escapeDialog ждёт возврат фокуса условием, а не разовым снимком', () => {
  const src = readFileSync('scripts/ui-smoke-dialogs.ts', 'utf8');
  // После Escape размонт и restoreFocus — отдельный коммит; разовый evaluate
  // снимает состояние до коммита и на медленном хосте даёт ложную находку.
  assert.ok(
    /escapeDialog[\s\S]*?'wait'/.test(src),
    'после Escape нужно ждать closed и возврат фокуса на открыватель',
  );
  assert.ok(
    src.includes('document.activeElement === document.querySelector('),
    'ожидание обязано включать возврат фокуса на открыватель',
  );
});
