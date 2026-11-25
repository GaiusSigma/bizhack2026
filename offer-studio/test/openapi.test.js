import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { DOCS, apiRoutes, buildSpec } from '../src/openapi.js';

// Trasy API wprost z server.js: api.get('/blocks/:id', ...) -> "GET /api/blocks/:id"
const SERVER = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
const routes = [...SERVER.matchAll(/\bapi\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)].map(
  ([, m, p]) => `${m.toUpperCase()} /api${p}`,
);

test('openapi: każda trasa API ma opis w DOCS (węzeł n8n buduje z nich operacje)', () => {
  assert.ok(routes.length > 20, 'nie znaleziono tras w server.js');
  const missing = routes.filter((r) => !DOCS[r]);
  assert.deepEqual(missing, [], `Dopisz opis w src/openapi.js dla: ${missing.join(', ')}`);
});

test('openapi: w DOCS nie ma opisów tras, których już nie ma', () => {
  const stale = Object.keys(DOCS).filter((k) => !routes.includes(k));
  assert.deepEqual(stale, []);
});

test('openapi: operationId są unikalne, a parametry ścieżki opisane', () => {
  const ids = Object.values(DOCS).map((d) => d.operationId);
  assert.equal(new Set(ids).size, ids.length);
  for (const [key, doc] of Object.entries(DOCS)) {
    const inPath = [...key.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    const described = (doc.parameters || []).filter((p) => p.in === 'path').map((p) => p.name);
    assert.deepEqual(described.sort(), inPath.sort(), key);
  }
});

test('openapi: spec z tras Hono, trasa bez opisu też trafia do spec', () => {
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
