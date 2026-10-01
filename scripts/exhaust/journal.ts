/** Журнал кликов: объединение перечисления с обходом и записи по сигнатурам. */
import { dialogOf, elementSignature } from './signature.ts';
import { record } from './records.ts';
import type { ClickRecord } from './records.ts';
import type { Env } from './axes.ts';
import type { Enumerated, SweepHit } from './page-rows.ts';
import type { RegistryInput } from './registry.ts';

const fallbackEnumerated = (path: string): Enumerated => ({
  path,
  role: '',
  name: '',
  tag: '',
  visible: false,
  disabled: false,
  skip: '',
});

const hitSkip = (hits: readonly SweepHit[], path: string): string =>
  hits.find((hit) => hit.path === path)?.skipped ?? 'not-visited';

/** Объединение перечисления и обхода по пути: одна запись на элемент раздела. */
export const joinSeen = (
  route: string,
  items: readonly Enumerated[],
  hits: readonly SweepHit[],
): readonly RegistryInput[] => {
  const paths = [...new Set([...items.map((item) => item.path), ...hits.map((hit) => hit.path)])];
  return paths.map((path) => {
    const info = items.find((item) => item.path === path) ?? fallbackEnumerated(path);
    return {
      route,
      path,
      role: info.role,
      name: info.name,
      tag: info.tag,
      visible: info.visible,
      disabled: info.disabled,
      skip: hitSkip(hits, path),
    };
  });
};

const signatureFor = (item: RegistryInput): string =>
  elementSignature({
    route: item.route,
    dialog: dialogOf(item.path),
    role: item.role,
    name: item.name,
    path: item.path,
  });

/** Сигнатуры кликнутых: те же ключи, что уйдут в реестр. */
export const clickedSignatures = (seen: readonly RegistryInput[]): readonly string[] =>
  seen.filter((item) => item.skip === '').map((item) => signatureFor(item));

const blankItem: RegistryInput = {
  route: '',
  path: '',
  role: '',
  name: '',
  tag: '',
  visible: false,
  disabled: false,
  skip: '',
};

const hitState = (hit: SweepHit): Readonly<Record<string, unknown>> => ({
  b: hit.before,
  a: hit.after,
  dlg: hit.dialogs,
  err: hit.errors,
  warn: hit.warnings,
  dur: hit.duration,
  inv: hit.findings,
});

const hitMeta = (item: RegistryInput, hit: SweepHit) => ({
  role: hit.meta?.role ?? item.role,
  name: hit.meta?.name ?? item.name,
  tag: hit.meta?.tag ?? item.tag,
  trusted: false,
  purpose: hit.purpose,
});

const hitRecord = (
  route: string,
  env: Env,
  seq: number,
  item: RegistryInput,
  hit: SweepHit,
): ClickRecord => record(seq, env, route, hitState(hit), signatureFor(item), hitMeta(item, hit));

/** По одной записи на реальный клик обхода: повторные проходы тоже логируются. */
export const hitClicks = (
  route: string,
  env: Env,
  start: number,
  seen: readonly RegistryInput[],
  hits: readonly SweepHit[],
): readonly ClickRecord[] =>
  hits
    .filter((hit) => hit.skipped === '')
    .map((hit, index) =>
      hitRecord(
        route,
        env,
        start + index,
        seen.find((item) => item.path === hit.path) ?? { ...blankItem, route, path: hit.path },
        hit,
      ),
    );

/** Карта «диалог → путь открывшего его элемента» для фазы донабора. */
export const openersOf = (hits: readonly SweepHit[]): Readonly<Record<string, string>> =>
  Object.fromEntries(
    hits
      .filter((hit) => hit.opened !== '')
      .map((hit) => [hit.opened, hit.path] as const)
      .filter(([id], index, rows) => rows.findIndex((row) => row[0] === id) === index),
  );
