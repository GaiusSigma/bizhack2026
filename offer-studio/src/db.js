// Warstwa danych: jeden plik SQLite (node:sqlite, bez natywnych zależności).
//
// Model:
//   blocks    – jednostki wiedzy (use case, problem, krok wdrożenia, wiersz porównania...).
//               `type` i `tags` są dowolnymi stringami, a pola specyficzne dla typu siedzą w `data` (JSON).
//   templates – szablony prezentacji: pliki .figcraft (BLOB). Każda ramka najwyższego poziomu = slajd szablonu.
//   offers    – oferta: nazwa, szablon i zmienne (`data`, np. klient, cena).
//   slides    – uporządkowane slajdy oferty: slajd szablonu (`frame`) + treść + bloki (lista id albo zapytanie)
//               + `picks`: komponenty wybrane do slotów `#pick:<zestaw>` ({zestaw: [{component, data}]}).
//   components     – karty narysowane w FigCraft (ramka `@zestaw`, w niej karty) z opisem dla AI:
//                    co pokazuje, kiedy ją wybrać, kiedy nie, temat (warianty jednego argumentu), tagi.
//                    Wiersze zakłada i aktualizuje synchronizacja z biblioteką; opisy pisze człowiek albo AI.
//   component_sets – zasady zestawu dla AI (np. „dokładnie jedna karta wyróżniona”).
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';

const SCHEMA_VERSION = 4;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '{}',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS blocks_type ON blocks(type);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file BLOB NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slides (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  frame TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  block_ids TEXT NOT NULL DEFAULT '[]',
  query TEXT,
  picks TEXT NOT NULL DEFAULT '{}',
  hidden INTEGER NOT NULL DEFAULT 0,
  origin TEXT,                             -- JSON {step, matched}: skąd slajd przyszedł przy generowaniu z kafelków
  locked INTEGER NOT NULL DEFAULT 0,       -- 1: poprawiony ręcznie, przeliczenie go nie rusza
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS slides_offer ON slides(offer_id, position);

CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,                     -- "<zestaw>/<nazwa karty>", np. dlaczego/on-premise
  set_name TEXT NOT NULL,
  key TEXT NOT NULL,
  source TEXT,                             -- plik biblioteki (templates.id)
  title TEXT NOT NULL DEFAULT '',          -- krótka nazwa dla ludzi
  description TEXT NOT NULL DEFAULT '',    -- co karta pokazuje (treść, wygląd)
  use_when TEXT NOT NULL DEFAULT '',       -- kiedy AI ma ją wybrać
  avoid_when TEXT NOT NULL DEFAULT '',     -- kiedy jej nie wybierać
  topic TEXT NOT NULL DEFAULT '',          -- warianty tego samego argumentu mają ten sam temat
  variant TEXT NOT NULL DEFAULT '',        -- np. zwykla, wyroznienie, liczba
  tags TEXT NOT NULL DEFAULT '[]',
  data TEXT NOT NULL DEFAULT '{}',         -- stałe nadpisania pól {{...}} karty
  figma_text TEXT NOT NULL DEFAULT '',     -- tekst narysowany w FigCraft (z synchronizacji)
  fields TEXT NOT NULL DEFAULT '[]',       -- pola {{...}} karty (z synchronizacji)
  missing INTEGER NOT NULL DEFAULT 0,      -- 1: karty nie ma już w bibliotece
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS components_set ON components(set_name);

CREATE TABLE IF NOT EXISTS tiles (
  id TEXT PRIMARY KEY,                     -- "<kategoria>:<slug>", np. bol:poufnosc
  category TEXT NOT NULL,                  -- rola | segment | bol | produkt
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quotes TEXT NOT NULL DEFAULT '[]',       -- cytaty klientów
  status TEXT NOT NULL DEFAULT 'active',   -- active | soon
  position INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',         -- np. {price} dla produktu
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,                     -- id kafelka roli, np. rola:zarzad
  name TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',        -- kroki: [{key, label, frame, data, data_by_product, fill, when}]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS component_sets (
  id TEXT PRIMARY KEY,                     -- nazwa zestawu bez @
  title TEXT NOT NULL DEFAULT '',
  rules TEXT NOT NULL DEFAULT '',          -- zasady doboru dla AI
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

// Opis tabel: które kolumny są JSON-em, które wolno ustawiać przez API, domyślne sortowanie.
export const TABLES = {
  blocks: {
    fields: ['type', 'title', 'body', 'data', 'tags'],
    json: { data: {}, tags: [] },
    order: 'type, title',
  },
  templates: {
    fields: ['name'],
    json: {},
    order: 'name',
    columns: 'id, name, length(file) AS size, created_at, updated_at',
  },
  offers: {
    fields: ['name', 'template_id', 'data'],
    json: { data: {} },
    order: 'updated_at DESC',
  },
  slides: {
    fields: ['offer_id', 'position', 'frame', 'data', 'block_ids', 'query', 'picks', 'hidden', 'origin', 'locked'],
    json: { data: {}, block_ids: [], query: null, picks: {}, origin: null },
    bool: ['hidden', 'locked'],
    order: 'offer_id, position',
  },
  components: {
    fields: ['set_name', 'key', 'source', 'title', 'description', 'use_when', 'avoid_when', 'topic', 'variant', 'tags', 'data', 'figma_text', 'fields', 'missing'],
    json: { tags: [], data: {}, fields: [] },
    bool: ['missing'],
    order: 'set_name, topic, variant, key',
  },
  component_sets: {
    fields: ['title', 'rules'],
    json: {},
    order: 'id',
  },
  tiles: {
    fields: ['category', 'label', 'description', 'quotes', 'status', 'position', 'data'],
    json: { quotes: [], data: {} },
    order: 'category, position, label',
  },
  scenarios: {
    fields: ['name', 'steps'],
    json: { steps: [] },
    order: 'id',
  },
};

export const TILE_CATEGORIES = ['rola', 'segment', 'bol', 'produkt'];
export const TILE_ID_RE = /^(rola|segment|bol|produkt):[a-z0-9][a-z0-9-]{0,59}$/;
const SCENARIO_ID_RE = /^rola:[a-z0-9][a-z0-9-]{0,59}$/;

// Pola komponentu, które opisuje człowiek (reszta przychodzi z synchronizacji z biblioteką).
export const COMPONENT_EDITABLE = ['title', 'description', 'use_when', 'avoid_when', 'topic', 'variant', 'tags', 'data'];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const now = () => new Date().toISOString();

export function newId(prefix = '') {
  const rnd = randomBytes(5).toString('hex');
  return prefix ? `${slugify(prefix).slice(0, 24)}-${rnd}` : rnd;
}

export function slugify(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'x';
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
// Komponenty mają id "<zestaw>/<karta>" (oba człony po slugify).
const COMPONENT_ID_RE = /^[a-z0-9][a-z0-9-]{0,59}\/[a-z0-9][a-z0-9-]{0,79}$/;
const ID_RES = { components: COMPONENT_ID_RE, tiles: TILE_ID_RE, scenarios: SCENARIO_ID_RE };
const idOk = (table, id) => (ID_RES[table] || ID_RE).test(id);
export const componentId = (set, key) => `${slugify(set)}/${slugify(key)}`;

export function openDb(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const from = migrate(db);
  db.exec(SCHEMA);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  const store = new Store(db);
  store.migratedFrom = from;
  store.migratedFromV1 = from === 1;
  return store;
}

// v1 (layouty HTML) -> v2 (szablony FigCraft): bloki i oferty zostają, slajdy dostają kolumnę `frame`.
// v2 -> v3: slajdy dostają `picks` (komponenty); tabele components i component_sets tworzy SCHEMA.
// Zwraca wersję, z której zmigrowano (0 = nowa baza albo już aktualna).
function migrate(db) {
  const version = db.prepare('PRAGMA user_version').get().user_version;
  const has = (t) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
  if (version >= SCHEMA_VERSION || !has('slides')) return 0;
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  db.exec('BEGIN');
  try {
    if (version < 2) {
      if (cols('slides').includes('layout_id')) db.exec('ALTER TABLE slides RENAME COLUMN layout_id TO frame');
      if (has('offers') && !cols('offers').includes('template_id')) db.exec('ALTER TABLE offers ADD COLUMN template_id TEXT');
      for (const t of ['layouts', 'assets', 'settings']) if (has(t)) db.exec(`DROP TABLE ${t}`);
    }
    if (!cols('slides').includes('picks')) db.exec("ALTER TABLE slides ADD COLUMN picks TEXT NOT NULL DEFAULT '{}'");
    // v3 -> v4: slajdy dostają pochodzenie i blokadę; tabele tiles i scenarios tworzy SCHEMA.
    if (!cols('slides').includes('origin')) db.exec('ALTER TABLE slides ADD COLUMN origin TEXT');
    if (!cols('slides').includes('locked')) db.exec('ALTER TABLE slides ADD COLUMN locked INTEGER NOT NULL DEFAULT 0');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return version < 2 ? 1 : version;
}

export class Store {
  constructor(db) {
    this.db = db;
  }

  // ------------------------------------------------------------ ogólne CRUD
  decode(table, row) {
    if (!row) return row;
    const t = TABLES[table];
    const out = { ...row };
    for (const [col, def] of Object.entries(t.json)) {
      if (col in out) out[col] = out[col] == null ? def : JSON.parse(out[col]);
    }
    for (const col of t.bool || []) if (col in out) out[col] = !!out[col];
    return out;
  }

  encode(table, obj) {
    const t = TABLES[table];
    const out = {};
    for (const f of t.fields) {
      if (!(f in obj)) continue;
      let v = obj[f];
      if (f in t.json) v = v == null ? null : JSON.stringify(v);
      else if ((t.bool || []).includes(f)) v = v ? 1 : 0;
      out[f] = v;
    }
    return out;
  }

  list(table, where = '', params = {}) {
    const cols = TABLES[table].columns || '*';
    const sql = `SELECT ${cols} FROM ${table} ${where ? `WHERE ${where}` : ''} ORDER BY ${TABLES[table].order}`;
    return this.db.prepare(sql).all(params).map((r) => this.decode(table, r));
  }

  get(table, id) {
    const cols = TABLES[table].columns || '*';
    return this.decode(table, this.db.prepare(`SELECT ${cols} FROM ${table} WHERE id = ?`).get(id));
  }

  mustGet(table, id) {
    const row = this.get(table, id);
    if (!row) throw new HttpError(404, `${table}/${id}: nie ma takiego rekordu`);
    return row;
  }

  insert(table, obj, idPrefix = '') {
    const id = obj.id ?? newId(idPrefix);
    if (!idOk(table, id)) throw new HttpError(400, `Niepoprawne id "${id}" (litery, cyfry, . _ -, max 80 znaków)`);
    if (this.get(table, id)) throw new HttpError(409, `${table}/${id} już istnieje`);
    const ts = now();
    const row = { ...this.encode(table, obj), id, created_at: obj.created_at ?? ts, updated_at: obj.updated_at ?? ts };
    const cols = Object.keys(row);
    this.db
      .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `:${c}`).join(', ')})`)
      .run(row);
    return this.get(table, id);
  }

  // PATCH: pola podane w `patch` zastępują stare. Wyjątek: obiekt `data` jest łączony płytko
  // (klucz z wartością null usuwa pole), chyba że `replaceData` = true.
  update(table, id, patch, { replaceData = false } = {}) {
    const current = this.mustGet(table, id);
    const merged = { ...patch };
    if ('data' in patch && !replaceData && patch.data && typeof patch.data === 'object') {
      const data = { ...(current.data || {}) };
      for (const [k, v] of Object.entries(patch.data)) {
        if (v === null) delete data[k];
        else data[k] = v;
      }
      merged.data = data;
    }
    const row = this.encode(table, merged);
    const cols = Object.keys(row);
    if (!cols.length) return current;
    row.updated_at = now();
    row.id = id;
    this.db
      .prepare(`UPDATE ${table} SET ${[...cols, 'updated_at'].map((c) => `${c} = :${c}`).join(', ')} WHERE id = :id`)
      .run(row);
    return this.get(table, id);
  }

  remove(table, id) {
    const r = this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    if (!r.changes) throw new HttpError(404, `${table}/${id}: nie ma takiego rekordu`);
  }

  tx(fn) {
    this.db.exec('BEGIN');
    try {
      const r = fn();
      this.db.exec('COMMIT');
      return r;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  // ------------------------------------------------------------ bloki
  listBlocks({ type, tag, q } = {}) {
    const where = [];
    const p = {};
    if (type) { where.push('type = :type'); p.type = type; }
    if (tag) { where.push('EXISTS (SELECT 1 FROM json_each(blocks.tags) WHERE value = :tag)'); p.tag = tag; }
    if (q) { where.push('(title LIKE :q OR body LIKE :q OR data LIKE :q)'); p.q = `%${q}%`; }
    return this.list('blocks', where.join(' AND '), p);
  }

  meta() {
    const types = this.db.prepare('SELECT type, COUNT(*) AS count FROM blocks GROUP BY type ORDER BY type').all();
    const tags = this.db
      .prepare('SELECT value AS tag, COUNT(*) AS count FROM blocks, json_each(blocks.tags) GROUP BY value ORDER BY value')
      .all();
    return { types: types.map((r) => ({ ...r })), tags: tags.map((r) => ({ ...r })) };
  }

  // ------------------------------------------------------------ szablony
  templateFile(id) {
    const r = this.db.prepare('SELECT file, updated_at FROM templates WHERE id = ?').get(id);
    if (!r) throw new HttpError(404, `templates/${id}: nie ma takiego szablonu`);
    return { file: Buffer.from(r.file), updated_at: r.updated_at };
  }

  putTemplate({ id, name, file, created_at, updated_at }) {
    if (!ID_RE.test(id)) throw new HttpError(400, `Niepoprawne id szablonu "${id}"`);
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO templates (id, name, file, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, file = excluded.file, updated_at = excluded.updated_at`,
      )
      .run(id, name || id, file, created_at || ts, updated_at || ts);
    return this.get('templates', id);
  }

  // ------------------------------------------------------------ komponenty
  // Synchronizacja z biblioteką: `found` = [{id, set, key, source, title, text, fields}] ze wszystkich plików.
  // Nowe karty dostają wiersz (opis pusty, do uzupełnienia), istniejące tylko tekst/pola/źródło,
  // a karty, których już nie ma, są oznaczane `missing` (opisy zostają, gdyby wróciły).
  syncComponents(found) {
    const stats = { added: [], missing: [] };
    this.tx(() => {
      const seen = new Set();
      for (const c of found) {
        seen.add(c.id);
        const cur = this.get('components', c.id);
        const synced = { set_name: c.set, key: c.key, source: c.source, figma_text: c.text, fields: c.fields, missing: false };
        if (!cur) {
          this.insert('components', { id: c.id, ...synced, title: c.title });
          stats.added.push(c.id);
        } else if (cur.source !== c.source || cur.figma_text !== c.text || cur.missing || JSON.stringify(cur.fields) !== JSON.stringify(c.fields)) {
          this.update('components', c.id, synced);
        }
        if (!this.get('component_sets', c.set)) this.insert('component_sets', { id: c.set, title: c.set });
      }
      for (const cur of this.list('components', 'missing = 0')) {
        if (!seen.has(cur.id)) {
          this.update('components', cur.id, { missing: true });
          stats.missing.push(cur.id);
        }
      }
    });
    return stats;
  }

  listComponents({ set, includeMissing = false } = {}) {
    const where = [];
    const p = {};
    if (set) { where.push('set_name = :set'); p.set = set; }
    if (!includeMissing) where.push('missing = 0');
    return this.list('components', where.join(' AND '), p);
  }

  // ------------------------------------------------------------ oferty i slajdy
  getOffer(id) {
    const offer = this.mustGet('offers', id);
    offer.slides = this.list('slides', 'offer_id = :id', { id });
    return offer;
  }

  // Wykonuje plan z mergeRecompute (src/generate.js) w jednej transakcji. Nie ustawia `locked`:
  // przeliczenie to jedyna zmiana slajdów, która nie oznacza ich jako poprawionych ręcznie.
  applyRecompute(offerId, { create = [], remove = [], hide = [], order = [] }) {
    this.mustGet('offers', offerId);
    this.tx(() => {
      for (const id of remove) this.db.prepare('DELETE FROM slides WHERE id = ? AND offer_id = ?').run(id, offerId);
      for (const id of hide) this.db.prepare('UPDATE slides SET hidden = 1 WHERE id = ? AND offer_id = ?').run(id, offerId);
      const createdIds = create.map((s) => this.insert('slides', { ...s, offer_id: offerId, position: 0, locked: false }, 'slide').id);
      const setPos = this.db.prepare('UPDATE slides SET position = ? WHERE id = ? AND offer_id = ?');
      order.forEach((x, i) => setPos.run(i, typeof x === 'string' ? x : createdIds[x.create], offerId));
      this.touch('offers', offerId);
    });
    return this.getOffer(offerId);
  }

  addSlide(offerId, slide) {
    this.mustGet('offers', offerId);
    const max = this.db.prepare('SELECT MAX(position) AS m FROM slides WHERE offer_id = ?').get(offerId).m;
    const position = slide.position ?? (max == null ? 0 : max + 1);
    return this.tx(() => {
      if (slide.position != null) {
        this.db.prepare('UPDATE slides SET position = position + 1 WHERE offer_id = ? AND position >= ?').run(offerId, position);
      }
      const s = this.insert('slides', { ...slide, offer_id: offerId, position }, 'slide');
      this.touch('offers', offerId);
      return s;
    });
  }

  reorderSlides(offerId, ids) {
    const existing = this.list('slides', 'offer_id = :id', { id: offerId }).map((s) => s.id);
    if (ids.length !== existing.length || !ids.every((i) => existing.includes(i))) {
      throw new HttpError(400, 'Lista id musi zawierać dokładnie wszystkie slajdy tej oferty');
    }
    this.tx(() => {
      const st = this.db.prepare('UPDATE slides SET position = ? WHERE id = ?');
      ids.forEach((id, i) => st.run(i, id));
      this.touch('offers', offerId);
    });
    return this.getOffer(offerId);
  }

  duplicateOffer(id, name) {
    const src = this.getOffer(id);
    return this.tx(() => {
      const copy = this.insert('offers', { name: name || `${src.name} (kopia)`, template_id: src.template_id, data: src.data }, src.name);
      for (const s of src.slides) {
        const { id: _i, offer_id: _o, created_at: _c, updated_at: _u, ...rest } = s;
        this.insert('slides', { ...rest, offer_id: copy.id }, 'slide');
      }
      return this.getOffer(copy.id);
    });
  }

  touch(table, id) {
    this.db.prepare(`UPDATE ${table} SET updated_at = ? WHERE id = ?`).run(now(), id);
  }

  // Kafelki (v4) dla baz, które ich jeszcze nie mają: kafelki, scenariusze, bloki rozwiązań
  // i przypięcia kafelków do istniejącej treści (dopisywane do tagów, nic nie jest usuwane).
  // Działa tylko przy pustej tabeli tiles, więc kolejne starty nic nie zmieniają.
  ensureTiles(seed) {
    const counts = { tiles: 0, scenarios: 0, blocks: 0, tagged: 0 };
    if (this.db.prepare('SELECT 1 FROM tiles LIMIT 1').get()) return counts;
    this.tx(() => {
      for (const t of seed.tiles || []) { this.upsert('tiles', t); counts.tiles++; }
      for (const sc of seed.scenarios || []) if (!this.get('scenarios', sc.id)) { this.upsert('scenarios', sc); counts.scenarios++; }
      for (const b of seed.solutionBlocks || []) if (!this.get('blocks', b.id)) { this.upsert('blocks', b); counts.blocks++; }
      // Kolejność z seeda (np. kroki wdrożenia): generator rozstrzyga nią remisy.
      for (const b of seed.blocks || []) {
        const cur = b.data?.order != null && this.get('blocks', b.id);
        if (cur && cur.data?.order == null) this.update('blocks', b.id, { data: { order: b.data.order } });
      }
      for (const [id, add] of Object.entries(seed.tileTags || {})) {
        const table = id.includes('/') ? 'components' : 'blocks';
        const cur = this.get(table, id);
        if (!cur) continue;
        const tags = [...new Set([...cur.tags, ...add])];
        if (tags.length === cur.tags.length) continue;
        this.update(table, id, { tags });
        counts.tagged++;
      }
    });
    return counts;
  }

  isEmpty() {
    return !this.db.prepare('SELECT 1 FROM templates LIMIT 1').get() && !this.db.prepare('SELECT 1 FROM blocks LIMIT 1').get();
  }

  // ------------------------------------------------------------ eksport / import
  exportAll() {
    const templates = this.db
      .prepare('SELECT * FROM templates ORDER BY id')
      .all()
      .map((t) => ({ id: t.id, name: t.name, created_at: t.created_at, updated_at: t.updated_at, file_base64: Buffer.from(t.file).toString('base64') }));
    return {
      format: 'offer-studio',
      version: 4,
      exported_at: now(),
      blocks: this.list('blocks'),
      templates,
      offers: this.list('offers'),
      slides: this.list('slides'),
      components: this.list('components'),
      component_sets: this.list('component_sets'),
      tiles: this.list('tiles'),
      scenarios: this.list('scenarios'),
    };
  }

  // mode = 'merge' (wstaw albo nadpisz rekordy o tych samych id, reszty nie rusza)
  //      | 'replace' (wyczyść wszystko i wczytaj tylko to, co w pliku)
  // Eksport v1 (layouty HTML) wczytuje bloki i oferty; layouty, obrazki i motyw pomija.
  // Eksport v2 nie ma komponentów: po imporcie dopisze je synchronizacja z biblioteką.
  importAll(dump, mode = 'merge') {
    if (!dump || dump.format !== 'offer-studio') throw new HttpError(400, 'To nie jest eksport offer-studio (brak format: "offer-studio")');
    if (![1, 2, 3, 4].includes(dump.version)) throw new HttpError(400, `Nieobsługiwana wersja eksportu: ${dump.version}`);
    if (!['merge', 'replace'].includes(mode)) throw new HttpError(400, 'mode: merge albo replace');
    const slides = (dump.slides || []).map((s) => (dump.version === 1 ? { ...s, frame: s.layout_id } : s));
    const counts = {};
    this.tx(() => {
      if (mode === 'replace') {
        for (const t of ['slides', 'offers', 'blocks', 'templates', 'components', 'component_sets', 'tiles', 'scenarios']) this.db.exec(`DELETE FROM ${t}`);
      }
      counts.templates = 0;
      for (const t of dump.templates || []) {
        this.putTemplate({ ...t, file: Buffer.from(t.file_base64, 'base64') });
        counts.templates++;
      }
      // Kolejność ma znaczenie: slajdy wskazują na oferty.
      for (const [table, items] of [['blocks', dump.blocks], ['offers', dump.offers], ['slides', slides], ['components', dump.components], ['component_sets', dump.component_sets], ['tiles', dump.tiles], ['scenarios', dump.scenarios]]) {
        counts[table] = 0;
        for (const item of items || []) {
          this.upsert(table, item);
          counts[table]++;
        }
      }
    });
    return counts;
  }

  upsert(table, item) {
    if (!item.id || !idOk(table, item.id)) throw new HttpError(400, `${table}: rekord bez poprawnego id`);
    const ts = now();
    const row = { ...this.encode(table, item), id: item.id, created_at: item.created_at ?? ts, updated_at: item.updated_at ?? ts };
    const cols = Object.keys(row);
    const updates = cols.filter((c) => c !== 'id' && c !== 'created_at').map((c) => `${c} = excluded.${c}`);
    // ON CONFLICT DO UPDATE (a nie INSERT OR REPLACE), żeby nie odpalać ON DELETE CASCADE na slajdach.
    this.db
      .prepare(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `:${c}`).join(', ')})
         ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}`,
      )
      .run(row);
  }
}
