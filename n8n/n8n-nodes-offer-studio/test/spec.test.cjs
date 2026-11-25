const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSpec, buildRequest, buildMultipart, fileNameFromDisposition } = require('../dist/nodes/OfferStudio/spec.js');

const json = { content: { 'application/json': {} } };
const SPEC = {
  openapi: '3.1.0',
  info: { version: '1.2.3' },
  tags: [{ name: 'Oferty' }, { name: 'Pusta' }],
  paths: {
    '/api/offers/{id}': {
      patch: {
        tags: ['Oferty'],
        operationId: 'updateOffer',
        summary: 'Zmień ofertę',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'replace', in: 'query', schema: { type: 'string', enum: ['', '1'] } },
        ],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, data: { type: 'object' } } } } },
        },
        responses: { 200: json },
      },
    },
    '/api/offers/{id}/pdf': {
      get: { tags: ['Oferty'], summary: 'PDF', responses: { 200: { content: { 'application/pdf': {} } } } },
    },
    '/api/new-thing': {
      post: {
        tags: ['Nowe'],
        'x-undocumented': true,
        requestBody: { 'x-raw-body': true, content: { 'application/json': { schema: { type: 'object' } } } },
      },
    },
    '/api/events': {
      get: { tags: ['System'], 'x-n8n-hidden': true, responses: { 200: { content: { 'text/event-stream': {} } } } },
    },
    '/api/templates': {
      post: {
        tags: ['Szablony'],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { required: ['file'], properties: { file: { type: 'string', format: 'binary' }, id: { type: 'string' } } },
            },
          },
        },
      },
    },
  },
};

test('parseSpec: zasoby, operacje, pola, typy odpowiedzi', () => {
  const s = parseSpec(SPEC);
  assert.equal(s.version, '1.2.3');
  assert.deepEqual(s.tags.map((t) => t.name), ['Oferty', 'Nowe', 'Szablony']); // bez pustych i ukrytych
  const patch = s.operations.find((o) => o.key === 'PATCH /api/offers/{id}');
  assert.deepEqual(patch.fields.map((f) => f.id), ['path:id', 'query:replace', 'body:name', 'body:data']);
  assert.equal(patch.fields[1].kind, 'options');
  const pdf = s.operations.find((o) => o.key === 'GET /api/offers/{id}/pdf');
  assert.equal(pdf.response, 'binary');
  assert.equal(pdf.fields[0].id, 'path:id'); // dodany z samej ścieżki
  const raw = s.operations.find((o) => o.key === 'POST /api/new-thing');
  assert.equal(raw.rawBody, true);
  assert.equal(raw.fields[0].id, 'raw:body');
  assert.equal(s.operations.find((o) => o.key === 'GET /api/events').hidden, true);
  const tpl = s.operations.find((o) => o.key === 'POST /api/templates');
  assert.equal(tpl.bodyType, 'multipart');
  assert.deepEqual(tpl.fields.map((f) => f.id), ['file:file', 'body:id']);
});

test('buildRequest: ścieżka, query, puste pola pominięte, JSON z tekstu', () => {
  const op = parseSpec(SPEC).operations.find((o) => o.key === 'PATCH /api/offers/{id}');
  const r = buildRequest(op, { 'path:id': 'a b', 'query:replace': '', 'body:name': '', 'body:data': '{"client":"ACME"}' });
  assert.equal(r.path, '/api/offers/a%20b');
  assert.deepEqual(r.qs, {});
  assert.deepEqual(r.body, { data: { client: 'ACME' } });
  assert.throws(() => buildRequest(op, {}), /id/);
  assert.throws(() => buildRequest(op, { 'path:id': 'x', 'body:data': '{zly' }), /JSON/);
  const merged = buildRequest(op, { 'path:id': 'x', 'body:name': 'A' }, { data: { price: 1 } });
  assert.deepEqual(merged.body, { name: 'A', data: { price: 1 } });
});

test('multipart i nazwa pliku', () => {
  const mp = buildMultipart({ id: 'x' }, [
    { field: 'file', fileName: 'a.figcraft', mimeType: 'application/octet-stream', data: Buffer.from('ABC') },
  ]);
  const text = mp.body.toString('utf8');
  assert.match(mp.contentType, /^multipart\/form-data; boundary=/);
  assert.match(text, /name="id"\r\n\r\nx\r\n/);
  assert.match(text, /filename="a.figcraft"[\s\S]*ABC/);
  assert.equal(fileNameFromDisposition('attachment; filename="oferta.pdf"'), 'oferta.pdf');
  assert.equal(fileNameFromDisposition("attachment; filename*=UTF-8''oferta%20%C5%82.pdf"), 'oferta ł.pdf');
});
