# decision-092 — полный прогон интерфейсных проверок в Linux-контейнере

Статус: accepted. Дата: 2026-10-01. Backlog Decision: decision-092.

## Контекст

На macOS Chrome 154 вместе с agent-browser (версии 0.37.1 и 0.38.1) один нажатый
Escape порождает от 1546 до 5171 событий keydown. Это измерено на пустой
странице `about:blank`, то есть причина в сочетании браузера и инструмента, а не
в приложении. Сценарии с клавиатурой (закрытие диалога и меню, возврат фокуса)
из-за этого нельзя проверить локально: один сценарий видит тысячи нажатий вместо
одного. В Linux-контейнере (образ `multitracker-layout-runtime:20260930`) тот же
Escape даёт ровно одно событие.

## Решение

Полный `test:ui` (и при необходимости `test:smoke`) выполняется в контейнере:

1. Собрать приложение в `dist` (`vite build --outDir dist`).
2. Смонтировать репозиторий и `dist` (только чтение) в контейнер.
3. Внутри контейнера поднять короткий статический сервер (встроен в `scripts/ui-docker.sh`: файл-сервер
   на `node:http`; отдельным `.ts` он не лежит, потому что правило
   `security/detect-non-literal-fs-filename` запрещает чтение по вычисляемому пути) и выполнить
   `node --experimental-strip-types scripts/check-ui.ts` с
   `MULTITRACKER_UI_URL=http://127.0.0.1:4180`; для каждого запуска создаётся своя
   сессия agent-browser.

Команда: `npm run test:ui:docker`. Для смоук-обхода:
`scripts/ui-docker.sh dist ui-smoke.ts` после сборки.

## Последствия

- Нужен Docker и локальный образ; на CI (Linux) контейнер не требуется, там
  `npm run test:ui` работает напрямую.
- Локальные прогоны `test:ui` на macOS остаются полезны для сценариев без
  клавиатуры, но результат с Escape на macOS не считается проверенным.
- Когда агент или Chrome исправят поток событий, решение можно отменить и
  вернуть прямой запуск.

## Обновление 2026-10-02

Образ заменён общим `multitracker-ci-runner` (Node из `.nvmrc`, Chromium,
agent-browser 0.38.1); он же служит self-hosted раннером гейта
([decision-095](decision-095-self-hosted-container-runner.md)). Команды
`npm run test:ui:docker` и `scripts/exhaust-docker.sh` переведены на него,
старое имя `multitracker-layout-runtime:20260930` не используется.
