/** Структурные проверки дизайна: наслоение контролов над текстом, строки, курсоры. */
export const structural = String.raw`
const paints = (el) => {
  const cs = getComputedStyle(el);
  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const bw = Math.max(...sides.map((s) => Number.parseFloat(cs['border' + s + 'Width']) || 0));
  const ba = Math.max(...sides.map((s) => CX.parseColor(cs['border' + s + 'Color'])?.a ?? 0));
  return paintsBox(CX.parseColor(cs.backgroundColor)?.a ?? 0, bw, ba, cs.backgroundImage !== 'none');
};
const fixedNear = (el) => {
  for (let n = el; n; n = n.parentElement) if (['fixed', 'sticky'].includes(getComputedStyle(n).position)) return true;
  return false;
};
const stackAbove = (a, b) => {
  const x = (Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2;
  const y = (Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2;
  return x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight ? document.elementsFromPoint(x, y) : [];
};
const cSide = (el, c) => el === c || c.contains(el) || el.contains(c);
const covers = (t, c) => {
  if (!overlap(rectOf(t), rectOf(c)) || t.contains(c) || c.contains(t)) return false;
  const tr = rectOf(t); // текст для скринридера (1px, clip-path) никто не видит
  if (Math.min(tr.w, tr.h) <= 1 || getComputedStyle(t).clipPath === 'inset(50%)') return false;
  // Поток под закрытой нижней навигацией — не дефект. Открытое меню «Ещё»
  // (.more-menu есть в DOM только при expanded) исключением не является (N5).
  if (
    overlapExempt(
      fixedNear(c),
      fixedNear(t),
      c.closest('.mobile-links') !== null,
      c.closest('dialog') !== null && c.closest('.form-actions, .dialog-actions') !== null,
    )
  )
    return false;
  let stack = stackAbove(tr, rectOf(c));
  if (stack.length === 0) {
    // Пересечение вне вьюпорта: мгновенно подводим текст, меряем стек, возвращаем прокрутку.
    const [sx, sy] = [scrollX, scrollY];
    t.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    const [tr2, cr2] = [rectOf(t), rectOf(c)];
    if (overlap(tr2, cr2)) stack = stackAbove(tr2, cr2);
    window.scrollTo({ left: sx, top: sy, behavior: 'instant' });
  }
  if (stack.length === 0) return paints(c); // вьюпорт недостижим: только непрозрачный контрол считаем
  return stackCoversText(stack.map((el) => ({
    control: cSide(el, c),
    text: el === t || t.contains(el),
    opaque: paints(el),
  })));
};
const scanStructure = (els, cfg, v) => {
  const textEls = els.filter(ownText);
  const controls = els.filter(isInteractive);
  for (const t of textEls.slice(0, 500)) {
    const tr = rectOf(t);
    for (const c of controls) {
      if (covers(t, c)) {
        push(v, 'overlap', c, 'no text/control overlap', shortPath(t));
        break;
      }
    }
    if ((tr.l < -1 || tr.r > innerWidth + 1) && !scrollableX(t)) push(v, 'outside-viewport', t, '0..innerWidth', Math.round(tr.l) + '..' + Math.round(tr.r));
  }
  els.filter((el) => { const cs = getComputedStyle(el);
      return cs.display === 'flex' && cs.flexDirection.startsWith('row') && el.children.length >= 2 && cs.alignItems === 'center';
    })
    .forEach((row) => {
      const kids = [...row.children].filter(shown);
      const delta = lineDeltaMax(kids.map((k) => { const r = k.getBoundingClientRect(); return [r.top, r.bottom]; }));
      if (delta > 2) push(v, 'row-misaligned', row, 'same-line siblings aligned within 2px', 'delta ' + delta.toFixed(1) + 'px');
    });
  all('ul, ol, [role="list"], .history-list').forEach((list) => {
    const rows = [...list.children].filter(shown);
    const hs = rows.map((r) => r.getBoundingClientRect().height).filter((h) => h > 4);
    const slots = rows.every((r) => r.querySelector('button, a[href], input, select, summary')); // строки-слоты: контрол в каждой
    if (hs.length >= 2 && slots && Math.max(...hs) <= 72 && Math.max(...hs) - Math.min(...hs) > 2) push(v, 'row-height-uneven', list, 'equal row heights', Math.min(...hs) + '..' + Math.max(...hs));
  });
  controls.forEach((el) => {
    const cs = getComputedStyle(el);
    if (['auto', 'default'].includes(cs.cursor) && !(el instanceof HTMLInputElement && ['text', 'date', 'number', 'checkbox', 'radio'].includes(el.type)))
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
