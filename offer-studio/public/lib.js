// Offer Studio: shared frontend helpers (DOM, API, dialogs, state) for app.js and the views in views/.

// Shared module state: closing the dialog and refreshing the current view after API changes.
export const ui = { onModalClose: null, refresh: null };
// ------------------------------------------------------------------ utilities
export const $ = (sel, root = document) => root.querySelector(sel);

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

export async function api(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

let toastTimer;
export function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = err ? 'err' : '';
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), err ? 6000 : 2200);
}

export const debounce = (fn, ms = 450) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

// "1 slide", "3 slides".
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Save status indicator ("saving…", "saved", error).
export function saver(statusEl, fn, ms) {
  return debounce(async (...a) => {
    statusEl.textContent = 'saving…';
    statusEl.className = 'status';
    try {
      await fn(...a);
      statusEl.textContent = 'saved';
      statusEl.className = 'status ok';
    } catch (e) {
      statusEl.textContent = 'error';
      statusEl.className = 'status err';
      toast(e.message, true);
    }
  }, ms);
}

export function autosize(t) {
  const fit = () => { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight + 2, 600)}px`; };
  t.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return t;
}

// Key → value field editor (for the `data` of blocks, slides and offers).
// `hints` are keys worth showing right away (e.g. fields read from the template).
export function kvEditor(obj, hints, onChange) {
  const rows = [];
  const types = {};
  const collect = () => {
    const out = {};
    for (const r of rows) {
      const k = r.k.value.trim();
      if (!k) continue;
      let v = r.v.value;
      if (types[k] === 'number' && v.trim() !== '' && !isNaN(Number(v))) v = Number(v);
      else if (types[k] === 'json') { try { v = JSON.parse(v); } catch { /* keep it as text */ } }
      else if (types[k] === 'boolean') v = v.trim() === 'true';
      if (v === '' && !(k in obj)) continue;
      out[k] = v;
    }
    // keys removed from the list -> null (the API deletes them when merging)
    for (const k of Object.keys(obj)) if (!(k in out)) out[k] = null;
    return out;
  };
  const fire = () => onChange(collect());
  const list = h('div', { class: 'kv' });
  const addRow = (k = '', v = '') => {
    if (v !== null && typeof v === 'object') { types[k] = 'json'; v = JSON.stringify(v, null, 2); }
    else if (typeof v === 'number') types[k] = 'number';
    else if (typeof v === 'boolean') types[k] = 'boolean';
    const r = {
      k: h('input', { value: k, placeholder: 'key', oninput: fire }),
      v: autosize(h('textarea', { rows: 1, oninput: fire }, String(v ?? ''))),
    };
    const del = h('button', { class: 'icon', title: 'Delete field', onclick: () => { rows.splice(rows.indexOf(r), 1); row.remove(); fire(); } }, '×');
    const row = h('div', { class: 'r' }, r.k, r.v, del);
    rows.push(r);
    list.append(row);
    return r;
  };
  for (const [k, v] of Object.entries(obj)) addRow(k, v);
  for (const k of hints || []) if (!(k in obj)) addRow(k, '');
  return h('div', { class: 'kv' }, list, h('div', {}, h('button', { class: 'btn sm', onclick: () => addRow().k.focus() }, '+ field')));
}

export function modal(content) {
  const m = $('#modal');
  m.replaceChildren(h('div', { class: 'dlg' }, content));
  m.hidden = false;
  const close = () => { m.hidden = true; m.replaceChildren(); ui.onModalClose?.(); ui.onModalClose = null; };
  m.onclick = (e) => { if (e.target === m) close(); };
  return close;
}
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) $('#modal').click(); });

export async function download(path, fallbackName) {
  toast('Generating…');
  try {
    const res = await fetch(`/api${path}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || fallbackName;
    const url = URL.createObjectURL(await res.blob());
    h('a', { href: url, download: name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast('Done');
  } catch (e) {
    toast(e.message, true);
  }
}

// ------------------------------------------------------------------ state and routing
export const state = { blocks: [], offers: [], templates: [], library: [], components: [], componentSets: [], tiles: [], scenarios: [], meta: { types: [], tags: [] }, filter: { type: '', tag: '', q: '' } };

export async function loadAll() {
  [state.blocks, state.offers, state.templates, state.library, state.components, state.componentSets, state.meta, state.tiles, state.scenarios] = await Promise.all([
    api('GET', '/blocks'), api('GET', '/offers'), api('GET', '/templates'), api('GET', '/library'),
    api('GET', '/components?missing=1'), api('GET', '/component-sets'), api('GET', '/meta'), api('GET', '/tiles'), api('GET', '/scenarios'),
  ]);
}

// Strips accents; \u0142/\u0141 (Polish l with stroke) do not decompose under NFKD, so map them by hand.
export const slugify = (s) => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l').replace(/\u0141/g, 'L')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
export const UPLOAD_ACCEPT = '.figcraft,.json,.fig,.penpot,.sketch,.svg';

// FigCraft web editor page: {template: id} | {offer: id} | {new: 1}
export const editorUrl = (q) => `/static/editor.html?${new URLSearchParams(q)}`;

export const go = (...parts) => { location.hash = `#/${parts.filter((p) => p != null && p !== '').map(encodeURIComponent).join('/')}`; };

// Tiles by id and category labels (shared by the offer and tile screens).
export const CATEGORY_LABELS = { role: 'Who you are talking to', segment: 'Segment', pain: 'Client pains', product: 'Product / scale' };
export const tileById = (id) => state.tiles.find((t) => t.id === id);
export const tileLabel = (id) => tileById(id)?.label || `${id} (deleted tile)`;
