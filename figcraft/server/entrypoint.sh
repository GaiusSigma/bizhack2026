#!/bin/sh
# Generates /etc/figcraft-server/server.toml from environment variables and starts the server.
# All keys are described in server.md in the FigCraft release (the settings table).
#
#   FIGCRAFT_PUBLIC_URL     https://figcraft.example.com  -> public_url = wss://figcraft.example.com/sync/
#   FIGCRAFT_OPEN_PUBLISH   true/false (default false: publishing needs the server key)
#   FIGCRAFT_TEAM_FILES     edit/comment/view (team file list; empty = off)
#   FIGCRAFT_MAX_FILE_MB    largest file in MiB (default: the server's own)
#
# Extra admin commands, e.g. the URL with the publishing key:
#   docker exec <container> figcraft-server --config /etc/figcraft-server/server.toml key
set -eu

CONFIG=/etc/figcraft-server/server.toml

toml_str() {
  # Returns the value as a safe TOML string.
  printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')"
}

{
  echo 'listen = "0.0.0.0:47900"'
  echo 'data = "/data"'

  if [ -n "${FIGCRAFT_PUBLIC_URL:-}" ]; then
    base="${FIGCRAFT_PUBLIC_URL%/}"
    case "$base" in
      https://*) ws="wss://${base#https://}/sync/" ;;
      http://*)  ws="ws://${base#http://}/sync/" ;;
      *) echo "FIGCRAFT_PUBLIC_URL must start with http:// or https://" >&2; exit 1 ;;
    esac
    echo "public_url = $(toml_str "$ws")"
    echo "web_url = $(toml_str "$base/")"
  fi

  case "${FIGCRAFT_OPEN_PUBLISH:-false}" in
    true|1|yes) echo 'open_publish = true' ;;
    *) echo 'open_publish = false' ;;
  esac

  if [ -n "${FIGCRAFT_TEAM_FILES:-}" ]; then
    case "$FIGCRAFT_TEAM_FILES" in
      edit|comment|view) echo "team_files = $(toml_str "$FIGCRAFT_TEAM_FILES")" ;;
      *) echo "FIGCRAFT_TEAM_FILES: dozwolone edit, comment, view" >&2; exit 1 ;;
    esac
  fi

  if [ -n "${FIGCRAFT_MAX_FILE_MB:-}" ]; then
    case "$FIGCRAFT_MAX_FILE_MB" in
      *[!0-9]*) echo "FIGCRAFT_MAX_FILE_MB must be a number" >&2; exit 1 ;;
      *) echo "max_file_mb = $FIGCRAFT_MAX_FILE_MB" ;;
    esac
  fi
} > "$CONFIG"

echo "figcraft-server: konfiguracja:"
sed 's/^/  /' "$CONFIG"

if [ "$#" -gt 0 ]; then
  exec /usr/local/bin/figcraft-server --config "$CONFIG" "$@"
fi
exec /usr/local/bin/figcraft-server --config "$CONFIG"
