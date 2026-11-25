import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { DOCS, apiRoutes, buildSpec } from '../src/openapi.js';

// API routes straight from server.js: api.get('/blocks/:id', ...) -> "GET /api/blocks/:id"
const SERVER = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
const routes = [...SERVER.matchAll(/\bapi\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map(
  ([, m, p]) => `${m.toUpperCase()} /api${p}`,
);

test('openapi: every API route is documented in DOCS (the n8n node builds its operations from them)', () => {
  assert.ok(routes.length > 20, 'no routes found in server.js');
  const missing = routes.filter((r) => !DOCS[r]);
  assert.deepEqual(missing, [], `Add a description in src/openapi.js for: ${missing.join(', ')}`);
});

test('openapi: DOCS has no descriptions of routes that no longer exist', () => {
  const stale = Object.keys(DOCS).filter((k) => !routes.includes(k));
  assert.deepEqual(stale, []);
});

test('openapi: operationIds are unique and path parameters are described', () => {
  const ids = Object.values(DOCS).map((d) => d.operationId);
  assert.equal(new Set(ids).size, ids.length);
  for (const [key, doc] of Object.entries(DOCS)) {
    const inPath = [...key.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    const described = (doc.parameters || []).filter((p) => p.in === 'path').map((p) => p.name);
    assert.deepEqual(described.sort(), inPath.sort(), key);
  }
});

test('openapi: spec built from Hono routes, an undocumented route still ends up in the spec', () => {
  const app = new Hono();
  const api = new Hono();
  app.use('*', async (_c, next) => next());
  api.get('/offers/:id', (c) => c.json({}));
  api.post('/widgets/:id/run', (c) => c.json({}));
  app.route('/api', api);
  const spec = buildSpec(apiRoutes(app), { version: '9.9.9' });
  assert.equal(spec.info.version, '9.9.9');
  assert.equal(spec.paths['/api/offers/{id}'].get.operationId, 'getOffer');
  const extra = spec.paths['/api/widgets/{id}/run'].post;
  assert.equal(extra['x-undocumented'], true);
  assert.equal(extra.parameters[0].name, 'id');
  assert.equal(extra.requestBody['x-raw-body'], true);
});
