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
