/** Детерминированный скан дизайна внутри страницы: шкалы, контраст, геометрия, иерархия. */
import {
  clamp,
  hex,
  colorChannel,
  rgb,
  lumChannel,
  parseColor,
  luminance,
  over,
  contrastRatio,
  contrastLimit,
} from './contrast.ts';
import type { DesignConfig } from './design.ts';

const math =
  'const CX = (() => {' +
  [
    clamp,
    hex,
    colorChannel,
    rgb,
    lumChannel,
    parseColor,
    luminance,
    over,
    contrastRatio,
    contrastLimit,
  ]
    .map((fn) => `const ${fn.name} = ${fn.toString()};`)
    .join('') +
  'return { parseColor, luminance, over, contrastRatio, contrastLimit }; })();';

const helpers = String.raw`
const all = (sel) => [...document.querySelectorAll(sel)];
const shortPath = (el) => {
  const parts = [];
  for (let n = el; n && n !== document.documentElement && parts.length < 6; n = n.parentElement) {
    const sib = n.parentElement ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName) : [];
    parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : sib.length > 1 ? ':nth-of-type(' + (sib.indexOf(n) + 1) + ')' : ''));
  }
  return parts.join('>');
};
const shown = (el) => {
  const r = el.getBoundingClientRect();
  return (r.width > 0 || r.height > 0) && el.checkVisibility() &&
    !(el.closest('details:not([open])') && !el.closest('details:not([open]) > summary'));
};
const push = (v, rule, el, expected, actual) =>
  v.length < 400 && v.push({ rule, sel: shortPath(el), expected: String(expected).slice(0, 120), actual: String(actual).slice(0, 160) });
const isInteractive = (el) =>
  el.matches('button, a[href], input, select, textarea, summary, [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="radio"], [role="button"], [contenteditable="true"]');
const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0);
const rectOf = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
const overlap = (a, b) => a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
const scrollableX = (el) => {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (['auto', 'scroll'].includes(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
  }
  return false;
};
const effBg = (el) => {
  const stack = [];
  for (let n = el; n; n = n.parentElement) {
    const c = CX.parseColor(getComputedStyle(n).backgroundColor);
    if (c && c.a > 0) stack.push(c);
  }
  const page = CX.parseColor(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
  const opaque = stack.find((c) => c.a >= 0.999) ?? page;
  return stack.filter((c) => c.a < 0.999).reduce((bg, fg) => CX.over(fg, bg), opaque);
};
`;

const perElement = String.raw`
const scanTextElement = (el, cfg, v, tokenKeys) => {
  const cs = getComputedStyle(el);
  const fs = Number.parseFloat(cs.fontSize);
  const fw = Number.parseFloat(cs.fontWeight) || 400;
  if (!cfg.fontSizes.some((s) => Math.abs(s - fs) < 0.6)) push(v, 'font-scale-off', el, cfg.fontSizes.join(','), cs.fontSize);
  if (!cfg.fontWeights.includes(fw)) push(v, 'weight-off-scale', el, cfg.fontWeights.join(','), cs.fontWeight);
  const lh = cs.lineHeight === 'normal' ? fs * 1.2 : Number.parseFloat(cs.lineHeight);
  if (Number.isFinite(lh) && (lh < fs * 0.98 || lh > fs * 2.3)) push(v, 'line-height-suspect', el, '1x..2.3x fontSize', cs.lineHeight);
  const fg = CX.parseColor(cs.color);
  if (fg && !tokenKeys.has([fg.r, fg.g, fg.b].join(','))) push(v, 'color-off-token', el, 'token color', cs.color);
  const bg = CX.parseColor(cs.backgroundColor);
  if (bg && bg.a > 0.05 && !tokenKeys.has([bg.r, bg.g, bg.b].join(','))) push(v, 'bg-off-token', el, 'token color', cs.backgroundColor);
  if (fg) {
    const ratio = CX.contrastRatio(fg.a < 0.999 ? CX.over(fg, effBg(el)) : fg, effBg(el));
    const limit = CX.contrastLimit(fs, fw, false);
    if (ratio < limit) push(v, 'contrast-text', el, '>=' + limit.toFixed(1), ratio.toFixed(2) + ' ' + cs.color);
  }
  if (el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip', 'scroll', 'auto'].includes(cs.overflowX)
      && !el.title && !el.getAttribute('aria-label'))
    push(v, 'clipped-text', el, 'scrollWidth<=clientWidth or title', el.scrollWidth + '>' + el.clientWidth);
  [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, cs.rowGap, cs.columnGap]
    .map((p) => Number.parseFloat(p))
    .filter((p) => Number.isFinite(p) && p > 0.5)
    .forEach((p) => { if (!cfg.spacings.some((s) => Math.abs(s - p) < 0.6)) push(v, 'spacing-off-scale', el, cfg.spacings.join(','), p + 'px'); });
  const rad = cs.borderTopLeftRadius;
  const radPx = rad.endsWith('%') ? '50%' : rad;
  if (rad !== '0px' && radPx !== '0px' && !cfg.radii.includes(rad) && !cfg.radii.includes(radPx))
    push(v, 'radius-off-scale', el, cfg.radii.join(','), rad);
};
`;

const structural = String.raw`
const scanStructure = (els, cfg, v) => {
  const textEls = els.filter(ownText);
  const controls = els.filter(isInteractive);
  for (const t of textEls.slice(0, 500)) {
    const tr = rectOf(t);
    for (const c of controls) {
      const cr = rectOf(c);
      if (overlap(tr, cr) && !t.contains(c) && !c.contains(t)) {
        push(v, 'overlap', c, 'no text/control overlap', shortPath(t));
        break;
      }
    }
    if ((tr.l < -1 || tr.r > innerWidth + 1) && !scrollableX(t)) push(v, 'outside-viewport', t, '0..innerWidth', Math.round(tr.l) + '..' + Math.round(tr.r));
  }
  els.filter((el) => getComputedStyle(el).display === 'flex' && getComputedStyle(el).flexDirection.startsWith('row') && el.children.length >= 2)
    .forEach((row) => {
      const cs = getComputedStyle(row);
      const kids = [...row.children].filter(shown);
      const centers = kids.map((k) => { const r = k.getBoundingClientRect(); return r.top + r.height / 2; });
      const delta = Math.max(...centers) - Math.min(...centers);
      if (['center', 'baseline'].includes(cs.alignItems) && delta > 2)
        push(v, 'row-misaligned', row, 'siblings aligned within 2px', 'delta ' + delta.toFixed(1) + 'px');
    });
  all('ul, ol, [role="list"], .history-list').forEach((list) => {
    const rows = [...list.children].filter(shown);
    const hs = rows.map((r) => r.getBoundingClientRect().height).filter((h) => h > 4);
    if (hs.length >= 2 && Math.max(...hs) - Math.min(...hs) > 2) push(v, 'row-height-uneven', list, 'equal row heights', Math.min(...hs) + '..' + Math.max(...hs));
  });
  controls.forEach((el) => {
    const cs = getComputedStyle(el);
    if (['auto', 'default'].includes(cs.cursor) && !(el instanceof HTMLInputElement && ['text', 'date', 'number'].includes(el.type)))
      push(v, 'cursor-default', el, 'pointer/not-allowed affordance', cs.cursor);
    if ((el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') && cs.opacity === '1' && cs.cursor !== 'not-allowed')
      push(v, 'disabled-indistinct', el, 'dimmed or not-allowed cursor', cs.cursor + '/' + cs.opacity);
  });
  all('[aria-selected="true"], [aria-pressed="true"], input:checked').forEach((el) => {
    const sib = [...(el.parentElement?.children ?? [])].find((c) => c !== el && c.tagName === el.tagName && !c.matches('[aria-selected="true"],[aria-pressed="true"],:checked'));
    if (!sib) return;
    const a = getComputedStyle(el); const b = getComputedStyle(sib);
    const same = ['color', 'backgroundColor', 'fontWeight', 'borderColor', 'boxShadow', 'opacity'].every((p) => a[p] === b[p]);
    if (same) push(v, 'selected-indistinct', el, 'selected differs from sibling', 'identical computed style');
  });
};
`;

const headings = String.raw`
const scanHeadings = (v) => {
  const hs = all('#main h1, #main h2, #main h3, #main h4, dialog[open] h2, dialog[open] h3').filter(shown);
  const h1s = all('#main h1').filter(shown);
  if (h1s.length !== 1) push(v, 'h1-count', h1s.at(0) ?? document.body, '1', h1s.length);
  hs.reduce((prev, el) => {
    const level = Number(el.tagName.slice(1));
    if (level > prev.level + 1) push(v, 'heading-skip', el, 'next level <= ' + (prev.level + 1), 'h' + level);
    return { level };
  }, { level: 0 });
  hs.forEach((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1);
    if (rects.length < 2) return;
    const words = (el.textContent ?? '').trim().split(/\s+/);
    const last = words.at(-1) ?? '';
    if (words.length > 2 && last.length === 1) push(v, 'single-char-line', el, 'no 1-char last line', JSON.stringify(last));
    else if (words.length > 3 && rects.at(-1).width < rects.at(-2).width * 0.25) push(v, 'orphan-word', el, 'balanced last line', 'last=' + last);
  });
  [...document.querySelectorAll('dialog[open]')].forEach((d) => {
    const primary = d.querySelectorAll('button.primary, [type="submit"].primary, .primary[type="submit"]');
    if (primary.length > 1) push(v, 'primary-duplicate', d, '1 primary action', primary.length);
  });
};
`;

export const designScanSource = `async (cfg) => { ${helpers}; ${math};
  ${perElement}; ${structural}; ${headings};
  const v = [];
  const shell = document.querySelector('.app-shell') ?? document.documentElement;
  const computed = getComputedStyle(shell);
  const tokenKeys = new Set(
    cfg.tokenNames
      .map((name) => CX.parseColor(computed.getPropertyValue(name).trim()))
      .filter(Boolean)
      .map((c) => [c.r, c.g, c.b].join(',')),
  );
  const root = document.querySelector('dialog[open]') ?? document;
  const els = [...root.querySelectorAll('*')].filter(shown).concat(all('header *')).filter(shown);
  els.filter(ownText).forEach((el) => scanTextElement(el, cfg, v, tokenKeys));
  scanStructure(els, cfg, v);
  scanHeadings(v);
  if (cfg.reducedMotion === 'on') {
    const running = document.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length;
    if (running > 0) v.push({ rule: 'motion-reduced', sel: 'document', expected: '0 running', actual: String(running) });
  }
  return v.slice(0, 400);
}`;

export const designScan = (cfg: DesignConfig & Readonly<{ reducedMotion: string }>) =>
  `(${designScanSource})(${JSON.stringify(cfg)})`;
