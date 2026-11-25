import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { openDb } from '../src/db.js';
import { buildLibrary, normalizeUpload, parseMarks, parseTemplate, renderPdf, renderThumbnails } from '../src/figcraft.js';
import seed, { TEMPLATE, slides as seedSlides } from '../seed/seed.js';
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
  assert.equal(lib.parsed.pages.length, 2);
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

test('nieobsługiwany format pliku jest odrzucany', async () => {
  await assert.rejects(normalizeUpload(Buffer.from('x'), 'notatki.txt'), /Nieobsługiwany plik/);
});
