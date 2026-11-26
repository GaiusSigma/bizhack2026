#!/usr/bin/env bash
# One command to run the whole stack locally and see it work:
#   ./scripts/start.sh
# Creates .env (asks for your OpenRouter key once), builds and starts everything, waits until the offer workflow
# is live, generates two sample offers and prints where to look. Run it again any time; stop with ./scripts/stop.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\033[1m%s\033[0m\n' "$*"; }
command -v docker >/dev/null || { echo "Docker is needed: https://docs.docker.com/get-docker/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is needed (docker compose …)."; exit 1; }

# .env with the OpenRouter key (the only thing you provide)
[ -f .env ] || { cp .env.example .env; say "Created .env from .env.example"; }
key=$(grep -E '^OPENROUTER_API_KEY=' .env | cut -d= -f2- || true)
if [ -z "$key" ]; then
  echo "The offer workflow writes the slides with a model on OpenRouter. Create a key at https://openrouter.ai/keys"
  read -rsp "OpenRouter API key: " key; echo
  [ -n "$key" ] || { echo "No key, stopping."; exit 1; }
  sed -i.bak "s|^OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=${key}|" .env && rm -f .env.bak
fi
envval() { grep -E "^$1=" .env | cut -d= -f2- || true; }
N8N_PORT=$(envval N8N_PORT); N8N_PORT=${N8N_PORT:-5678}
LANDING_PORT=$(envval LANDING_PORT); LANDING_PORT=${LANDING_PORT:-8080}
STUDIO_PORT=$(envval STUDIO_PORT); STUDIO_PORT=${STUDIO_PORT:-8082}
FIGCRAFT_PORT=$(envval FIGCRAFT_PORT); FIGCRAFT_PORT=${FIGCRAFT_PORT:-8081}
STUDIO_PASSWORD=$(envval SERVICE_PASSWORD_STUDIO); STUDIO_PASSWORD=${STUDIO_PASSWORD:-studio}

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml)
say "Building and starting the stack (the first time takes about 2–3 minutes)…"
"${COMPOSE[@]}" up -d --build

say "Waiting for n8n to publish the offer workflow…"
for i in $(seq 1 90); do
  if "${COMPOSE[@]}" logs n8n 2>/dev/null | grep -q "Editor is now accessible"; then break; fi
  sleep 2
done
sleep 5

say "Generating two sample offers…"
mkdir -p out
if command -v node >/dev/null; then
  N8N="http://localhost:${N8N_PORT}" node scripts/try-it.mjs sample-data/landing-persona-firm-pl.json sample-data/landing-call-logistics-group.json || true
else
  hook="http://localhost:${N8N_PORT}/webhook/dd7c4b67-f5f6-40f4-9325-1ca924d5ff78"
  for i in $(seq 1 18); do
    code=$(curl -s -o out/landing-persona-firm-pl.pdf -w '%{http_code}' -X POST -H 'content-type: application/json' --data @sample-data/landing-persona-firm-pl.json "$hook" || true)
    [ "$code" = "200" ] && { echo "✓ out/landing-persona-firm-pl.pdf"; break; }
    sleep 5
  done
fi

cat <<EOF

$(say "Ready.")
  Landing        http://localhost:${LANDING_PORT}        "Paste a call" tab or "Generate my offer"
  Offer Studio   http://localhost:${STUDIO_PORT}        any user name, password: ${STUDIO_PASSWORD}
  n8n            http://localhost:${N8N_PORT}        demo@example.com / gaius-jury-2026 (workflow "Lead → oferta Gaius Vault")
  FigCraft       http://localhost:${FIGCRAFT_PORT}        the slide editor (Offer Studio ▸ Slides ▸ Edit in FigCraft opens the deck)
  Decks          ./out/*.pdf

  Your own case: node scripts/try-it.mjs --text-file my-call.txt
  Stop: ./scripts/stop.sh   (keeps the data; add --wipe to start from scratch)
EOF
