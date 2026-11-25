# figcraft-server: the FigCraft collaboration server (WebSocket, port 47900).
# Downloads the official binary from the github.com/storytold/figcraft release and checks its SHA-256
# (from that release's SHA256SUMS.txt). When bumping the version, change all three arguments.
FROM debian:trixie-slim AS fetch
ARG FIGCRAFT_VERSION=0.18.1
ARG FIGCRAFT_SERVER_SHA256_AMD64=215b61e5b1dd5b4b4d193509b7be54010e3b929dd19b9a3a85fb1357539cdcd8
ARG FIGCRAFT_SERVER_SHA256_ARM64=7f99397ac3d28458fb5a0970d35d771fb5c3bb5c41e6405533196692ce1cbd7d
ARG TARGETARCH
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    case "${TARGETARCH:-amd64}" in \
      amd64) arch=x86_64;  sha="${FIGCRAFT_SERVER_SHA256_AMD64}" ;; \
      arm64) arch=aarch64; sha="${FIGCRAFT_SERVER_SHA256_ARM64}" ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    name="figcraft-server-${FIGCRAFT_VERSION}-linux-${arch}"; \
    curl -fsSL "https://github.com/storytold/figcraft/releases/download/v${FIGCRAFT_VERSION}/${name}.tar.gz" -o /tmp/server.tar.gz; \
    echo "${sha}  /tmp/server.tar.gz" | sha256sum -c -; \
    tar xzf /tmp/server.tar.gz -C /tmp; \
    install -m 0755 "/tmp/${name}/figcraft-server" /figcraft-server

FROM debian:trixie-slim
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    rm -rf /var/lib/apt/lists/*; \
    useradd --system --uid 10001 --home-dir /data --shell /usr/sbin/nologin figcraft; \
    mkdir -p /data /etc/figcraft-server; \
    chown figcraft:figcraft /data /etc/figcraft-server

COPY --from=fetch /figcraft-server /usr/local/bin/figcraft-server
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER figcraft
VOLUME ["/data"]
EXPOSE 47900
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1:47900/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
