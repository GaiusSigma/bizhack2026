import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { openDb } from '../src/db.js';
import { unzipSync } from 'fflate';
import { buildLibrary, describeComponents, normalizeUpload, parseMarks, parseTemplate, renderFigcraft, renderPdf, renderThumbnails } from '../src/figcraft.js';
import seed, { TEMPLATE, components as seedComponents, slides as seedSlides } from '../seed/seed.js';
import { legacyPl } from '../seed/legacy-pl.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEMPLATE_FILE = readFileSync(new URL(`../seed/${TEMPLATE.file}`, import.meta.url));

const fresh = () => {
  const s = openDb(':memory:');
  s.importAll(seed, 'merge');
  s.putTemplate({ id: TEMPLATE.id, name: TEMPLATE.name, file: TEMPLATE_FILE });
  return s;
};

test('template: every base-offer slide exists in the template and has its fields', () => {
  const parsed = parseTemplate(TEMPLATE_FILE);
  const frames = Object.fromEntries(parsed.frames.map((f) => [f.name, f]));
  for (const s of seedSlides) {
    const f = frames[s.frame];
    assert.ok(f, `missing slide ${s.frame}`);
    for (const key of Object.keys(s.data)) assert.ok(f.fields.data.includes(key), `${s.frame}: template has no data.${key} field`);
  }
  assert.equal(frames['use-case'].slots.length, 6);
  assert.deepEqual(frames.pricing.fields.sources.sort(), ['blocks', 'lines']);
});

test('highlights: **x** and [[k:x]] produce style ranges', () => {
  assert.deepEqual(parseMarks('Where **time** goes'), { text: 'Where time goes', ranges: [{ start: 6, end: 10, run: 1 }] });
  assert.deepEqual(parseMarks('[[1:12,000 PLN]] [[2:/ month]]'), {
    text: '12,000 PLN / month',
    ranges: [{ start: 0, end: 10, run: 1 }, { start: 11, end: 18, run: 2 }],
  });
});

test('PATCH merges data, and null removes a key', () => {
  const s = fresh();
  const { effect } = seed.blocks.find((b) => b.id === 'uc-urgent-letter').data;
  assert.ok(effect);
  s.update('blocks', 'uc-urgent-letter', { data: { extra: 'x' } });
  assert.deepEqual(s.get('blocks', 'uc-urgent-letter').data, { effect, extra: 'x' });
  s.update('blocks', 'uc-urgent-letter', { data: { extra: null } });
  assert.deepEqual(Object.keys(s.get('blocks', 'uc-urgent-letter').data), ['effect']);
  s.update('blocks', 'uc-urgent-letter', { data: { only: 1 } }, { replaceData: true });
  assert.deepEqual(s.get('blocks', 'uc-urgent-letter').data, { only: 1 });
});

test('export -> import replace restores the database 1:1 (with the template file)', () => {
  const a = fresh();
  const dump = JSON.parse(JSON.stringify(a.exportAll()));
  const b = openDb(':memory:');
  b.insert('blocks', { id: 'to-delete', type: 'x', title: 'x' });
  const counts = b.importAll(dump, 'replace');
  assert.equal(counts.blocks, seed.blocks.length);
  assert.equal(counts.templates, 1);
  assert.equal(b.get('blocks', 'to-delete'), undefined);
  assert.ok(b.templateFile('gaius').file.equals(TEMPLATE_FILE));
  const again = JSON.parse(JSON.stringify(b.exportAll()));
  for (const k of ['blocks', 'templates', 'offers', 'slides']) assert.deepEqual(again[k], dump[k], k);
});

test('import merge does not delete the offer\'s slides (no cascade)', () => {
  const s = fresh();
  s.importAll({ format: 'offer-studio', version: 2, offers: [{ id: 'gaius-vault-base', name: 'New name', template_id: 'gaius', data: {} }] }, 'merge');
  const o = s.getOffer('gaius-vault-base');
  assert.equal(o.name, 'New name');
  assert.equal(o.slides.length, 11);
});

test('slide order, insertion at a position and offer duplicate', () => {
  const s = fresh();
  const ids = s.getOffer('gaius-vault-base').slides.map((x) => x.id);
  s.reorderSlides('gaius-vault-base', [...ids].reverse());
  assert.equal(s.getOffer('gaius-vault-base').slides[0].id, ids.at(-1));
  const added = s.addSlide('gaius-vault-base', { frame: 'cover', data: {}, position: 1 });
  assert.equal(s.getOffer('gaius-vault-base').slides[1].id, added.id);
  assert.throws(() => s.reorderSlides('gaius-vault-base', ids), /all slides/);
  const copy = s.duplicateOffer('gaius-vault-base');
  assert.equal(copy.slides.length, 12);
  assert.equal(copy.template_id, 'gaius');
  s.remove('offers', 'gaius-vault-base');
  assert.equal(s.list('slides', 'offer_id = :id', { id: 'gaius-vault-base' }).length, 0);
});

test('migration from v1: layout_id -> frame, old tables are dropped', () => {
  const dir = mkdtempSync(join(tmpdir(), 'os-mig-'));
  const path = join(dir, 'v1.db');
  const old = new DatabaseSync(path);
  old.exec(`CREATE TABLE offers (id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE slides (id TEXT PRIMARY KEY, offer_id TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, layout_id TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', block_ids TEXT NOT NULL DEFAULT '[]', query TEXT, hidden INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE layouts (id TEXT PRIMARY KEY); CREATE TABLE assets (id TEXT PRIMARY KEY); CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO offers VALUES ('o', 'O', '{}', 't', 't'); INSERT INTO slides (id, offer_id, layout_id, created_at, updated_at) VALUES ('s', 'o', 'cards', 't', 't');`);
  old.close();
  const s = openDb(path);
  assert.equal(s.migratedFromV1, true);
  assert.equal(s.getOffer('o').slides[0].frame, 'cards');
  assert.equal(s.getOffer('o').template_id, null);
  assert.equal(s.db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('layouts','assets','settings')").get().n, 0);
  assert.equal(openDb(path).migratedFromV1, false);
});

test('components: the @why set is not a slide, the slide has 6 #pick slots, the seed describes every card', () => {
  const parsed = parseTemplate(TEMPLATE_FILE);
  assert.ok(!parsed.frames.some((f) => f.name.startsWith('@')));
  const why = parsed.frames.find((f) => f.name === 'why');
  assert.deepEqual(why.fields.picks, { why: 6 });
  assert.equal(why.slots.length, 0);
  assert.ok(!why.texts.length || why.texts.every((t) => t.name.startsWith('{{data.')), 'texts from #pick cards are not slide fields');
  const ids = parsed.components.map((c) => c.id).sort();
  assert.deepEqual(ids, seedComponents.map((c) => c.id).sort());
  const stat = parsed.components.find((c) => c.id === 'why/pilot-3-months');
  assert.deepEqual(stat.fields.sort(), ['body', 'stat', 'title']);
  assert.match(stat.text, /3[\s-]*mo/i);
  for (const s of seedSlides) for (const [, picks] of Object.entries(s.picks || {})) for (const p of picks) assert.ok(ids.includes(p.component), p.component);
});

test('components: sync keeps descriptions, refreshes text and marks missing cards', () => {
  const s = fresh();
  const found = describeComponents(parseTemplate(TEMPLATE_FILE)).map((c) => ({ ...c, source: TEMPLATE.id }));
  const useWhen = seedComponents.find((c) => c.id === 'why/on-premise').use_when;
  assert.ok(useWhen);
  const first = s.syncComponents(found);
  assert.deepEqual(first.added, []);
  const row = s.get('components', 'why/on-premise');
  assert.equal(row.use_when, useWhen);
  assert.equal(row.figma_text, found.find((c) => c.id === 'why/on-premise').text);
  assert.ok(row.figma_text);
  assert.deepEqual(row.fields, ['title', 'body']);
  const again = s.syncComponents([...found.filter((c) => c.id !== 'why/on-premise'), { ...found[0], id: 'why/new-card', key: 'new-card' }]);
  assert.deepEqual(again, { added: ['why/new-card'], missing: ['why/on-premise'] });
  assert.equal(s.listComponents({ set: 'why' }).some((c) => c.id === 'why/on-premise'), false);
  assert.equal(s.get('components', 'why/on-premise').use_when, useWhen);
  s.syncComponents(found);
  assert.equal(s.get('components', 'why/on-premise').missing, false);
  assert.throws(() => s.insert('components', { id: 'Bad Id', set_name: 'x', key: 'x' }), /Invalid id/);
});

test('migration from v2: slides get picks, component tables are added', () => {
  const dir = mkdtempSync(join(tmpdir(), 'os-mig2-'));
  const path = join(dir, 'v2.db');
  const old = new DatabaseSync(path);
  old.exec(`CREATE TABLE offers (id TEXT PRIMARY KEY, name TEXT NOT NULL, template_id TEXT, data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE slides (id TEXT PRIMARY KEY, offer_id TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, frame TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', block_ids TEXT NOT NULL DEFAULT '[]', query TEXT, hidden INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO offers VALUES ('o', 'O', 'gaius', '{}', 't', 't'); INSERT INTO slides (id, offer_id, frame, created_at, updated_at) VALUES ('s', 'o', 'why', 't', 't');
    PRAGMA user_version = 2;`);
  old.close();
  const s = openDb(path);
  assert.equal(s.migratedFrom, 2);
  assert.deepEqual(s.get('slides', 's').picks, {});
  assert.deepEqual(s.list('components'), []);
  s.update('slides', 's', { picks: { why: [{ component: 'why/on-premise' }] } });
  assert.equal(s.get('slides', 's').picks.why[0].component, 'why/on-premise');
  assert.equal(openDb(path).migratedFrom, 0);
});

test('AI: schema with card ids and fields, response clean-up (mock client)', async () => {
  const s = fresh();
  s.syncComponents(describeComponents(parseTemplate(TEMPLATE_FILE)).map((c) => ({ ...c, source: TEMPLATE.id })));
  const components = s.listComponents({ set: 'why' });
  let request;
  const api = { beta: { messages: { parse: async (params) => {
    request = params;
    return {
      stop_reason: 'end_turn', model: params.model, usage: {},
      parsed_output: { note: 'bank', sets: [{ set: 'why', picks: [
        { component: 'why/on-premise-highlight', reason: 'regulated', title: 'On-premise at the bank', body: null, stat: null },
        { component: 'why/on-premise-highlight', reason: 'duplicate', title: null, body: null, stat: null },
        ...['private-legal-ai', 'sourced-answers', 'rollout-routine', 'safe-start', 'one-service', 'no-lock-in']
          .map((k) => ({ component: `why/${k}`, reason: 'x', title: null, body: '', stat: null })),
      ] }] },
    };
  } } } };
  const { pickComponents } = await import('../src/ai.js');
  const r = await pickComponents({ api, offer: { name: 'O', data: { client: 'Bank' } }, slide: { frame: 'why', data: {} }, brief: 'bank', sets: [{ set: 'why', slots: 6, rules: 'r', components }] });
  const schema = request.output_config.format.schema;
  assert.ok(JSON.stringify(schema).includes('why/pilot-3-months'), 'card ids in the schema');
  assert.ok(JSON.stringify(schema).includes('"stat"'), 'card fields in the schema');
  assert.match(request.messages[0].content, /Bank/);
  assert.equal(r.picks.why.length, 6);
  assert.deepEqual(r.picks.why[0], { component: 'why/on-premise-highlight', reason: 'regulated', data: { title: 'On-premise at the bank' } });
  assert.equal(r.picks.why.filter((p) => p.component === 'why/on-premise-highlight').length, 1);
  assert.ok(r.warnings.some((w) => /extras dropped/.test(w)));
});

test('AI: lead analysis passes text and hints, trims concerns to 3 (mock client)', async () => {
  let request;
  const api = { beta: { messages: { parse: async (params) => {
    request = params;
    return {
      stop_reason: 'end_turn', model: params.model, usage: {},
      parsed_output: { segment: 'law-firm', role: null, product: null, pains: ['pain:a', 'pain:a', 'pain:b'], client: 'Firm X', person: null, country: 'PL', concerns: ['a', 'b', 'c', 'd'], summary: 's' },
    };
  } } } };
  const { analyzeLead } = await import('../src/ai.js');
  const catalog = { pains: [{ id: 'pain:a', label: 'A' }, { id: 'pain:b', label: 'B' }], products: [{ id: 'product:vault', label: 'Vault' }] };
  const r = await analyzeLead({ api, text: 'Partner at Firm X', hints: { segment: 'law-firm' }, catalog });
  const schema = JSON.stringify(request.output_config.format.schema);
  for (const v of ['law-firm', 'in-house', 'public-sector', 'champion', 'board', 'pain:a', 'product:vault']) assert.ok(schema.includes(v), v);
  assert.match(request.messages[0].content, /Partner at Firm X/);
  assert.match(request.messages[0].content, /"segment":"law-firm"/);
  assert.equal(r.role, null);
  assert.deepEqual(r.concerns, ['a', 'b', 'c']);
  assert.deepEqual(r.pains, ['pain:a', 'pain:b']);
});

test('AI: lead analysis turns a refusal into a 502', async () => {
  const api = { beta: { messages: { parse: async () => ({ stop_reason: 'refusal', parsed_output: null }) } } };
  const { analyzeLead } = await import('../src/ai.js');
  await assert.rejects(analyzeLead({ api, text: 'x' }), (e) => e.status === 502);
});

// Render with the real figcraft-cli if available (locally from the FigCraft install, in Docker from the image).
const cli = process.env.FIGCRAFT_CLI || (process.platform === 'win32' ? 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe' : 'figcraft-cli');
let hasCli = true;
try { execFileSync(cli, ['--version'], { stdio: 'ignore' }); } catch { hasCli = false; }

test('PDF render with figcraft-cli: extra and hidden cards', { skip: !hasCli && 'no figcraft-cli' }, async () => {
  const parsed = parseTemplate(TEMPLATE_FILE);
  const card = (i) => ({ title: `Card ${i}`, body: `Description ${i}`, effect: `effect ${i}` });
  const pdf = await renderPdf({
    templateBuf: TEMPLATE_FILE,
    parsed,
    offer: { client: 'ACME', price: '1 000' },
    slides: [
      { frame: 'use-case', data: { title: 'Eight cards', lead: '' }, items: { blocks: Array.from({ length: 8 }, (_, i) => card(i + 1)) } },
      { frame: 'what-is', data: { title: 'Two ', title_accent: 'cards' }, items: { blocks: [card(1), card(2)] } },
    ],
  });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 2);
});

// Minimal FigCraft JSON document with one page and one slide (this is what "JSON per page" looks like).
const caseJson = {
  format: 'figcraft', version: 1, name: 'case', pages: [1], next_id: 5, current_page: 1, imageIndex: [],
  styles: [], variables: { collections: [], variables: [] }, document_colors: [], comments: [],
  nodes: {
    1: { id: 1, name: 'Page 1', type: 'page', children: [2], width: 0, height: 0 },
    2: { id: 2, name: 'case-study', type: 'frame', parent: 1, children: [3], width: 1920, height: 1080,
      fills: [{ type: 'solid', color: { r: 0.11, g: 0.12, b: 0.13, a: 1 }, opacity: 1, visible: true, blend: 'normal' }] },
    3: { id: 3, name: '{{data.title}}', type: 'text', parent: 2, characters: 'Title', width: 1200, height: 100,
      transform: [1, 0, 0, 1, 100, 100], auto_resize: 'height',
      style: { font_family: 'Inter', font_style: 'Regular', font_size: 64, line_height: { unit: 'auto' }, letter_spacing: { unit: 'percent', value: 0 }, decoration: 'none', case: 'original', fills: null, link: null },
      fills: [{ type: 'solid', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true, blend: 'normal' }] },
  },
};

test('library: page JSON + template -> one PDF with slides from both files', { skip: !hasCli && 'no figcraft-cli' }, async () => {
  const caseFile = await normalizeUpload(Buffer.from(JSON.stringify(caseJson)), 'case.json');
  const caseParsed = parseTemplate(caseFile);
  assert.deepEqual(caseParsed.frames.map((f) => [f.name, f.fields.data]), [['case-study', ['title']]]);

  const thumbs = await renderThumbnails(caseFile, caseParsed);
  assert.equal(thumbs['case-study'].subarray(1, 4).toString(), 'PNG');

  const lib = await buildLibrary([{ file: TEMPLATE_FILE }, { file: caseFile }]);
  assert.equal(lib.parsed.pages.length, parseTemplate(TEMPLATE_FILE).pages.length + 1);
  assert.equal(lib.parsed.components.length, parseTemplate(TEMPLATE_FILE).components.length);
  assert.ok(lib.parsed.frames.some((f) => f.name === 'case-study'));
  const pdf = await renderPdf({
    templateBuf: lib.buf,
    parsed: lib.parsed,
    offer: { client: 'ACME' },
    slides: [
      { frame: 'cover', data: { title: 'Gaius Vault' }, items: {} },
      { frame: 'case-study', data: { title: 'Case study: ACME' }, items: {} },
    ],
  });
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 2);
});

test('render: picked components replace #pick slots in order, with overridden text', { skip: !hasCli && 'no figcraft-cli' }, async () => {
  const parsed = parseTemplate(TEMPLATE_FILE);
  const comp = (k) => parsed.components.find((c) => c.id === `why/${k}`);
  const keys = ['on-premise', 'pilot-3-months', 'one-service-highlight'];
  const file = await renderFigcraft({
    templateBuf: TEMPLATE_FILE,
    parsed,
    offer: {},
    slides: [{ frame: 'why', data: { title: 'Why ', title_accent: 'Vault?' }, items: {},
      picks: { why: keys.map((k) => ({ comp: comp(k), data: k === 'on-premise' ? { title: 'On-premise at ACME' } : {} })) } }],
  });
  const doc = JSON.parse(Buffer.from(unzipSync(new Uint8Array(file))['document.json']).toString('utf8'));
  const nodes = Object.values(doc.nodes);
  assert.equal(nodes.filter((n) => n.name === '#pick:why').length, 0, 'slots are removed');
  assert.ok(!nodes.some((n) => n.name?.startsWith('@')), 'the component set does not end up in the offer');
  const grid = nodes.find((n) => n.name === 'Frame 62');
  assert.deepEqual(grid.children.map((id) => doc.nodes[String(id)].name), keys);
  const onPrem = doc.nodes[String(grid.children[0])];
  const texts = [];
  const walk = (id) => { const n = doc.nodes[String(id)]; if (n.type === 'text') texts.push(n.characters); (n.children || []).forEach(walk); };
  walk(onPrem.id);
  assert.ok(texts.includes('On-premise at ACME'));
  const drawn = comp('on-premise').text;
  assert.ok(texts.some((t) => t && t !== 'On-premise at ACME' && t.length > 20 && drawn.includes(t.trim())), 'a field without an override keeps the FigCraft text');
});

test('an unsupported file format is rejected', async () => {
  await assert.rejects(normalizeUpload(Buffer.from('x'), 'notes.txt'), /Unsupported file/);
});

// ------------------------------------------------------------------ v4: kafelki i scenariusze
const tileFree = () => ({
  ...seed,
  tiles: undefined,
  scenarios: undefined,
  blocks: seed.blocks.filter((b) => b.type !== 'solution').map((b) => {
    const { order: _o, ...data } = b.data;
    return { ...b, data, tags: b.tags.filter((t) => !t.includes(':')) };
  }),
  components: seed.components.map((c) => ({ ...c, tags: c.tags.filter((t) => !t.includes(':')) })),
});

test('v4: a v3 database from the volume gets tiles and the base offer survives', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'studio-')), 'v3.db');
  const a = openDb(path);
  a.importAll(tileFree(), 'merge');
  a.db.exec('DROP TABLE tiles; DROP TABLE scenarios; ALTER TABLE slides DROP COLUMN origin; ALTER TABLE slides DROP COLUMN locked; PRAGMA user_version = 3');
  a.db.close();

  const b = openDb(path);
  assert.equal(b.db.prepare('PRAGMA user_version').get().user_version, 5);
  const cols = b.db.prepare('PRAGMA table_info(slides)').all().map((c) => c.name);
  assert.ok(cols.includes('origin') && cols.includes('locked'));
  assert.equal(b.getOffer('gaius-vault-base').slides.length, 11);
  assert.equal(b.getOffer('gaius-vault-base').slides[0].locked, false);

  const first = b.ensureTiles(seed);
  assert.equal(first.tiles, seed.tiles.length);
  assert.equal(first.blocks, seed.solutionBlocks.length);
  assert.ok(first.tagged > 0);
  assert.deepEqual(b.ensureTiles(seed), { tiles: 0, scenarios: 0, blocks: 0, tagged: 0 });

  const tags = b.get('blocks', 'uc-urgent-letter').tags;
  assert.deepEqual(tags, [...new Set(tags)], 'powtórzone tagi');
  assert.ok(tags.includes('legal-dept'), 'stary tag zniknął');
  for (const t of seed.tileTags['uc-urgent-letter']) assert.ok(tags.includes(t), t);
  assert.ok(b.get('components', 'why/on-premise').tags.includes('product:on-prem'));
  // rollout steps get their order from the seed (the generator picks them in this order)
  assert.deepEqual(['st-processes', 'st-real-matters', 'st-routines', 'st-verification', 'st-adoption'].map((id) => b.get('blocks', id).data.order), [0, 1, 2, 3, 4]);
});

test('tiles: invalid ids rejected (400)', () => {
  const s = openDb(':memory:');
  for (const id of ['color:green', 'pain:Bad', 'poufnosc']) {
    assert.throws(() => s.insert('tiles', { id, category: 'pain', label: 'x', status: 'active' }), (e) => e.status === 400, id);
  }
  assert.throws(() => s.insert('scenarios', { id: 'pain:confidentiality', name: 'x', steps: [] }), (e) => e.status === 400);
  const t = s.insert('tiles', { id: 'pain:test', category: 'pain', label: 'Test', status: 'active', quotes: ['a'] });
  assert.deepEqual(t.quotes, ['a']);
});

test('export v4 -> import replace restores tiles and scenarios', () => {
  const a = fresh();
  a.update('scenarios', 'base', { steps: [{ key: 'okladka', frame: 'okladka', fill: { kind: 'none' } }] });
  const dump = JSON.parse(JSON.stringify(a.exportAll()));
  assert.equal(dump.version, 4);
  assert.equal(dump.tiles.length, seed.tiles.length);
  const b = openDb(':memory:');
  const counts = b.importAll(dump, 'replace');
  assert.equal(counts.tiles, seed.tiles.length);
  assert.equal(counts.scenarios, seed.scenarios.length);
  assert.deepEqual(b.list('tiles'), a.list('tiles'));
  assert.deepEqual(b.get('scenarios', 'base').steps[0].fill, { kind: 'none' });
});

test('applyRecompute: creates, hides and orders slides in one transaction, leaves locked alone', () => {
  const s = openDb(':memory:');
  s.insert('offers', { id: 'o1', name: 'O1', data: {} });
  const locked = s.addSlide('o1', { frame: 'architektura', data: { a: 1 }, origin: { step: 'architektura', matched: {} }, locked: true });
  const auto = s.addSlide('o1', { frame: 'okladka', data: {}, origin: { step: 'okladka', matched: {} } });
  const created = { frame: 'okladka', data: { title: 'Nowa' }, block_ids: [], picks: {}, hidden: false, locked: false, origin: { step: 'okladka', label: 'Okładka', matched: {} } };
  const o = s.applyRecompute('o1', { keep: [locked], create: [created], remove: [auto.id], hide: [locked.id], order: [{ create: 0 }, locked.id] });
  assert.equal(o.slides.length, 2);
  assert.equal(o.slides[0].data.title, 'Nowa');
  assert.deepEqual(o.slides[0].origin, created.origin);
  assert.equal(o.slides[0].locked, false);
  assert.equal(o.slides[1].id, locked.id);
  assert.equal(o.slides[1].hidden, true);
  assert.equal(o.slides[1].locked, true);
  assert.deepEqual(o.slides[1].data, { a: 1 });
  assert.equal(s.get('slides', auto.id), undefined);
});

test('applyRecompute: hide sets origin.auto_hidden, unhide shows the slide and clears the marker', () => {
  const s = openDb(':memory:');
  s.insert('offers', { id: 'o2', name: 'O2', data: {} });
  const a = s.addSlide('o2', { frame: 'architektura', data: {}, origin: { step: 'architektura', matched: {} }, locked: true });
  let o = s.applyRecompute('o2', { hide: [a.id], order: [a.id] });
  assert.equal(o.slides[0].hidden, true);
  assert.equal(o.slides[0].origin.auto_hidden, true);
  o = s.applyRecompute('o2', { unhide: [a.id], order: [a.id] });
  assert.equal(o.slides[0].hidden, false);
  assert.equal(o.slides[0].origin.auto_hidden, undefined);
  assert.equal(o.slides[0].locked, true);
});

test('tx: a nested transaction works, and an error inside rolls everything back', () => {
  const s = openDb(':memory:');
  s.insert('offers', { id: 'o3', name: 'przed', data: {} });
  s.tx(() => s.tx(() => s.update('offers', 'o3', { name: 'w środku' })));
  assert.equal(s.get('offers', 'o3').name, 'w środku');
  assert.throws(() => s.tx(() => {
    s.update('offers', 'o3', { name: 'zewnętrzna' });
    s.tx(() => { throw new Error('boom'); });
  }), /boom/);
  assert.equal(s.get('offers', 'o3').name, 'w środku');
});

test('tile content update: a database seeded with revision 1 gets the new solutions, pins and guidance once', () => {
  const s = openDb(':memory:');
  s.importAll(seed, 'merge');
  s.ensureTiles(seed);
  // simulate revision 1: no new solutions, old pins, no guidance, old description, a description edited by hand
  for (const id of ['sol-private-vault', 'sol-word-review']) s.remove('blocks', id);
  s.update('blocks', 'sol-nda-review', { tags: ['pain:repetitive-documents', 'custom-tag'] });
  s.update('tiles', 'pain:shadow-ai', { data: { pick_when: null, avoid_when: null } });
  s.update('tiles', 'segment:law-firm', { description: seed.tileUpgrade.previousDescriptions['segment:law-firm'] });
  s.update('tiles', 'role:board', { description: 'Our own wording' });
  s.update('tiles', 'role:champion', { data: { writing_brief: null } });
  s.update('tiles', 'role:cto', { data: { writing_brief: 'Our own brief' } });
  s.setSetting('tile_content_rev', '1');

  const counts = s.ensureTiles(seed);
  assert.equal(counts.blocks, 2);
  assert.ok(s.get('blocks', 'sol-private-vault'));
  const nda = s.get('blocks', 'sol-nda-review').tags;
  assert.ok(nda.includes('custom-tag'), 'plain tags are kept');
  assert.deepEqual(nda.filter((t) => t.includes(':')).sort(), seed.solutionBlocks.find((b) => b.id === 'sol-nda-review').tags.slice().sort());
  assert.ok(s.get('tiles', 'pain:shadow-ai').data.pick_when.length > 20);
  assert.equal(s.get('tiles', 'segment:law-firm').description, seed.tiles.find((t) => t.id === 'segment:law-firm').description);
  assert.equal(s.get('tiles', 'role:board').description, 'Our own wording', 'a description edited by hand stays');
  assert.equal(s.get('tiles', 'role:champion').data.writing_brief, seed.tiles.find((t) => t.id === 'role:champion').data.writing_brief);
  assert.equal(s.get('tiles', 'role:cto').data.writing_brief, 'Our own brief', 'a brief edited by hand stays');
  assert.equal(s.getSetting('tile_content_rev'), String(seed.tileUpgrade.rev));
  assert.deepEqual(s.ensureTiles(seed), { tiles: 0, scenarios: 0, blocks: 0, tagged: 0 }, 'second run changes nothing');
});

test('tile content update: generated sources are refreshed, sources written by hand stay', () => {
  const s = openDb(':memory:');
  s.importAll(seed, 'merge');
  s.ensureTiles(seed);
  s.update('blocks', 'sol-private-vault', { data: { source: 'Sales sheet: "Gaius Vault to wewnętrzne AI…"' } });
  s.update('blocks', 'sol-it-brief', { data: { source: 'Confirmed by Witek on the call' } });
  s.setSetting('tile_content_rev', String(seed.tileUpgrade.rev - 1));
  s.ensureTiles(seed);
  assert.equal(s.get('blocks', 'sol-private-vault').data.source, seed.solutionBlocks.find((b) => b.id === 'sol-private-vault').data.source);
  assert.equal(s.get('blocks', 'sol-it-brief').data.source, 'Confirmed by Witek on the call');
});

// ------------------------------------------------------------------ legacy Polish databases
const legacyDb = () => {
  const s = openDb(':memory:');
  const ts = '2026-11-25T00:00:00.000Z';
  for (const b of legacyPl.blocks) s.upsert('blocks', { id: b.id, type: b.type, title: b.title, body: b.body, data: b.data, tags: ['vault'], created_at: ts, updated_at: ts });
  s.upsert('component_sets', { id: 'dlaczego', title: 'Dlaczego Vault? (6 kart)', rules: 'Dokładnie 6 kart.' });
  for (const c of legacyPl.components) s.upsert('components', { id: c.id, set_name: 'dlaczego', key: c.id.split('/')[1], title: c.title, description: c.description, use_when: c.use_when, avoid_when: c.avoid_when, created_at: ts, updated_at: ts });
  s.upsert('offers', { id: 'gaius-vault-bazowa', name: 'Gaius Vault – oferta bazowa', data: { client: '', price: '------' } });
  legacyPl.slides.forEach((sl, i) => s.upsert('slides', { id: sl.id, offer_id: 'gaius-vault-bazowa', position: i, frame: sl.frame, data: sl.data, block_ids: [], picks: {} }));
  s.upsert('offers', { id: 'moja-oferta', name: 'Oferta dla ACME', data: { client: 'ACME' } });
  s.upsert('slides', { id: 'm1', offer_id: 'moja-oferta', position: 0, frame: 'problemy', data: legacyPl.slides[1].data, block_ids: ['pr-research-od-nowa', 'pr-ai-bez-zasad'], picks: {} });
  s.upsert('slides', { id: 'm2', offer_id: 'moja-oferta', position: 1, frame: 'dlaczego', data: { title: 'Dlaczego my, ACME?' }, picks: { dlaczego: [{ component: 'dlaczego/on-premise' }] } });
  s.upsert('blocks', { ...s.get('blocks', 'uc-pilne-pismo'), body: 'Zmienione ręcznie przez zespół.' });
  return s;
};

test('legacy migration: a Polish database becomes English, references follow, a backup keeps everything', () => {
  const s = legacyDb();
  const before = JSON.stringify(s.exportAll());
  const report = s.migrateLegacyPolish(legacyPl, seed);

  const english = Object.fromEntries(seed.blocks.map((b) => [b.id, b]));
  for (const b of legacyPl.blocks) {
    if (b.id !== b.en) assert.equal(s.get('blocks', b.id), undefined, `${b.id} still there`);
    assert.equal(s.get('blocks', b.en)?.title, english[b.en].title, `${b.en} is not the English version`);
  }
  for (const c of legacyPl.components) assert.ok(s.get('components', c.en) && !s.get('components', c.id), c.id);
  assert.ok(s.get('component_sets', 'why') && !s.get('component_sets', 'dlaczego'));
  assert.equal(s.get('offers', 'gaius-vault-bazowa'), undefined);
  assert.deepEqual(s.getOffer('gaius-vault-base').slides.map((x) => x.frame), seedSlides.map((x) => x.frame));

  const mine = s.getOffer('moja-oferta').slides;
  assert.deepEqual(mine.map((x) => x.frame), ['problems', 'why']);
  assert.deepEqual(mine[0].block_ids, ['pr-research-from-scratch', 'pr-ai-without-rules']);
  assert.deepEqual(mine[0].data, seedSlides.find((x) => x.frame === 'problems').data, 'default Polish slide copy becomes the English default');
  assert.deepEqual(mine[1].picks, { why: [{ component: 'why/on-premise' }] });
  assert.equal(mine[1].data.title, 'Dlaczego my, ACME?', 'copy written for a client stays as written');

  assert.deepEqual(report.editedBlocks, ['uc-pilne-pismo']);
  assert.deepEqual(report.keptOfferCopy, ['moja-oferta/m2']);
  const drop = (j) => { const { exported_at: _t, ...rest } = JSON.parse(j); return rest; };
  assert.deepEqual(drop(s.getSetting('legacy_pl_backup')), drop(before), 'the full Polish database is kept as a backup');
  assert.equal(s.migrateLegacyPolish(legacyPl, seed), null, 'runs once');
});

test('legacy migration: an English database is left alone', () => {
  const s = fresh();
  assert.equal(s.migrateLegacyPolish(legacyPl, seed), null);
  assert.equal(s.getSetting('legacy_pl_backup'), null);
});

test('tile content update: the stored base deck gets the seed’s writing hints and per-role copy, hand edits stay', () => {
  const s = openDb(':memory:');
  s.importAll(seed, 'merge');
  s.ensureTiles(seed);
  const fresh = seed.scenarios.find((x) => x.id === 'base');
  // an older base deck: no per-role copy or hints, a label and copy edited by hand, one step deleted
  const old = fresh.steps
    .filter((st) => st.key !== 'add-on-services')
    .map(({ data_by_role, data_by_role_product, write, ...st }) => ({ ...st, ...(write ? { write: { old: { hint: 'old', max: 10 } } } : {}) }));
  old[0] = { ...old[0], label: 'Our title', data: { ...old[0].data, lead: 'Our lead' } };
  s.update('scenarios', 'base', { steps: old });
  s.setSetting('tile_content_rev', String(seed.tileUpgrade.rev - 1));

  s.ensureTiles(seed);
  const steps = s.get('scenarios', 'base').steps;
  assert.equal(steps[0].label, 'Our title');
  assert.equal(steps[0].data.lead, 'Our lead');
  assert.ok(!steps.some((st) => st.key === 'add-on-services'), 'a deleted step stays deleted');
  for (const st of steps) {
    const f = fresh.steps.find((x) => x.key === st.key);
    assert.deepEqual(st.write, f.write, `${st.key}: write`);
    assert.deepEqual(st.data_by_role, f.data_by_role, `${st.key}: data_by_role`);
    assert.deepEqual(st.data_by_role_product, f.data_by_role_product, `${st.key}: data_by_role_product`);
  }
});
