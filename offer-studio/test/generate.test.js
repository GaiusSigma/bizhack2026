import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEIGHTS, buildSlides, coverage, mergeRecompute, parseSelection, pickBlocks, pickCards, score, segmentOk, stepApplies, stepData,
} from '../src/generate.js';

// ------------------------------------------------------------------ atrapy
const T = (id, status = 'active', label = id) => ({ id, category: id.split(':')[0], label, status, data: {} });
const TILES = [
  T('rola:zarzad'), T('rola:champion'), T('rola:cto', 'soon', 'CTO / CIO / CISO'),
  T('segment:kancelaria'), T('segment:in-house'), T('segment:finanse', 'soon'),
  T('produkt:saas'), T('produkt:vault'), T('produkt:on-prem'),
  T('bol:poufnosc'), T('bol:shadow-ai'), T('bol:archiwum'), T('bol:nda'), T('bol:koszt'), T('bol:bez-tresci'),
];
const SEL = { role: 'rola:zarzad', segment: 'segment:kancelaria', product: 'produkt:vault', pains: ['bol:poufnosc', 'bol:archiwum'] };
const block = (id, type, tags) => ({ id, type, title: id, body: '', data: {}, tags });
const BLOCKS = [
  block('rz-a', 'rozwiazanie', ['bol:archiwum']),
  block('rz-b', 'rozwiazanie', ['bol:poufnosc', 'segment:kancelaria']),
  block('rz-c', 'rozwiazanie', ['bol:poufnosc', 'segment:in-house']),
  block('rz-d', 'rozwiazanie', ['bol:nda']),
  block('rz-e', 'rozwiazanie', ['vault']),
  block('uc-a', 'use_case', ['bol:archiwum']),
  block('pr-a', 'problem', ['bol:poufnosc']),
];
const card = (key, topic, variant, tags) => ({ id: `dlaczego/${key}`, set_name: 'dlaczego', key, topic, variant, tags, missing: false });
const cardsFor = (topic, tags, variants = ['zwykla', 'wyroznienie']) =>
  variants.map((v) => card(v === 'zwykla' ? topic : `${topic}-${v}`, topic, v, tags));
const CARDS = [
  ...cardsFor('t1', []),
  ...cardsFor('t2', ['bol:archiwum']),
  ...cardsFor('t3', ['bol:poufnosc', 'rola:zarzad']),
  ...cardsFor('t4', []),
  ...cardsFor('t5', ['produkt:vault']),
  ...cardsFor('t6', []),
  ...cardsFor('t7', []),
  ...cardsFor('t8', ['bol:poufnosc'], ['zwykla', 'wyroznienie', 'liczba']),
  card('t9-liczba', 't9', 'liczba', ['bol:archiwum']),
];
const SCENARIO = {
  id: 'rola:zarzad',
  steps: [
    { key: 'okladka', label: 'Okładka', frame: 'okladka', data: { title: 'Gaius Vault' }, data_by_product: { 'produkt:saas': { title: 'Gaius' } }, fill: { kind: 'none' } },
    { key: 'bole', label: 'Problemy klienta', frame: 'problemy', data: {}, fill: { kind: 'pains' } },
    { key: 'dlaczego', label: 'Dlaczego', frame: 'dlaczego', data: {}, fill: { kind: 'picks', set: 'dlaczego' } },
    { key: 'rozwiazania', label: 'Jak rozwiązujemy', frame: 'use-case', data: {}, fill: { kind: 'blocks', type: 'rozwiazanie', min: 2, max: 3 } },
    { key: 'architektura', label: 'Architektura', frame: 'architektura', data: {}, fill: { kind: 'none' }, when: { any: ['produkt:vault', 'produkt:on-prem'] } },
  ],
};
const DATA = { blocks: BLOCKS, components: CARDS, tiles: TILES, slots: { dlaczego: 6 } };
const status = (fn) => { try { fn(); } catch (e) { return [e.status, e.message]; } return null; };

// ------------------------------------------------------------------ wybór kafelków
test('parseSelection: kafelek wkrótce, nieznany i zła liczba -> 400 z nazwą kafelka', () => {
  const ok = ['rola:zarzad', 'segment:kancelaria', 'produkt:vault', 'bol:poufnosc', 'bol:archiwum'];
  assert.deepEqual(parseSelection(ok, TILES), SEL);
  assert.deepEqual(parseSelection([...ok, 'bol:poufnosc'], TILES), SEL, 'powtórka nie przeszkadza');

  let [st, msg] = status(() => parseSelection([...ok, 'rola:cto'].filter((x) => x !== 'rola:zarzad'), TILES));
  assert.equal(st, 400);
  assert.match(msg, /CTO \/ CIO \/ CISO/);
  assert.match(msg, /wkrótce/);

  [st, msg] = status(() => parseSelection([...ok, 'bol:nie-ma'], TILES));
  assert.equal(st, 400);
  assert.match(msg, /bol:nie-ma/);

  assert.match(status(() => parseSelection(ok.filter((x) => x !== 'rola:zarzad'), TILES))[1], /rol/);
  assert.match(status(() => parseSelection([...ok, 'segment:in-house'], TILES))[1], /segment/);
  assert.match(status(() => parseSelection(ok.filter((x) => x !== 'produkt:vault'), TILES))[1], /produkt/);
  assert.match(status(() => parseSelection(ok.filter((x) => !x.startsWith('bol:')), TILES))[1], /od 1 do 5/);
  assert.match(status(() => parseSelection([...ok, 'bol:shadow-ai', 'bol:nda', 'bol:koszt', 'bol:bez-tresci'], TILES))[1], /od 1 do 5/);
});

// ------------------------------------------------------------------ ocena
test('score: ból 3, segment 2, rola 1, produkt 1; obce tagi (vault, kancelaria) ignorowane', () => {
  assert.deepEqual(WEIGHTS, { bol: 3, segment: 2, rola: 1, produkt: 1 });
  assert.deepEqual(score(['bol:poufnosc', 'segment:kancelaria', 'vault', 'kancelaria'], SEL), { score: 5, matched: ['bol:poufnosc', 'segment:kancelaria'] });
  assert.deepEqual(score(['rola:zarzad', 'produkt:vault', 'bol:shadow-ai', 'bol:usuniety'], SEL), { score: 2, matched: ['rola:zarzad', 'produkt:vault'] });
  assert.equal(segmentOk(['segment:in-house'], SEL), false);
  assert.equal(segmentOk(['segment:in-house', 'segment:kancelaria'], SEL), true);
  assert.equal(segmentOk(['bol:poufnosc'], SEL), true);
});

test('pickBlocks: filtr segmentu, min/max, zera tylko do min, remis wg kolejności wejściowej', () => {
  const rz = BLOCKS.filter((b) => b.type === 'rozwiazanie');
  // rz-b 5 (ból+segment), rz-a 3, rz-c odpada (inny segment), rz-d i rz-e mają 0
  assert.deepEqual(pickBlocks(rz, { min: 2, max: 3 }, SEL), [
    { id: 'rz-b', matched: ['bol:poufnosc', 'segment:kancelaria'] },
    { id: 'rz-a', matched: ['bol:archiwum'] },
  ]);
  assert.deepEqual(pickBlocks(rz, { min: 3, max: 3 }, SEL).map((x) => x.id), ['rz-b', 'rz-a', 'rz-d'], 'zero dobite do min w kolejności wejściowej');
  assert.deepEqual(pickBlocks(rz, { min: 1, max: 1 }, SEL).map((x) => x.id), ['rz-b']);
  const tie = [block('x1', 'rozwiazanie', ['bol:archiwum']), block('x2', 'rozwiazanie', ['bol:archiwum'])];
  assert.deepEqual(pickBlocks(tie, { min: 0, max: 2 }, SEL).map((x) => x.id), ['x1', 'x2']);
});

test('pickCards: 6 różnych tematów, dokładnie jedna wyroznienie (temat z najwyższym wynikiem), max jedna liczba', () => {
  const picks = pickCards(CARDS, 6, SEL);
  assert.equal(picks.length, 6);
  const comp = Object.fromEntries(CARDS.map((c) => [c.id, c]));
  const chosen = picks.map((p) => comp[p.component]);
  assert.equal(new Set(chosen.map((c) => c.topic)).size, 6);
  assert.equal(chosen.filter((c) => c.variant === 'wyroznienie').length, 1);
  assert.ok(chosen.filter((c) => c.variant === 'liczba').length <= 1);
  // t3: ból 3 + rola 1 = 4 -> najwyższy wynik, idzie w wariancie wyróżnionym i jako pierwszy
  assert.equal(picks[0].component, 'dlaczego/t3-wyroznienie');
  assert.deepEqual(picks[0].matched, ['bol:poufnosc', 'rola:zarzad']);
  // t8 ma wariant zwykły, więc liczba nie wchodzi
  assert.ok(!picks.some((p) => p.component === 'dlaczego/t8-liczba'));
  // t9 ma tylko liczbę: wchodzi jako liczba (archiwum = 3)
  assert.ok(picks.some((p) => p.component === 'dlaczego/t9-liczba'));
  assert.deepEqual(pickCards(CARDS, 6, SEL), picks, 'powtarzalnie');
});

// ------------------------------------------------------------------ slajdy
test('buildSlides: architektura tylko przy vault/on-prem; krok pains ma id bólów; data_by_product nadpisuje tytuł', () => {
  const vault = buildSlides(SCENARIO, SEL, DATA);
  assert.deepEqual(vault.map((s) => s.origin.step), ['okladka', 'bole', 'dlaczego', 'rozwiazania', 'architektura']);
  assert.equal(vault[0].data.title, 'Gaius Vault');
  assert.deepEqual(vault[1].block_ids, ['bol:poufnosc', 'bol:archiwum']);
  assert.equal(vault[2].picks.dlaczego.length, 6);
  assert.deepEqual(vault[3].block_ids, ['rz-b', 'rz-a']);
  assert.deepEqual(vault[3].origin.matched['rz-b'], ['bol:poufnosc', 'segment:kancelaria']);
  for (const s of vault) assert.equal(s.locked, false);

  const saas = buildSlides(SCENARIO, { ...SEL, product: 'produkt:saas' }, DATA);
  assert.ok(!saas.some((s) => s.origin.step === 'architektura'));
  assert.equal(saas[0].data.title, 'Gaius');
  assert.equal(stepApplies(SCENARIO.steps[4], { ...SEL, product: 'produkt:on-prem' }), true);
  assert.deepEqual(stepData(SCENARIO.steps[0], { ...SEL, product: 'produkt:saas' }), { title: 'Gaius' });
});

test('buildSlides: te same kafelki dwa razy -> identyczny wynik', () => {
  assert.deepEqual(buildSlides(SCENARIO, SEL, DATA), buildSlides(SCENARIO, SEL, DATA));
});

test('buildSlides: ból bez treści -> slajd rozwiązań i tak ma min bloków, coverage.missing zawiera ten ból', () => {
  const sel = { ...SEL, pains: ['bol:bez-tresci'] };
  const slides = buildSlides(SCENARIO, sel, DATA);
  const rz = slides.find((s) => s.origin.step === 'rozwiazania');
  assert.equal(rz.block_ids.length, 2);
  const byId = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));
  assert.deepEqual(coverage(slides, sel.pains, byId), { covered: [], missing: ['bol:bez-tresci'] });
});

test('coverage: blok problem i karty nie liczą się, ukryty rozwiazanie nie liczy się', () => {
  const byId = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));
  const slides = [
    { hidden: false, block_ids: ['pr-a'], picks: { dlaczego: [{ component: 'dlaczego/t3' }] } },
    { hidden: true, block_ids: ['rz-b'] },
    { hidden: false, block_ids: ['uc-a', 'bol:poufnosc'] },
  ];
  assert.deepEqual(coverage(slides, ['bol:poufnosc', 'bol:archiwum'], byId), { covered: ['bol:archiwum'], missing: ['bol:poufnosc'] });
});

// ------------------------------------------------------------------ przeliczanie
const saved = (fresh) => fresh.map((s, i) => ({ ...s, id: `s${i}`, position: i }));

test('mergeRecompute: zablokowany zostaje bit w bit, zablokowany nieobowiązujący -> hide, ręczny bez origin za poprzednikiem', () => {
  const existing = saved(buildSlides(SCENARIO, SEL, DATA));
  existing[3] = { ...existing[3], locked: true, block_ids: ['rz-d'] }; // rozwiązania poprawione ręcznie
  existing[4] = { ...existing[4], locked: true }; // architektura poprawiona ręcznie
  existing.splice(2, 0, { id: 'manual', position: 2, frame: 'kontakt', data: {}, block_ids: [], picks: {}, origin: null, locked: true, hidden: false });

  const fresh = buildSlides(SCENARIO, { ...SEL, product: 'produkt:saas', pains: ['bol:archiwum'] }, DATA);
  const plan = mergeRecompute(existing, fresh);
  const kept = Object.fromEntries(plan.keep.map((s) => [s.id, s]));
  assert.deepEqual(kept.s3, existing.find((s) => s.id === 's3'), 'zablokowany bit w bit');
  assert.deepEqual(plan.hide, ['s4'], 'architektura nie obowiązuje przy SaaS');
  assert.ok(kept.manual);
  assert.ok(plan.remove.includes('s1'), 'bóle się zmieniły, slajd automatyczny do wymiany');
  assert.ok(!plan.remove.includes('s3') && !plan.remove.includes('manual'));
  // kolejność: okładka, (nowe bóle), ręczny za poprzednikiem z dawnej kolejności, dlaczego, rozwiązania (zablokowany), architektura (ukryta) za poprzednikiem
  const order = plan.order.map((x) => (typeof x === 'string' ? x : fresh[x.create].origin.step));
  assert.equal(order.indexOf('manual'), order.indexOf('bole') + 1);
  assert.equal(order.indexOf('s3'), order.indexOf('dlaczego') + 1);
  assert.equal(order.indexOf('s4'), order.indexOf('s3') + 1);
});

test('mergeRecompute: dwa przeliczenia z rzędu bez zmian -> brak create/remove w drugim', () => {
  const existing = saved(buildSlides(SCENARIO, SEL, DATA));
  const plan = mergeRecompute(existing, buildSlides(SCENARIO, SEL, DATA));
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.remove, []);
  assert.deepEqual(plan.hide, []);
  assert.deepEqual(plan.order, existing.map((s) => s.id));
});

test('mergeRecompute: slajd ukryty przez przeliczenie wraca, gdy jego krok znowu obowiązuje; ukryty ręcznie nie', () => {
  const vault = saved(buildSlides(SCENARIO, SEL, DATA));
  vault[4] = { ...vault[4], locked: true }; // architektura poprawiona ręcznie
  const saas = buildSlides(SCENARIO, { ...SEL, product: 'produkt:saas' }, DATA);
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
