import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import { inspectDom, type DomReport } from './ui-dom-audit.ts';

export type Control = Readonly<{
  path: string;
  name: string;
  role: string;
  eligible: boolean;
  visible: boolean;
  disabled: boolean;
  modalScope: string;
  bounds: Readonly<{ x: number; y: number; width: number; height: number }>;
  hit: unknown;
}>;
export type Finding = Readonly<{ kind: string; path: string; observed: unknown }>;
export type Entry = Readonly<{
  state: string;
  path: string;
  name: string;
  status: 'tested' | 'skipped' | 'failed';
  reason: string;
  observed: unknown;
}>;
export type State = Readonly<{ id: string; route: string; width: number; theme: string }>;
export type Outcome = Readonly<{
  entries: readonly Entry[];
  findings: readonly Finding[];
}>;
export function record(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function controls(dom: DomReport): readonly Control[] {
  return dom.controls.map((item) => {
    assert.ok(typeof item.path === 'string' && typeof item.name === 'string');
    assert.ok(typeof item.role === 'string' && typeof item.eligible === 'boolean');
    assert.ok(typeof item.visible === 'boolean' && typeof item.disabled === 'boolean');
    assert.ok(typeof item.modalScope === 'string' && record(item.bounds));
    const { x, y, width, height } = item.bounds;
    assert.ok([x, y, width, height].every((value) => typeof value === 'number'));
    assert.ok(typeof x === 'number' && typeof y === 'number');
    assert.ok(typeof width === 'number' && typeof height === 'number');
    return {
      ...item,
      path: item.path,
      name: item.name,
      role: item.role,
      eligible: item.eligible,
      visible: item.visible,
      disabled: item.disabled,
      modalScope: item.modalScope,
      bounds: { x, y, width, height },
      hit: item.hit,
    };
  });
}
export function inspect(browser: Browser) {
  const dom = inspectDom(browser);
  return { dom, controls: controls(dom) };
}
export function query(browser: Browser, selector: string, expression: string): unknown {
  return evaluate(
    browser,
    `(() => { const element = document.querySelector(${JSON.stringify(selector)}); return ${expression}; })()`,
  );
}
export function entry(
  state: State,
  control: Control,
  status: Entry['status'],
  reason: string,
  observed: unknown = null,
): Entry {
  return { state: state.id, path: control.path, name: control.name, status, reason, observed };
}
export function merge(outcomes: readonly Outcome[]): Outcome {
  return {
    entries: outcomes.flatMap((item) => item.entries),
    findings: outcomes.flatMap((item) => item.findings),
  };
}
