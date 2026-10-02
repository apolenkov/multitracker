/** Разбор шкал из DESIGN.md и имён токенов из appearance.css. Только чтение текста. */

export type Scales = Readonly<{
  fontSizes: readonly number[];
  fontEm: readonly number[];
  fontWeights: readonly number[];
  spacings: readonly number[];
  radii: readonly string[];
}>;

const sectionLines = (frontmatter: string, name: string): readonly string[] => {
  const lines = frontmatter.split('\n');
  const start = lines.findIndex((line) => line === `${name}:`);
  if (start < 0) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line !== '' && !line.startsWith(' '));
  return end < 0 ? rest : rest.slice(0, end);
};

const pxNumbers = (lines: readonly string[]) =>
  lines.flatMap((line) =>
    [...line.matchAll(/([\d.]+)px/g)].map((match) => Number.parseFloat(match[1] ?? '0')),
  );

const valuesAfter = (lines: readonly string[], key: string): readonly string[] =>
  lines
    .filter((line) => line.includes(key))
    .map((line) => line.slice(line.indexOf(key) + key.length).trim());

const fontSizesOf = (typography: readonly string[]) =>
  valuesAfter(typography, 'fontSize:')
    .filter((value) => !value.endsWith('em'))
    .map((value) => Number.parseFloat(value));

const fontEmOf = (typography: readonly string[]) =>
  valuesAfter(typography, 'fontSize:')
    .filter((value) => value.endsWith('em'))
    .map((value) => Number.parseFloat(value));

const fontWeightsOf = (typography: readonly string[]) =>
  valuesAfter(typography, 'fontWeight:').map((value) => Number.parseInt(value, 10));

const paddingsOf = (components: readonly string[]) =>
  valuesAfter(components, 'padding:').flatMap((value) =>
    value.split(' ').map((part) => Number.parseFloat(part)),
  );

const radiiOf = (rounded: readonly string[]) =>
  rounded
    .map((line) => line.slice(line.lastIndexOf(':') + 1).trim())
    .filter((value) => /^(\d+px|50%)$/.test(value));

const unique = (values: readonly number[]) => [...new Set(values)].toSorted((a, b) => a - b);

/** Шкалы из фронтматтера DESIGN.md: типографика, отступы, радиусы и паддинги компонентов. */
export const designScales = (designMd: string): Scales => {
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(designMd)?.at(1) ?? '';
  const typography = sectionLines(frontmatter, 'typography');
  return {
    fontSizes: unique(fontSizesOf(typography)),
    fontEm: unique(fontEmOf(typography)),
    fontWeights: unique(fontWeightsOf(typography)),
    spacings: unique([
      ...pxNumbers(sectionLines(frontmatter, 'spacing')),
      ...paddingsOf(sectionLines(frontmatter, 'components')),
      0,
      1,
      2,
      4,
      6,
      40,
      44,
      48,
    ]),
    radii: [...new Set(['0px', ...radiiOf(sectionLines(frontmatter, 'rounded'))])],
  };
};

/** Литеральные радиусы из CSS-правил (включая 50% для круглых элементов). */
export const cssRadii = (css: string): readonly string[] =>
  [
    ...new Set(
      [...css.matchAll(/border-radius:\s*([^;}]+)/g)].flatMap((match) =>
        (match[1] ?? '').split(/\s+/).filter((value) => /^(\d+px|50%)$/.test(value)),
      ),
    ),
  ].toSorted();

/** Имена custom properties из appearance.css (кроме служебных не-цветов). */
export const tokenNames = (css: string): readonly string[] =>
  [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1] ?? ''))].filter(
    (name) => name !== '--select-chevron',
  );

/** Значения токенов, вычисленные браузером для текущего окружения (rgb-строки). */
export const tokenValuesProbe = (names: readonly string[]) =>
  `(() => { const style = getComputedStyle(document.querySelector('.app-shell') ?? document.documentElement);
    return ${JSON.stringify(names)}.map((name) => style.getPropertyValue(name).trim()); })()`;
