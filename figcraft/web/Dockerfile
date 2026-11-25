# FigCraft (web version, WebAssembly) served by nginx.
# Downloads the official build from the github.com/storytold/figcraft release and checks its SHA-256
# (from that release's SHA256SUMS.txt). When bumping the version, change both arguments, and the same
# version in offer-studio/scripts/fetch-figcraft-web.mjs (Offer Studio embeds this build as its slide editor).
FROM alpine:3.22 AS fetch
ARG FIGCRAFT_VERSION=0.18.1
ARG FIGCRAFT_WEB_SHA256=2fbeb93f5022b0a7cc9d8528f1ed7e2b54c94d213ef79e65128aa898c399f02b
WORKDIR /tmp
RUN set -eux; \
    wget -q "https://github.com/storytold/figcraft/releases/download/v${FIGCRAFT_VERSION}/figcraft-web-${FIGCRAFT_VERSION}.zip" -O web.zip; \
    echo "${FIGCRAFT_WEB_SHA256}  web.zip" | sha256sum -c -; \
    unzip -q web.zip; \
    mv "figcraft-web-${FIGCRAFT_VERSION}" /site; \
    rm -f /site/_headers /site/.htaccess; \
    cp /site/index.html /site/index.html.orig

FROM nginx:1.30-alpine
COPY --from=fetch /site /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY 40-figcraft-server-meta.sh /docker-entrypoint.d/40-figcraft-server-meta.sh
RUN chmod +x /docker-entrypoint.d/40-figcraft-server-meta.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
