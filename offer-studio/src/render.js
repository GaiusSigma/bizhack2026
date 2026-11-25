// Renderowanie oferty do HTML: każdy slajd = layout (Handlebars) wypełniony danymi slajdu, oferty i bloków.
// Ten sam HTML służy do podglądu na żywo (mode: 'preview') i do PDF (mode: 'pdf').
import Handlebars from 'handlebars';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

const hb = Handlebars.create();

hb.registerHelper('md', (text) => new hb.SafeString(marked.parse(String(text ?? ''))));
hb.registerHelper('mdi', (text) => new hb.SafeString(marked.parseInline(String(text ?? ''))));
hb.registerHelper('eq', (a, b) => a === b);
hb.registerHelper('ne', (a, b) => a !== b);
hb.registerHelper('or', (...args) => args.slice(0, -1).find((v) => v != null && v !== '') ?? '');
hb.registerHelper('inc', (n) => Number(n) + 1);
hb.registerHelper('pad2', (n) => String(Number(n)).padStart(2, '0'));
hb.registerHelper('upper', (s) => String(s ?? '').toUpperCase());
hb.registerHelper('json', (v) => JSON.stringify(v, null, 2));
hb.registerHelper('split', (s, sep) => String(s ?? '').split(typeof sep === 'string' ? sep : '|').map((x) => x.trim()));
hb.registerHelper('lines',(s) => String(s ?? '').split('\n').map((l) => l.trim()).filter(Boolean));
// {{#where blocks "type" "use_case"}}...{{/where}}
hb.registerHelper('where', (list, key, value, opts) =>
  (list || []).filter((x) => x?.[key] === value).map((x) => opts.fn(x)).join(''),
);

const cache = new Map();
function compile(layout) {
  const key = `${layout.id}@${layout.updated_at}`;
  if (!cache.has(key)) {
    for (const k of cache.keys()) if (k.startsWith(`${layout.id}@`)) cache.delete(k);
    cache.set(key, hb.compile(layout.template, { strict: false }));
  }
  return cache.get(key);
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Bloki slajdu: jawna lista `block_ids` (kolejność z listy) albo zapytanie `query` {type, tag, limit}.
// Pola z `data` bloku są wypłaszczane, więc w szablonie piszesz {{effect}} zamiast {{data.effect}}.
export function resolveBlocks(store, slide) {
  let blocks = [];
  if (slide.block_ids?.length) {
    blocks = slide.block_ids.map((id) => store.get('blocks', id)).filter(Boolean);
  } else if (slide.query && (slide.query.type || slide.query.tag)) {
    blocks = store.listBlocks({ type: slide.query.type, tag: slide.query.tag });
    blocks.sort((a, b) => (a.data?.order ?? 1e9) - (b.data?.order ?? 1e9) || a.title.localeCompare(b.title, 'pl'));
    if (slide.query.limit) blocks = blocks.slice(0, Number(slide.query.limit));
  }
  return blocks.map((b) => ({ ...b.data, id: b.id, type: b.type, title: b.title, body: b.body, tags: b.tags, data: b.data }));
}

const BASE_CSS = `
@page { size: 1920px 1080px; margin: 0; }
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.slide { position: relative; width: 1920px; height: 1080px; overflow: hidden; break-after: page; page-break-after: always; }
.slide:last-child { break-after: auto; page-break-after: auto; }
.slide-error { position: absolute; inset: 40px; padding: 32px; background: #fff0f0; color: #a40000; font: 24px/1.4 monospace; white-space: pre-wrap; border: 4px solid #a40000; }
@media screen {
  body.preview { background: #2b2b2b; padding: 24px 0 8px; }
  body.preview #deck { zoom: var(--zoom, 0.5); }
  body.preview .slide { margin: 0 auto 48px; box-shadow: 0 8px 40px rgba(0,0,0,.45); }
  body.preview .slide.is-hidden { opacity: .35; }
  body.preview .slide.is-selected { outline: 8px solid #ce5e64; outline-offset: 8px; }
  body.preview [data-block] { cursor: pointer; }
  body.preview [data-block]:hover { outline: 4px dashed #ce5e64; outline-offset: 6px; }
  body.preview .slide-badge { position: absolute; top: 16px; right: 16px; z-index: 50; background: #1d1f21; color: #fff; font: 600 22px/1 system-ui, sans-serif; padding: 10px 16px; border-radius: 8px; opacity: .85; }
}
@media print { .slide-badge, .slide.is-hidden { display: none !important; } }
`;

const PREVIEW_SCRIPT = `
(() => {
  const deck = () => document.getElementById('deck');
  const fit = () => document.documentElement.style.setProperty('--zoom', Math.min(1, (innerWidth - 48) / 1920));
  addEventListener('resize', fit); fit();
  let selected = new URLSearchParams(location.search).get('slide');
  const mark = () => document.querySelectorAll('.slide').forEach((s) => s.classList.toggle('is-selected', s.dataset.slide === selected));
  mark();
  const reveal = () => selected && document.querySelector('[data-slide="' + CSS.escape(selected) + '"]')?.scrollIntoView({ block: 'center' });
  document.fonts.ready.then(() => requestAnimationFrame(reveal));
  let timer;
  const refresh = async () => {
    const r = await fetch(location.href, { cache: 'no-store' });
    if (!r.ok) return;
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    const y = scrollY;
    document.getElementById('studio-css').textContent = doc.getElementById('studio-css').textContent;
    deck().innerHTML = doc.getElementById('deck').innerHTML;
    mark(); scrollTo(0, y);
  };
  const es = new EventSource('/api/events');
  es.onmessage = () => { clearTimeout(timer); timer = setTimeout(refresh, 120); };
  addEventListener('click', (e) => {
    const b = e.target.closest('[data-block]'); const s = e.target.closest('[data-slide]');
    if (!s) return;
    selected = s.dataset.slide; mark();
    parent.postMessage({ source: 'offer-preview', block: b ? b.dataset.block : null, slide: selected }, location.origin);
  });
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.source !== 'offer-studio') return;
    if (e.data.select) { selected = e.data.select; mark(); reveal(); }
  });
})();
`;

export function renderOffer(store, offerId, { mode = 'preview' } = {}) {
  const offer = store.getOffer(offerId);
  const layouts = Object.fromEntries(store.list('layouts').map((l) => [l.id, l]));
  const vars = offer.data || {};
  const visible = offer.slides.filter((s) => mode === 'preview' || !s.hidden);
  const usedLayouts = new Set();

  const html = visible
    .map((slide, i) => {
      const layout = layouts[slide.layout_id];
      const cls = ['slide', `layout-${slide.layout_id}`, slide.hidden ? 'is-hidden' : ''].filter(Boolean).join(' ');
      const badge = mode === 'preview' ? `<div class="slide-badge">${i + 1}${slide.hidden ? ' · ukryty' : ''}</div>` : '';
      let inner;
      if (!layout) {
        inner = `<div class="slide-error">Brak layoutu "${escapeHtml(slide.layout_id)}"</div>`;
      } else {
        usedLayouts.add(layout.id);
        try {
          inner = compile(layout)({
            offer: { id: offer.id, name: offer.name, ...vars },
            vars,
            slide: { id: slide.id, index: i, number: i + 1, total: visible.length },
            data: slide.data || {},
            blocks: resolveBlocks(store, slide),
          });
        } catch (e) {
          inner = `<div class="slide-error">Błąd w layoucie "${escapeHtml(layout.id)}":\n${escapeHtml(e.message)}</div>`;
        }
      }
      return `<section class="${cls}" data-slide="${escapeHtml(slide.id)}">${inner}${badge}</section>`;
    })
    .join('\n');

  const css = [
    BASE_CSS,
    store.getSetting('theme_css'),
    ...[...usedLayouts].map((id) => `/* layout: ${id} */\n${layouts[id].css || ''}`),
  ].join('\n');

  let doc = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(offer.name)}</title>
<link rel="stylesheet" href="/fonts/figtree.css">
<style id="studio-css">${css}</style>
</head>
<body class="${mode}">
<main id="deck">${html || '<p style="color:#aaa;font:24px system-ui;text-align:center;padding:80px">Oferta nie ma jeszcze slajdów.</p>'}</main>
<script>document.fonts.ready.then(() => { window.__ready = true; });</script>
${mode === 'preview' ? `<script>${PREVIEW_SCRIPT}</script>` : ''}
</body>
</html>`;

  if (mode === 'pdf') doc = inlineAssets(store, doc);
  return doc;
}

// W PDF obrazki trafiają do HTML jako data: URI, żeby renderer nie potrzebował dostępu do /assets.
function inlineAssets(store, html) {
  const memo = new Map();
  return html.replace(/\/assets\/([A-Za-z0-9][A-Za-z0-9._-]*)/g, (m, id) => {
    if (!memo.has(id)) {
      const a = store.getAsset(id);
      memo.set(id, a ? `data:${a.mime};base64,${Buffer.from(a.data).toString('base64')}` : m);
    }
    return memo.get(id);
  });
}
