// Offer Studio: a minimal frontend with no build step. Everything goes through the same REST API
// that scripts and n8n can use (see /static/api.html). Slides are rendered by FigCraft.

import {
  $, CATEGORY_LABELS, UPLOAD_ACCEPT, api, autosize, debounce, download, go, h, kvEditor, loadAll, modal, plural, saver, slugify, state, tileLabel, toast, ui,
} from './lib.js';
import { viewNewOffer } from './views/new-offer.js';
import { viewOffer, viewOfferList } from './views/offer.js';
import { viewScenarios } from './views/scenarios.js';
import { plainTags, solutionLinker, tileTagEditor, viewTiles } from './views/tiles.js';

const BLOCK_TYPE_LABELS = {
  solution: 'Solutions', use_case: 'Use cases', problem: 'Problems', pillar: 'Pillars', signal: 'Readiness signals', step: 'Rollout steps',
  comparison: 'Comparison', package: 'Package items', person: 'People', differentiator: 'Differentiators',
};

// Upload slide files (every top-level frame = one slide in the library).
async function uploadSlideFiles(files, { replaceId } = {}) {
  let last = null;
  for (const file of files) {
    const id = replaceId || slugify(file.name.replace(/\.[a-z]+$/i, ''));
    const existing = state.templates.find((t) => t.id === id);
    if (existing && !replaceId && !confirm(`"${existing.name}" is already in the library. Replace it with ${file.name}?`)) continue;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('id', id);
    toast(`Uploading ${file.name}…`);
    const res = await fetch('/api/templates', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(`${file.name}: ${data.error || res.statusText}`, true); continue; }
    toast(`${file.name}: ${plural(data.frames.length, 'slide')} in the library`);
    last = data;
  }
  await loadAll();
  return last;
}

function pasteJsonDialog() {
  const name = h('input', { placeholder: 'e.g. ACME case study' });
  const text = h('textarea', { class: 'code', placeholder: '{"format": "figcraft", "nodes": {…}, "pages": […]}', style: 'min-height: 260px' });
  const close = modal(h('div', {},
    h('h3', {}, 'Paste slide JSON'),
    h('p', { class: 'hint' }, 'The JSON of a page or of a whole FigCraft file (Save as… .json). Every top-level frame becomes a slide. Images do not carry over in JSON: upload slides with images as .figcraft.'),
    h('label', { class: 'f' }, 'Name in the library'), name,
    h('label', { class: 'f' }, 'JSON'), text,
    h('div', { class: 'bar', style: 'margin-top:14px' }, h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => close() }, 'Cancel'),
      h('button', { class: 'btn primary', onclick: async () => {
        if (!name.value.trim()) return toast('Enter a name', true);
        const id = slugify(name.value);
        if (state.templates.some((t) => t.id === id) && !confirm(`"${name.value}" is already in the library. Replace it?`)) return;
        const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name.value.trim())}`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: text.value,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return toast(data.error || res.statusText, true);
        close();
        toast(`${plural(data.frames.length, 'slide')} in the library`);
        await loadAll();
        go('templates', data.id);
      } }, 'Add'))));
}

// Dialog for picking a slide from the library (thumbnails). Resolves to the slide name or null.
function pickSlide(title = 'Pick a slide from the library') {
  return new Promise((resolve) => {
    let picked = null;
    const groups = {};
    for (const s of state.library) (groups[s.source_name] ||= []).push(s);
    const close = modal(h('div', {},
      h('div', { class: 'bar' }, h('h3', { style: 'flex:1' }, title),
        h('label', { class: 'btn sm' }, '+ Upload new', h('input', { type: 'file', accept: UPLOAD_ACCEPT, multiple: true, hidden: true, onchange: async (e) => {
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

// Offers: the list, a new offer from tiles, the tile-based offer view, or the existing editor (offers built by hand).
function routeOffers(id, sub) {
  document.querySelector('#tabs button[data-view="offers"]')?.classList.add('active');
  if (!id) return viewOfferList();
  if (id === 'new') return viewNewOffer();
  const o = state.offers.find((x) => x.id === id);
  if (o?.data?.scenario_id) return viewOffer(id, sub);
  Promise.resolve(viewOffers(id, sub)).then(() => {
    if (!o) return;
    document.querySelector('.editor.narrow')?.prepend(h('div', { class: 'legacy-note' },
      'This offer was not built from tiles, so you edit it by hand. ', h('a', { href: '#/offers/new' }, 'New offer from tiles')));
  });
}
document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => go(b.dataset.view)));
addEventListener('hashchange', route);

// Changes from other tabs / from the API refresh the lists and the preview (editors being typed in are left alone).
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


// ------------------------------------------------------------------ block editor (Knowledge tab and the dialog opened from an offer)
function blockEditor(block, { onDeleted, inModal = false } = {}) {
  const status = h('span', { class: 'status' });
  const save = saver(status, async (patch) => {
    const b = await api('PATCH', `/blocks/${encodeURIComponent(block.id)}`, patch);
    Object.assign(block, b);
  });
  const tagList = state.meta.tags.map((t) => t.tag).filter((t) => !t.includes(':')).join(', ');
  return h('div', {},
    h('div', { class: 'bar' },
      h('h2', {}, block.title || '(untitled)'),
      status,
      h('button', { class: 'btn', title: 'Make a copy of this block', onclick: async () => {
        const { id, created_at, updated_at, ...rest } = block;
        const b = await api('POST', '/blocks', { ...rest, title: `${block.title} (copy)` });
        toast('Duplicated');
        if (inModal) $('#modal').click();
        await loadAll();
        go('blocks', b.id);
      } }, 'Duplicate'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm(`Delete block "${block.title}"?`)) return;
        await api('DELETE', `/blocks/${encodeURIComponent(block.id)}`);
        toast('Deleted');
        onDeleted?.();
      } }, 'Delete'),
    ),
    h('div', { class: 'id' }, `id: ${block.id}`),
    h('label', { class: 'f' }, 'Type'),
    h('datalist', { id: 'types-dl' }, state.meta.types.map((t) => h('option', { value: t.type }))),
    h('input', { value: block.type, list: 'types-dl', oninput: (e) => e.target.value.trim() && save({ type: e.target.value.trim() }) }),
    h('label', { class: 'f' }, 'Title'),
    h('input', { value: block.title, oninput: (e) => save({ title: e.target.value }) }),
    block.type === 'solution' ? [
      block.data?.source ? h('div', { class: 'hint source' }, `Source: ${block.data.source}`) : null,
      h('label', { class: 'f' }, 'Client problem'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ data: { problem: e.target.value } }) }, block.data?.problem || '')),
      h('label', { class: 'f' }, 'Solution (what Gaius does)'),
      autosize(h('textarea', { rows: 3, oninput: (e) => save({ body: e.target.value }) }, block.body)),
      h('label', { class: 'f' }, 'Benefit (goes on the slide)'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ data: { effect: e.target.value } }) }, block.data?.effect || '')),
      h('label', { class: 'f' }, 'Value'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ data: { value: e.target.value } }) }, block.data?.value || '')),
    ] : [
      h('label', { class: 'f' }, 'Body ("- " lists become separate lines, **text** = accent)'),
      autosize(h('textarea', { rows: 4, oninput: (e) => save({ body: e.target.value }) }, block.body)),
    ],
    h('label', { class: 'f' }, 'Tiles: which clients this block is for (click to toggle)'),
    (block.tags || []).includes('general') ? h('div', { class: 'hint' }, 'Marked general: used in every offer, whatever the client. Remove "general" under Advanced to pin it to tiles instead.') : null,
    tileTagEditor(block.tags, (tags) => {
      const next = [...plainTags(block.tags), ...tags.filter((t) => t.includes(':'))];
      block.tags = next;
      save({ tags: next });
    }),
    block.type !== 'solution' ? [
      h('label', { class: 'f' }, 'Linked solutions (what this element delivers; their tiles count for highlighting)'),
      solutionLinker(block.data?.solutions, (ids) => save({ data: { solutions: ids } })),
    ] : null,
    h('details', { class: 'advanced' }, h('summary', {}, 'Advanced: plain tags and template fields'),
      h('label', { class: 'f' }, 'Plain tags (comma-separated)'),
      h('input', { value: plainTags(block.tags).join(', '), placeholder: tagList, oninput: (e) => {
        const next = [...e.target.value.split(',').map((x) => x.trim()).filter(Boolean), ...(block.tags || []).filter((t) => t.includes(':'))];
        block.tags = next;
        save({ tags: next });
      } }),
      h('label', { class: 'f' }, 'Extra fields'),
      kvEditor(block.data || {}, [], (data) => save({ data })),
      h('div', { class: 'hint' }, 'In a FigCraft template, insert a field by naming a layer after it, e.g. {{effect}}. Changes save automatically.')),
  );
}

// ------------------------------------------------------------------ view: Knowledge
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
          h('div', {}, b.title || '(untitled)'),
          h('div', { class: 'sub' }, (b.body || '').slice(0, 90)),
          h('div', { class: 'item-tiles' }, (b.tags || []).filter((t) => t.includes(':')).map((t) => h('span', { class: `chip tile-chip small ${t.split(':')[0]}` }, tileLabel(t))),
            (b.tags || []).includes('general') ? h('span', { class: 'chip tile-chip small general', title: 'Used in every offer, whatever the client' }, 'general') : null))),
      ]),
      items.length ? [] : [h('div', { class: 'empty' }, 'No blocks')],
    ].flat(Infinity));
  };
  ui.refresh = renderList;

  const typeSel = h('select', { onchange: (e) => { f.type = e.target.value; renderList(); } },
    h('option', { value: '' }, 'all types'), state.meta.types.map((t) => h('option', { value: t.type }, `${t.type} (${t.count})`)));
  typeSel.value = f.type;
  const tagSel = h('select', { onchange: (e) => { f.tile = e.target.value; renderList(); } },
    h('option', { value: '' }, 'all tiles'),
    Object.entries(CATEGORY_LABELS).map(([cat, title]) => h('optgroup', { label: title },
      state.tiles.filter((t) => t.category === cat).map((t) => h('option', { value: t.id }, t.label)))));
  tagSel.value = f.tile || '';

  const newBlock = async () => {
    const type = prompt('Type of the new block (e.g. use_case, problem, faq):', f.type || 'use_case');
    if (!type) return;
    const b = await api('POST', '/blocks', { type: type.trim(), title: 'New block', body: '', tags: f.tag ? [f.tag] : [] });
    await loadAll();
    go('blocks', b.id);
  };

  // After the Polish-to-English migration: say which seed records had been edited by hand, and where their text is.
  const mig = state.meta.legacyMigration;
  const edited = [...(mig?.editedBlocks || []), ...(mig?.editedCards || [])];
  const migNote = edited.length ? h('div', { class: 'legacy-note' },
    `${edited.length} block(s) had been edited in the earlier Polish version before the switch to English: ${edited.join(', ')}. Their edited text is kept in the `,
    h('a', { href: '/api/legacy-backup' }, 'backup file'), '.') : null;
  $('#view').replaceChildren(
    h('div', { class: 'col list' },
      migNote,
      h('div', { class: 'tools' },
        h('div', { class: 'row' },
          h('input', { placeholder: 'Search…', value: f.q, oninput: (e) => { f.q = e.target.value; renderList(); } }),
          h('button', { class: 'btn primary', onclick: newBlock }, '+ Block')),
        h('div', { class: 'row' }, typeSel, tagSel)),
      listEl),
    editor,
  );
  renderList();

  const block = state.blocks.find((b) => b.id === selectedId);
  editor.replaceChildren(block
    ? blockEditor(block, { onDeleted: async () => { await loadAll(); go('blocks'); } })
    : h('div', { class: 'empty' }, 'Pick a block from the list or add a new one. Blocks are your knowledge base: use cases, problems, arguments, comparison rows, package items. You assemble offers from them in the "Offers" tab.'));
}

// ------------------------------------------------------------------ view: Offers
async function viewOffers(offerId, slideId) {
  if (!offerId && state.offers[0]) return go('offers', state.offers[0].id);

  const listEl = h('div', { class: 'items' });
  const renderList = () => listEl.replaceChildren(
    ...state.offers.map((o) => h('div', { class: `item ${o.id === offerId ? 'active' : ''}`, onclick: () => go('offers', o.id) },
      h('div', {}, o.name), h('div', { class: 'sub' }, [o.data?.client, new Date(o.updated_at).toLocaleString('en-GB')].filter(Boolean).join(' · ')))),
  );
  ui.refresh = renderList;
  renderList();

  const newOffer = async () => {
    const name = prompt('Name of the new offer:');
    if (!name) return;
    const o = await api('POST', '/offers', { name, data: { client: '', price: '' } });
    await loadAll();
    go('offers', o.id);
  };

  const left = h('div', { class: 'col list', style: 'width: 240px' },
    h('div', { class: 'tools' }, h('button', { class: 'btn primary', onclick: newOffer }, '+ Offer')),
    listEl);

  if (!offerId) {
    $('#view').replaceChildren(left, h('div', { class: 'empty', style: 'flex:1' }, 'No offers yet.'));
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

  // --- FigCraft preview (PNG)
  const shots = h('div', { class: 'shots' });
  const pstatus = h('span', { class: 'phint' });
  const shotFor = new Map();
  const markSelected = () => {
    for (const [id, el] of shotFor) el.classList.toggle('active', id === slideId);
  };
  let previewSeq = 0;
  const refreshPreview = async () => {
    const my = ++previewSeq;
    pstatus.textContent = 'FigCraft is rendering…';
    let p;
    try {
      p = await api('GET', `/offers/${encodeURIComponent(offer.id)}/preview`);
    } catch (e) {
      pstatus.textContent = '';
      shots.replaceChildren(h('div', { class: 'shot-error' }, e.message));
      return;
    }
    if (my !== previewSeq) return;
    // load the new images in the background and swap them all at once, without flicker
    const figs = p.slides.map((s, i) => {
      const img = s.url ? h('img', { src: s.url, alt: `Slide ${i + 1}` }) : null;
      const fig = h('figure', { class: `shot ${s.hidden ? 'is-hidden' : ''}`, onclick: () => selectSlide(s.id, true) },
        img || h('div', { class: 'shot-error' }, s.error || p.error || 'no preview'),
        h('figcaption', {}, `${i + 1} · ${s.frame}${s.hidden ? ' · hidden' : ''}`));
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
    pstatus.textContent = p.error ? 'render error' : `FigCraft: ${p.ms} ms`;
  };
  const refreshPreviewSoon = debounce(refreshPreview, 250);

  const preview = h('div', { class: 'preview' },
    h('div', { class: 'pbar' },
      h('button', { class: 'btn primary', onclick: () => download(`/offers/${encodeURIComponent(offer.id)}/pdf`, `${offer.name}.pdf`) }, 'Download PDF'),
      h('button', { class: 'btn', title: 'The finished offer as a FigCraft file for manual touch-ups', onclick: () => download(`/offers/${encodeURIComponent(offer.id)}/figcraft`, `${offer.name}.figcraft`) }, 'Download .figcraft'),
      state.meta.figcraftWebUrl ? h('a', { class: 'btn', href: state.meta.figcraftWebUrl, target: '_blank' }, 'Open FigCraft') : null,
      h('span', { class: 'spacer' }),
      pstatus),
    shots);

  // --- offer editor
  const status = h('span', { class: 'status' });
  const saveOffer = saver(status, (patch) => api('PATCH', `/offers/${encodeURIComponent(offer.id)}`, patch));
  const slidesEl = h('div', { class: 'slides' });
  const slideEditorEl = h('div');

  const slideTitle = (s) => String(s.data?.title || s.data?.quote || s.data?.kicker || '').replace(/\*\*/g, '').trim() || s.frame;
  const renderSlides = () => slidesEl.replaceChildren(...offer.slides.map((s, i) =>
    h('div', { class: `slide-row ${s.id === slideId ? 'active' : ''} ${s.hidden ? 'hidden-slide' : ''}`, onclick: () => selectSlide(s.id) },
      h('span', { class: 'n' }, i + 1),
      h('span', { class: 't' }, slideTitle(s), ' ', h('small', {}, `· ${s.frame}${framesByName[s.frame] ? '' : ' (not in the library)'}`)),
      h('span', {},
        h('button', { class: 'icon', title: 'Move up', onclick: (e) => { e.stopPropagation(); move(i, -1); } }, '↑'),
        h('button', { class: 'icon', title: 'Move down', onclick: (e) => { e.stopPropagation(); move(i, 1); } }, '↓')))));

  const move = async (i, d) => {
    const j = i + d;
    if (j < 0 || j >= offer.slides.length) return;
    const ids = offer.slides.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    offer = await api('PUT', `/offers/${encodeURIComponent(offer.id)}/order`, { ids });
    renderSlides();
  };

  // New slide: picked from the library thumbnails; it goes after the selected slide (or at the end).
  const addSlide = async () => {
    const frame = await pickSlide('Add a slide to the offer');
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
        await loadAll(); go('offers', o.id); toast('Offer duplicated');
      } }, 'Duplicate'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!confirm(`Delete offer "${offer.name}" and all its slides?`)) return;
        await api('DELETE', `/offers/${encodeURIComponent(offer.id)}`);
        await loadAll(); go('offers');
      } }, 'Delete')),
    h('div', { class: 'id' }, `id: ${offer.id}`),
    h('label', { class: 'f' }, 'Offer name'),
    h('input', { value: offer.name, oninput: (e) => saveOffer({ name: e.target.value }) }),
    h('label', { class: 'f' }, 'Offer variables (in the template: {{offer.client}}, {{offer.price}}…)'),
    kvEditor(offer.data || {}, ['client', 'price'], (data) => saveOffer({ data })),
    h('div', { class: 'bar', style: 'margin-top:18px' }, h('h2', { style: 'font-size:14px' }, `Slides (${offer.slides.length})`), h('button', { class: 'btn sm', onclick: addSlide }, '+ slide')),
    slidesEl,
    slideEditorEl,
  );
  renderSlides();

  const renderSlideEditor = () => {
    const slide = offer.slides.find((s) => s.id === slideId);
    slideEditorEl.replaceChildren(slide ? slideEditor(slide, offer, framesByName, blocksById, renderSlides, () => go('offers', offer.id)) : '');
  };
  // selecting a slide does not re-render the whole view
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

  // Every change (from the UI or the API) -> refresh the slide list and the preview.
  ui.refresh = async () => {
    renderList();
    try {
      const fresh = await api('GET', `/offers/${encodeURIComponent(offer.id)}`);
      offer.slides = fresh.slides;
      renderSlides();
    } catch { /* offer was deleted */ }
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
    frame ? h('img', { src: frame.thumb, alt: slide.frame }) : h('div', { class: 'shot-error' }, 'not in the library'),
    h('div', {},
      h('div', {}, h('code', {}, slide.frame)),
      frame ? h('div', { class: 'hint' }, `from file "${frame.source_name}"`) : null,
      h('button', { class: 'btn sm', style: 'margin-top:6px', onclick: async () => {
        const f = await pickSlide('Change the slide design');
        if (!f || f === slide.frame) return;
        await api('PATCH', `/slides/${encodeURIComponent(slide.id)}`, { frame: f });
        route();
      } }, 'Change slide…')));

  // --- blocks: a list of picked blocks or a query
  const useQuery = !!(slide.query && (slide.query.type || slide.query.tag)) && !slide.block_ids?.length;
  const blocksBox = h('div', { class: 'box' });
  const renderBlocks = () => {
    const ids = slide.block_ids || [];
    const setIds = (next) => { slide.block_ids = next; save({ block_ids: next, query: null }); renderBlocks(); };
    const picker = h('select', { onchange: (e) => { if (e.target.value) setIds([...ids, e.target.value]); } },
      h('option', { value: '' }, '+ add block…'),
      Object.entries(state.blocks.reduce((g, b) => ((g[b.type] ||= []).push(b), g), {})).map(([type, bs]) =>
        h('optgroup', { label: type }, bs.filter((b) => !ids.includes(b.id)).map((b) => h('option', { value: b.id }, b.title)))));
    const q = slide.query || {};
    const setQuery = (patch) => { slide.query = { ...slide.query, ...patch }; save({ query: slide.query, block_ids: [] }); };
    const queryForm = h('div', { class: 'bar' },
      h('input', { placeholder: 'type, e.g. use_case', value: q.type || '', oninput: (e) => setQuery({ type: e.target.value.trim() || undefined }) }),
      h('input', { placeholder: 'tag', value: q.tag || '', oninput: (e) => setQuery({ tag: e.target.value.trim() || undefined }) }),
      h('input', { placeholder: 'limit', style: 'width:70px', value: q.limit || '', oninput: (e) => setQuery({ limit: Number(e.target.value) || undefined }) }));
    const mode = blocksBox.dataset.mode || (useQuery ? 'query' : 'list');
    blocksBox.replaceChildren(
      h('h3', {}, `Blocks on the slide (the template has ${plural(frame?.slots ?? 0, '#item slot')}) `,
        h('button', { class: `btn sm ${mode === 'list' ? 'primary' : ''}`, onclick: () => { blocksBox.dataset.mode = 'list'; renderBlocks(); } }, 'picked'), ' ',
        h('button', { class: `btn sm ${mode === 'query' ? 'primary' : ''}`, onclick: () => { blocksBox.dataset.mode = 'query'; renderBlocks(); } }, 'by type / tag')),
      mode === 'list'
        ? h('div', {},
          h('div', { class: 'picked' }, ids.map((id, i) => {
            const b = blocksById[id];
            return h('div', { class: 'p' },
              h('span', {}, b ? b.title : h('s', {}, id), ' ', h('small', {}, b?.type || 'block missing')),
              h('span', {},
                h('button', { class: 'icon', title: 'Edit block', onclick: () => b && (modal(blockEditor(b, { inModal: true, onDeleted: () => $('#modal').click() })), (ui.onModalClose = () => loadAll().then(() => ui.refresh?.()))) }, '✎'),
                h('button', { class: 'icon', onclick: () => { if (i > 0) { const n = [...ids]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setIds(n); } } }, '↑'),
                h('button', { class: 'icon', onclick: () => { if (i < ids.length - 1) { const n = [...ids]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setIds(n); } } }, '↓'),
                h('button', { class: 'icon', title: 'Remove from slide', onclick: () => setIds(ids.filter((x) => x !== id)) }, '×')));
          })),
          h('div', { style: 'margin-top:8px' }, picker))
        : h('div', {}, queryForm, h('div', { class: 'hint' }, 'The slide shows every block of the given type/tag, sorted by the "order" field, then by title. New blocks appear automatically.')),
    );
  };
  renderBlocks();

  const fields = frame?.fields || { data: [], item: [], sources: [], picks: {} };
  const pickBoxes = Object.entries(fields.picks || {}).map(([set, slots]) => picksBox(slide, set, slots, save));
  return h('div', { class: 'box', style: 'border-color: var(--accent)' },
    h('div', { class: 'bar' },
      h('h2', { style: 'font-size:14px' }, `Slide ${offer.slides.indexOf(slide) + 1}`), status,
      h('label', {}, h('input', { type: 'checkbox', checked: slide.hidden, onchange: (e) => save({ hidden: e.target.checked }) }), ' hidden'),
      h('button', { class: 'btn sm danger', onclick: async () => {
        if (!confirm('Delete this slide?')) return;
        await api('DELETE', `/slides/${encodeURIComponent(slide.id)}`);
        onDeleted();
      } }, 'Delete')),
    h('label', { class: 'f' }, 'Design (slide from the library)'), frameBox,
    fields.item.length ? h('div', { class: 'hint' }, `Card fields: ${fields.item.map((k) => `{{${k}}}`).join(', ')}`) : null,
    h('label', { class: 'f' }, 'Slide content (**word** = the template\'s highlight style; an empty field hides the layer)'),
    kvEditor(slide.data || {}, fields.data, (data) => save({ data })),
    fields.sources.includes('blocks') ? blocksBox : null,
    pickBoxes,
  );
}

// ------------------------------------------------------------------ components on a slide (#pick:set)
const compChips = (c) => [
  c.variant ? h('span', { class: `chip ${c.variant === 'highlight' ? 'green' : ''}` }, c.variant) : null,
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
    const brief = autosize(h('textarea', { rows: 2, placeholder: 'Brief for the AI, e.g. "bank, wary of the cloud, the board decides". The AI already sees the offer variables (client etc.).' }, box.dataset.brief || ''));
    brief.oninput = () => (box.dataset.brief = brief.value);
    const aiBtn = h('button', { class: 'btn primary sm', onclick: async () => {
      aiBtn.disabled = true;
      aiBtn.textContent = 'AI is picking cards…';
      try {
        const r = await api('POST', `/slides/${encodeURIComponent(slide.id)}/pick`, { brief: brief.value });
        slide.picks = r.slide.picks;
        toast(`AI picked ${plural(r.picks[set]?.length ?? 0, 'card')}`);
        render(r);
      } catch (e) {
        toast(e.message, true);
        aiBtn.disabled = false;
        aiBtn.textContent = 'Pick cards (AI)';
      }
    } }, 'Pick cards (AI)');
    box.replaceChildren(...[
      h('h3', {}, `Cards from set @${set}: ${picks.length} / ${slots} `,
        h('button', { class: 'btn sm', onclick: async () => {
          const id = await pickComponent(set, picks.map((p) => p.component));
          if (id) setPicks([...picks, { component: id }]);
        } }, '+ card'), ' ',
        h('a', { class: 'btn sm ghost', href: `#/components/${encodeURIComponent(set)}` }, 'card descriptions')),
      meta?.rules ? h('div', { class: 'hint' }, `Rules: ${meta.rules}`) : null,
      picks.length ? null : h('div', { class: 'hint' }, 'Nothing picked: the slide shows the cards as drawn in FigCraft.'),
      h('div', { class: 'pick-list' }, picks.map((p, i) => {
        const c = byId[p.component];
        return h('div', { class: 'pick-row' },
          h('span', { class: 'n' }, i + 1),
          c?.thumb ? h('img', { src: c.thumb, alt: c.title }) : h('div', { class: 'shot-error' }, 'missing'),
          h('div', {},
            h('div', {}, h('b', {}, c ? c.title : h('s', {}, p.component)), ' ', c ? compChips(c) : null),
            p.reason ? h('div', { class: 'why' }, p.reason) : null,
            p.data && Object.keys(p.data).length ? h('div', { class: 'why' }, `text changed: ${Object.keys(p.data).join(', ')}`) : null),
          h('span', { class: 'acts' },
            c?.fields?.length ? h('button', { class: 'icon', title: 'Change this card\'s text on this slide', onclick: () => editPickText(p, c, (data) => {
              const n = [...picks];
              n[i] = { ...p, data };
              if (!Object.keys(data).length) delete n[i].data;
              setPicks(n);
            }) }, '✎') : null,
            h('button', { class: 'icon', title: 'Swap for another card', onclick: async () => {
              const id = await pickComponent(set, picks.map((x) => x.component).filter((x) => x !== p.component));
              if (!id) return;
              const n = [...picks];
              n[i] = { component: id };
              setPicks(n);
            } }, '⇄'),
            h('button', { class: 'icon', onclick: () => i > 0 && swap(i - 1, i) }, '↑'),
            h('button', { class: 'icon', onclick: () => i < picks.length - 1 && swap(i, i + 1) }, '↓'),
            h('button', { class: 'icon', title: 'Remove from slide', onclick: () => setPicks(picks.filter((_, j) => j !== i)) }, '×')));
      })),
      h('div', { class: 'ai-box' },
        brief,
        h('div', { class: 'bar' }, aiBtn,
          h('span', { class: 'hint' }, 'The AI reads the card descriptions from the database (Components tab), the set rules and the offer variables.')),
        aiResult ? h('div', { class: 'ai-note' },
          aiResult.note, aiResult.warnings?.length ? h('div', { class: 'hint' }, `Notes: ${aiResult.warnings.join('; ')}`) : null) : null),
    ].filter(Boolean));
  };
  render();
  return box;
}

// Dialog for picking a card from a set (thumbnails + when to use it). Resolves to the id or null.
function pickComponent(set, taken = []) {
  return new Promise((resolve) => {
    let picked = null;
    const comps = state.components.filter((c) => c.set_name === set && !c.missing);
    const close = modal(h('div', {},
      h('div', { class: 'bar' }, h('h3', { style: 'flex:1' }, `Pick a card from set @${set}`)),
      h('div', { class: 'comp-grid' }, comps.map((c) => h('button', { class: 'comp-card', disabled: taken.includes(c.id), onclick: () => { picked = c.id; close(); } },
        c.thumb ? h('img', { src: c.thumb, alt: c.title, loading: 'lazy' }) : null,
        h('div', { class: 'body' },
          h('b', {}, c.title), h('div', {}, compChips(c)),
          c.use_when ? h('div', {}, h('span', { class: 'muted' }, 'When: '), c.use_when) : h('div', { class: 'muted' }, 'no description yet: add one in the Components tab')))))));
    ui.onModalClose = () => resolve(picked);
  });
}

function editPickText(pick, comp, onSave) {
  const inputs = {};
  const close = modal(h('div', {},
    h('h3', {}, `Text of card "${comp.title}" on this slide`),
    h('p', { class: 'hint' }, 'Empty field = the text from FigCraft. **word** = highlight.'),
    comp.fields.map((f) => [
      h('label', { class: 'f' }, `{{${f}}}`),
      (inputs[f] = autosize(h('textarea', { rows: 2, placeholder: '(as in FigCraft)' }, pick.data?.[f] ?? ''))),
    ]),
    h('div', { class: 'bar', style: 'margin-top:14px' }, h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => close() }, 'Cancel'),
      h('button', { class: 'btn primary', onclick: () => {
        const data = {};
        for (const [f, el] of Object.entries(inputs)) if (el.value.trim()) data[f] = el.value;
        close();
        onSave(data);
      } }, 'Save'))));
}

// ------------------------------------------------------------------ view: Components (card descriptions for the AI)
function viewComponents(focusSet) {
  ui.refresh = null;
  const sets = [...new Set([...state.componentSets.map((x) => x.id), ...state.components.map((c) => c.set_name)])];
  const view = h('div', { class: 'editor library' },
    h('div', { class: 'bar' }, h('h2', {}, `Components (${state.components.filter((c) => !c.missing).length})`)),
    h('details', { class: 'help', open: !state.components.length },
      h('summary', {}, 'How does it work?'),
      h('ol', {},
        h('li', {}, 'In FigCraft (or Figma), draw a top-level frame named ', h('code', {}, '@set-name'), ', e.g. ', h('code', {}, '@why'), '. Every frame inside it is one ready-made card with its own icon, colour and layout. The card name is its key.'),
        h('li', {}, 'On a slide, name the card placeholders ', h('code', {}, '#pick:set-name'), ' (e.g. 6 slots in a grid). With nothing picked, the slide shows what was drawn.'),
        h('li', {}, 'Name the card texts that may be changed ', h('code', {}, '{{title}}'), ', ', h('code', {}, '{{body}}'), '… With no value, the drawn text stays.'),
        h('li', {}, 'Upload the file in the Slides tab. The cards show up here: describe when to use each one. The AI reads these descriptions (SQLite) when you click "Pick cards".'))),
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
        h('span', { class: 'hint' }, `${plural(comps.filter((c) => !c.missing).length, 'card')} · slots: ${usedBy || 'no slide'}`)),
      h('label', { class: 'f' }, 'Set rules for the AI (how many cards, how many highlighted, what not to combine)'),
      autosize(h('textarea', { rows: 2, oninput: (e) => saveSet({ rules: e.target.value }) }, meta.rules)));
    for (const c of comps) section.append(componentEditor(c));
    view.append(section);
  }
  if (!sets.length) view.append(h('div', { class: 'empty' }, 'No components yet. Upload a file with an @set frame in the Slides tab.'));
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
      c.thumb ? h('img', { src: c.thumb, alt: c.title, loading: 'lazy' }) : h('div', { class: 'shot-error' }, 'not in the library'),
      h('div', { class: 'id' }, c.id, c.missing ? ' · no longer in the library' : ''),
      h('div', { class: 'hint' }, c.fields.length ? `fields: ${c.fields.map((f) => `{{${f}}}`).join(', ')}` : 'fixed card (no fields)')),
    h('div', {},
      h('div', { class: 'bar' }, h('input', { value: c.title, style: 'flex:1;font-weight:600', oninput: (e) => save({ title: e.target.value }) }), status),
      h('div', { class: 'two' },
        h('div', {}, h('label', { class: 'f' }, 'Topic (variants of one argument share it)'), h('input', { value: c.topic, oninput: (e) => save({ topic: e.target.value.trim() }) })),
        h('div', {}, h('label', { class: 'f' }, 'Variant (e.g. regular, highlight, stat)'), h('input', { value: c.variant, oninput: (e) => save({ variant: e.target.value.trim() }) }))),
      field('What it shows', 'description', 'the card\'s content and look'),
      field('When to pick', 'use_when', 'which client, industry, concern, stage of the conversation'),
      field('When to avoid', 'avoid_when', 'e.g. when card X is already on the slide'),
      h('label', { class: 'f' }, 'Tiles: which clients this card is for (click to toggle)'),
      tileTagEditor(c.tags, (tags) => { c.tags = [...plainTags(c.tags), ...tags.filter((t) => t.includes(':'))]; save({ tags: c.tags }); }),
      h('label', { class: 'f' }, 'Linked solutions (what this card delivers)'),
      solutionLinker(c.data?.solutions, (ids) => save({ data: { ...(c.data || {}), solutions: ids } })),
      h('label', { class: 'f' }, 'Plain tags (comma-separated)'),
      h('input', { value: plainTags(c.tags).join(', '), oninput: (e) => { c.tags = [...e.target.value.split(',').map((x) => x.trim()).filter(Boolean), ...(c.tags || []).filter((t) => t.includes(':'))]; save({ tags: c.tags }); } })));
}

// ------------------------------------------------------------------ view: Slide library
// A salesperson designs a slide in FigCraft (a 1920×1080 frame), saves the file or the page JSON and drops it here.
function viewTemplates(focusId) {
  ui.refresh = null;
  const fileInput = (replaceId) => h('input', { type: 'file', accept: UPLOAD_ACCEPT, multiple: !replaceId, hidden: true, onchange: async (e) => {
    const t = await uploadSlideFiles([...e.target.files], { replaceId });
    e.target.value = '';
    go('templates', t?.id || replaceId || '');
    route();
  } });

  const help = h('details', { class: 'help', open: state.templates.length < 2 },
    h('summary', {}, 'How do I add a new slide?'),
    h('ol', {},
      h('li', {}, 'In FigCraft, draw a 1920×1080 frame and give it a name, e.g. ', h('code', {}, 'case-study'), '. The frame name becomes the slide name in the library.'),
      h('li', {}, 'Give the texts that should change field names: ', h('code', {}, '{{data.title}}'), ', ', h('code', {}, '{{offer.client}}'), '. Everything else stays as you drew it.'),
      h('li', {}, 'Name the cards for knowledge blocks ', h('code', {}, '#item'), ', and the texts inside them ', h('code', {}, '{{title}}'), ', ', h('code', {}, '{{body}}'), ', ', h('code', {}, '{{effect}}'), '…'),
      h('li', {}, 'Draw interchangeable cards (different icons, colours, layouts) inside an ', h('code', {}, '@set'), ' frame, and put ', h('code', {}, '#pick:set'), ' slots on the slide. Card descriptions for the AI: Components tab.'),
      h('li', {}, 'Save a .figcraft file (or the page as .json) and drag it here. .fig, .penpot, .sketch and .svg work too.')),
    h('table', {},
      h('tr', {}, h('td', {}, h('code', {}, 'Effect: {{effect}}')), h('td', {}, 'fixed text + a field; an empty result hides the layer')),
      h('tr', {}, h('td', {}, h('code', {}, '{{offer.client|upper}}')), h('td', {}, 'offer variable in upper case')),
      h('tr', {}, h('td', {}, h('code', {}, '#item:lines')), h('td', {}, 'a row from the data.lines field ("label | value"): {{title}}, {{value}}')),
      h('tr', {}, h('td', {}, h('code', {}, '**text**')), h('td', {}, 'in content: the style of the 1st highlight in the original text (e.g. a red accent)')),
      h('tr', {}, h('td', {}, h('code', {}, '[[2:text]]')), h('td', {}, 'in a layer name: the style of the 2nd highlight'))));

  const drop = h('div', { class: 'dropzone' },
    h('b', {}, 'Drag slide files here'), h('span', {}, ' or '),
    h('label', { class: 'btn primary' }, 'Choose files', fileInput(null)), ' ',
    h('button', { class: 'btn', onclick: pasteJsonDialog }, 'Paste JSON'));
  const view = h('div', { class: 'editor library' }, h('div', { class: 'bar' }, h('h2', {}, `Slide library (${state.library.length})`)), drop, help);

  for (const t of state.templates) {
    const slides = state.library.filter((s) => s.source === t.id);
    const status = h('span', { class: 'status' });
    const save = saver(status, (patch) => api('PATCH', `/templates/${encodeURIComponent(t.id)}`, patch));
    view.append(h('section', { class: `lib-file ${t.id === focusId ? 'focus' : ''}`, id: `lib-${t.id}` },
      h('div', { class: 'bar' },
        h('input', { class: 'lib-name', value: t.name, oninput: (e) => save({ name: e.target.value }) }), status,
        h('span', { class: 'hint' }, `${plural(slides.length, 'slide')} · ${plural(state.components.filter((c) => c.source === t.id && !c.missing).length, 'component')} · ${t.size > 1048576 ? `${(t.size / 1048576).toFixed(1)} MB` : `${Math.ceil(t.size / 1024)} KB`} · ${new Date(t.updated_at).toLocaleString('en-GB')}`),
        h('span', { class: 'spacer' }),
        h('a', { class: 'btn sm', href: `/api/templates/${encodeURIComponent(t.id)}/file` }, 'Download .figcraft'),
        h('label', { class: 'btn sm', title: 'Upload a corrected version of this file' }, 'Replace', fileInput(t.id)),
        state.meta.figcraftWebUrl ? h('a', { class: 'btn sm', href: state.meta.figcraftWebUrl, target: '_blank' }, 'FigCraft') : null,
        h('button', { class: 'btn sm danger', onclick: async () => {
          const used = state.offers.length ? ' Offers that use these slides will show an error.' : '';
          if (!confirm(`Delete "${t.name}" (${plural(slides.length, 'slide')}) from the library?${used}`)) return;
          await api('DELETE', `/templates/${encodeURIComponent(t.id)}`);
          await loadAll(); route();
        } }, 'Delete')),
      h('div', { class: 'lib-grid' }, slides.map((s) => h('figure', { class: 'lib-card' },
        h('img', { src: s.thumb, alt: s.frame, loading: 'lazy' }),
        h('figcaption', {},
          h('code', {}, s.frame),
          h('div', { class: 'hint' }, [
            s.fields.data.length ? `fields: ${s.fields.data.join(', ')}` : 'fixed slide',
            s.slots ? `#item cards: ${s.slots} (${s.fields.item.join(', ')})` : null,
            ...Object.entries(s.fields.picks || {}).map(([set, n]) => `#pick:${set} slots: ${n}`),
          ].filter(Boolean).join(' · '))))))));
  }
  $('#view').replaceChildren(view);
  if (focusId) $(`#lib-${CSS.escape(focusId)}`)?.scrollIntoView({ block: 'start' });

  // drag and drop files onto the page
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
    return toast('This is not a valid JSON file', true);
  }
  const counts = ['blocks', 'templates', 'offers', 'slides'].map((k) => `${k}: ${(dump[k] || []).length}`).join(', ');
  const run = async (mode) => {
    close();
    try {
      const r = await api('POST', `/import?mode=${mode}`, dump);
      toast(`Imported (${Object.entries(r.imported).map(([k, v]) => `${k} ${v}`).join(', ')})`);
      await loadAll();
      route();
    } catch (err) {
      toast(err.message, true);
    }
  };
  const close = modal(h('div', {},
    h('h3', {}, `Import: ${file.name}`),
    h('p', {}, counts),
    h('p', {}, h('b', {}, 'Merge'), ': adds new records and overwrites those with the same id, leaves the rest untouched.'),
    h('p', {}, h('b', {}, 'Replace'), ': deletes the whole current database and loads only the file contents. Export first.'),
    h('div', { class: 'bar' }, h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => close() }, 'Cancel'),
      h('button', { class: 'btn danger', onclick: () => confirm('Really delete the current database?') && run('replace') }, 'Replace'),
      h('button', { class: 'btn primary', onclick: () => run('merge') }, 'Merge'))));
});

// ------------------------------------------------------------------ start
loadAll().then(route).catch((e) => toast(e.message, true));
