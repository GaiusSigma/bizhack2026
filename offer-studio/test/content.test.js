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
