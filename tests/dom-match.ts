/**
 * Минимальная эмуляция CSS-сопоставления для проверок селекторов в тестах:
 * элемент — тег и список классов, селектор — список через запятую из простых
 * компонентов `tag`, `.class`, `[class*=substr]`, соединённых пробелом
 * (потомок). Этого достаточно для селекторов из scripts/exhaust.
 */
export type FakeEl = Readonly<{ tag: string; classes: readonly string[] }>;

export const fake = (tag: string, ...classes: readonly string[]): FakeEl => ({ tag, classes });

/** Простой селектор: необязательный тег плюс .классы и [class*=подстрока]. */
export const selMatch = (el: FakeEl, simple: string): boolean => {
  const tag = /^[a-z]+/.exec(simple)?.[0];
  const cls = [...simple.matchAll(/\.([\w-]+)/g)].map((m) => m[1] ?? '');
  const sub = [...simple.matchAll(/\[class\*=([\w-]+)\]/g)].map((m) => m[1] ?? '');
  const okTag = tag === undefined || el.tag === tag;
  return (
    okTag &&
    cls.every((c) => el.classes.includes(c)) &&
    sub.every((s) => el.classes.some((c) => c.includes(s)))
  );
};

/** Части селектора левее найденного: каждая совпадает с предком выше предыдущей. */
const descMatch = (els: readonly FakeEl[], parts: readonly string[]): boolean => {
  const [part, ...rest] = parts;
  const [el, ...above] = els;
  if (part === undefined) return true;
  if (el === undefined) return false;
  return (selMatch(el, part) && descMatch(above, rest)) || descMatch(above, parts);
};

/** Семантика el.closest: элемент или предок совпадает с правым компонентом селектора. */
export const closestMatch = (chain: readonly FakeEl[], sel: string): boolean =>
  sel.split(',').some((single) => {
    const parts = single.trim().split(/\s+/);
    return chain.some(
      (_, from) =>
        selMatch(chain.slice(from)[0] ?? fake('x'), parts.at(-1) ?? '') &&
        descMatch(chain.slice(from + 1), parts.slice(0, -1).toReversed()),
    );
  });

/**
 * Семантика el.matches/querySelectorAll: сам элемент (chain[0]) совпадает
 * с правым компонентом селектора, левые части — с предками выше.
 */
export const queried = (chain: readonly FakeEl[], sel: string): boolean =>
  sel.split(',').some((single) => {
    const parts = single.trim().split(/\s+/);
    const el = chain[0];
    return (
      el !== undefined &&
      selMatch(el, parts.at(-1) ?? '') &&
      descMatch(chain.slice(1), parts.slice(0, -1).toReversed())
    );
  });
