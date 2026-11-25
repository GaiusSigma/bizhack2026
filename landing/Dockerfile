# --- build: Astro -> static files in /app/dist ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG SITE_URL=http://localhost:8080
ENV SITE_URL=${SITE_URL}
# n8n base URL the generator calls (/webhook/offer). Empty = demo on sample data.
ARG PUBLIC_N8N_URL=
ENV PUBLIC_N8N_URL=${PUBLIC_N8N_URL}
RUN npm run build

# --- runtime: nginx serves dist ---
FROM nginx:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
