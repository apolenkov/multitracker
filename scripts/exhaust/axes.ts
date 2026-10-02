/** Оси окружения и детерминированный покрывающий массив всех пар значений. */
export const axisOrder = [
  'language',
  'theme',
  'displayCurrency',
  'calcCurrency',
  'hideAmounts',
  'density',
  'monochrome',
  'width',
  'demoState',
  'reducedMotion',
] as const;
export type Axis = (typeof axisOrder)[number];
export type Env = Readonly<Record<Axis, string>>;
export type Axes = Readonly<Record<Axis, readonly string[]>>;

export const axisValues: Axes = {
  language: ['ru', 'en'],
  theme: ['light', 'dark', 'system'],
  displayCurrency: ['RUB', 'USD'],
  calcCurrency: ['RUB', 'USD'],
  hideAmounts: ['off', 'on'],
  density: ['comfortable', 'compact'],
  monochrome: ['off', 'on'],
  width: ['320', '375', '768', '1440'],
  demoState: ['ready', 'loading', 'empty', 'missing', 'error'],
  reducedMotion: ['off', 'on'],
};

export const baseEnv: Env = {
  language: 'ru',
  theme: 'light',
  displayCurrency: 'RUB',
  calcCurrency: 'RUB',
  hideAmounts: 'off',
  density: 'comfortable',
  monochrome: 'off',
  width: '1440',
  demoState: 'ready',
  reducedMotion: 'off',
};

/** Значение оси и варианты оси через Map: прямой индекс по переменной запрещён правилами. */
export const axisValue = (env: Env, axis: Axis): string =>
  new Map(Object.entries(env)).get(axis) ?? '';

export const axisOptions = (axes: Axes, axis: Axis): readonly string[] =>
  new Map(Object.entries(axes)).get(axis) ?? [];

export const envKey = (env: Env) => axisOrder.map((axis) => axisValue(env, axis)).join('|');

export const cartesian = (axes: Axes): readonly Env[] =>
  axisOrder.reduce<readonly Env[]>(
    (rows, axis) =>
      rows.flatMap((row) => axisOptions(axes, axis).map((value) => ({ ...row, [axis]: value }))),
    [baseEnv],
  );

const pairKey = (first: number, a: string, second: number, b: string) =>
  `${first}=${a}~${second}=${b}`;

export const rowPairs = (row: Env): readonly string[] =>
  axisOrder.flatMap((first, i) =>
    axisOrder
      .slice(i + 1)
      .map((second, j) => pairKey(i, axisValue(row, first), i + j + 1, axisValue(row, second))),
  );

const allPairs = (axes: Axes): readonly string[] =>
  axisOrder.flatMap((first, i) =>
    axisOrder
      .slice(i + 1)
      .flatMap((second, j) =>
        axisOptions(axes, first).flatMap((a) =>
          axisOptions(axes, second).map((b) => pairKey(i, a, i + j + 1, b)),
        ),
      ),
  );

const gain = (row: Env, covered: ReadonlySet<string>) =>
  rowPairs(row).filter((pair) => !covered.has(pair)).length;

export const uncoveredPairs = (rows: readonly Env[], axes: Axes): readonly string[] => {
  const covered = new Set(rows.flatMap(rowPairs));
  return allPairs(axes).filter((pair) => !covered.has(pair));
};

const pickRow = (candidates: readonly Env[], covered: ReadonlySet<string>) =>
  candidates.reduce<Readonly<{ row: Env; gain: number }> | null>((best, row) => {
    const scored = { row, gain: gain(row, covered) };
    return best === null || scored.gain > best.gain ? scored : best;
  }, null);

/** Жадный покрывающий массив: каждая пара значений осей встречается хотя бы в одной строке. */
export const coveringArray = (axes: Axes): readonly Env[] => {
  const candidates = cartesian(axes);
  const total = allPairs(axes).length;
  const step = (acc: { rows: readonly Env[]; covered: ReadonlySet<string> }) => {
    const best = pickRow(candidates, acc.covered);
    if (best === null || best.gain === 0) return acc;
    return {
      rows: [...acc.rows, best.row],
      covered: new Set([...acc.covered, ...rowPairs(best.row)]),
    };
  };
  const walk = (acc: { rows: readonly Env[]; covered: ReadonlySet<string> }): readonly Env[] =>
    acc.covered.size >= total ? acc.rows : walk(step(acc));
  return walk({ rows: [], covered: new Set() });
};

/** Полная сетка наиболее чувствительных к разметке осей на каждый раздел. */
export const layoutGrid = (): readonly Env[] =>
  cartesian({
    ...axisValues,
    language: ['ru'],
    displayCurrency: ['RUB'],
    calcCurrency: ['RUB'],
    hideAmounts: ['off'],
    monochrome: ['off'],
    demoState: ['ready'],
    reducedMotion: ['off'],
  });

/** Оси части (b): 8 варьируемых, demoState/reducedMotion зафиксированы. */
export const partBAxes = (): Axes => ({
  ...axisValues,
  demoState: ['ready'],
  reducedMotion: ['off'],
});
