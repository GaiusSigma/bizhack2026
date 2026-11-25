import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from '../seed/seed.js';
import { tiles, solutionBlocks, tileTags } from '../seed/tiles.js';

const TILE_RE = /^(rola|segment|bol|produkt):[a-z0-9][a-z0-9-]{0,59}$/;
const ids = (cat, status) => tiles.filter((t) => t.category === cat && (!status || t.status === status)).map((t) => t.id).sort();

test('kafelki: id i kategorie poprawne, statusy wg ustaleń', () => {
  for (const t of tiles) {
    assert.match(t.id, TILE_RE, t.id);
    assert.ok(t.id.startsWith(`${t.category}:`), t.id);
    assert.ok(t.label, `${t.id}: brak nazwy`);
    assert.ok(['active', 'soon'].includes(t.status), t.id);
  }
  assert.equal(new Set(tiles.map((t) => t.id)).size, tiles.length, 'powtórzone id');
  assert.deepEqual(ids('rola', 'active'), ['rola:champion', 'rola:zarzad']);
  assert.deepEqual(ids('rola', 'soon'), ['rola:budzet', 'rola:cto', 'rola:dpo', 'rola:gc']);
  assert.deepEqual(ids('segment', 'active'), ['segment:administracja', 'segment:in-house', 'segment:kancelaria']);
  assert.deepEqual(ids('produkt'), ['produkt:on-prem', 'produkt:saas', 'produkt:vault']);
  const pains = tiles.filter((t) => t.category === 'bol');
  assert.equal(pains.length, 11);
  for (const p of pains) {
    assert.equal(p.status, 'active', p.id);
    assert.ok(p.quotes.length >= 1, `${p.id}: brak cytatu`);
  }
});

test('rozwiązania: 27 bloków PRKW, każdy przypięty do >= 1 bólu', () => {
  assert.equal(solutionBlocks.length, 27);
  for (const b of solutionBlocks) {
    assert.equal(b.type, 'rozwiazanie');
    assert.match(b.id, /^rz-[a-z0-9-]+$/);
    assert.ok(b.title && b.title.length <= 60, `${b.id}: tytuł`);
    assert.ok(b.body, `${b.id}: brak rozwiązania`);
    assert.ok(b.data.effect && b.data.problem, `${b.id}: brak korzyści albo problemu`);
    assert.ok(b.tags.some((t) => t.startsWith('bol:')), `${b.id}: brak bólu`);
  }
});

test('pokrycie: każdy ból ma >= 1 blok rozwiazanie albo use_case', () => {
  const counted = seed.blocks.filter((b) => ['rozwiazanie', 'use_case'].includes(b.type));
  for (const p of tiles.filter((t) => t.category === 'bol')) {
    assert.ok(counted.some((b) => b.tags.includes(p.id)), `${p.id}: żaden blok go nie rozwiązuje`);
  }
});

test('przypięcia: każde id w tileTags istnieje w seedzie, każdy tag to istniejący kafelek', () => {
  const known = new Set([...seed.blocks.map((b) => b.id), ...seed.components.map((c) => c.id)]);
  const tileIds = new Set(tiles.map((t) => t.id));
  for (const [id, tags] of Object.entries(tileTags)) {
    assert.ok(known.has(id), `nie ma ${id}`);
    for (const t of tags) assert.ok(tileIds.has(t), `${id}: nieznany kafelek ${t}`);
  }
  for (const b of solutionBlocks) for (const t of b.tags) assert.ok(tileIds.has(t), `${b.id}: nieznany kafelek ${t}`);
  // seed ma już dopisane przypięcia
  assert.ok(seed.blocks.find((b) => b.id === 'uc-pilne-pismo').tags.some((t) => t.startsWith('bol:')));
  assert.deepEqual(seed.tiles, tiles);
});
