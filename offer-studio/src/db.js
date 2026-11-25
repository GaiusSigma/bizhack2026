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

const SCHEMA_VERSION = 5;

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
  origin TEXT,                             -- JSON {step, label, matched}: where a tile-generated slide came from
  locked INTEGER NOT NULL DEFAULT 0,       -- 1: edited by hand, recompute leaves it alone
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

CREATE TABLE IF NOT EXISTS tiles (
  id TEXT PRIMARY KEY,                     -- "<category>:<slug>", e.g. pain:confidentiality
  category TEXT NOT NULL,                  -- role | segment | pain | product
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quotes TEXT NOT NULL DEFAULT '[]',       -- client quotes
  status TEXT NOT NULL DEFAULT 'active',   -- active | soon
  position INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',         -- e.g. {price} for a product
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,                    -- e.g. tile_content_rev: which seed content revision the data has
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,                     -- role tile id, e.g. role:board
  name TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',        -- steps: [{key, label, frame, data, data_by_product, fill, when}]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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

export const TILE_CATEGORIES = ['role', 'segment', 'pain', 'product'];
export const TILE_ID_RE = /^(role|segment|pain|product):[a-z0-9][a-z0-9-]{0,59}$/;
// `base` is the one base deck; a role tile id is a role-specific scenario (earlier versions).
const SCENARIO_ID_RE = /^(base(-[a-z0-9-]{1,40})?|role:[a-z0-9][a-z0-9-]{0,59})$/;

// Component fields described by a human (the rest comes from the library sync).
export const COMPONENT_EDITABLE = ['title', 'description', 'use_when', 'avoid_when', 'topic', 'variant', 'tags', 'data'];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const now = () => new Date().toISOString();

// JSON with sorted keys: compares records regardless of key order.
const stableJson = (v) => (Array.isArray(v) ? `[${v.map(stableJson).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableJson(v[k])}`).join(',')}}`
    : JSON.stringify(v ?? null));

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
    // v3 -> v4: slides get origin and lock; SCHEMA creates the tiles and scenarios tables.
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

  // Transaction; a nested one runs as a SAVEPOINT (an error inside rolls it back and is rethrown).
  tx(fn) {
    const depth = (this.txDepth ||= 0);
    const sp = `sp${depth}`;
    this.db.exec(depth ? `SAVEPOINT ${sp}` : 'BEGIN');
    this.txDepth = depth + 1;
    try {
      const r = fn();
      this.db.exec(depth ? `RELEASE ${sp}` : 'COMMIT');
      return r;
    } catch (e) {
      this.db.exec(depth ? `ROLLBACK TO ${sp}; RELEASE ${sp}` : 'ROLLBACK');
      throw e;
    } finally {
      this.txDepth = depth;
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

  // Runs a mergeRecompute plan (src/generate.js) in one transaction. Never sets `locked`:
  // recompute is the only slide change that does not mark slides as edited by hand.
  applyRecompute(offerId, { create = [], remove = [], hide = [], unhide = [], order = [] }) {
    this.mustGet('offers', offerId);
    const setHidden = (id, hidden) => {
      const cur = this.get('slides', id);
      if (!cur || cur.offer_id !== offerId) return;
      const { auto_hidden: _a, ...origin } = cur.origin || {};
      // origin.auto_hidden tells a recompute hide apart from a manual one
      this.db.prepare('UPDATE slides SET hidden = ?, origin = ? WHERE id = ?')
        .run(hidden ? 1 : 0, JSON.stringify(hidden ? { ...origin, auto_hidden: true } : origin), id);
    };
    this.tx(() => {
      for (const id of remove) this.db.prepare('DELETE FROM slides WHERE id = ? AND offer_id = ?').run(id, offerId);
      for (const id of hide) setHidden(id, true);
      for (const id of unhide) setHidden(id, false);
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

  // Tiles (v4) for databases that have none yet: tiles, scenarios, solution blocks, and tiles pinned
  // to existing content (appended to tags, nothing is removed). Runs only while the tiles table is empty,
  // so later starts change nothing.
  getSetting(key) {
    return this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key)?.value ?? null;
  }

  setSetting(key, value) {
    this.db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
  }

  ensureTiles(seed) {
    const counts = { tiles: 0, scenarios: 0, blocks: 0, tagged: 0 };
    const rev = seed.tileUpgrade?.rev ?? 1;
    if (this.db.prepare('SELECT 1 FROM tiles LIMIT 1').get()) {
      const have = Number(this.getSetting('tile_content_rev') || 1);
      if (have < rev) this.tx(() => { this.upgradeTileContent(seed, counts); this.setSetting('tile_content_rev', rev); });
      return counts;
    }
    this.setSetting('tile_content_rev', rev);
    this.tx(() => {
      for (const t of seed.tiles || []) { this.upsert('tiles', t); counts.tiles++; }
      for (const sc of seed.scenarios || []) if (!this.get('scenarios', sc.id)) { this.upsert('scenarios', sc); counts.scenarios++; }
      for (const b of seed.solutionBlocks || []) if (!this.get('blocks', b.id)) { this.upsert('blocks', b); counts.blocks++; }
      // Order from the seed (e.g. rollout steps): the generator breaks ties with it.
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

  // Databases created by the first, Polish version keep Polish seed records under Polish ids after the
  // English translation (seed data only loads into an empty database). This replaces them with their
  // English counterparts (seed/legacy-pl.js maps the ids) and re-points every offer to them:
  // - a full export of the database is saved first (setting legacy_pl_backup), so nothing is lost;
  // - seed blocks, cards, the card set and the base offer are swapped for the English versions;
  // - slides in every offer get the new frame names, block and card ids; slide copy that is still the
  //   Polish default becomes the English default, copy written for a client stays as it is;
  // - the report (setting legacy_pl_report) lists seed records edited by hand before the switch,
  //   whose edited text lives only in the backup.
  // Returns null when there is nothing Polish to migrate. The template file is swapped in src/server.js.
  migrateLegacyPolish(legacy, seed) {
    const renamedFrames = Object.entries(legacy.frames).filter(([pl, en]) => pl !== en).map(([pl]) => pl);
    if (this.getSetting('legacy_pl_report')) return null;
    const hasLegacy = legacy.blocks.some((b) => b.id !== b.en && this.get('blocks', b.id))
      || legacy.components.some((c) => c.id !== c.en && this.get('components', c.id))
      || Object.keys(legacy.componentSets).some((id) => this.get('component_sets', id))
      || Object.keys(legacy.offers).some((id) => this.get('offers', id))
      || !!this.db.prepare(`SELECT 1 FROM slides WHERE frame IN (${renamedFrames.map(() => '?').join(', ')}) LIMIT 1`).get(...renamedFrames);
    if (!hasLegacy) return null;

    const same = (a, b) => stableJson(a) === stableJson(b);
    const withoutOrder = ({ order: _o, ...rest } = {}) => rest;
    const blockMap = Object.fromEntries(legacy.blocks.map((b) => [b.id, b.en]));
    const compMap = Object.fromEntries(legacy.components.map((c) => [c.id, c.en]));
    const seedBlocks = Object.fromEntries((seed.blocks || []).map((b) => [b.id, b]));
    const seedComps = Object.fromEntries((seed.components || []).map((c) => [c.id, c]));
    const seedSets = Object.fromEntries((seed.component_sets || []).map((c) => [c.id, c]));
    const plDefault = Object.fromEntries(legacy.slides.map((s) => [s.frame, s.data]));
    const enDefault = Object.fromEntries((seed.slides || []).map((s) => [s.frame, s.data]));
    const report = { migratedAt: now(), editedBlocks: [], editedCards: [], keptOfferCopy: [] };
    const backup = JSON.stringify(this.exportAll());

    this.tx(() => {
      this.setSetting('legacy_pl_backup', backup);
      for (const b of legacy.blocks) {
        const cur = this.get('blocks', b.id);
        if (!cur) continue;
        if (cur.title !== b.title || cur.body !== b.body || !same(withoutOrder(cur.data), withoutOrder(b.data))) report.editedBlocks.push(b.id);
        // same id in both versions (e.g. cmp-word): the record stays and gets the English content
        if (b.id === b.en) { if (seedBlocks[b.en]) this.upsert('blocks', { ...seedBlocks[b.en], tags: [...new Set([...cur.tags, ...seedBlocks[b.en].tags])] }); continue; }
        if (!this.get('blocks', b.en) && seedBlocks[b.en]) this.upsert('blocks', seedBlocks[b.en]);
        this.db.prepare('DELETE FROM blocks WHERE id = ?').run(b.id);
      }
      for (const c of legacy.components) {
        const cur = this.get('components', c.id);
        if (!cur) continue;
        if (['title', 'description', 'use_when', 'avoid_when'].some((k) => (cur[k] || '') !== (c[k] || ''))) report.editedCards.push(c.id);
        if (c.id === c.en) { if (seedComps[c.en]) this.upsert('components', seedComps[c.en]); continue; }
        if (!this.get('components', c.en) && seedComps[c.en]) this.upsert('components', seedComps[c.en]);
        this.db.prepare('DELETE FROM components WHERE id = ?').run(c.id);
      }
      for (const [pl, en] of Object.entries(legacy.componentSets)) {
        if (!this.get('component_sets', pl)) continue;
        if (!this.get('component_sets', en) && seedSets[en]) this.upsert('component_sets', seedSets[en]);
        this.db.prepare('DELETE FROM component_sets WHERE id = ?').run(pl);
      }
      for (const [pl, en] of Object.entries(legacy.offers)) {
        if (!this.get('offers', pl)) continue;
        if (!this.get('offers', en)) {
          const offer = (seed.offers || []).find((o) => o.id === en);
          if (offer) {
            this.upsert('offers', offer);
            for (const s of seed.slides || []) this.upsert('slides', { ...s, offer_id: en });
          }
        }
        this.db.prepare('DELETE FROM slides WHERE offer_id = ?').run(pl);
        this.db.prepare('DELETE FROM offers WHERE id = ?').run(pl);
      }
      for (const s of this.list('slides')) {
        const frame = legacy.frames[s.frame] || s.frame;
        const block_ids = (s.block_ids || []).map((id) => blockMap[id] || id);
        const picks = Object.fromEntries(Object.entries(s.picks || {}).map(([set, list]) => [
          legacy.componentSets[set] || set,
          (list || []).map((p) => ({ ...p, component: compMap[p.component] || p.component })),
        ]));
        let data = s.data || {};
        if (plDefault[s.frame] && same(data, plDefault[s.frame])) data = enDefault[frame] || {};
        else if (frame !== s.frame && Object.keys(data).length) report.keptOfferCopy.push(`${s.offer_id}/${s.id}`);
        const changed = frame !== s.frame || !same(block_ids, s.block_ids) || !same(picks, s.picks) || data !== s.data;
        if (changed) this.update('slides', s.id, { frame, block_ids, picks, data }, { replaceData: true });
      }
      this.setSetting('legacy_pl_report', JSON.stringify(report));
    });
    return report;
  }

  // Brings tile content from an older seed revision up to date (see seed/tiles.js tileUpgrade).
  upgradeTileContent(seed, counts) {
    const prev = seed.tileUpgrade?.previousDescriptions || {};
    // The base deck replaces the per-role scenarios of earlier versions.
    for (const sc of seed.scenarios || []) if (!this.get('scenarios', sc.id)) { this.upsert('scenarios', sc); counts.scenarios++; }
    for (const id of seed.retiredScenarios || []) if (this.get('scenarios', id)) this.db.prepare('DELETE FROM scenarios WHERE id = ?').run(id);
    // The base deck's writing hints and per-role copy follow the seed (they are not edited in the app); labels,
    // order, fills and the default copy (data) edited in the Scenarios tab stay, and so do deleted steps.
    const SEEDED = ['write', 'data_by_role', 'data_by_role_product'];
    for (const sc of seed.scenarios || []) {
      const cur = this.get('scenarios', sc.id);
      if (!cur) continue;
      const byKey = Object.fromEntries(sc.steps.map((st) => [st.key, st]));
      let changed = false;
      const steps = cur.steps.map((st) => {
        const f = byKey[st.key];
        if (!f) return st;
        const next = { ...st };
        for (const k of SEEDED) if (f[k] === undefined) delete next[k]; else next[k] = f[k];
        if (JSON.stringify(next) !== JSON.stringify(st)) changed = true;
        return next;
      });
      if (changed) { this.update('scenarios', sc.id, { steps }); counts.scenarios++; }
    }
    for (const b of seed.solutionBlocks || []) {
      const cur = this.get('blocks', b.id);
      if (!cur) { this.upsert('blocks', b); counts.blocks++; continue; }
      const tiles = b.tags.filter((t) => t.includes(':'));
      const tags = [...cur.tags.filter((t) => !t.includes(':')), ...tiles];
      // Sources written by this seed start with "Sales sheet"; those follow the seed, anything else was written by hand.
      const generated = !cur.data?.source || String(cur.data.source).startsWith('Sales sheet');
      const data = generated && cur.data?.source !== b.data.source ? { source: b.data.source } : {};
      if (JSON.stringify(tags) === JSON.stringify(cur.tags) && !Object.keys(data).length) continue;
      this.update('blocks', b.id, { tags, ...(Object.keys(data).length ? { data } : {}) });
      counts.tagged++;
    }
    for (const [id, add] of Object.entries(seed.tileTags || {})) {
      const table = id.includes('/') ? 'components' : 'blocks';
      const cur = this.get(table, id);
      if (!cur) continue;
      const tags = [...new Set([...cur.tags, ...add])];
      if (tags.length !== cur.tags.length) { this.update(table, id, { tags }); counts.tagged++; }
    }
    for (const t of seed.tiles || []) {
      const cur = this.get('tiles', t.id);
      if (!cur) { this.upsert('tiles', t); counts.tiles++; continue; }
      const patch = {};
      const data = {};
      for (const k of ['pick_when', 'avoid_when', 'writing_brief']) if (!cur.data?.[k] && t.data?.[k]) data[k] = t.data[k];
      if (Object.keys(data).length) patch.data = data;
      if (prev[t.id] != null && cur.description === prev[t.id] && t.description !== cur.description) patch.description = t.description;
      if (Object.keys(patch).length) this.update('tiles', t.id, patch);
    }
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

  // mode = 'merge' (insert or overwrite records with the same ids, leave the rest alone)
  //      | 'replace' (clear everything and load only what is in the file)
  // A v1 export (HTML layouts) loads blocks and offers; layouts, images and the theme are skipped.
  // A v2 export has no components: the library sync adds them after the import.
  importAll(dump, mode = 'merge') {
    if (!dump || dump.format !== 'offer-studio') throw new HttpError(400, 'This is not an offer-studio export (missing format: "offer-studio")');
    if (![1, 2, 3, 4].includes(dump.version)) throw new HttpError(400, `Unsupported export version: ${dump.version}`);
    if (!['merge', 'replace'].includes(mode)) throw new HttpError(400, 'mode: merge or replace');
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
      // Order matters: slides point to offers.
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
