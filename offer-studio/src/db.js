// Warstwa danych: jeden plik SQLite (node:sqlite, bez natywnych zależności).
//
// Model:
//   blocks   – jednostki wiedzy (use case, problem, krok wdrożenia, wiersz porównania...).
//              `type` i `tags` są dowolnymi stringami, a pola specyficzne dla typu siedzą w `data` (JSON).
//   layouts  – szablony slajdów (Handlebars + CSS). Zmiana wyglądu oferty = edycja layoutu, bez deployu.
//   offers   – oferta: nazwa + zmienne (`data`, np. klient, cena).
//   slides   – uporządkowane slajdy oferty: layout + dane slajdu + wybrane bloki (lista id albo zapytanie).
//   assets   – obrazki (BLOB), dostępne pod /assets/<id>.
//   settings – m.in. globalny CSS motywu (`theme_css`).
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';

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

CREATE TABLE IF NOT EXISTS layouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  template TEXT NOT NULL DEFAULT '',
  css TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slides (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  layout_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  block_ids TEXT NOT NULL DEFAULT '[]',
  query TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS slides_offer ON slides(offer_id, position);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// Opis tabel: które kolumny są JSON-em, które wolno ustawiać przez API, domyślne sortowanie.
export const TABLES = {
  blocks: {
    fields: ['type', 'title', 'body', 'data', 'tags'],
    json: { data: {}, tags: [] },
    order: 'type, title',
  },
  layouts: {
    fields: ['name', 'description', 'template', 'css'],
    json: {},
    order: 'name',
  },
  offers: {
    fields: ['name', 'data'],
    json: { data: {} },
    order: 'updated_at DESC',
  },
  slides: {
    fields: ['offer_id', 'position', 'layout_id', 'data', 'block_ids', 'query', 'hidden'],
    json: { data: {}, block_ids: [], query: null },
    bool: ['hidden'],
    order: 'offer_id, position',
  },
};

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

export function openDb(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return new Store(db);
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
    const sql = `SELECT * FROM ${table} ${where ? `WHERE ${where}` : ''} ORDER BY ${TABLES[table].order}`;
    return this.db.prepare(sql).all(params).map((r) => this.decode(table, r));
  }

  get(table, id) {
    return this.decode(table, this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
  }

  mustGet(table, id) {
    const row = this.get(table, id);
    if (!row) throw new HttpError(404, `${table}/${id}: nie ma takiego rekordu`);
    return row;
  }

  insert(table, obj, idPrefix = '') {
    const id = obj.id ?? newId(idPrefix);
    if (!ID_RE.test(id)) throw new HttpError(400, `Niepoprawne id "${id}" (litery, cyfry, . _ -, max 80 znaków)`);
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

  // ------------------------------------------------------------ oferty i slajdy
  getOffer(id) {
    const offer = this.mustGet('offers', id);
    offer.slides = this.list('slides', 'offer_id = :id', { id });
    return offer;
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
      const copy = this.insert('offers', { name: name || `${src.name} (kopia)`, data: src.data }, src.name);
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

  // ------------------------------------------------------------ assety i ustawienia
  listAssets() {
    return this.db
      .prepare('SELECT id, name, mime, length(data) AS size, created_at FROM assets ORDER BY id')
      .all()
      .map((r) => ({ ...r }));
  }

  getAsset(id) {
    return this.db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  }

  putAsset({ id, name, mime, data, created_at }) {
    if (!ID_RE.test(id)) throw new HttpError(400, `Niepoprawne id assetu "${id}"`);
    this.db
      .prepare(
        `INSERT INTO assets (id, name, mime, data, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, mime = excluded.mime, data = excluded.data`,
      )
      .run(id, name || id, mime, data, created_at || now());
    return this.listAssets().find((a) => a.id === id);
  }

  removeAsset(id) {
    const r = this.db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    if (!r.changes) throw new HttpError(404, `assets/${id}: nie ma takiego pliku`);
  }

  getSetting(key, def = '') {
    const r = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return r ? r.value : def;
  }

  setSetting(key, value) {
    this.db
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, String(value));
  }

  isEmpty() {
    return !this.db.prepare('SELECT 1 FROM layouts LIMIT 1').get() && !this.db.prepare('SELECT 1 FROM blocks LIMIT 1').get();
  }

  // ------------------------------------------------------------ eksport / import
  exportAll() {
    const raw = (t) => this.list(t);
    const settings = Object.fromEntries(
      this.db.prepare('SELECT key, value FROM settings ORDER BY key').all().map((r) => [r.key, r.value]),
    );
    const assets = this.db
      .prepare('SELECT * FROM assets ORDER BY id')
      .all()
      .map((a) => ({ id: a.id, name: a.name, mime: a.mime, created_at: a.created_at, data_base64: Buffer.from(a.data).toString('base64') }));
    return {
      format: 'offer-studio',
      version: 1,
      exported_at: now(),
      settings,
      blocks: raw('blocks'),
      layouts: raw('layouts'),
      offers: raw('offers'),
      slides: raw('slides'),
      assets,
    };
  }

  // mode = 'merge' (wstaw albo nadpisz rekordy o tych samych id, reszty nie rusza)
  //      | 'replace' (wyczyść wszystko i wczytaj tylko to, co w pliku)
  importAll(dump, mode = 'merge') {
    if (!dump || dump.format !== 'offer-studio') throw new HttpError(400, 'To nie jest eksport offer-studio (brak format: "offer-studio")');
    if (dump.version !== 1) throw new HttpError(400, `Nieobsługiwana wersja eksportu: ${dump.version}`);
    if (!['merge', 'replace'].includes(mode)) throw new HttpError(400, 'mode: merge albo replace');
    const counts = {};
    this.tx(() => {
      if (mode === 'replace') {
        for (const t of ['slides', 'offers', 'blocks', 'layouts', 'assets', 'settings']) this.db.exec(`DELETE FROM ${t}`);
      }
      // Kolejność ma znaczenie: slajdy wskazują na oferty.
      for (const table of ['blocks', 'layouts', 'offers', 'slides']) {
        counts[table] = 0;
        for (const item of dump[table] || []) {
          this.upsert(table, item);
          counts[table]++;
        }
      }
      counts.assets = 0;
      for (const a of dump.assets || []) {
        this.putAsset({ id: a.id, name: a.name, mime: a.mime, created_at: a.created_at, data: Buffer.from(a.data_base64, 'base64') });
        counts.assets++;
      }
      for (const [k, v] of Object.entries(dump.settings || {})) this.setSetting(k, v);
    });
    return counts;
  }

  upsert(table, item) {
    if (!item.id || !ID_RE.test(item.id)) throw new HttpError(400, `${table}: rekord bez poprawnego id`);
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
