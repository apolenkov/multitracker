#!/bin/sh
# Управление self-hosted CI-раннером MultiTracker в контейнере OrbStack.
# Образ multitracker-ci-runner собирается здесь же и используется локальными
# контейнерными прогонами (scripts/ui-docker.sh, scripts/exhaust-docker.sh).
# usage: scripts/runner/runner.sh build|start|stop|status|logs
#
# Первая регистрация получает токен через gh (действует час); конфигурация
# остаётся в контейнере, поэтому обычный перезапуск токена не требует.
# Повторный `start` пересоздаёт контейнер и регистрируется заново.
set -eu

REPO="apolenkov/multitracker"
IMAGE="multitracker-ci-runner:20261002"
NAME="mt-ci-runner"
# Имя раннера в GitHub: у каждого компьютера своё, иначе второй вытеснит первого.
# Пример для второго Mac: MT_RUNNER_NAME=mt-air scripts/runner/runner.sh start
RUNNER_NAME="${MT_RUNNER_NAME:-mt-orbstack}"

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
      --env "MT_RUNNER_NAME=$RUNNER_NAME" \
      --env "MT_RUNNER_LABELS=mt-container" \
      "$IMAGE"
    # Тома могли остаться за прежним UID: возвращаем владельца перед первым заданием.
    # Ждём готовности контейнера по условию, не фиксированной паузой (до 30 с).
    tries=0
    until docker exec "$NAME" true 2>/dev/null; do
      tries=$((tries + 1)); [ "$tries" -gt 150 ] && { echo "runner: контейнер не поднялся" >&2; exit 1; }
      sleep 0.2
    done
    docker exec --user root "$NAME" chown --recursive runner:runner /home/runner/_work /home/runner/.npm
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
