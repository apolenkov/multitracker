/** CDP-транспорт страницы: сокет, точечные вызовы и сбор V8 precise coverage. */
import type { Browser } from '../ui-driver.ts';
import { asArray, asText, isRecord } from './guards.ts';

export type CdpResult = Readonly<Record<string, unknown>>;
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
  const port = /:(\d+)\//.exec(cdpUrl)?.at(1) ?? '';
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
