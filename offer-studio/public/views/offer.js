// Oferty z kafelków: lista ofert i czytelny widok oferty w trzech kolumnach
// (klient i pokrycie bólów · slajdy z opisem „dlaczego tu jest” · podgląd FigCraft).
import { $, api, autosize, debounce, download, go, h, loadAll, modal, state, tileById, tileLabel, toast, ui } from '../lib.js';
import { scoreTags, segmentOk, selectionOf, selectionSummary, tilePicker } from './new-offer.js';

// Nazwy pól slajdu dla ludzi (zamiast kluczy z szablonu).
const FIELD_LABELS = {
  title: 'Tytuł', title_accent: 'Tytuł: wyróżniona końcówka', title_2: 'Tytuł: druga linia', subtitle: 'Podtytuł', lead: 'Wstęp',
  note: 'Notatka na dole', quote: 'Cytat', quote_lead: 'Tekst pod cytatem', kicker: 'Nadtytuł', text: 'Tekst',
  price_label: 'Etykieta ceny', price_note: 'Dopisek przy cenie', lines: 'Wiersze (każdy: etykieta | wartość)',
  col_area: 'Nagłówek kolumny: obszar', col_them: 'Nagłówek kolumny: inni', col_us: 'Nagłówek kolumny: Gaius',
};
const TYPE_LABELS = {
  rozwiazanie: 'rozwiązanie', use_case: 'przypadek użycia', problem: 'problem', pillar: 'filar', signal: 'sygnał', step: 'krok wdrożenia',
  comparison: 'porównanie', package: 'składnik pakietu', person: 'osoba', differentiator: 'wyróżnik',
};
const plain = (s) => String(s || '').replace(/\*\*|\[\[\d:|\]\]/g, '');

const chip = (id, extra = '') => h('span', { class: `chip tile-chip ${id.split(':')[0]} ${tileById(id) ? '' : 'gone'} ${extra}` }, tileLabel(id));
const fromTiles = (offer) => Array.isArray(offer.data?.tiles) && offer.data?.scenario_id;

// ------------------------------------------------------------------ lista ofert
export function viewOfferList() {
  const card = (o) => {
    const ids = o.data?.tiles || [];
    const sel = selectionOf(ids);
    return h('button', { class: 'offer-card', onclick: () => go('offers', o.id) },
      h('div', { class: 'oc-top' }, h('b', {}, o.data?.client || o.name), h('span', { class: 'hint' }, new Date(o.updated_at).toLocaleDateString('pl-PL'))),
      h('div', { class: 'oc-name' }, o.name),
      ids.length
        ? h('div', { class: 'oc-tiles' }, [sel.role, sel.segment, sel.product].filter(Boolean).map((id) => chip(id)), sel.pains.map((id) => chip(id)))
        : h('div', { class: 'hint' }, 'oferta złożona ręcznie (bez kafelków)'));
  };
  ui.refresh = () => viewOfferList();
  $('#view').replaceChildren(h('div', { class: 'offer-list' },
    h('div', { class: 'ol-head' }, h('h1', {}, 'Oferty'), h('a', { class: 'btn primary big', href: '#/offers/new' }, '+ Nowa oferta')),
    state.offers.length ? h('div', { class: 'ol-grid' }, state.offers.map(card)) : h('div', { class: 'empty' }, 'Nie ma jeszcze ofert. Zacznij od „Nowa oferta”.')));
}

// ------------------------------------------------------------------ oferta
export async function viewOffer(offerId, slideId) {
  let offer;
  try {
    offer = await api('GET', `/offers/${encodeURIComponent(offerId)}`);
  } catch (e) {
    toast(e.message, true);
    return go('offers');
  }
  const framesByName = Object.fromEntries(state.library.map((s) => [s.frame, s]));
  const blocksById = Object.fromEntries(state.blocks.map((b) => [b.id, b]));
  const compsById = Object.fromEntries(state.components.map((c) => [c.id, c]));
  let openId = slideId || null;

  // --- podgląd (FigCraft)
  const shots = h('div', { class: 'shots' });
  const pstatus = h('span', { class: 'phint' });
  const shotFor = new Map();
  const markSelected = () => { for (const [id, el] of shotFor) el.classList.toggle('active', id === openId); };
  let previewSeq = 0;
  const refreshPreview = async () => {
    const my = ++previewSeq;
    pstatus.textContent = 'FigCraft renderuje…';
    let p;
    try { p = await api('GET', `/offers/${encodeURIComponent(offer.id)}/preview`); } catch (e) {
      pstatus.textContent = '';
      shots.replaceChildren(h('div', { class: 'shot-error' }, e.message));
      return;
    }
    if (my !== previewSeq) return;
    const figs = p.slides.map((s, i) => {
      const slide = offer.slides.find((x) => x.id === s.id);
      const img = s.url ? h('img', { src: s.url, alt: `Slajd ${i + 1}` }) : null;
      const fig = h('figure', { class: `shot ${s.hidden ? 'is-hidden' : ''}`, onclick: () => select(s.id, true) },
        img || h('div', { class: 'shot-error' }, s.error || p.error || 'brak podglądu'),
        h('figcaption', {}, `${i + 1} · ${slide?.origin?.label || s.frame}${s.hidden ? ' · ukryty' : ''}`));
      return { s, fig, img };
    });
    await Promise.all(figs.filter((x) => x.img).map((x) => x.img.decode().catch(() => {})));
    if (my !== previewSeq) return;
    shotFor.clear();
    for (const x of figs) shotFor.set(x.s.id, x.fig);
    const y = shots.scrollTop;
    shots.replaceChildren(...figs.map((x) => x.fig));
    shots.scrollTop = y;
    markSelected();
    pstatus.textContent = p.error ? 'błąd renderu' : '';
  };
  const refreshPreviewSoon = debounce(refreshPreview, 250);
  const preview = h('div', { class: 'preview' },
    h('div', { class: 'pbar' },
      h('button', { class: 'btn primary', onclick: () => download(`/offers/${encodeURIComponent(offer.id)}/pdf`, `${offer.name}.pdf`) }, 'Pobierz PDF'),
      h('button', { class: 'btn', title: 'Gotowa oferta jako plik FigCraft do ręcznych poprawek', onclick: () => download(`/offers/${encodeURIComponent(offer.id)}/figcraft`, `${offer.name}.figcraft`) }, 'Pobierz .figcraft'),
      h('span', { class: 'spacer' }), pstatus),
    shots);

  // --- akcje na ofercie
  const reload = async () => {
    offer = await api('GET', `/offers/${encodeURIComponent(offer.id)}`);
    renderClient();
    renderSlides();
    refreshPreviewSoon();
  };
  const patchSlide = async (id, patch) => {
    try { await api('PATCH', `/slides/${encodeURIComponent(id)}`, patch); await reload(); } catch (e) { toast(e.message, true); }
  };
  const recompute = async () => {
    try {
      offer = await api('POST', `/offers/${encodeURIComponent(offer.id)}/recompute`, {});
      const kept = offer.slides.filter((s) => s.locked).length;
      toast(kept ? `Przeliczono. Slajdy poprawione ręcznie (${kept}) zostały bez zmian.` : 'Przeliczono');
      await reload();
    } catch (e) { toast(e.message, true); }
  };
  const changeTiles = () => {
    let ids = [...offer.data.tiles];
    const summary = h('div', { class: 'summary-text' });
    const warn = h('div', { class: 'summary-warn' });
    const save = h('button', { class: 'btn primary', onclick: async () => {
      try {
        offer = await api('PUT', `/offers/${encodeURIComponent(offer.id)}/tiles`, { tiles: ids });
        close();
        const kept = offer.slides.filter((s) => s.locked).length;
        toast(kept ? `Przeliczono. Slajdy poprawione ręcznie (${kept}) zostały bez zmian.` : 'Przeliczono ofertę');
        await loadAll();
        await reload();
      } catch (e) { toast(e.message, true); }
    } }, 'Zapisz i przelicz');
    const update = () => { const s = selectionSummary(ids); summary.textContent = s.text; warn.textContent = s.warn || ''; save.disabled = !s.ok; };
    const close = modal(h('div', { class: 'tiles-dlg' },
      h('h3', {}, 'Zmień kafelki'),
      h('p', { class: 'hint' }, 'Slajdy poprawione ręcznie zostaną bez zmian. Reszta ułoży się od nowa.'),
      tilePicker(ids, (next) => { ids = next; update(); }),
      h('div', { class: 'bar', style: 'margin-top:14px' }, h('div', { style: 'flex:1' }, summary, warn), h('button', { class: 'btn', onclick: () => close() }, 'Anuluj'), save)));
    update();
  };

  // --- lewa kolumna: klient i pokrycie bólów
  const clientCol = h('div', { class: 'col client-col' });
  const saveOffer = debounce(async (patch) => {
    try { await api('PATCH', `/offers/${encodeURIComponent(offer.id)}`, patch); refreshPreviewSoon(); } catch (e) { toast(e.message, true); }
  }, 450);
  const renderClient = () => {
    const ids = offer.data?.tiles || [];
    const sel = selectionOf(ids);
    const cov = offer.coverage || { covered: [], missing: [] };
    const total = cov.covered.length + cov.missing.length;
    clientCol.replaceChildren(
      h('a', { class: 'back', href: '#/offers' }, '← Wszystkie oferty'),
      h('label', { class: 'f' }, 'Klient'),
      h('input', { value: offer.data?.client || '', oninput: (e) => saveOffer({ data: { client: e.target.value } }) }),
      h('label', { class: 'f' }, 'Nazwa oferty'),
      h('input', { value: offer.name, oninput: (e) => saveOffer({ name: e.target.value }) }),
      h('div', { class: 'cc-tiles' },
        h('div', { class: 'cc-row' }, h('span', { class: 'cc-k' }, 'Rozmówca'), sel.role ? chip(sel.role) : '–'),
        h('div', { class: 'cc-row' }, h('span', { class: 'cc-k' }, 'Segment'), sel.segment ? chip(sel.segment) : '–'),
        h('div', { class: 'cc-row' }, h('span', { class: 'cc-k' }, 'Produkt'), sel.product ? chip(sel.product) : '–')),
      h('div', { class: `coverage ${cov.missing.length ? 'partial' : 'full'}` },
        h('div', { class: 'cov-head' }, `Rozwiązane ${cov.covered.length} z ${total} bólów`),
        h('ul', {},
          cov.covered.map((p) => h('li', { class: 'ok' }, '✓ ', tileLabel(p))),
          cov.missing.map((p) => h('li', { class: 'miss' }, '✗ ', tileLabel(p),
            h('div', { class: 'hint' }, tileById(p) ? 'Żaden slajd tego nie rozwiązuje. Podmień blok na slajdzie „Jak rozwiązujemy” albo przypnij treść do tego bólu w zakładce Kafelki.' : 'Ten kafelek usunięto. Zmień kafelki oferty.'))))),
      h('label', { class: 'f' }, 'Cena'),
      h('input', { value: offer.data?.price || '', placeholder: 'np. 12 000 zł / mies.', oninput: (e) => saveOffer({ data: { price: e.target.value } }) }),
      !offer.data?.price ? h('div', { class: 'hint warn' }, 'Cena jest pusta: uzupełnij przed wysłaniem.') : null,
      h('div', { class: 'cc-actions' },
        h('button', { class: 'btn', onclick: changeTiles }, 'Zmień kafelki'),
        h('button', { class: 'btn', onclick: recompute, title: 'Ułóż ofertę od nowa z kafelków. Slajdy poprawione ręcznie zostają.' }, 'Przelicz')),
      h('details', { class: 'advanced' }, h('summary', {}, 'Zaawansowane'),
        h('p', { class: 'hint' }, 'Edytor dla osób od szablonu: nazwy slajdów w FigCraft, zmienne {{…}}, zapytania o bloki i karty.'),
        h('a', { class: 'btn sm', href: `#/offer-advanced/${encodeURIComponent(offer.id)}` }, 'Otwórz edytor zaawansowany')),
    );
  };

  // --- środek: slajdy z opisem „dlaczego tu jest”
  // Scenariusz liczony na bieżąco: „Zmień kafelki” może zmienić rolę, a z nią scenariusz.
  const currentScenario = () => state.scenarios.find((s) => s.id === offer.data?.scenario_id);
  const stepOf = (slide) => currentScenario()?.steps.find((st) => st.key === slide.origin?.step);
  const slidesCol = h('div', { class: 'editor slides-col' });
  const itemTitle = (id) => {
    if (id.includes(':')) return tileLabel(id);
    const b = blocksById[id];
    return b ? plain(b.title) : `${id} (usunięty blok)`;
  };
  const whyChips = (slide) => {
    const all = new Set(Object.values(slide.origin?.matched || {}).flat());
    return [...all].map((t) => chip(t));
  };

  const blockSwap = (slide, idx, type) => {
    const sel = selectionOf(offer.data.tiles);
    const taken = new Set(slide.block_ids);
    const cands = state.blocks.filter((b) => b.type === type && segmentOk(b.tags, sel))
      .map((b) => ({ b, ...scoreTags(b.tags, sel) }))
      .sort((a, b) => b.score - a.score || a.b.title.localeCompare(b.b.title, 'pl'));
    const close = modal(h('div', {},
      h('h3', {}, idx == null ? 'Dodaj blok' : `Podmień: ${itemTitle(slide.block_ids[idx])}`),
      h('p', { class: 'hint' }, 'Najlepiej pasujące do kafelków klienta są na górze.'),
      h('div', { class: 'cand-list' }, cands.map(({ b, matched }) => h('button', {
        class: 'cand', disabled: taken.has(b.id),
        onclick: async () => {
          const next = [...slide.block_ids];
          if (idx == null) next.push(b.id); else next[idx] = b.id;
          close();
          await patchSlide(slide.id, { block_ids: next });
        },
      }, h('b', {}, plain(b.title)), b.body ? h('span', { class: 'hint' }, plain(b.body).slice(0, 160)) : null,
      h('span', {}, matched.map((t) => chip(t)), taken.has(b.id) ? h('span', { class: 'hint' }, ' już na slajdzie') : null))))));
  };

  const slideEditor = (slide) => {
    const frame = framesByName[slide.frame];
    const keys = [...new Set([...(frame?.fields?.data || []), ...Object.keys(slide.data || {})])].filter((k) => k !== 'lines' || frame?.fields?.sources?.includes('lines'));
    const saveData = debounce((patch) => patchSlide(slide.id, { data: patch }), 600);
    const type = stepOf(slide)?.fill?.type;
    const editable = slide.block_ids.length && !slide.block_ids.some((id) => id.includes(':'));
    return h('div', { class: 'se' },
      keys.length ? h('div', { class: 'se-fields' }, keys.map((k) => [
        h('label', { class: 'f' }, FIELD_LABELS[k] || k),
        autosize(h('textarea', { rows: 1, oninput: (e) => saveData({ [k]: e.target.value }) }, slide.data?.[k] ?? '')),
      ])) : h('div', { class: 'hint' }, 'Ten slajd nie ma pól tekstowych.'),
      editable && type ? h('div', { class: 'se-blocks' },
        h('label', { class: 'f' }, 'Bloki na slajdzie'),
        slide.block_ids.map((id, i) => h('div', { class: 'se-block' }, h('span', {}, itemTitle(id)),
          h('button', { class: 'btn sm', onclick: () => blockSwap(slide, i, type) }, 'Podmień'),
          h('button', { class: 'icon', title: 'Usuń z slajdu', onclick: () => patchSlide(slide.id, { block_ids: slide.block_ids.filter((x) => x !== id) }) }, '×'))),
        h('button', { class: 'btn sm', onclick: () => blockSwap(slide, null, type) }, '+ dodaj blok')) : null,
      Object.keys(slide.picks || {}).length ? h('div', { class: 'hint' }, 'Karty na tym slajdzie zmienisz w edytorze zaawansowanym (wybór ręczny albo „Dobierz karty (AI)”).') : null,
      h('div', { class: 'se-actions' },
        h('button', { class: 'btn sm', onclick: () => patchSlide(slide.id, { hidden: !slide.hidden }) }, slide.hidden ? 'Pokaż w ofercie' : 'Ukryj w ofercie')));
  };

  const renderSlides = () => {
    const visible = offer.slides.filter((s) => !s.hidden).length;
    const scenario = currentScenario();
    slidesCol.replaceChildren(
      h('div', { class: 'bar' }, h('h2', {}, `Prezentacja · ${visible} slajdów`),
        scenario ? h('span', { class: 'hint' }, `scenariusz: ${scenario.name}`) : null),
      ...offer.slides.map((s, i) => {
        const open = s.id === openId;
        const items = s.block_ids.map((id) => h('li', {}, itemTitle(id),
          ...(s.origin?.matched?.[id] || []).filter((t) => t !== id).map((t) => chip(t, 'small'))));
        const picks = Object.values(s.picks || {}).flat().map((p) => h('li', {}, plain(compsById[p.component]?.title || p.component),
          ...(s.origin?.matched?.[p.component] || []).map((t) => chip(t, 'small'))));
        return h('div', { class: `slide-card ${open ? 'open' : ''} ${s.hidden ? 'is-hidden' : ''}`, 'data-id': s.id },
          h('div', { class: 'sc-head', onclick: () => select(open ? null : s.id) },
            h('span', { class: 'sc-n' }, i + 1),
            h('div', { class: 'sc-main' },
              h('div', { class: 'sc-title' }, s.origin?.label || plain(s.data?.title) || s.frame,
                s.locked ? h('span', { class: 'badge' }, 'poprawione ręcznie') : null,
                s.hidden ? h('span', { class: 'badge muted' }, 'ukryty') : null,
                !s.origin ? h('span', { class: 'badge muted' }, 'dodany ręcznie') : null),
              whyChips(s).length ? h('div', { class: 'sc-why' }, h('span', { class: 'hint' }, 'bo: '), whyChips(s)) : null),
            s.locked && s.origin ? h('button', { class: 'btn sm', title: 'Odrzuć ręczne poprawki i dobierz treść z kafelków', onclick: (e) => { e.stopPropagation(); patchSlide(s.id, { locked: false }); } }, 'Przywróć automat') : null),
          items.length || picks.length ? h('ul', { class: 'sc-items' }, items, picks) : null,
          open ? slideEditor(s) : null);
      }));
  };

  const select = (id, fromPreview = false) => {
    openId = id;
    history.replaceState(null, '', `#/offers/${encodeURIComponent(offer.id)}${id ? `/${encodeURIComponent(id)}` : ''}`);
    renderSlides();
    markSelected();
    if (!id) return;
    if (fromPreview) slidesCol.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
    else shotFor.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  ui.refresh = async () => {
    try { await reload(); } catch { /* oferta usunięta */ }
  };
  renderClient();
  renderSlides();
  $('#view').replaceChildren(clientCol, slidesCol, preview);
  await refreshPreview();
  if (openId) shotFor.get(openId)?.scrollIntoView({ block: 'center' });
}
