# decision-097 — Node 26 и общий CI-образ для гейта и локальных прогонов

Статус: accepted. Дата: 2026-10-03.

## Контекст

Версии Node расходились между `.nvmrc`, `engines`, образом раннера и
`@types/node`; локальный `npm run test:ui:docker` ссылался на образ
`multitracker-layout-runtime:20260930`, который нельзя было пересобрать из
репозитория.

## Решение

1. Node 26.10.0 закреплён в `.nvmrc`, `engines` (`>=26.10.0`) и базе образа
   `node:26.10.0-bookworm-slim`; `@types/node` — 26.6.3.
2. Один образ [scripts/runner/Dockerfile](../../scripts/runner/Dockerfile)
   обслуживает self-hosted раннер ([decision-095](decision-095-self-hosted-container-runner.md))
   и локальные контейнерные прогоны (`npm run test:ui:docker`,
   `scripts/exhaust-docker.sh`); agent-browser 0.38.1 запечён. Gitleaks 8.30.1
   ставится шагом гейта из официального выпуска.

## Последствия

- Обновление Node меняет все четыре места одним изменением; гейт проверяет
  результат.
- Старый образ `multitracker-layout-runtime:20260930` упоминается только как
  история в [decision-092](decision-092-linux-ui-runner.md).
