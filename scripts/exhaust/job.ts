/** Задание внутри страницы: запуск в слот, опрос с бюджетом, диагностика зависания. */
import type { Browser } from '../ui-driver.ts';
import { evaluate } from '../ui-driver.ts';
import { asArray, asText, isRecord } from './guards.ts';

const SLOT = 'window.__mtJob';

const kick = (browser: Browser, source: string, opts: string) =>
  evaluate(
    browser,
    `${SLOT} = null; (${source})(${opts}).then((r) => { ${SLOT} = r; }, (e) => { ${SLOT} = { error: String(e) }; }); 'started'`,
  );

const jobStatus = (browser: Browser): string =>
  asText(
    evaluate(browser, `${SLOT} === undefined ? 'none' : ${SLOT} === null ? 'pending' : 'ready'`),
  );

// Диагностика зависшего задания: слот, адрес, готовность документа, открытые диалоги.
const whereNow = (browser: Browser): string =>
  asText(
    evaluate(
      browser,
      `JSON.stringify({ slot: String(${SLOT}), href: location.href, ready: document.readyState, dialogs: document.querySelectorAll('dialog[open]').length })`,
    ),
  );

const awaitJob = (browser: Browser, left: number): unknown => {
  if (jobStatus(browser) === 'ready') return evaluate(browser, SLOT);
  if (left <= 0) throw new Error(`in-page job did not finish in time: ${whereNow(browser)}`);
  try {
    browser.run('wait', '--fn', `${SLOT} !== null && ${SLOT} !== undefined`);
  } catch {
    // Таймаут опроса не равен сбою работы: проверяем слот ещё раз.
  }
  return awaitJob(browser, left - 1);
};

const attempt = (browser: Browser, source: string, opts: Readonly<Record<string, unknown>>) => {
  console.error(`exhaust: job ${whereNow(browser)} done=${asArray(opts.done).length}`);
  kick(browser, source, JSON.stringify(opts));
  // Опрос ждёт не меньше бюджета самого задания: иначе исправное задание
  // объявляется зависшим ровно потому, что ему разрешили работать долго.
  const budget = typeof opts.budget === 'number' ? opts.budget : 20_000;
  return awaitJob(browser, Math.ceil(budget / 10_000) + 12);
};

export const runJob = (
  browser: Browser,
  source: string,
  opts: Readonly<Record<string, unknown>>,
): unknown => {
  const result = (() => {
    try {
      return attempt(browser, source, opts);
    } catch (error) {
      // Опрос может не увидеть слот, если страница перезагрузилась: задание повторяется один раз.
      console.error(`exhaust: retry after ${String(error)}`);
      return attempt(browser, source, opts);
    }
  })();
  if (isRecord(result) && typeof result.error === 'string')
    throw new Error(`page job: ${result.error}`);
  return result;
};
