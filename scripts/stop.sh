#!/usr/bin/env bash
# Stops the local stack. ./scripts/stop.sh --wipe also deletes its data (n8n, Offer Studio, FigCraft volumes).
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--wipe" ]; then
  docker compose -f docker-compose.yml -f docker-compose.local.yml down -v
else
  docker compose -f docker-compose.yml -f docker-compose.local.yml down
fi
