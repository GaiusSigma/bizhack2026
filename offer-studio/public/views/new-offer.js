// New offer from tiles: the salesperson describes the client (role, segment, pains, product),
// and the deck is built from the role's scenario. The same tile picker serves "Change tiles".
import { $, CATEGORY_LABELS, api, go, h, loadAll, state, toast } from '../lib.js';
import { cleanSelection } from '../selection.js';

export const MAX_PAINS = 5;
const WEIGHTS = { pain: 3, segment: 2, role: 1, product: 1 };
const COVERAGE_TYPES = ['solution', 'use_case'];

// The same rules as src/generate.js (the server picks); here only for live hints.
export const selectionOf = (ids) => {
  const of = (cat) => ids.filter((id) => id.startsWith(`${cat}:`));
  return { role: of('role')[0], segment: of('segment')[0], product: of('product')[0], pains: of('pain') };
};
export function scoreTags(tags, sel) {
  const chosen = new Set([sel.role, sel.segment, sel.product, ...sel.pains]);
  const matched = [...new Set(tags || [])].filter((t) => chosen.has(t));
  return { score: matched.reduce((s, t) => s + (WEIGHTS[t.split(':')[0]] || 0), 0), matched };
}
export const segmentOk = (tags, sel) => {
  const segs = (tags || []).filter((t) => t.startsWith('segment:'));
  return !segs.length || segs.includes(sel.segment);
};
// Pains that have content fitting the segment (a solution or a use case).
export const painsWithContent = (sel) => sel.pains.filter((p) => state.blocks.some((b) =>
  COVERAGE_TYPES.includes(b.type) && b.tags.includes(p) && segmentOk(b.tags, sel)));

// Under each category: when the selected tiles fit and when they don't (the same guidance the AI model reads).
const selectedGuide = (chosen) => {
  const withGuide = chosen.filter((t) => t.data?.pick_when || t.data?.avoid_when);
  if (!withGuide.length) return null;
  return h('div', { class: 'tp-guide' }, withGuide.map((t) => h('div', { class: 'tp-guide-row' },
    h('b', {}, t.label),
    t.data?.pick_when ? h('div', {}, h('span', { class: 'gk ok' }, 'Fits when'), ' ', t.data.pick_when) : null,
    t.data?.avoid_when ? h('div', {}, h('span', { class: 'gk no' }, 'Not when'), ' ', t.data.avoid_when) : null)));
};

// Tile picker. `selected` = list of ids; onChange gets the new list.
export function tilePicker(selected, onChange) {
  let ids = cleanSelection(selected, state.tiles);
  const root = h('div', { class: 'tile-picker' });
  const render = () => {
    root.replaceChildren(...Object.entries(CATEGORY_LABELS).map(([cat, title]) => {
      const tiles = state.tiles.filter((t) => t.category === cat).sort((a, b) => (a.status === 'soon') - (b.status === 'soon') || a.position - b.position);
      const multi = cat === 'pain';
      const count = ids.filter((id) => id.startsWith(`${cat}:`)).length;
      return h('section', { class: 'tp-cat' },
        h('div', { class: 'tp-head' }, h('h3', {}, title),
          h('span', { class: 'hint' }, multi ? `pick 1 to ${MAX_PAINS} · ${count} selected` : 'pick one')),
        h('div', { class: 'tp-tiles grid' }, tiles.map((t) => {
          const on = ids.includes(t.id);
          const soon = t.status === 'soon';
          return h('button', {
            class: `tile ${on ? 'on' : ''} ${soon ? 'soon' : ''}`,
            disabled: soon,
            title: [t.data?.pick_when && `Pick when: ${t.data.pick_when}`, t.quotes?.[0] && `"${t.quotes[0]}"`].filter(Boolean).join('\n\n'),
            onclick: () => {
              if (multi) {
                if (on) ids = ids.filter((x) => x !== t.id);
                else if (count >= MAX_PAINS) return toast(`At most ${MAX_PAINS} pains. Deselect one to add another.`, true);
                else ids = [...ids, t.id];
              } else ids = [...ids.filter((x) => !x.startsWith(`${cat}:`)), t.id];
              render();
              onChange(ids);
            },
          },
          h('span', { class: 'tile-label' }, t.label),
          !soon && t.description ? h('span', { class: 'tile-desc' }, t.description) : null,
          soon ? h('span', { class: 'soon-tag' }, 'coming soon') : null);
        })),
        selectedGuide(tiles.filter((t) => ids.includes(t.id))));
    }));
  };
  render();
  return root;
}

// Live summary: scenario, slide count, pains with content.
export function selectionSummary(ids) {
  const sel = selectionOf(ids);
  const scenario = state.scenarios.find((s) => s.id === sel.role);
  const missing = [];
  if (!sel.role) missing.push('a role');
  if (!sel.segment) missing.push('a segment');
  if (!sel.product) missing.push('a product');
  if (!sel.pains.length) missing.push('at least one pain');
  if (missing.length) return { ok: false, text: `Still to pick: ${missing.join(', ')}.` };
  if (!scenario) return { ok: false, text: 'There is no scenario for this role yet.' };
  const chosen = new Set(ids);
  const steps = scenario.steps.filter((st) => !st.when?.any?.length || st.when.any.some((t) => chosen.has(t)));
  const withContent = painsWithContent(sel);
  const lacking = sel.pains.filter((p) => !withContent.includes(p)).map((p) => state.tiles.find((t) => t.id === p)?.label || p);
  return {
    ok: true,
    text: `${scenario.name} scenario · ${steps.length} slides · pains with ready content: ${withContent.length} of ${sel.pains.length}`,
    warn: lacking.length ? `No content for: ${lacking.join(', ')}. The offer will be created, but it won't solve this pain.` : '',
  };
}

export async function viewNewOffer() {
  const firstActive = (cat) => state.tiles.find((t) => t.category === cat && t.status === 'active')?.id;
  let ids = ['role', 'segment', 'product'].map(firstActive).filter(Boolean);
  const client = h('input', { placeholder: 'e.g. Nowak & Partners Law Firm', class: 'client-input' });
  const summary = h('div', { class: 'summary-text' });
  const warn = h('div', { class: 'summary-warn' });
  const create = h('button', { class: 'btn primary big', onclick: async () => {
    if (!client.value.trim()) { client.focus(); return toast('Enter the client name', true); }
    create.disabled = true;
    try {
      const o = await api('POST', '/offers/generate', { client: client.value.trim(), tiles: ids });
      await loadAll();
      go('offers', o.id);
    } catch (e) {
      toast(e.message, true);
      create.disabled = false;
    }
  } }, 'Create offer');
  const update = () => {
    const s = selectionSummary(ids);
    summary.textContent = s.text;
    warn.textContent = s.warn || '';
    create.disabled = !s.ok;
  };
  const picker = tilePicker(ids, (next) => { ids = next; update(); });
  update();
  $('#view').replaceChildren(h('div', { class: 'new-offer' },
    h('div', { class: 'no-inner' },
      h('a', { class: 'back', href: '#/offers' }, '← All offers'),
      h('h1', {}, 'New offer'),
      h('p', { class: 'lead' }, 'Describe the client after the call. The deck builds itself from the contact\'s role, and every slide shows why it is there.'),
      h('label', { class: 'f' }, 'Client'), client,
      picker),
    h('div', { class: 'summary-bar' }, h('div', { class: 'summary-copy' }, summary, warn), create)));
  client.focus();
}
