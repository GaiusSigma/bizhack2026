import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEIGHTS, buildSlides, buildSlots, applySlotChoice, elementTiles, coverage, mergeRecompute, parseSelection, pickBlocks, pickCards, score, segmentOk, stepApplies, stepData,
} from '../src/generate.js';

// ------------------------------------------------------------------ atrapy
const T = (id, status = 'active', label = id) => ({ id, category: id.split(':')[0], label, status, data: {} });
const TILES = [
  T('role:board'), T('role:champion'), T('role:cto', 'soon', 'CTO / CIO / CISO'),
  T('segment:law-firm'), T('segment:in-house'), T('segment:finance', 'soon'),
  T('product:saas'), T('product:vault'), T('product:on-prem'),
  T('pain:confidentiality'), T('pain:shadow-ai'), T('pain:unsearchable-archive'), T('pain:nda'), T('pain:koszt'), T('pain:bez-tresci'),
];
const SEL = { role: 'role:board', segment: 'segment:law-firm', product: 'product:vault', pains: ['pain:confidentiality', 'pain:unsearchable-archive'] };
const block = (id, type, tags) => ({ id, type, title: id, body: '', data: {}, tags });
const BLOCKS = [
  block('rz-a', 'solution', ['pain:unsearchable-archive']),
  block('rz-b', 'solution', ['pain:confidentiality', 'segment:law-firm']),
  block('rz-c', 'solution', ['pain:confidentiality', 'segment:in-house']),
  block('rz-d', 'solution', ['pain:nda']),
  block('rz-e', 'solution', ['vault']),
  block('uc-a', 'use_case', ['pain:unsearchable-archive']),
  block('pr-a', 'problem', ['pain:confidentiality']),
];
const card = (key, topic, variant, tags) => ({ id: `why/${key}`, set_name: 'why', key, topic, variant, tags, missing: false });
const cardsFor = (topic, tags, variants = ['regular', 'highlight']) =>
  variants.map((v) => card(v === 'regular' ? topic : `${topic}-${v}`, topic, v, tags));
const CARDS = [
  ...cardsFor('t1', []),
  ...cardsFor('t2', ['pain:unsearchable-archive']),
  ...cardsFor('t3', ['pain:confidentiality', 'role:board']),
  ...cardsFor('t4', []),
  ...cardsFor('t5', ['product:vault']),
  ...cardsFor('t6', []),
  ...cardsFor('t7', []),
  ...cardsFor('t8', ['pain:confidentiality'], ['regular', 'highlight', 'stat']),
  card('t9-stat', 't9', 'stat', ['pain:unsearchable-archive']),
];
const SCENARIO = {
  id: 'role:board',
  steps: [
    { key: 'okladka', label: 'Okładka', frame: 'okladka', data: { title: 'Gaius Vault' }, data_by_product: { 'product:saas': { title: 'Gaius' } }, fill: { kind: 'none' } },
    { key: 'bole', label: 'Problemy klienta', frame: 'problemy', data: {}, fill: { kind: 'pains' } },
    { key: 'dlaczego', label: 'Dlaczego', frame: 'dlaczego', data: {}, fill: { kind: 'picks', set: 'why' } },
    { key: 'rozwiazania', label: 'Jak rozwiązujemy', frame: 'use-case', data: {}, fill: { kind: 'blocks', type: 'solution', min: 2, max: 3 } },
    { key: 'architektura', label: 'Architektura', frame: 'architektura', data: {}, fill: { kind: 'none' }, when: { any: ['product:vault', 'product:on-prem'] } },
  ],
};
const DATA = { blocks: BLOCKS, components: CARDS, tiles: TILES, slots: { why: 6 } };
const status = (fn) => { try { fn(); } catch (e) { return [e.status, e.message]; } return null; };

// ------------------------------------------------------------------ tile selection
test('parseSelection: coming-soon tile, unknown tile and wrong counts -> 400 naming the tile', () => {
  const ok = ['role:board', 'segment:law-firm', 'product:vault', 'pain:confidentiality', 'pain:unsearchable-archive'];
  assert.deepEqual(parseSelection(ok, TILES), SEL);
  assert.deepEqual(parseSelection([...ok, 'pain:confidentiality'], TILES), SEL, 'powtórka nie przeszkadza');

  let [st, msg] = status(() => parseSelection([...ok, 'role:cto'].filter((x) => x !== 'role:board'), TILES));
  assert.equal(st, 400);
  assert.match(msg, /CTO \/ CIO \/ CISO/);
  assert.match(msg, /coming soon/);

  [st, msg] = status(() => parseSelection([...ok, 'pain:nie-ma'], TILES));
  assert.equal(st, 400);
  assert.match(msg, /pain:nie-ma/);

  assert.match(status(() => parseSelection(ok.filter((x) => x !== 'role:board'), TILES))[1], /role/);
  assert.match(status(() => parseSelection([...ok, 'segment:in-house'], TILES))[1], /segment/);
  assert.match(status(() => parseSelection(ok.filter((x) => x !== 'product:vault'), TILES))[1], /product/);
  assert.match(status(() => parseSelection(ok.filter((x) => !x.startsWith('pain:')), TILES))[1], /1 to 5/);
  assert.match(status(() => parseSelection([...ok, 'pain:shadow-ai', 'pain:nda', 'pain:koszt', 'pain:bez-tresci'], TILES))[1], /1 to 5/);
});

// ------------------------------------------------------------------ ocena
test('score: pain 3, segment 2, role 1, product 1; other tags (vault, law-firm) ignored', () => {
  assert.deepEqual(WEIGHTS, { pain: 3, segment: 2, role: 1, product: 1 });
  assert.deepEqual(score(['pain:confidentiality', 'segment:law-firm', 'vault', 'kancelaria'], SEL), { score: 5, matched: ['pain:confidentiality', 'segment:law-firm'] });
  assert.deepEqual(score(['role:board', 'product:vault', 'pain:shadow-ai', 'pain:usuniety'], SEL), { score: 2, matched: ['role:board', 'product:vault'] });
  assert.equal(segmentOk(['segment:in-house'], SEL), false);
  assert.equal(segmentOk(['segment:in-house', 'segment:law-firm'], SEL), true);
  assert.equal(segmentOk(['pain:confidentiality'], SEL), true);
});

test('pickBlocks: segment filter, min/max, zero scores only up to min, ties in input order', () => {
  const rz = BLOCKS.filter((b) => b.type === 'solution');
  // rz-b 5 (pain+segment), rz-a 3, rz-c filtered out (other segment), rz-d and rz-e score 0
  assert.deepEqual(pickBlocks(rz, { min: 2, max: 3 }, SEL), [
    { id: 'rz-b', matched: ['pain:confidentiality', 'segment:law-firm'] },
    { id: 'rz-a', matched: ['pain:unsearchable-archive'] },
  ]);
  assert.deepEqual(pickBlocks(rz, { min: 3, max: 3 }, SEL).map((x) => x.id), ['rz-b', 'rz-a', 'rz-d'], 'zero dobite do min w kolejności wejściowej');
  assert.deepEqual(pickBlocks(rz, { min: 1, max: 1 }, SEL).map((x) => x.id), ['rz-b']);
  const tie = [block('x1', 'solution', ['pain:unsearchable-archive']), block('x2', 'solution', ['pain:unsearchable-archive'])];
  assert.deepEqual(pickBlocks(tie, { min: 0, max: 2 }, SEL).map((x) => x.id), ['x1', 'x2']);
});

test('pickCards: 6 distinct topics, exactly one highlight (top-scoring topic), at most one stat', () => {
  const picks = pickCards(CARDS, 6, SEL);
  assert.equal(picks.length, 6);
  const comp = Object.fromEntries(CARDS.map((c) => [c.id, c]));
  const chosen = picks.map((p) => comp[p.component]);
  assert.equal(new Set(chosen.map((c) => c.topic)).size, 6);
  assert.equal(chosen.filter((c) => c.variant === 'highlight').length, 1);
  assert.ok(chosen.filter((c) => c.variant === 'stat').length <= 1);
  // t3: pain 3 + role 1 = 4 -> top score, goes first as the highlight variant
  assert.equal(picks[0].component, 'why/t3-highlight');
  assert.deepEqual(picks[0].matched, ['pain:confidentiality', 'role:board']);
  // t8 has a regular variant, so its stat card is not used
  assert.ok(!picks.some((p) => p.component === 'why/t8-stat'));
  // t9 only has a stat card: it goes in as stat (archive = 3)
  assert.ok(picks.some((p) => p.component === 'why/t9-stat'));
  assert.deepEqual(pickCards(CARDS, 6, SEL), picks, 'powtarzalnie');
});

// ------------------------------------------------------------------ slajdy
test('buildSlides: architecture only with vault/on-prem; pains step holds pain ids; data_by_product overrides the title', () => {
  const vault = buildSlides(SCENARIO, SEL, DATA);
  assert.deepEqual(vault.map((s) => s.origin.step), ['okladka', 'bole', 'dlaczego', 'rozwiazania', 'architektura']);
  assert.equal(vault[0].data.title, 'Gaius Vault');
  assert.deepEqual(vault[1].block_ids, ['pain:confidentiality', 'pain:unsearchable-archive']);
  assert.equal(vault[2].picks.why.length, 6);
  assert.deepEqual(vault[3].block_ids, ['rz-b', 'rz-a']);
  assert.deepEqual(vault[3].origin.matched['rz-b'], ['pain:confidentiality', 'segment:law-firm']);
  for (const s of vault) assert.equal(s.locked, false);

  const saas = buildSlides(SCENARIO, { ...SEL, product: 'product:saas' }, DATA);
  assert.ok(!saas.some((s) => s.origin.step === 'architektura'));
  assert.equal(saas[0].data.title, 'Gaius');
  assert.equal(stepApplies(SCENARIO.steps[4], { ...SEL, product: 'product:on-prem' }), true);
  assert.deepEqual(stepData(SCENARIO.steps[0], { ...SEL, product: 'product:saas' }), { title: 'Gaius' });
});

test('buildSlides: the same tiles twice -> identical result', () => {
  assert.deepEqual(buildSlides(SCENARIO, SEL, DATA), buildSlides(SCENARIO, SEL, DATA));
});

test('buildSlides: a pain without content -> solutions slide still gets min blocks, coverage.missing lists the pain', () => {
  const sel = { ...SEL, pains: ['pain:bez-tresci'] };
  const slides = buildSlides(SCENARIO, sel, DATA);
  const rz = slides.find((s) => s.origin.step === 'rozwiazania');
  assert.equal(rz.block_ids.length, 2);
  const byId = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));
  assert.deepEqual(coverage(slides, sel.pains, byId), { covered: [], missing: ['pain:bez-tresci'] });
});

test('coverage: a pain counts when an element on a visible slide is linked to it (directly, via a solution or a card); pain tiles and hidden slides do not', () => {
  const byId = Object.fromEntries([...BLOCKS, { ...block('pr-s', 'problem', []), data: { solutions: ['rz-d'] } }].map((b) => [b.id, b]));
  const cards = Object.fromEntries(CARDS.map((c) => [c.id, c]));
  const pains = ['pain:confidentiality', 'pain:unsearchable-archive', 'pain:nda', 'pain:koszt'];
  assert.deepEqual(coverage([
    { hidden: false, block_ids: ['pr-a'] },                                // problem block tagged confidentiality
    { hidden: true, block_ids: ['rz-a'] },                                 // hidden: archive does not count
    { hidden: false, block_ids: ['pain:confidentiality'] },                // the pain tile itself does not count
    { hidden: false, block_ids: ['pr-s'] },                                // via linked solution rz-d -> nda
  ], pains, byId, cards), { covered: ['pain:confidentiality', 'pain:nda'], missing: ['pain:unsearchable-archive', 'pain:koszt'] });
  assert.deepEqual(coverage([{ hidden: false, block_ids: [], picks: { why: [{ component: 'why/t3' }] } }], pains, byId, cards).covered, ['pain:confidentiality'], 'a card counts');
});

// ------------------------------------------------------------------ przeliczanie
const saved = (fresh) => fresh.map((s, i) => ({ ...s, id: `s${i}`, position: i }));

test('mergeRecompute: a locked slide stays bit for bit, a locked slide whose step no longer applies -> hide, a manual slide stays after its predecessor', () => {
  const existing = saved(buildSlides(SCENARIO, SEL, DATA));
  existing[3] = { ...existing[3], locked: true, block_ids: ['rz-d'] }; // rozwiązania poprawione ręcznie
  existing[4] = { ...existing[4], locked: true }; // architektura poprawiona ręcznie
  existing.splice(2, 0, { id: 'manual', position: 2, frame: 'kontakt', data: {}, block_ids: [], picks: {}, origin: null, locked: true, hidden: false });

  const fresh = buildSlides(SCENARIO, { ...SEL, product: 'product:saas', pains: ['pain:unsearchable-archive'] }, DATA);
  const plan = mergeRecompute(existing, fresh);
  const kept = Object.fromEntries(plan.keep.map((s) => [s.id, s]));
  assert.deepEqual(kept.s3, existing.find((s) => s.id === 's3'), 'zablokowany bit w bit');
  assert.deepEqual(plan.hide, ['s4'], 'architektura nie obowiązuje przy SaaS');
  assert.ok(kept.manual);
  assert.ok(plan.remove.includes('s1'), 'bóle się zmieniły, slajd automatyczny do wymiany');
  assert.ok(!plan.remove.includes('s3') && !plan.remove.includes('manual'));
  // order: cover, (new pains), manual slide after its old predecessor, why, solutions (locked), architecture (hidden) after its predecessor
  const order = plan.order.map((x) => (typeof x === 'string' ? x : fresh[x.create].origin.step));
  assert.equal(order.indexOf('manual'), order.indexOf('bole') + 1);
  assert.equal(order.indexOf('s3'), order.indexOf('dlaczego') + 1);
  assert.equal(order.indexOf('s4'), order.indexOf('s3') + 1);
});

test('mergeRecompute: two recomputes in a row without changes -> no create/remove in the second', () => {
  const existing = saved(buildSlides(SCENARIO, SEL, DATA));
  const plan = mergeRecompute(existing, buildSlides(SCENARIO, SEL, DATA));
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.remove, []);
  assert.deepEqual(plan.hide, []);
  assert.deepEqual(plan.order, existing.map((s) => s.id));
});

test('mergeRecompute: a slide hidden by recompute comes back when its step applies again; one hidden by hand does not', () => {
  const vault = saved(buildSlides(SCENARIO, SEL, DATA));
  vault[4] = { ...vault[4], locked: true }; // architektura poprawiona ręcznie
  const saas = buildSlides(SCENARIO, { ...SEL, product: 'product:saas' }, DATA);
  const p1 = mergeRecompute(vault, saas);
  assert.deepEqual(p1.hide, ['s4']);

  // po przeliczeniu (applyRecompute) slajd jest ukryty i oznaczony jako ukryty automatycznie
  const after = vault.map((s) => (s.id === 's4' ? { ...s, hidden: true, origin: { ...s.origin, auto_hidden: true } } : s));
  const p2 = mergeRecompute(after, buildSlides(SCENARIO, SEL, DATA));
  assert.deepEqual(p2.unhide, ['s4']);
  assert.deepEqual(p2.hide, []);

  const byHand = vault.map((s) => (s.id === 's4' ? { ...s, hidden: true } : s));
  assert.deepEqual(mergeRecompute(byHand, buildSlides(SCENARIO, SEL, DATA)).unhide, []);
});

test('pickBlocks: every selected pain gets a block before the rest is filled by score', () => {
  const sel = { ...SEL, pains: ['pain:a', 'pain:b', 'pain:c'] };
  const cands = [
    block('x1', 'solution', ['pain:a', 'pain:b']),
    block('x2', 'solution', ['pain:a', 'pain:b']),
    block('x3', 'solution', ['pain:a', 'pain:b']),
    block('x4', 'solution', ['pain:c']),
  ];
  // x1–x3 score 6, x4 only 3, but without x4 pain:c would stay unsolved
  assert.deepEqual(pickBlocks(cands, { min: 2, max: 3 }, sel).map((x) => x.id), ['x1', 'x2', 'x4']);
  // with room for all four, the order on the slide is still by score
  assert.deepEqual(pickBlocks(cands, { min: 0, max: 4 }, sel).map((x) => x.id), ['x1', 'x2', 'x3', 'x4']);
  // more pains than slots: the first pains in the selection win the slots
  assert.deepEqual(pickBlocks(cands, { min: 1, max: 1 }, sel).map((x) => x.id), ['x1']);
});

test('pickBlocks: content tagged with products goes only to offers with one of those products', () => {
  const pkgs = [
    block('pkg-all', 'package', []),
    block('pkg-vault', 'package', ['product:vault', 'product:on-prem']),
  ];
  assert.deepEqual(pickBlocks(pkgs, { min: 2, max: 2 }, SEL).map((x) => x.id), ['pkg-vault', 'pkg-all']);
  assert.deepEqual(pickBlocks(pkgs, { min: 2, max: 2 }, { ...SEL, product: 'product:saas' }).map((x) => x.id), ['pkg-all']);
});

// ------------------------------------------------------------------ swappable slots
const SLOT_SCENARIO = {
  id: 'base',
  steps: [
    { key: 'cover', label: 'Cover', frame: 'cover', answers: [], data: {}, fill: { kind: 'none' } },
    { key: 'problems', label: 'Problems', frame: 'problems', answers: ['pain'], data: {}, fill: { kind: 'blocks', type: 'problem', min: 2, max: 2 } },
    { key: 'why', label: 'Why', frame: 'why', answers: ['pain', 'role'], data: {}, fill: { kind: 'picks', set: 'why' } },
  ],
};
const SOL = { id: 'sol-x', type: 'solution', title: 'Local research', body: '', data: {}, tags: ['pain:unsearchable-archive'] };
const SLOT_BLOCKS = [
  block('pr-1', 'problem', ['pain:confidentiality']),
  { ...block('pr-2', 'problem', []), data: { solutions: ['sol-x'] } },
  block('pr-3', 'problem', ['segment:in-house']),
  SOL,
];
const slotOffer = () => {
  const slides = buildSlides(SLOT_SCENARIO, SEL, { blocks: SLOT_BLOCKS, components: CARDS, slots: { why: 3 } });
  return { slides: slides.map((sl, i) => ({ ...sl, id: `s${i}`, position: i })) };
};
const SLOT_DATA = { blocks: SLOT_BLOCKS, components: CARDS, slots: { why: 3 } };

test('elementTiles: own tiles plus the tiles of linked solutions', () => {
  const byId = Object.fromEntries(SLOT_BLOCKS.map((b) => [b.id, b]));
  assert.deepEqual(elementTiles(SLOT_BLOCKS[1], byId), ['pain:unsearchable-archive']);
  assert.deepEqual(elementTiles(SLOT_BLOCKS[0], byId), ['pain:confidentiality']);
});

test('buildSlots: slots per slide with capacity, what the slide answers, and highlighted candidates', () => {
  const ctx = buildSlots(slotOffer(), SLOT_SCENARIO, SEL, SLOT_DATA);
  assert.deepEqual(ctx.slides.map((s) => s.step), ['cover', 'problems', 'why']);
  const [cover, problems, why] = ctx.slides;
  assert.equal(cover.kind, 'none');
  assert.equal(problems.capacity, 2);
  assert.deepEqual(problems.answers, ['pain']);
  const cand = Object.fromEntries(problems.candidates.map((c) => [c.id, c]));
  assert.deepEqual(Object.keys(cand).sort(), ['pr-1', 'pr-2', 'pr-3'], 'only elements of the slot type');
  assert.deepEqual(cand['pr-1'].matched, ['pain:confidentiality']);
  assert.deepEqual(cand['pr-2'].matched, ['pain:unsearchable-archive'], 'through a linked solution');
  assert.deepEqual(cand['pr-2'].solutions, ['sol-x']);
  assert.deepEqual(cand['pr-3'].matched, [], 'a segment tile does not count on a slide that answers pains');
  assert.equal(cand['pr-3'].fits, false, 'other segment');
  assert.equal(why.capacity, 3);
  assert.ok(why.candidates.some((c) => c.id === 'why/t3-highlight' && c.matched.includes('role:board')));
  assert.deepEqual(ctx.client, [SEL.role, SEL.segment, SEL.product, ...SEL.pains]);
});

test('applySlotChoice: valid choice becomes slide patches with reasons; wrong kind, unknown or too many -> 400', () => {
  const offer = slotOffer();
  const ctx = buildSlots(offer, SLOT_SCENARIO, SEL, SLOT_DATA);
  const patches = applySlotChoice(ctx, [
    { slide_id: 's1', items: [{ id: 'pr-2', reason: 'Client needs local research' }, { id: 'pr-1' }] },
    { slide_id: 's2', items: [{ id: 'why/t1' }] },
  ]);
  assert.deepEqual(patches.s1.block_ids, ['pr-2', 'pr-1']);
  assert.deepEqual(patches.s1.reasons, { 'pr-2': 'Client needs local research' });
  assert.deepEqual(patches.s2.picks, { why: [{ component: 'why/t1' }] });
  const err = (choice) => { try { applySlotChoice(ctx, choice); } catch (e) { return [e.status, e.message]; } return null; };
  assert.equal(err([{ slide_id: 's1', items: [{ id: 'sol-x' }] }])[0], 400, 'a solution is not a problem element');
  assert.match(err([{ slide_id: 's1', items: [{ id: 'nope' }] }])[1], /nope/);
  assert.match(err([{ slide_id: 's1', items: [{ id: 'pr-1' }, { id: 'pr-2' }, { id: 'pr-3' }] }])[1], /2/);
  assert.match(err([{ slide_id: 's0', items: [{ id: 'pr-1' }] }])[1], /no swappable/i);
  assert.match(err([{ slide_id: 'zzz', items: [] }])[1], /zzz/);
});

test('stepData: copy per role over copy per product, and per role and product over both', () => {
  const step = {
    data: { a: 'base', b: 'base', c: 'base' },
    data_by_product: { 'product:saas': { a: 'saas', b: 'saas' } },
    data_by_role: { 'role:board': { b: 'board', c: 'board' } },
    data_by_role_product: { 'role:board': { 'product:saas': { c: 'board saas' } } },
  };
  assert.deepEqual(stepData(step, { role: 'role:champion', product: 'product:saas' }), { a: 'saas', b: 'saas', c: 'base' });
  assert.deepEqual(stepData(step, { role: 'role:board', product: 'product:vault' }), { a: 'base', b: 'board', c: 'board' });
  assert.deepEqual(stepData(step, { role: 'role:board', product: 'product:saas' }), { a: 'saas', b: 'board', c: 'board saas' });
});
