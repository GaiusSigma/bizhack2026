// Offer Studio: minimalistyczny frontend bez buildu. Wszystko idzie przez to samo REST API,
// z którego mogą korzystać skrypty i n8n (patrz /static/api.html).

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
// `hints` to klucze, które warto pokazać od razu (np. wyczytane z szablonu layoutu).
function kvEditor(obj, hints, onChange) {
  const rows = [];
  const wrap = h('div', { class: 'kv' });
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
  const list = h('div', { class: 'kv' });
  for (const [k, v] of Object.entries(obj)) addRow(k, v);
  for (const k of hints || []) if (!(k in obj)) addRow(k, '');
  wrap.append(list, h('div', {}, h('button', { class: 'btn sm', onclick: () => addRow().k.focus() }, '+ pole')));
  return wrap;
}

function modal(content) {
  const m = $('#modal');
  m.replaceChildren(h('div', { class: 'dlg' }, content));
  m.hidden = false;
  const close = () => { m.hidden = true; m.replaceChildren(); onModalClose?.(); onModalClose = null; };
  m.onclick = (e) => { if (e.target === m) close(); };
  return close;
}
let onModalClose = null;
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) $('#modal').click(); });

// ------------------------------------------------------------------ stan i routing
const state = { blocks: [], offers: [], layouts: [], meta: { types: [], tags: [] }, filter: { type: '', tag: '', q: '' } };

async function loadAll() {
  [state.blocks, state.offers, state.layouts, state.meta] = await Promise.all([
    api('GET', '/blocks'), api('GET', '/offers'), api('GET', '/layouts'), api('GET', '/meta'),
  ]);
}

function route() {
  const [view = 'offers', id = '', sub = ''] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  ({ blocks: viewBlocks, offers: viewOffers, layouts: viewLayouts, assets: viewAssets }[view] || viewOffers)(id, sub);
}
const go = (...parts) => { location.hash = `#/${parts.filter((p) => p != null && p !== '').map(encodeURIComponent).join('/')}`; };
document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => go(b.dataset.view)));
addEventListener('hashchange', route);

// Zmiany z innych kart / z API odświeżają listy (edytorów w trakcie pisania nie ruszamy).
let editingUntil = 0;
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
let refreshLists = null;

// ------------------------------------------------------------------ edytor bloku (używany w Wiedzy i z podglądu oferty)
function blockEditor(block, { onDeleted, inModal = false } = {}) {
  const status = h('span', { class: 'status' });
  const save = saver(status, async (patch) => {
    const b = await api('PATCH', `/blocks/${encodeURIComponent(block.id)}`, patch);
    Object.assign(block, b);
  });
  const typeList = h('datalist', { id: 'types-dl' }, state.meta.types.map((t) => h('option', { value: t.type })));
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
    typeList,
    h('input', { value: block.type, list: 'types-dl', oninput: (e) => e.target.value.trim() && save({ type: e.target.value.trim() }) }),
    h('label', { class: 'f' }, 'Tytuł'),
    h('input', { value: block.title, oninput: (e) => save({ title: e.target.value }) }),
    h('label', { class: 'f' }, 'Treść (Markdown)'),
    autosize(h('textarea', { rows: 4, oninput: (e) => save({ body: e.target.value }) }, block.body)),
    h('label', { class: 'f' }, 'Tagi (po przecinku)'),
    h('input', { value: (block.tags || []).join(', '), placeholder: tagList, oninput: (e) => save({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }) }),
    h('label', { class: 'f' }, 'Dodatkowe pola'),
    kvEditor(block.data || {}, [], (data) => save({ data })),
    h('div', { class: 'hint' }, 'Pola są dostępne w layoucie pod swoją nazwą, np. {{effect}}. Zmiany zapisują się same.'),
  );
}

// ------------------------------------------------------------------ widok: Wiedza
function viewBlocks(selectedId) {
  const f = state.filter;
  const view = $('#view');
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

  view.replaceChildren(
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
  const view = $('#view');
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
    view.replaceChildren(left, h('div', { class: 'empty', style: 'flex:1' }, 'Nie ma jeszcze ofert.'));
    return;
  }

  let offer;
  try {
    offer = await api('GET', `/offers/${encodeURIComponent(offerId)}`);
  } catch (e) {
    toast(e.message, true);
    return go('offers');
  }
  const layoutsById = Object.fromEntries(state.layouts.map((l) => [l.id, l]));
  const blocksById = Object.fromEntries(state.blocks.map((b) => [b.id, b]));

  // --- podgląd
  const iframe = h('iframe', { src: `/preview/${encodeURIComponent(offer.id)}${slideId ? `?slide=${encodeURIComponent(slideId)}` : ''}`, title: 'Podgląd oferty' });
  const selectInPreview = (id) => iframe.contentWindow?.postMessage({ source: 'offer-studio', select: id }, location.origin);
  const preview = h('div', { class: 'preview' },
    h('div', { class: 'pbar' },
      h('button', { class: 'btn primary', onclick: () => downloadPdf(offer) }, 'Pobierz PDF'),
      h('button', { class: 'btn', title: 'Druk z przeglądarki (Zapisz jako PDF)', onclick: () => printOffer(offer) }, 'Drukuj'),
      h('a', { class: 'btn', href: `/preview/${encodeURIComponent(offer.id)}`, target: '_blank' }, 'Otwórz podgląd'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'phint' }, 'kliknij element slajdu, aby go edytować')),
    iframe);

  // --- edytor oferty
  const status = h('span', { class: 'status' });
  const saveOffer = saver(status, (patch) => api('PATCH', `/offers/${encodeURIComponent(offer.id)}`, patch));
  const slidesEl = h('div', { class: 'slides' });
  const slideEditorEl = h('div');

  const slideTitle = (s) => s.data?.title?.replace(/\*\*/g, '') || s.data?.asset || layoutsById[s.layout_id]?.name || s.layout_id;
  const renderSlides = () => slidesEl.replaceChildren(...offer.slides.map((s, i) =>
    h('div', { class: `slide-row ${s.id === slideId ? 'active' : ''} ${s.hidden ? 'hidden-slide' : ''}`, onclick: () => selectSlide(s.id) },
      h('span', { class: 'n' }, i + 1),
      h('span', { class: 't' }, slideTitle(s), ' ', h('small', {}, `· ${layoutsById[s.layout_id]?.name || s.layout_id}`)),
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

  const addSlide = async () => {
    const layoutSel = h('select', {}, state.layouts.map((l) => h('option', { value: l.id }, `${l.name} (${l.id})`)));
    const close = modal(h('div', {},
      h('h3', {}, 'Nowy slajd'),
      h('label', { class: 'f' }, 'Layout'), layoutSel,
      h('div', { class: 'hint' }, 'Slajd trafi za aktualnie wybranym (albo na koniec).'),
      h('div', { class: 'bar', style: 'margin-top:16px' }, h('span', { class: 'spacer' }),
        h('button', { class: 'btn primary', onclick: async () => {
          const idx = offer.slides.findIndex((s) => s.id === slideId);
          const s = await api('POST', `/offers/${encodeURIComponent(offer.id)}/slides`, { layout_id: layoutSel.value, data: {}, ...(idx >= 0 ? { position: offer.slides[idx].position + 1 } : {}) });
          close();
          go('offers', offer.id, s.id);
        } }, 'Dodaj'))));
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
    h('label', { class: 'f' }, 'Zmienne oferty (w layoutach: {{offer.client}}, {{offer.price}}…)'),
    kvEditor(offer.data || {}, ['client', 'price'], (data) => saveOffer({ data })),
    h('div', { class: 'bar', style: 'margin-top:18px' }, h('h2', { style: 'font-size:14px' }, `Slajdy (${offer.slides.length})`), h('button', { class: 'btn sm', onclick: addSlide }, '+ slajd')),
    slidesEl,
    slideEditorEl,
  );
  renderSlides();

  // --- edytor slajdu (wybór slajdu nie przeładowuje podglądu)
  const renderSlideEditor = () => {
    const slide = offer.slides.find((s) => s.id === slideId);
    slideEditorEl.replaceChildren(slide ? slideEditor(slide, offer, layoutsById, blocksById, renderSlides, () => go('offers', offer.id)) : '');
  };
  const selectSlide = (id, fromPreview = false) => {
    if (id === slideId) return;
    slideId = id;
    history.replaceState(null, '', `#/offers/${encodeURIComponent(offer.id)}/${encodeURIComponent(id)}`);
    renderSlides();
    renderSlideEditor();
    if (!fromPreview) selectInPreview(id);
  };
  renderSlideEditor();

  // Zmiany z API (np. z n8n albo innej karty): odśwież listę slajdów, edytora nie ruszaj.
  refreshLists = async () => {
    renderList();
    try {
      const fresh = await api('GET', `/offers/${encodeURIComponent(offer.id)}`);
      offer.slides = fresh.slides;
      renderSlides();
    } catch { /* oferta usunięta */ }
  };

  view.replaceChildren(left, h('div', { class: 'editor narrow' }, offerPanel), preview);
  iframe.addEventListener('load', () => slideId && selectInPreview(slideId));

  // Kliknięcie w podglądzie: blok -> edytor bloku w okienku, tło slajdu -> wybór slajdu.
  window.onmessage = (e) => {
    if (e.origin !== location.origin || e.data?.source !== 'offer-preview') return;
    if (e.data.slide) selectSlide(e.data.slide, true);
    if (e.data.block) {
      const b = state.blocks.find((x) => x.id === e.data.block);
      if (b) {
        modal(blockEditor(b, { inModal: true, onDeleted: () => $('#modal').click() }));
        onModalClose = () => loadAll().then(() => (refreshLists?.()));
      }
    }
  };
}

function slideEditor(slide, offer, layoutsById, blocksById, renderSlides, onDeleted) {
  const status = h('span', { class: 'status' });
  const save = saver(status, async (patch) => {
    const s = await api('PATCH', `/slides/${encodeURIComponent(slide.id)}`, patch);
    Object.assign(slide, s);
    renderSlides();
  }, 350);
  const layout = layoutsById[slide.layout_id];
  // Klucze `data.xxx` używane w szablonie podpowiadamy jako puste pola.
  const hints = layout ? [...new Set([...layout.template.matchAll(/data\.([A-Za-z_][\w]*)/g)].map((m) => m[1]))] : [];

  const layoutSel = h('select', { onchange: async (e) => { await api('PATCH', `/slides/${encodeURIComponent(slide.id)}`, { layout_id: e.target.value }); route(); } },
    state.layouts.map((l) => h('option', { value: l.id }, l.name)));
  layoutSel.value = slide.layout_id;

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
    const queryForm = h('div', { class: 'bar' },
      h('input', { placeholder: 'typ, np. use_case', value: q.type || '', oninput: (e) => { slide.query = { ...slide.query, type: e.target.value.trim() || undefined }; save({ query: slide.query, block_ids: [] }); } }),
      h('input', { placeholder: 'tag', value: q.tag || '', oninput: (e) => { slide.query = { ...slide.query, tag: e.target.value.trim() || undefined }; save({ query: slide.query, block_ids: [] }); } }),
      h('input', { placeholder: 'limit', style: 'width:70px', value: q.limit || '', oninput: (e) => { slide.query = { ...slide.query, limit: Number(e.target.value) || undefined }; save({ query: slide.query, block_ids: [] }); } }));
    const mode = blocksBox.dataset.mode || (useQuery ? 'query' : 'list');
    blocksBox.replaceChildren(
      h('h3', {}, 'Bloki na slajdzie ',
        h('button', { class: `btn sm ${mode === 'list' ? 'primary' : ''}`, onclick: () => { blocksBox.dataset.mode = 'list'; renderBlocks(); } }, 'wybrane'), ' ',
        h('button', { class: `btn sm ${mode === 'query' ? 'primary' : ''}`, onclick: () => { blocksBox.dataset.mode = 'query'; renderBlocks(); } }, 'wg typu / tagu')),
      mode === 'list'
        ? h('div', {},
          h('div', { class: 'picked' }, ids.map((id, i) => {
            const b = blocksById[id];
            return h('div', { class: 'p' },
              h('span', {}, b ? b.title : h('s', {}, id), ' ', h('small', {}, b?.type || 'brak bloku')),
              h('span', {},
                h('button', { class: 'icon', title: 'Edytuj blok', onclick: () => b && (modal(blockEditor(b, { inModal: true, onDeleted: () => $('#modal').click() })), (onModalClose = () => loadAll())) }, '✎'),
                h('button', { class: 'icon', onclick: () => { if (i > 0) { const n = [...ids]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setIds(n); } } }, '↑'),
                h('button', { class: 'icon', onclick: () => { if (i < ids.length - 1) { const n = [...ids]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setIds(n); } } }, '↓'),
                h('button', { class: 'icon', title: 'Zdejmij ze slajdu', onclick: () => setIds(ids.filter((x) => x !== id)) }, '×')));
          })),
          h('div', { style: 'margin-top:8px' }, picker))
        : h('div', {}, queryForm, h('div', { class: 'hint' }, 'Slajd pokaże wszystkie bloki danego typu/tagu, posortowane po polu „order”, potem po tytule. Nowe bloki pojawią się same.')),
    );
  };
  renderBlocks();

  return h('div', { class: 'box', style: 'border-color: var(--accent)' },
    h('div', { class: 'bar' },
      h('h2', { style: 'font-size:14px' }, `Slajd ${offer.slides.indexOf(slide) + 1}`), status,
      h('label', {}, h('input', { type: 'checkbox', checked: slide.hidden, onchange: (e) => save({ hidden: e.target.checked }) }), ' ukryty'),
      h('button', { class: 'btn sm danger', onclick: async () => {
        if (!confirm('Usunąć ten slajd?')) return;
        await api('DELETE', `/slides/${encodeURIComponent(slide.id)}`);
        onDeleted();
      } }, 'Usuń')),
    h('label', { class: 'f' }, 'Layout'), layoutSel,
    layout?.description ? h('div', { class: 'hint' }, layout.description) : null,
    h('label', { class: 'f' }, 'Treść slajdu (**słowo** = kolor akcentu)'),
    kvEditor(slide.data || {}, hints, (data) => save({ data })),
    layout && /blocks/.test(layout.template) ? blocksBox : null,
  );
}

async function downloadPdf(offer) {
  toast('Generuję PDF…');
  try {
    const res = await fetch(`/api/offers/${encodeURIComponent(offer.id)}/pdf`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    const url = URL.createObjectURL(await res.blob());
    h('a', { href: url, download: `${offer.name}.pdf` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast('Gotowe');
  } catch (e) {
    toast(e.message, true);
  }
}

function printOffer(offer) {
  const w = window.open(`/preview/${encodeURIComponent(offer.id)}`);
  w?.addEventListener('load', () => w.document.fonts.ready.then(() => w.print()));
}

// ------------------------------------------------------------------ widok: Layouty
function viewLayouts(layoutId) {
  const view = $('#view');
  const listEl = h('div', { class: 'items' },
    h('div', { class: `item ${layoutId === '_theme' ? 'active' : ''}`, onclick: () => go('layouts', '_theme') }, h('div', {}, 'Motyw (wspólny CSS)'), h('div', { class: 'sub' }, 'kolory, fonty, wspólne klasy')),
    h('div', { class: 'group' }, 'Layouty slajdów'),
    state.layouts.map((l) => h('div', { class: `item ${l.id === layoutId ? 'active' : ''}`, onclick: () => go('layouts', l.id) },
      h('div', {}, l.name), h('div', { class: 'sub' }, l.id))));
  refreshLists = null;
  const editor = h('div', { class: 'editor' });

  const newLayout = async () => {
    const name = prompt('Nazwa layoutu:');
    if (!name) return;
    const l = await api('POST', '/layouts', { name, template: '<div class="pattern"></div>\n<div class="content">\n  <h2 class="h1">{{mdi data.title}}</h2>\n</div>', css: '' });
    await loadAll();
    go('layouts', l.id);
  };

  view.replaceChildren(
    h('div', { class: 'col list', style: 'width: 260px' },
      h('div', { class: 'tools' }, h('button', { class: 'btn primary', onclick: newLayout }, '+ Layout')), listEl),
    editor);

  if (layoutId === '_theme') {
    const status = h('span', { class: 'status' });
    api('GET', '/theme').then(({ css }) => {
      const save = saver(status, (v) => api('PUT', '/theme', { css: v }));
      editor.replaceChildren(
        h('div', { class: 'bar' }, h('h2', {}, 'Motyw'), status),
        h('div', { class: 'hint' }, 'CSS dołączany do każdej oferty. Zmiany widać od razu w otwartych podglądach.'),
        h('textarea', { class: 'code', style: 'min-height: 70vh', spellcheck: 'false', oninput: (e) => save(e.target.value) }, css));
    });
    return;
  }

  const l = state.layouts.find((x) => x.id === layoutId);
  if (!l) {
    editor.replaceChildren(h('div', { class: 'empty' }, 'Layout to szablon slajdu w Handlebars + CSS. Dane: {{data.*}} (treść slajdu), {{offer.*}} (zmienne oferty), {{#each blocks}} (bloki). Helpery: md, mdi, upper, inc, pad2, or, eq, lines, split.'));
    return;
  }
  const status = h('span', { class: 'status' });
  const save = saver(status, (patch) => api('PATCH', `/layouts/${encodeURIComponent(l.id)}`, patch));
  editor.replaceChildren(
    h('div', { class: 'bar' }, h('h2', {}, l.name), status,
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm(`Usunąć layout „${l.name}”? Slajdy, które go używają, pokażą błąd.`)) return;
        await api('DELETE', `/layouts/${encodeURIComponent(l.id)}`);
        await loadAll(); go('layouts');
      } }, 'Usuń')),
    h('div', { class: 'id' }, `id: ${l.id}`),
    h('label', { class: 'f' }, 'Nazwa'), h('input', { value: l.name, oninput: (e) => save({ name: e.target.value }) }),
    h('label', { class: 'f' }, 'Opis (podpowiedź przy edycji slajdu)'), autosize(h('textarea', { rows: 2, oninput: (e) => save({ description: e.target.value }) }, l.description)),
    h('label', { class: 'f' }, 'Szablon (Handlebars)'), h('textarea', { class: 'code', spellcheck: 'false', style: 'min-height: 320px', oninput: (e) => save({ template: e.target.value }) }, l.template),
    h('label', { class: 'f' }, `CSS (zakres: .layout-${l.id})`), h('textarea', { class: 'code', spellcheck: 'false', oninput: (e) => save({ css: e.target.value }) }, l.css),
    h('div', { class: 'hint' }, 'Dodaj atrybut data-block="{{id}}" do elementu bloku, żeby dało się go kliknąć w podglądzie.'));
}

// ------------------------------------------------------------------ widok: Obrazki
async function viewAssets() {
  const view = $('#view');
  refreshLists = null;
  const assets = await api('GET', '/assets');
  const upload = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => {
    for (const file of e.target.files) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/assets', { method: 'POST', body: fd });
      if (!res.ok) toast((await res.json()).error, true);
    }
    viewAssets();
  } });
  view.replaceChildren(h('div', { class: 'editor' },
    h('div', { class: 'bar' }, h('h2', {}, 'Obrazki'), h('label', { class: 'btn primary' }, '+ Wgraj', upload)),
    h('div', { class: 'hint', style: 'margin-bottom:12px' }, 'W layoutach i treści używaj adresu /assets/<id>, np. <img src="/assets/gaius-logo">. Do slajdu „Obraz na cały slajd” wpisz samo id.'),
    h('div', { class: 'assets' }, assets.map((a) => h('div', { class: 'asset' },
      h('div', { class: 'img' }, h('img', { src: `/assets/${encodeURIComponent(a.id)}`, alt: a.name })),
      h('div', { class: 'meta' },
        h('span', { class: 'id', title: a.name }, a.id),
        h('span', {},
          h('button', { class: 'icon', title: 'Kopiuj adres', onclick: () => navigator.clipboard.writeText(`/assets/${a.id}`).then(() => toast('Skopiowano')) }, '⧉'),
          h('button', { class: 'icon', title: 'Usuń', onclick: async () => { if (confirm(`Usunąć ${a.id}?`)) { await api('DELETE', `/assets/${encodeURIComponent(a.id)}`); viewAssets(); } } }, '×'))))))));
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
  const counts = ['blocks', 'layouts', 'offers', 'slides', 'assets'].map((k) => `${k}: ${(dump[k] || []).length}`).join(', ');
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
