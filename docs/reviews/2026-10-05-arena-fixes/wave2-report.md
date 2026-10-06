# Отчёт: волна 2 правок по итогам арены (задачи 6–10)

Ветка `devin/arena-wave2`, основание — конец волны 1 (`ec21707`). План:
[docs/plans/2026-10-05-arena-fixes.md](../../plans/2026-10-05-arena-fixes.md).

## Сводная таблица

| Задача | Статус | Коммит | Доказательства |
| ------ | ------ | ------ | -------------- |
| 6. Диалоги ввода: фокус, контекст типа, свёрнутый счёт, одна линия шапки | сделана | e64b5fa | scratch-прогоны в Docker: `dialogs:input-initial-focus` (фокус на первом пустом поле: покупка→количество, портфель→имя, остаток→сумма), `dialogs:account-collapsed-summary` (details «Tradernet · основной · Изменить», раскрытие — геометрия, т.к. `checkVisibility()` в Chromium ложь для детей details), `dialogs:fields-above-fold-375` (количество и цена выше липкого подвала 375×667), `dialogs:heading-shared-line` (h2 и крестик на одной линии ±1.5 px), `dialogs:sync-button-16px`, `dialogs:error-stable-footer` (подсказка→ошибка без сдвига: отступ уравнен до px). Все — FAIL на старом, PASS на новом |
| Доп.: фокус вне вьюпорта после закрытия диалога | сделана | 29d3957 | Детерминированное воспроизведение: `scrollTo` под модальным диалогом → `close()` → Chrome возвращает фокус на открыватель вне вьюпорта (y=−322, `checkVisibility()`=true — прежний предикат его пропускал). Фикс: восстановление только на элемент внутри вьюпорта (`elementInViewport`, вынесен в `src/viewport.ts` — тесты тянут `.ts`, а не `.tsx`). Поведенческая проверка в `ui-modal-checks.ts` |
| 7. Импорт: кнопка выше сгиба, чипы, локальные даты | сделана | ac7ac28 | `import:run-above-fold-1440` (кнопка в строке итога над таблицей, y 864→выше фолда), `import:status-chips-both-layouts` (значок+слово в таблице и карточках), `import:localized-dates` (RU «2 сент. 2026 г.»/EN формат через `date()`). FAIL на старом, PASS на новом |
| 8. «Не сухо»: балансы, чипы подключений и синхронизации, N2 дубль анонса | сделана | be28632 | `views`-проверки в `ui-dry-checks.ts`: балансы счетов читаемы (обычное начертание, справа), чипы «Настроено/Не настроено» с значком, `.sync-state` — чип в одну строку; `sync:single-status-announcement` (роль status снята с `.sync-state` — объявлением остаётся тост), `sync:device-columns` (общие колонки через subgrid). FAIL на старом, PASS на новом |
| 9. Суммы операций в валюте операции со знаком | сделана | c278feb | `operations:amount-operation-currency`: строка — сумма в валюте операции со знаком направления (пополнение `+100,00 $`, вывод `−100,00 $`); краевой случай `opening` — ноль без знака (`exceptZero`); пересчёт по курсу даты — в деталях записи (`cost`), не в строке. `amountLike` знак покрывает. FAIL на старом, PASS на новом |
| 10. Обзор: легенда одна серия + «Подробнее: <актив>» | сделана | cf61dc8 | `overview:chart-legend-asset-details`: в «Данные и расчёт» ровно одна серия (dt+key-line), «Внесено» — текстом факта, не линией; имя актива — кнопка 44×44 с `aria-label «Подробнее: <актив>»/«Details: <asset>»` и шевроном. FAIL на старом, PASS на новом |
| Регресс: счета ≤600 | сделана | 294cb5a, 0bd1273 | Двустрочные строки (имя / остаток слева / действие справа) вместо `overflow-wrap: anywhere`; затем фикс специфичности (`ul.account-list`): records.css грузится позже и тихо отбирал `text-align` и шаблон колонок — появлялся фантомный трек 0 px и баланс оставался справа. Проверка `Range.getBoundingClientRect()` на чернильные границы текста — FAIL на старом, PASS на новом |
| Регресс: label под крестиком при автофокусе | сделана | fd97892, 86b4ca9 | Матрица FORM-031..041 (375, оба языка и темы): `focus()` прокручивал форму на ~42/154 px → label «Тип операции» уходил под бокс крестика → `overlap`. `preventScroll` ломал `fields-above-fold-375` (поля под подвалом). Решение — не сужать подписи: `.dialog-heading` — непрозрачный sticky-слой, то же устройство, что освобождённый `.form-actions`; `overlapExempt` + `controlInOpaqueDialogHeading` (безусловно: внутри `dialog{position:fixed}` асимметрии fixed/flow нет; caller требует чужой текст и краску шапки). Матрица 0 FAIL |

## Проверки (выполнены в этой форме)

- `npm run check` — exit 0: format:check, typecheck (ts7 и ts6), complexity+lint, test:gates
  (41 отрицательный / 8 безопасных), test 96/96, build, security (lint + audit: 0 high/critical),
  secrets (gitleaks: утечек нет).
- `scripts/ui-docker.sh dist check-ui.ts` — exit 0: **83 PASS, 0 FAIL**; вошли и прошли все
  проверки волны 2 (`dialogs:*`, `import:*`, `operations:*`, `overview:*`, `sync:*`,
  `accounts-rows-*`, `dialogs:open-heading-clear`).
- `scripts/ui-docker.sh dist ui-smoke.ts` — **три прогона подряд, каждый exit 0**:
  `found=2334, tested=760, failed=0`, `failureClasses {}` в каждом.
- `scripts/exhaust-docker.sh dist exhaust/matrix.ts` — exit 0: **1080 ячеек, 652 PASS, 0 FAIL**
  (артефакты `docs/audits/2026-10-06-matrix/muwgdsee-19`). До правки заголовочного
  исключения — 44 FAIL (FORM-031..041 × ru/en × light/dark на 375).
- `scripts/exhaust-docker.sh dist exhaust/run.ts` — exit 0 и
  `scripts/exhaust-docker.sh dist exhaust/run.ts --cpus 1` — exit 0: consoleErrors 0,
  elementLedger `missing [] / stale [] / sealed / ok`, codeLedger — только stale (разрешённая
  усадка), skippedClicks share 0.24 при лимите 0.4, findings детерминированно одинаковы
  (215: `radius-off-scale` 156, `spacing-off-scale` 52, `row-misaligned` 6 —
  предсуществующие, не гейты — и один `focus-outside-viewport` `{"x":40,"y":-259}` —
  наблюдение свипа, не гейт; присутствовал и до волны).
- Мини-арена: `scripts/shot-wave2.ts`, 64 снимка в `wave2/` — 6 маршрутов + 2 диалога ×
  1440/375 × RU/EN × светлая/тёмная; каждый просмотрен целиком — обрезки, наложений,
  перекосов и нечитаемого контраста нет.

## Отклонения и регрессы в ходе волны

- a76629c «focus first field without scrolling» заменён: `preventScroll` оставлял
  количество/цену под липким подвалом на 375×667 (своя же проверка `fields-above-fold-375`
  дала FAIL). Возврат браузерной прокрутки + исключение правила для непрозрачной
  `.dialog-heading` — см. строку регресса выше. Проверка `dialogs:open-no-scroll`
  переписана в `dialogs:open-heading-clear`: утверждает, что текст под крестиком
  реально за непрозрачной шапкой (`elementsFromPoint` в центре пересечения).
- `checkVisibility()` в Chromium возвращает `false` для любого содержимого `<details>` —
  раскрытие контекста счёта проверяется `details.open` + ненулевой рамкой.
- Леджеры exhaust перестроены штатно (`npm run exhaust:baseline` из прогона
  `muweotjl-19`, коммит cba7086): сдвиги — позиции новых элементов волны 2
  (`#import-run`, чипы, поля диалогов), без новых некрытых функций.
- В `ui-dry-checks.ts`/`ui-connection-checks.ts`/`ui-cash-flow-checks.ts` исправлены
  устаревшие селекторы и состояния (`.connection-summary > p`, `buy-dialog-type` при
  заблокированном типе, reload перед проверкой анонсов, клик по кнопке «Сравнить
  версии» через scrollintoview — иначе молчит ниже фолда).
- `dialogs:mount-layout-shift-2px` однажды флапнул (гонка скролл-восстановления,
  повторный прогон — PASS); детерминированный механизм описан в DESIGN.md.

## Что не проверено (NOT VERIFIED)

- Голосовое озвучивание `role="status"` скринридером — проверено DOM-наблюдением
  (ровно один видимый непустой регион результата), голосовой вывод не прослушан.
- `focus-outside-viewport {"x":40,"y":-259}` в exhaust — наблюдение свипа
  (transition-фокус над вьюпортом), не гейт; реальный сценарий закрытия диалога
  покрыт проверкой из 29d3957.
- Клавиатура, масштаб 200%, планшет 768 px, диктор — как и в волне 1, вне объёма находок.

## Коммиты волны 2

```
86b4ca9 fix(exhaust): dialog heading exemption must not require fixed asymmetry
0bd1273 fix(portfolios): balance left-aligned under the account name at <=600
fd97892 fix(dialogs): scroll focused field above footer, exempt opaque heading
cba7086 chore(exhaust): regenerate baselines for wave 2 layouts
294cb5a fix(portfolios): two-line account rows at <=600 so names stay clear
a76629c fix(dialogs): focus first field without scrolling the form
cf61dc8 fix(overview): legend names the single plotted series, visible asset details
c278feb fix(history): operation amounts in operation currency with direction sign
be28632 fix(views): readable portfolio balances, connection and sync status chips
ac7ac28 fix(import): run button above fold, status chips, localized dates
e64b5fa fix(dialogs): input focus, locked-type context, collapsed account, aligned heading
29d3957 fix(dialogs): restore focus to an element inside the viewport
```
