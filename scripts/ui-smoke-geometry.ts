import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';
import type { DomReport } from './ui-dom-audit.ts';
import { record, type Control, type Finding } from './ui-smoke-dom.ts';

export function geometryFindings(
  dom: DomReport,
  items: readonly Control[],
  browser: Browser,
): readonly Finding[] {
  const viewport = dom.meta.viewport;
  const document = dom.meta.document;
  assert.ok(record(viewport) && record(document));
  assert.ok(typeof viewport.width === 'number' && typeof document.scrollWidth === 'number');
  const overflow =
    document.scrollWidth > viewport.width + 2
      ? [{ kind: 'page-overflow', path: String(dom.meta.url), observed: dom.meta }]
      : [];
  const targets = items
    .filter((item) => item.eligible)
    .flatMap((item) => [
      ...(targetTooSmall(browser, item)
        ? [{ kind: 'target-under-44', path: item.path, observed: item.bounds }]
        : []),
      ...(record(item.hit) && item.hit.inViewport === true && item.hit.reachable === false
        ? [{ kind: 'center-hit-obstructed', path: item.path, observed: item.hit }]
        : []),
    ]);
  const clipped = dom.suspicions
    .filter((item) => item.kind === 'control-overflow')
    .map((item) => ({
      kind: 'control-overflow',
      path: String(item.path),
      observed: item.evidence,
    }));
  return [...overflow, ...targets, ...clipped, ...alignment(dom, browser)];
}
function targetTooSmall(browser: Browser, control: Control) {
  if (control.bounds.width >= 44 && control.bounds.height >= 44) return false;
  if (!['checkbox', 'radio'].includes(control.role)) return true;
  return (
    evaluate(
      browser,
      `(() => {
    const input = document.querySelector(${JSON.stringify(control.path)});
    return !Array.from(input.labels ?? []).some(label => {
      const box = label.getBoundingClientRect();
      return box.width >= 44 && box.height >= 44;
    });
  })()`,
    ) !== false
  );
}

function alignment(dom: DomReport, browser: Browser): readonly Finding[] {
  // Probe groups by approximate y; only an explicit horizontal flex action row promises center alignment.
  return dom.rows
    .filter((row) => typeof row.centerYDelta === 'number' && row.centerYDelta > 2)
    .flatMap((row) => {
      const paths = Array.isArray(row.paths) ? row.paths : [];
      const first = dom.controls.find((item) => item.path === paths.at(0));
      const parent = dom.nodes.find((item) => item.path === first?.parent);
      const classHint = String(parent?.path);
      const intended = evaluate(
        browser,
        `(() => { const p=document.querySelector(${JSON.stringify(classHint)}); if(!p) return false; const s=getComputedStyle(p); return p.matches('.form-actions,.dialog-actions,.history-controls') && s.display==='flex' && s.flexDirection==='row' && s.alignItems==='center'; })()`,
      );
      return intended === true ? [{ kind: 'row-alignment', path: classHint, observed: row }] : [];
    });
}
function elementPath(element: Element): string {
  if (element === document.documentElement) return 'html';
  const parent = element.parentElement;
  const siblings = parent
    ? [...parent.children].filter((item) => item.tagName === element.tagName)
    : [];
  const segment =
    element.tagName.toLowerCase() +
    (element.id
      ? '#' + CSS.escape(element.id)
      : ':nth-of-type(' + (siblings.indexOf(element) + 1) + ')');
  return (parent ? elementPath(parent) + ' > ' : '') + segment;
}
function parentChain(element: Element | null): readonly Element[] {
  return element ? [element, ...parentChain(element.parentElement)] : [];
}
function rowPeers(summary: Element): readonly Element[] {
  return parentChain(summary.parentElement).flatMap((container) => {
    const style = getComputedStyle(container);
    if (
      !['grid', 'inline-grid', 'flex', 'inline-flex'].includes(style.display) ||
      style.flexDirection.startsWith('column')
    )
      return [];
    const own = [...container.children].find((item) => item.contains(summary));
    if (!own) return [];
    const box = own.getBoundingClientRect();
    return [...container.children].filter((item) => {
      const peer = item.getBoundingClientRect();
      return item !== own && peer.bottom > box.top + 2 && peer.top < box.bottom - 2;
    });
  });
}

function positions(selector: string, keys: readonly string[]) {
  const summary = document.querySelector(selector);
  if (!(summary instanceof HTMLElement)) throw new Error('Summary is missing');
  const details = summary.parentElement;
  const rect = summary.getBoundingClientRect();
  const modal = summary.closest('dialog[open]');
  const siblingContainers = [
    summary.closest('.history-row'),
    summary.closest('.balance-panel'),
    ...rowPeers(summary),
  ].filter((item) => item !== null);
  const candidates = [
    ...(modal ?? document).querySelectorAll<HTMLElement>('h1,h2,h3,p,dt,dd,button,summary,svg'),
  ];
  // Pinned elements: their box already includes the stick offset, so adding the
  // ancestor scroll back mis-measures layout position when scrollTop clamps.
  const pinned = (item: Element) =>
    parentChain(item).some((node) => ['sticky', 'fixed'].includes(getComputedStyle(node).position));
  const selected = candidates.filter((item) => {
    if (keys.length > 0) return keys.includes(elementPath(item));
    if (pinned(item)) return false;
    const box = item.getBoundingClientRect();
    return (
      item.checkVisibility() &&
      !details?.contains(item) &&
      (box.bottom <= rect.top + 2 ||
        siblingContainers.some((container) => container.contains(item)))
    );
  });
  const point = (item: HTMLElement) => {
    const box = item.getBoundingClientRect();
    const scrolls = (node: Element | null): number =>
      node && node !== document.body && node !== document.documentElement
        ? node.scrollTop + scrolls(node.parentElement)
        : 0;
    return [box.left + scrollX, box.top + scrollY + scrolls(item.parentElement)];
  };
  return [summary, ...selected].map((item) => ({ key: elementPath(item), point: point(item) }));
}
export function positionState(browser: Browser, path: string, before: unknown = []): unknown {
  assert.ok(Array.isArray(before));
  const keys = before.map((item: unknown) => {
    assert.ok(record(item));
    return String(item.key);
  });
  return evaluate(
    browser,
    `(() => { const elementPath = ${elementPath.toString()}; const parentChain = ${parentChain.toString()}; const rowPeers = ${rowPeers.toString()}; return (${positions.toString()})(${JSON.stringify(path)},${JSON.stringify(keys)}); })()`,
  );
}

export function shifts(before: unknown, after: unknown, path: string): readonly Finding[] {
  assert.ok(Array.isArray(before) && Array.isArray(after));
  return before.flatMap((item: unknown) => {
    assert.ok(record(item) && Array.isArray(item.point));
    const next: unknown = after.find(
      (candidate: unknown) => record(candidate) && candidate.key === item.key,
    );
    if (!record(next) || !Array.isArray(next.point))
      return [{ kind: 'anchor-disappeared', path, observed: item }];
    const x: unknown = item.point.at(0);
    const y: unknown = item.point.at(1);
    const nx: unknown = next.point.at(0);
    const ny: unknown = next.point.at(1);
    assert.ok(typeof x === 'number' && typeof y === 'number');
    assert.ok(typeof nx === 'number' && typeof ny === 'number');
    return Math.max(Math.abs(nx - x), Math.abs(ny - y)) > 2
      ? [{ kind: 'disclosure-shift', path, observed: { key: item.key, dx: nx - x, dy: ny - y } }]
      : [];
  });
}
