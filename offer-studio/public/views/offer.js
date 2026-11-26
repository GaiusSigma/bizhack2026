// Offers from tiles: the offer list and a readable three-column offer view
// (client and pain coverage · slides with "why it is here" · FigCraft preview).
import { $, api, autosize, debounce, download, editorUrl, go, h, loadAll, modal, state, tileById, tileLabel, toast, ui } from '../lib.js';
import { cleanSelection, slotMatches } from '../selection.js';
import { correctionsDialog, lessonDialog } from './lessons.js';
import { scoreTags, segmentOk, selectionOf, selectionSummary, tilePicker } from './new-offer.js';

// Human names for slide fields (instead of template keys).
const FIELD_LABELS = {
  title: 'Title', title_accent: 'Title: accented ending', title_2: 'Title: second line', subtitle: 'Subtitle', lead: 'Intro',
  note: 'Note at the bottom', quote: 'Quote', quote_lead: 'Text under the quote', kicker: 'Kicker', text: 'Text',
  price_label: 'Price label', price_note: 'Price note', lines: 'Rows (each: label | value)',
  col_area: 'Column header: area', col_them: 'Column header: others', col_us: 'Column header: Gaius',
  // 2026 deck: list fields hold one card per line, columns separated by |
  areas: 'Areas (each: area | what the client said)', solutions: 'Areas (each: area | how the product handles it)',
  concerns: 'Concerns (each: concern | our answer)', tool: 'Compared tool',
  rows: 'Rows (each: area | the tool | our product)', features: 'Security features (each: title | text)',
  steps: 'Steps (each: step | why)', services: 'Services (each: name | scope | time or package)',
  calendar: 'Text under the QR box',
};
const TYPE_LABELS = {
  solution: 'solution', use_case: 'use case', problem: 'problem', pillar: 'pillar', signal: 'signal', step: 'rollout step',
  comparison: 'comparison', package: 'package item', person: 'person', differentiator: 'differentiator',
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
        : h('div', { class: 'hint' }, 'built by hand (no tiles)'));
  };
  ui.refresh = () => viewOfferList();
  $('#view').replaceChildren(h('div', { class: 'offer-list' },
    h('div', { class: 'ol-head' }, h('h1', {}, 'Offers'), h('a', { class: 'btn primary big', href: '#/offers/new' }, '+ New offer')),
    state.offers.length ? h('div', { class: 'ol-grid' }, state.offers.map(card)) : h('div', { class: 'empty' }, 'No offers yet. Start with "New offer".')));
}

// ------------------------------------------------------------------ offer
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

  // --- preview (FigCraft)
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
        img || h('div', { class: 'shot-error' }, s.error || p.error || 'no preview'),
        h('figcaption', {}, `${i + 1} · ${slide?.origin?.label || s.frame}${s.hidden ? ' · hidden' : ''}`));
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
    pstatus.textContent = p.error ? 'render error' : '';
  };
  const refreshPreviewSoon = debounce(refreshPreview, 250);
  const preview = h('div', { class: 'preview' },
    h('div', { class: 'pbar' },
      h('button', { class: 'btn primary', onclick: () => download(`/offers/${encodeURIComponent(offer.id)}/pdf`, `${offer.name}.pdf`) }, 'Download PDF'),
      h('button', { class: 'btn', title: 'The finished offer as a FigCraft file for manual edits', onclick: () => download(`/offers/${encodeURIComponent(offer.id)}/figcraft`, `${offer.name}.figcraft`) }, 'Download .figcraft'),
      state.meta.figcraftEditor
        ? h('a', { class: 'btn', href: editorUrl({ offer: offer.id }), target: '_blank', title: 'The finished offer in the FigCraft web editor (saves are downloads; edit slides in the library)' }, 'Open in FigCraft')
        : state.meta.figcraftWebUrl ? h('a', { class: 'btn', href: state.meta.figcraftWebUrl, target: '_blank' }, 'Open FigCraft') : null,
      h('span', { class: 'spacer' }), pstatus),
    shots);

  // --- akcje na ofercie
  const reload = async () => {
    offer = await api('GET', `/offers/${encodeURIComponent(offer.id)}`);
    renderClient();
    renderSlides();
    renderTeach();
    refreshPreviewSoon();
  };
  const patchSlide = async (id, patch) => {
    try { await api('PATCH', `/slides/${encodeURIComponent(id)}`, patch); await reload(); } catch (e) { toast(e.message, true); }
  };
  const recompute = async () => {
    try {
      offer = await api('POST', `/offers/${encodeURIComponent(offer.id)}/recompute`, {});
      const kept = offer.slides.filter((s) => s.locked).length;
      toast(kept ? `Recomputed. Slides edited by hand (${kept}) were left unchanged.` : 'Recomputed');
      await reload();
    } catch (e) { toast(e.message, true); }
  };
  const changeTiles = () => {
    // Deleted or coming-soon tiles drop out of the selection so saving works.
    let ids = cleanSelection(offer.data.tiles, state.tiles);
    const summary = h('div', { class: 'summary-text' });
    const warn = h('div', { class: 'summary-warn' });
    const save = h('button', { class: 'btn primary', onclick: async () => {
      try {
        offer = await api('PUT', `/offers/${encodeURIComponent(offer.id)}/tiles`, { tiles: ids });
        close();
        const kept = offer.slides.filter((s) => s.locked).length;
        toast(kept ? `Recomputed. Slides edited by hand (${kept}) were left unchanged.` : 'Offer recomputed');
        await loadAll();
        await reload();
      } catch (e) { toast(e.message, true); }
    } }, 'Save and recompute');
    const update = () => { const s = selectionSummary(ids); summary.textContent = s.text; warn.textContent = s.warn || ''; save.disabled = !s.ok; };
    const close = modal(h('div', { class: 'tiles-dlg' },
      h('h3', {}, 'Change tiles'),
      h('p', { class: 'hint' }, 'Slides edited by hand stay unchanged. The rest is rebuilt.'),
      tilePicker(ids, (next) => { ids = next; update(); }),
      h('div', { class: 'bar', style: 'margin-top:14px' }, h('div', { style: 'flex:1' }, summary, warn), h('button', { class: 'btn', onclick: () => close() }, 'Cancel'), save)));
    update();
  };

  // --- teaching the model: what the team changed after it, and the lessons this offer was made with
  const teachBox = h('div', { class: 'teach' });
  const renderTeach = async () => {
    if (!offer.data?.made_by) return teachBox.replaceChildren();
    let c = { count: 0 };
    try { c = await api('GET', `/offers/${encodeURIComponent(offer.id)}/corrections`); } catch { /* offer deleted */ }
    const used = (offer.data.lessons_used || []).map((id) => state.lessons.find((l) => l.id === id)).filter(Boolean);
    const fieldLabel = (k) => FIELD_LABELS[k] || k;
    // DOM replaceChildren prints null as text: build with h() and move its children
    teachBox.replaceChildren(...h('div', {},
      h('div', { class: 'teach-head' }, 'Teach the model'),
      h('div', { class: 'hint' }, c.count
        ? `You changed ${c.count === 1 ? '1 thing' : `${c.count} things`} the model wrote. Worth repeating? Make it a lesson: the model reads it from the next offer.`
        : `Made by ${offer.data.made_by}. Change what is wrong (tiles or slide copy), then turn the change into a lesson.`),
      used.length ? h('div', { class: 'hint' }, `Made with ${used.length === 1 ? '1 lesson' : `${used.length} lessons`}: `, used.map((l, i) => [i ? '; ' : '', h('a', { href: '#/lessons', title: l.text }, l.text.length > 50 ? `${l.text.slice(0, 50)}…` : l.text)])) : null,
      h('div', { class: 'cc-actions' },
        h('button', { class: `btn ${c.count ? 'primary' : ''}`, onclick: () => correctionsDialog(offer, { fieldLabel }) }, c.count ? `Review ${c.count} change${c.count === 1 ? '' : 's'}` : 'What changed'),
        h('button', { class: 'btn', onclick: () => lessonDialog({ kind: 'copy', offer_id: offer.id, tiles: (offer.data.tiles || []).filter((t) => t.startsWith('segment:')) }) }, '+ Lesson'))).childNodes);
  };

  // --- left column: client and pain coverage
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
      h('a', { class: 'back', href: '#/offers' }, '← All offers'),
      h('label', { class: 'f' }, 'Client'),
      h('input', { value: offer.data?.client || '', oninput: (e) => saveOffer({ data: { client: e.target.value } }) }),
      h('label', { class: 'f' }, 'Offer name'),
      h('input', { value: offer.name, oninput: (e) => saveOffer({ name: e.target.value }) }),
      h('div', { class: 'cc-tiles' },
        h('div', { class: 'cc-row' }, h('span', { class: 'cc-k' }, 'Contact'), sel.role ? chip(sel.role) : '–'),
        h('div', { class: 'cc-row' }, h('span', { class: 'cc-k' }, 'Segment'), sel.segment ? chip(sel.segment) : '–'),
        h('div', { class: 'cc-row' }, h('span', { class: 'cc-k' }, 'Product'), sel.product ? chip(sel.product) : '–')),
      !offer.coverage ? '' : h('div', { class: `coverage ${cov.missing.length ? 'partial' : 'full'}` },
        h('div', { class: 'cov-head' }, `${cov.covered.length} of ${total} pains solved`),
        h('ul', {},
          cov.covered.map((p) => h('li', { class: 'ok' }, '✓ ', tileLabel(p))),
          cov.missing.map((p) => h('li', { class: 'miss' }, '✗ ', tileLabel(p),
            h('div', { class: 'hint' }, tileById(p) ? 'No slide solves this. Swap a block on the "How we solve it" slide or pin content to this pain in the Tiles tab.' : 'This tile was deleted. Change the offer\'s tiles.'))))),
      h('label', { class: 'f' }, 'Price'),
      h('input', { value: offer.data?.price || '', placeholder: 'e.g. 12,000 PLN / month', oninput: (e) => saveOffer({ data: { price: e.target.value } }) }),
      !offer.data?.price ? h('div', { class: 'hint warn' }, 'The price is empty: fill it in before sending.') : null,
      h('div', { class: 'cc-actions' },
        h('button', { class: 'btn', onclick: changeTiles }, 'Change tiles'),
        h('button', { class: 'btn', onclick: recompute, title: 'Rebuild the offer from its tiles. Slides edited by hand stay.' }, 'Recompute')),
      offer.data?.enquiry ? h('details', { class: 'enquiry' }, h('summary', {}, 'What the client said'),
        offer.data.summary ? h('p', { class: 'hint' }, offer.data.summary) : null,
        h('pre', {}, offer.data.enquiry)) : null,
      teachBox,
      h('details', { class: 'advanced' }, h('summary', {}, 'Advanced'),
        h('p', { class: 'hint' }, 'Editor for template people: FigCraft slide names, {{…}} variables, block queries and cards.'),
        h('a', { class: 'btn sm', href: `#/offer-advanced/${encodeURIComponent(offer.id)}` }, 'Open the advanced editor')),
    );
  };

  // --- middle: slides with "why it is here"
  // The scenario is looked up live: "Change tiles" may change the role, and with it the scenario.
  const currentScenario = () => state.scenarios.find((s) => s.id === offer.data?.scenario_id);
  const stepOf = (slide) => currentScenario()?.steps.find((st) => st.key === slide.origin?.step);
  const slidesCol = h('div', { class: 'editor slides-col' });
  const itemTitle = (id) => {
    if (id.includes(':')) return tileLabel(id);
    const b = blocksById[id];
    return b ? plain(b.title) : `${id} (deleted block)`;
  };
  // Highlighting: an element is lit when it is linked (directly or through a solution) to one of the client's
  // tiles of the kinds this slide answers.
  const solutionsById = Object.fromEntries(state.blocks.filter((b) => b.type === 'solution').map((b) => [b.id, b]));
  const answersOf = (slide) => stepOf(slide)?.answers || [];
  const litFor = (slide, item) => (item ? slotMatches(item, offer.data?.tiles || [], answersOf(slide), solutionsById) : []);
  const whyChips = (slide) => {
    const all = new Set([
      ...slide.block_ids.filter((id) => !id.includes(':')).flatMap((id) => litFor(slide, blocksById[id])),
      ...Object.values(slide.picks || {}).flat().flatMap((p) => litFor(slide, compsById[p.component])),
    ]);
    return [...all].map((t) => chip(t));
  };
  const ANSWER_LABELS = { pain: 'client pains', segment: 'segment', role: 'contact role', product: 'product' };

  const blockSwap = (slide, idx, type) => {
    const sel = selectionOf(offer.data.tiles);
    const taken = new Set(slide.block_ids);
    const cands = state.blocks.filter((b) => b.type === type)
      .map((b) => ({ b, ...scoreTags(b.tags, sel), lit: litFor(slide, b), fits: segmentOk(b.tags, sel) }))
      .sort((a, b) => b.lit.length - a.lit.length || b.fits - a.fits || b.score - a.score || a.b.title.localeCompare(b.b.title, 'en'));
    const close = modal(h('div', {},
      h('h3', {}, idx == null ? 'Add a block' : `Swap: ${itemTitle(slide.block_ids[idx])}`),
      h('p', { class: 'hint' }, 'Highlighted elements match what this slide answers for the client. They are at the top.'),
      h('div', { class: 'cand-list' }, cands.map(({ b, lit, fits }) => h('button', {
        class: `cand ${lit.length ? 'lit' : ''} ${fits ? '' : 'off'}`, disabled: taken.has(b.id),
        onclick: async () => {
          const next = [...slide.block_ids];
          if (idx == null) next.push(b.id); else next[idx] = b.id;
          close();
          await patchSlide(slide.id, { block_ids: next });
        },
      }, h('b', {}, plain(b.title)), b.body ? h('span', { class: 'hint' }, plain(b.body).slice(0, 160)) : null,
      h('span', {}, lit.map((t) => chip(t)), fits ? null : h('span', { class: 'hint' }, ' meant for another segment'),
        taken.has(b.id) ? h('span', { class: 'hint' }, ' already on the slide') : null))))));
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
      ])) : h('div', { class: 'hint' }, 'This slide has no text fields.'),
      editable && type ? h('div', { class: 'se-blocks' },
        h('label', { class: 'f' }, 'Blocks on the slide'),
        slide.block_ids.map((id, i) => h('div', { class: 'se-block' }, h('span', {}, itemTitle(id)),
          h('button', { class: 'btn sm', onclick: () => blockSwap(slide, i, type) }, 'Swap'),
          h('button', { class: 'icon', title: 'Remove from the slide', onclick: () => patchSlide(slide.id, { block_ids: slide.block_ids.filter((x) => x !== id) }) }, '×'))),
        h('button', { class: 'btn sm', onclick: () => blockSwap(slide, null, type) }, '+ add a block')) : null,
      Object.keys(slide.picks || {}).length ? h('div', { class: 'hint' }, 'Change the cards on this slide in the advanced editor (manual picks or "Pick cards (AI)").') : null,
      h('div', { class: 'se-actions' },
        h('button', { class: 'btn sm', onclick: () => patchSlide(slide.id, { hidden: !slide.hidden }) }, slide.hidden ? 'Show in the offer' : 'Hide from the offer')));
  };

  const renderSlides = () => {
    const visible = offer.slides.filter((s) => !s.hidden).length;
    const scenario = currentScenario();
    slidesCol.replaceChildren(
      h('div', { class: 'bar' }, h('h2', {}, `Deck · ${visible} slides`),
        scenario ? h('span', { class: 'hint' }, `scenario: ${scenario.name}`) : null),
      ...offer.slides.map((s, i) => {
        const open = s.id === openId;
        const element = (id, item, title) => {
          const lit = id.includes(':') ? [] : litFor(s, item);
          const reason = s.origin?.reasons?.[id];
          return h('li', { class: lit.length ? 'lit' : '' }, title, ...lit.map((t) => chip(t, 'small')),
            reason ? h('div', { class: 'reason' }, reason) : null);
        };
        const items = s.block_ids.map((id) => element(id, blocksById[id], itemTitle(id)));
        const picks = Object.values(s.picks || {}).flat().map((p) => element(p.component, compsById[p.component], plain(compsById[p.component]?.title || p.component)));
        const answers = answersOf(s);
        return h('div', { class: `slide-card ${open ? 'open' : ''} ${s.hidden ? 'is-hidden' : ''}`, 'data-id': s.id },
          h('div', { class: 'sc-head', onclick: () => select(open ? null : s.id) },
            h('span', { class: 'sc-n' }, i + 1),
            h('div', { class: 'sc-main' },
              h('div', { class: 'sc-title' }, s.origin?.label || plain(s.data?.title) || s.frame,
                s.origin?.chosen_by ? h('span', { class: 'badge model' }, `chosen by ${s.origin.chosen_by}`) : s.origin?.written_by ? h('span', { class: 'badge model' }, `written by ${s.origin.written_by}`) : s.locked ? h('span', { class: 'badge' }, 'edited by hand') : null,
                s.hidden ? h('span', { class: 'badge muted' }, 'hidden') : null,
                !s.origin ? h('span', { class: 'badge muted' }, 'added by hand') : null),
              answers.length ? h('div', { class: 'sc-answers hint' }, `Answers: ${answers.map((a) => ANSWER_LABELS[a] || a).join(', ')}`) : null,
              whyChips(s).length ? h('div', { class: 'sc-why' }, h('span', { class: 'hint' }, 'matches: '), whyChips(s)) : null),
            s.locked && s.origin ? h('button', { class: 'btn sm', title: 'Discard manual edits and pick content from the tiles', onclick: (e) => { e.stopPropagation(); patchSlide(s.id, { locked: false }); } }, 'Restore automatic') : null),
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
    try { await reload(); } catch { /* offer deleted */ }
  };
  renderClient();
  renderSlides();
  renderTeach();
  $('#view').replaceChildren(clientCol, slidesCol, preview);
  await refreshPreview();
  if (openId) shotFor.get(openId)?.scrollIntoView({ block: 'center' });
}
