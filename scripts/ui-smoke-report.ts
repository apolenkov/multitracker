import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { inspect } from './ui-smoke-dom.ts';
import type { Outcome, State, Entry } from './ui-smoke-dom.ts';
import type { Browser } from './ui-driver.ts';

const outputRoot = resolve(
  process.env.MULTITRACKER_SMOKE_OUTPUT ?? 'docs/audits/2026-09-30-layout-smoke',
);
export const evidence = resolve(outputRoot, String(Date.now()));
execFileSync('mkdir', ['-p', evidence]);
export function escape(value: unknown) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
export function save(name: string, value: unknown) {
  artifact(`${name}.json`, JSON.stringify(value, null, 2));
}
function artifact(name: string, text: string) {
  if (!/^[a-zA-Z0-9-]+\.(json|html)$/.test(name)) throw new Error('Unsafe artifact name');
  execFileSync('tee', [resolve(evidence, name)], {
    input: text,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
}
function contactSheet() {
  const files = execFileSync('find', [evidence, '-maxdepth', '1', '-name', '*.png'], {
    encoding: 'utf8',
  });
  return files
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((file) => {
      const name = file.slice(evidence.length + 1);
      return `<figure><a href="${escape(name)}"><img src="${escape(name)}"></a><figcaption>${escape(name)}</figcaption></figure>`;
    })
    .join('');
}
function htmlIndex(
  entries: readonly import('./ui-smoke-dom.ts').Entry[],
  findings: readonly import('./ui-smoke-dom.ts').Finding[],
  duration: number,
) {
  const rows = entries
    .map(
      (item) =>
        `<tr><td>${escape(item.state)}</td><td>${escape(item.name)}</td><td>${escape(item.status)}</td><td>${escape(item.reason)}</td></tr>`,
    )
    .join('');
  const errors = findings
    .map(
      (item) =>
        `<li>${escape(item.kind)} ${escape(item.path)} <pre>${escape(JSON.stringify(item.observed))}</pre></li>`,
    )
    .join('');
  artifact(
    'index.html',
    `<!doctype html><meta charset="utf-8"><title>Layout smoke</title><style>body{font:16px system-ui;margin:24px}img{max-width:360px}pre{white-space:pre-wrap}td{padding:8px;border-bottom:1px solid #ccc}figure{display:inline-block;vertical-align:top}</style><h1>Layout smoke</h1><p>${escape(duration)} seconds</p><ul>${errors}</ul>${contactSheet()}<table>${rows}</table>`,
  );
}

export function capture(browser: Browser, state: State, suffix: string) {
  const name = `${state.id}-${suffix}`.replaceAll(/[^a-zA-Z0-9-]/g, '-');
  const report = inspect(browser);
  save(name, { ...report.dom, nodes: report.dom.nodes.filter((item) => item.visible === true) });
  browser.run('screenshot', resolve(evidence, `${name}.png`));
  return report;
}
function groups(entries: readonly Entry[]) {
  const key = (item: Entry) =>
    `${item.state}/${item.path.match(/dialog#([a-zA-Z0-9-]+)/)?.at(1) ?? (item.path.startsWith('#buy-dialog-') ? 'buy-dialog' : 'page')}`;
  return Object.fromEntries(
    [...new Set(entries.map(key))].map((scope) => {
      const found = entries.filter((item) => key(item) === scope);
      return [
        scope,
        {
          found: found.length,
          tested: found.filter((item) => item.status === 'tested').length,
          failed: found.filter((item) => item.status === 'failed').length,
          skipped: found
            .filter((item) => item.status === 'skipped')
            .map((item) => ({ path: item.path, name: item.name, reason: item.reason })),
        },
      ];
    }),
  );
}

function failureClasses(findings: readonly import('./ui-smoke-dom.ts').Finding[]) {
  return Object.fromEntries(
    [...new Set(findings.map((item) => item.kind))].map((kind) => [
      kind,
      findings.filter((item) => item.kind === kind).length,
    ]),
  );
}

export function finish(browser: Browser, results: readonly Outcome[], start: number) {
  const ranked = results
    .flatMap((result) => result.entries)
    .toSorted((a, b) => Number(a.status !== 'skipped') - Number(b.status !== 'skipped'));
  const entries = [
    ...new Map(ranked.map((item) => [`${item.state}|${item.path}|${item.name}`, item])).values(),
  ];
  const findings = results.flatMap((result) => result.findings);
  const coverage = {
    byRouteAndDialog: groups(entries),
    found: entries.length,
    tested: entries.filter((item) => item.status === 'tested').length,
    failed: entries.filter((item) => item.status === 'failed').length,
    skipped: entries.filter((item) => item.status === 'skipped'),
    entries,
  };
  const report = {
    durationSeconds: (Date.now() - start) / 1000,
    targetSeconds: 240,
    session: browser.session,
    namespace: browser.namespace,
    version: browser.version,
    url: process.env.MULTITRACKER_UI_URL ?? 'http://127.0.0.1:5173',
    coverage,
    findings,
  };
  save('coverage', report);
  htmlIndex(entries, findings, report.durationSeconds);
  console.log(
    JSON.stringify(
      {
        evidence,
        durationSeconds: report.durationSeconds,
        found: coverage.found,
        tested: coverage.tested,
        failed: coverage.failed,
        skipped: coverage.skipped.length,
        failureClasses: failureClasses(findings),
      },
      null,
      2,
    ),
  );
  return (
    findings.length === 0 &&
    coverage.failed === 0 &&
    coverage.skipped.every((item) => item.reason.length > 0)
  );
}
