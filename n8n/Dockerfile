# n8n z wbudowanymi węzłami Offer Studio (n8n-nodes-offer-studio).
#
# Węzły ładuje mechanizm N8N_CUSTOM_EXTENSIONS: paczka leży w /opt/n8n-custom/node_modules/,
# poza wolumenem /home/node/.n8n, więc każdy rebuild obrazu daje aktualną wersję węzłów.
# Typy węzłów w workflowach: CUSTOM.offerStudio i CUSTOM.offerStudioTrigger.
#
# Przy podbiciu n8n zmień N8N_VERSION tutaj i tag n8nio/runners w docker-compose.yml.
ARG N8N_VERSION=2.50.0

FROM node:22-alpine AS nodes
WORKDIR /build
COPY n8n-nodes-offer-studio/package.json n8n-nodes-offer-studio/package-lock.json ./
# --ignore-scripts: n8n-workflow jest potrzebne tylko do kompilacji (typy); w runtime węzeł
# bierze n8n-workflow z samego n8n, a natywne dodatki zależności (isolated-vm) są zbędne.
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY n8n-nodes-offer-studio/ ./
RUN npm run build \
 && node --test test/spec.test.cjs \
 && mkdir -p /out \
 && cp -r dist package.json /out/

FROM n8nio/n8n:${N8N_VERSION}
COPY --from=nodes /out /opt/n8n-custom/node_modules/n8n-nodes-offer-studio
COPY --chmod=0755 entrypoint.sh /offer-studio-entrypoint.sh
ENV N8N_CUSTOM_EXTENSIONS=/opt/n8n-custom
ENTRYPOINT ["tini", "--", "/offer-studio-entrypoint.sh"]
