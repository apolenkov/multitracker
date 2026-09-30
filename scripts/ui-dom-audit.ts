import assert from 'node:assert/strict';
import { evaluate, type Browser } from './ui-driver.ts';

/** Read-only DOM evidence, apart from temporary scrolling for hit testing. */
export type DomReport = Readonly<{
  meta: Readonly<Record<string, unknown>>;
  nodes: readonly Readonly<Record<string, unknown>>[];
  controls: readonly Readonly<Record<string, unknown>>[];
  rows: readonly Readonly<Record<string, unknown>>[];
  suspicions: readonly Readonly<Record<string, unknown>>[];
}>;

const inspection = String.raw`(() => {
  const short = (value, limit = 100) => {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    return text.length > limit ? text.slice(0, limit - 1) + '…' : text;
  };
  const round = (value) => Math.round(value * 10) / 10;
  const box = (rect) => ({
    x: round(rect.x), y: round(rect.y), width: round(rect.width),
    height: round(rect.height), right: round(rect.right), bottom: round(rect.bottom),
  });
  const path = (element) => {
    if (!element || element === document.documentElement) return 'html';
    const parent = element.parentElement;
    const siblings = parent ? Array.from(parent.children).filter((item) => item.tagName === element.tagName) : [];
    const segment = element.tagName.toLowerCase() + (element.id ? '#' + CSS.escape(element.id) : ':nth-of-type(' + (siblings.indexOf(element) + 1) + ')');
    return path(parent) + ' > ' + segment;
  };
  const role = (element) => element.getAttribute('role') || ({
    A: 'link', BUTTON: 'button', SELECT: 'combobox', TEXTAREA: 'textbox',
    SUMMARY: 'button', DIALOG: 'dialog', INPUT: element.type === 'checkbox' ? 'checkbox' : element.type === 'radio' ? 'radio' : 'textbox',
  })[element.tagName] || null;
  const name = (element) => {
    const labelledBy = element.getAttribute('aria-labelledby');
    const referenced = labelledBy?.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
    const labels = 'labels' in element && element.labels ? Array.from(element.labels).map((label) => label.textContent).join(' ') : '';
    const candidates = [referenced, element.getAttribute('aria-label'), labels, element.getAttribute('alt'), element.getAttribute('title'), element.textContent];
    return short(candidates.find((candidate) => candidate && String(candidate).trim()) || '', 120);
  };
  const openModals = [...document.querySelectorAll('dialog[open]')];
  const modal = document.activeElement?.closest('dialog[open]') ?? openModals.at(-1) ?? null;
  const modalScope = (element) => !modal ? 'none' : modal.contains(element) ? 'inside' : 'background';
  const blocked = (element) => Boolean(element.closest('[inert], [aria-hidden="true"]'));
  const visible = (element, rect) => {
    if (!rect.width || !rect.height || !element.getClientRects().length) return false;
    return ![element, ...ancestors(element)].some((node) => {
      const style = getComputedStyle(node);
      const closed = node !== element && node.tagName === 'DETAILS' && !node.open &&
        !node.querySelector(':scope > summary')?.contains(element);
      return closed || node.hidden || style.display === 'none' ||
        style.visibility === 'hidden' || style.visibility === 'collapse';
    });
  };
  const ancestors = (element) => {
    const parent = element.parentElement;
    return parent ? [parent, ...ancestors(parent)] : [];
  };
  const style = (element) => {
    const computed = getComputedStyle(element);
    return {
      color: computed.color, background: computed.backgroundColor,
      border: computed.borderColor, borderWidth: computed.borderWidth,
      radius: computed.borderRadius, font: computed.fontFamily,
      fontSize: computed.fontSize, fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight, textAlign: computed.textAlign,
      overflowX: computed.overflowX, overflowY: computed.overflowY,
      outline: computed.outlineStyle,
    };
  };
  const elements = [document.body, ...document.body.querySelectorAll('*')];
  const paths = new Map(elements.map((element) => [element, path(element)]));
  const nodes = elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      path: paths.get(element), parent: paths.get(element.parentElement) ?? null,
      tag: element.tagName.toLowerCase(), role: role(element), name: name(element),
      text: short(element.children.length ? '' : element.textContent),
      bounds: box(rect), style: style(element), visible: visible(element, rect),
      inert: blocked(element), modalScope: modalScope(element),
      disabled: element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true',
      focus: document.activeElement === element,
      expanded: element.hasAttribute('aria-expanded') ? element.getAttribute('aria-expanded') === 'true' : element.tagName === 'SUMMARY' ? element.parentElement?.open === true : null,
    };
  });
  const controlSelector = 'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [contenteditable="true"]';
  const hit = (element) => {
    const parents = [document.scrollingElement, ...ancestors(element)].filter((node) => node && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth));
    const saved = parents.map((node) => ({node, top: node.scrollTop, left: node.scrollLeft}));
    element.scrollIntoView({block: 'center', inline: 'center', behavior: 'instant'});
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
    const top = document.elementFromPoint(x, y);
    const associated = top?.closest('label')?.control === element;
    const result = {point: {x: round(x), y: round(y)}, top: top ? path(top) : null,
      reachable: Boolean(top && (top === element || element.contains(top) || associated)),
      inViewport: rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight};
    saved.toReversed().forEach(({node, top, left}) => node.scrollTo({top, left, behavior: 'instant'}));
    return result;
  };
  const controls = elements.filter((element) => element.matches(controlSelector)).map((element) => {
    const node = nodes[elements.indexOf(element)];
    const computed = getComputedStyle(element);
    const eligible = node.visible && !node.inert && node.modalScope !== 'background' && !node.disabled;
    return {
      path: node.path, parent: node.parent, role: node.role, name: node.name,
      bounds: node.bounds, visible: node.visible, inert: node.inert,
      modalScope: node.modalScope, disabled: node.disabled, focus: node.focus,
      expanded: node.expanded, eligible,
      textGeometry: {clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
        renderedText: short(element.tagName === 'SELECT' ? element.selectedOptions?.[0]?.textContent : element.textContent, 80),
        clippedX: element.scrollWidth > element.clientWidth + 2 && !['visible', 'clip'].includes(computed.overflowX),
        clippedY: element.scrollHeight > element.clientHeight + 2 && !['visible', 'clip'].includes(computed.overflowY)},
      hit: eligible ? hit(element) : null,
    };
  });
  const rowKeys = [...new Set(controls.filter((item) => item.visible).map((item) => item.parent + '@' + Math.round(item.bounds.y / 12)))];
  const rows = rowKeys.map((key) => {
    const members = controls.filter((item) => item.visible && item.parent + '@' + Math.round(item.bounds.y / 12) === key);
    const centers = members.map((item) => item.bounds.y + item.bounds.height / 2);
    return {key, paths: members.map((item) => item.path), centerYDelta: round(Math.max(...centers) - Math.min(...centers))};
  }).filter((row) => row.paths.length > 1);
  const suspicions = controls.flatMap((item) => [
    ...(item.eligible && item.hit && !item.hit.reachable && item.hit.inViewport ? [{path: item.path, kind: 'center-hit-obstructed', evidence: item.hit}] : []),
    ...(item.visible && (item.textGeometry.clippedX || item.textGeometry.clippedY) ? [{path: item.path, kind: 'control-overflow', evidence: item.textGeometry}] : []),
  ]);
  return {meta: {url: location.href, title: document.title, language: document.documentElement.lang,
    theme: document.documentElement.dataset.theme ?? null, viewport: {width: innerWidth, height: innerHeight},
    document: {scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight},
    modal: modal?.id ?? null, openModals: openModals.map((item) => item.id),
    focus: document.activeElement ? path(document.activeElement) : null,
    nodeCount: nodes.length, controlCount: controls.length, fontStatus: document.fonts.status},
    nodes, controls, rows, suspicions};
})()`;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDomReport(value: unknown): value is DomReport {
  if (!isRecord(value) || !isRecord(value.meta)) return false;
  if (!('nodes' in value && 'controls' in value && 'rows' in value && 'suspicions' in value)) {
    return false;
  }
  return [value.nodes, value.controls, value.rows, value.suspicions].every(Array.isArray);
}

export function inspectDom(browser: Browser): DomReport {
  const result = evaluate(browser, inspection);
  assert.ok(isDomReport(result), 'DOM probe returned an invalid report');
  return result;
}
