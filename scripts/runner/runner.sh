#!/bin/sh
# Управление self-hosted CI-раннером MultiTracker в контейнере OrbStack.
# usage: scripts/runner/runner.sh build|start|stop|status|logs
#
# Первая регистрация получает токен через gh (действует час); конфигурация
# остаётся в контейнере, поэтому обычный перезапуск токена не требует.
# Повторный `start` пересоздаёт контейнер и регистрируется заново.
set -eu

REPO="apolenkov/multitracker"
IMAGE="multitracker-ci-runner:20261002"
NAME="mt-ci-runner"

case "${1:-status}" in
  build)
    docker build --tag "$IMAGE" "$(dirname "$0")"
    ;;
  start)
    token=$(gh api --method POST "repos/$REPO/actions/runners/registration-token" --jq .token)
    docker rm --force "$NAME" >/dev/null 2>&1 || true
    docker run --detach --name "$NAME" --restart unless-stopped \
      --shm-size=1g \
      --mount "type=volume,source=mt-ci-runner-work,target=/home/runner/_work" \
      --mount "type=volume,source=mt-ci-runner-npm,target=/home/runner/.npm" \
      --env "MT_RUNNER_URL=https://github.com/$REPO" \
      --env "MT_RUNNER_TOKEN=$token" \
      --env "MT_RUNNER_NAME=mt-orbstack" \
      --env "MT_RUNNER_LABELS=mt-container" \
      --env "AGENT_BROWSER_ARGS=--no-sandbox" \
      "$IMAGE"
    ;;
  stop)
    docker rm --force "$NAME" >/dev/null 2>&1 || true
    ;;
  status)
    docker ps --filter "name=$NAME" --format '{{.Names}} {{.Status}}'
    gh api "repos/$REPO/actions/runners" \
      --jq '.runners[] | "\(.name) \(.status) busy=\(.busy)"'
    ;;
  logs)
    docker logs --tail 50 "$NAME"
    ;;
  *)
    echo "usage: $0 build|start|stop|status|logs" >&2
    exit 2
    ;;
esac
