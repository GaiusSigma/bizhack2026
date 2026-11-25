import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { applyContent, contentContext, toLines } from '../src/content.js';
import { buildSlides } from '../src/generate.js';
import { parseTemplate, renderPdf } from '../src/figcraft.js';
import { DECK_TEMPLATE, scenarios } from '../seed/scenarios.js';

const base = scenarios.find((s) => s.id === 'base');
const sel = { role: 'role:champion', segment: 'segment:law-firm', product: 'product:vault', pains: ['pain:research-time'] };
const person = { id: 'person-janusz', type: 'person', title: 'Janusz Marszałek', tags: [], data: {} };
const offerFrom = (slides) => ({
  id: 'o1', data: { client: 'ACME Law', tiles: ['role:champion', 'segment:law-firm', 'product:vault', 'pain:research-time'], scenario_id: 'base' },
  slides: slides.map((s, i) => ({ ...s, id: `s${i}`, position: i })),
});
const fresh = () => offerFrom(buildSlides(base, sel, { blocks: [person] }));

test('a new offer: the comparison slide starts hidden, the rest are shown', () => {
  const offer = fresh();
  assert.deepEqual(offer.slides.filter((s) => s.hidden).map((s) => s.origin.step), ['tool-comparison']);
  assert.deepEqual(offer.slides.find((s) => s.origin.step === 'contact-person').block_ids, ['person-janusz']);
});

test('content context: writable fields per slide, with hints, limits and current values', () => {
  const ctx = contentContext(fresh(), base);
  assert.deepEqual(ctx.slides.map((s) => s.step), ['title', 'starting-point', 'use-areas', 'team-support', 'tool-comparison', 'security', 'preparation', 'add-on-services', 'contact-person']);
  const sp = ctx.slides.find((s) => s.step === 'starting-point');
  assert.equal(sp.fields.lead.kind, 'text');
  assert.equal(sp.fields.areas.kind, 'list');
  assert.equal(sp.fields.areas.current.length, 3);
  assert.deepEqual(Object.keys(sp.fields.areas.current[0]), ['title', 'value']);
  assert.equal(ctx.slides.find((s) => s.step === 'tool-comparison').optional, true);
  // the security features come from product material: only the lead is written
  assert.deepEqual(Object.keys(ctx.slides.find((s) => s.step === 'security').fields), ['lead']);
});

test('applying content: lists become card lines, writing an optional slide shows it', () => {
  const offer = fresh();
  const ctx = contentContext(offer, base);
  const { patches } = applyContent(ctx, {
    slides: {
      'starting-point': { lead: 'ACME Law is a litigation firm.', areas: [{ title: 'Research', value: 'Takes | hours' }, { title: 'Drafting', value: 'Slow\nfirst drafts' }, { title: 'Review', value: 'x' }] },
      'tool-comparison': { tool: 'ChatGPT' },
    },
  });
  const sp = offer.slides.find((s) => s.origin.step === 'starting-point');
  assert.deepEqual(patches[sp.id].data, { lead: 'ACME Law is a litigation firm.', areas: 'Research | Takes / hours\nDrafting | Slow first drafts\nReview | x' });
  const cmp = offer.slides.find((s) => s.origin.step === 'tool-comparison');
  assert.equal(patches[cmp.id].hidden, false);
});

test('applying content: hide works on optional slides only', () => {
  const offer = fresh();
  const ctx = contentContext(offer, base);
  const cmp = offer.slides.find((s) => s.origin.step === 'tool-comparison');
  assert.equal(applyContent(ctx, { slides: { 'tool-comparison': { hide: true } } }).patches[cmp.id].hidden, true);
  assert.throws(() => applyContent(ctx, { slides: { title: { hide: true } } }), /only optional slides/);
});

test('applying content: every problem in one 400, nothing saved', () => {
  const ctx = contentContext(fresh(), base);
  try {
    applyContent(ctx, {
      slides: {
        title: { title: 'x'.repeat(61), subtitle: 'no such field' },
        'starting-point': { areas: [{ title: 'Only one' }] },
        pricing: { lead: 'no such slide' },
        'use-areas': { solutions: [{ title: 'A', value: 'b', effect: 'c' }, { title: '', value: 'b' }, { title: 'C', value: 'd' }] },
      },
    });
    assert.fail('expected a 400');
  } catch (e) {
    assert.equal(e.status, 400);
    for (const part of ['title.title": 61 characters, at most 60', 'title.subtitle": not a field', 'starting-point.areas": 1 items, expected 3–4', '"pricing": this offer has no slide', 'use-areas.solutions[0].effect": unknown column', 'use-areas.solutions[1].title": empty']) {
      assert.ok(e.message.includes(part), `missing: ${part}\n${e.message}`);
    }
  }
});

test('toLines: one line per item, columns in order', () => {
  assert.equal(toLines([{ value2: 'c', title: 'a', value: 'b' }], { title: {}, value: {}, value2: {} }), 'a | b | c');
});

// ------------------------------------------------------------------ rendering (needs figcraft-cli)
const hasCli = (() => {
  try { execFileSync(process.env.FIGCRAFT_CLI || (process.platform === 'win32' ? 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe' : 'figcraft-cli'), ['--version']); return true; } catch { return false; }
})();

test('the 2026 deck renders to a PDF with written copy', { skip: !hasCli && 'figcraft-cli not available' }, async () => {
  const buf = readFileSync(new URL(`../seed/${DECK_TEMPLATE.file}`, import.meta.url));
  const parsed = parseTemplate(buf);
  const offer = fresh();
  const ctx = contentContext(offer, base);
  const { patches } = applyContent(ctx, { slides: { 'tool-comparison': { tool: 'ChatGPT' } } });
  const lines = (t) => String(t || '').split('\n').filter(Boolean).map((l) => {
    const [title, value = '', value2 = ''] = l.split('|').map((x) => x.trim());
    return { title, value, value2 };
  });
  const slides = offer.slides.map((s) => {
    const data = { ...s.data, ...(patches[s.id]?.data || {}) };
    const f = parsed.frames.find((x) => x.name === s.frame);
    const items = Object.fromEntries(f.fields.sources.map((src) => [src, src === 'blocks' ? [{ title: 'Janusz Marszałek', role: 'COO' }] : lines(data[src])]));
    return { id: s.id, frame: s.frame, data, items, picks: {} };
  });
  const pdf = await renderPdf({ templateBuf: buf, parsed, slides, offer: { client: 'ACME Law', product_name: 'Gaius Vault', date: '25.11.2026' } });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, 10);
});

const board = { ...sel, role: 'role:board' };
const offerFor = (s) => {
  const o = offerFrom(buildSlides(base, s, { blocks: [person] }));
  o.data.tiles = [s.role, s.segment, s.product, ...s.pains];
  return o;
};
const copy = (o) => Object.fromEntries(o.slides.map((s) => [s.origin.step, s.data]));

test('role: Board and Champion get different default copy on the slides that answer the role, the same deck', () => {
  for (const product of ['product:vault', 'product:saas', 'product:on-prem']) {
    const ch = offerFor({ ...sel, product });
    const bo = offerFor({ ...board, product });
    assert.deepEqual(bo.slides.map((s) => s.origin.step), ch.slides.map((s) => s.origin.step), 'one core deck for every role');
    const a = copy(ch);
    const b = copy(bo);
    for (const [step, field] of [['title', 'lead'], ['starting-point', 'lead'], ['team-support', 'lead'], ['team-support', 'concerns'], ['preparation', 'lead'], ['preparation', 'steps'], ['contact-person', 'lead']]) {
      assert.notEqual(b[step][field], a[step][field], `${product} ${step}.${field}`);
    }
    // the Champion has to win over the board; the board does not talk to itself
    assert.match(a.preparation.steps, /Talk to the decision makers/);
    assert.doesNotMatch(b.preparation.steps, /Talk to the (decision makers|board)/);
    // facts that depend on the product, not the role, stay the same
    assert.equal(b.security.features, a.security.features);
  }
});

test('role: the content context names the reader and adds per-role guidance to the field hints', () => {
  const tiles = {
    'role:board': { id: 'role:board', label: 'Board', description: 'Signs the budget.', data: { writing_brief: 'Outcome, cost and risk.' } },
  };
  const ctx = contentContext(offerFor(board), base, { tiles });
  assert.deepEqual(ctx.reader, { role: 'role:board', label: 'Board', description: 'Signs the budget.', brief: 'Outcome, cost and risk.' });
  const prep = ctx.slides.find((s) => s.step === 'preparation');
  const general = contentContext(offerFor(sel), base).slides.find((s) => s.step === 'preparation');
  assert.ok(prep.fields.steps.hint.startsWith(base.steps.find((st) => st.key === 'preparation').write.steps.hint));
  assert.match(prep.fields.steps.hint, /For the Board:/);
  assert.match(general.fields.steps.hint, /For the Champion:/);
  // without tile data the reader is still named by its id
  assert.deepEqual(contentContext(offerFor(sel), base).reader, { role: 'role:champion', label: 'Champion', description: '', brief: '' });
});

import { evidencePack } from '../src/content.js';

test('evidence pack: per client pain the fitting solutions and proof from the library, nothing forced', () => {
  const tiles = {
    'pain:a': { id: 'pain:a', label: 'Pain A', description: 'About A', quotes: ['We lose hours on A'] },
    'pain:b': { id: 'pain:b', label: 'Pain B', description: 'About B', quotes: [] },
    'segment:law-firm': { id: 'segment:law-firm', label: 'Law firm', description: 'Firms' },
    'product:saas': { id: 'product:saas', label: 'SaaS', description: 'Cloud' },
    'role:board': { id: 'role:board', label: 'Board' },
  };
  const blocks = [
    { id: 's1', type: 'solution', title: 'Sol 1', body: 'Does A', tags: ['pain:a'], data: { effect: 'A is fast', value: 'Time' } },
    { id: 's2', type: 'solution', title: 'Sol 2', body: 'Does A for firms', tags: ['pain:a', 'segment:law-firm'], data: {} },
    { id: 's3', type: 'solution', title: 'Sol 3', body: 'Does A in-house', tags: ['pain:a', 'segment:in-house'], data: {} },
    { id: 's4', type: 'use_case', title: 'UC', body: 'A case', tags: ['pain:a', 'product:on-prem'], data: {} },
    { id: 'd1', type: 'differentiator', title: 'Diff', body: 'Why us on A', tags: ['pain:a'], data: {} },
    { id: 'c1', type: 'comparison', title: 'Cmp', body: '', tags: ['pain:a'], data: { them: 'chatbots', us: 'private' } },
    { id: 'p1', type: 'person', title: 'Janusz', body: '', tags: ['pain:a'], data: {} },
  ];
  const sel = { role: 'role:board', segment: 'segment:law-firm', product: 'product:saas', pains: ['pain:a', 'pain:b'] };
  const ev = evidencePack(sel, { tiles, blocks });
  assert.deepEqual(ev.segment, { id: 'segment:law-firm', label: 'Law firm', description: 'Firms' });
  assert.deepEqual(ev.product, { id: 'product:saas', label: 'SaaS', description: 'Cloud' });
  const [a, b] = ev.pains;
  assert.equal(a.label, 'Pain A');
  assert.deepEqual(a.typical_quotes, ['We lose hours on A']);
  // the segment match first; another segment and another product never fit
  assert.deepEqual(a.solutions.map((s) => s.id), ['s2', 's1']);
  assert.deepEqual(a.solutions[1], { id: 's1', type: 'solution', title: 'Sol 1', text: 'Does A', effect: 'A is fast', value: 'Time' });
  assert.deepEqual(a.proof.map((p) => p.id), ['d1', 'c1']);
  assert.equal(a.proof[1].text, 'Others: chatbots. Gaius: private');
  // a pain without content says so instead of borrowing another pain's solution
  assert.deepEqual(b.solutions, []);
  assert.deepEqual(b.proof, []);
  assert.equal(b.no_solution, true);
  assert.equal(a.no_solution, undefined);
});

test('evidence pack: at most 3 solutions and 3 proof items per pain', () => {
  const blocks = Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, type: 'solution', title: `S${i}`, body: '', tags: ['pain:a'], data: {} }))
    .concat(Array.from({ length: 5 }, (_, i) => ({ id: `d${i}`, type: 'pillar', title: `D${i}`, body: '', tags: ['pain:a'], data: {} })));
  const ev = evidencePack({ role: 'role:board', segment: 'segment:x', product: 'product:y', pains: ['pain:a'] }, { tiles: {}, blocks });
  assert.deepEqual(ev.pains[0].solutions.map((s) => s.id), ['s0', 's1', 's2']);
  assert.equal(ev.pains[0].proof.length, 3);
  assert.equal(ev.pains[0].label, 'pain:a');
});

test('product: the content context names the product with its brief and adds per-product guidance to hints', () => {
  const tiles = {
    'role:board': { id: 'role:board', label: 'Board', data: {} },
    'product:saas': { id: 'product:saas', label: 'Gaius SaaS', description: 'Cloud.', data: { writing_brief: 'Quick start, trial.' } },
  };
  const ctx = contentContext(offerFor({ ...board, product: 'product:saas' }), base, { tiles });
  assert.deepEqual(ctx.product, { id: 'product:saas', label: 'Gaius SaaS', description: 'Cloud.', brief: 'Quick start, trial.' });
  const contact = ctx.slides.find((s) => s.step === 'contact-person').fields.lead.hint;
  // role first, then product, each named
  assert.ok(contact.indexOf('For the Board:') < contact.indexOf('For Gaius SaaS:'), contact);
  const vault = contentContext(offerFor(board), base).slides.find((s) => s.step === 'contact-person').fields.lead.hint;
  assert.doesNotMatch(vault, /For Gaius SaaS:/);
});

test('evidence pack: a pain with nothing for the segment falls back to a general solution that fits the product', () => {
  const blocks = [
    { id: 'in', type: 'solution', title: 'In-house only', body: '', tags: ['pain:a', 'segment:in-house'], data: {} },
    { id: 'onprem', type: 'solution', title: 'On-prem in-house', body: '', tags: ['pain:a', 'segment:in-house', 'product:on-prem'], data: {} },
  ];
  const ev = evidencePack({ role: 'role:champion', segment: 'segment:law-firm', product: 'product:saas', pains: ['pain:a'] }, { tiles: {}, blocks });
  assert.deepEqual(ev.pains[0].solutions.map((s) => [s.id, s.general]), [['in', true]]);
  assert.equal(ev.pains[0].no_solution, undefined);
  // nothing that fits the product either: still says so
  const none = evidencePack({ role: 'role:champion', segment: 'segment:law-firm', product: 'product:vault', pains: ['pain:a'] }, { tiles: {}, blocks: [blocks[1]] });
  assert.equal(none.pains[0].no_solution, true);
});

import seedAll from '../seed/seed.js';
import { tiles as seedTiles, solutionBlocks as seedSolutions, tileTags as seedTileTags } from '../seed/tiles.js';

test('evidence pack: in the seed library every active pain has an answer for every role, segment and product', () => {
  const blocks = [...new Map([...seedAll.blocks, ...seedSolutions].map((b) => [b.id, { ...b, tags: [...b.tags, ...(seedTileTags[b.id] || [])] }])).values()];
  const act = (c) => seedTiles.filter((t) => t.category === c && t.status === 'active').map((t) => t.id);
  const missing = [];
  for (const role of act('role')) for (const segment of act('segment')) for (const product of act('product')) {
    const ev = evidencePack({ role, segment, product, pains: act('pain') }, { tiles: {}, blocks });
    for (const p of ev.pains) if (p.no_solution) missing.push(`${p.id} x ${segment} x ${product}`);
  }
  assert.deepEqual(missing, []);
});
