import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickComponents } from './ai.js';
import { COMPONENT_EDITABLE, HttpError, openDb, slugify } from './db.js';
import {
  buildLibrary, describeComponents, describeTemplate, hashOf, normalizeUpload, parseTemplate, renderFigcraft, renderPdf, renderPreview, renderThumbnails, UPLOAD_EXT,
} from './figcraft.js';
import { apiRoutes, buildSpec } from './openapi.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const PORT = Number(env.PORT || 3000);
const DB_PATH = env.STUDIO_DB || join(ROOT, 'data', 'studio.db');
const PASSWORD = env.STUDIO_PASSWORD || '';
const API_TOKEN = env.STUDIO_API_TOKEN || '';
const FIGCRAFT_WEB_URL = env.FIGCRAFT_WEB_URL || '';

mkdirSync(dirname(DB_PATH), { recursive: true });
const store = openDb(DB_PATH);

// ------------------------------------------------------------------ dane startowe i migracja z v1
const seedModule = await import('../seed/seed.js');
const seedTemplate = () => {
  const t = seedModule.TEMPLATE;
  store.putTemplate({ id: t.id, name: t.name, file: readFileSync(join(ROOT, 'seed', t.file)) });
};
if (store.isEmpty() && env.STUDIO_SEED !== 'false') {
  const counts = store.importAll(seedModule.default, 'merge');
  seedTemplate();
  console.log('offer-studio: pusta baza, wczytano dane startowe', counts);
} else if (store.migratedFromV1) {
  // v1 miało layouty HTML: dokładamy szablon FigCraft, a ofercie bazowej dajemy slajdy pod nowy szablon.
  if (!store.get('templates', seedModule.TEMPLATE.id)) seedTemplate();
  store.tx(() => {
    store.db.prepare('UPDATE offers SET template_id = ? WHERE template_id IS NULL').run(seedModule.TEMPLATE.id);
    if (store.get('offers', 'gaius-vault-bazowa')) {
      store.db.prepare('DELETE FROM slides WHERE offer_id = ?').run('gaius-vault-bazowa');
      for (const s of seedModule.slides) store.upsert('slides', s);
    }
  });
  console.log('offer-studio: zmigrowano bazę z layoutów HTML na szablony FigCraft');
}
// Komponenty (v3): baza z plikiem Gaius sprzed komponentów (bez ramek @…) i bez opisów kart dostaje
// nowy plik Gaius (zestaw @dlaczego, sloty #pick), opisy kart i wybór kart na slajdzie „dlaczego”
// (jeśli nikt go jeszcze nie ustawił). Sprawdzane przy każdym starcie, działa raz.
const gaiusRow = store.get('templates', seedModule.TEMPLATE.id);
if (gaiusRow && env.STUDIO_SEED !== 'false' && !store.list('components').length
  && !parseTemplate(store.templateFile(gaiusRow.id).file).components.length) {
  store.tx(() => {
    seedTemplate();
    for (const c of seedModule.components) if (!store.get('components', c.id)) store.upsert('components', c);
    for (const cs of seedModule.componentSets) if (!store.get('component_sets', cs.id)) store.upsert('component_sets', cs);
    const seedSlide = seedModule.slides.find((x) => x.id === 's-dlaczego');
    const cur = store.get('slides', 's-dlaczego');
    if (cur && !Object.keys(cur.picks || {}).length) store.update('slides', cur.id, { picks: seedSlide.picks, block_ids: [] });
  });
  console.log('offer-studio: dodano komponenty (zestaw @dlaczego) i ich opisy');
}

// ------------------------------------------------------------------ live: Server-Sent Events
const listeners = new Set();
const emit = (ev) => { for (const fn of listeners) fn(ev); };

// ------------------------------------------------------------------ biblioteka slajdów (FigCraft)
// Pliki ze slajdami (tabela templates) -> każdy rozbierany osobno (lista slajdów, pola),
// a do renderu sklejane w jeden dokument biblioteki (cache do następnej zmiany plików).
const parsedCache = new Map();
function template(id) {
  const { file, updated_at } = store.templateFile(id);
  const hit = parsedCache.get(id);
  if (hit?.updated_at === updated_at) return { file, parsed: hit.parsed, updated_at };
  const parsed = parseTemplate(file);
  parsedCache.set(id, { updated_at, parsed });
  return { file, parsed, updated_at };
}

let libCache = null;
let libBuilding = null;
async function library() {
  const sources = store.list('templates');
  const key = hashOf(sources.map((s) => [s.id, s.updated_at]));
  if (libCache?.key === key) return libCache;
  if (libBuilding?.key === key) return libBuilding.promise;
  const promise = buildLibrary(sources.map((s) => ({ file: store.templateFile(s.id).file })))
    .then((lib) => (libCache = { key, ...lib }))
    .finally(() => { if (libBuilding?.key === key) libBuilding = null; });
  libBuilding = { key, promise };
  return promise;
}

// Lista slajdów biblioteki: [{frame, source, source_name, width, height, fields, slots, thumb}]
function librarySlides() {
  return store.list('templates').flatMap((t) => {
    const { parsed, updated_at } = template(t.id);
    const v = hashOf([t.id, updated_at]).slice(0, 8);
    return describeTemplate(parsed).map((f) => ({
      frame: f.name, source: t.id, source_name: t.name, width: f.width, height: f.height, fields: f.fields, slots: f.slots,
      thumb: `/thumb/${encodeURIComponent(t.id)}/${v}/${encodeURIComponent(f.name)}`,
    }));
  });
}

// Komponenty ze wszystkich plików biblioteki -> tabela components (opisy zostają, tekst i pola się odświeżają).
function libraryComponents() {
  return store.list('templates').flatMap((t) => {
    const { parsed, updated_at } = template(t.id);
    const v = hashOf([t.id, updated_at]).slice(0, 8);
    return describeComponents(parsed).map((c) => ({
      ...c, source: t.id, source_name: t.name,
      thumb: `/thumb/${encodeURIComponent(t.id)}/${v}/${encodeURIComponent(`@${c.id}`)}`,
    }));
  });
}
function syncComponents() {
  const found = libraryComponents();
  const stats = store.syncComponents(found);
  if (stats.added.length || stats.missing.length) console.log('offer-studio: komponenty', stats);
  return stats;
}
// Komponenty z bazy + miniatura i dane z biblioteki.
function componentsView({ set, includeMissing } = {}) {
  const lib = Object.fromEntries(libraryComponents().map((c) => [c.id, c]));
  return store.listComponents({ set, includeMissing }).map((c) => ({ ...c, thumb: lib[c.id]?.thumb || null, source_name: lib[c.id]?.source_name || null }));
}

const thumbCache = new Map(); // `${id}@${updated_at}` -> Promise<{frame: png}>
function thumbs(id) {
  const { file, parsed, updated_at } = template(id);
  const key = `${id}@${updated_at}`;
  if (!thumbCache.has(key)) {
    for (const k of thumbCache.keys()) if (k.startsWith(`${id}@`)) thumbCache.delete(k);
    const p = renderThumbnails(file, parsed);
    p.catch(() => thumbCache.delete(key));
    thumbCache.set(key, p);
  }
  return thumbCache.get(key);
}

// Wgranie pliku ze slajdami: konwersja do .figcraft, walidacja nazw slajdów (unikalne w całej bibliotece).
async function uploadSource({ buf, filename, id, name }) {
  const file = await normalizeUpload(buf, filename);
  const parsed = parseTemplate(file);
  if (!parsed.frames.length) throw new HttpError(400, 'W pliku nie ma żadnej ramki (slajdu) najwyższego poziomu');
  const names = parsed.frames.map((f) => f.name);
  const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  if (dupes.length) throw new HttpError(400, `Ramki w pliku muszą mieć różne nazwy. Powtarzają się: ${dupes.join(', ')}`);
  const sourceId = id || slugify(String(filename || parsed.name || 'slajdy').replace(/\.[a-z]+$/i, ''));
  const taken = librarySlides().filter((s) => s.source !== sourceId && names.includes(s.frame));
  if (taken.length) {
    throw new HttpError(409, `Slajdy o tych nazwach są już w innym pliku: ${taken.map((s) => `„${s.frame}” (${s.source_name})`).join(', ')}. Zmień nazwę ramki w FigCraft albo podmień tamten plik.`);
  }
  const compIds = parsed.components.map((c) => c.id);
  const compDupes = [...new Set(compIds.filter((n, i) => compIds.indexOf(n) !== i))];
  if (compDupes.length) throw new HttpError(400, `Karty w zestawie muszą mieć różne nazwy. Powtarzają się: ${compDupes.join(', ')}`);
  const compTaken = libraryComponents().filter((c) => c.source !== sourceId && compIds.includes(c.id));
  if (compTaken.length) {
    throw new HttpError(409, `Komponenty o tych nazwach są już w innym pliku: ${compTaken.map((c) => `„${c.id}” (${c.source_name})`).join(', ')}. Zmień nazwę zestawu (@…) albo karty.`);
  }
  const t = store.putTemplate({ id: sourceId, name: name || store.get('templates', sourceId)?.name || String(filename || parsed.name).replace(/\.[a-z]+$/i, ''), file });
  const sync = syncComponents();
  return { ...t, frames: describeTemplate(parsed), components: describeComponents(parsed), new_components: sync.added };
}

// Bloki slajdu: jawna lista `block_ids` (w tej kolejności) albo zapytanie `query` {type, tag, limit}.
function resolveBlocks(slide) {
  let blocks = [];
  if (slide.block_ids?.length) {
    blocks = slide.block_ids.map((id) => store.get('blocks', id)).filter(Boolean);
  } else if (slide.query && (slide.query.type || slide.query.tag)) {
    blocks = store.listBlocks({ type: slide.query.type, tag: slide.query.tag });
    blocks.sort((a, b) => (a.data?.order ?? 1e9) - (b.data?.order ?? 1e9) || a.title.localeCompare(b.title, 'pl'));
    if (slide.query.limit) blocks = blocks.slice(0, Number(slide.query.limit));
  }
  // pola z `data` są dostępne wprost: {{effect}} zamiast {{data.effect}}
  return blocks.map((b) => ({ ...b.data, id: b.id, type: b.type, title: b.title, body: b.body }));
}

// "etykieta | wartość" w każdej linii -> [{title, value, value2…}]
const lines = (text) =>
  String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [title, value = '', ...rest] = l.split('|').map((x) => x.trim());
    return { title, value, ...Object.fromEntries(rest.map((v, i) => [`value${i + 2}`, v])) };
  });

async function renderInput(offerId, { includeHidden }) {
  const offer = store.getOffer(offerId);
  const lib = await library();
  const frames = {};
  for (const f of lib.parsed.frames) frames[f.name] ??= f;
  const comps = Object.fromEntries(lib.parsed.components.map((c) => [c.id, c]));
  const report = [];
  const slides = [];
  for (const s of offer.slides) {
    const f = frames[s.frame];
    const entry = { id: s.id, frame: s.frame, hidden: s.hidden };
    report.push(entry);
    if (!f) { entry.error = `W bibliotece nie ma slajdu "${s.frame}"`; continue; }
    if (s.hidden && !includeHidden) { entry.skipped = true; continue; }
    const items = {};
    for (const source of f.fields.sources) items[source] = source === 'blocks' ? resolveBlocks(s) : lines(s.data?.[source]);
    const picks = {};
    for (const [set, chosen] of Object.entries(s.picks || {})) {
      if (!f.fields.picks[set] || !Array.isArray(chosen)) continue;
      picks[set] = [];
      for (const p of chosen) {
        const comp = comps[p.component];
        if (!comp) { (entry.warnings ||= []).push(`brak komponentu ${p.component} w bibliotece`); continue; }
        picks[set].push({ comp, data: { ...(store.get('components', p.component)?.data || {}), ...(p.data || {}) } });
      }
    }
    entry.index = slides.length;
    slides.push({ id: s.id, frame: s.frame, data: s.data || {}, items, picks });
  }
  return {
    offer,
    report,
    input: { templateBuf: lib.buf, parsed: lib.parsed, slides, offer: { id: offer.id, name: offer.name, ...offer.data } },
    key: hashOf({ l: lib.key, o: offer.data, s: slides.map((x) => ({ ...x, picks: Object.fromEntries(Object.entries(x.picks).map(([k, v]) => [k, v.map((p) => [p.comp.id, p.data])])) })) }),
  };
}

// Podgląd PNG: cache per oferta, jeden render naraz na ofertę.
const previews = new Map(); // offerId -> {key, pngs, report, ms, error}
const inflight = new Map();
async function preview(offerId) {
  let ri;
  try {
    ri = await renderInput(offerId, { includeHidden: true });
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) throw e;
    const offer = store.getOffer(offerId);
    return { key: 'error', pngs: [], ms: 0, error: e.message, report: offer.slides.map((s) => ({ id: s.id, frame: s.frame, hidden: s.hidden })) };
  }
  const { key, input, report } = ri;
  const cached = previews.get(offerId);
  if (cached?.key === key) return cached;
  const running = inflight.get(offerId);
  if (running?.key === key) return running.promise;
  const promise = (async () => {
    if (running) await running.promise.catch(() => {});
    const t = Date.now();
    try {
      const pngs = input.slides.length ? await renderPreview(input) : [];
      const result = { key, pngs, report, ms: Date.now() - t };
      previews.set(offerId, result);
      return result;
    } catch (e) {
      const result = { key, pngs: [], report, ms: Date.now() - t, error: e.message };
      previews.set(offerId, result);
      return result;
    } finally {
      if (inflight.get(offerId)?.key === key) inflight.delete(offerId);
    }
  })();
  inflight.set(offerId, { key, promise });
  return promise;
}

// Kontekst doboru kart dla slajdu: zestawy ze slotami #pick, zasady i opisy kart z bazy.
// Ten sam JSON dostaje Claude (POST /slides/:id/pick) i każdy zewnętrzny agent (GET …/pick-context).
function pickContext(slideId) {
  const slide = store.mustGet('slides', slideId);
  const offer = store.mustGet('offers', slide.offer_id);
  const frame = librarySlides().find((f) => f.frame === slide.frame);
  if (!frame) throw new HttpError(400, `W bibliotece nie ma slajdu "${slide.frame}"`);
  const pickSets = Object.entries(frame.fields.picks || {});
  if (!pickSets.length) throw new HttpError(400, `Slajd "${slide.frame}" nie ma slotów #pick:… na komponenty`);
  return {
    offer: { id: offer.id, name: offer.name, data: offer.data },
    slide: { id: slide.id, frame: slide.frame, data: slide.data, picks: slide.picks },
    sets: pickSets.map(([set, slots]) => {
      const meta = store.get('component_sets', set);
      return {
        set, slots, title: meta?.title || set, rules: meta?.rules || '',
        components: store.listComponents({ set }).map(({ created_at: _c, updated_at: _u, missing: _m, source: _s, set_name: _n, key: _k, ...c }) => c),
      };
    }),
  };
}

try {
  syncComponents();
} catch (e) {
  console.error('offer-studio: synchronizacja komponentów nie powiodła się:', e.message);
}

const safeEq = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

// ------------------------------------------------------------------ aplikacja
const app = new Hono();

app.onError((err, c) => {
  const status = err instanceof HttpError ? err.status : err instanceof SyntaxError ? 400 : 500;
  if (status === 500) console.error(err);
  return c.json({ error: err.message }, status);
});

app.get('/healthz', (c) => c.text('ok'));

// Logowanie: Basic (hasło STUDIO_PASSWORD, dowolny login) albo Bearer STUDIO_API_TOKEN.
// Bez obu zmiennych aplikacja jest otwarta (tylko do pracy lokalnej).
app.use('*', async (c, next) => {
  if (!PASSWORD && !API_TOKEN) return next();
  const h = c.req.header('authorization') || '';
  if (API_TOKEN && h.startsWith('Bearer ') && safeEq(h.slice(7).trim(), API_TOKEN)) return next();
  if (PASSWORD && h.startsWith('Basic ')) {
    const decoded = Buffer.from(h.slice(6), 'base64').toString('utf8');
    const pw = decoded.slice(decoded.indexOf(':') + 1);
    if (safeEq(pw, PASSWORD)) return next();
  }
  return c.text('Wymagane logowanie', 401, { 'WWW-Authenticate': 'Basic realm="Offer Studio", charset="UTF-8"' });
});

app.use('/static/*', serveStatic({
  root: join(ROOT, 'public'),
  rewriteRequestPath: (p) => p.replace(/^\/static/, ''),
  onFound: (_path, c) => c.header('Cache-Control', 'no-cache'),
}));
app.get('/', (c) => c.html(readFileSync(join(ROOT, 'public', 'index.html'), 'utf8')));

app.get('/thumb/:source/:v/:frame', async (c) => {
  const all = await thumbs(c.req.param('source'));
  const png = all[c.req.param('frame')];
  if (!png) return c.text('not found', 404);
  return c.body(png, 200, { 'content-type': 'image/png', 'cache-control': 'private, max-age=86400, immutable' });
});

app.get('/preview-img/:offer/:key/:n', (c) => {
  const p = previews.get(c.req.param('offer'));
  const n = Number.parseInt(c.req.param('n'), 10);
  if (!p || p.key !== c.req.param('key') || !p.pngs[n]) return c.text('not found', 404);
  return c.body(p.pngs[n], 200, { 'content-type': 'image/png', 'cache-control': 'private, max-age=86400, immutable' });
});

// ------------------------------------------------------------------ API
const api = new Hono();

const body = async (c) => {
  try {
    return await c.req.json();
  } catch {
    throw new HttpError(400, 'Oczekiwano JSON w treści żądania');
  }
};
const changed = (table, id, extra = {}) => emit({ table, id, ...extra });

api.get('/events', (c) =>
  streamSSE(c, async (stream) => {
    const send = (ev) => stream.writeSSE({ data: JSON.stringify(ev) }).catch(() => {});
    listeners.add(send);
    stream.onAbort(() => listeners.delete(send));
    await stream.writeSSE({ data: JSON.stringify({ type: 'hello' }) });
    while (!stream.aborted) {
      await stream.sleep(25_000);
      await stream.writeSSE({ event: 'ping', data: '{}' }).catch(() => {});
    }
    listeners.delete(send);
  }),
);

// Opis API dla n8n i innych klientów: budowany z zarejestrowanych tras (zob. src/openapi.js).
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
let spec;
api.get('/openapi.json', (c) => c.json((spec ??= buildSpec(apiRoutes(app), { version: VERSION }))));

api.get('/meta', (c) => c.json({ ...store.meta(), figcraftWebUrl: FIGCRAFT_WEB_URL }));

// bloki
api.get('/blocks', (c) => c.json(store.listBlocks({ type: c.req.query('type'), tag: c.req.query('tag'), q: c.req.query('q') })));
api.get('/blocks/:id', (c) => c.json(store.mustGet('blocks', c.req.param('id'))));
api.post('/blocks', async (c) => {
  const b = await body(c);
  const items = Array.isArray(b) ? b : [b];
  for (const it of items) if (!it.type || typeof it.type !== 'string') throw new HttpError(400, 'Blok musi mieć "type"');
  const created = store.tx(() => items.map((it) => store.insert('blocks', it, it.title ? `${it.type}-${it.title}`.slice(0, 40) : it.type)));
  changed('blocks', created.map((x) => x.id));
  return c.json(Array.isArray(b) ? created : created[0], 201);
});
api.patch('/blocks/:id', async (c) => {
  const b = store.update('blocks', c.req.param('id'), await body(c), { replaceData: c.req.query('replace') === '1' });
  changed('blocks', b.id);
  return c.json(b);
});
api.delete('/blocks/:id', (c) => {
  store.remove('blocks', c.req.param('id'));
  changed('blocks', c.req.param('id'));
  return c.body(null, 204);
});

// biblioteka slajdów: pliki ze slajdami (tabela templates) i lista wszystkich slajdów
const withFrames = (t) => ({ ...t, frames: describeTemplate(template(t.id).parsed) });
api.get('/library', (c) => c.json(librarySlides()));
api.get('/templates', (c) => c.json(store.list('templates').map(withFrames)));
api.get('/templates/:id', (c) => c.json(withFrames(store.mustGet('templates', c.req.param('id')))));
api.get('/templates/:id/file', (c) => {
  const t = store.mustGet('templates', c.req.param('id'));
  return c.body(store.templateFile(t.id).file, 200, {
    'content-type': 'application/octet-stream',
    'content-disposition': `attachment; filename="${slugify(t.name)}.figcraft"`,
  });
});
// Nowy plik ze slajdami albo podmiana istniejącego (to samo id). Każda ramka najwyższego poziomu = slajd.
//  - multipart: `file` (.figcraft, .json, .fig, .penpot, .sketch, .svg), opcjonalnie `id` i `name`
//  - application/json: sam JSON strony/dokumentu FigCraft (albo Figma REST API); id i name w query
api.post('/templates', async (c) => {
  let upload;
  if ((c.req.header('content-type') || '').includes('application/json')) {
    const raw = Buffer.from(await c.req.arrayBuffer());
    try { JSON.parse(raw.toString('utf8')); } catch { throw new HttpError(400, 'To nie jest poprawny JSON'); }
    const id = c.req.query('id') || undefined;
    upload = { buf: raw, filename: `${id || 'slajdy'}.json`, id, name: c.req.query('name') };
  } else {
    const form = await c.req.parseBody();
    const file = form.file;
    if (!(file instanceof File)) throw new HttpError(400, `Wyślij plik w polu "file" (${UPLOAD_EXT.join(', ')})`);
    upload = {
      buf: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      id: typeof form.id === 'string' && form.id ? form.id : undefined,
      name: typeof form.name === 'string' && form.name ? form.name : undefined,
    };
  }
  if (upload.buf.length > 100 * 1024 * 1024) throw new HttpError(413, 'Plik większy niż 100 MB');
  const t = await uploadSource(upload);
  changed('templates', t.id);
  return c.json(t, 201);
});
api.patch('/templates/:id', async (c) => {
  const { name } = await body(c);
  const t = store.update('templates', c.req.param('id'), { name });
  changed('templates', t.id);
  return c.json(t);
});
api.delete('/templates/:id', (c) => {
  store.remove('templates', c.req.param('id'));
  syncComponents();
  changed('templates', c.req.param('id'));
  return c.body(null, 204);
});

// oferty
api.get('/offers', (c) => c.json(store.list('offers')));
api.get('/offers/:id', (c) => c.json(store.getOffer(c.req.param('id'))));
api.post('/offers', async (c) => {
  const b = await body(c);
  if (!b.name) throw new HttpError(400, 'Oferta musi mieć "name"');
  const { slides = [], ...offer } = b;
  const created = store.tx(() => {
    const o = store.insert('offers', offer, offer.name);
    slides.forEach((s, i) => store.insert('slides', { ...s, offer_id: o.id, position: i }, 'slide'));
    return o;
  });
  changed('offers', created.id, { offer_id: created.id });
  return c.json(store.getOffer(created.id), 201);
});
api.patch('/offers/:id', async (c) => {
  const o = store.update('offers', c.req.param('id'), await body(c), { replaceData: c.req.query('replace') === '1' });
  changed('offers', o.id, { offer_id: o.id });
  return c.json(o);
});
api.delete('/offers/:id', (c) => {
  store.remove('offers', c.req.param('id'));
  previews.delete(c.req.param('id'));
  changed('offers', c.req.param('id'), { offer_id: c.req.param('id') });
  return c.body(null, 204);
});
api.post('/offers/:id/duplicate', async (c) => {
  const b = c.req.header('content-type')?.includes('json') ? await body(c) : {};
  const o = store.duplicateOffer(c.req.param('id'), b.name);
  changed('offers', o.id, { offer_id: o.id });
  return c.json(o, 201);
});
api.put('/offers/:id/order', async (c) => {
  const { ids } = await body(c);
  if (!Array.isArray(ids)) throw new HttpError(400, 'Oczekiwano {"ids": [...]}');
  const o = store.reorderSlides(c.req.param('id'), ids);
  changed('slides', null, { offer_id: o.id });
  return c.json(o);
});

// render
api.get('/offers/:id/preview', async (c) => {
  const id = c.req.param('id');
  const p = await preview(id);
  return c.json({
    key: p.key,
    ms: p.ms,
    error: p.error,
    slides: p.report.map((s) => ({ ...s, url: s.index != null && p.pngs[s.index] ? `/preview-img/${encodeURIComponent(id)}/${p.key}/${s.index}` : null })),
  });
});
api.get('/offers/:id/pdf', async (c) => {
  const { offer, input } = await renderInput(c.req.param('id'), { includeHidden: false });
  if (!input.slides.length) throw new HttpError(400, 'Oferta nie ma widocznych slajdów');
  const pdf = await renderPdf(input);
  return c.body(pdf, 200, {
    'content-type': 'application/pdf',
    'content-disposition': `${c.req.query('download') === '0' ? 'inline' : 'attachment'}; filename="${slugify(offer.name)}.pdf"`,
  });
});
// Gotowy dokument oferty jako .figcraft: do ręcznych poprawek w FigCraft.
api.get('/offers/:id/figcraft', async (c) => {
  const { offer, input } = await renderInput(c.req.param('id'), { includeHidden: false });
  const file = await renderFigcraft(input);
  return c.body(file, 200, {
    'content-type': 'application/octet-stream',
    'content-disposition': `attachment; filename="${slugify(offer.name)}.figcraft"`,
  });
});

// slajdy
api.post('/offers/:id/slides', async (c) => {
  const b = await body(c);
  if (!b.frame) throw new HttpError(400, 'Slajd musi mieć "frame" (nazwę slajdu w szablonie)');
  const s = store.addSlide(c.req.param('id'), b);
  changed('slides', s.id, { offer_id: s.offer_id });
  return c.json(s, 201);
});
api.get('/slides/:id', (c) => c.json(store.mustGet('slides', c.req.param('id'))));
api.patch('/slides/:id', async (c) => {
  const { offer_id: _ignored, ...patch } = await body(c);
  const s = store.update('slides', c.req.param('id'), patch, { replaceData: c.req.query('replace') === '1' });
  store.touch('offers', s.offer_id);
  changed('slides', s.id, { offer_id: s.offer_id });
  return c.json(s);
});
api.delete('/slides/:id', (c) => {
  const s = store.mustGet('slides', c.req.param('id'));
  store.remove('slides', s.id);
  changed('slides', s.id, { offer_id: s.offer_id });
  return c.body(null, 204);
});

// komponenty: karty z zestawów @… w bibliotece + opisy dla AI (SQLite)
api.get('/components', (c) => c.json(componentsView({ set: c.req.query('set'), includeMissing: c.req.query('missing') === '1' })));
api.get('/components/:set/:key', (c) => {
  const id = `${c.req.param('set')}/${c.req.param('key')}`;
  const row = componentsView({ includeMissing: true }).find((x) => x.id === id);
  if (!row) throw new HttpError(404, `components/${id}: nie ma takiego komponentu`);
  return c.json(row);
});
api.patch('/components/:set/:key', async (c) => {
  const id = `${c.req.param('set')}/${c.req.param('key')}`;
  const b = await body(c);
  const patch = Object.fromEntries(Object.entries(b).filter(([k]) => COMPONENT_EDITABLE.includes(k)));
  const ignored = Object.keys(b).filter((k) => !COMPONENT_EDITABLE.includes(k));
  if (ignored.length && !Object.keys(patch).length) throw new HttpError(400, `Można zmieniać tylko: ${COMPONENT_EDITABLE.join(', ')}`);
  const row = store.update('components', id, patch, { replaceData: c.req.query('replace') === '1' });
  changed('components', id);
  return c.json(row);
});
api.get('/component-sets', (c) => c.json(store.list('component_sets').map((cs) => ({ ...cs, components: store.listComponents({ set: cs.id }).length }))));
api.patch('/component-sets/:id', async (c) => {
  const { title, rules } = await body(c);
  const row = store.update('component_sets', c.req.param('id'), { ...(title != null ? { title } : {}), ...(rules != null ? { rules } : {}) });
  changed('component_sets', row.id);
  return c.json(row);
});

// dobór kart na slajd: kontekst dla dowolnego agenta albo od razu Claude
api.get('/slides/:id/pick-context', (c) => c.json(pickContext(c.req.param('id'))));
api.post('/slides/:id/pick', async (c) => {
  const b = c.req.header('content-type')?.includes('json') ? await body(c) : {};
  const ctx = pickContext(c.req.param('id'));
  const result = await pickComponents({ offer: ctx.offer, slide: ctx.slide, brief: b.brief, sets: ctx.sets });
  let slide = store.mustGet('slides', ctx.slide.id);
  if (b.apply !== false) {
    slide = store.update('slides', slide.id, { picks: { ...(slide.picks || {}), ...result.picks } });
    store.touch('offers', slide.offer_id);
    changed('slides', slide.id, { offer_id: slide.offer_id });
  }
  return c.json({ applied: b.apply !== false, ...result, slide });
});

// eksport / import całej bazy
api.get('/export', (c) => {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return c.body(JSON.stringify(store.exportAll(), null, 2), 200, {
    'content-type': 'application/json; charset=utf-8',
    'content-disposition': `attachment; filename="offer-studio-${stamp}.json"`,
  });
});
api.post('/import', async (c) => {
  const counts = store.importAll(await body(c), c.req.query('mode') || 'merge');
  parsedCache.clear();
  thumbCache.clear();
  libCache = null;
  previews.clear();
  syncComponents();
  emit({ table: '*', id: null });
  return c.json({ imported: counts });
});

app.route('/api', api);

serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`offer-studio: http://localhost:${info.port} (baza: ${DB_PATH})`);
  if (!PASSWORD && !API_TOKEN) console.warn('offer-studio: UWAGA, brak STUDIO_PASSWORD i STUDIO_API_TOKEN: aplikacja jest otwarta');
});
