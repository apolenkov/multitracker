import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import type { ExecFileSyncOptionsWithStringEncoding } from 'node:child_process';

function object(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function data(output: string): unknown {
  const envelope: unknown = JSON.parse(output);
  assert.ok(object(envelope), 'CLI: ответ не является объектом');
  assert.equal(envelope.success, true, `CLI: ${output}`);
  assert.ok('data' in envelope, 'CLI: отсутствует data');
  return envelope.data;
}

function execute(args: readonly string[], options: ExecFileSyncOptionsWithStringEncoding) {
  try {
    return execFileSync('agent-browser', args, options);
  } catch (error: unknown) {
    const output = object(error) && typeof error.stdout === 'string' ? error.stdout : '';
    throw new Error(`agent-browser ${args.join(' ')}: ${output}`, { cause: error });
  }
}

export function createBrowser() {
  const version = execute(['--version'], { encoding: 'utf8' }).trim();
  assert.equal(version, 'agent-browser 0.38.1', 'Нужен проверенный agent-browser 0.38.1');
  const session = execute(
    ['session', 'id', '--scope', 'worktree', '--prefix', `task-${Date.now()}-${process.pid}`],
    { encoding: 'utf8' },
  ).trim();
  assert.match(session, /^[a-zA-Z0-9-]+$/);
  const namespace = `mtui${process.pid}`;
  const env = { ...process.env, AGENT_BROWSER_SESSION: session };
  execute(['skills', 'get', 'core'], { env, encoding: 'utf8' });
  const run = (...args: readonly string[]): unknown =>
    data(
      execute(['--namespace', namespace, '--json', ...args], {
        env,
        encoding: 'utf8',
        timeout: 35_000,
        maxBuffer: 2 * 1024 * 1024,
      }),
    );
  return { run, session, namespace, version, env };
}

export type Browser = ReturnType<typeof createBrowser>;

export function batch(
  browser: Browser,
  commands: readonly (readonly string[])[],
): readonly unknown[] {
  const output = execute(['--namespace', browser.namespace, 'batch', '--bail', '--json'], {
    env: browser.env,
    input: JSON.stringify(commands),
    encoding: 'utf8',
    timeout: 35_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const envelopes: unknown = JSON.parse(output);
  assert.ok(Array.isArray(envelopes), 'batch: ответ не является массивом');
  assert.equal(envelopes.length, commands.length, 'batch: последовательность не завершена');
  return envelopes.map((envelope: unknown) => {
    assert.ok(object(envelope) && 'result' in envelope, 'batch: отсутствует result');
    return data(JSON.stringify({ ...envelope, data: envelope.result }));
  });
}

// Общий гейт готовности раскладки для всех геометрических замеров.
// Только getAnimations недостаточно: замер в контейнере показал окна, где
// пересчёт раскладки ещё идёт при нуле running-анимаций (хвост transition на
// ::details-content двигает высоты после конца анимации), плюс поздняя подмена
// font-display:swap. Ждём: нет running/pending-анимаций на всей странице,
// document.fonts.status === 'loaded' и неизменная геометрия (высота/ширина
// документа и позиция точки пробы) два кадра подряд по счётчику rAF.
// Бюджет — таймаут wait --fn: нестабильная раскладка — громкий сбой, а не
// молчаливый замер на движущейся странице.
export function settleLayout(browser: Browser, selector = 'body') {
  browser.run(
    'wait',
    '--fn',
    `(() => {
      const w = window;
      if (!w.__mtBeat) {
        w.__mtBeat = { n: 0 };
        requestAnimationFrame(function tick() { w.__mtBeat.n += 1; requestAnimationFrame(tick); });
      }
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target || document.fonts.status !== 'loaded') return false;
      if (!document.body.getAnimations({subtree:true}).every(animation => animation.playState !== 'running' && !animation.pending)) return false;
      const box = target.getBoundingClientRect();
      const signature = [document.documentElement.scrollHeight, document.documentElement.scrollWidth, box.top + scrollY, box.left + scrollX].join('|');
      const s = w.__mtSettle ?? (w.__mtSettle = { signature: '', beat: -1 });
      if (s.signature !== signature) { s.signature = signature; s.beat = w.__mtBeat.n; return false; }
      return w.__mtBeat.n - s.beat >= 2;
    })()`,
  );
}

export function evaluate(browser: Browser, source: string): unknown {
  const result = data(
    execute(['--namespace', browser.namespace, '--json', 'eval', '--stdin'], {
      env: browser.env,
      input: source,
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 2 * 1024 * 1024,
    }),
  );
  assert.ok(object(result) && 'result' in result, 'eval: отсутствует result');
  return result.result;
}
