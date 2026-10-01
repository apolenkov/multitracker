/** Разбор шкал из DESIGN.md и имён токенов из appearance.css. Только чтение текста. */

export type Scales = Readonly<{
  fontSizes: readonly number[];
  fontWeights: readonly number[];
  spacings: readonly number[];
  radii: readonly string[];
}>;

const section = (frontmatter: string, name: string) =>
  frontmatter.match(new RegExp(`^${name}:\\n((?:^ {2,}\\S.*\\n?)*)`, 'm'))?.at(1) ?? '';

const pxNumbers = (text: string) =>
  [...text.matchAll(/(\d+(?:\.\d+)?)\s*px/g)].map((match) => Number.parseFloat(match[1] ?? '0'));

const fontSizesOf = (typography: string) =>
  [...typography.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)px/g)].map((match) =>
    Number.parseFloat(match[1] ?? '0'),
  );

const fontWeightsOf = (typography: string) =>
  [...typography.matchAll(/fontWeight:\s*(\d+)/g)].map((match) =>
    Number.parseInt(match[1] ?? '0', 10),
  );

const paddingsOf = (components: string) =>
  [...components.matchAll(/padding:\s*([0-9.\spx]+)/g)].flatMap((match) =>
    pxNumbers(match[1] ?? ''),
  );

const radiiOf = (rounded: string) =>
  [...rounded.matchAll(/:\s*(\d+px|50%)/g)].map((match) => match[1] ?? '0px');

const unique = (values: readonly number[]) => [...new Set(values)].toSorted((a, b) => a - b);

/** Шкалы из фронтматтера DESIGN.md: типографика, отступы, радиусы и паддинги компонентов. */
export const designScales = (designMd: string): Scales => {
  const frontmatter = designMd.match(/^---\n([\s\S]*?)\n---/)?.at(1) ?? '';
  const typography = section(frontmatter, 'typography');
  return {
    fontSizes: unique(fontSizesOf(typography)),
    fontWeights: unique(fontWeightsOf(typography)),
    spacings: unique([
      ...pxNumbers(section(frontmatter, 'spacing')),
      ...paddingsOf(section(frontmatter, 'components')),
      0, 1, 2, 4, 6, 40, 44, 48,
    ]),
    radii: [...new Set(['0px', ...radiiOf(section(frontmatter, 'rounded'))])],
  };
};

/** Литеральные радиусы из CSS-правил (включая 50% для круглых элементов). */
export const cssRadii = (css: string): readonly string[] =>
  [
    ...new Set(
      [...css.matchAll(/border-radius:\s*([^;}]+)/g)].flatMap((match) =>
        (match[1] ?? '')
          .split(/\s+/)
          .filter((value) => /^(\d+px|50%)$/.test(value)),
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
