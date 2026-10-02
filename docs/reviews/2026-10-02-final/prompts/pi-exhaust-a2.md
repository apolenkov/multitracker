# Task (Devin): finish part (a) of the exhaustive UI exploration — read prompts/devin-exhaust.md first, it is the full spec

Work ONLY in /Users/ap/work/multitracker/.claude/worktrees/devin-exhaust (branch devin/ui-exhaust, already rebased on fix/prototype-design 6cdaf60; contains modules in scripts/exhaust/, tests/exhaust-core.test.ts, tests/exhaust-layers.test.ts, scripts/exhaust-docker.sh, scripts/exhaust/run.ts and sweep.ts from an earlier rate-limited Pi run — treat all of it as UNVERIFIED draft). Never touch other worktrees or /Users/ap/work/multitracker. NEVER push, no `git stash`.
COMMIT EARLY AND OFTEN (after every logical step, trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`): a previous run was killed by a 2-hour limit and lost its commit.
Do not edit src/ (product code) or scripts/ui-*.ts / scripts/check-ui.ts: only scripts/exhaust/**, tests/exhaust-*.test.ts, scripts/exhaust-docker.sh, package.json script entries, .gitignore.
Strictness (new rules just merged): no `let`, no mutation, no type assertions, complexity <= 8, function <= 25 lines, file <= 250 lines for scripts/exhaust/** and tests/exhaust-*.test.ts; never relax or disable eslint/oxlint/tsconfig/gitleaks rules, no eslint-disable, no skipped tests.

## Scope: Layers 1–3 only
1. Make the tree green under the new strict lint: `npm run lint` currently reports errors in scripts/exhaust (spread on string, prefer-regexp-exec, consistent-type-definitions, indexed-object-style, ...). Fix them properly, not by disabling.
2. Finish and verify: (1) click log JSONL; (2) element-coverage registry of untouched elements with a committed ratchet baseline (count may only go down); (3) code coverage via V8 precise coverage + source maps, per-section report. Entry: `npm run test:ui:exhaust` through scripts/exhaust-docker.sh (Linux container only; macOS Chrome floods keydown).
3. Layer 4 (design review at click time), axis pairs, forms and random walks are NOT in this task.
## Isolation
Docker container names start with `mt-exhaust-`; dev server port 5179 only; own agent-browser session; do not touch other containers. Wait for focus/state with `wait --fn` (focus is set in requestAnimationFrame), never read it instantly.
## Verification (real output, no claims without it)
`npm run format`, `npm run typecheck`, `npm run complexity`, `npm test`, `npm run lint`, and one full container run of `npm run test:ui:exhaust` on a fresh build; report log size, element coverage % per section, code coverage %, and how long it ran. Unknown or unrun = NOT VERIFIED. Do NOT run `npm run check` with gitleaks over the 8 GB audits folder in the main copy (only inside this worktree).
## Report
Plain Russian to /Users/ap/work/multitracker/docs/audits/2026-10-01-claude-crawl-final/exhaust-a-report.md (write it BEFORE the final long verification and update after); final summary <= 12 lines.

## Continuation note (read this)
Continue from commit 31b08c1 in this worktree: a previous executor stopped at a rate limit while generating ratchet baselines. State: tests 53/53 green, code coverage 88% (608/692 functions, 124/204 branches), element registry found 614 uncovered elements with an empty baseline. Remaining: ratchet baselines for the element registry and the code coverage, a clean `npm run lint`, one full container run of `npm run test:ui:exhaust`, and the report exhaust-a-report.md. Commit after every step. Treat the earlier numbers as unverified until you reproduce them.
