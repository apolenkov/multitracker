# Task: independent adversarial code review (READ-ONLY) of the MultiTracker prototype branch

You are the independent reviewer. You did NOT write this code. Do not modify, create or delete any tracked file, do not commit, do not push, no `git stash`. You may run read-only commands and `npm run typecheck`, `npm test`, `npm run complexity`; write ONLY the report file named below.

Repo (worktree): /Users/ap/work/multitracker/.claude/worktrees/devin-scope, branch devin/scope-cut.
Range to review: `git diff d689ddb..e481428` (d689ddb = last reviewed SHA; includes 20ea2e0 "visible row actions + undo + grouped holdings + one-screen import", the WIP source cut 324f28b, and the cut e481428). Start with `git log --oneline d689ddb..e481428` and `git diff --stat`, then per-path diffs.

## Requirements the branch must meet
1. Owner scope: ONLY 7 sections: Обзор, Портфели, Операции, Импорт, Подключения, Синхронизация, Настройки. Analytics, Markets, Favorites, Events are removed completely (no dead code, hidden flags, leftover copy, CSS, routes, checks). Unknown hash opens Обзор. Phone bottom bar: Обзор / Портфели / Операции / Ещё.
2. Owner UX rule: minimum user actions. No «⋯» overflow menus; visible action icons (44 px) with accessible names containing the subject; reversible actions (delete/archive/cancel import/revoke device/disconnect) run immediately with «Отменить»; explicit confirmation only for Settings «Удаление данных»; overview holdings grouped by type with subtotals; one-screen import; cash rows use a pencil «Изменить остаток: RUB».
3. Reference-repo strictness (owner priority): never relax eslint/oxlint/tsconfig/gitleaks; no `let`, no mutation; complexity <= 10; files <= 300 lines; functions <= 50 lines. Tests must never be weakened: an assertion removed or loosened instead of updated, a check that can no longer fail, a probe that now skips what it used to cover. Judge each change to scripts/ui-smoke*.ts and scripts/ui-*-checks.ts adversarially (it was reported that anchors inside sticky/fixed containers were excluded from shift measurement and a probe was changed to accept `tr.holding-row` — verify these are legitimate and still able to fail).
4. Hidden-amounts mode must not reveal amounts or result signs through any new component (grouped holdings subtotals, pencil actions, undo messages, settings widget).
5. Keyboard/focus: after any dialog or undo, focus returns to a sensible visible element; Radix/native dialog interplay; `role=status` messages.
6. Repo organisation: files in right directories; dead/orphaned code; string references to removed files/selectors/routes in scripts, CI (.github/workflows), package.json scripts, docs (typecheck does not catch them); stale claims in DESIGN.md, README, AGENTS.md, PRODUCT.md, docs/design/*; form-inventory: removed IDs marked out of scope, not deleted.
7. Both RU and EN present for every visible string; no leftover words «Рынки/Избранное/Аналитика/События» in UI strings or help text.

## Method
- Verify every finding adversarially before listing it (try to disprove it by reading the code path); drop what you cannot confirm or mark PLAUSIBLE.
- Grep leftovers: market(s), analytics, events (as section), favorites/following, alert, calendar, catalog, exploration, widget market variant, «⋯»/ActionMenu/dropdown-menu, unused exports/files; check package.json for now-unused dependencies.
- List every behaviour you set aside under «Declined to judge», one line each with the reason.

## Output
Write /Users/ap/work/multitracker/docs/audits/2026-10-01-claude-crawl-final/review-devin-final.md in Russian: findings table `severity (Critical/Important/Minor) | file:line | fact | failure scenario | fix`, then «Declined to judge», then verdict `ready to show the owner: yes / yes after fixes / no`. Print a summary of at most 12 lines at the end. Unknown or unrun = NOT VERIFIED, never PASS.
