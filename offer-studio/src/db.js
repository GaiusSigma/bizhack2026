// Data layer: a single SQLite file (node:sqlite, no native dependencies).
//
// Model:
//   blocks    – knowledge units (use case, problem, rollout step, comparison row...).
//               `type` and `tags` are free-form strings; type-specific fields live in `data` (JSON).
//   templates – presentation templates: .figcraft files (BLOB). Every top-level frame = a template slide.
//   offers    – offer: name, template and variables (`data`, e.g. client, price).
//   slides    – ordered offer slides: template slide (`frame`) + content + blocks (list of ids or a query)
//               + `picks`: components picked for `#pick:<set>` slots ({set: [{component, data}]}).
//   components     – cards drawn in FigCraft (an `@set` frame holding the cards) with a description for the AI:
//                    what it shows, when to pick it, when to avoid it, topic (variants of one argument), tags.
//                    Rows are created and updated by the library sync; descriptions are written by a human or the AI.
//   component_sets – set rules for the AI (e.g. "exactly one highlighted card").
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';

const SCHEMA_VERSION = 3;

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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS slides_offer ON slides(offer_id, position);

CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,                     -- "<set>/<card name>", e.g. why/on-premise
  set_name TEXT NOT NULL,
  key TEXT NOT NULL,
  source TEXT,                             -- library file (templates.id)
  title TEXT NOT NULL DEFAULT '',          -- short name for humans
  description TEXT NOT NULL DEFAULT '',    -- what the card shows (content, look)
  use_when TEXT NOT NULL DEFAULT '',       -- when the AI should pick it
  avoid_when TEXT NOT NULL DEFAULT '',     -- when not to pick it
  topic TEXT NOT NULL DEFAULT '',          -- variants of the same argument share a topic
  variant TEXT NOT NULL DEFAULT '',        -- e.g. regular, highlight, stat
  tags TEXT NOT NULL DEFAULT '[]',
  data TEXT NOT NULL DEFAULT '{}',         -- fixed overrides of the card's {{...}} fields
  figma_text TEXT NOT NULL DEFAULT '',     -- text drawn in FigCraft (from sync)
  fields TEXT NOT NULL DEFAULT '[]',       -- the card's {{...}} fields (from sync)
  missing INTEGER NOT NULL DEFAULT 0,      -- 1: the card is no longer in the library
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS components_set ON components(set_name);

CREATE TABLE IF NOT EXISTS component_sets (
  id TEXT PRIMARY KEY,                     -- set name without @
  title TEXT NOT NULL DEFAULT '',
  rules TEXT NOT NULL DEFAULT '',          -- picking rules for the AI
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

// Table spec: which columns are JSON, which can be set via the API, default sort order.
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
    fields: ['offer_id', 'position', 'frame', 'data', 'block_ids', 'query', 'picks', 'hidden'],
    json: { data: {}, block_ids: [], query: null, picks: {} },
    bool: ['hidden'],
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
};

// Component fields described by a human (the rest comes from the library sync).
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
// Components have the id "<set>/<card>" (both parts slugified).
const COMPONENT_ID_RE = /^[a-z0-9][a-z0-9-]{0,59}\/[a-z0-9][a-z0-9-]{0,79}$/;
const idOk = (table, id) => (table === 'components' ? COMPONENT_ID_RE : ID_RE).test(id);
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

// v1 (HTML layouts) -> v2 (FigCraft templates): blocks and offers stay, slides get a `frame` column.
// v2 -> v3: slides get `picks` (components); the components and component_sets tables are created by SCHEMA.
// Returns the version migrated from (0 = new or already up-to-date database).
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

  // ------------------------------------------------------------ generic CRUD
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
    if (!row) throw new HttpError(404, `${table}/${id}: no such record`);
    return row;
  }

  insert(table, obj, idPrefix = '') {
    const id = obj.id ?? newId(idPrefix);
    if (!idOk(table, id)) throw new HttpError(400, `Invalid id "${id}" (letters, digits, . _ -, max 80 characters)`);
    if (this.get(table, id)) throw new HttpError(409, `${table}/${id} already exists`);
    const ts = now();
    const row = { ...this.encode(table, obj), id, created_at: obj.created_at ?? ts, updated_at: obj.updated_at ?? ts };
    const cols = Object.keys(row);
    this.db
      .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `:${c}`).join(', ')})`)
      .run(row);
    return this.get(table, id);
  }

  // PATCH: fields given in `patch` replace the old ones. Exception: the `data` object is shallow-merged
  // (a key set to null removes the field), unless `replaceData` = true.
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
    if (!r.changes) throw new HttpError(404, `${table}/${id}: no such record`);
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

  // ------------------------------------------------------------ knowledge blocks
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

  // ------------------------------------------------------------ templates
  templateFile(id) {
    const r = this.db.prepare('SELECT file, updated_at FROM templates WHERE id = ?').get(id);
    if (!r) throw new HttpError(404, `templates/${id}: no such template`);
    return { file: Buffer.from(r.file), updated_at: r.updated_at };
  }

  putTemplate({ id, name, file, created_at, updated_at }) {
    if (!ID_RE.test(id)) throw new HttpError(400, `Invalid template id "${id}"`);
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO templates (id, name, file, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, file = excluded.file, updated_at = excluded.updated_at`,
      )
      .run(id, name || id, file, created_at || ts, updated_at || ts);
    return this.get('templates', id);
  }

  // ------------------------------------------------------------ components
  // Library sync: `found` = [{id, set, key, source, title, text, fields}] from all files.
  // New cards get a row (empty description, to be filled in), existing ones only text/fields/source,
  // and cards that are gone are marked `missing` (descriptions stay in case they come back).
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

  // ------------------------------------------------------------ offers and slides
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
      throw new HttpError(400, 'The id list must contain exactly all slides of this offer');
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
      const copy = this.insert('offers', { name: name || `${src.name} (copy)`, template_id: src.template_id, data: src.data }, src.name);
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

  isEmpty() {
    return !this.db.prepare('SELECT 1 FROM templates LIMIT 1').get() && !this.db.prepare('SELECT 1 FROM blocks LIMIT 1').get();
  }

  // ------------------------------------------------------------ export / import
  exportAll() {
    const templates = this.db
      .prepare('SELECT * FROM templates ORDER BY id')
      .all()
      .map((t) => ({ id: t.id, name: t.name, created_at: t.created_at, updated_at: t.updated_at, file_base64: Buffer.from(t.file).toString('base64') }));
    return {
      format: 'offer-studio',
      version: 3,
      exported_at: now(),
      blocks: this.list('blocks'),
      templates,
      offers: this.list('offers'),
      slides: this.list('slides'),
      components: this.list('components'),
      component_sets: this.list('component_sets'),
    };
  }

  // mode = 'merge' (insert or overwrite records with the same ids, leave the rest alone)
  //      | 'replace' (clear everything and load only what is in the file)
  // A v1 export (HTML layouts) loads blocks and offers; layouts, images and the theme are skipped.
  // A v2 export has no components: the library sync adds them after the import.
  importAll(dump, mode = 'merge') {
    if (!dump || dump.format !== 'offer-studio') throw new HttpError(400, 'This is not an offer-studio export (missing format: "offer-studio")');
    if (![1, 2, 3].includes(dump.version)) throw new HttpError(400, `Unsupported export version: ${dump.version}`);
    if (!['merge', 'replace'].includes(mode)) throw new HttpError(400, 'mode: merge or replace');
    const slides = (dump.slides || []).map((s) => (dump.version === 1 ? { ...s, frame: s.layout_id } : s));
    const counts = {};
    this.tx(() => {
      if (mode === 'replace') {
        for (const t of ['slides', 'offers', 'blocks', 'templates', 'components', 'component_sets']) this.db.exec(`DELETE FROM ${t}`);
      }
      counts.templates = 0;
      for (const t of dump.templates || []) {
        this.putTemplate({ ...t, file: Buffer.from(t.file_base64, 'base64') });
        counts.templates++;
      }
      // Order matters: slides point to offers.
      for (const [table, items] of [['blocks', dump.blocks], ['offers', dump.offers], ['slides', slides], ['components', dump.components], ['component_sets', dump.component_sets]]) {
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
    if (!item.id || !idOk(table, item.id)) throw new HttpError(400, `${table}: record without a valid id`);
    const ts = now();
    const row = { ...this.encode(table, item), id: item.id, created_at: item.created_at ?? ts, updated_at: item.updated_at ?? ts };
    const cols = Object.keys(row);
    const updates = cols.filter((c) => c !== 'id' && c !== 'created_at').map((c) => `${c} = excluded.${c}`);
    // ON CONFLICT DO UPDATE (not INSERT OR REPLACE), so ON DELETE CASCADE doesn't fire on slides.
    this.db
      .prepare(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `:${c}`).join(', ')})
         ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}`,
      )
      .run(row);
  }
}
