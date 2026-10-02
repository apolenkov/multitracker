# Task (Pi): part (a) of the exhaustive UI exploration — read prompts/devin-exhaust.md first, it is the full spec

Work ONLY in /Users/ap/work/multitracker/.claude/worktrees/devin-exhaust (branch devin/ui-exhaust, WIP commit d9a6b93 already holds 15 modules in scripts/exhaust/ and tests/exhaust-core.test.ts). Never touch other worktrees or /Users/ap/work/multitracker. NEVER push, no `git stash`. Another executor is editing src/ and scripts/ui-*.ts in a DIFFERENT worktree: do NOT edit anything under src/ (revert the errorText shim in src/ from d9a6b93 if it is only a src/ change, record that in the report) and do not edit scripts/check-ui.ts or scripts/ui-*.ts.
Strictness: no `let`, no mutation, complexity <= 10, file <= 300 lines, function <= 50 lines (new code in scripts/exhaust/** and tests/exhaust-core.test.ts should aim for file <= 250, function <= 25, branches <= 8); never relax eslint/oxlint/tsconfig/gitleaks; never weaken a test.

## Scope: Layers 1–3 only
Finish: (1) click log JSONL per spec; (2) element-coverage registry of untouched elements with a ratchet file (committed baseline, count may only go down); (3) code coverage via V8 precise coverage + source maps, per-section report. Add the runner entry `scripts/exhaust/run.ts` and `npm run test:ui:exhaust` wired like test:ui through scripts/ui-docker.sh. Layers 4 (design review at click time), axis pairs, forms and random walks are NOT in this task.
## Isolation
Docker container names must start with `mt-exhaust-`, dev server port 5179 only, own agent-browser session. Do not stop or touch other containers. Run UI only inside the Linux container (macOS Chrome floods keydown).
## Verification (real output, no claims without it)
`npm run format`, `npm run typecheck`, `npm run complexity`, `npm test`, `npm run check` (exit 0), then one container run of the exhaust runner on a built dist; report the produced log size, element coverage % per section and code coverage %. Unknown or unrun = NOT VERIFIED.
## Commits and report
Small logical commits with trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Report in plain Russian to /Users/ap/work/multitracker/docs/audits/2026-10-01-claude-crawl-final/exhaust-a-report.md; final summary <= 12 lines.
