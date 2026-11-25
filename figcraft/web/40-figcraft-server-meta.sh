#!/bin/sh
# Run by the nginx image entrypoint on every container start.
# Writes the FigCraft collaboration server URL into index.html:
#   <meta name="figcraft-server" content="wss://figcraft.example.com/sync/">
# so the browser app knows where to publish and join files.
#
# The URL comes from FIGCRAFT_SERVER_URL or, if unset, is derived from FIGCRAFT_PUBLIC_URL
# (https://host -> wss://host/sync/, http://host -> ws://host/sync/).
set -eu

HTML_DIR=/usr/share/nginx/html
cp "$HTML_DIR/index.html.orig" "$HTML_DIR/index.html"

url="${FIGCRAFT_SERVER_URL:-}"
if [ -z "$url" ] && [ -n "${FIGCRAFT_PUBLIC_URL:-}" ]; then
  base="${FIGCRAFT_PUBLIC_URL%/}"
  case "$base" in
    https://*) url="wss://${base#https://}/sync/" ;;
    http://*)  url="ws://${base#http://}/sync/" ;;
  esac
fi

if [ -z "$url" ]; then
  echo "figcraft-web: no FIGCRAFT_SERVER_URL / FIGCRAFT_PUBLIC_URL, skipping the figcraft-server meta tag"
  exit 0
fi

case "$url" in
  ws://*|wss://*) ;;
  *) echo "figcraft-web: FIGCRAFT_SERVER_URL must start with ws:// or wss:// (got: $url)" >&2; exit 1 ;;
esac
case "$url" in
  *[\"\<\>\&\|\ ]*) echo "figcraft-web: invalid characters in the server URL: $url" >&2; exit 1 ;;
esac

sed -i "s|<meta charset=\"utf-8\">|<meta charset=\"utf-8\"><meta name=\"figcraft-server\" content=\"$url\">|" "$HTML_DIR/index.html"
grep -q 'name="figcraft-server"' "$HTML_DIR/index.html" || { echo "figcraft-web: failed to insert the meta tag into index.html" >&2; exit 1; }
echo "figcraft-web: collaboration server = $url"
