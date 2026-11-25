# --- figcraft-cli: oficjalny release FigCraft, suma SHA-256 z SHA256SUMS.txt releasu ---
# Przy podbiciu wersji zmień wszystkie trzy argumenty.
FROM debian:bookworm-slim AS figcraft
ARG FIGCRAFT_VERSION=0.18.1
ARG FIGCRAFT_SHA256_AMD64=8276d2ac55c6f77f7af3a411a9b00415d3feb0b59607a54523311340e653fc19
ARG FIGCRAFT_SHA256_ARM64=b27dee10be5db50def03dee3be470bc2f9ce508be1690e75b4765354d2b89c88
ARG TARGETARCH
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    case "${TARGETARCH:-amd64}" in \
      amd64) arch=x86_64;  sha="${FIGCRAFT_SHA256_AMD64}" ;; \
      arm64) arch=aarch64; sha="${FIGCRAFT_SHA256_ARM64}" ;; \
      *) echo "nieobsługiwana architektura: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    name="figcraft-${FIGCRAFT_VERSION}-linux-${arch}"; \
    curl -fsSL "https://github.com/storytold/figcraft/releases/download/v${FIGCRAFT_VERSION}/${name}.tar.gz" -o /tmp/figcraft.tar.gz; \
    echo "${sha}  /tmp/figcraft.tar.gz" | sha256sum -c -; \
    tar xzf /tmp/figcraft.tar.gz -C /tmp "${name}/bin/figcraft-cli"; \
    install -m 0755 "/tmp/${name}/bin/figcraft-cli" /figcraft-cli

# --- zależności Node ---
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- runtime ---
FROM node:24-bookworm-slim
# figcraft-cli potrzebuje fontconfig; Figtree (font szablonu Gaius, OFL) leży w repo.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends libfontconfig1 fontconfig; \
    rm -rf /var/lib/apt/lists/*
COPY fonts/ /usr/local/share/fonts/figtree/
RUN fc-cache -f

COPY --from=figcraft /figcraft-cli /usr/local/bin/figcraft-cli

WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
COPY seed ./seed

RUN mkdir -p /data && chown node:node /data
USER node

ENV PORT=3000 \
    STUDIO_DB=/data/studio.db \
    FIGCRAFT_CLI=/usr/local/bin/figcraft-cli
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
