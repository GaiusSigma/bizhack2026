// Lessons: rules the sales team teaches the model, and the dialog that turns a correction into one.
// The model reads the active lessons on every run (n8n: choosing tiles and writing slides), so a lesson works from the
// next offer and switching it off stops it at once. Nothing is retrained.
import { $, CATEGORY_LABELS, api, autosize, h, loadAll, modal, plural, state, tileLabel, toast, ui } from '../lib.js';

export const KIND_LABELS = { plan: 'Choosing tiles', copy: 'Writing slides' };
const KIND_HINTS = {
  plan: 'Read before the model picks the role, segment, product and pains from the enquiry. Pick the tiles the rule is about.',
  copy: 'Read when the model writes the slides. It applies to offers that have all the tiles you pick (none = every offer).',
};

// Steps of the base deck, for "which slide is this about".
const deckSteps = () => (state.scenarios.find((s) => s.id === 'base')?.steps || state.scenarios[0]?.steps || []).map((s) => ({ key: s.key, label: s.label || s.key }));
const stepLabel = (key) => deckSteps().find((s) => s.key === key)?.label || key;

const chip = (id, extra = '') => h('span', { class: `chip tile-chip ${id.split(':')[0]} ${extra}` }, tileLabel(id));

function exampleBox(ex = {}) {
  if (!ex.before && !ex.after && !ex.quote) return null;
  return h('div', { class: 'lesson-example' },
    ex.quote ? h('div', { class: 'le-quote' }, h('span', { class: 'le-k' }, 'Enquiry'), String(ex.quote).slice(0, 400)) : null,
    ex.before ? h('div', { class: 'le-before' }, h('span', { class: 'le-k' }, 'Model'), ex.before) : null,
    ex.after ? h('div', { class: 'le-after' }, h('span', { class: 'le-k' }, 'Team'), ex.after) : null);
}

// New lesson or edit. `draft` comes from GET /api/offers/:id/corrections (or is empty). Resolves to the saved lesson.
export function lessonDialog(draft = {}, { title } = {}) {
  return new Promise((resolve) => {
    const l = { kind: 'copy', text: '', tiles: [], step: '', example: {}, ...structuredClone(draft) };
    let saved = null;
    const kind = h('select', { onchange: () => { l.kind = kind.value; render(); } },
      Object.entries(KIND_LABELS).map(([k, v]) => h('option', { value: k, selected: k === l.kind }, v)));
    const text = autosize(h('textarea', { rows: 3, placeholder: 'One rule, as you would tell a new salesperson. E.g. "Public offices: call the decision makers the management, never the board."', oninput: () => (l.text = text.value) }, l.text));
    const kindHint = h('div', { class: 'hint' });
    const tilesBox = h('div', { class: 'lesson-tiles' });
    const stepRow = h('div', {});
    const render = () => {
      kindHint.textContent = KIND_HINTS[l.kind];
      const active = state.tiles.filter((t) => t.status !== 'soon' || l.tiles.includes(t.id));
      tilesBox.replaceChildren(...Object.entries(CATEGORY_LABELS).map(([cat, label]) => h('div', { class: 'lt-row' },
        h('span', { class: 'lt-k' }, label),
        h('div', { class: 'lt-chips' }, active.filter((t) => t.category === cat).map((t) => h('button', {
          type: 'button', class: `chip tile-chip toggle ${cat} ${l.tiles.includes(t.id) ? 'on' : ''}`,
          onclick: () => { l.tiles = l.tiles.includes(t.id) ? l.tiles.filter((x) => x !== t.id) : [...l.tiles, t.id]; render(); },
        }, t.label))))));
      stepRow.replaceChildren(...(l.kind === 'copy' ? [
        h('label', { class: 'f' }, 'Slide'),
        h('select', { onchange: (e) => (l.step = e.target.value) },
          h('option', { value: '', selected: !l.step }, 'The whole deck'),
          deckSteps().map((s) => h('option', { value: s.key, selected: s.key === l.step }, s.label))),
      ] : []));
    };
    const save = async () => {
      if (!l.text.trim()) return toast('Write the rule first', true);
      const payload = { kind: l.kind, text: l.text, tiles: l.tiles, step: l.kind === 'copy' ? l.step || '' : '', example: l.example || {}, ...(l.offer_id ? { offer_id: l.offer_id } : {}) };
      try {
        saved = l.id ? await api('PATCH', `/lessons/${encodeURIComponent(l.id)}`, payload) : await api('POST', '/lessons', payload);
        close();
        toast(l.id ? 'Lesson saved' : 'Lesson saved: the model reads it from the next offer');
        await loadAll();
        ui.refresh?.();
      } catch (e) { toast(e.message, true); }
    };
    const close = modal(h('div', { class: 'lesson-dlg' },
      h('h3', {}, title || (l.id ? 'Edit lesson' : 'Teach the model')),
      h('label', { class: 'f' }, 'When'), kind, kindHint,
      h('label', { class: 'f' }, 'Rule'), text,
      exampleBox(l.example) ? [h('label', { class: 'f' }, 'The correction it comes from (the model reads it as an example)'), exampleBox(l.example)] : null,
      h('label', { class: 'f' }, l.kind === 'plan' ? 'Tiles it is about' : 'Applies to offers with'), tilesBox,
      stepRow,
      h('div', { class: 'bar', style: 'margin-top:16px' }, h('span', { class: 'spacer' }),
        h('button', { class: 'btn', onclick: () => close() }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: save }, 'Save lesson'))));
    ui.onModalClose = () => resolve(saved);
    render();
    text.focus();
  });
}

// What people changed after the model on one offer, each with "Make a lesson".
export async function correctionsDialog(offer, { fieldLabel = (k) => k } = {}) {
  let c;
  try { c = await api('GET', `/offers/${encodeURIComponent(offer.id)}/corrections`); } catch (e) { return toast(e.message, true); }
  const row = (what, before, after, draft) => h('div', { class: 'corr' },
    h('div', { class: 'corr-what' }, what),
    h('div', { class: 'lesson-example' },
      h('div', { class: 'le-before' }, h('span', { class: 'le-k' }, 'Model'), before),
      h('div', { class: 'le-after' }, h('span', { class: 'le-k' }, 'Now'), after)),
    h('button', { class: 'btn sm', onclick: async () => { close(); await lessonDialog(draft); } }, 'Make a lesson'));
  const close = modal(h('div', { class: 'lesson-dlg' },
    h('h3', {}, 'What the team changed after the model'),
    h('p', { class: 'hint' }, 'Turn a change into a lesson when it is worth repeating: the model reads lessons on every run, from the next offer on. One-off changes for this client need no lesson.'),
    c.count ? null : h('div', { class: 'empty' }, 'Nothing changed yet. Edit a slide the model wrote or change the tiles, and the change shows up here.'),
    c.tiles ? row('Tiles', c.tiles.model.map(tileLabel).join(', '), c.tiles.now.map(tileLabel).join(', '), c.tiles.draft) : null,
    c.fields.map((f) => row(`${f.step_label} · ${fieldLabel(f.field)}`, f.model, f.now, { ...f.draft, text: `${f.step_label} · ${fieldLabel(f.field)}: ` }))));
}

// The Lessons tab.
export function viewLessons() {
  ui.refresh = () => viewLessons();
  const offerName = (id) => state.offers.find((o) => o.id === id)?.data?.client || state.offers.find((o) => o.id === id)?.name;
  const card = (l) => h('div', { class: `lesson ${l.active ? '' : 'off'}` },
    h('div', { class: 'lesson-top' },
      h('div', { class: 'lesson-text' }, l.text),
      h('label', { class: 'lesson-on', title: 'Off: the model stops reading it' },
        h('input', { type: 'checkbox', checked: l.active, onchange: async (e) => {
          try { await api('PATCH', `/lessons/${encodeURIComponent(l.id)}`, { active: e.target.checked }); await loadAll(); viewLessons(); } catch (err) { toast(err.message, true); }
        } }), l.active ? 'on' : 'off')),
    h('div', { class: 'lesson-meta' },
      l.kind === 'copy' ? h('span', { class: 'chip' }, l.step ? `slide: ${stepLabel(l.step)}` : 'whole deck') : null,
      l.tiles.length ? l.tiles.map((t) => chip(t, 'small')) : h('span', { class: 'chip' }, l.kind === 'copy' ? 'every offer' : 'any enquiry'),
      h('span', { class: 'hint' }, ` · used in ${plural(l.used || 0, 'offer')}`),
      l.offer_id && offerName(l.offer_id) ? h('span', { class: 'hint' }, ' · from ', h('a', { href: `#/offers/${encodeURIComponent(l.offer_id)}` }, offerName(l.offer_id))) : null),
    exampleBox(l.example),
    h('div', { class: 'lesson-acts' },
      h('button', { class: 'btn sm', onclick: () => lessonDialog(l) }, 'Edit'),
      h('button', { class: 'btn sm danger', onclick: async () => {
        if (!confirm('Delete this lesson? Switching it off keeps it for later.')) return;
        try { await api('DELETE', `/lessons/${encodeURIComponent(l.id)}`); await loadAll(); viewLessons(); } catch (e) { toast(e.message, true); }
      } }, 'Delete')));

  const section = (kind) => {
    const items = state.lessons.filter((l) => l.kind === kind);
    return h('section', { class: 'lesson-sec' },
      h('h2', {}, KIND_LABELS[kind], h('span', { class: 'hint' }, ` ${items.filter((l) => l.active).length} on`)),
      h('p', { class: 'hint' }, KIND_HINTS[kind]),
      items.length ? items.map(card) : h('div', { class: 'hint' }, 'None yet.'));
  };
  const made = state.offers.filter((o) => o.data?.made_by);
  $('#view').replaceChildren(h('div', { class: 'offer-list lessons' },
    h('div', { class: 'ol-head' }, h('h1', {}, 'Lessons'), h('button', { class: 'btn primary big', onclick: () => lessonDialog() }, '+ New lesson')),
    h('p', { class: 'lessons-intro' }, 'How the team teaches the model. Every run, n8n gives the model the active lessons: when it chooses tiles and when it writes slides. A lesson works from the next offer, off stops it at once, and every offer remembers which lessons it was made with. ',
      made.length ? ['The quickest start: open an offer the model made, change what is wrong, then ', h('b', {}, 'Teach the model'), ' turns your change into a lesson.'] : 'Offers made by the model show what you changed after it, ready to become a lesson.'),
    made.length ? h('p', { class: 'hint' }, `${plural(made.length, 'offer')} made by the model: `, made.slice(0, 6).map((o, i) => [i ? ', ' : '', h('a', { href: `#/offers/${encodeURIComponent(o.id)}` }, o.data.client || o.name)])) : null,
    section('plan'), section('copy')));
}
