#!/bin/sh
# Domyślne poświadczenie „Offer Studio API” dla całego n8n.
#
# Z OFFER_STUDIO_URL i OFFER_STUDIO_API_TOKEN składamy CREDENTIALS_OVERWRITE_DATA. n8n wpisuje te
# wartości w puste pola poświadczenia i ukrywa je w edytorze, więc w n8n wystarczy raz utworzyć
# poświadczenie „Offer Studio API” i zapisać je bez wpisywania czegokolwiek.
# Własne CREDENTIALS_OVERWRITE_DATA (dla innych usług) jest zachowane: dopisujemy tylko offerStudioApi.
set -e

if [ -n "${OFFER_STUDIO_API_TOKEN:-}" ] || [ -n "${OFFER_STUDIO_URL:-}" ]; then
  CREDENTIALS_OVERWRITE_DATA=$(node -e '
    let data = {};
    try { data = JSON.parse(process.env.CREDENTIALS_OVERWRITE_DATA || "{}"); } catch {}
    data.offerStudioApi = {
      baseUrl: process.env.OFFER_STUDIO_URL || "http://offer-studio:3000",
      token: process.env.OFFER_STUDIO_API_TOKEN || "",
      ...(data.offerStudioApi || {}),
    };
    process.stdout.write(JSON.stringify(data));
  ')
  export CREDENTIALS_OVERWRITE_DATA
fi

exec /docker-entrypoint.sh "$@"
