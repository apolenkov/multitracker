# Закрытие находок независимого перепроверки (rereview-pi.md)

Ветка `devin/ui-rereview-fixes` от cbfcc5e (fix/prototype-design), worktree
`devin-exhaust`. Исполнитель: Devin (SWE-2 Max). Коммит после каждой находки,
trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

Статусы: fixed / documented / NOT VERIFIED. Незапущенное — NOT VERIFIED.

## Находки

| id | статус | коммит | доказательство |
| --- | --- | --- | --- |
| N1 (+R1) | fixed | 894b77f | `checkLedger`: `ok = sealed && missing===0 && stale===0` — любое расхождение книги с замером роняет прогон до явной пересборки; `rebuild` пишет снимок текущего замера целиком вместо `unionEntries` (книга 642→579 элементов, 87→69 функций). Тесты: missing/stale падают, пересборка проходит, новый непокрытый падает; скретч-демонстрация старого (`stale ok=true`, union держит `gone`) против нового поведения — вне репозитория. Прогон muqe4wo8-15: `elementLedger.stale=[] missing=[] sealed=true ok=true`. |
| N2 | documented | 0a072bf | Технически не закрывается: печать — открытый sha256 без секрета. Зафиксировано одним предложением в `DESIGN.md` («Границы проверки») и `decision-094`: печать ловит случайные правки, намеренный сброс книги виден только в кодовом ревью. |
| N3 (+C4) | fixed | 7335d5e | `SKIP_SHARE_LIMIT = 0.4` (норма прогона 0.346). В `summary.json` пишутся измеренные доли: проверочная `share`, `sweep` (571/1163 = 0.491) и `total` (598/1241 = 0.482) — пропуски обхода видны и не размывают проверочный знаменатель. Тесты: граница 0.4 проходит, 0.5 падает; все три доли считаются. |
| N4 (+C3) | fixed | 02a922b | `leakSelectors`/`moneySelectors` — экспортируемые константы; денежные слоты дополнены `.portfolio-value`, `.record-values dd`, `.summary-result dd`, `.import-result`, `.widget-value` (сверено с разметкой src). Тест на каждый слот с эмуляцией `closest`/`querySelectorAll` (`tests/dom-match.ts`): слот сканируется и денежный, голая цифра при скрытии — находка, при показе — легальна; даты и счётчики в слоте разрешены; обычный `dd` вне слотов — не денежный. |
| N5 | fixed | 7d1a999 | Освобождение overlap сужено до `.mobile-links` (`page-structure.ts`): `.more-menu` есть в DOM только при `expanded` (сосед панели), его контролы получают `closest('.mobile-links')=null` и остаются находками. Тест обоих состояний: кнопка закрытой панели освобождена, кнопка открытого меню — нет. |
| N6 | fixed | c867548 | Леджерные и ratchet-проверки собраны в `tests/exhaust-ratchet.test.ts` (173 строки); `exhaust-layers.test.ts` ужат до 237 строк — запас под лимитом 250 восстановлен. |

## Проверки

| проверка | результат | вывод |
| --- | --- | --- |
| npm run format | PASS | переформатирован только мой тест N3 — нормализация в коммите 0fe313a |
| npm run lint | PASS | eslint `--max-warnings 0` + oxlint accessibility, exit 0 |
| npm run typecheck | PASS | TypeScript 7.0.2 (и `typecheck:ts6` — 6.0.3), exit 0 |
| npm run complexity | PASS | eslint по дереву + порог 300 для src/*.css, exit 0 |
| npm test | PASS | 82/82, 0 skipped |
| npm run check | PASS | полный прогон: format:check, оба typecheck, complexity, test:gates (41 отклонённый пример / 8 принятых), 82 теста, build, audit (0 уязвимостей), gitleaks (no leaks) |
| npm run test:ui:exhaust | PASS | контейнер `mt-exhaust-*`, порт 5179, прогон `muqe4wo8-15` (~106 с): findings 0, consoleErrors 0; ratchet element/code `ok` (missing 0, stale 0, sealed); skip share 0.346 ≤ 0.4, sweep 0.491, total 0.482; покрытие элементов 581/1160 кликнуто, 579 непокрытых = книга точно; код 633/702 функций, 135/208 ветвей |
| npm run test:ui:docker | PASS | 53/53 PASS (375/768/320/1440 px, RU/EN, клавиатура, отмены, скрытие сумм) |

## Новые находки от ужесточённых правил

Промежуточный прогон `muqdvwt8-16` (после N4) дал 5 находок `hidden-amount-digit`
на `p.import-result`: «2 готовы · 1 ошибка · 1 повтор» / «2 ready · 1 error · 1
duplicate». Триаж со скриншотами (`triage/import-result-hidden-ru.png`,
`triage/import-result-hidden-en.png`): при включённом скрытии все суммы в таблице
замаскированы («••••»), а флагнутый текст — счётчики статусов строк импорта, тот
же класс легальных чисел, что даты и «N из M». Вердикт: дефект чекера, не
продукта — слот остаётся денежным, а `notAmount` дополнен фразами-счётчиками
статусов RU/EN с кириллически корректной границей слова (`\b` её не видит).
Фикс: 604329c + регрессия в `exhaust-money.test.ts`. Повторный прогон
`muqe4wo8-15`: 0 находок.

## Известное ограничение (N2)

Печать леджера ловит случайные правки; намеренный сброс книги остаётся видимым
только в кодовом ревью — технически заблокировать его нельзя. Зафиксировано здесь,
в `decision-094` и в `DESIGN.md` («Границы проверки»).

## Итог

Все шесть находок обработаны отдельными коммитами (N2 — зафиксирована как технически неустранимое ограничение); ветка зелёная по всей матрице
проверок и по чистому исчерпывающему прогону (0 находок, ratchet ok).
