#!/bin/sh
# Default "Offer Studio API" credential for the whole n8n instance.
#
# Builds CREDENTIALS_OVERWRITE_DATA from OFFER_STUDIO_URL and OFFER_STUDIO_API_TOKEN. n8n puts these
# values into the empty credential fields and hides them in the editor, so in n8n you only need to
# create an "Offer Studio API" credential once and save it without typing anything.
# An existing CREDENTIALS_OVERWRITE_DATA (for other services) is kept: only offerStudioApi is added.
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
