/** Журнал кликов JSONL и артефакты запуска (папка docs/audits/<дата>-exhaust/<run>). */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { Env } from './axes.ts';
import { asArray, asText, isRecord } from './guards.ts';

export type Finding = Readonly<{
  rule: string;
  selector: string;
  expected: string;
  actual: string;
}>;

export type ClickRecord = Readonly<{
  seq: number;
  route: string;
  env: Env;
  signature: string;
  role: string;
  name: string;
  tag: string;
  trusted: boolean;
  stateBefore: string;
  stateAfter: string;
  dialogOpen: readonly string[];
  consoleErrors: readonly string[];
  consoleWarnings: readonly string[];
  duration: number;
  purpose: string;
  shifted: readonly string[];
  design: readonly Finding[];
  shot: string;
}>;

/**
 * Пропущенный проверочный клик: доверенная выборка или шаг блуждания.
 * Пропуск — не падение, но обязан быть видимым в отчёте и посчитанным.
 */
export type ClickSkip = Readonly<{
  path: string;
  stage: 'trusted' | 'walk';
  reason: 'unreachable' | 'click-threw' | 'settle-timeout';
}>;

export type RunLog = Readonly<{
  dir: string;
  appendClicks: (rows: readonly ClickRecord[]) => void;
  saveJson: (name: string, value: unknown) => void;
  saveText: (name: string, text: string) => void;
}>;

const checkName = (name: string) => {
  if (!/^[a-zA-Z0-9.-]+$/.test(name)) throw new Error(`unsafe artifact name ${name}`);
};

/** Каталог запуска; запись идёт через tee/mkdir, а не fs: путь вычисляемый. */
export const createRunLog = (auditsDir: string, stamp: string, runId: string): RunLog => {
  const dir = resolve(auditsDir, `${stamp}-exhaust`, runId);
  execFileSync('mkdir', ['-p', dir]);
  execFileSync('mkdir', ['-p', resolve(dir, 'shots')]);
  const write = (name: string, text: string, append: boolean) => {
    checkName(name);
    const args = append ? ['-a', resolve(dir, name)] : [resolve(dir, name)];
    execFileSync('tee', args, { input: text, stdio: ['pipe', 'ignore', 'pipe'] });
  };
  return {
    dir,
    appendClicks: (rows) => {
      if (rows.length > 0) {
        write('clicks.jsonl', `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, true);
      }
    },
    saveJson: (name, value) => write(name, JSON.stringify(value, null, 2), false),
    saveText: (name, text) => write(name, text, false),
  };
};

export const shotName = (hash: string, suffix: string) =>
  `shots/${hash.replace(/[^a-zA-Z0-9_-]/g, '_')}${suffix}.png`;

const isFinding = (value: unknown): value is Finding =>
  isRecord(value) &&
  typeof value.rule === 'string' &&
  typeof value.selector === 'string' &&
  typeof value.expected === 'string' &&
  typeof value.actual === 'string';

const strings = (value: unknown): readonly string[] => asArray(value).map((entry) => asText(entry));

const findingsOf = (item: Readonly<Record<string, unknown>>): readonly Finding[] =>
  [...asArray(item.inv), ...asArray(item.design)].flatMap((entry) =>
    isFinding(entry) ? [entry] : [],
  );

const recordState = (item: Readonly<Record<string, unknown>>) => ({
  stateBefore: asText(item.b),
  stateAfter: asText(item.a),
  dialogOpen: strings(item.dlg),
  consoleErrors: strings(item.err),
  consoleWarnings: strings(item.warn),
  duration: typeof item.dur === 'number' ? item.dur : 0,
  shifted: asArray(item.moved).map((entry) => JSON.stringify(entry)),
  design: findingsOf(item),
  shot: asText(item.shot),
});

export const record = (
  seq: number,
  env: Env,
  route: string,
  item: Readonly<Record<string, unknown>>,
  signature: string,
  meta: Readonly<{ role: string; name: string; tag: string; trusted: boolean; purpose: string }>,
): ClickRecord => ({
  seq,
  route,
  env,
  signature,
  role: meta.role,
  name: meta.name,
  tag: meta.tag,
  trusted: meta.trusted,
  purpose: meta.purpose,
  ...recordState(item),
});
