# shadcn-примитивы и минимализм макета — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть 23 пункта `docs/audits/2026-09-30-claude-crawl/visual-review-1.md` и окно-в-окне, подключив Tailwind + shadcn/ui как основу для меню и переключателей, без изменения демо-сценариев.

**Architecture:** Tailwind v4 без preflight и shadcn-примитивы (Radix) вводятся рядом с существующим CSS; примитивы стилизуются через `cn()` и токены `src/appearance.css`. Заменяются только ручные компоненты, которые ломаются (меню «⋯» → DropdownMenu, чипы → Tabs). Нативные `<dialog>`, `<details>` и `<select>` верхней панели остаются: на них завязаны 39/22/8 проверок и мобильные системные списки; их дефекты чинятся CSS.

**Tech Stack:** React 19, Vite 8, TypeScript, Tailwind 4 (`@tailwindcss/vite`), `radix-ui`, `clsx`, `tailwind-merge`. Без lucide: значки из `src/Icon.tsx`.

**Spec:** `docs/audits/2026-09-30-claude-crawl/visual-review-1.md` (пункты 1–23), `docs/audits/2026-09-30-claude-crawl/handoff.md`, направление — минимализм (один акцент, границы 1 px, без вложенных рамок).

## Global Constraints

- CSS-файл ≤ 300 строк (`npm run complexity`); функция ≤ 50 строк; сложность ≤ 10; `functional/no-let`, `functional/immutable-data`.
- 11 разделов, RU/EN, темы, RUB/USD, скрытие сумм и все демо-сценарии сохраняются; финансовые числа не меняются.
- Зелёная панель стоимости (`--hero-bg`) и шрифт Inter не трогать.
- Тексты, по которым ищут проверки (`scripts/ui-*.ts`, `tests/`), меняются только вместе с проверками в той же задаче.
- Каждая задача заканчивается зелёными `npm run typecheck && npm run complexity` и коммитом; `npm run check`, `test:ui`, `test:smoke` — один раз в задаче 10.
- Работа в worktree `.claude/worktrees/shadcn`, ветка `claude/shadcn-primitives`; dev-сервер на порту 5174 (`npx vite --port 5174`), чтобы не мешать 5173.
- Измерения — через `agent-browser` с собственной сессией: `export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix "task-$(date +%s)-$$")"`.

## Review Focus

1. Клавиатура в меню «⋯»: Escape закрывает и возвращает фокус на кнопку; стрелки ходят по пунктам — тест в задаче 2.
2. Меню у последней строки на 375 px не уходит под нижнюю навигацию — тест в задаче 2.
3. Ошибка формы появляется после попытки отправки, а не при открытии; после исправления исчезает — тест в задаче 7.
4. Тёмная тема: примитивы берут цвета из токенов, а не из палитры Tailwind — тест в задаче 1 (снимок 1440 dark обзора без изменений).
5. Скрытие сумм действует в новых меню и переключателях — проверка в задаче 10 (test:ui сценарий скрытия).

---

### Task 1: Основа Tailwind + shadcn

**Files:**
- Modify: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`
- Create: `src/tailwind.css`, `src/lib/utils.ts`, `components.json`
- Create: `docs/decisions/decision-091-tailwind-shadcn.md`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` в `src/lib/utils.ts`; алиас `@/` → `src/`; `@theme` с `--color-ink`, `--color-muted`, `--color-paper`, `--color-surface`, `--color-canvas`, `--color-line`, `--color-primary`, `--color-primary-ink`, `--color-focus`, `--color-gain`, `--color-loss`, каждая = `var(--…)` из `src/appearance.css`; `--radius-control: 8px`, `--radius-panel: 12px`.

- [ ] **Step 1: Установить зависимости**

Run: `npm i tailwindcss @tailwindcss/vite radix-ui clsx tailwind-merge`
Expected: `package.json` содержит все шесть; `npm audit --audit-level=high` — 0 high.

- [ ] **Step 2: `src/tailwind.css` без preflight**

```css
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
@theme { /* токены из Interfaces */ }
```
Импортировать первым в `src/main.tsx`. Preflight не подключать (иначе сломается `base.css`).

- [ ] **Step 3: Алиас и `cn`**

`vite.config.ts`: `plugins: [react(), tailwindcss()]`, `resolve.alias['@'] = fileURLToPath(new URL('./src', import.meta.url))`. `tsconfig.json`: `"baseUrl": "."`, `"paths": {"@/*": ["src/*"]}`. `src/lib/utils.ts`: `cn` = `twMerge(clsx(inputs))`. `components.json`: style `new-york`, `tailwind.css: src/tailwind.css`, `aliases.utils: @/lib/utils`, `aliases.components: @/components`, `iconLibrary: none`.

- [ ] **Step 4: Проверить, что макет не изменился**

Run: `npm run typecheck && npm run complexity && npm run build`
Expected: код 0. Снимок `#overview` 1440 light и dark через agent-browser до/после: `agent-browser eval 'document.body.innerText.length'` совпадает; глазом — без визуальных отличий.

- [ ] **Step 5: ADR и коммит**

`decision-091`: первая зависимость сверх React; причина — готовые доступные примитивы для меню и переключателей на телефоне и десктопе; preflight отключён; нативные dialog/details/select сохранены (см. Architecture).
Run: `git add -A && git commit -m "Add Tailwind and shadcn foundation without preflight"`

### Task 2: DropdownMenu вместо ручного `ActionMenu` (ревью 2, 7, 10)

**Files:**
- Create: `src/components/ui/dropdown-menu.tsx`
- Modify: `src/ActionMenu.tsx` (тело), `src/records/HistoryRow.tsx:53-64`, `src/records/Portfolios.tsx:135`, `src/records/PortfolioAccounts.tsx:33`, `src/records.css` (удалить `.record-menu-options` позиционирование), `scripts/ui-record-menu-checks.ts`, `scripts/ui-smoke-menus.ts`
- Create: `src/insights/`-независимо — нет.

**Interfaces:**
- Consumes: `cn` из задачи 1.
- Produces: `ActionMenu({ name, className, label, items }: { name: string; className: string; label: string; items: ReadonlyArray<{ label: string; ariaLabel: string; onSelect: () => void; danger?: boolean }> })`. DOM: триггер `button.action-menu-trigger[aria-label][aria-haspopup="menu"]` 44×44 со значком `more`; контент `[role="menu"].record-menu-options` в портале, пункты `[role="menuitem"]`, опасный пункт — `.danger` и отделён `[role="separator"]`.

- [ ] **Step 1: Обновить проверки, чтобы они краснели**

`scripts/ui-record-menu-checks.ts` и `scripts/ui-smoke-menus.ts`: открывать по клику на `button.action-menu-trigger`, ждать `[role="menu"]`, пункты — `[role="menuitem"]`, закрытие — Escape и проверка `document.activeElement === trigger`. Добавить проверку: на 375 px у последней строки операций `menu.getBoundingClientRect().bottom <= navigation.getBoundingClientRect().top`.
Run: `MULTITRACKER_UI_URL=http://127.0.0.1:5174 npm run test:ui` (только сценарии меню)
Expected: FAIL — триггера нет.

- [ ] **Step 2: Сгенерировать примитив**

Run: `npx shadcn@latest add dropdown-menu --yes`; в файле заменить импорты lucide на `Icon`; `Content`: `side="bottom" align="end" sideOffset={8} collisionPadding={{ bottom: 72 }}` (учёт нижней навигации), классы: `bg-paper border border-line rounded-control p-1 min-w-44`, пункт `h-11 px-3 rounded-control`, без теней кроме `shadow-[0_12px_32px_rgb(0_0_0/18%)]` (как у «Ещё»).

- [ ] **Step 3: Переписать `ActionMenu` и три вызова**

Вызовы передают `items` вместо детей-кнопок. «Удалить» — последний, `danger`, за separator. Удалить `menuPosition`, `closeMenu`, `name=` и `.record-menu-options { position … }` из `records.css`.

- [ ] **Step 4: Проверки зелёные**

Run: тот же `test:ui` (сценарии меню) + `npm run typecheck && npm run complexity`
Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "Replace hand-rolled action menu with DropdownMenu"`

### Task 3: Строки списков: портфели и операции (ревью 2, 7, 16)

**Files:**
- Modify: `src/records/Portfolios.tsx`, `src/records/PortfolioAccounts.tsx`, `src/records/HistoryRow.tsx`, `src/records.css`, `src/records/copy.ts`, `src/list-identity.css`, `scripts/ui-record-menu-checks.ts` (селектор «Подробнее»)

**Interfaces:**
- Consumes: `ActionMenu` из задачи 2.

- [ ] **Step 1: Портфели** — триггер «⋯» в одной строке с названием, справа перед шевроном; счета выровнены по названию портфеля (один отступ слева, без символа `└`); слово «Счёт» после имени счёта убрать (`copy.ts`).

- [ ] **Step 2: Операции** — кнопку «Подробнее» убрать; вся строка — `button.history-row-open` с `aria-label="${copy.details}: ${title}"` (сохранить текст aria-label, чтобы проверки по нему находили цель); «⋯» справа; подпись «Сумма» из строки убрать, показать один раз в шапке списка (`.history-head`, `aria-hidden` для мобильных подписей ≤600 px сохранить).

- [ ] **Step 2b: Избранное (ревью 10)** — в строке правила «Изменить» остаётся кнопкой, «Приостановить» и «Удалить уведомление» → `ActionMenu` (`name="rule-menu"`); пустое состояние — основная кнопка `.primary` «Найти актив» (ведёт в `#markets`); отступы между блоками — 24 px. Файлы: `src/market/Following*.tsx`, `src/market/market.css`.

- [ ] **Step 3: Проверить геометрию**

`agent-browser eval`: на `#history` 1440 высота `.history-row` ≤ 72 px; на `#portfolios` `button.action-menu-trigger` в строке названия: `|trigger.top − title.top| ≤ 12`.
Run: `test:ui` сценарии операций/портфелей → PASS.

- [ ] **Step 4: Commit** — `git commit -am "Flatten portfolio and history rows"`

### Task 4: Диалоги: прокрутка тела, подвал, окно-в-окне (ревью 4, 11, 13)

**Files:**
- Modify: `src/dialog-layout.css`, `src/Dialog.tsx` (`DialogHeading` — sticky), `src/insights/Catalog.tsx`, `src/demo/sync-conflict.tsx`, `src/events/*` (напоминание), `scripts/ui-smoke-dialogs.ts` (проверка «один открытый диалог»)

- [ ] **Step 1: Проверка краснеет** — в `ui-smoke-dialogs.ts` добавить: после любого клика `document.querySelectorAll('dialog[open]').length ≤ 1`. Run `npm run test:smoke` → FAIL на cash-catalog → buy.

- [ ] **Step 2: Окно-в-окне** — в `Catalog.tsx` обработчик, открывающий покупку из каталога, сначала `closeDialog('cash-catalog-dialog')`, затем `openDialog('buy-dialog')`; после закрытия покупки фокус — на `.cash-catalog-open`.

- [ ] **Step 3: Подвал и шапка** — `dialog :is(.form-actions,.dialog-actions)`: `border-top: 1px solid var(--line); padding-top: 16px; margin-top: 16px`; `dialog .dialog-heading`: `position: sticky; top: 0; background: var(--paper); z-index: 1; margin-bottom: 16px`. Убрать `scroll-padding-bottom` хак, если после этого `scrollIntoView` полей не прячется под подвал (проверить полем «Дата операции» в покупке на 1440×900: `field.bottom ≤ actions.top`).

- [ ] **Step 4: Конфликт синхронизации** — главная кнопка `.primary` (залитая); подписи «Локальная версия / Версия из облака» один раз в шапке таблицы сравнения; строку «Выбрана версия: …» убрать.

- [ ] **Step 5: Напоминание** — заголовок `«Напоминание · ${название}»` (без двоеточий), «Назад к событию» — `button.link-back` со значком `chevron` влево, поле минут по умолчанию `15`.

- [ ] **Step 5b: Диалог актива (ревью 16)** — «Позиция», «Себестоимость», «Результат», «Цена и источник» — один список `dl.fact-list` «подпись слева — значение справа», линии только между группами; раскрытие «Цена и источник» по умолчанию закрыто. Файл: `src/insights/AssetDialog*.tsx`.

- [ ] **Step 6: Run** `npm run test:smoke` → PASS; `test:ui` диалоги → PASS. Commit `Fix dialog footer, nested dialog and dialog copy`.

### Task 5: Верхняя панель и ширина контента (ревью 1, 3, 12, 22)

**Files:**
- Modify: `src/layout-core.css:89-127`, `src/layout.css:105`, `src/base.css:71-74`, `src/Topbar.tsx` (удалить `.utility-caption`), `src/demo.css:2,215`, `src/market/market.css:2`, `src/analytics/analytics.css:4`, `src/layout-core.css:~170` (`.status-message:empty`), настройки — `src/demo/settings-layout.tsx` (одна колонка)

- [ ] **Step 1: Верхняя панель** — `.utility-controls { display:flex; gap: 8px }`, `select { width:auto; min-width: 72px }`, подписи только `visually-hidden`; `.topbar :focus-visible { outline-offset: 1px }`; удалить второй набор колонок в `layout.css:105`.
Проверка: `agent-browser eval` — `[...document.querySelectorAll('.utility-controls select')].every(s => s.getBoundingClientRect().top >= 10)` и высота `.topbar` = 64.

- [ ] **Step 2: Одна ширина** — убрать `max-width` 960/1060/1120 у `.demo-content`, `.demo-status`, `.market-page`, `.analytics-screen`; ширину задаёт только `.workspace` (1520). Настройки — одна колонка `max-width: 640px`? Нет: одна колонка на всю ширину контента, строка «подпись слева — управление справа».
Проверка: для каждого из 11 маршрутов `Math.max(...[...document.querySelectorAll('#main > * > *')].map(e => e.getBoundingClientRect().right))` одинаков (±2 px) и равен правому краю `.page-heading`.

- [ ] **Step 2b: Аналитика и разделители (ревью 17, 23)** — у `.analytics-card` (или аналога) убрать фон и рамку, оставить `border-bottom`; таблица значений графика — `overflow-x: auto` на всю ширину контента; четыре раскрытия объединить в одно «О данных» (тексты сохранить внутри). В `src/appearance.css` светлая `--line` → `#9fb0a6` (контраст с холстом ≥ 3:1; проверить формулой WCAG в eval). Файлы: `src/analytics/analytics.css`, `src/analytics/*.tsx`.

- [ ] **Step 3: Пустоты** — `.status-message:empty { display: none }`. Проверка: на `#following` расстояние от низа `h1` до следующего блока ≤ 32 px.

- [ ] **Step 4: Commit** — `git commit -am "Unify content width and simplify the top bar"`

### Task 6: Tabs вместо чипов и залитых переключателей (ревью 9, 14, 15)

**Files:**
- Create: `src/components/ui/tabs.tsx`
- Modify: `src/ValueHistory.tsx` (периоды), `src/events/Feed.tsx`, `src/events/Recap.tsx`, `src/HoldingsTable.tsx` (сортировка), `src/market/MarketList.tsx` (плашка %, звезда, «Фильтры 0»), `src/charts.css`, `src/events/events.css`, `src/market/market.css`, `src/finance.css`

- [ ] **Step 1: Примитив** — `npx shadcn@latest add tabs --yes`; стиль: `TabsList` без фона и рамки, `TabsTrigger` — текст, выбранный `border-b-2 border-primary text-ink`, остальные `text-muted`; высота 44.

- [ ] **Step 2: Замены** — периоды графика, три ряда фильтров событий (один `Tabs` на ряд), сортировка активов (текстовый переключатель вместо «Актив ⌄»/«Стоимость»). Текст вкладок не менять (по нему ищут проверки).

- [ ] **Step 3: Рынки** — `% изменения`: убрать заливку и рамку, оставить цвет `--gain`/`--loss`; звезда — кнопка без рамки 44×44; счётчик «Фильтры N» показывать только при N > 0; рамки `.market-indexes` и `.market-list` → разделители `border-bottom: 1px solid var(--line)`.

- [ ] **Step 4: Run** `test:ui` сценарии обзора, событий, рынков → PASS; commit `Use Tabs for period and feed switches, flatten market rows`.

### Task 7: Формы: ошибки после отправки, без дублирующих заголовков (ревью 5, 6, 21)

**Files:**
- Modify: `src/forms/OperationForm.tsx`, `src/forms/OperationControl.tsx`, `src/forms/EntityDialog.tsx`, `src/forms/EntityFields.tsx`, `src/forms/copy.ts`, `src/forms/forms.css`, `src/base.css:58` (disabled), `scripts/ui-operation-checks.ts`

- [ ] **Step 1: Проверка краснеет** — в `ui-operation-checks.ts`: сразу после открытия покупки `document.querySelectorAll('dialog[open] [role="alert"]:not(:empty)').length === 0`; после клика «Добавить покупку» с пустым количеством — ошибка под полем «Количество» с текстом `copy.errors.quantity`. Run → FAIL.

- [ ] **Step 2: Состояние `submitted`** — ошибки рендерятся только при `submitted || touched[field]`; текст по полю: `quantity: 'Введите количество больше 0' / 'Enter a quantity above 0'`, `price: 'Введите цену больше 0' / 'Enter a price above 0'`, `fee`: прежний текст только у комиссии.

- [ ] **Step 3: Группы** — заголовки групп, совпадающие с подписью единственного поля («Актив», «Портфель назначения», «Учебный ключ»), убрать; все подписи сверху; «Количество» и «Цена» в одной строке сетки.

- [ ] **Step 4: Disabled** — `button:disabled { opacity: 1; background: var(--surface); color: var(--muted); border-color: var(--line) }`; рядом с заблокированной кнопкой подключения — текст причины (`copy.needsCheck`).

- [ ] **Step 5: Run** → PASS; commit `Show form errors after submit and drop duplicate group headings`.

### Task 8: Копирайт «демо/учебный/пример» и раскрытия (ревью 8, 18, 19, 20)

**Files:**
- Modify: `src/i18n.ts`, `src/Topbar.tsx` (бейдж «Демо» убрать; остаётся «Демонстрационные данные» в боковой панели), `src/disclosure.css` (один вид summary: шеврон слева, вес 500), `src/Workspace.tsx` (помощь и «О приватности» — один ряд ссылок без линий), `src/demo/import-*.tsx` (одна главная «Начать импорт», остальное в `ActionMenu`; «Шаг N из 5» один раз), `.status-message` (высота зарезервирована: `min-height: 44px`), все `scripts/ui-*.ts` и `tests/`, где ищется изменённый текст

- [ ] **Step 1: Список текстов** — `grep -rn "пример\|учебн\|example\|teaching" src/i18n.ts src/**/copy.ts` → таблица «было → стало» в сообщении коммита. Из заголовков и кнопок слово убрать («Сохранить», «Проверить подключение», «Уведомления о цене», «История импорта»); оговорки остаются в подвале и «Как пользоваться».

- [ ] **Step 2: Синхронно обновить проверки** — `grep -rln "<старый текст>" scripts tests` для каждой строки.

- [ ] **Step 3: Run** `npm run test && npm run typecheck` → PASS; commit `Cut demo wording from headings and unify disclosures`.

### Task 9: Документы

**Files:**
- Modify: `DESIGN.md` (Components: DropdownMenu, Tabs, подвал/шапка диалога, верхняя панель без подписей, одна ширина контента; Colors без изменений), `docs/design/current-style.md`, `README.md` (Tailwind/shadcn, порт 5174 не упоминать), `docs/audits/2026-09-30-claude-crawl/handoff.md` (статус)
- Backlog: задача через `backlog` CLI с целью, решениями, сделанным.

- [ ] **Step 1:** Run `npx @google/design.md lint --format json DESIGN.md` → `summary.errors = 0`.
- [ ] **Step 2:** Commit `Document shadcn primitives and the flattened layout`.

### Task 10: Заморозка и полный прогон

- [ ] **Step 1:** `npm run check` → код 0.
- [ ] **Step 2:** `npx vite preview --port 4174 &`; `MULTITRACKER_UI_URL=http://127.0.0.1:4174 npm run test:ui` → 0 FAIL / 0 NOT VERIFIED; `npm run test:smoke` → 0 ошибок.
- [ ] **Step 3:** Обход контроллера `crawl.mjs` 1440 и 375 → `nested = 0`, `failed = 0`; три ревью по листам → `visual-review-2.md`. Остаток из 23 пунктов — в следующий цикл.
