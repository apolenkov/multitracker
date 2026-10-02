/** Внутристраничный обход: очередь кандидатов, дедлайн, донабор диалогов. */
import { domHelpers, semantic } from './page-dom.ts';
import { invariantBase, fastInvariants } from './page-checks.ts';

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

const sweepCore = String.raw`
const CLOSER = /отмен|cancel|закрыт|close|✕|×|esc/i;
const DESTROY = /удал|delete|erase|очист|сброс|reset|отозват|revoke|отключ|disconnect/i;
const statusOf = (el) => {
  if (el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') return 'disabled';
  if (inClosedDetails(el)) return 'closed-disclosure';
  if (!isVisible(el)) return 'hidden';
  return '';
};
const topModal = () => openDialogs().at(-1) ?? null;
const inScope = (el) => { const m = topModal(); return m === null || m.contains(el); };
const nameOf = (el) =>
  short(accName(el) + ' ' + (el.textContent ?? '') + ' ' + (el.getAttribute('aria-label') ?? ''), 200);
const rank = (el) => (DESTROY.test(nameOf(el)) ? 2 : CLOSER.test(nameOf(el)) ? 1 : 0);
const activate = (el) => {
  if (el instanceof HTMLSelectElement) {
    const next = [...el.options].find((o) => !o.selected && !o.disabled);
    if (next) { el.value = next.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
    return;
  }
  if (el instanceof HTMLInputElement && !['checkbox', 'radio'].includes(el.type)) {
    el.focus(); el.value = '7'; el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  el.click();
};
const closeAll = async () => { for (const d of openDialogs()) d.close(); await settle(); };
`;

const clickPath = String.raw`
const clickPath = async (el, purpose, fastInv) => {
  const p = pathOf(el);
  const host = el.closest('dialog')?.id ?? '';
  const before = semanticState();
  const anchorBefore = anchorSet(containerOf(el));
  const t0 = performance.now();
  activate(el);
  await settle();
  const after = semanticState();
  const log = drainLog();
  const rec = {
    p, b: before.own, a: after.own, dlg: after.dialogs,
    dur: Math.round(performance.now() - t0),
    moved: anchorDiff(anchorBefore).slice(0, 6),
    inv: fastInv().slice(0, 8),
    purpose,
    meta: [p, roleOf(el), accName(el), el.tagName.toLowerCase(), host],
  };
  const opened = after.dialogs.filter((id) => !before.dialogs.includes(id));
  if (opened.length) rec.opened = opened[0];
  if (log.e.length) rec.err = log.e;
  if (log.w.length) rec.warn = log.w;
  if (after.hash !== before.hash) { history.back(); await settle(); }
  return rec;
};
`;

const fastBundle = `const fastInv = (() => { ${invariantBase} ${fastInvariants} return fastInv; })();`;

const preamble = `${domHelpers} ${anchors} ${semantic} ${sweepCore} ${clickPath} installHooks(); ${fastBundle}`;

const pickNext = String.raw`
const pending = () => [...document.querySelectorAll(CONTROL_SEL)].filter((el) => !done.has(pathOf(el)));
const inClosedDialog = (el) => {
  const d = el.closest('dialog');
  return d !== null && !d.open;
};
const pick = () => {
  const cand = pending().filter((el) => inScope(el) && !inClosedDialog(el));
  const ready = cand.filter((el) => statusOf(el) === '');
  const pool = (ready.length > 0 ? ready : cand)
    .map((el, i) => ({ el, i }))
    .sort((a, b) => rank(a.el) - rank(b.el) || a.i - b.i);
  return pool.at(0)?.el ?? null;
};
const reopen = async (records, fastInv) => {
  const dlg = pending()
    .map((el) => el.closest('dialog')?.id ?? '')
    .find((id) => id !== '' && openers[id] && !failed.has(id));
  if (!dlg) return false;
  const el = document.querySelector(openers[dlg]);
  if (el) records.push(await clickPath(el, 'reopen', fastInv));
  if (!el || !openDialogs().some((d) => d.id === dlg)) failed.add(dlg);
  return true;
};
`;

const finalizeLeftover = String.raw`
if (opts.finalize === true) {
  for (const el of pending()) {
    const p = pathOf(el);
    done.add(p);
    records.push({ p, skip: el.closest('dialog') ? 'dialog-unreachable' : statusOf(el) || 'unvisited-budget' });
  }
}
`;

/**
 * Основной проход: очередь непройденных, область — верхний диалог.
 * С открывателями (второй вызов) умеет переоткрывать диалоги и дожимать оставшееся.
 */
export const sweepSource = `async (opts) => { ${preamble} ${pickNext}
  const records = [];
  const done = new Set(opts.done ?? []);
  const openers = opts.openers ?? {};
  const failed = new Set();
  const deadline = performance.now() + (opts.budget ?? 20000);
  const limit = opts.limit ?? 700;
  while (performance.now() < deadline && records.length < limit) {
    const el = pick();
    if (el !== null) {
      const p = pathOf(el);
      const status = statusOf(el);
      if (status !== '') { done.add(p); records.push({ p, skip: status }); continue; }
      records.push(await clickPath(el, 'sweep', fastInv));
      done.add(p);
      continue;
    }
    if (openDialogs().length > 0) { await closeAll(); continue; }
    if (await reopen(records, fastInv)) continue;
    break;
  }
  await closeAll();
  ${finalizeLeftover}
  const leftover = pending().map((el) => ({ p: pathOf(el), dlg: el.closest('dialog')?.id ?? '', st: statusOf(el) }));
  return { records, done: [...done], leftover,
    truncated: performance.now() >= deadline || records.length >= limit, consoleLeft: drainLog() };
}`;
