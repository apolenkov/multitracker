# Delta capabilities implementation plan

> **Out of current scope:** the owner removed Markets, Favorites, Analytics and
> Events (decision-093); this plan is a historical record of the 11-section
> prototype kept under tag `prototype-full-11-sections`.

> **For agentic workers:** Use superpowers:subagent-driven-development. Root owns integration and one final review; workers own disjoint scenario folders.

**Goal:** Show the documented Delta feature families as usable static scenarios,
without eToro services. The owner subsequently rejected the appearance; the
[four-lens arena](2026-09-30-design-arena.md) defines its replacement direction.

**Architecture:** Reuse the current React shell, native dialogs, local state and
semantic CSS tokens. Add four routes grouped into three scenario modules; keep
them mounted under `hidden` to retain selected demo preferences across routes.
No backend, persistence, generated advice, audio or real external connection.

**Tech Stack:** Existing React, TypeScript, Vite, CSS; no new dependencies.

**Spec:** [D01–D07](../../openspec/changes/delta-capabilities/specs/exploration/spec.md),
[catalogue mapping](../design/delta-capabilities.md).

## Global constraints

- File ≤300 lines, function ≤50 including JSX/blanks, complexity ≤10; no let,
  mutation, suppressions, unsafe HTML or real financial data.
- Existing demo finance fixtures and money formulas stay unchanged.
- New monetary samples use explicit units; hidden balances mask their amounts.
- All strings RU/EN, all surfaces use current theme tokens, controls ≥44 px.
- Native dialog and existing `DemoModal` pattern; no private browser session.

## Review focus

- Empty searches and invalid numeric thresholds must be understandable.
- Switching route/language must not leak dialogs or lose retained demo settings.
- Examples of risk, signals and summaries must not imply live data or advice.
- Small screens must keep every route reachable without covering dialog actions.
- eToro service/log-in links and unlabelled copied financial values are forbidden.

## Task 1: Markets, following and alerts

**Files:** `src/market/` only; add `MarketScreens.tsx`, sample data, detail/alert
forms and `market.css` as needed by responsibility.
**Interface:** `MarketScreens({screen:'markets'|'following',language,currency,hidden})`.
These screens remain mounted. Reuse `Language` and `Currency` existing types.

- [x] Add class/search/mover filters, index examples and selectable asset rows.
- [x] Add asset details, follow toggle and following-list empty state.
- [x] Add create/edit/pause/delete alert examples; validate threshold and show
      a sample confirmation. Include direction, currency and once/repeating rules;
      cancel must discard the draft. Stock details distinguish trading sessions.
- [ ] Root browser check: filter → empty → clear → asset → follow → following;
      invalid alert → corrected save → reopen/cancel; Escape returns focus.

## Task 2: Analytics

**Files:** `src/analytics/` only; `AnalyticsScreen.tsx`, fixtures and local styles.
**Interface:** `AnalyticsScreen({language,currency,baseCurrency,hidden})`.

- [x] Provide meaningful selectable sections for performance/benchmark,
      diversity/location, fees, risk/P-E, decisions and four-asset comparison.
- [x] Include worth/net-investment/cashflow history, realised/unrealised results,
      trade counts and most-used exchanges as distinct illustrated measures.
- [x] Give each metric an explanation and fictional-data disclosure. Do not
      derive fake risk or prediction from the existing three-purchase model.
- [ ] Root browser check: switch every analytical section and period, open
      explanations, change currency and hide amounts; inspect narrow layout.

## Task 3: Events, updates and widget preview

**Files:** `src/events/` only; `EventsScreen.tsx`, sample feed/calendar/dialogs,
`WidgetPreview.tsx`, local styles.
**Interfaces:** `EventsScreen({language,hidden})`, `WidgetPreview({language,hidden})`.

- [x] Provide calendar filter/details and a reminder draft with save/cancel.
- [x] Use full dates, linked validation errors, focus recovery and live feedback.
- [x] Show sample official announcements, movement/insider explanations,
      daily/weekly recap transcript and crypto-signal explanations without advice.
- [x] Add a real in-page widget layout preview for portfolio/market displays.
- [ ] Root browser check: calendar event → reminder validation → save; each
      feed category → details; widget layout choice visibly changes preview.

## Task 4: Shell and appearance integration

**Files:** `src/i18n.ts`, `navigation.ts`, `Navigation.tsx`, `Icon.tsx`,
`Workspace.tsx`, `App.tsx`, `demo/words.ts`, settings files, global styles.

- [x] Add four routes/labels/icons, retain old sections, mobile main four items.
- [x] Add mounted exploration wrappers; close dialogs on route change.
- [x] Add app-wide monochrome preference and widget preview in settings.
- [x] Update route tests, UI screen matrix and explicit new-flow checks.

## Task 5: Verify and hand off

- [x] `npm run check`, `npm run test:ui`, `openspec validate delta-capabilities --strict`.
- [ ] Agent-browser RU/EN, light/dark, 375/768/1440; actual controls and dialogs.
- [x] Four design lenses consolidate all 135 inventory items before implementation.
- [x] One independent final review of the completed implementation and evidence.
- [ ] Update DESIGN, catalogue statuses, personal backlog and draft PR3.

## Execution record

- Initial scope authorised by the owner's explicit request for Delta capabilities.
- Previous design commit: `e0fae4a`, draft PR3; superseded by the arena direction.
- No additional languages were supplied; RU/EN implemented.

## Результат и оставшаяся приёмка

Реализация находится в `src/market/`, `src/analytics/`, `src/events/` и общей
оболочке; её внешний вид заменён по плану арены. Незакрытые пункты ручного
наблюдения выше не означают отсутствия кода: они требуют соответствующих
доказательств, которые автоматический представительский проход не заменяет.

[Приёмка арены](../design/arena/acceptance.md) фиксирует 32/32 теста,
39 проверок ограничений, Linux UI 63/63 PASS с совпавшими 146 входными файлами
и строгую проверку OpenSpec PASS. Пакет содержит 162 актуальных кадра,
8 исторических, 44 сочетания маршрутов/ширин/тем, десять видов операций
и семь категорий настроек. Четыре отчёта по 135 ID дают 540 оценок дизайна,
не функциональных проверок.

F1–F3 исправлены и прошли проверки исполнителя. Итоговое дополнение — восемь
кадров обзора/покупки 320 RU/EN в обеих темах: ширина страницы 320, суммы
легенды не обрезаны; очистка заполненного редактирования сохраняет фокус
и позволяет затем вручную свернуть пустое раскрытие. Единственное независимое
ревью подтвердило F1–F3: **ship** в пределах проверенного статического макета,
открытых существенных замечаний нет. Удалённые проверки привязаны к коммиту;
актуальный результат — [Checks черновика PR3](https://github.com/apolenkov/multitracker/pull/3/checks).
Полный перебор всех форм и размеров остаётся пробелом покрытия. Дополнительные
языки не перечислены; реализованы RU/EN.
Пользовательское одобрение не получено.
