FROM node:20-bullseye-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    python3 \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash agent

WORKDIR /workspace
RUN chown agent:agent /workspace

USER agent

HEALTHCHECK --interval=30s --timeout=5s \
  CMD pgrep -x "tail" || exit 1

CMD ["tail", "-f", "/dev/null"]