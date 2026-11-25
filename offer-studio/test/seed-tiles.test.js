import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import seed, { TEMPLATE } from '../seed/seed.js';
import { tiles, solutionBlocks, tileTags } from '../seed/tiles.js';
import { scenarios } from '../seed/scenarios.js';
import { parseTemplate } from '../src/figcraft.js';

const TILE_RE = /^(role|segment|pain|product):[a-z0-9][a-z0-9-]{0,59}$/;
const ids = (cat, status) => tiles.filter((t) => t.category === cat && (!status || t.status === status)).map((t) => t.id).sort();

test('tiles: valid ids and categories, statuses as agreed', () => {
  for (const t of tiles) {
    assert.match(t.id, TILE_RE, t.id);
    assert.ok(t.id.startsWith(`${t.category}:`), t.id);
    assert.ok(t.label, `${t.id}: brak nazwy`);
    assert.ok(['active', 'soon'].includes(t.status), t.id);
  }
  assert.equal(new Set(tiles.map((t) => t.id)).size, tiles.length, 'powtórzone id');
  assert.deepEqual(ids('role', 'active'), ['role:board', 'role:champion']);
  assert.deepEqual(ids('role', 'soon'), ['role:budget', 'role:cto', 'role:dpo', 'role:gc']);
  assert.deepEqual(ids('segment', 'active'), ['segment:in-house', 'segment:law-firm', 'segment:public-sector']);
  assert.deepEqual(ids('product'), ['product:on-prem', 'product:saas', 'product:vault']);
  const pains = tiles.filter((t) => t.category === 'pain');
  assert.equal(pains.length, 11);
  for (const p of pains) {
    assert.equal(p.status, 'active', p.id);
    assert.ok(p.quotes.length >= 1, `${p.id}: brak cytatu`);
  }
});

test('solutions: 27 PRKW rows plus 5 from product sentences, each pinned to >= 1 pain and with a source', () => {
  assert.equal(solutionBlocks.length, 32);
  for (const b of solutionBlocks) {
    assert.equal(b.type, 'solution');
    assert.match(b.id, /^sol-[a-z0-9-]+$/);
    assert.ok(b.title && b.title.length <= 60, `${b.id}: tytuł`);
    assert.ok(b.body, `${b.id}: brak rozwiązania`);
    assert.ok(b.data.effect && b.data.problem, `${b.id}: brak korzyści albo problemu`);
    assert.ok(b.tags.some((t) => t.startsWith('pain:')), `${b.id}: no pain`);
    assert.ok(b.data.source, `${b.id}: no source`);
  }
});

test('coverage: every pain has >= 1 solution or use_case block', () => {
  const counted = seed.blocks.filter((b) => ['solution', 'use_case'].includes(b.type));
  for (const p of tiles.filter((t) => t.category === 'pain')) {
    assert.ok(counted.some((b) => b.tags.includes(p.id)), `${p.id}: żaden blok go nie rozwiązuje`);
  }
});

test('pinning: every id in tileTags exists in the seed, every tag is an existing tile', () => {
  const known = new Set([...seed.blocks.map((b) => b.id), ...seed.components.map((c) => c.id)]);
  const tileIds = new Set(tiles.map((t) => t.id));
  for (const [id, tags] of Object.entries(tileTags)) {
    assert.ok(known.has(id), `nie ma ${id}`);
    for (const t of tags.filter((x) => x.includes(':'))) assert.ok(tileIds.has(t), `${id}: unknown tile ${t}`);
  }
  for (const b of solutionBlocks) for (const t of b.tags) assert.ok(tileIds.has(t), `${b.id}: unknown tile ${t}`);
  // the seed already has the pins applied
  assert.ok(seed.blocks.find((b) => b.id === 'uc-urgent-letter').tags.some((t) => t.startsWith('pain:')));
  assert.deepEqual(seed.tiles, tiles);
});

// ------------------------------------------------------------------ scenariusze
const frames = Object.fromEntries(parseTemplate(readFileSync(new URL(`../seed/${TEMPLATE.file}`, import.meta.url))).frames.map((f) => [f.name, f]));

test('scenarios: every frame exists in the template, and data and data_by_product keys are frame fields', () => {
  for (const sc of scenarios) {
    for (const st of sc.steps) {
      const f = frames[st.frame];
      assert.ok(f, `${sc.id}/${st.key}: brak ramki ${st.frame}`);
      const overrides = Object.values(st.data_by_product || {});
      for (const d of [st.data || {}, ...overrides]) {
        for (const k of Object.keys(d)) assert.ok(f.fields.data.includes(k), `${sc.id}/${st.key}: ramka ${st.frame} nie ma pola ${k}`);
      }
      if (st.fill.kind === 'blocks' || st.fill.kind === 'pains') assert.ok(f.fields.sources.includes('blocks'), `${sc.id}/${st.key}: ramka bez bloków`);
      if (st.fill.kind === 'picks') assert.ok(f.fields.picks[st.fill.set], `${sc.id}/${st.key}: ramka bez slotów ${st.fill.set}`);
    }
  }
});

test('scenarios: valid fill and when', () => {
  assert.deepEqual(scenarios.map((s) => s.id).sort(), ['role:board', 'role:champion']);
  const types = new Set(seed.blocks.map((b) => b.type));
  const sets = new Set(seed.component_sets.map((c) => c.id));
  const products = new Set(tiles.filter((t) => t.category === 'product').map((t) => t.id));
  for (const sc of scenarios) {
    const keys = sc.steps.map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length, `${sc.id}: powtórzone klucze kroków`);
    for (const st of sc.steps) {
      const where = `${sc.id}/${st.key}`;
      assert.ok(st.label, `${where}: brak nazwy`);
      assert.ok(['none', 'pains', 'blocks', 'picks'].includes(st.fill.kind), where);
      if (st.fill.kind === 'blocks') {
        assert.ok(types.has(st.fill.type), `${where}: nie ma bloków typu ${st.fill.type}`);
        assert.ok(st.fill.min >= 0 && st.fill.min <= st.fill.max, where);
      }
      if (st.fill.kind === 'picks') assert.ok(sets.has(st.fill.set), where);
      for (const t of st.when?.any || []) assert.ok(products.has(t), `${where}: when ${t}`);
      for (const t of Object.keys(st.data_by_product || {})) assert.ok(products.has(t), `${where}: data_by_product ${t}`);
    }
  }
  assert.deepEqual(seed.scenarios, scenarios);
});

const ACTIVE_SEGMENTS = tiles.filter((t) => t.category === 'segment' && t.status === 'active').map((t) => t.id);
const fitsSegment = (b, seg) => {
  const segs = b.tags.filter((t) => t.startsWith('segment:'));
  return !segs.length || segs.includes(seg);
};

// Pairs where only one solution honestly fits. They are pains the sales sheet does not list for that segment,
// so content is thin on purpose (nothing is pinned just to raise the count). Changing this list is a content decision.
const THIN = [
  'pain:group-scale x segment:law-firm',
  'pain:shadow-ai x segment:law-firm',
  'pain:templates-at-scale x segment:in-house',
  'pain:templates-at-scale x segment:law-firm',
  'pain:templates-at-scale x segment:public-sector',
];

test('coverage: every pain has a solution in every active segment, typical pairs at least two, thin pairs listed', () => {
  const thin = [];
  const problems = [];
  for (const p of tiles.filter((t) => t.category === 'pain')) {
    for (const seg of ACTIVE_SEGMENTS) {
      const n = solutionBlocks.filter((b) => b.tags.includes(p.id) && fitsSegment(b, seg)).length;
      if (n === 0) problems.push(`${p.id} x ${seg}: no solution`);
      if (n < 2 && p.data.typical_segments.includes(seg)) problems.push(`${p.id} x ${seg}: typical pair with ${n}`);
      if (n === 1) thin.push(`${p.id} x ${seg}`);
    }
  }
  assert.deepEqual(problems, []);
  assert.deepEqual(thin.sort(), THIN);
});

test('pains: typical segments are known segment tiles', () => {
  const segs = new Set(tiles.filter((t) => t.category === 'segment').map((t) => t.id));
  for (const p of tiles.filter((t) => t.category === 'pain')) {
    assert.ok(p.data.typical_segments.length, p.id);
    for (const s of p.data.typical_segments) assert.ok(segs.has(s), `${p.id}: ${s}`);
  }
});

test('tiles: every tile says when to pick it, active tiles also when not to and what they are', () => {
  for (const t of tiles) {
    assert.ok(t.data.pick_when?.length > 20, `${t.id}: pick_when`);
    assert.ok(t.data.avoid_when?.length > 10, `${t.id}: avoid_when`);
    if (t.status === 'active') assert.ok(t.description.length > 40, `${t.id}: description too short`);
  }
});

test('content: every block and card is pinned to a tile or marked general', () => {
  const loose = [...seed.blocks, ...seed.components].filter((x) => !x.tags.some((t) => t.includes(':')) && !x.tags.includes('general'));
  assert.deepEqual(loose.map((x) => x.id), []);
});

test('content language: everything people see is in English (proper names aside)', () => {
  const allowed = ['Marszałek'];
  const polish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  const offenders = [];
  const check = (id, value) => {
    let text = JSON.stringify(value);
    for (const a of allowed) text = text.split(a).join('');
    if (polish.test(text)) offenders.push(id);
  };
  for (const b of seed.blocks) check(b.id, [b.title, b.body, b.data]);
  for (const t of tiles) check(t.id, [t.label, t.description, t.quotes, t.data]);
  for (const c of seed.components) check(c.id, [c.title, c.description, c.use_when, c.avoid_when]);
  for (const s of scenarios) check(s.id, s.steps);
  assert.deepEqual(offenders, []);
});
