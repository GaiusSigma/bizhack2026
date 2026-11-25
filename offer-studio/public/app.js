// Offer Studio: minimalistyczny frontend bez buildu. Wszystko idzie przez to samo REST API,
// z którego mogą korzystać skrypty i n8n (patrz /static/api.html). Slajdy renderuje FigCraft.

// ------------------------------------------------------------------ narzędzia
const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, attrs = {}, ...children) {
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

async function api(method, path, body) {
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
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = err ? 'err' : '';
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), err ? 6000 : 2200);
}

const debounce = (fn, ms = 450) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

// Pole statusu zapisu („zapisywanie…”, „zapisano”, błąd).
function saver(statusEl, fn, ms) {
  return debounce(async (...a) => {
    statusEl.textContent = 'zapisywanie…';
    statusEl.className = 'status';
    try {
      await fn(...a);
      statusEl.textContent = 'zapisano';
      statusEl.className = 'status ok';
    } catch (e) {
      statusEl.textContent = 'błąd';
      statusEl.className = 'status err';
      toast(e.message, true);
    }
  }, ms);
}

function autosize(t) {
  const fit = () => { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight + 2, 600)}px`; };
  t.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return t;
}

// Edytor pól klucz → wartość (dla `data` bloków, slajdów i ofert).
// `hints` to klucze, które warto pokazać od razu (np. pola wyczytane z szablonu).
function kvEditor(obj, hints, onChange) {
  const rows = [];
  const types = {};
  const collect = () => {
    const out = {};
    for (const r of rows) {
      const k = r.k.value.trim();
      if (!k) continue;
      let v = r.v.value;
      if (types[k] === 'number' && v.trim() !== '' && !isNaN(Number(v))) v = Number(v);
      else if (types[k] === 'json') { try { v = JSON.parse(v); } catch { /* zostaje tekst */ } }
      else if (types[k] === 'boolean') v = v.trim() === 'true';
      if (v === '' && !(k in obj)) continue;
      out[k] = v;
    }
    // klucze usunięte z listy -> null (API usuwa je przy scalaniu)
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
      k: h('input', { value: k, placeholder: 'klucz', oninput: fire }),
      v: autosize(h('textarea', { rows: 1, oninput: fire }, String(v ?? ''))),
    };
    const del = h('button', { class: 'icon', title: 'Usuń pole', onclick: () => { rows.splice(rows.indexOf(r), 1); row.remove(); fire(); } }, '×');
    const row = h('div', { class: 'r' }, r.k, r.v, del);
    rows.push(r);
    list.append(row);
    return r;
  };
  for (const [k, v] of Object.entries(obj)) addRow(k, v);
  for (const k of hints || []) if (!(k in obj)) addRow(k, '');
  return h('div', { class: 'kv' }, list, h('div', {}, h('button', { class: 'btn sm', onclick: () => addRow().k.focus() }, '+ pole')));
}

let onModalClose = null;
function modal(content) {
  const m = $('#modal');
  m.replaceChildren(h('div', { class: 'dlg' }, content));
  m.hidden = false;
  const close = () => { m.hidden = true; m.replaceChildren(); onModalClose?.(); onModalClose = null; };
  m.onclick = (e) => { if (e.target === m) close(); };
  return close;
}
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) $('#modal').click(); });

async function download(path, fallbackName) {
  toast('Generuję…');
  try {
    const res = await fetch(`/api${path}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || fallbackName;
    const url = URL.createObjectURL(await res.blob());
    h('a', { href: url, download: name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast('Gotowe');
  } catch (e) {
    toast(e.message, true);
  }
}

// ------------------------------------------------------------------ stan i routing
const state = { blocks: [], offers: [], templates: [], library: [], meta: { types: [], tags: [] }, filter: { type: '', tag: '', q: '' } };

async function loadAll() {
  [state.blocks, state.offers, state.templates, state.library, state.meta] = await Promise.all([
    api('GET', '/blocks'), api('GET', '/offers'), api('GET', '/templates'), api('GET', '/library'), api('GET', '/meta'),
  ]);
}

const slugify = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const UPLOAD_ACCEPT = '.figcraft,.json,.fig,.penpot,.sketch,.svg';

// Wgranie plików ze slajdami (każda ramka najwyższego poziomu = slajd w bibliotece).
async function uploadSlideFiles(files, { replaceId } = {}) {
  let last = null;
  for (const file of files) {
    const id = replaceId || slugify(file.name.replace(/\.[a-z]+$/i, ''));
    const existing = state.templates.find((t) => t.id === id);
    if (existing && !replaceId && !confirm(`Plik „${existing.name}” już jest w bibliotece. Podmienić go na ${file.name}?`)) continue;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('id', id);
    toast(`Wgrywam ${file.name}…`);
    const res = await fetch('/api/templates', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(`${file.name}: ${data.error || res.statusText}`, true); continue; }
    toast(`${file.name}: ${data.frames.length} slajd(ów) w bibliotece`);
    last = data;
  }
  await loadAll();
  return last;
}

function pasteJsonDialog() {
  const name = h('input', { placeholder: 'np. Case study ACME' });
  const text = h('textarea', { class: 'code', placeholder: '{"format": "figcraft", "nodes": {…}, "pages": […]}', style: 'min-height: 260px' });
  const close = modal(h('div', {},
    h('h3', {}, 'Wklej JSON slajdów'),
    h('p', { class: 'hint' }, 'JSON strony albo całego pliku z FigCraft (Zapisz jako… .json). Każda ramka najwyższego poziomu stanie się slajdem. Obrazki z JSON-a nie przechodzą: slajdy z obrazkami wgrywaj jako .figcraft.'),
    h('label', { class: 'f' }, 'Nazwa w bibliotece'), name,
    h('label', { class: 'f' }, 'JSON'), text,
    h('div', { class: 'bar', style: 'margin-top:14px' }, h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => close() }, 'Anuluj'),
      h('button', { class: 'btn primary', onclick: async () => {
        if (!name.value.trim()) return toast('Podaj nazwę', true);
        const id = slugify(name.value);
        if (state.templates.some((t) => t.id === id) && !confirm(`„${name.value}” już jest w bibliotece. Podmienić?`)) return;
        const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name.value.trim())}`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: text.value,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return toast(data.error || res.statusText, true);
        close();
        toast(`${data.frames.length} slajd(ów) w bibliotece`);
        await loadAll();
        go('templates', data.id);
      } }, 'Dodaj'))));
}

// Okienko wyboru slajdu z biblioteki (miniatury). Zwraca nazwę slajdu albo null.
function pickSlide(title = 'Wybierz slajd z biblioteki') {
  return new Promise((resolve) => {
    let picked = null;
    const groups = {};
    for (const s of state.library) (groups[s.source_name] ||= []).push(s);
    const close = modal(h('div', {},
      h('div', { class: 'bar' }, h('h3', { style: 'flex:1' }, title),
        h('label', { class: 'btn sm' }, '+ Wgraj nowy', h('input', { type: 'file', accept: UPLOAD_ACCEPT, multiple: true, hidden: true, onchange: async (e) => {
          const t = await uploadSlideFiles([...e.target.files]);
          if (t?.frames?.length === 1) { picked = t.frames[0].name; close(); }
          else { close(); resolve(await pickSlide(title)); }
        } }))),
      Object.entries(groups).map(([src, slides]) => [
        h('div', { class: 'lib-group' }, src),
        h('div', { class: 'lib-grid' }, slides.map((s) => h('button', { class: 'lib-card', onclick: () => { picked = s.frame; close(); } },
          h('img', { src: s.thumb, alt: s.frame, loading: 'lazy' }), h('span', {}, s.frame)))),
      ])));
    onModalClose = () => resolve(picked);
  });
}

function route() {
  const [view = 'offers', id = '', sub = ''] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  ({ blocks: viewBlocks, offers: viewOffers, templates: viewTemplates }[view] || viewOffers)(id, sub);
}
const go = (...parts) => { location.hash = `#/${parts.filter((p) => p != null && p !== '').map(encodeURIComponent).join('/')}`; };
document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => go(b.dataset.view)));
addEventListener('hashchange', route);

// Zmiany z innych kart / z API odświeżają listy i podgląd (edytorów w trakcie pisania nie ruszamy).
let editingUntil = 0;
let refreshLists = null;
document.addEventListener('input', () => (editingUntil = Date.now() + 2500), true);
const es = new EventSource('/api/events');
es.onmessage = debounce(async (e) => {
  const ev = JSON.parse(e.data);
  if (ev.type === 'hello') return;
  await loadAll();
  const inOffers = location.hash.startsWith('#/offers') || location.hash === '';
  if (!inOffers && Date.now() > editingUntil && $('#modal').hidden) route();
  else refreshLists?.();
}, 300);


// ------------------------------------------------------------------ edytor bloku (Wiedza i okienko z oferty)
function blockEditor(block, { onDeleted, inModal = false } = {}) {
  const status = h('span', { class: 'status' });
  const save = saver(status, async (patch) => {
    const b = await api('PATCH', `/blocks/${encodeURIComponent(block.id)}`, patch);
    Object.assign(block, b);
  });
  const tagList = state.meta.tags.map((t) => t.tag).join(', ');
  return h('div', {},
    h('div', { class: 'bar' },
      h('h2', {}, block.title || '(bez tytułu)'),
      status,
      h('button', { class: 'btn', title: 'Kopia bloku', onclick: async () => {
        const { id, created_at, updated_at, ...rest } = block;
        const b = await api('POST', '/blocks', { ...rest, title: `${block.title} (kopia)` });
        toast('Skopiowano');
        if (inModal) $('#modal').click();
        await loadAll();
        go('blocks', b.id);
      } }, 'Duplikuj'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm(`Usunąć blok „${block.title}”?`)) return;
        await api('DELETE', `/blocks/${encodeURIComponent(block.id)}`);
        toast('Usunięto');
        onDeleted?.();
      } }, 'Usuń'),
    ),
    h('div', { class: 'id' }, `id: ${block.id}`),
    h('label', { class: 'f' }, 'Typ'),
    h('datalist', { id: 'types-dl' }, state.meta.types.map((t) => h('option', { value: t.type }))),
    h('input', { value: block.type, list: 'types-dl', oninput: (e) => e.target.value.trim() && save({ type: e.target.value.trim() }) }),
    h('label', { class: 'f' }, 'Tytuł'),
    h('input', { value: block.title, oninput: (e) => save({ title: e.target.value }) }),
    h('label', { class: 'f' }, 'Treść (listy „- ” zamieniają się w linie, **tekst** = akcent)'),
    autosize(h('textarea', { rows: 4, oninput: (e) => save({ body: e.target.value }) }, block.body)),
    h('label', { class: 'f' }, 'Tagi (po przecinku)'),
    h('input', { value: (block.tags || []).join(', '), placeholder: tagList, oninput: (e) => save({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }) }),
    h('label', { class: 'f' }, 'Dodatkowe pola'),
    kvEditor(block.data || {}, [], (data) => save({ data })),
    h('div', { class: 'hint' }, 'W szablonie FigCraft pole wstawiasz nazwą warstwy, np. {{effect}}. Zmiany zapisują się same.'),
  );
}

// ------------------------------------------------------------------ widok: Wiedza
function viewBlocks(selectedId) {
  const f = state.filter;
  const listEl = h('div', { class: 'items' });
  const editor = h('div', { class: 'editor' });

  const renderList = () => {
    const q = f.q.toLowerCase();
    const items = state.blocks.filter((b) =>
      (!f.type || b.type === f.type) &&
      (!f.tag || (b.tags || []).includes(f.tag)) &&
      (!q || `${b.title} ${b.body} ${JSON.stringify(b.data)}`.toLowerCase().includes(q)));
    const groups = {};
    for (const b of items) (groups[b.type] ||= []).push(b);
    listEl.replaceChildren(...[
      ...Object.entries(groups).map(([type, bs]) => [
        h('div', { class: 'group' }, `${type} · ${bs.length}`),
        bs.map((b) => h('div', { class: `item ${b.id === selectedId ? 'active' : ''}`, onclick: () => go('blocks', b.id) },
          h('div', {}, b.title || '(bez tytułu)'),
          h('div', { class: 'sub' }, (b.body || '').slice(0, 90) || (b.tags || []).join(', ')))),
      ]),
      items.length ? [] : [h('div', { class: 'empty' }, 'Brak bloków')],
    ].flat(Infinity));
  };
  refreshLists = renderList;

  const typeSel = h('select', { onchange: (e) => { f.type = e.target.value; renderList(); } },
    h('option', { value: '' }, 'wszystkie typy'), state.meta.types.map((t) => h('option', { value: t.type }, `${t.type} (${t.count})`)));
  typeSel.value = f.type;
  const tagSel = h('select', { onchange: (e) => { f.tag = e.target.value; renderList(); } },
    h('option', { value: '' }, 'wszystkie tagi'), state.meta.tags.map((t) => h('option', { value: t.tag }, `${t.tag} (${t.count})`)));
  tagSel.value = f.tag;

  const newBlock = async () => {
    const type = prompt('Typ nowego bloku (np. use_case, problem, faq):', f.type || 'use_case');
    if (!type) return;
    const b = await api('POST', '/blocks', { type: type.trim(), title: 'Nowy blok', body: '', tags: f.tag ? [f.tag] : [] });
    await loadAll();
    go('blocks', b.id);
  };

  $('#view').replaceChildren(
    h('div', { class: 'col list' },
      h('div', { class: 'tools' },
        h('div', { class: 'row' },
          h('input', { placeholder: 'Szukaj…', value: f.q, oninput: (e) => { f.q = e.target.value; renderList(); } }),
          h('button', { class: 'btn primary', onclick: newBlock }, '+ Blok')),
        h('div', { class: 'row' }, typeSel, tagSel)),
      listEl),
    editor,
  );
  renderList();

  const block = state.blocks.find((b) => b.id === selectedId);
  editor.replaceChildren(block
    ? blockEditor(block, { onDeleted: async () => { await loadAll(); go('blocks'); } })
    : h('div', { class: 'empty' }, 'Wybierz blok z listy albo dodaj nowy. Bloki to Twoja baza wiedzy: use case\'y, problemy, argumenty, wiersze porównań, składniki pakietów. Oferty składasz z nich w zakładce „Oferty”.'));
}

// ------------------------------------------------------------------ widok: Oferty
async function viewOffers(offerId, slideId) {
  if (!offerId && state.offers[0]) return go('offers', state.offers[0].id);

  const listEl = h('div', { class: 'items' });
  const renderList = () => listEl.replaceChildren(
    ...state.offers.map((o) => h('div', { class: `item ${o.id === offerId ? 'active' : ''}`, onclick: () => go('offers', o.id) },
      h('div', {}, o.name), h('div', { class: 'sub' }, [o.data?.client, new Date(o.updated_at).toLocaleString('pl-PL')].filter(Boolean).join(' · ')))),
  );
  refreshLists = renderList;
  renderList();

  const newOffer = async () => {
    const name = prompt('Nazwa nowej oferty:');
    if (!name) return;
    const o = await api('POST', '/offers', { name, data: { client: '', price: '' } });
    await loadAll();
    go('offers', o.id);
  };

  const left = h('div', { class: 'col list', style: 'width: 240px' },
    h('div', { class: 'tools' }, h('button', { class: 'btn primary', onclick: newOffer }, '+ Oferta')),
    listEl);

  if (!offerId) {
    $('#view').replaceChildren(left, h('div', { class: 'empty', style: 'flex:1' }, 'Nie ma jeszcze ofert.'));
    return;
  }

  let offer;
  try {
    offer = await api('GET', `/offers/${encodeURIComponent(offerId)}`);
  } catch (e) {
    toast(e.message, true);
    return go('offers');
  }
  const framesByName = Object.fromEntries(state.library.map((s) => [s.frame, s]));
  const blocksById = Object.fromEntries(state.blocks.map((b) => [b.id, b]));

  // --- podgląd z FigCraft (PNG)
  const shots = h('div', { class: 'shots' });
  const pstatus = h('span', { class: 'phint' });
  const shotFor = new Map();
  const markSelected = () => {
    for (const [id, el] of shotFor) el.classList.toggle('active', id === slideId);
  };
  let previewSeq = 0;
  const refreshPreview = async () => {
    const my = ++previewSeq;
    pstatus.textContent = 'FigCraft renderuje…';
    let p;
    try {
      p = await api('GET', `/offers/${encodeURIComponent(offer.id)}/preview`);
    } catch (e) {
      pstatus.textContent = '';
      shots.replaceChildren(h('div', { class: 'shot-error' }, e.message));
      return;
    }
    if (my !== previewSeq) return;
    // nowe obrazki ładujemy w tle i podmieniamy naraz, bez migania
    const figs = p.slides.map((s, i) => {
      const img = s.url ? h('img', { src: s.url, alt: `Slajd ${i + 1}` }) : null;
      const fig = h('figure', { class: `shot ${s.hidden ? 'is-hidden' : ''}`, onclick: () => selectSlide(s.id, true) },
        img || h('div', { class: 'shot-error' }, s.error || p.error || 'brak podglądu'),
        h('figcaption', {}, `${i + 1} · ${s.frame}${s.hidden ? ' · ukryty' : ''}`));
      return { s, fig, img };
    });
    await Promise.all(figs.filter((x) => x.img).map((x) => x.img.decode().catch(() => {})));
    if (my !== previewSeq) return;
    shotFor.clear();
    for (const x of figs) shotFor.set(x.s.id, x.fig);
    const y = shots.scrollTop;
    shots.replaceChildren(...figs.map((x) => x.fig), p.error ? h('div', { class: 'shot-error' }, p.error) : '');
    shots.scrollTop = y;
    markSelected();
    pstatus.textContent = p.error ? 'błąd renderu' : `FigCraft: ${p.ms} ms`;
  };
  const refreshPreviewSoon = debounce(refreshPreview, 250);

  const preview = h('div', { class: 'preview' },
    h('div', { class: 'pbar' },
      h('button', { class: 'btn primary', onclick: () => download(`/offers/${encodeURIComponent(offer.id)}/pdf`, `${offer.name}.pdf`) }, 'Pobierz PDF'),
      h('button', { class: 'btn', title: 'Gotowa oferta jako plik FigCraft do ręcznych poprawek', onclick: () => download(`/offers/${encodeURIComponent(offer.id)}/figcraft`, `${offer.name}.figcraft`) }, 'Pobierz .figcraft'),
      state.meta.figcraftWebUrl ? h('a', { class: 'btn', href: state.meta.figcraftWebUrl, target: '_blank' }, 'Otwórz FigCraft') : null,
      h('span', { class: 'spacer' }),
      pstatus),
    shots);

  // --- edytor oferty
  const status = h('span', { class: 'status' });
  const saveOffer = saver(status, (patch) => api('PATCH', `/offers/${encodeURIComponent(offer.id)}`, patch));
  const slidesEl = h('div', { class: 'slides' });
  const slideEditorEl = h('div');

  const slideTitle = (s) => String(s.data?.title || s.data?.quote || s.data?.kicker || '').replace(/\*\*/g, '').trim() || s.frame;
  const renderSlides = () => slidesEl.replaceChildren(...offer.slides.map((s, i) =>
    h('div', { class: `slide-row ${s.id === slideId ? 'active' : ''} ${s.hidden ? 'hidden-slide' : ''}`, onclick: () => selectSlide(s.id) },
      h('span', { class: 'n' }, i + 1),
      h('span', { class: 't' }, slideTitle(s), ' ', h('small', {}, `· ${s.frame}${framesByName[s.frame] ? '' : ' (brak w szablonie)'}`)),
      h('span', {},
        h('button', { class: 'icon', title: 'W górę', onclick: (e) => { e.stopPropagation(); move(i, -1); } }, '↑'),
        h('button', { class: 'icon', title: 'W dół', onclick: (e) => { e.stopPropagation(); move(i, 1); } }, '↓')))));

  const move = async (i, d) => {
    const j = i + d;
    if (j < 0 || j >= offer.slides.length) return;
    const ids = offer.slides.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    offer = await api('PUT', `/offers/${encodeURIComponent(offer.id)}/order`, { ids });
    renderSlides();
  };

  // Nowy slajd: wybór z miniatur biblioteki; trafia za aktualnie wybranym (albo na koniec).
  const addSlide = async () => {
    const frame = await pickSlide('Dodaj slajd do oferty');
    if (!frame) return;
    const idx = offer.slides.findIndex((s) => s.id === slideId);
    const s = await api('POST', `/offers/${encodeURIComponent(offer.id)}/slides`, { frame, data: {}, ...(idx >= 0 ? { position: offer.slides[idx].position + 1 } : {}) });
    await loadAll();
    go('offers', offer.id, s.id);
  };

  const offerPanel = h('div', {},
    h('div', { class: 'bar' },
      h('h2', {}, offer.name), status,
      h('button', { class: 'btn', onclick: async () => {
        const o = await api('POST', `/offers/${encodeURIComponent(offer.id)}/duplicate`, {});
        await loadAll(); go('offers', o.id); toast('Utworzono kopię oferty');
      } }, 'Duplikuj'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm(`Usunąć ofertę „${offer.name}” razem ze slajdami?`)) return;
        await api('DELETE', `/offers/${encodeURIComponent(offer.id)}`);
        await loadAll(); go('offers');
      } }, 'Usuń')),
    h('div', { class: 'id' }, `id: ${offer.id}`),
    h('label', { class: 'f' }, 'Nazwa oferty'),
    h('input', { value: offer.name, oninput: (e) => saveOffer({ name: e.target.value }) }),
    h('label', { class: 'f' }, 'Zmienne oferty (w szablonie: {{offer.client}}, {{offer.price}}…)'),
    kvEditor(offer.data || {}, ['client', 'price'], (data) => saveOffer({ data })),
    h('div', { class: 'bar', style: 'margin-top:18px' }, h('h2', { style: 'font-size:14px' }, `Slajdy (${offer.slides.length})`), h('button', { class: 'btn sm', onclick: addSlide }, '+ slajd')),
    slidesEl,
    slideEditorEl,
  );
  renderSlides();

  const renderSlideEditor = () => {
    const slide = offer.slides.find((s) => s.id === slideId);
    slideEditorEl.replaceChildren(slide ? slideEditor(slide, offer, framesByName, blocksById, renderSlides, () => go('offers', offer.id)) : '');
  };
  // wybór slajdu nie przerenderowuje widoku
  const selectSlide = (id, fromPreview = false) => {
    if (id === slideId) return;
    slideId = id;
    history.replaceState(null, '', `#/offers/${encodeURIComponent(offer.id)}/${encodeURIComponent(id)}`);
    renderSlides();
    renderSlideEditor();
    markSelected();
    if (!fromPreview) shotFor.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else slidesEl.querySelector('.slide-row.active')?.scrollIntoView({ block: 'nearest' });
  };
  renderSlideEditor();

  // Każda zmiana (z UI albo z API) -> odśwież listę slajdów i podgląd.
  refreshLists = async () => {
    renderList();
    try {
      const fresh = await api('GET', `/offers/${encodeURIComponent(offer.id)}`);
      offer.slides = fresh.slides;
      renderSlides();
    } catch { /* oferta usunięta */ }
    refreshPreviewSoon();
  };

  $('#view').replaceChildren(left, h('div', { class: 'editor narrow' }, offerPanel), preview);
  await refreshPreview();
  if (slideId) shotFor.get(slideId)?.scrollIntoView({ block: 'center' });
}

function slideEditor(slide, offer, framesByName, blocksById, renderSlides, onDeleted) {
  const status = h('span', { class: 'status' });
  const save = saver(status, async (patch) => {
    const s = await api('PATCH', `/slides/${encodeURIComponent(slide.id)}`, patch);
    Object.assign(slide, s);
    renderSlides();
  }, 350);
  const frame = framesByName[slide.frame];
  const frameBox = h('div', { class: 'frame-pick' },
    frame ? h('img', { src: frame.thumb, alt: slide.frame }) : h('div', { class: 'shot-error' }, 'brak w bibliotece'),
    h('div', {},
      h('div', {}, h('code', {}, slide.frame)),
      frame ? h('div', { class: 'hint' }, `z pliku „${frame.source_name}”`) : null,
      h('button', { class: 'btn sm', style: 'margin-top:6px', onclick: async () => {
        const f = await pickSlide('Zmień wygląd slajdu');
        if (!f || f === slide.frame) return;
        await api('PATCH', `/slides/${encodeURIComponent(slide.id)}`, { frame: f });
        route();
      } }, 'Zmień slajd…')));

  // --- bloki: lista wybranych albo zapytanie
  const useQuery = !!(slide.query && (slide.query.type || slide.query.tag)) && !slide.block_ids?.length;
  const blocksBox = h('div', { class: 'box' });
  const renderBlocks = () => {
    const ids = slide.block_ids || [];
    const setIds = (next) => { slide.block_ids = next; save({ block_ids: next, query: null }); renderBlocks(); };
    const picker = h('select', { onchange: (e) => { if (e.target.value) setIds([...ids, e.target.value]); } },
      h('option', { value: '' }, '+ dodaj blok…'),
      Object.entries(state.blocks.reduce((g, b) => ((g[b.type] ||= []).push(b), g), {})).map(([type, bs]) =>
        h('optgroup', { label: type }, bs.filter((b) => !ids.includes(b.id)).map((b) => h('option', { value: b.id }, b.title)))));
    const q = slide.query || {};
    const setQuery = (patch) => { slide.query = { ...slide.query, ...patch }; save({ query: slide.query, block_ids: [] }); };
    const queryForm = h('div', { class: 'bar' },
      h('input', { placeholder: 'typ, np. use_case', value: q.type || '', oninput: (e) => setQuery({ type: e.target.value.trim() || undefined }) }),
      h('input', { placeholder: 'tag', value: q.tag || '', oninput: (e) => setQuery({ tag: e.target.value.trim() || undefined }) }),
      h('input', { placeholder: 'limit', style: 'width:70px', value: q.limit || '', oninput: (e) => setQuery({ limit: Number(e.target.value) || undefined }) }));
    const mode = blocksBox.dataset.mode || (useQuery ? 'query' : 'list');
    blocksBox.replaceChildren(
      h('h3', {}, `Bloki na slajdzie (w szablonie ${frame?.slots ?? 0} slotów #item) `,
        h('button', { class: `btn sm ${mode === 'list' ? 'primary' : ''}`, onclick: () => { blocksBox.dataset.mode = 'list'; renderBlocks(); } }, 'wybrane'), ' ',
        h('button', { class: `btn sm ${mode === 'query' ? 'primary' : ''}`, onclick: () => { blocksBox.dataset.mode = 'query'; renderBlocks(); } }, 'wg typu / tagu')),
      mode === 'list'
        ? h('div', {},
          h('div', { class: 'picked' }, ids.map((id, i) => {
            const b = blocksById[id];
            return h('div', { class: 'p' },
              h('span', {}, b ? b.title : h('s', {}, id), ' ', h('small', {}, b?.type || 'brak bloku')),
              h('span', {},
                h('button', { class: 'icon', title: 'Edytuj blok', onclick: () => b && (modal(blockEditor(b, { inModal: true, onDeleted: () => $('#modal').click() })), (onModalClose = () => loadAll().then(() => refreshLists?.()))) }, '✎'),
                h('button', { class: 'icon', onclick: () => { if (i > 0) { const n = [...ids]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setIds(n); } } }, '↑'),
                h('button', { class: 'icon', onclick: () => { if (i < ids.length - 1) { const n = [...ids]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setIds(n); } } }, '↓'),
                h('button', { class: 'icon', title: 'Zdejmij ze slajdu', onclick: () => setIds(ids.filter((x) => x !== id)) }, '×')));
          })),
          h('div', { style: 'margin-top:8px' }, picker))
        : h('div', {}, queryForm, h('div', { class: 'hint' }, 'Slajd pokaże wszystkie bloki danego typu/tagu, posortowane po polu „order”, potem po tytule. Nowe bloki pojawią się same.')),
    );
  };
  renderBlocks();

  const fields = frame?.fields || { data: [], item: [], sources: [] };
  return h('div', { class: 'box', style: 'border-color: var(--accent)' },
    h('div', { class: 'bar' },
      h('h2', { style: 'font-size:14px' }, `Slajd ${offer.slides.indexOf(slide) + 1}`), status,
      h('label', {}, h('input', { type: 'checkbox', checked: slide.hidden, onchange: (e) => save({ hidden: e.target.checked }) }), ' ukryty'),
      h('button', { class: 'btn sm danger', onclick: async () => {
        if (!confirm('Usunąć ten slajd?')) return;
        await api('DELETE', `/slides/${encodeURIComponent(slide.id)}`);
        onDeleted();
      } }, 'Usuń')),
    h('label', { class: 'f' }, 'Wygląd (slajd z biblioteki)'), frameBox,
    fields.item.length ? h('div', { class: 'hint' }, `Pola kart: ${fields.item.map((k) => `{{${k}}}`).join(', ')}`) : null,
    h('label', { class: 'f' }, 'Treść slajdu (**słowo** = wyróżnienie z szablonu; puste pole ukrywa warstwę)'),
    kvEditor(slide.data || {}, fields.data, (data) => save({ data })),
    fields.sources.includes('blocks') ? blocksBox : null,
  );
}

// ------------------------------------------------------------------ widok: Biblioteka slajdów
// Sprzedawca projektuje slajd w FigCraft (ramka 1920×1080), zapisuje plik albo JSON strony i wrzuca go tutaj.
function viewTemplates(focusId) {
  refreshLists = null;
  const fileInput = (replaceId) => h('input', { type: 'file', accept: UPLOAD_ACCEPT, multiple: !replaceId, hidden: true, onchange: async (e) => {
    const t = await uploadSlideFiles([...e.target.files], { replaceId });
    e.target.value = '';
    go('templates', t?.id || replaceId || '');
    route();
  } });

  const help = h('details', { class: 'help', open: state.templates.length < 2 },
    h('summary', {}, 'Jak dodać nowy slajd?'),
    h('ol', {},
      h('li', {}, 'W FigCraft narysuj ramkę 1920×1080 i nazwij ją, np. ', h('code', {}, 'case-study'), '. Nazwa ramki to nazwa slajdu w bibliotece.'),
      h('li', {}, 'Teksty, które mają się zmieniać, nazwij polami: ', h('code', {}, '{{data.title}}'), ', ', h('code', {}, '{{offer.client}}'), '. Reszta zostaje taka, jak ją narysujesz.'),
      h('li', {}, 'Karty na bloki z bazy wiedzy nazwij ', h('code', {}, '#item'), ', a teksty w nich ', h('code', {}, '{{title}}'), ', ', h('code', {}, '{{body}}'), ', ', h('code', {}, '{{effect}}'), '…'),
      h('li', {}, 'Zapisz plik .figcraft (albo stronę jako .json) i przeciągnij go tutaj. Działa też .fig, .penpot, .sketch i .svg.')),
    h('table', {},
      h('tr', {}, h('td', {}, h('code', {}, 'Efekt: {{effect}}')), h('td', {}, 'tekst stały + pole; pusty wynik ukrywa warstwę')),
      h('tr', {}, h('td', {}, h('code', {}, '{{offer.client|upper}}')), h('td', {}, 'zmienna oferty wielkimi literami')),
      h('tr', {}, h('td', {}, h('code', {}, '#item:lines')), h('td', {}, 'wiersz z pola data.lines („etykieta | wartość”): {{title}}, {{value}}')),
      h('tr', {}, h('td', {}, h('code', {}, '**tekst**')), h('td', {}, 'w treści: styl 1. wyróżnienia z oryginalnego tekstu (np. czerwony akcent)')),
      h('tr', {}, h('td', {}, h('code', {}, '[[2:tekst]]')), h('td', {}, 'w nazwie warstwy: styl 2. wyróżnienia'))));

  const drop = h('div', { class: 'dropzone' },
    h('b', {}, 'Przeciągnij tu pliki ze slajdami'), h('span', {}, ' albo '),
    h('label', { class: 'btn primary' }, 'Wybierz pliki', fileInput(null)), ' ',
    h('button', { class: 'btn', onclick: pasteJsonDialog }, 'Wklej JSON'));
  const view = h('div', { class: 'editor library' }, h('div', { class: 'bar' }, h('h2', {}, `Biblioteka slajdów (${state.library.length})`)), drop, help);

  for (const t of state.templates) {
    const slides = state.library.filter((s) => s.source === t.id);
    const status = h('span', { class: 'status' });
    const save = saver(status, (patch) => api('PATCH', `/templates/${encodeURIComponent(t.id)}`, patch));
    view.append(h('section', { class: `lib-file ${t.id === focusId ? 'focus' : ''}`, id: `lib-${t.id}` },
      h('div', { class: 'bar' },
        h('input', { class: 'lib-name', value: t.name, oninput: (e) => save({ name: e.target.value }) }), status,
        h('span', { class: 'hint' }, `${slides.length} slajd(ów) · ${t.size > 1048576 ? `${(t.size / 1048576).toFixed(1)} MB` : `${Math.ceil(t.size / 1024)} KB`} · ${new Date(t.updated_at).toLocaleString('pl-PL')}`),
        h('span', { class: 'spacer' }),
        h('a', { class: 'btn sm', href: `/api/templates/${encodeURIComponent(t.id)}/file` }, 'Pobierz .figcraft'),
        h('label', { class: 'btn sm', title: 'Wgraj poprawioną wersję tego pliku' }, 'Podmień', fileInput(t.id)),
        state.meta.figcraftWebUrl ? h('a', { class: 'btn sm', href: state.meta.figcraftWebUrl, target: '_blank' }, 'FigCraft') : null,
        h('button', { class: 'btn sm danger', onclick: async () => {
          const used = state.offers.length ? ' Oferty, które używają tych slajdów, pokażą błąd.' : '';
          if (!confirm(`Usunąć „${t.name}” (${slides.length} slajdów) z biblioteki?${used}`)) return;
          await api('DELETE', `/templates/${encodeURIComponent(t.id)}`);
          await loadAll(); route();
        } }, 'Usuń')),
      h('div', { class: 'lib-grid' }, slides.map((s) => h('figure', { class: 'lib-card' },
        h('img', { src: s.thumb, alt: s.frame, loading: 'lazy' }),
        h('figcaption', {},
          h('code', {}, s.frame),
          h('div', { class: 'hint' }, [
            s.fields.data.length ? `pola: ${s.fields.data.join(', ')}` : 'slajd stały',
            s.slots ? `karty #item: ${s.slots} (${s.fields.item.join(', ')})` : null,
          ].filter(Boolean).join(' · '))))))));
  }
  $('#view').replaceChildren(view);
  if (focusId) $(`#lib-${CSS.escape(focusId)}`)?.scrollIntoView({ block: 'start' });

  // przeciąganie plików na stronę
  view.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  view.addEventListener('dragleave', (e) => { if (e.target === view) drop.classList.remove('over'); });
  view.addEventListener('drop', async (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    const t = await uploadSlideFiles(files);
    go('templates', t?.id || '');
    route();
  });
}

// ------------------------------------------------------------------ import
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let dump;
  try {
    dump = JSON.parse(await file.text());
  } catch {
    return toast('To nie jest poprawny plik JSON', true);
  }
  const counts = ['blocks', 'templates', 'offers', 'slides'].map((k) => `${k}: ${(dump[k] || []).length}`).join(', ');
  const run = async (mode) => {
    close();
    try {
      const r = await api('POST', `/import?mode=${mode}`, dump);
      toast(`Zaimportowano (${Object.entries(r.imported).map(([k, v]) => `${k} ${v}`).join(', ')})`);
      await loadAll();
      route();
    } catch (err) {
      toast(err.message, true);
    }
  };
  const close = modal(h('div', {},
    h('h3', {}, `Import: ${file.name}`),
    h('p', {}, counts),
    h('p', {}, h('b', {}, 'Scal'), ': dodaje nowe rekordy i nadpisuje te o tym samym id, resztę zostawia.'),
    h('p', {}, h('b', {}, 'Zastąp'), ': kasuje całą obecną bazę i wczytuje tylko zawartość pliku. Najpierw zrób eksport.'),
    h('div', { class: 'bar' }, h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => close() }, 'Anuluj'),
      h('button', { class: 'btn danger', onclick: () => confirm('Na pewno skasować obecną bazę?') && run('replace') }, 'Zastąp'),
      h('button', { class: 'btn primary', onclick: () => run('merge') }, 'Scal'))));
});

// ------------------------------------------------------------------ start
loadAll().then(route).catch((e) => toast(e.message, true));
