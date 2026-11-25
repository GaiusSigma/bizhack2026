// Fake n8n context: real HTTP (fetch) to Offer Studio, everything else minimal.
const STUDIO_URL = process.env.STUDIO_URL || 'http://127.0.0.1:3917';
const STUDIO_TOKEN = process.env.STUDIO_TOKEN || 'tok';

async function httpRequest(opts) {
  const url = new URL(opts.url);
  for (const [k, v] of Object.entries(opts.qs || {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method: opts.method,
    headers: { ...opts.headers, authorization: `Bearer ${STUDIO_TOKEN}` },
    body: opts.body,
  });
  const body = Buffer.from(await res.arrayBuffer());
  return { statusCode: res.status, headers: Object.fromEntries(res.headers), body };
}

function ctx({ params = {}, items = [{ json: {} }], binary = {} } = {}) {
  const node = { name: 'Offer Studio', type: 'CUSTOM.offerStudio', typeVersion: 1, parameters: params };
  const get = (name, fallback) => {
    let v = params;
    for (const p of name.split('.')) v = v?.[p];
    return v === undefined ? fallback : v;
  };
  return {
    getNode: () => node,
    getInputData: () => items,
    getNodeParameter: (name, _i, fallback) => get(name, fallback),
    getCurrentNodeParameter: (name) => get(name),
    getCredentials: async () => ({ baseUrl: `${STUDIO_URL}/`, token: STUDIO_TOKEN }),
    continueOnFail: () => false,
    helpers: {
      httpRequestWithAuthentication: async (_cred, opts) => httpRequest(opts),
      prepareBinaryData: async (buf, fileName, mimeType) => ({ data: buf.toString('base64'), fileName, mimeType }),
      assertBinaryData: (_i, prop) => {
        if (!binary[prop]) throw new Error(`no binary ${prop}`);
        return binary[prop];
      },
      getBinaryDataBuffer: async (_i, prop) => binary[prop].buffer,
    },
  };
}

module.exports = { ctx, STUDIO_URL, STUDIO_TOKEN };
