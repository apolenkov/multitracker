# Task (Pi): part (b) of the exhaustive UI exploration — read prompts/devin-exhaust.md (full spec) and exhaust-a-report.md (what part (a) delivered)

Work ONLY in /Users/ap/work/multitracker/.claude/worktrees/devin-exhaust (branch devin/ui-exhaust; the base is merged into fix/prototype-design; part (a) is done and verified: click log, element registry with ratchet baselines, code coverage, runner `npm run test:ui:exhaust`). Never touch other worktrees or /Users/ap/work/multitracker. NEVER push, no `git stash`. COMMIT after every logical step, trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
Do not edit src/ (product code) here: report product defects in the report instead; do not edit eslint/oxlint/tsconfig/gitleaks. Strictness for scripts/exhaust/** and tests/exhaust-*.test.ts: no `let`, no mutation, no type assertions, no eslint-disable, complexity <= 8, function <= 25 lines, file <= 250 lines, no skipped tests.
## Scope: layers beyond (a)
1. Axis pairs: pairwise coverage of language, theme, display currency, settlement currency, hidden amounts, density, monochrome, widths 320/375/768/1440 (generate a covering array, not the full product; record the table).
2. Forms: the 10 operation types × value classes (empty, zero, negative, huge, decimal edge, text in number field, boundary dates); every error appears only after submit, short per-field text.
3. Seeded random walks with shrinking to a minimal repro, invariants after EVERY click (no horizontal overflow, no nested dialogs, no console errors, nothing moves > 2 px outside the changed element, focus lands somewhere sensible).
4. Design review at click time (layer 4 of the spec): contrast (use tokens from DESIGN.md), 44 px targets, text wrap/overflow, layout shift, any visible defect = FAIL. Implement it as deterministic checks ONLY (no AI calls inside the runner).
5. Every FAIL goes to a findings file docs/audits/2026-10-01-claude-crawl-final/exhaust-findings.md with repro record (seed, path, axis values) and a verdict "product defect" vs "checker defect". Fix checker defects; do NOT fix product defects (the coordinator schedules those).
## Isolation
Docker names `mt-exhaust-*`, dev server port 5179, own agent-browser session; Linux container only. Wait for state with `wait --fn`, never read focus instantly (set in requestAnimationFrame).
## Verification (real output)
`npm run format`, `npm run lint`, `npm run typecheck`, `npm run complexity`, `npm test`, and one full container run of `npm run test:ui:exhaust` (budget <= 30 min); report log size, element coverage % per section, code coverage %, number of axis tuples and form cases, findings count. Unknown or unrun = NOT VERIFIED.
## Report
Plain Russian to /Users/ap/work/multitracker/docs/audits/2026-10-01-claude-crawl-final/exhaust-b-report.md (write early, update after verification); final summary <= 12 lines.

## Continuation note (read this)
A previous Pi run stopped on a transient backend 503 after commit cf9d6cd (pure form/walk generators, reports split from the runner) and left a WIP commit with scripts/exhaust/axis-pass.ts (unverified draft). Read exhaust-b-report.md and `git log` first, keep what is sound, redo what is not, and continue: axis pass wiring, forms, random walks with shrinking, deterministic design review at click time, findings file, one full container run, final report. Commit after every step.
