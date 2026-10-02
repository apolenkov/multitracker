/** Поиск цели по доступному имени и маркер для доверенного клика. */
export const clickSource = (
  name: string,
  within: string | undefined,
  alt: readonly string[] | undefined,
): string => `(() => {
  const scope = ${within ? `document.querySelector(${JSON.stringify(within)})` : 'document'};
  if (!scope) return 'scope-missing';
  const wanted = ${JSON.stringify([name, ...(alt ?? [])])}.map((item) => String(item).trim().toLowerCase());
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().toLowerCase();
  const nodes = [...scope.querySelectorAll('button, a[href], summary, label, input[type="checkbox"], input[type="radio"], [role="menuitem"], [role="button"]')];
  const matches = nodes.filter((el) => wanted.some((item) => label(el).includes(item)));
  const exactFirst = nodes.filter((el) => wanted.some((item) => label(el) === item));
  const visible = (list) => list.find((el) => el.checkVisibility({checkVisibilityCSS:true}));
  const hit = visible(exactFirst) ?? visible(matches);
  if (!hit) return nodes.length === 0 ? 'scope-missing' : 'not-found';
  hit.setAttribute('data-matrix-target', '1');
  return 'marked';
})()`;
