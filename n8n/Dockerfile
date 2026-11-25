# n8n with the built-in Offer Studio nodes (n8n-nodes-offer-studio).
#
# The nodes are loaded via N8N_CUSTOM_EXTENSIONS: the package lives in /opt/n8n-custom/node_modules/,
# outside the /home/node/.n8n volume, so every image rebuild ships the current version of the nodes.
# Node types in workflows: CUSTOM.offerStudio and CUSTOM.offerStudioTrigger.
#
# When upgrading n8n, change N8N_VERSION here and the n8nio/runners tag in docker-compose.yml.
ARG N8N_VERSION=2.50.0

FROM node:22-alpine AS nodes
WORKDIR /build
COPY n8n-nodes-offer-studio/package.json n8n-nodes-offer-studio/package-lock.json ./
# --ignore-scripts: n8n-workflow is only needed for compilation (types); at runtime the node
# uses n8n's own n8n-workflow, and the dependencies' native add-ons (isolated-vm) are not needed.
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
