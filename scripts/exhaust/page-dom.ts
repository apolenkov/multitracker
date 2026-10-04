/** Страничные пробы: перечисление элементов, хеш состояния, общие помощники DOM. */

export const domHelpers = String.raw`
const CONTROL_SEL = 'button, a[href], input, select, textarea, summary, [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="radio"], [role="button"], [role="option"], [contenteditable="true"], label';
const short = (v, n) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length > (n ?? 120) ? s.slice(0, (n ?? 120) - 1) : s; };
const pathOf = (el) => {
  if (!el || el === document.documentElement) return 'html';
  const parent = el.parentElement;
  const sib = parent ? [...parent.children].filter((c) => c.tagName === el.tagName) : [];
  const seg = el.tagName.toLowerCase() + (el.id ? '#' + CSS.escape(el.id) : ':nth-of-type(' + (sib.indexOf(el) + 1) + ')');
  return pathOf(parent) + ' > ' + seg;
};
const roleOf = (el) => el.getAttribute('role') || ({
  A: 'link', BUTTON: 'button', SELECT: 'combobox', TEXTAREA: 'textbox', SUMMARY: 'button', LABEL: 'label',
  INPUT: el.type === 'checkbox' ? 'checkbox' : el.type === 'radio' ? 'radio' : 'textbox',
})[el.tagName] || 'generic';
const accName = (el) => {
  const by = el.getAttribute('aria-labelledby');
  const ref = by ? by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ') : '';
  const labels = 'labels' in el && el.labels ? [...el.labels].map((l) => l.textContent).join(' ') : '';
  const cand = [ref, el.getAttribute('aria-label'), labels, el.getAttribute('alt'), el.getAttribute('title'), el.tagName === 'INPUT' ? '' : el.textContent, el.getAttribute('value')];
  return short(cand.find((c) => c && String(c).trim()) || '', 140);
};
const inClosedDetails = (el) => {
  const closed = el.closest('details:not([open])');
  return closed ? !(closed.querySelector(':scope > summary')?.contains(el)) : false;
};
const isVisible = (el) => {
  const r = el.getBoundingClientRect();
  return (r.width > 0 || r.height > 0) && el.checkVisibility() && !inClosedDetails(el);
};
const openDialogs = () => [...document.querySelectorAll('dialog[open]')];
const modalScope = (el) => { const m = openDialogs().at(-1); return !m ? 'none' : m.contains(el) ? 'inside' : 'background'; };
const hashText = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
};
const settle = () => new Promise((r) => { let done = false; const once = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(once, 0)); setTimeout(once, 50); });
// Опрос условия с бюджетом: уступает поток рендеру, в отличие от busy-wait.
const waitFor = (fn, ms) => new Promise((resolve) => {
  const t0 = performance.now();
  const step = () => (fn() || performance.now() - t0 >= ms ? resolve(fn()) : setTimeout(step, 16));
  step();
});
// hash меняется до коммита раздела; aria-current на его ссылке ставится тем же коммитом.
const routeCommitted = (hash) => !!document.querySelector('a[href="' + hash + '"][aria-current="page"]');
const installHooks = () => {
  if (window.__exh) return;
  const bag = { errors: [], warnings: [] };
  const wrap = (kind) => {
    const orig = console[kind];
    console[kind] = (...args) => { bag[kind === 'error' ? 'errors' : 'warnings'].push(short(args.map(String).join(' '), 300)); orig.apply(console, args); };
  };
  wrap('error'); wrap('warn');
  addEventListener('error', (e) => bag.errors.push(short(String(e.error?.stack ?? e.message), 300)));
  addEventListener('unhandledrejection', (e) => bag.errors.push(short(String(e.reason), 300)));
  window.__exh = bag;
};
const drainLog = () => { const b = window.__exh ?? { errors: [], warnings: [] }; const out = { e: [...b.errors], w: [...b.warnings] }; b.errors.length = 0; b.warnings.length = 0; return out; };
`;

const enumerate = String.raw`
const dialogs = openDialogs().map((d) => d.id);
const items = [...document.querySelectorAll(CONTROL_SEL)]
  .filter((el) => !(el instanceof HTMLLabelElement && !el.control && !el.getAttribute('for')))
  .map((el) => {
    const r = el.getBoundingClientRect();
    return [pathOf(el), roleOf(el), accName(el), el.tagName.toLowerCase(),
      el.closest('dialog[open]')?.id ?? '', isVisible(el),
      el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true',
      modalScope(el), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height),
      el.closest('details')?.id ?? el.closest('details')?.className ?? ''];
  });
`;

export const semantic = String.raw`
const ownOf = (s) => hashText(JSON.stringify([s.h1, s.dialogs, s.expanded, s.values, s.text]));
const semanticState = () => { const s = {
  hash: location.hash,
  lang: document.documentElement.lang,
  h1: document.querySelector('#main h1')?.textContent?.trim() ?? '',
  dialogs: openDialogs().map((d) => d.id),
  expanded: [...document.querySelectorAll('details[open] > summary')].map((s) => pathOf(s)),
  pressed: [...document.querySelectorAll('[aria-pressed="true"],[aria-selected="true"],input:checked')].map((e) => pathOf(e)),
  values: [...document.querySelectorAll('input,select,textarea')].map((e) => [e.id || e.name, e.value ?? e.checked]),
  text: hashText((document.querySelector('dialog[open]') ?? document.querySelector('#main') ?? document.body).innerText ?? ''),
}; return { ...s, own: ownOf(s) }; };
`;

export const installHooksSource = `(() => { ${domHelpers}; installHooks(); return true; })()`;

export const enumerateSource = `(() => { ${domHelpers}; ${enumerate}; return { items, dialogs, title: document.title, scrollW: document.documentElement.scrollWidth, innerW: innerWidth, scrollH: document.documentElement.scrollHeight }; })()`;

export const stateHashSource = `(() => { ${domHelpers}; ${semantic}; return semanticState(); })()`;
