import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import seed, { TEMPLATE } from '../seed/seed.js';
import { tiles, solutionBlocks, tileTags } from '../seed/tiles.js';
import { DECK_TEMPLATE, scenarios } from '../seed/scenarios.js';
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
  for (const t of tiles.filter((x) => x.category === 'role')) assert.ok(t.data.writing_brief?.length > 40, `${t.id}: writing brief`);
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
const frames = Object.fromEntries(parseTemplate(readFileSync(new URL(`../seed/${DECK_TEMPLATE.file}`, import.meta.url))).frames.map((f) => [f.name, f]));

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
  assert.deepEqual(scenarios.map((s) => s.id), ['base']);
  const types = new Set(seed.blocks.map((b) => b.type));
  const sets = new Set(seed.component_sets.map((c) => c.id));
  const products = new Set(tiles.filter((t) => t.category === 'product').map((t) => t.id));
  const roles = new Set(tiles.filter((t) => t.category === 'role').map((t) => t.id));
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
      for (const c of st.answers || []) assert.ok(['role', 'segment', 'pain', 'product'].includes(c), `${where}: answers ${c}`);
      for (const t of Object.keys(st.data_by_product || {})) assert.ok(products.has(t), `${where}: data_by_product ${t}`);
      for (const [r, byProduct] of Object.entries({ ...st.data_by_role, ...st.data_by_role_product })) {
        assert.ok(roles.has(r), `${where}: role ${r}`);
        if (st.data_by_role_product?.[r]) for (const t of Object.keys(st.data_by_role_product[r])) assert.ok(products.has(t), `${where}: ${r} ${t}`);
      }
      for (const [k, w] of Object.entries(st.write || {})) for (const r of Object.keys(w.hint_by_role || {})) assert.ok(roles.has(r), `${where}: ${k} hint ${r}`);
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

test('base deck: the ten slides of the 2026 deck, in order, the comparison optional', () => {
  const base = scenarios.find((s) => s.id === 'base');
  assert.deepEqual(base.steps.map((s) => s.frame), ['title', 'starting-point', 'use-areas', 'team-support', 'tool-comparison', 'security', 'preparation', 'rollout-process', 'add-on-services', 'contact-person']);
  assert.deepEqual(base.steps.filter((s) => s.optional).map((s) => s.key), ['tool-comparison']);
  const contact = base.steps.find((s) => s.key === 'contact-person');
  assert.deepEqual(contact.fill, { kind: 'blocks', type: 'person', min: 1, max: 1 });
});

test('base deck: every field a model writes is a field of its slide, and the default copy fits the limits', () => {
  for (const st of scenarios.find((s) => s.id === 'base').steps) {
    const f = frames[st.frame];
    for (const [key, w] of Object.entries(st.write || {})) {
      const where = `${st.key}.${key}`;
      assert.ok(f.fields.data.includes(key), `${where}: the slide has no such field`);
      assert.ok(w.hint, `${where}: no hint`);
      for (const d of [st.data, ...Object.values(st.data_by_product || {})]) {
        if (d[key] == null) continue;
        if (!w.columns) { assert.ok(d[key].length <= w.max, `${where}: default copy over ${w.max} characters`); continue; }
        // list field: the slide's cards print exactly these columns; the default items fit the count
        assert.ok(f.fields.sources.includes(key), `${where}: the slide has no #item:${key} cards`);
        for (const col of Object.keys(w.columns)) assert.ok(f.fields.item.includes(col), `${where}: the cards have no {{${col}}}`);
        const rows = d[key].split('\n');
        assert.ok(rows.length >= w.min && rows.length <= w.max, `${where}: ${rows.length} default items`);
        for (const r of rows) assert.equal(r.split('|').length, Object.keys(w.columns).length, `${where}: "${r}"`);
      }
    }
  }
});

test('product fit: content that names Gaius Vault or the client’s own server never reaches a SaaS offer', () => {
  const all = [...seed.blocks, ...solutionBlocks].map((b) => ({ ...b, tags: [...b.tags, ...(tileTags[b.id] || [])] }));
  const offered = all.filter((b) => ['solution', 'use_case', 'differentiator', 'comparison', 'pillar'].includes(b.type));
  const text = (b) => [b.title, b.body, ...Object.values(b.data || {}).map(String)].join(' ');
  const vaultOnly = offered.filter((b) => /\bVault\b|own server|your server|local language models|on-premise/i.test(text(b)) && !/SaaS/.test(text(b)));
  assert.ok(vaultOnly.length >= 5);
  for (const b of vaultOnly) {
    const prods = b.tags.filter((t) => t.startsWith('product:'));
    assert.ok(prods.length && !prods.includes('product:saas'), `${b.id}: names Vault or an own server, so it needs product tags without SaaS (has ${prods.join(', ') || 'none'})`);
    // the client's own server is the on-prem product only
    if (/own server|your server|on a server in your organisation|local language models/i.test(text(b)) && !/can run on-premise/i.test(text(b))) {
      assert.deepEqual(prods, ['product:on-prem'], `${b.id}: own server -> on-prem only`);
    }
  }
});
