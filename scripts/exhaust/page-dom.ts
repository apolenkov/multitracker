/** Страничные пробы: перечисление элементов, хеш состояния, внутристраничный обход кликов. */

const helpers = String.raw`
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
const settle = () => new Promise((r) => { requestAnimationFrame(() => setTimeout(r, 0)); });
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

const semantic = String.raw`
const semanticState = () => ({
  hash: location.hash,
  lang: document.documentElement.lang,
  h1: document.querySelector('#main h1')?.textContent?.trim() ?? '',
  dialogs: openDialogs().map((d) => d.id),
  expanded: [...document.querySelectorAll('details[open] > summary')].map((s) => pathOf(s)),
  pressed: [...document.querySelectorAll('[aria-pressed="true"],[aria-selected="true"],input:checked')].map((e) => pathOf(e)),
  values: [...document.querySelectorAll('input,select,textarea')].map((e) => [e.id || e.name, e.value ?? e.checked]),
  text: hashText((document.querySelector('dialog[open]') ?? document.querySelector('#main') ?? document.body).innerText ?? ''),
});
`;

export const installHooksSource = `(() => { ${helpers}; installHooks(); return true; })()`;

export const enumerateSource = `(() => { ${helpers}; ${enumerate}; return { items, dialogs, title: document.title, scrollW: document.documentElement.scrollWidth, innerW: innerWidth, scrollH: document.documentElement.scrollHeight }; })()`;

export const stateHashSource = `(() => { ${helpers}; ${semantic}; const s = semanticState(); s.own = hashText(JSON.stringify([s.h1, s.dialogs, s.expanded, s.values, s.text])); return s; })()`;

const anchors = String.raw`
const anchorSet = (skipRoot) => {
  const pinned = (el) => { for (let n = el; n; n = n.parentElement) if (['sticky', 'fixed'].includes(getComputedStyle(n).position)) return true; return false; };
  return [...document.querySelectorAll('h1,h2,h3,summary,button,.status-message,td,th,dt,dd,p,a,select,input')]
    .filter((el) => el.checkVisibility() && !pinned(el) && !(skipRoot && skipRoot.contains(el)))
    .map((el) => { const r = el.getBoundingClientRect(); return [pathOf(el), Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10]; });
};
const containerOf = (el) => el.closest('dialog, form, details, section, article, fieldset, li, tr, .history-row, .panel, .card, nav') ?? el.parentElement ?? document.body;
const anchorDiff = (before) => {
  const now = new Map(anchorSet(null).map(([k, x, y]) => [k, [x, y]]));
  return before.flatMap(([k, x, y]) => {
    const cur = now.get(k);
    if (!cur) return [];
    const dx = cur[0] - x, dy = cur[1] - y;
    return Math.abs(dx) > 2 || Math.abs(dy) > 2 ? [{ key: k, dx: Math.round(dx), dy: Math.round(dy) }] : [];
  });
};
`;

/**
 * Один синтетический клик внутри страницы по CSS-пути элемента:
 * хеш до/после, сведения о диалоге, сдвиги вне контейнера, навигация.
 */
export const clickSource = `async (path) => { ${helpers}; ${anchors};
  installHooks();
  const target = document.querySelector(path);
  if (!target) return { error: 'no-such-element', path };
  const before = (() => { ${semantic}; return semanticState(); })();
  const beforeAnchors = anchorSet(containerOf(target));
  const t0 = performance.now();
  if (target instanceof HTMLInputElement && !['checkbox', 'radio'].includes(target.type)) {
    target.focus(); target.value = '7'; target.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (target instanceof HTMLSelectElement) {
    const next = [...target.options].find((o) => !o.selected && !o.disabled);
    if (next) { target.value = next.value; target.dispatchEvent(new Event('change', { bubbles: true })); }
  } else target.click();
  await settle();
  const after = (() => { ${semantic}; return semanticState(); })();
  const shifts = anchorDiff(beforeAnchors);
  const log = drainLog();
  return { p: pathOf(target), b: before.own, a: after.own, beforeH: before.text, afterH: after.text,
    dlg: after.dialogs, moved: shifts.slice(0, 8), dur: Math.round(performance.now() - t0),
    err: log.e, warn: log.w, nav: before.hash !== after.hash,
    meta: [pathOf(target), roleOf(target), accName(target), target.tagName.toLowerCase(), target.closest('dialog[open]')?.id ?? ''] };
}`;

/** Полный обход текущего состояния одним вызовом: клики, вложенные диалоги, восстановление. */
export const sweepSource = `async (opts) => { ${helpers}; ${anchors};
  installHooks();
  const records = [];
  const visited = new Set();
  const scopeSel = opts.scope || 'main';
  const clickAll = async (depth) => {
    const els = [...document.querySelectorAll(CONTROL_SEL)];
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const p = pathOf(el);
      const scope = modalScope(el);
      const closed = inClosedDetails(el);
      const visible = isVisible(el);
      const disabled = el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';
      if (!visible || disabled || closed) { records.push({ p, skip: closed ? 'closed-disclosure' : disabled ? 'disabled' : 'hidden', b: '', a: '' }); continue; }
      if (depth === 0 && scope === 'background') { records.push({ p, skip: 'background', b: '', a: '' }); continue; }
      if (depth === 0 && scope === 'none' && opts.chrome !== true && !p.includes(scopeSel) && !p.includes('dialog')) {
        const shared = ['.desktop-links', '.mobile-links', '.more-menu', 'header', 'nav', 'footer'];
        if (shared.some((s) => el.closest(s))) { records.push({ p, skip: 'shared-chrome', b: '', a: '' }); continue; }
      }
      const before = (() => { ${semantic}; return semanticState(); })();
      const anchorBefore = anchorSet(containerOf(el));
      const t0 = performance.now();
      if (el instanceof HTMLSelectElement) {
        const next = [...el.options].find((o) => !o.selected && !o.disabled);
        if (next) { el.value = next.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
      } else if (el instanceof HTMLInputElement && !['checkbox', 'radio'].includes(el.type)) {
        el.focus(); el.value = '7'; el.dispatchEvent(new Event('input', { bubbles: true }));
      } else el.click();
      await settle();
      const after = (() => { ${semantic}; return semanticState(); })();
      const rec = { p, i, b: before.own, a: after.own, dlg: after.dialogs, dur: Math.round(performance.now() - t0),
        moved: anchorDiff(anchorBefore).slice(0, 6), nav: before.hash !== after.hash };
      records.push(rec);
      const log = drainLog();
      if (log.e.length) rec.err = log.e; if (log.w.length) rec.warn = log.w;
      const opened = after.dialogs.filter((id) => !before.dialogs.includes(id));
      if (opened.length && depth < 2) {
        await clickAll(depth + 1);
        for (const d of openDialogs()) { d.close(); await settle(); }
      }
      if (after.hash !== before.hash) { history.back(); await settle(); }
      if (records.length > (opts.limit ?? 600)) return;
      visited.add(p + '|' + after.own);
    }
  };
  await clickAll(0);
  return { records, consoleLeft: drainLog() };
}`;
