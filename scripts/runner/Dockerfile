# Общий CI-образ MultiTracker: self-hosted раннер гейта и локальные контейнерные
# прогоны (`test:ui:docker`, перебор). Node — из .nvmrc, Chromium — как в
# проверенной среде decision-092; agent-browser запечён.
# Google Chrome существует только под amd64, поэтому система — Debian и Chromium (arm64).
FROM node:26.10.0-bookworm-slim

ARG RUNNER_VERSION=2.337.0
ARG AGENT_BROWSER_VERSION=0.38.1

RUN apt-get update \
  && apt-get install --yes --no-install-recommends \
    ca-certificates \
    chromium \
    curl \
    fonts-liberation \
    git \
    tar \
    xz-utils \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global "agent-browser@${AGENT_BROWSER_VERSION}" \
  && agent-browser --version

ENV AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium \
  AGENT_BROWSER_ARGS=--no-sandbox

# UID закреплён: тома _work и .npm живут между пересборками образа, и смена UID
# иначе оставляет их за прежним владельцем («Access to the path ... is denied»).
RUN useradd --uid 1001 --create-home --shell /bin/bash runner

USER runner
RUN mkdir -p /home/runner/actions-runner \
  && curl --fail --silent --show-error --location \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz" \
    --output /tmp/runner.tar.gz \
  && tar --extract --gzip --file /tmp/runner.tar.gz --directory /home/runner/actions-runner \
  && rm /tmp/runner.tar.gz

USER root
RUN /home/runner/actions-runner/bin/installdependencies.sh \
  && rm -rf /var/lib/apt/lists/*

# Кэши раннера в именованных томах: владелец задаётся здесь, том наследует его.
RUN mkdir -p /home/runner/.npm /home/runner/_work \
  && chown -R runner:runner /home/runner

COPY entrypoint.sh /usr/local/bin/mt-runner-entrypoint.sh
RUN chmod 0755 /usr/local/bin/mt-runner-entrypoint.sh

USER runner
WORKDIR /home/runner/actions-runner
ENTRYPOINT ["/usr/local/bin/mt-runner-entrypoint.sh"]
