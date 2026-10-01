/** Кодовое покрытие: V8 precise coverage через CDP страницы, развёртка на src/ по картам. */
import type { Browser } from '../ui-driver.ts';
import { lineStartOffsets, mapPosition, offsetAt, parseMap } from './sourcemap.ts';
import type { SourceMap } from './sourcemap.ts';
import { asArray, asText, isRecord } from './guards.ts';

export type CdpResult = { readonly [key: string]: unknown };
export type CdpSend = (
  method: string,
  params?: Readonly<Record<string, unknown>>,
) => Promise<CdpResult>;
export type PageCdp = Readonly<{ send: CdpSend; close: () => void }>;

const cdpId = 1;

const sendOnce = (
  socket: WebSocket,
  method: string,
  params: Readonly<Record<string, unknown>>,
): Promise<CdpResult> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage);
      reject(new Error(`CDP timeout: ${method}`));
    }, 30_000);
    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      const msg: unknown = JSON.parse(event.data);
      if (!isRecord(msg) || msg.id !== cdpId) return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      if ('error' in msg) reject(new Error(`${method}: ${JSON.stringify(msg.error)}`));
      else resolve(isRecord(msg.result) ? msg.result : {});
    };
    socket.addEventListener('message', onMessage);
    socket.send(JSON.stringify({ id: cdpId, method, params }));
  });

const cdpUrlOf = (browser: Browser): string => {
  const raw: unknown = browser.run('get', 'cdp-url');
  if (!isRecord(raw) || typeof raw.cdpUrl !== 'string') throw new Error('cdp-url unavailable');
  return raw.cdpUrl;
};

const pageSocketOf = async (cdpUrl: string): Promise<string> => {
  const port = cdpUrl.match(/:(\d+)\//)?.at(1) ?? '';
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  const list: unknown = await response.json();
  const page = asArray(list).find((entry) => isRecord(entry) && entry.type === 'page');
  const socket = isRecord(page) ? page.webSocketDebuggerUrl : undefined;
  if (typeof socket !== 'string' || socket === '') throw new Error('page socket unavailable');
  return socket;
};

const openSocket = (url: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error('CDP socket timeout')), 10_000);
    socket.addEventListener('open', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.addEventListener('error', () => reject(new Error('CDP socket error')));
  });

/** Прямое соединение со страницей: числовые id (строковые прокси не отвечает). */
export const connectPage = async (browser: Browser): Promise<PageCdp> => {
  const socket = await openSocket(await pageSocketOf(cdpUrlOf(browser)));
  const send: CdpSend = (method, params = {}) => sendOnce(socket, method, params);
  return { send, close: () => socket.close() };
};

export const startCoverage = (send: CdpSend): Promise<unknown> =>
  send('Profiler.enable').then(() =>
    send('Profiler.startPreciseCoverage', { callCount: true, detailed: true }),
  );

export const stopCoverage = (send: CdpSend): Promise<unknown> =>
  send('Profiler.stopPreciseCoverage').then(() => send('Profiler.disable'));

export type Range = Readonly<{ startOffset: number; endOffset: number; count: number }>;
export type FunctionCoverage = Readonly<{
  functionName: string;
  ranges: readonly Range[];
}>;
export type ScriptCoverage = Readonly<{
  scriptId: string;
  url: string;
  functions: readonly FunctionCoverage[];
}>;

const asRange = (value: unknown): Range | null =>
  isRecord(value) &&
  typeof value.startOffset === 'number' &&
  typeof value.endOffset === 'number' &&
  typeof value.count === 'number'
    ? { startOffset: value.startOffset, endOffset: value.endOffset, count: value.count }
    : null;

const one = <T>(value: T | null): readonly T[] => (value === null ? [] : [value]);

const asFunction = (value: unknown): FunctionCoverage | null => {
  if (!isRecord(value)) return null;
  const name = typeof value.functionName === 'string' ? value.functionName : '';
  return {
    functionName: name,
    ranges: asArray(value.ranges).flatMap((entry) => one(asRange(entry))),
  };
};

export const takeCoverage = (send: CdpSend): Promise<readonly ScriptCoverage[]> =>
  send('Profiler.takePreciseCoverage').then((result) =>
    asArray(result.result).flatMap((entry) => {
      if (!isRecord(entry)) return [];
      return [
        {
          scriptId: asText(entry.scriptId),
          url: asText(entry.url),
          functions: asArray(entry.functions).flatMap((fn) => one(asFunction(fn))),
        },
      ];
    }),
  );

export type ScriptSource = Readonly<{ url: string; js: string; map: string }>;
export type FileReport = Readonly<{
  file: string;
  functionsCovered: number;
  functionsTotal: number;
  branchesCovered: number;
  branchesTotal: number;
  uncoveredFunctions: readonly string[];
}>;

type Hit = Readonly<{
  key: string;
  file: string;
  name: string;
  covered: boolean;
  branches: number;
  branchesCovered: number;
}>;

const sourcePath = (source: string): string =>
  source
    .split('/')
    .filter((part) => part !== '..' && part !== '.')
    .join('/');

const hitOf = (map: SourceMap, starts: readonly number[], fn: FunctionCoverage): readonly Hit[] => {
  const first = fn.ranges.at(0);
  if (first === undefined) return [];
  const pos = offsetAt(starts, first.startOffset);
  const hit = mapPosition(map, pos.line, pos.column);
  if (hit === null) return [];
  const file = sourcePath(hit.source);
  const name = `${fn.functionName === '' ? '(anon)' : fn.functionName}@${hit.line}`;
  const branches = fn.ranges.slice(1);
  return [
    {
      key: `${file}|${name}`,
      file,
      name,
      covered: fn.ranges.some((range) => range.count > 0),
      branches: branches.length,
      branchesCovered: branches.filter((range) => range.count > 0).length,
    },
  ];
};

const safeMap = (text: string): SourceMap | null => {
  try {
    const parsed: unknown = JSON.parse(text);
    return parseMap(parsed);
  } catch {
    return null;
  }
};

/** Отчёт по файлам: функции и ветви из бандла, отнесённые к src/ по карте. */
export const fileReports = (
  scripts: readonly ScriptCoverage[],
  sources: readonly ScriptSource[],
): readonly FileReport[] => {
  const bundles = scripts.filter(
    (script) => script.url.includes('/assets/') && script.url.endsWith('.js'),
  );
  return bundles.flatMap((script) => {
    const source = sources.find((item) => script.url.endsWith(item.url));
    const map = source === undefined ? null : safeMap(source.map);
    if (source === undefined || map === null) return [];
    const starts = lineStartOffsets(source.js);
    const hits = script.functions.flatMap((fn) => hitOf(map, starts, fn));
    const unique = hits.filter(
      (hit, index) => hits.findIndex((other) => other.key === hit.key) === index,
    );
    const files = [...new Set(unique.map((hit) => hit.file))];
    return files.map((file) => {
      const owned = unique.filter((hit) => hit.file === file);
      return {
        file,
        functionsCovered: owned.filter((hit) => hit.covered).length,
        functionsTotal: owned.length,
        branchesCovered: owned.reduce((sum, hit) => sum + hit.branchesCovered, 0),
        branchesTotal: owned.reduce((sum, hit) => sum + hit.branches, 0),
        uncoveredFunctions: owned
          .filter((hit) => !hit.covered)
          .map((hit) => hit.name)
          .toSorted(),
      };
    });
  });
};

/** Новые покрытые ключи file|fn@line между последовательными снимками. */
export const newlyCovered = (
  prev: readonly FileReport[],
  next: readonly FileReport[],
): readonly string[] => {
  const keys = (reports: readonly FileReport[]) =>
    reports.flatMap((report) =>
      report.uncoveredFunctions.map((fn) => `${report.file}|${fn}`),
    );
  const before = new Set(keys(prev));
  const after = new Set(keys(next));
  return [...before].filter((key) => !after.has(key)).toSorted();
};

const getText = async (url: string): Promise<string | null> => {
  const response = await fetch(url);
  return response.ok ? response.text() : null;
};

/** Текст бандла и его карты по HTTP: fs с вычисляемым путём запрещён правилами. */
export const fetchSource = async (url: string): Promise<ScriptSource | null> => {
  const js = await getText(url);
  if (js === null) return null;
  const map = (await getText(`${url}.map`)) ?? '';
  return { url: url.split('/').at(-1) ?? url, js, map };
};


