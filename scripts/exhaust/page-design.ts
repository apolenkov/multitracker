/** Детерминированный скан дизайна внутри страницы: шкалы, контраст, геометрия, иерархия. */
import {
  alphaOf,
  channelParts,
  clamp,
  hex,
  colorChannel,
  isHexBody,
  rgb,
  lumChannel,
  parseColor,
  luminance,
  over,
  contrastRatio,
  contrastLimit,
} from './contrast.ts';
import type { DesignConfig } from './design.ts';
import { lineDeltaMax, overlapExempt, paintsBox } from './dom-rules.ts';
import { structural } from './page-structure.ts';

const dom = [lineDeltaMax, overlapExempt, paintsBox]
  .map((fn) => `const ${fn.name} = ${fn.toString()};`)
  .join('');

const math =
  'const CX = (() => {' +
  [
    clamp,
    isHexBody,
    hex,
    colorChannel,
    channelParts,
    alphaOf,
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
    const mark = n.id ? '#' + n.id : sib.length > 1 ? ':nth-of-type(' + (sib.indexOf(n) + 1) + ')' : '';
    parts.unshift(n.tagName.toLowerCase() + mark);
  }
  return parts.join('>');
};
const shown = (el) => (el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0) &&
  el.checkVisibility() && !(el.closest('details:not([open])') && !el.closest('details:not([open]) > summary'));
const push = (v, rule, el, expected, actual) =>
  v.length < 400 && v.push({ rule, sel: shortPath(el), expected: String(expected).slice(0, 120), actual: String(actual).slice(0, 160) });
const isInteractive = (el) =>
  el.matches('button, a[href], input, select, textarea, summary, [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="radio"], [role="button"], [contenteditable="true"]');
const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0);
const rectOf = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
const overlap = (a, b) => a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
const scrollableX = (el) => {
  for (let n = el.parentElement; n; n = n.parentElement)
    if (['auto', 'scroll'].includes(getComputedStyle(n).overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
  return false;
};
const effBg = (el) => {
  const stack = [];
  for (let n = el; n; n = n.parentElement) {
    const c = CX.parseColor(getComputedStyle(n).backgroundColor);
    if (c && c.a > 0) stack.push(c);
  }
  const page = CX.parseColor(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
  return stack.filter((c) => c.a < 0.999).reduce((bg, fg) => CX.over(fg, bg), stack.find((c) => c.a >= 0.999) ?? page);
};
`;

const perElement = String.raw`
const scanTextElement = (el, cfg, v, tokenKeys) => {
  const cs = getComputedStyle(el);
  const fs = Number.parseFloat(cs.fontSize);
  const fw = Number.parseFloat(cs.fontWeight) || 400;
  const parentFs = el.parentElement ? Number.parseFloat(getComputedStyle(el.parentElement).fontSize) : 0;
  const emOk = parentFs > 0 && cfg.fontEm.some((e) => Math.abs(fs / parentFs - e) < 0.02);
  if (!cfg.fontSizes.some((s) => Math.abs(s - fs) < 0.6) && !emOk) push(v, 'font-scale-off', el, cfg.fontSizes.join(','), cs.fontSize);
  if (!cfg.fontWeights.includes(fw)) push(v, 'weight-off-scale', el, cfg.fontWeights.join(','), cs.fontWeight);
  const lh = cs.lineHeight === 'normal' ? fs * 1.2 : Number.parseFloat(cs.lineHeight);
  if (Number.isFinite(lh) && (lh < fs * 0.98 || lh > fs * 2.3)) push(v, 'line-height-suspect', el, '1x..2.3x fontSize', cs.lineHeight);
  const fg = CX.parseColor(cs.color);
  if (fg && !tokenKeys.has([fg.r, fg.g, fg.b].join(','))) push(v, 'color-off-token', el, 'token color', cs.color);
  const bg = CX.parseColor(cs.backgroundColor);
  if (bg && bg.a > 0.05 && !tokenKeys.has([bg.r, bg.g, bg.b].join(','))) push(v, 'bg-off-token', el, 'token color', cs.backgroundColor);
  const limit = CX.contrastLimit(fs, fw, false);
  const ratio = fg && CX.contrastRatio(fg.a < 0.999 ? CX.over(fg, effBg(el)) : fg, effBg(el));
  if (ratio !== false && ratio < limit) push(v, 'contrast-text', el, '>=' + limit.toFixed(1), ratio.toFixed(2) + ' ' + cs.color);
  if (el.clientWidth > 8 && el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip', 'scroll', 'auto'].includes(cs.overflowX)
      && !el.title && !el.getAttribute('aria-label'))
    push(v, 'clipped-text', el, 'scrollWidth<=clientWidth or title', el.scrollWidth + '>' + el.clientWidth);
  const inlineDecor = cs.display.startsWith('inline') && !isInteractive(el);
  [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, cs.rowGap, cs.columnGap]
    .map((p) => Number.parseFloat(p))
    .filter((p) => Number.isFinite(p) && p > 0.5)
    .forEach((p) => { if (!inlineDecor && !cfg.spacings.some((s) => Math.abs(s - p) < 0.6)) push(v, 'spacing-off-scale', el, cfg.spacings.join(','), p + 'px'); });
  const rad = cs.borderTopLeftRadius;
  const radPx = rad.endsWith('%') ? '50%' : rad;
  if (rad !== '0px' && radPx !== '0px' && !cfg.radii.includes(rad) && !cfg.radii.includes(radPx))
    push(v, 'radius-off-scale', el, cfg.radii.join(','), rad);
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
    // Бейджи-счётчики (.count) — оформление заголовка, а не слова последней строки.
    const parts = [...el.childNodes].filter(
      (n) => n.nodeType === 3 || (n instanceof Element && !n.matches('.count, [class*=count]')),
    );
    const rects = parts.flatMap((n) => {
      const range = document.createRange();
      range.selectNodeContents(n);
      return [...range.getClientRects()].filter((r) => r.width > 1);
    });
    if (rects.length < 2) return;
    const words = parts.map((n) => n.textContent ?? '').join(' ').trim().split(/\s+/).filter(Boolean);
    const last = words.at(-1) ?? '';
    if (words.length > 2 && last.length === 1) push(v, 'single-char-line', el, 'no 1-char last line', JSON.stringify(last));
    else if (words.length > 3 && rects.at(-1).width < rects.at(-2).width * 0.25) push(v, 'orphan-word', el, 'balanced last line', 'last=' + last);
  });
  all('dialog[open]').forEach((d) => {
    const n = d.querySelectorAll('button.primary, .primary[type="submit"]').length;
    if (n > 1) push(v, 'primary-duplicate', d, '1 primary action', n);
  });
};
`;

export const designScanSource = `async (cfg) => { ${helpers}; ${math}; ${dom};
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
