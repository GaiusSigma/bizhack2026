// FigCraft web as the Offer Studio slide editor.
//
// The FigCraft web build is served by Offer Studio at /figcraft/ and framed here with ?host=parent, so
// the two talk over same-origin postMessage (FigCraft "host mode", HOSTING.md in the FigCraft release):
//   figcraft:ready  app  -> page   the app listens: send the document
//   figcraft:open   page -> app    {name, bytes}
//   figcraft:save   app  -> page   {name, bytes, saveAs, id?}: Save, Save As and every export
//   figcraft:saved  page -> app    {id}: that save is stored, the app clears its unsaved state
//   figcraft:dirty  app  -> page   {dirty}
//
// Modes (query string):
//   ?template=<id>  a slide file from the library; Save (Ctrl+S) stores it back (POST /api/templates with
//                   `base`, so someone else's save in between is a conflict, not a silent overwrite)
//   ?new=1          an empty editor; the first Save adds the file to the library
//   ?offer=<id>     the finished offer (generated); saves are downloads, the offer itself doesn't change
const $ = (s) => document.querySelector(s);
const ORIGIN = location.origin;
const params = new URLSearchParams(location.search);
const ctx = {
  mode: params.get('template') ? 'template' : params.get('offer') ? 'offer' : 'new',
  templateId: params.get('template') || null,
  offerId: params.get('offer') || null,
  base: null, // updated_at of the library version open in the editor
  name: null,
};
const frame = $('#fc');
let appDirty = false; // FigCraft has unsaved changes
let unstored = false; // the last save did not reach the library
let saving = false;
let remotePending = false;
let queue = Promise.resolve();

// ------------------------------------------------------------------ small UI helpers
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
}

let toastTimer;
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = err ? 'err' : '';
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), err ? 6000 : 2800);
}

// Strips accents; ł/Ł do not decompose under NFKD (same as app.js).
const slugify = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';

function setState(text, cls = '') {
  $('#state').textContent = text;
  $('#state').className = `pill ${cls}`;
}
function refreshState() {
  if (saving) return setState('Saving…');
  if (unstored) return setState('Not saved in Offer Studio', 'err');
  if (appDirty) return setState('Unsaved changes', 'dirty');
  if (ctx.mode === 'offer') return setState('Generated offer', 'ok');
  if (!ctx.templateId) return setState('Not in the library yet');
  return setState('Saved in the library', 'ok');
}

// Banner with buttons: actions = [[label, fn, primary?]]. Returns nothing; buttons hide it first.
function banner(kind, msg, actions = []) {
  const b = $('#banner');
  b.className = `banner ${kind}`;
  b.querySelector('.msg').textContent = msg;
  b.querySelector('.acts').replaceChildren(...actions.map(([label, fn, primary]) =>
    h('button', { class: `btn sm${primary ? ' primary' : ''}`, onclick: () => { hideBanner(); fn?.(); } }, label)));
  b.hidden = false;
}
const hideBanner = () => { $('#banner').hidden = true; };
// A question in the banner: resolves to the value of the clicked button.
const ask = (kind, msg, choices) => new Promise((resolve) =>
  banner(kind, msg, choices.map(([label, value, primary]) => [label, () => resolve(value), primary])));

function downloadFile(name, bytes) {
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = h('a', { href: url, download: name || 'figcraft-export' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const author = () => { try { return localStorage.getItem('figcraft-author') || ''; } catch { return ''; } };
function renderAuthor() {
  $('#author').textContent = author() ? `Signed as ${author()}` : 'Set your name';
}
$('#author').addEventListener('click', () => {
  const v = prompt('Your name on FigCraft comments and board notes:', author());
  if (v == null) return;
  try { localStorage.setItem('figcraft-author', v.trim()); } catch { /* private mode: name only for now */ }
  renderAuthor();
  if (appDirty || unstored) toast('Your name applies the next time the editor opens');
  else loadFrame();
});

function setTitle(name) {
  ctx.name = name;
  $('#title').textContent = name;
  document.title = `${name} · FigCraft`;
}

// ------------------------------------------------------------------ the FigCraft frame
const post = (msg, transfer) => frame.contentWindow?.postMessage(msg, ORIGIN, transfer || []);

function loadFrame() {
  appDirty = false;
  unstored = false;
  hideBanner();
  setState('Loading FigCraft…');
  const q = new URLSearchParams({ host: 'parent' });
  if (author()) q.set('author', author());
  frame.src = `/figcraft/?${q}`;
}

async function fail(res) {
  const data = await res.json().catch(() => ({}));
  const err = new Error(data.error || `${res.status} ${res.statusText}`);
  err.code = data.code;
  err.status = res.status;
  return err;
}

async function openDocument() {
  if (ctx.mode === 'new') return refreshState();
  setState('Opening…');
  try {
    let res;
    let name;
    if (ctx.mode === 'template') {
      const meta = await fetch(`/api/templates/${encodeURIComponent(ctx.templateId)}`);
      if (!meta.ok) throw await fail(meta);
      name = (await meta.json()).name;
      res = await fetch(`/api/templates/${encodeURIComponent(ctx.templateId)}/file`, { cache: 'no-store' });
      if (!res.ok) throw await fail(res);
      ctx.base = res.headers.get('x-updated-at');
    } else {
      const meta = await fetch(`/api/offers/${encodeURIComponent(ctx.offerId)}`);
      if (!meta.ok) throw await fail(meta);
      name = (await meta.json()).name;
      setState('FigCraft is building the offer…');
      res = await fetch(`/api/offers/${encodeURIComponent(ctx.offerId)}/figcraft`);
      if (!res.ok) throw await fail(res);
    }
    const bytes = await res.arrayBuffer();
    setTitle(name);
    post({ type: 'figcraft:open', name: `${name}.figcraft`, bytes }, [bytes]);
    refreshState();
  } catch (e) {
    setState('Error', 'err');
    banner('err', `Could not open the file: ${e.message}`, [['Try again', openDocument]]);
  }
}

addEventListener('message', (e) => {
  if (e.origin !== ORIGIN || e.source !== frame.contentWindow) return;
  const m = e.data;
  if (!m || typeof m.type !== 'string' || !m.type.startsWith('figcraft:')) return;
  switch (m.type) {
    case 'figcraft:ready': openDocument(); break;
    case 'figcraft:dirty': appDirty = !!m.dirty; refreshState(); break;
    case 'figcraft:save': queue = queue.then(() => onSave(m)).catch((err) => toast(err.message, true)); break;
    case 'figcraft:failed': banner('err', `FigCraft: ${m.error || 'something went wrong'}`); break;
    default: break;
  }
});

// ------------------------------------------------------------------ saving
const ack = (m) => { if (m.id != null) post({ type: 'figcraft:saved', id: m.id }); };

async function onSave(m) {
  const isDocument = /\.(figcraft|json)$/i.test(m.name || '');
  // Exports (PNG, PDF, SVG…) and anything in offer mode: a normal download.
  if (!isDocument || ctx.mode === 'offer') {
    downloadFile(m.name, m.bytes);
    ack(m);
    if (isDocument) toast('Downloaded. The offer in Offer Studio does not change: edit slides in the library instead.');
    return;
  }
  let target = ctx.templateId;
  let base = ctx.base;
  let displayName;
  if (m.saveAs || !target) {
    const fileName = String(m.name).replace(/\.[a-z]+$/i, '');
    const choice = await ask('info', `Save “${fileName}” as ${target ? 'a new' : 'a'} slide file in the Offer Studio library?`, [
      ['Add to library', 'library', true], ['Download only', 'download'], ['Cancel', null]]);
    if (choice === 'download') { downloadFile(m.name, m.bytes); ack(m); return; }
    if (choice !== 'library') { unstored = true; refreshState(); return; }
    displayName = fileName;
    target = slugify(fileName);
    base = undefined;
    if (target !== ctx.templateId) {
      const res = await fetch(`/api/templates/${encodeURIComponent(target)}`);
      if (res.ok) {
        const other = await res.json();
        const replace = await ask('warn', `“${other.name}” is already in the library. Replace it with this file?`, [
          ['Replace it', true], ['Cancel', false]]);
        if (!replace) { unstored = true; refreshState(); return; }
      }
    }
  }
  await store(m, target, base, displayName);
}

async function store(m, target, base, displayName) {
  saving = true;
  hideBanner();
  refreshState();
  try {
    const fd = new FormData();
    fd.append('file', new Blob([m.bytes]), `${target}${/\.json$/i.test(m.name) ? '.json' : '.figcraft'}`);
    fd.append('id', target);
    if (displayName) fd.append('name', displayName);
    if (base) fd.append('base', base);
    const res = await fetch('/api/templates', { method: 'POST', body: fd });
    if (!res.ok) throw await fail(res);
    const t = await res.json();
    ctx.mode = 'template';
    ctx.templateId = t.id;
    ctx.base = t.updated_at;
    unstored = false;
    setTitle(t.name);
    history.replaceState(null, '', `?template=${encodeURIComponent(t.id)}`);
    $('#hint').textContent = HINTS.template;
    $('#back').href = `/#/templates/${encodeURIComponent(t.id)}`;
    ack(m);
    const extra = t.new_components?.length ? `, new components: ${t.new_components.length}` : '';
    toast(`Saved in the library: ${t.frames.length} slide${t.frames.length === 1 ? '' : 's'}${extra}`);
  } catch (e) {
    unstored = true;
    const mine = ['Download my version', () => downloadFile(m.name, m.bytes)];
    if (e.code === 'stale') {
      banner('warn', `Not saved: ${e.message}. Saving now would overwrite their changes.`, [
        ['Overwrite with my version', () => { queue = queue.then(() => store(m, target, undefined, displayName)); }], mine,
        ['Load their version', reloadEditor]]);
    } else {
      banner('err', `Not saved: ${e.message}. Fix it in the editor and save again.`, [mine]);
    }
  } finally {
    saving = false;
    refreshState();
    if (remotePending) checkRemote();
  }
}

// ------------------------------------------------------------------ someone else saved this file
function reloadEditor() {
  if ((appDirty || unstored) && !confirm('Load the version from the library? Your unsaved changes here will be lost.')) return;
  loadFrame();
}

async function checkRemote() {
  if (!ctx.templateId) return;
  if (saving) { remotePending = true; return; }
  remotePending = false;
  const res = await fetch(`/api/templates/${encodeURIComponent(ctx.templateId)}`);
  if (res.status === 404) {
    banner('warn', 'This file was deleted from the library. Save it to add it back, or download your version.');
    return;
  }
  if (!res.ok) return;
  const t = await res.json();
  if (!ctx.base || t.updated_at === ctx.base) return;
  const when = new Date(t.updated_at).toLocaleTimeString();
  banner('warn', `Someone saved a newer version of “${t.name}” at ${when}.${appDirty || unstored ? ' Loading it discards your unsaved changes here.' : ''}`, [
    ['Load the new version', reloadEditor, true], ['Keep editing mine', null]]);
}

const events = new EventSource('/api/events');
events.onmessage = (e) => {
  const ev = JSON.parse(e.data);
  if (ev.table === '*' || (ev.table === 'templates' && ev.id === ctx.templateId)) checkRemote();
};

addEventListener('beforeunload', (e) => {
  if (appDirty || unstored) { e.preventDefault(); e.returnValue = ''; }
});

// ------------------------------------------------------------------ start
const HINTS = {
  template: 'Ctrl+S saves the file back to the slide library: thumbnails and offers update.',
  new: 'Home screen ▸ New design file, draw 1920×1080 frames and name them, then Ctrl+S adds the file to the library.',
  offer: 'The finished offer, built from the library. Saving downloads a .figcraft; the offer in Offer Studio does not change.',
};
$('#hint').textContent = HINTS[ctx.mode];
if (ctx.mode === 'new') setTitle('New slide file');
if (ctx.mode === 'offer') $('#back').href = `/#/offers/${encodeURIComponent(ctx.offerId)}`;
else if (ctx.templateId) $('#back').href = `/#/templates/${encodeURIComponent(ctx.templateId)}`;
renderAuthor();
loadFrame();
