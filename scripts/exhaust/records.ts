/** Журнал кликов JSONL и артефакты запуска (папка docs/audits/<дата>-exhaust/<run>). */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { Env } from './axes.ts';

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

export type ElementSeen = Readonly<{
  signature: string;
  route: string;
  dialog: string;
  role: string;
  name: string;
  tag: string;
  path: string;
  visible: boolean;
  disabled: boolean;
  scope: string;
}>;

const stamp = new Date().toISOString().slice(0, 10);
const runId = `${Date.now().toString(36)}-${process.pid}`;
export const outDir = resolve(`docs/audits/${stamp}-exhaust/${runId}`);
execFileSync('mkdir', ['-p', outDir]);
execFileSync('mkdir', ['-p', `${outDir}/shots`]);

const artifact = (name: string, text: string) => {
  if (!/^[a-zA-Z0-9.-]+$/.test(name)) throw new Error(`unsafe artifact name ${name}`);
  execFileSync('tee', [resolve(outDir, name)], { input: text, stdio: ['pipe', 'ignore', 'pipe'] });
};

export const appendJsonl = (name: string, rows: readonly unknown[]) =>
  rows.length > 0 &&
  execFileSync('tee', ['-a', resolve(outDir, name)], {
    input: rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
    stdio: ['pipe', 'ignore', 'pipe'],
  });

export const saveJson = (name: string, value: unknown) =>
  artifact(name, JSON.stringify(value, null, 2));

export const saveText = (name: string, text: string) => artifact(name, text);

export const shotName = (hash: string, suffix: string) =>
  `shots/${hash.replace(/[^a-zA-Z0-9_-]/g, '_')}${suffix}.png`;

const isFinding = (value: unknown): value is Finding =>
  typeof value === 'object' && value !== null && 'rule' in value && 'actual' in value;

const strings = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)))
    : [];

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
  stateBefore: String(item.b ?? ''),
  stateAfter: String(item.a ?? ''),
  dialogOpen: strings(item.dlg),
  consoleErrors: strings(item.err),
  consoleWarnings: strings(item.warn),
  duration: typeof item.dur === 'number' ? item.dur : 0,
  shifted: strings(item.moved),
  design: Array.isArray(item.design) ? item.design.filter(isFinding) : [],
  shot: typeof item.shot === 'string' ? item.shot : '',
});
