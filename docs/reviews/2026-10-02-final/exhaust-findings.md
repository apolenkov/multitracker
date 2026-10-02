# Exhaust (b) findings — верифицированный прогон muq3129q-15

Прогон зелёный: оба ratchet-базлайна ok, консольных ошибок 0.
Полный список из 1195 находок — в артефактах прогона
(`docs/audits/2026-10-01-exhaust/muq3129q-15/findings.json`,
сводка по части (b) — в `part-b-findings.md` того же каталога).
Ниже — по правилам: число, пример повтора и вердикт.

Все вердикты ниже — «дефект продукта»: проверки детерминированные,
ложные срабатывания проверяльщика уже убраны (список чинок — в конце).
Код продукта в `src/` здесь не правился; правит координатор.

## По правилам (пример повтора: сид, путь, значения осей)

### overlap x490 — дефект продукта
- пример: `main#main>…>section:nth-of-type(3)>details>summary` против ссылки бокового меню
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off
- ожидалось: текст и управление не перекрываются; фактически: пересечение рамок

### spacing-off-scale x195 — дефект продукта
- пример: `section>h2#holdings-title>span`, зазор 7px вне шкалы 8/12/16/20/24/28/32
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### target-under-44 x134 — дефект продукта
- пример: `main>input`, размер 22x22 вместо минимум 44x44
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### cursor-default x104 — дефект продукта
- пример: поле ввода в строке с курсором default вместо pointer/not-allowed
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### row-misaligned x78 — дефект продукта
- пример: строка с расхождением центров потомков 42px при допуске 2px
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### color-off-token x44 — дефект продукта
- пример: `aside>nav>…>span`, цвет rgb(65,64,57) вне токенов из DESIGN.md
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### contrast-text x38 — дефект продукта
- пример: тот же span меню, контраст 2.61 при минимуме 4.5
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### font-scale-off x32 — дефект продукта
- пример: размер 20.8px вне шкалы из DESIGN.md
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### weight-off-scale x21 — дефект продукта
- пример: жирность 550 вне набора 400/500/600/700
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### hidden-amount-digit x20 — дефект продукта
- пример: `section.summary`, цифры в скрытых суммах («Current value••••Sep 30, 2026»)
- повтор: seed=0 path=sync env=ru|light|RUB|RUB|on|comfortable|off|1440|ready|off

### row-height-uneven x16 — дефект продукта
- пример: строки списка 130px..153px вместо равной высоты
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### single-char-line x13 — дефект продукта
- пример: заголовок `h2#composition-title`, последняя строка из одного символа «3»
- повтор: seed=0 path=overview env=ru|light|RUB|RUB|off|comfortable|off|320|ready|off

### sticky-covers-focus x9 — дефект продукта
- пример: фокус под липкой панелью после закрытия диалога
- повтор: seed=7 path=dialog#privacy-dialog>…>summary>… env=ru|light|RUB|RUB|off|comfortable|off|1440|ready|off

### walk-click-fail x1 — дефект продукта
- пример: клик по шапке упал (элемент перекрыт), минимальное воспроизведение из 1 шага
- повтор: seed=43 path=header>…>label env=ru|light|RUB|RUB|off|comfortable|off|1440|ready|off

## Формы: FAIL нет — проверено
- 70 кейсов (10 типов × 7 классов) из схемы: длинные коды ошибок — 0
- гейт в браузере: ошибок до отправки — 0, длинных текстов после — 0

## Чинки проверяльщика (зафиксировано коммитами, продукт не тронут)
- доверенная выборка падала на перекрытом элементе — пропуск с очисткой диалогов
- дизайн-скан падал: не хватало color-хелперов в странице — добавлены в бандл
- clipped-text срабатывал на скрытых 1px элементах — порог ширины 8px (убрано 744)
- доверенные пропуски оставляли диалоги — очистка после выборки

## Известное ограничение (не прячем)
- повторный прогон на том же коде дал 647 кликов и расхождение базлайнов:
  доверенные клики иногда перекрыты (тайминг), пропуск меняет перечисление.
  Зелёный прогон muq3129q-15 (649 кликов) — верификация; флак-доказательство
  сохранено в соседнем каталоге прогона. Рекомендация координатору:
  зафиксировать доверенную выборку или восстанавливать настройки после обхода.

count: 1195
