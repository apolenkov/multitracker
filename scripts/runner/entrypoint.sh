#!/usr/bin/env bash
# Регистрирует раннер при первом запуске контейнера и запускает его.
# Токен регистрации действует час и нужен только для новой регистрации;
# обычный перезапуск контейнера обходится без него (конфигурация в файловой системе).
set -euo pipefail
cd /home/runner/actions-runner

if [ ! -f .runner ]; then
  : "${MT_RUNNER_URL:?нужен MT_RUNNER_URL}"
  : "${MT_RUNNER_TOKEN:?нужен MT_RUNNER_TOKEN для первой регистрации}"
  ./config.sh --unattended --replace \
    --url "$MT_RUNNER_URL" \
    --token "$MT_RUNNER_TOKEN" \
    --name "${MT_RUNNER_NAME:-mt-orbstack}" \
    --labels "${MT_RUNNER_LABELS:-mt-container}" \
    --work /home/runner/_work
fi

exec ./run.sh
