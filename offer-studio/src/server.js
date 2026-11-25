import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError, openDb, slugify } from './db.js';
import { htmlUrlToPdf } from './pdf.js';
import { renderOffer } from './render.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const PORT = Number(env.PORT || 3000);
const DB_PATH = env.STUDIO_DB || join(ROOT, 'data', 'studio.db');
const PASSWORD = env.STUDIO_PASSWORD || '';
const API_TOKEN = env.STUDIO_API_TOKEN || '';
const GOTENBERG_URL = env.GOTENBERG_URL || '';
const INTERNAL_URL = (env.STUDIO_INTERNAL_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const SIGNING_KEY = env.STUDIO_SECRET || randomBytes(32).toString('hex');

mkdirSync(dirname(DB_PATH), { recursive: true });
const store = openDb(DB_PATH);

// ------------------------------------------------------------------ dane startowe
const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
if (store.isEmpty() && env.STUDIO_SEED !== 'false') {
  const { default: seed } = await import('../seed/seed.js');
  const counts = store.importAll(seed, 'merge');
  const dir = join(ROOT, 'seed', 'assets');
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      const ext = extname(f).toLowerCase();
      if (MIME[ext]) store.putAsset({ id: f.slice(0, -ext.length), name: f, mime: MIME[ext], data: readFileSync(join(dir, f)) });
    }
  }
  console.log('offer-studio: pusta baza, wczytano dane startowe', counts);
}

// ------------------------------------------------------------------ live: Server-Sent Events
const listeners = new Set();
function emit(ev) {
  for (const fn of listeners) fn(ev);
}

// ------------------------------------------------------------------ fonty (Figtree z @fontsource)
const FONT_DIR = join(ROOT, 'node_modules', '@fontsource', 'figtree');
const FONT_CSS = [400, 500, 600, 700, 800]
  .map((w) => join(FONT_DIR, `${w}.css`))
  .filter(existsSync)
  .map((f) => readFileSync(f, 'utf8').replaceAll('./files/', '/fonts/files/'))
  .join('\n');

// ------------------------------------------------------------------ podpisane linki do renderu (dla Gotenberga)
const sign = (offerId, exp) => createHmac('sha256', SIGNING_KEY).update(`${offerId}.${exp}`).digest('hex');
function verifySig(offerId, exp, sig) {
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sign(offerId, exp));
  const b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
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
app.get('/fonts/figtree.css', (c) => c.body(FONT_CSS, 200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=86400' }));
app.use('/fonts/files/*', serveStatic({ root: FONT_DIR, rewriteRequestPath: (p) => p.replace(/^\/fonts/, '') }));

// Render dla Gotenberga: bez logowania, ale tylko z ważnym podpisem (ważny kilka minut).
app.get('/render/:id', (c) => {
  const id = c.req.param('id');
  if (!verifySig(id, c.req.query('exp'), c.req.query('sig'))) return c.text('forbidden', 403);
  return c.html(renderOffer(store, id, { mode: 'pdf' }));
});

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

app.get('/assets/:id', (c) => {
  const a = store.getAsset(c.req.param('id'));
  if (!a) return c.text('not found', 404);
  return c.body(Buffer.from(a.data), 200, { 'content-type': a.mime, 'cache-control': 'no-cache' });
});

app.get('/preview/:id', (c) => c.html(renderOffer(store, c.req.param('id'), { mode: 'preview' })));

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

api.get('/meta', (c) =>
  c.json({ ...store.meta(), layouts: store.list('layouts').map(({ id, name, description }) => ({ id, name, description })) }),
);

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

// layouty
api.get('/layouts', (c) => c.json(store.list('layouts')));
api.get('/layouts/:id', (c) => c.json(store.mustGet('layouts', c.req.param('id'))));
api.post('/layouts', async (c) => {
  const b = await body(c);
  if (!b.name) throw new HttpError(400, 'Layout musi mieć "name"');
  const l = store.insert('layouts', { ...b, id: b.id || slugify(b.name) });
  changed('layouts', l.id);
  return c.json(l, 201);
});
api.patch('/layouts/:id', async (c) => {
  const l = store.update('layouts', c.req.param('id'), await body(c));
  changed('layouts', l.id);
  return c.json(l);
});
api.delete('/layouts/:id', (c) => {
  store.remove('layouts', c.req.param('id'));
  changed('layouts', c.req.param('id'));
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
api.get('/offers/:id/html', (c) => c.html(renderOffer(store, c.req.param('id'), { mode: 'pdf' })));
api.get('/offers/:id/pdf', async (c) => {
  const id = c.req.param('id');
  const offer = store.mustGet('offers', id);
  const exp = String(Date.now() + 5 * 60_000);
  const pageUrl = `${INTERNAL_URL}/render/${encodeURIComponent(id)}?exp=${exp}&sig=${sign(id, exp)}`;
  const pdf = await htmlUrlToPdf({ gotenbergUrl: GOTENBERG_URL, pageUrl });
  const filename = `${slugify(offer.name)}.pdf`;
  return c.body(pdf, 200, {
    'content-type': 'application/pdf',
    'content-disposition': `${c.req.query('download') === '0' ? 'inline' : 'attachment'}; filename="${filename}"`,
  });
});

// slajdy
api.post('/offers/:id/slides', async (c) => {
  const b = await body(c);
  if (!b.layout_id) throw new HttpError(400, 'Slajd musi mieć "layout_id"');
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

// motyw
api.get('/theme', (c) => c.json({ css: store.getSetting('theme_css') }));
api.put('/theme', async (c) => {
  const { css } = await body(c);
  if (typeof css !== 'string') throw new HttpError(400, 'Oczekiwano {"css": "..."}');
  store.setSetting('theme_css', css);
  changed('settings', 'theme_css');
  return c.json({ css });
});

// assety (obrazki)
api.get('/assets', (c) => c.json(store.listAssets()));
api.post('/assets', async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new HttpError(400, 'Wyślij plik w polu "file" (multipart/form-data)');
  if (file.size > 15 * 1024 * 1024) throw new HttpError(413, 'Plik większy niż 15 MB');
  const ext = extname(file.name).toLowerCase();
  const mime = file.type || MIME[ext];
  if (!mime || !mime.startsWith('image/')) throw new HttpError(400, 'Dozwolone są tylko obrazki');
  const id = (typeof form.id === 'string' && form.id) || slugify(file.name.slice(0, file.name.length - ext.length));
  const a = store.putAsset({ id, name: file.name, mime, data: Buffer.from(await file.arrayBuffer()) });
  changed('assets', a.id);
  return c.json(a, 201);
});
api.delete('/assets/:id', (c) => {
  store.removeAsset(c.req.param('id'));
  changed('assets', c.req.param('id'));
  return c.body(null, 204);
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
  emit({ table: '*', id: null });
  return c.json({ imported: counts });
});

app.route('/api', api);

serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`offer-studio: http://localhost:${info.port} (baza: ${DB_PATH})`);
  if (!PASSWORD && !API_TOKEN) console.warn('offer-studio: UWAGA, brak STUDIO_PASSWORD i STUDIO_API_TOKEN: aplikacja jest otwarta');
  if (!GOTENBERG_URL) console.warn('offer-studio: brak GOTENBERG_URL, eksport PDF wyłączony (zostaje „Drukuj” w przeglądarce)');
});
