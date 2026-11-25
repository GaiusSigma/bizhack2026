// Test na żywym Offer Studio (STUDIO_URL, domyślnie http://127.0.0.1:3917, token STUDIO_TOKEN).
// Bez działającego serwera testy są pomijane.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { ctx, STUDIO_URL } = require('./helpers.cjs');
const { OfferStudio } = require('../dist/nodes/OfferStudio/OfferStudio.node.js');

let up = false;
before(async () => {
  up = await fetch(`${STUDIO_URL}/healthz`).then((r) => r.ok, () => false);
});
const node = new OfferStudio();
const run = (params, extra = {}) => node.execute.call(ctx({ params: { options: {}, ...params }, ...extra }));
const op = (operation, value, options = {}) => run({ resource: 'x', operation, fields: { value }, options });

test('live: zasoby i operacje z /api/openapi.json', async (t) => {
  if (!up) return t.skip(`brak Offer Studio pod ${STUDIO_URL}`);
  const resources = await node.methods.loadOptions.getResources.call(ctx());
  const names = resources.map((r) => r.value);
  for (const n of ['Oferty', 'Slajdy', 'Bloki wiedzy', 'Szablony', 'Baza', 'System', '__custom']) assert.ok(names.includes(n), n);
  const ops = await node.methods.loadOptions.getOperations.call(ctx({ params: { resource: 'Oferty' } }));
  assert.ok(ops.some((o) => o.value === 'GET /api/offers/{id}/pdf'));
  const sys = await node.methods.loadOptions.getOperations.call(ctx({ params: { resource: 'System' } }));
  assert.ok(!sys.some((o) => o.value === 'GET /api/events'), 'SSE ukryte');
  const fields = await node.methods.resourceMapping.getFields.call(ctx({ params: { operation: 'PATCH /api/offers/{id}' } }));
  assert.deepEqual(fields.fields.map((f) => f.id), ['path:id', 'query:replace', 'body:name', 'body:template_id', 'body:data']);
});

test('live: blok -> oferta -> slajd -> kopia -> usunięcie', async (t) => {
  if (!up) return t.skip(`brak Offer Studio pod ${STUDIO_URL}`);
  const [block] = (await op('POST /api/blocks', {
    'body:type': 'use_case',
    'body:title': 'Test n8n',
    'body:data': '{"effect":"szybciej"}',
    'body:tags': '["n8n"]',
  }))[0];
  assert.equal(block.json.title, 'Test n8n');
  assert.deepEqual(block.json.data, { effect: 'szybciej' });

  const many = (await op('POST /api/blocks', { 'body:type': 'use_case' }, {
    bodyJson: '[{"type":"problem","title":"A"},{"type":"problem","title":"B"}]',
  }))[0];
  assert.equal(many.length, 2, 'tablica bloków -> 2 elementy');

  const list = (await op('GET /api/blocks', { 'query:tag': 'n8n' }))[0];
  assert.deepEqual(list.map((i) => i.json.id), [block.json.id]);

  const [offer] = (await op('POST /api/offers', { 'body:name': 'Oferta z n8n', 'body:data': { client: 'ACME' } }))[0];
  assert.equal(offer.json.data.client, 'ACME');
  const [patched] = (await op('PATCH /api/offers/{id}', { 'path:id': offer.json.id, 'body:data': '{"price":"12 000"}' }))[0];
  assert.deepEqual(patched.json.data, { client: 'ACME', price: '12 000' });

  const [slide] = (await op('POST /api/offers/{id}/slides', {
    'path:id': offer.json.id,
    'body:frame': 'use-case',
    'body:block_ids': [block.json.id],
    'body:hidden': 'false',
  }))[0];
  assert.equal(slide.json.frame, 'use-case');
  assert.equal(slide.json.hidden, false);

  const [copy] = (await op('POST /api/offers/{id}/duplicate', { 'path:id': offer.json.id, 'body:name': 'Kopia' }))[0];
  assert.equal(copy.json.slides.length, 1);

  for (const id of [offer.json.id, copy.json.id]) {
    const [del] = (await op('DELETE /api/offers/{id}', { 'path:id': id }))[0];
    assert.equal(del.json.success, true);
  }
  for (const b of [block, ...many]) await op('DELETE /api/blocks/{id}', { 'path:id': b.json.id });

  await assert.rejects(op('GET /api/offers/{id}', { 'path:id': offer.json.id }), (e) => e.httpCode === '404');
});

test('live: plik binarny (szablon .figcraft) i upload multipart', async (t) => {
  if (!up) return t.skip(`brak Offer Studio pod ${STUDIO_URL}`);
  const [tpl] = (await op('GET /api/templates', {}))[0];
  const [file] = (await op('GET /api/templates/{id}/file', { 'path:id': tpl.json.id }, { binaryPropertyName: 'plik' }))[0];
  assert.match(file.json.fileName, /\.figcraft$/);
  const buf = Buffer.from(file.binary.plik.data, 'base64');
  assert.ok(buf.length > 1000);

  const binary = { data: { fileName: 'kopia.figcraft', mimeType: 'application/octet-stream', buffer: buf } };
  const [uploaded] = (await run(
    { resource: 'x', operation: 'POST /api/templates', fields: { value: { 'file:file': 'data', 'body:id': 'n8n-test-tpl', 'body:name': 'Z n8n' } } },
    { binary },
  ))[0];
  assert.equal(uploaded.json.id, 'n8n-test-tpl');
  assert.ok(uploaded.json.frames.length > 0);
  await op('DELETE /api/templates/{id}', { 'path:id': 'n8n-test-tpl' });
});

test('live: dowolne żądanie', async (t) => {
  if (!up) return t.skip(`brak Offer Studio pod ${STUDIO_URL}`);
  const out = (await run({ resource: '__custom', method: 'GET', path: 'api/blocks', query: '{"type":"use_case"}' }))[0];
  assert.ok(out.length > 0);
  assert.ok(out.every((i) => i.json.type === 'use_case'));
});
