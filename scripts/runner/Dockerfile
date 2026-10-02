# Self-hosted CI-раннер MultiTracker в контейнере OrbStack (arm64).
# Гейт «check» исполняется здесь; браузер — Chromium из Debian, как в decision-092.
# Google Chrome доступен только под amd64, поэтому система — Debian и Chromium.
FROM debian:bookworm-slim

ARG RUNNER_VERSION=2.337.0

RUN apt-get update \
  && apt-get install --yes --no-install-recommends \
    ca-certificates \
    chromium \
    curl \
    fonts-liberation \
    git \
    tar \
    xz-utils \
  && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash runner

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
