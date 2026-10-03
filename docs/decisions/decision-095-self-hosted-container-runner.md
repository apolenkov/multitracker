# decision-095 — гейт «check» на self-hosted раннере в контейнере OrbStack

Статус: accepted. Дата: 2026-10-02.

## Контекст

Гейт «check» на GitHub-хостинге идёт 7–12 минут и ждёт очередь; дважды за день
UI-шаг упал флейком (`import-sync:visible-actions-undo`), и каждый перезапуск
опять занимал время. Проверенная браузерная среда — Linux Chromium
([decision-092](decision-092-linux-ui-runner.md)); на macOS headless тот же
Escape даёт тысячи keydown, поэтому локальные прогоны непригодны для клавиатуры.

## Решение

1. Раннер `actions/runner` собирается в образ `multitracker-ci-runner:20261002`
   ([scripts/runner/Dockerfile](../../scripts/runner/Dockerfile)): Debian bookworm
   arm64, Node из `.nvmrc`, Chromium, Git, запечённый agent-browser,
   непривилегированный пользователь `runner`. Тот же образ обслуживает локальные
   контейнерные прогоны (`npm run test:ui:docker`, `scripts/exhaust-docker.sh`).
   Управление — `scripts/runner/runner.sh` (`build|start|stop|status|logs`);
   при первичной регистрации берётся часовой токен через `gh`, конфигурация
   остаётся в контейнере.
2. Workflow `check.yml` исполняется на `runs-on: [self-hosted, mt-container]`.
   Определение браузера — `google-chrome` или `chromium`; состав проверок не менялся.
3. Для публичного репозитория включено подтверждение запусков для всех внешних
   участников (`all_external_contributors`). Код запускается только внутри
   контейнера; workflow использует read-only токен и не имеет секретов.
4. Google Chrome существует только под amd64, поэтому среда — Debian + Chromium
   под arm64 без эмуляции.

## Последствия

- Пока контейнер выключен, гейт недоступен и слияния в `main` блокируются;
  состояние — `scripts/runner/runner.sh status`.
- 2026-10-04: раннеров два — `mt-orbstack` (основной Mac) и `mt-air` (MacBook Air),
  имя задаёт `MT_RUNNER_NAME`; одинаковое имя перерегистрирует и вытесняет раннер.
  Основной Mac на зарядке не засыпает (`pmset -c sleep 0`).
- Образ arm64-специфичен; для amd64 нужны другой Chromium/Chrome и агент раннера.
- Контейнеру задан `AGENT_BROWSER_ARGS=--no-sandbox`: изоляцию обеспечивает
  контейнер, песочница браузера внутри него не нужна.
