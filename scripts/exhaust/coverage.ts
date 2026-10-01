/** Покрытие кода: V8 precise coverage через CDP WebSocket, развёртка на src/ по картам. */
import { execFileSync } from 'node:child_process';
import type { Browser } from '../ui-driver.ts';
import { parseMap, mapPosition, lineStartOffsets, positionOf } from './sourcemap.ts';

type CdpResult = Readonly<Record<string, unknown>>;

const sendOnce = (ws: WebSocket, method: string, params: Readonly<Record<string, unknown>>) =>
  new Promise<CdpResult>((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      ws.removeEventListener('message', onMessage);
      reject(new Error(`CDP timeout: ${method}`));
    }, 30_000);
    const onMessage = (event: MessageEvent) => {
      const msg = JSON.parse(String(event.data)) as Readonly<Record<string, unknown>>;
      if (msg.id !== id) return;
      clearTimeout(timer);
      ws.removeEventListener('message', onMessage);
      if ('error' in msg) reject(new Error(`${method}: ${JSON.stringify(msg.error)}`));
      else resolve((msg.result ?? {}) as CdpResult);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });

export type Cdp = Readonly<{
  send: (method: string, params?: Readonly<Record<string, unknown>>) => Promise<CdpResult>;
  screenshot: (fullPage: boolean) => Promise<string>;
  close: () => void;
}>;

export const connectCdp = (browser: Browser): Promise<Cdp> =>
  new Promise<Cdp>((resolve, reject) => {
    const url = browser.run('get', 'cdp-url');
    if (typeof url !== 'string') reject(new Error('cdp-url unavailable'));
    const ws = new WebSocket(String(url));
    const timer = setTimeout(() => reject(new Error('CDP ws timeout')), 10_000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      const send = (method: string, params: Readonly<Record<string, unknown>> = {}) =>
        sendOnce(ws, method, params);
      const screenshot = (fullPage: boolean) =>
        send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: fullPage,
        }).then((result) => String(result.data ?? ''));
      resolve({ send, screenshot, close: () => ws.close() });
    });
    ws.addEventListener('error', () => reject(new Error('CDP ws error')));
  });

export const startCoverage = (cdp: Cdp) =>
  cdp
    .send('Profiler.enable')
    .then(() => cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true }));

export type Range = Readonly<{ startOffset: number; endOffset: number; count: number }>;
export type FunctionCoverage = Readonly<{ functionName: string; ranges: readonly Range[] }>;
export type ScriptCoverage = Readonly<{ scriptId: string; url: string; functions: readonly FunctionCoverage[] }>;

const isRange = (v: unknown): v is Range =>
  typeof v === 'object' && v !== null && 'startOffset' in v && 'count' in v;

export const takeCoverage = (cdp: Cdp): Promise<readonly ScriptCoverage[]> =>
  cdp.send('Profiler.takePreciseCoverage').then((result) =>
    (Array.isArray(result.result) ? result.result : [])
      .filter((s): s is Readonly<Record<string, unknown>> => typeof s === 'object' && s !== null)
      .map((s) => ({
        scriptId: String(s.scriptId ?? ''),
        url: String(s.url ?? ''),
        functions: (Array.isArray(s.functions) ? s.functions : [])
          .filter((f): f is Readonly<Record<string, unknown>> => typeof f === 'object' && f !== null)
          .map((f) => ({
            functionName: String(f.functionName ?? ''),
            ranges: (Array.isArray(f.ranges) ? f.ranges : []).filter(isRange),
          })),
      })),
  );

export const stopCoverage = (cdp: Cdp) => cdp.send('Profiler.stopPreciseCoverage');

type FileCov = Readonly<{ covered: number; total: number; uncovered: readonly string[] }>;

const mapRange = (
  map: ReturnType<typeof parseMap>,
  starts: readonly number[],
  range: Range,
): readonly [string, number] | [] => {
  const start = positionOf(starts, range.startOffset);
  const hit = mapPosition(map, start.line, start.column);
  return hit ? [hit.source, hit.line] : [];
};

const scriptFileCoverage = (
  script: ScriptCoverage,
  mapText: string,
): ReadonlyMap<string, { covered: number; total: number; uncovered: string[] }> => {
  const map = parseMap(mapText);
  const perFile = new Map<string, { covered: number; total: number; uncovered: string[] }>();
  const jsText = execFileSync('cat', [`/dist/assets/${script.url.split('/').at(-1)}`], {
    encoding: 'utf8',
  });
  const starts = lineStartOffsets(jsText);
  const seen = new Set<string>();
  script.functions.forEach((fn) => {
    const first = fn.ranges.at(0);
    if (!first) return;
    const hit = mapRange(map, starts, first);
    if (!hit.length) return;
    const [file, line] = hit;
    const name = `${fn.functionName || '(anon)'}@${line}`;
    if (seen.has(`${file}|${name}`)) return;
    const covered = fn.ranges.some((r) => r.count > 0);
    const entry = perFile.get(file) ?? { covered: 0, total: 0, uncovered: [] };
    perFile.set(file, {
      covered: entry.covered + (covered ? 1 : 0),
      total: entry.total + 1,
      uncovered: covered ? entry.uncovered : [...entry.uncovered, name],
    });
    seen.add(`${file}|${name}`);
  });
  return perFile;
};

export const functionCoverage = (
  scripts: readonly ScriptCoverage[],
  distDir: string,
): ReadonlyMap<string, { covered: number; total: number; uncovered: string[] }> => {
  const bundle = scripts.find((s) => s.url.includes('/assets/') && s.url.endsWith('.js'));
  if (!bundle) return new Map();
  const file = bundle.url.split('/').at(-1) ?? '';
  const mapFile = `${distDir}/assets/${file}.map`;
  const mapText = execFileSync('cat', [mapFile], { encoding: 'utf8' });
  return scriptFileCoverage({ ...bundle, url: file }, mapText);
};

export const branchHits = (script: ScriptCoverage | undefined) =>
  (script?.functions ?? []).flatMap((fn) =>
    fn.ranges.slice(1).map((r) => ({ fn: fn.functionName, count: r.count })),
  );
