// Trigger against a live Offer Studio: an offer change via the API -> one run with the current record.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, STUDIO_URL, STUDIO_TOKEN } = require('./helpers.cjs');
const { OfferStudioTrigger } = require('../dist/nodes/OfferStudio/OfferStudioTrigger.node.js');

let up = false;
before(async () => {
  up = await fetch(`${STUDIO_URL}/healthz`).then((r) => r.ok, () => false);
});

const api = (method, path, body) =>
  fetch(`${STUDIO_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${STUDIO_TOKEN}`, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  }).then((r) => (r.status === 204 ? null : r.json()));

test('trigger: offer changes debounced into one run with the record', async (t) => {
  if (!up) return t.skip(`no Offer Studio at ${STUDIO_URL}`);
  const offer = await api('POST', '/api/offers', { name: 'Trigger test' });
  const emitted = [];
  const base = ctx({ params: { tables: ['offers', 'slides'], offerId: offer.id, fetchRecord: true, debounceMs: 300 } });
  const triggerCtx = {
    ...base,
    getNodeParameter: (name, fallback) => base.getNodeParameter(name, 0, fallback),
    getMode: () => 'trigger',
    emit: (data) => emitted.push(data),
    logger: { warn: () => {} },
  };
  const node = new OfferStudioTrigger();
  const { closeFunction } = await node.trigger.call(triggerCtx);
  try {
    await new Promise((r) => setTimeout(r, 300)); // SSE connection
    await api('PATCH', `/api/offers/${offer.id}`, { data: { client: 'A' } });
    await api('PATCH', `/api/offers/${offer.id}`, { data: { client: 'B' } });
    await api('POST', '/api/blocks', { type: 'other' }).then((b) => api('DELETE', `/api/blocks/${b.id}`)); // another table: ignored
    await new Promise((r) => setTimeout(r, 900));
    assert.equal(emitted.length, 1, 'one run');
    const items = emitted[0][0];
    assert.equal(items.length, 1);
    assert.equal(items[0].json.table, 'offers');
    assert.equal(items[0].json.record.data.client, 'B');
  } finally {
    await closeFunction();
    await api('DELETE', `/api/offers/${offer.id}`);
  }
});
