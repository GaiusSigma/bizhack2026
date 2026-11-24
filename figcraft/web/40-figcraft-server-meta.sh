#!/bin/sh
# Uruchamiany przez entrypoint obrazu nginx przy każdym starcie kontenera.
# Wpisuje do index.html adres serwera współpracy FigCraft:
#   <meta name="figcraft-server" content="wss://figcraft.example.com/sync/">
# dzięki czemu aplikacja w przeglądarce sama wie, gdzie publikować i dołączać do plików.
#
# Adres bierze z FIGCRAFT_SERVER_URL, a gdy go brak, wylicza z FIGCRAFT_PUBLIC_URL
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
  echo "figcraft-web: brak FIGCRAFT_SERVER_URL / FIGCRAFT_PUBLIC_URL, pomijam meta figcraft-server"
  exit 0
fi

case "$url" in
  ws://*|wss://*) ;;
  *) echo "figcraft-web: FIGCRAFT_SERVER_URL musi zaczynać się od ws:// lub wss:// (jest: $url)" >&2; exit 1 ;;
esac
case "$url" in
  *[\"\<\>\&\|\ ]*) echo "figcraft-web: niedozwolone znaki w adresie serwera: $url" >&2; exit 1 ;;
esac

sed -i "s|<meta charset=\"utf-8\">|<meta charset=\"utf-8\"><meta name=\"figcraft-server\" content=\"$url\">|" "$HTML_DIR/index.html"
grep -q 'name="figcraft-server"' "$HTML_DIR/index.html" || { echo "figcraft-web: nie udało się wstawić meta do index.html" >&2; exit 1; }
echo "figcraft-web: serwer współpracy = $url"
