/** Реестр покрытия элементов: кто кликнут, кто нет и почему. */
import { dialogOf, elementSignature } from './signature.ts';

export type RegistryInput = Readonly<{
  route: string;
  role: string;
  name: string;
  tag: string;
  path: string;
  visible: boolean;
  disabled: boolean;
  skip: string;
}>;

export type RegistryEntry = Readonly<{
  signature: string;
  route: string;
  dialog: string;
  role: string;
  name: string;
  tag: string;
  clicked: boolean;
  reason: string;
}>;

export type SectionCoverage = Readonly<{
  route: string;
  seen: number;
  clicked: number;
  uncovered: readonly string[];
}>;

const skipReasons = new Map([
  ['hidden', 'not visible'],
  ['disabled', 'disabled'],
  ['closed-disclosure', 'inside closed details'],
  ['background', 'behind open dialog'],
  ['shared-chrome', 'shared chrome, exercised via navigation'],
]);

const skipReason = (skip: string): string => skipReasons.get(skip) ?? skip;

const signatureOf = (item: RegistryInput): string =>
  elementSignature({
    route: item.route,
    dialog: dialogOf(item.path),
    role: item.role,
    name: item.name,
    path: item.path,
  });

const unclickedReason = (items: readonly RegistryInput[]): string => {
  const skipped = items.find((item) => item.skip !== '');
  const item = skipped ?? items.at(0);
  if (item === undefined) return 'unseen';
  if (item.skip !== '') return skipReason(item.skip);
  if (item.disabled) return 'disabled';
  if (!item.visible) return 'not visible';
  return 'seen but never activated';
};

const blank: RegistryInput = {
  route: '',
  role: '',
  name: '',
  tag: '',
  path: '',
  visible: false,
  disabled: false,
  skip: '',
};

const entryOf = (
  signature: string,
  items: readonly RegistryInput[],
  clicked: boolean,
): RegistryEntry => {
  const first = items.at(0) ?? blank;
  return {
    signature,
    route: first.route,
    dialog: dialogOf(first.path),
    role: first.role,
    name: first.name,
    tag: first.tag,
    clicked,
    reason: clicked ? '' : unclickedReason(items),
  };
};

/** По одной записи на сигнатуру: кликнута, если кликнута хотя бы в одном состоянии. */
export const buildRegistry = (
  seen: readonly RegistryInput[],
  clicked: ReadonlySet<string>,
): readonly RegistryEntry[] => {
  const signatures = [...new Set(seen.map((item) => signatureOf(item)))];
  return signatures.map((signature) =>
    entryOf(
      signature,
      seen.filter((item) => signatureOf(item) === signature),
      clicked.has(signature),
    ),
  );
};

/** Процент покрытия: целые проценты, 0 при пустом разделе. */
export const coveragePercent = (clicked: number, seen: number): number =>
  seen === 0 ? 0 : Math.round((clicked / seen) * 100);

export const sectionCoverage = (entries: readonly RegistryEntry[]): readonly SectionCoverage[] => {
  const routes = [...new Set(entries.map((entry) => entry.route))];
  return routes.map((route) => {
    const owned = entries.filter((entry) => entry.route === route);
    const done = owned.filter((entry) => entry.clicked);
    return {
      route,
      seen: owned.length,
      clicked: done.length,
      uncovered: owned.filter((entry) => !entry.clicked).map((entry) => entry.signature),
    };
  });
};

/** Человекочитаемая сводка по разделам: таблица видна и в консоли, и в отчёте. */
export const elementMarkdown = (
  sections: readonly SectionCoverage[],
  entries: readonly RegistryEntry[],
): string => {
  const head = ['# Element coverage', '', '| route | seen | clicked | pct |', '| --- | --- | --- | --- |'];
  const rows = sections.map(
    (section) =>
      `| ${section.route} | ${section.seen} | ${section.clicked} | ${coveragePercent(section.clicked, section.seen)}% |`,
  );
  const open = entries.filter((entry) => !entry.clicked);
  const tail = ['', `Uncovered: ${open.length}`, ''];
  const details = open.map((entry) => `- ${entry.signature} — ${entry.reason}`);
  return [...head, ...rows, ...tail, ...details].join('\n');
};
