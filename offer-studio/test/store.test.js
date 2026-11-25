import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { openDb } from '../src/db.js';
import { unzipSync } from 'fflate';
import { buildLibrary, describeComponents, normalizeUpload, parseMarks, parseTemplate, renderFigcraft, renderPdf, renderThumbnails } from '../src/figcraft.js';
import seed, { TEMPLATE, components as seedComponents, slides as seedSlides } from '../seed/seed.js';
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

test('szablon: każdy slajd oferty bazowej istnieje w szablonie i ma swoje pola', () => {
  const parsed = parseTemplate(TEMPLATE_FILE);
  const frames = Object.fromEntries(parsed.frames.map((f) => [f.name, f]));
  for (const s of seedSlides) {
    const f = frames[s.frame];
    assert.ok(f, `brak slajdu ${s.frame}`);
    for (const key of Object.keys(s.data)) assert.ok(f.fields.data.includes(key), `${s.frame}: szablon nie ma pola data.${key}`);
  }
  assert.equal(frames['use-case'].slots.length, 6);
  assert.deepEqual(frames.cennik.fields.sources.sort(), ['blocks', 'lines']);
});

test('wyróżnienia: **x** i [[k:x]] dają zakresy stylów', () => {
  assert.deepEqual(parseMarks('Gdzie **ucieka** czas'), { text: 'Gdzie ucieka czas', ranges: [{ start: 6, end: 12, run: 1 }] });
  assert.deepEqual(parseMarks('[[1:12 000 zł]] [[2:/ mies]]'), {
    text: '12 000 zł / mies',
    ranges: [{ start: 0, end: 9, run: 1 }, { start: 10, end: 16, run: 2 }],
  });
});

test('PATCH scala data, a null usuwa klucz', () => {
  const s = fresh();
  s.update('blocks', 'uc-pilne-pismo', { data: { extra: 'x' } });
  assert.deepEqual(s.get('blocks', 'uc-pilne-pismo').data, { effect: 'szybsza reakcja i większa kontrola ryzyka.', extra: 'x' });
  s.update('blocks', 'uc-pilne-pismo', { data: { extra: null } });
  assert.deepEqual(Object.keys(s.get('blocks', 'uc-pilne-pismo').data), ['effect']);
  s.update('blocks', 'uc-pilne-pismo', { data: { only: 1 } }, { replaceData: true });
  assert.deepEqual(s.get('blocks', 'uc-pilne-pismo').data, { only: 1 });
});

test('eksport -> import replace odtwarza bazę 1:1 (z plikiem szablonu)', () => {
  const a = fresh();
  const dump = JSON.parse(JSON.stringify(a.exportAll()));
  const b = openDb(':memory:');
  b.insert('blocks', { id: 'do-skasowania', type: 'x', title: 'x' });
  const counts = b.importAll(dump, 'replace');
  assert.equal(counts.blocks, seed.blocks.length);
  assert.equal(counts.templates, 1);
  assert.equal(b.get('blocks', 'do-skasowania'), undefined);
  assert.ok(b.templateFile('gaius').file.equals(TEMPLATE_FILE));
  const again = JSON.parse(JSON.stringify(b.exportAll()));
  for (const k of ['blocks', 'templates', 'offers', 'slides']) assert.deepEqual(again[k], dump[k], k);
});

test('import merge nie kasuje slajdów oferty (bez kaskady)', () => {
  const s = fresh();
  s.importAll({ format: 'offer-studio', version: 2, offers: [{ id: 'gaius-vault-bazowa', name: 'Nowa nazwa', template_id: 'gaius', data: {} }] }, 'merge');
  const o = s.getOffer('gaius-vault-bazowa');
  assert.equal(o.name, 'Nowa nazwa');
  assert.equal(o.slides.length, 11);
});

test('kolejność slajdów, wstawianie na pozycję i duplikat oferty', () => {
  const s = fresh();
  const ids = s.getOffer('gaius-vault-bazowa').slides.map((x) => x.id);
  s.reorderSlides('gaius-vault-bazowa', [...ids].reverse());
  assert.equal(s.getOffer('gaius-vault-bazowa').slides[0].id, ids.at(-1));
  const added = s.addSlide('gaius-vault-bazowa', { frame: 'okladka', data: {}, position: 1 });
  assert.equal(s.getOffer('gaius-vault-bazowa').slides[1].id, added.id);
  assert.throws(() => s.reorderSlides('gaius-vault-bazowa', ids), /wszystkie slajdy/);
  const copy = s.duplicateOffer('gaius-vault-bazowa');
  assert.equal(copy.slides.length, 12);
  assert.equal(copy.template_id, 'gaius');
  s.remove('offers', 'gaius-vault-bazowa');
  assert.equal(s.list('slides', 'offer_id = :id', { id: 'gaius-vault-bazowa' }).length, 0);
});

test('migracja z v1: layout_id -> frame, stare tabele znikają', () => {
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

test('komponenty: zestaw @dlaczego nie jest slajdem, slajd ma 6 slotów #pick, seed opisuje każdą kartę', () => {
  const parsed = parseTemplate(TEMPLATE_FILE);
  assert.ok(!parsed.frames.some((f) => f.name.startsWith('@')));
  const dl = parsed.frames.find((f) => f.name === 'dlaczego');
  assert.deepEqual(dl.fields.picks, { dlaczego: 6 });
  assert.equal(dl.slots.length, 0);
  assert.ok(!dl.texts.length || dl.texts.every((t) => t.name.startsWith('{{data.')), 'teksty z kart #pick nie są polami slajdu');
  const ids = parsed.components.map((c) => c.id).sort();
  assert.deepEqual(ids, seedComponents.map((c) => c.id).sort());
  const stat = parsed.components.find((c) => c.id === 'dlaczego/pilotaz-3-miesiace');
  assert.deepEqual(stat.fields.sort(), ['body', 'stat', 'title']);
  assert.match(stat.text, /3 mies\./);
  for (const s of seedSlides) for (const [, picks] of Object.entries(s.picks || {})) for (const p of picks) assert.ok(ids.includes(p.component), p.component);
});

test('komponenty: synchronizacja zachowuje opisy, odświeża tekst i oznacza brakujące', () => {
  const s = fresh();
  const found = describeComponents(parseTemplate(TEMPLATE_FILE)).map((c) => ({ ...c, source: TEMPLATE.id }));
  const first = s.syncComponents(found);
  assert.deepEqual(first.added, []);
  const row = s.get('components', 'dlaczego/on-premise');
  assert.match(row.use_when, /Bank/);
  assert.match(row.figma_text, /On-premise albo model hybrydowy/);
  assert.deepEqual(row.fields, ['title', 'body']);
  const again = s.syncComponents([...found.filter((c) => c.id !== 'dlaczego/on-premise'), { ...found[0], id: 'dlaczego/nowa-karta', key: 'nowa-karta' }]);
  assert.deepEqual(again, { added: ['dlaczego/nowa-karta'], missing: ['dlaczego/on-premise'] });
  assert.equal(s.listComponents({ set: 'dlaczego' }).some((c) => c.id === 'dlaczego/on-premise'), false);
  assert.match(s.get('components', 'dlaczego/on-premise').use_when, /Bank/);
  s.syncComponents(found);
  assert.equal(s.get('components', 'dlaczego/on-premise').missing, false);
  assert.throws(() => s.insert('components', { id: 'Zle Id', set_name: 'x', key: 'x' }), /Niepoprawne id/);
});

test('migracja z v2: slajdy dostają picks, dochodzą tabele komponentów', () => {
  const dir = mkdtempSync(join(tmpdir(), 'os-mig2-'));
  const path = join(dir, 'v2.db');
  const old = new DatabaseSync(path);
  old.exec(`CREATE TABLE offers (id TEXT PRIMARY KEY, name TEXT NOT NULL, template_id TEXT, data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE slides (id TEXT PRIMARY KEY, offer_id TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, frame TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', block_ids TEXT NOT NULL DEFAULT '[]', query TEXT, hidden INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO offers VALUES ('o', 'O', 'gaius', '{}', 't', 't'); INSERT INTO slides (id, offer_id, frame, created_at, updated_at) VALUES ('s', 'o', 'dlaczego', 't', 't');
    PRAGMA user_version = 2;`);
  old.close();
  const s = openDb(path);
  assert.equal(s.migratedFrom, 2);
  assert.deepEqual(s.get('slides', 's').picks, {});
  assert.deepEqual(s.list('components'), []);
  s.update('slides', 's', { picks: { dlaczego: [{ component: 'dlaczego/on-premise' }] } });
  assert.equal(s.get('slides', 's').picks.dlaczego[0].component, 'dlaczego/on-premise');
  assert.equal(openDb(path).migratedFrom, 0);
});

test('AI: schemat z id kart i polami, porządki w odpowiedzi (atrapa klienta)', async () => {
  const s = fresh();
  s.syncComponents(describeComponents(parseTemplate(TEMPLATE_FILE)).map((c) => ({ ...c, source: TEMPLATE.id })));
  const components = s.listComponents({ set: 'dlaczego' });
  let request;
  const api = { beta: { messages: { parse: async (params) => {
    request = params;
    return {
      stop_reason: 'end_turn', model: params.model, usage: {},
      parsed_output: { note: 'bank', sets: [{ set: 'dlaczego', picks: [
        { component: 'dlaczego/on-premise-wyroznienie', reason: 'regulowany', title: 'On-premise w banku', body: null, stat: null },
        { component: 'dlaczego/on-premise-wyroznienie', reason: 'dubel', title: null, body: null, stat: null },
        ...['prywatne-legal-ai', 'odpowiedzi-ze-zrodlami', 'wdrozenie-rutyna', 'bezpieczny-start', 'jedna-usluga', 'bez-blokady']
          .map((k) => ({ component: `dlaczego/${k}`, reason: 'x', title: null, body: '', stat: null })),
      ] }] },
    };
  } } } };
  const { pickComponents } = await import('../src/ai.js');
  const r = await pickComponents({ api, offer: { name: 'O', data: { client: 'Bank' } }, slide: { frame: 'dlaczego', data: {} }, brief: 'bank', sets: [{ set: 'dlaczego', slots: 6, rules: 'r', components }] });
  const schema = request.output_config.format.schema;
  assert.ok(JSON.stringify(schema).includes('dlaczego/pilotaz-3-miesiace'), 'id kart w schemacie');
  assert.ok(JSON.stringify(schema).includes('"stat"'), 'pola kart w schemacie');
  assert.match(request.messages[0].content, /Bank/);
  assert.equal(r.picks.dlaczego.length, 6);
  assert.deepEqual(r.picks.dlaczego[0], { component: 'dlaczego/on-premise-wyroznienie', reason: 'regulowany', data: { title: 'On-premise w banku' } });
  assert.equal(r.picks.dlaczego.filter((p) => p.component === 'dlaczego/on-premise-wyroznienie').length, 1);
  assert.ok(r.warnings.some((w) => /nadmiar/.test(w)));
});

test('AI: analiza leada przekazuje tekst i podpowiedzi, przycina obawy do 3 (atrapa klienta)', async () => {
  let request;
  const api = { beta: { messages: { parse: async (params) => {
    request = params;
    return {
      stop_reason: 'end_turn', model: params.model, usage: {},
      parsed_output: { segment: 'kancelaria', role: null, client: 'Kancelaria X', person: null, country: 'PL', concerns: ['a', 'b', 'c', 'd'], summary: 's' },
    };
  } } } };
  const { analyzeLead } = await import('../src/ai.js');
  const r = await analyzeLead({ api, text: 'Partner w kancelarii X', hints: { segment: 'kancelaria' } });
  const schema = JSON.stringify(request.output_config.format.schema);
  for (const v of ['kancelaria', 'in-house', 'administracja', 'champion', 'zarzad']) assert.ok(schema.includes(v), v);
  assert.match(request.messages[0].content, /Partner w kancelarii X/);
  assert.match(request.messages[0].content, /"segment":"kancelaria"/);
  assert.equal(r.role, null);
  assert.deepEqual(r.concerns, ['a', 'b', 'c']);
});

test('AI: analiza leada zamienia odmowę na błąd 502', async () => {
  const api = { beta: { messages: { parse: async () => ({ stop_reason: 'refusal', parsed_output: null }) } } };
  const { analyzeLead } = await import('../src/ai.js');
  await assert.rejects(analyzeLead({ api, text: 'x' }), (e) => e.status === 502);
});

// Render przez prawdziwy figcraft-cli, jeśli jest dostępny (lokalnie z instalacji FigCraft, w Dockerze z obrazu).
const cli = process.env.FIGCRAFT_CLI || (process.platform === 'win32' ? 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe' : 'figcraft-cli');
let hasCli = true;
try { execFileSync(cli, ['--version'], { stdio: 'ignore' }); } catch { hasCli = false; }

test('render PDF przez figcraft-cli: dodatkowe i ukryte karty', { skip: !hasCli && 'brak figcraft-cli' }, async () => {
  const parsed = parseTemplate(TEMPLATE_FILE);
  const card = (i) => ({ title: `Karta ${i}`, body: `Opis ${i}`, effect: `efekt ${i}` });
  const pdf = await renderPdf({
    templateBuf: TEMPLATE_FILE,
    parsed,
    offer: { client: 'ACME', price: '1 000' },
    slides: [
      { frame: 'use-case', data: { title: 'Osiem kart', lead: '' }, items: { blocks: Array.from({ length: 8 }, (_, i) => card(i + 1)) } },
      { frame: 'czym-jest', data: { title: 'Dwie ', title_accent: 'karty' }, items: { blocks: [card(1), card(2)] } },
    ],
  });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 2);
});

// Minimalny dokument FigCraft JSON z jedną stroną i jednym slajdem (tak wygląda „JSON per page”).
const caseJson = {
  format: 'figcraft', version: 1, name: 'case', pages: [1], next_id: 5, current_page: 1, imageIndex: [],
  styles: [], variables: { collections: [], variables: [] }, document_colors: [], comments: [],
  nodes: {
    1: { id: 1, name: 'Page 1', type: 'page', children: [2], width: 0, height: 0 },
    2: { id: 2, name: 'case-study', type: 'frame', parent: 1, children: [3], width: 1920, height: 1080,
      fills: [{ type: 'solid', color: { r: 0.11, g: 0.12, b: 0.13, a: 1 }, opacity: 1, visible: true, blend: 'normal' }] },
    3: { id: 3, name: '{{data.title}}', type: 'text', parent: 2, characters: 'Tytuł', width: 1200, height: 100,
      transform: [1, 0, 0, 1, 100, 100], auto_resize: 'height',
      style: { font_family: 'Inter', font_style: 'Regular', font_size: 64, line_height: { unit: 'auto' }, letter_spacing: { unit: 'percent', value: 0 }, decoration: 'none', case: 'original', fills: null, link: null },
      fills: [{ type: 'solid', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true, blend: 'normal' }] },
  },
};

test('biblioteka: JSON strony + szablon -> jeden PDF ze slajdami z obu plików', { skip: !hasCli && 'brak figcraft-cli' }, async () => {
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
      { frame: 'okladka', data: { title: 'Gaius Vault' }, items: {} },
      { frame: 'case-study', data: { title: 'Case study: ACME' }, items: {} },
    ],
  });
  assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 2);
});

test('render: wybrane komponenty zastępują sloty #pick w kolejności, z nadpisanym tekstem', { skip: !hasCli && 'brak figcraft-cli' }, async () => {
  const parsed = parseTemplate(TEMPLATE_FILE);
  const comp = (k) => parsed.components.find((c) => c.id === `dlaczego/${k}`);
  const keys = ['on-premise', 'pilotaz-3-miesiace', 'jedna-usluga-wyroznienie'];
  const file = await renderFigcraft({
    templateBuf: TEMPLATE_FILE,
    parsed,
    offer: {},
    slides: [{ frame: 'dlaczego', data: { title: 'Dlaczego ', title_accent: 'Vault?' }, items: {},
      picks: { dlaczego: keys.map((k) => ({ comp: comp(k), data: k === 'on-premise' ? { title: 'On-premise w ACME' } : {} })) } }],
  });
  const doc = JSON.parse(Buffer.from(unzipSync(new Uint8Array(file))['document.json']).toString('utf8'));
  const nodes = Object.values(doc.nodes);
  assert.equal(nodes.filter((n) => n.name === '#pick:dlaczego').length, 0, 'sloty znikają');
  assert.ok(!nodes.some((n) => n.name?.startsWith('@')), 'zestaw komponentów nie trafia do oferty');
  const grid = nodes.find((n) => n.name === 'Frame 62');
  assert.deepEqual(grid.children.map((id) => doc.nodes[String(id)].name), keys);
  const onPrem = doc.nodes[String(grid.children[0])];
  const texts = [];
  const walk = (id) => { const n = doc.nodes[String(id)]; if (n.type === 'text') texts.push(n.characters); (n.children || []).forEach(walk); };
  walk(onPrem.id);
  assert.ok(texts.includes('On-premise w ACME'));
  assert.ok(texts.some((t) => t.startsWith('Środowisko w infrastrukturze')), 'pole bez nadpisania zostaje z FigCraft');
});

test('nieobsługiwany format pliku jest odrzucany', async () => {
  await assert.rejects(normalizeUpload(Buffer.from('x'), 'notatki.txt'), /Nieobsługiwany plik/);
});
