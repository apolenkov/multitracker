/** Кодовое покрытие: развёртка V8-отсчётов на src/ по картам, сведение снимков. */
import { lineStartOffsets, mapPosition, offsetAt, parseMap } from './sourcemap.ts';
import type { SourceMap } from './sourcemap.ts';
import type { FunctionCoverage, Range, ScriptCoverage } from './cdp.ts';

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

const fileReport = (file: string, owned: readonly Hit[]): FileReport => ({
  file,
  functionsCovered: owned.filter((hit) => hit.covered).length,
  functionsTotal: owned.length,
  branchesCovered: owned.reduce((sum, hit) => sum + hit.branchesCovered, 0),
  branchesTotal: owned.reduce((sum, hit) => sum + hit.branches, 0),
  uncoveredFunctions: owned
    .filter((hit) => !hit.covered)
    .map((hit) => hit.name)
    .toSorted(),
});

const scriptHits = (script: ScriptCoverage, sources: readonly ScriptSource[]): readonly Hit[] => {
  const source = sources.find((item) => script.url.endsWith(item.url));
  const map = source === undefined ? null : safeMap(source.map);
  if (source === undefined || map === null) return [];
  return script.functions.flatMap((fn) => hitOf(map, lineStartOffsets(source.js), fn));
};

const uniqueHits = (hits: readonly Hit[]): readonly Hit[] =>
  hits.filter((hit, index) => hits.findIndex((other) => other.key === hit.key) === index);

/** Отчёт по файлам src/: функции и ветви из бандла, отнесённые к исходникам по карте. */
export const fileReports = (
  scripts: readonly ScriptCoverage[],
  sources: readonly ScriptSource[],
): readonly FileReport[] => {
  const bundles = scripts.filter(
    (script) => script.url.includes('/assets/') && script.url.endsWith('.js'),
  );
  const hits = uniqueHits(bundles.flatMap((script) => scriptHits(script, sources)));
  return [...new Set(hits.map((hit) => hit.file))]
    .filter((file) => file.startsWith('src/'))
    .map((file) =>
      fileReport(
        file,
        hits.filter((hit) => hit.file === file),
      ),
    )
    .toSorted((a, b) => a.file.localeCompare(b.file));
};

const fnKey = (fn: FunctionCoverage): string =>
  `${fn.functionName}@${fn.ranges.at(0)?.startOffset ?? 0}`;

const mergeRanges = (a: readonly Range[], b: readonly Range[]): readonly Range[] =>
  a.map((range, index) => ({ ...range, count: Math.max(range.count, b.at(index)?.count ?? 0) }));

const mergeFunctions = (
  prev: readonly FunctionCoverage[],
  next: readonly FunctionCoverage[],
): readonly FunctionCoverage[] => {
  const merged = next.map((fn) => {
    const old = prev.find((item) => fnKey(item) === fnKey(fn));
    return old === undefined ? fn : { ...fn, ranges: mergeRanges(fn.ranges, old.ranges) };
  });
  const gone = prev.filter((item) => !next.some((fn) => fnKey(fn) === fnKey(item)));
  return [...merged, ...gone];
};

/** Сведение снимков: takePreciseCoverage обнуляет счётчики, поэтому считаем ИЛИ по отрезкам. */
export const mergeScripts = (
  prev: readonly ScriptCoverage[],
  next: readonly ScriptCoverage[],
): readonly ScriptCoverage[] => {
  const merged = next.map((script) => {
    const old = prev.find((item) => item.scriptId === script.scriptId);
    return old === undefined
      ? script
      : { ...script, functions: mergeFunctions(old.functions, script.functions) };
  });
  const gone = prev.filter((item) => !next.some((script) => script.scriptId === item.scriptId));
  return [...merged, ...gone];
};

/** Новые покрытые ключи file|fn@line между последовательными снимками. */
export const newlyCovered = (
  prev: readonly FileReport[],
  next: readonly FileReport[],
): readonly string[] => {
  const keys = (reports: readonly FileReport[]) =>
    reports.flatMap((report) => report.uncoveredFunctions.map((fn) => `${report.file}|${fn}`));
  const before = new Set(keys(prev));
  const after = new Set(keys(next));
  return [...before].filter((key) => !after.has(key)).toSorted();
};

const pct = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

/** Сводка покрытия кода: таблица по файлам, итоги и список непокрытых функций. */
export const codeMarkdown = (reports: readonly FileReport[]): string => {
  const head = ['# Code coverage', '', '| file | functions | branches |', '| --- | --- | --- |'];
  const rows = reports.map(
    (report) =>
      `| ${report.file} | ${report.functionsCovered}/${report.functionsTotal} | ${report.branchesCovered}/${report.branchesTotal} |`,
  );
  const fns = reports.reduce((sum, report) => sum + report.functionsCovered, 0);
  const fnsTotal = reports.reduce((sum, report) => sum + report.functionsTotal, 0);
  const br = reports.reduce((sum, report) => sum + report.branchesCovered, 0);
  const brTotal = reports.reduce((sum, report) => sum + report.branchesTotal, 0);
  const open = reports.flatMap((report) =>
    report.uncoveredFunctions.map((fn) => `${report.file}|${fn}`),
  );
  return [
    ...head,
    ...rows,
    '',
    `Total: ${fns}/${fnsTotal} functions (${pct(fns, fnsTotal)}%), ${br}/${brTotal} branches (${pct(br, brTotal)}%)`,
    '',
    ...open.map((key) => `- ${key}`),
  ].join('\n');
};

const getText = async (url: string): Promise<string | null> => {
  const response = await fetch(url);
  return response.ok ? await response.text() : null;
};

/** Текст бандла и его карты по HTTP: fs с вычисляемым путём запрещён правилами. */
export const fetchSource = async (url: string): Promise<ScriptSource | null> => {
  const js = await getText(url);
  if (js === null) return null;
  const map = (await getText(`${url}.map`)) ?? '';
  return { url: url.split('/').at(-1) ?? url, js, map };
};
