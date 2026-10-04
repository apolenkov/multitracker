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

await test('DemoModal перевыставляет open после каждого коммита, не только при монте', () => {
  const src = readFileSync('src/demo/modal.tsx', 'utf8');
  // Схлопнутое React-пакетом «Escape → повторное открытие» не перемонтирует
  // компонент: эффект монтирования не перезапускается, и без второго вызова
  // openDialog диалог остался бы закрытым при open:true навсегда.
  assert.ok(
    (src.match(/openDialog\(/g) ?? []).length >= 2,
    'нужен вызов openDialog вне эффекта монтирования',
  );
  assert.ok(
    /useEffect\(\(\) => \{\s*const dialog = ref\.current;\s*if \(dialog && !dialog\.open\) openDialog\(dialog\.id\);\s*\}\);/.test(
      src,
    ),
    'эффект без зависимостей обязан заново открывать закрытый dialog',
  );
});
