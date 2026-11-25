// Offer Studio: minimalistyczny frontend bez buildu. Wszystko idzie przez to samo REST API,
// z którego mogą korzystać skrypty i n8n (patrz /static/api.html). Slajdy renderuje FigCraft.

import {
  $, CATEGORY_LABELS, UPLOAD_ACCEPT, api, autosize, debounce, download, go, h, kvEditor, loadAll, modal, saver, slugify, state, tileLabel, toast, ui,
} from './lib.js';
import { viewNewOffer } from './views/new-offer.js';
import { viewOffer, viewOfferList } from './views/offer.js';
import { viewScenarios } from './views/scenarios.js';
import { plainTags, tileTagEditor, viewTiles } from './views/tiles.js';

const BLOCK_TYPE_LABELS = {
  rozwiazanie: 'Rozwiązania', use_case: 'Przypadki użycia', problem: 'Problemy', pillar: 'Filary', signal: 'Sygnały gotowości', step: 'Kroki wdrożenia',
  comparison: 'Porównanie', package: 'Składniki pakietu', person: 'Osoby', differentiator: 'Wyróżniki',
};

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
    ui.onModalClose = () => resolve(picked);
  });
}

const VIEWS = {
  blocks: (...a) => viewBlocks(...a),
  templates: (...a) => viewTemplates(...a),
  components: (...a) => viewComponents(...a),
  'offer-advanced': (...a) => viewOffers(...a),
  tiles: (...a) => viewTiles(...a),
  scenarios: (...a) => viewScenarios(...a),
};

function route() {
  ui.refresh = null;
  const [view = 'offers', id = '', sub = ''] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'offers' || !VIEWS[view]) return routeOffers(id, sub);
  VIEWS[view](id, sub);
}

// Oferty: lista, nowa oferta z kafelków, widok oferty z kafelków albo dotychczasowy edytor (oferty składane ręcznie).
function routeOffers(id, sub) {
  document.querySelector('#tabs button[data-view="offers"]')?.classList.add('active');
  if (!id) return viewOfferList();
  if (id === 'new') return viewNewOffer();
  const o = state.offers.find((x) => x.id === id);
  if (o?.data?.scenario_id) return viewOffer(id, sub);
  Promise.resolve(viewOffers(id, sub)).then(() => {
    if (!o) return;
    document.querySelector('.editor.narrow')?.prepend(h('div', { class: 'legacy-note' },
      'Ta oferta nie powstała z kafelków, więc edytujesz ją ręcznie. ', h('a', { href: '#/offers/new' }, 'Nowa oferta z kafelków')));
  });
}
document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => go(b.dataset.view)));
addEventListener('hashchange', route);

// Zmiany z innych kart / z API odświeżają listy i podgląd (edytorów w trakcie pisania nie ruszamy).
let editingUntil = 0;
document.addEventListener('input', () => (editingUntil = Date.now() + 2500), true);
const es = new EventSource('/api/events');
es.onmessage = debounce(async (e) => {
  const ev = JSON.parse(e.data);
  if (ev.type === 'hello') return;
  await loadAll();
  const inOffers = location.hash.startsWith('#/offers') || location.hash === '';
  if (!inOffers && Date.now() > editingUntil && $('#modal').hidden) route();
  else ui.refresh?.();
}, 300);


// ------------------------------------------------------------------ edytor bloku (Wiedza i okienko z oferty)
function blockEditor(block, { onDeleted, inModal = false } = {}) {
  const status = h('span', { class: 'status' });
  const save = saver(status, async (patch) => {
    const b = await api('PATCH', `/blocks/${encodeURIComponent(block.id)}`, patch);
    Object.assign(block, b);
  });
  const tagList = state.meta.tags.map((t) => t.tag).filter((t) => !t.includes(':')).join(', ');
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
    block.type === 'rozwiazanie' ? [
      h('label', { class: 'f' }, 'Problem klienta'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ data: { problem: e.target.value } }) }, block.data?.problem || '')),
      h('label', { class: 'f' }, 'Rozwiązanie (co robi Gaius)'),
      autosize(h('textarea', { rows: 3, oninput: (e) => save({ body: e.target.value }) }, block.body)),
      h('label', { class: 'f' }, 'Korzyść (trafia na slajd)'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ data: { effect: e.target.value } }) }, block.data?.effect || '')),
      h('label', { class: 'f' }, 'Wartość'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ data: { wartosc: e.target.value } }) }, block.data?.wartosc || '')),
    ] : [
      h('label', { class: 'f' }, 'Treść (listy „- ” zamieniają się w linie, **tekst** = akcent)'),
      autosize(h('textarea', { rows: 4, oninput: (e) => save({ body: e.target.value }) }, block.body)),
    ],
    h('label', { class: 'f' }, 'Kafelki: dla jakich klientów jest ten blok (klik włącza i wyłącza)'),
    tileTagEditor(block.tags, (tags) => {
      const next = [...plainTags(block.tags), ...tags.filter((t) => t.includes(':'))];
      block.tags = next;
      save({ tags: next });
    }),
    h('details', { class: 'advanced' }, h('summary', {}, 'Zaawansowane: zwykłe tagi i pola dla szablonu'),
      h('label', { class: 'f' }, 'Zwykłe tagi (po przecinku)'),
      h('input', { value: plainTags(block.tags).join(', '), placeholder: tagList, oninput: (e) => {
        const next = [...e.target.value.split(',').map((x) => x.trim()).filter(Boolean), ...(block.tags || []).filter((t) => t.includes(':'))];
        block.tags = next;
        save({ tags: next });
      } }),
      h('label', { class: 'f' }, 'Dodatkowe pola'),
      kvEditor(block.data || {}, [], (data) => save({ data })),
      h('div', { class: 'hint' }, 'W szablonie FigCraft pole wstawiasz nazwą warstwy, np. {{effect}}. Zmiany zapisują się same.')),
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
      (!f.tile || (b.tags || []).includes(f.tile)) &&
      (!q || `${b.title} ${b.body} ${JSON.stringify(b.data)}`.toLowerCase().includes(q)));
    const groups = {};
    for (const b of items) (groups[b.type] ||= []).push(b);
    listEl.replaceChildren(...[
      ...Object.entries(groups).map(([type, bs]) => [
        h('div', { class: 'group' }, `${BLOCK_TYPE_LABELS[type] || type} · ${bs.length}`),
        bs.map((b) => h('div', { class: `item ${b.id === selectedId ? 'active' : ''}`, onclick: () => go('blocks', b.id) },
          h('div', {}, b.title || '(bez tytułu)'),
          h('div', { class: 'sub' }, (b.body || '').slice(0, 90)),
          h('div', { class: 'item-tiles' }, (b.tags || []).filter((t) => t.includes(':')).map((t) => h('span', { class: `chip tile-chip small ${t.split(':')[0]}` }, tileLabel(t)))))),
      ]),
      items.length ? [] : [h('div', { class: 'empty' }, 'Brak bloków')],
    ].flat(Infinity));
  };
  ui.refresh = renderList;

  const typeSel = h('select', { onchange: (e) => { f.type = e.target.value; renderList(); } },
    h('option', { value: '' }, 'wszystkie typy'), state.meta.types.map((t) => h('option', { value: t.type }, `${t.type} (${t.count})`)));
  typeSel.value = f.type;
  const tagSel = h('select', { onchange: (e) => { f.tile = e.target.value; renderList(); } },
    h('option', { value: '' }, 'wszystkie kafelki'),
    Object.entries(CATEGORY_LABELS).map(([cat, title]) => h('optgroup', { label: title },
      state.tiles.filter((t) => t.category === cat).map((t) => h('option', { value: t.id }, t.label)))));
  tagSel.value = f.tile || '';

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
  ui.refresh = renderList;
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
  ui.refresh = async () => {
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
                h('button', { class: 'icon', title: 'Edytuj blok', onclick: () => b && (modal(blockEditor(b, { inModal: true, onDeleted: () => $('#modal').click() })), (ui.onModalClose = () => loadAll().then(() => ui.refresh?.()))) }, '✎'),
                h('button', { class: 'icon', onclick: () => { if (i > 0) { const n = [...ids]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setIds(n); } } }, '↑'),
                h('button', { class: 'icon', onclick: () => { if (i < ids.length - 1) { const n = [...ids]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setIds(n); } } }, '↓'),
                h('button', { class: 'icon', title: 'Zdejmij ze slajdu', onclick: () => setIds(ids.filter((x) => x !== id)) }, '×')));
          })),
          h('div', { style: 'margin-top:8px' }, picker))
        : h('div', {}, queryForm, h('div', { class: 'hint' }, 'Slajd pokaże wszystkie bloki danego typu/tagu, posortowane po polu „order”, potem po tytule. Nowe bloki pojawią się same.')),
    );
  };
  renderBlocks();

  const fields = frame?.fields || { data: [], item: [], sources: [], picks: {} };
  const pickBoxes = Object.entries(fields.picks || {}).map(([set, slots]) => picksBox(slide, set, slots, save));
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
    pickBoxes,
  );
}

// ------------------------------------------------------------------ komponenty na slajdzie (#pick:zestaw)
const compChips = (c) => [
  c.variant ? h('span', { class: `chip ${c.variant === 'wyroznienie' ? 'green' : ''}` }, c.variant) : null,
  c.topic ? h('span', { class: 'chip' }, c.topic) : null,
];

function picksBox(slide, set, slots, save) {
  const box = h('div', { class: 'box' });
  const meta = state.componentSets.find((x) => x.id === set);
  const render = (aiResult) => {
    const byId = Object.fromEntries(state.components.map((c) => [c.id, c]));
    const picks = slide.picks?.[set] || [];
    const setPicks = (next) => {
      slide.picks = { ...(slide.picks || {}), [set]: next };
      save({ picks: slide.picks });
      render();
    };
    const swap = (i, j) => { const n = [...picks]; [n[i], n[j]] = [n[j], n[i]]; setPicks(n); };
    const brief = autosize(h('textarea', { rows: 2, placeholder: 'Brief dla AI, np. „bank, boją się chmury, decyduje zarząd”. Zmienne oferty (klient itp.) AI widzi samo.' }, box.dataset.brief || ''));
    brief.oninput = () => (box.dataset.brief = brief.value);
    const aiBtn = h('button', { class: 'btn primary sm', onclick: async () => {
      aiBtn.disabled = true;
      aiBtn.textContent = 'AI dobiera karty…';
      try {
        const r = await api('POST', `/slides/${encodeURIComponent(slide.id)}/pick`, { brief: brief.value });
        slide.picks = r.slide.picks;
        toast(`AI wybrało ${r.picks[set]?.length ?? 0} kart`);
        render(r);
      } catch (e) {
        toast(e.message, true);
        aiBtn.disabled = false;
        aiBtn.textContent = 'Dobierz karty (AI)';
      }
    } }, 'Dobierz karty (AI)');
    box.replaceChildren(...[
      h('h3', {}, `Karty z zestawu @${set}: ${picks.length} / ${slots} `,
        h('button', { class: 'btn sm', onclick: async () => {
          const id = await pickComponent(set, picks.map((p) => p.component));
          if (id) setPicks([...picks, { component: id }]);
        } }, '+ karta'), ' ',
        h('a', { class: 'btn sm ghost', href: `#/components/${encodeURIComponent(set)}` }, 'opisy kart')),
      meta?.rules ? h('div', { class: 'hint' }, `Zasady: ${meta.rules}`) : null,
      picks.length ? null : h('div', { class: 'hint' }, 'Brak wyboru: slajd pokazuje karty tak, jak je narysowano w FigCraft.'),
      h('div', { class: 'pick-list' }, picks.map((p, i) => {
        const c = byId[p.component];
        return h('div', { class: 'pick-row' },
          h('span', { class: 'n' }, i + 1),
          c?.thumb ? h('img', { src: c.thumb, alt: c.title }) : h('div', { class: 'shot-error' }, 'brak'),
          h('div', {},
            h('div', {}, h('b', {}, c ? c.title : h('s', {}, p.component)), ' ', c ? compChips(c) : null),
            p.reason ? h('div', { class: 'why' }, p.reason) : null,
            p.data && Object.keys(p.data).length ? h('div', { class: 'why' }, `tekst zmieniony: ${Object.keys(p.data).join(', ')}`) : null),
          h('span', { class: 'acts' },
            c?.fields?.length ? h('button', { class: 'icon', title: 'Zmień teksty tej karty na tym slajdzie', onclick: () => editPickText(p, c, (data) => {
              const n = [...picks];
              n[i] = { ...p, data };
              if (!Object.keys(data).length) delete n[i].data;
              setPicks(n);
            }) }, '✎') : null,
            h('button', { class: 'icon', title: 'Zamień na inną kartę', onclick: async () => {
              const id = await pickComponent(set, picks.map((x) => x.component).filter((x) => x !== p.component));
              if (!id) return;
              const n = [...picks];
              n[i] = { component: id };
              setPicks(n);
            } }, '⇄'),
            h('button', { class: 'icon', onclick: () => i > 0 && swap(i - 1, i) }, '↑'),
            h('button', { class: 'icon', onclick: () => i < picks.length - 1 && swap(i, i + 1) }, '↓'),
            h('button', { class: 'icon', title: 'Zdejmij ze slajdu', onclick: () => setPicks(picks.filter((_, j) => j !== i)) }, '×')));
      })),
      h('div', { class: 'ai-box' },
        brief,
        h('div', { class: 'bar' }, aiBtn,
          h('span', { class: 'hint' }, 'AI czyta opisy kart z bazy (zakładka Komponenty), zasady zestawu i zmienne oferty.')),
        aiResult ? h('div', { class: 'ai-note' },
          aiResult.note, aiResult.warnings?.length ? h('div', { class: 'hint' }, `Uwagi: ${aiResult.warnings.join('; ')}`) : null) : null),
    ].filter(Boolean));
  };
  render();
  return box;
}

// Okienko wyboru karty z zestawu (miniatury + kiedy jej użyć). Zwraca id albo null.
function pickComponent(set, taken = []) {
  return new Promise((resolve) => {
    let picked = null;
    const comps = state.components.filter((c) => c.set_name === set && !c.missing);
    const close = modal(h('div', {},
      h('div', { class: 'bar' }, h('h3', { style: 'flex:1' }, `Wybierz kartę z zestawu @${set}`)),
      h('div', { class: 'comp-grid' }, comps.map((c) => h('button', { class: 'comp-card', disabled: taken.includes(c.id), onclick: () => { picked = c.id; close(); } },
        c.thumb ? h('img', { src: c.thumb, alt: c.title, loading: 'lazy' }) : null,
        h('div', { class: 'body' },
          h('b', {}, c.title), h('div', {}, compChips(c)),
          c.use_when ? h('div', {}, h('span', { class: 'muted' }, 'Kiedy: '), c.use_when) : h('div', { class: 'muted' }, 'bez opisu: uzupełnij w zakładce Komponenty')))))));
    ui.onModalClose = () => resolve(picked);
  });
}

function editPickText(pick, comp, onSave) {
  const inputs = {};
  const close = modal(h('div', {},
    h('h3', {}, `Teksty karty „${comp.title}” na tym slajdzie`),
    h('p', { class: 'hint' }, 'Puste pole = tekst z FigCraft. **słowo** = wyróżnienie.'),
    comp.fields.map((f) => [
      h('label', { class: 'f' }, `{{${f}}}`),
      (inputs[f] = autosize(h('textarea', { rows: 2, placeholder: '(jak w FigCraft)' }, pick.data?.[f] ?? ''))),
    ]),
    h('div', { class: 'bar', style: 'margin-top:14px' }, h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => close() }, 'Anuluj'),
      h('button', { class: 'btn primary', onclick: () => {
        const data = {};
        for (const [f, el] of Object.entries(inputs)) if (el.value.trim()) data[f] = el.value;
        close();
        onSave(data);
      } }, 'Zapisz'))));
}

// ------------------------------------------------------------------ widok: Komponenty (opisy kart dla AI)
function viewComponents(focusSet) {
  ui.refresh = null;
  const sets = [...new Set([...state.componentSets.map((x) => x.id), ...state.components.map((c) => c.set_name)])];
  const view = h('div', { class: 'editor library' },
    h('div', { class: 'bar' }, h('h2', {}, `Komponenty (${state.components.filter((c) => !c.missing).length})`)),
    h('details', { class: 'help', open: !state.components.length },
      h('summary', {}, 'Jak to działa?'),
      h('ol', {},
        h('li', {}, 'W FigCraft (albo Figmie) narysuj ramkę najwyższego poziomu o nazwie ', h('code', {}, '@nazwa-zestawu'), ', np. ', h('code', {}, '@dlaczego'), '. Każda ramka w środku to jedna gotowa karta: własna ikona, kolor, układ. Nazwa karty = jej klucz.'),
        h('li', {}, 'Na slajdzie miejsca na karty nazwij ', h('code', {}, '#pick:nazwa-zestawu'), ' (np. 6 slotów w siatce). Bez wyboru slajd pokazuje to, co narysowano.'),
        h('li', {}, 'Teksty w kartach, które wolno zmieniać, nazwij ', h('code', {}, '{{title}}'), ', ', h('code', {}, '{{body}}'), '… Bez wartości zostaje tekst z rysunku.'),
        h('li', {}, 'Wgraj plik w zakładce Slajdy. Karty pojawią się tutaj: opisz, kiedy której użyć. Te opisy (SQLite) czyta AI przy „Dobierz karty”.'))),
  );
  for (const set of sets) {
    const meta = state.componentSets.find((x) => x.id === set) || { id: set, title: set, rules: '' };
    const comps = state.components.filter((c) => c.set_name === set);
    const sstatus = h('span', { class: 'status' });
    const saveSet = saver(sstatus, (patch) => api('PATCH', `/component-sets/${encodeURIComponent(set)}`, patch));
    const usedBy = state.library.filter((f) => f.fields.picks?.[set]).map((f) => `${f.frame} (${f.fields.picks[set]})`).join(', ');
    const section = h('section', { class: `lib-file ${set === focusSet ? 'focus' : ''}`, id: `set-${set}` },
      h('div', { class: 'bar' },
        h('code', {}, `@${set}`),
        h('input', { class: 'lib-name', value: meta.title, oninput: (e) => saveSet({ title: e.target.value }) }), sstatus,
        h('span', { class: 'hint' }, `${comps.filter((c) => !c.missing).length} kart · sloty: ${usedBy || 'żaden slajd'}`)),
      h('label', { class: 'f' }, 'Zasady zestawu dla AI (ile kart, ile wyróżnionych, czego nie łączyć)'),
      autosize(h('textarea', { rows: 2, oninput: (e) => saveSet({ rules: e.target.value }) }, meta.rules)));
    for (const c of comps) section.append(componentEditor(c));
    view.append(section);
  }
  if (!sets.length) view.append(h('div', { class: 'empty' }, 'Brak komponentów. Wgraj plik z ramką @zestaw w zakładce Slajdy.'));
  $('#view').replaceChildren(view);
  if (focusSet) $(`#set-${CSS.escape(focusSet)}`)?.scrollIntoView({ block: 'start' });
}

function componentEditor(c) {
  const status = h('span', { class: 'status' });
  const [set, key] = c.id.split('/');
  const save = saver(status, async (patch) => Object.assign(c, await api('PATCH', `/components/${encodeURIComponent(set)}/${encodeURIComponent(key)}`, patch)));
  const field = (label, k, ph) => [h('label', { class: 'f' }, label), autosize(h('textarea', { rows: 2, placeholder: ph, oninput: (e) => save({ [k]: e.target.value }) }, c[k] || ''))];
  return h('div', { class: `comp-edit ${c.missing ? 'missing' : ''}` },
    h('div', {},
      c.thumb ? h('img', { src: c.thumb, alt: c.title, loading: 'lazy' }) : h('div', { class: 'shot-error' }, 'brak w bibliotece'),
      h('div', { class: 'id' }, c.id, c.missing ? ' · nie ma już w bibliotece' : ''),
      h('div', { class: 'hint' }, c.fields.length ? `pola: ${c.fields.map((f) => `{{${f}}}`).join(', ')}` : 'karta stała (bez pól)')),
    h('div', {},
      h('div', { class: 'bar' }, h('input', { value: c.title, style: 'flex:1;font-weight:600', oninput: (e) => save({ title: e.target.value }) }), status),
      h('div', { class: 'two' },
        h('div', {}, h('label', { class: 'f' }, 'Temat (warianty jednego argumentu mają ten sam)'), h('input', { value: c.topic, oninput: (e) => save({ topic: e.target.value.trim() }) })),
        h('div', {}, h('label', { class: 'f' }, 'Wariant (np. zwykla, wyroznienie, liczba)'), h('input', { value: c.variant, oninput: (e) => save({ variant: e.target.value.trim() }) }))),
      field('Co pokazuje', 'description', 'treść i wygląd karty'),
      field('Kiedy wybrać', 'use_when', 'jaki klient, branża, obawa, etap rozmowy'),
      field('Kiedy nie wybierać', 'avoid_when', 'np. gdy na slajdzie jest już karta X'),
      h('label', { class: 'f' }, 'Tagi (po przecinku)'),
      h('input', { value: (c.tags || []).join(', '), oninput: (e) => save({ tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }) })));
}

// ------------------------------------------------------------------ widok: Biblioteka slajdów
// Sprzedawca projektuje slajd w FigCraft (ramka 1920×1080), zapisuje plik albo JSON strony i wrzuca go tutaj.
function viewTemplates(focusId) {
  ui.refresh = null;
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
      h('li', {}, 'Wymienne karty (różne ikony, kolory, układy) narysuj w ramce ', h('code', {}, '@zestaw'), ', a na slajdzie daj sloty ', h('code', {}, '#pick:zestaw'), '. Opisy kart dla AI: zakładka Komponenty.'),
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
        h('span', { class: 'hint' }, `${slides.length} slajd(ów) · ${state.components.filter((c) => c.source === t.id && !c.missing).length} komponentów · ${t.size > 1048576 ? `${(t.size / 1048576).toFixed(1)} MB` : `${Math.ceil(t.size / 1024)} KB`} · ${new Date(t.updated_at).toLocaleString('pl-PL')}`),
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
            ...Object.entries(s.fields.picks || {}).map(([set, n]) => `sloty #pick:${set}: ${n}`),
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
