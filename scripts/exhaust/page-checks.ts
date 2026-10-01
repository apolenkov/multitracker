/** Страничные инварианты: быстрые после каждого клика и полные для новых состояний. */
import { amountLike, visiblePoint } from './dom-rules.ts';

export const invariantBase = String.raw`
const find = (sel) => document.querySelector(sel);
const openDialogs = () => [...document.querySelectorAll('dialog[open]')];
const all = (sel) => [...document.querySelectorAll(sel)];
const push = (v, rule, sel, expected, actual) => v.push({ rule, sel, expected: String(expected).slice(0, 160), actual: String(actual).slice(0, 200) });
const smallTarget = (el) => {
  const r = el.getBoundingClientRect();
  if (r.width >= 44 && r.height >= 44) return false;
  if (el.tagName === 'A' && el.closest('p, li, dd, dt, td, .footer-line')) return false;
  // Нативный флажок 22 px (DESIGN.md) получает цель 44 px от обёртки-label.
  const role = el instanceof HTMLInputElement ? el.type : el.getAttribute('role') ?? '';
  if (['checkbox', 'radio'].includes(role)) {
    const lab = [...(el.labels ?? [])].some((l) => { const b = l.getBoundingClientRect(); return b.width >= 44 && b.height >= 44; });
    return !lab;
  }
  return true;
};
const isInteractive = (el) => el.matches('button, a[href], input, select, textarea, summary, [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="radio"], [role="button"], [contenteditable="true"]');
const shown = (el) => { const r = el.getBoundingClientRect(); return (r.width > 0 || r.height > 0) && el.checkVisibility() && !(el.closest('details:not([open])') && !el.closest('details:not([open]) > summary')); };
`;

/** Быстрые инварианты после каждого клика: консоль, переполнение, диалоги, id, фокус. */
export const fastInvariants = String.raw`
const fastInv = () => {
  const v = [];
  if (document.documentElement.scrollWidth > innerWidth + 1)
    push(v, 'page-overflow', 'html', 'scrollWidth <= ' + innerWidth, document.documentElement.scrollWidth);
  const dl = openDialogs();
  if (dl.length > 1) push(v, 'multi-dialog', 'dialog[open]', '<= 1', dl.map((d) => d.id).join(','));
  const ids = new Map();
  all('[id]').forEach((el) => ids.set(el.id, (ids.get(el.id) ?? 0) + 1));
  [...ids].filter(([, n]) => n > 1).forEach(([id, n]) => push(v, 'duplicate-id', '#' + id, '1', n));
  const active = document.activeElement;
  if (active && active !== document.body && active !== document.documentElement) {
    const r = active.getBoundingClientRect();
    const inside = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    if (!inside && active.checkVisibility()) push(v, 'focus-outside-viewport', 'document.activeElement', 'intersect viewport', JSON.stringify({ x: r.x, y: r.y }));
  }
  const left = (window.__exh && window.__exh.errors) || [];
  left.forEach((e) => push(v, 'console-error', 'console', 'none', e));
  return v;
};
`;

/** Полные инварианты состояния: имена, размеры, маскировка сумм, i18n, липкие панели. */
export const fullInvariantsSource = `async (cfg) => { ${invariantBase}; ${fastInvariants};
  const amountLike = ${amountLike.toString()};
  const visiblePoint = ${visiblePoint.toString()};
  const v = fastInv();
  const controls = all('button, a[href], input, select, textarea, summary, [role="tab"], [role="checkbox"], [role="switch"], [role="radio"], [role="button"], label').filter(shown);
  const accName = (el) => {
    const by = el.getAttribute('aria-labelledby');
    const ref = by ? by.split(/\\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ') : '';
    const labels = 'labels' in el && el.labels ? [...el.labels].map((l) => l.textContent).join(' ') : '';
    return [ref, el.getAttribute('aria-label'), labels, el.getAttribute('alt'), el.getAttribute('title'), el.tagName === 'INPUT' ? '' : el.textContent, el.getAttribute('value')].find((c) => c && String(c).trim()) ?? '';
  };
  for (const el of controls) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    const path = (() => { let p = el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''); const par = el.closest('[id]'); return par ? par.id + '>' + p : p; })();
    if (!accName(el).trim()) push(v, 'missing-accessible-name', path, 'non-empty', '');
    if (isInteractive(el) && smallTarget(el)) {
      const r = el.getBoundingClientRect();
      push(v, 'target-under-44', path, '>=44x44', Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  if (cfg.hideAmounts === 'on') {
    const leakSel = '.amount, .money, .value, .price, .total, .result, dd, td, .summary, .balance';
    all(leakSel).filter(shown).forEach((el) => {
      const t = el.textContent ?? '';
      if (amountLike(t))
        push(v, 'hidden-amount-digit', el.tagName.toLowerCase() + '.' + (el.className || ''), 'no digits in masked amounts', t.slice(0, 60));
    });
    all('.positive, .negative, [class*=positive], [class*=negative]').filter(shown)
      .forEach((el) => push(v, 'hidden-amount-tone', '.' + (el.className || el.tagName), 'tone classes hidden', getComputedStyle(el).color));
    const body = document.body.innerText;
    const arrow = body.match(/[▲▼]/g);
    if (arrow) push(v, 'hidden-amount-arrow', 'body', 'no ▲▼', arrow.length + ' marks');
  }
  if (cfg.langStrings) {
    const text = document.body.innerText;
    cfg.langStrings.forEach((s) => { if (s.length >= 6 && text.includes(s)) push(v, 'i18n-leak', 'body', 'absent', JSON.stringify(s).slice(0, 80)); });
  }
  if (cfg.keys) {
    const text = document.body.innerText;
    cfg.keys.forEach((k) => { if (new RegExp('\\\\b' + k + '\\\\b').test(text)) push(v, 'i18n-key', 'body', 'translated', k); });
  }
  const active = document.activeElement;
  if (active && active !== document.body) {
    const r = active.getBoundingClientRect();
    const p = visiblePoint(r.left, r.top, r.right, r.bottom, innerWidth, innerHeight);
    const top = p && document.elementFromPoint(p[0], p[1]);
    if (top && top !== active && !active.contains(top) && !top.closest('dialog')?.contains(active))
      push(v, 'sticky-covers-focus', 'document.activeElement', 'focus target not covered', top.tagName + '.' + String(top.className).slice(0, 40));
  }
  return v;
}`;
