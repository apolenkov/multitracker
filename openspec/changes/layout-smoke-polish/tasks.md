## Новый утверждённый этап

- [x] RUB/USD как две денежные строки holdings: прежние 0, маскирование,
      «Задать остаток»/«Set balance» ≥44px и валюта в доступном имени, P&L «—».
- [x] Удалить cash-catalog-dialog; каталог inline только Markets,
      MarketList котировок/индексов не менять; MSFT/FUND-DEMO/BOND-DEMO/BTC/TWT → buy,
      RUB/USD из каталога убрать; счётчик holdings 5 строк, empty 2 cash/0 investments.
- [x] Cash → opening с правильной валютой; одновременно ≤1 dialog,
      закрытие предыдущего перед showModal, возврат фокуса странице при Escape/Cancel/X.
- [x] Проверить динамический DemoModal и быстрые клики; сохранить FORM028/135 ID.
- [x] Freeze DCFLyTeR/BEzUCEsU, 138 файлов; check-final после native-keyboard
      exit0/45,627с/269listed268present/32/39/audit0/Gitleaks0; freeze совпал.
- [x] Текущий UI70 exit0/87,577с; cash12/catalog14/sort4/focus3 и FORM026 GREEN.
- [x] Полный smoke GREEN/1367,348с/30states/5544found/1223tested/0FAIL/4321reasonedskips;
      цель 240 с не достигнута.
- [ ] Повтор135×8 RUNNING, финальное ревью и удалённый CI PENDING.

Срез Cn2nrFkw/DtCuvsuC и его check/UI70/smoke теперь исторические,
до изменения денежного потока. Строгий проход прерван: operations и
exploration — SIGINT; вторая попытка shell — exit 1; data/settings не стартовал.
Исходные RED и журналы сохранены. Текущая реализация заморожена:
138 файлов src/dist, JS DCFLyTeR / CSS BEzUCEsU; UI70 exit 0 за 87,577 с,
cash 12 + catalog 14 + sort 4 + focus 3, FORM026 GREEN.
Check-final после native-keyboard правки теста: exit 0 за 45,627 с,
269 путей в перечне / 268 файлов, 32 теста, 39 проб, audit/Gitleaks 0;
138 файлов приложения и сборка совпали с freeze. Полный smoke GREEN:
1367,348 с, 30 состояний, 5544 найдено, 1223 проверено, 0 FAIL,
4321 пропуск с причинами; цель 240 с не достигнута. Строгие 1080 RUNNING,
финальное ревью и удалённый CI PENDING.
Доказательства: `docs/audits/2026-10-01-cash-flow/receipt.json`,
`check-final/verification.json`, `smoke-DCFLyTeR/RESULTS.md`.
DESIGN lint до обновления статуса: 0 ошибок, 62 предупреждения, 1 info;
SHA документа изменился, свежий lint нужен при итоговой сверке.

## Историческое исполнение до изменения денежного потока

- [x] Задача 1 — полный smoke завершён на Cn2nrFkw;
      исполнитель владеет smoke/тестами и package.json, не исходниками приложения.
- [x] Сохранить исходный baseline 1e64f81: manifest 131 файла и baseline-dist;
      первые F1 GREEN/F4 RED, ESLint/TypeScript код 0; root дал GO задачам 2–5.
- [x] Адресный sealed baseline: F1 и прежний вертикальный скачок F2 GREEN;
      отдельно F4/F2 flow/exclusive RED; исторические CSS-пробы RED, восстановление подтверждено.
- [ ] Зафиксировать новое F4: исходная видимость действия десяти типов до
      прокручивающего inspectDom, отдельно от видимости после прокрутки.
- [x] Задача 2, адресный PASS на Dv8Awe1Q/CqdxlKOg — menus/disclosure: DOM-summary, click/Enter, отдельные
      группы меню, Escape/фокус, явные transition и reduced motion/fallback.
- [x] Задача 3, адресный PASS — overview: сохранить min-content 1fr; сумма, линия,
      точка/метка, легенда с переносом, плоские секции и понятные ссылки.
- [x] Задача 4, адресный PASS — assets/markets: API AssetSymbol, нейтральный неизвестный
      символ, плашки/доли; HistoryRow и последние покупки интегрируют их владельцы.
- [x] Задача 5, адресный PASS — dialogs: единые поля/группы и сразу видимое действие
      всех десяти операций; сохранены Tab, Escape и возврат фокуса.
- [ ] Подключить команду smoke через её исполнителя, документы через root; App/Icon меняет только
      владелец menus/disclosure, финансовые данные и строгие правила сохранены.
- [x] Подтвердить smoke: 11 разделов 375/1440 light; обзор/операции/покупка
      дополнительно dark и 320; цели 44 px, защищённые сдвиги ≤2 px, ноль ошибок.
- [ ] После финальной сборки заново подтвердить все 135 ID × 8 контекстов
      RU/EN × 375/1440 × light/dark: применимые действия/фокус, обоснованный N/A.
      Старые 540 не покрывают эту матрицу; новый итог ещё не подтверждён.
- [x] Текущий clean check: exact snapshot 267 файлов, exit 0 за 45,291 с,
      32 теста, 39 проб, audit/Gitleaks 0; workspace exit 1 описан отдельно.
- [x] Текущий общий UI70: 70/70 PASS, exit 0 за 61,321 с.
- [x] Полный smoke Cn2nrFkw: GREEN exit 0, 1345,998 с, 5446 найдено,
      1255 проверено, 0 FAIL, 4191 пропуск с причинами; цель 240 с не достигнута.
- [x] Отдельный кандидат: общий UI 70/70 PASS, exit 0, 57,270 с,
      sourceUnchanged=true; guard-scroll-sync/candidate-full70/.
- [x] Адресные 8 повторных кликов и syncConfirm → scroll → help GREEN;
      перенос подтверждён совпадением исходной базы и SHA-256 трёх файлов.
- [x] Официальный Google DESIGN lint обновлённой редакции: 0 ошибок,
      62 предупреждения, 1 info; design-md-lint-footer-inset.json.
- [x] openspec validate layout-smoke-polish --strict --no-interactive: код 0.
- [ ] Одно независимое финальное ревью полного пакета; исправления находок
      подтверждены в том же обзоре, открытых существенных замечаний нет.
- [ ] Предъявить макет, обновить черновик PR и проверить CI текущего кандидата.
- [ ] Визуальное одобрение владельца — отдельный ожидаемый шаг, без слияния.

## Исторический срез Cn2nrFkw

Исторический снимок — `freeze-Cn2nrFkw`: 139 файлов src/dist (5 dist),
`index-Cn2nrFkw.js` / `index-DtCuvsuC.css`. SHA-256 source-dist.json:
`40941d482c33accbf44fbb54e932b867ef2b33c313b49d50033514542e388ac0`.
Check текущего снимка: exit 0 в точном чистом снимке 267 передаваемых файлов,
45,291 с, 32 теста, 39 проб, audit/Gitleaks 0; источники не изменились.
Общий UI: 70/70 PASS, exit 0 за 61,321 с. Полный smoke: GREEN, exit 0,
1345,998 с; найдено 5446, проверено 1255, 0 FAIL, 4191 пропуск с причинами.
Цель 240 с не достигнута. Строгие 1080 контекстов, финальное ревью и CI PENDING.
Исходный workspace check exit 1 из-за доказанного ложного срабатывания на
архивный SHA-256; PASS относится к чистому снимку, не рабочей папке.

Строгий проход этого снимка прерван; новая матрица ожидается после нового freeze.

Текущие локальные доказательства: `check-Cn2nrFkw/execution.json`,
`general-ui-Cn2nrFkw/execution.json` и `summary.json` в
`docs/audits/2026-09-30-layout-final/`; smoke —
`docs/audits/2026-09-30-layout-smoke/linux-v4/Cn2nrFkw/1790808330106/completion-receipt.json`.

Предыдущий кандидат BoGGXxNV/93D9uHfO перенесён в main после проверки привязки:
139 исходных файлов совпали с freeze-C0f9zXZz, git apply --check PASS,
SHA-256 трёх перенесённых файлов совпали с проверенным кандидатом.
Результаты Bo исторические; строгие 135 × 8 (1080 ячеек), ревью и CI нового снимка — PENDING.

Smoke Bo прерван после восьми состояний без обнаруженных ошибок:
**INTERRUPTED, exit 130**. Причина — реально замеченный визуальный зазор
под sticky-подвалом покупки; этот проход не считается PASS.
Исправление связано с inset самого dialog (24/20px): отрицательные bottom
и margin-bottom плюс равный inset padding-bottom закрывают нижний край.
Покупка, импорт (начало и столбцы), короткий портфель на 1440/375 прошли
адресную проверку: геометрия кнопок/диалога и scrollHeight прежние,
полоска полей устранена. Доказательства: `footer-gap-probe/` в локальном
`docs/audits/2026-09-30-layout-final/`. Строгая матрица, финальное ревью и CI нового снимка PENDING.

Smoke v4 C0 завершился RED: 1199,813 с, 5430 найдено, 1251 проверено,
1 FAIL, 4178 пропусков с причинами. Обнаружен намеренный переход
syncConfirm → scroll → help в 80,6 CSS px, блокируемый whole-button guard.
Исправление — радиус 12 CSS px от первой точки (Math.hypot ≤12), прежние
500 мс и cancellation. Прежние UI 69/69, rapid 56/56, sync 22 → 0 и reminder
RED → GREEN на C0, UI 68/68 на CqdxlKOg и старые 540 сохранены как история.

Доказательства локально вне Git: `docs/audits/2026-09-30-layout-final/`
`guard-scroll-sync/candidate-full70/`, `freeze-C0f9zXZz/`, `check-C0f9zXZz/`,
`secrets-triage.json`, `general-ui-rapid-final/`,
`rapid-clicks/final-C0f9zXZz/receipt.json`.
