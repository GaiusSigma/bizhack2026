// Tiles: role, segment, pain, product. This is where a tile is described (name, description, quotes, status)
// and content is pinned to it (knowledge blocks and cards) that the generator builds offers from.
import { $, CATEGORY_LABELS, api, autosize, go, h, loadAll, saver, state, tileLabel, toast, ui } from '../lib.js';
import { solutionsFor } from './new-offer.js';

const CATEGORY_SHORT = { role: 'Roles', segment: 'Segments', pain: 'Pains', product: 'Products' };
const isTile = (t) => /^(role|segment|pain|product):/.test(t);
const plain = (s) => String(s || '').replace(/\*\*|\[\[\d:|\]\]/g, '');

// Content pinned to a tile: blocks and cards with its id in their tags.
const pinnedTo = (id) => [
  ...state.blocks.filter((b) => b.tags.includes(id)).map((b) => ({ kind: 'block', item: b })),
  ...state.components.filter((c) => !c.missing && c.tags.includes(id)).map((c) => ({ kind: 'card', item: c })),
];
const setTags = async ({ kind, item }, tags) => {
  if (kind === 'block') await api('PATCH', `/blocks/${encodeURIComponent(item.id)}`, { tags });
  else await api('PATCH', `/components/${item.id.split('/').map(encodeURIComponent).join('/')}`, { tags });
};

// Tiles as clickable chips (Knowledge, block editor). Plain tags are left alone.
export function tileTagEditor(tags, onChange) {
  let current = [...(tags || [])];
  const root = h('div', { class: 'tile-tags' });
  const render = () => root.replaceChildren(...Object.entries(CATEGORY_SHORT).map(([cat, title]) => h('div', { class: 'tt-row' },
    h('span', { class: 'tt-k' }, title),
    h('div', { class: 'tt-chips' }, state.tiles.filter((t) => t.category === cat).map((t) => {
      const on = current.includes(t.id);
      return h('button', { class: `chip tile-chip ${cat} toggle ${on ? 'on' : ''}`, title: t.description || '', onclick: () => {
        current = on ? current.filter((x) => x !== t.id) : [...current, t.id];
        render();
        onChange(current);
      } }, t.label);
    })))));
  render();
  return root;
}
export const plainTags = (tags) => (tags || []).filter((t) => !isTile(t));

const activeSegments = () => state.tiles.filter((t) => t.category === 'segment' && t.status === 'active');
const cellClass = (n, typical) => `cov-cell ${n === 0 ? 'none' : n === 1 ? 'thin' : 'ok'} ${typical ? 'typical' : ''}`;

// Pain x segment map: how many solutions each pair has. Typical pairs (from the sales sheet) are bold.
function coverageMap() {
  const segs = activeSegments();
  const pains = state.tiles.filter((t) => t.category === 'pain');
  return h('div', { class: 'coverage-map' },
    h('h2', {}, 'Solutions per pain and segment'),
    h('p', { class: 'hint' }, 'How many solutions each pain has in each segment. Bold: the pain is typical for that segment in the sales sheet. Amber: one solution only. Pick a tile on the left to edit it.'),
    h('div', { class: 'cov-wrap' }, h('table', { class: 'cov' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Pain'), segs.map((s) => h('th', {}, s.label)))),
      h('tbody', {}, pains.map((p) => h('tr', {},
        h('td', {}, h('a', { href: `#/tiles/${encodeURIComponent(p.id)}` }, p.label)),
        segs.map((s) => {
          const n = solutionsFor(p.id, s.id).length;
          return h('td', { class: cellClass(n, (p.data?.typical_segments || []).includes(s.id)) }, n);
        })))))));
}

// For a pain tile: its solutions per active segment, and the segments where it is typical (editable).
function painCoverage(t, save) {
  let typical = [...(t.data?.typical_segments || [])];
  const segs = state.tiles.filter((x) => x.category === 'segment');
  const chips = h('div', { class: 'tt-chips' });
  const renderChips = () => chips.replaceChildren(...segs.map((s) => h('button', {
    class: `chip tile-chip segment toggle ${typical.includes(s.id) ? 'on' : ''}`,
    onclick: () => { typical = typical.includes(s.id) ? typical.filter((x) => x !== s.id) : [...typical, s.id]; renderChips(); save({ data: { typical_segments: typical } }); },
  }, s.label)));
  renderChips();
  return h('div', { class: 'pain-cov' },
    h('label', { class: 'f' }, 'Typical for (segments where clients report this pain)'), chips,
    h('label', { class: 'f' }, 'Solutions by segment'),
    h('div', { class: 'legend' },
      h('span', { class: 'lg ok' }, '2 or more solutions'), h('span', { class: 'lg thin' }, '1 solution'), h('span', { class: 'lg none' }, 'none yet')),
    h('div', { class: 'pc-grid' }, activeSegments().map((s) => {
      const list = solutionsFor(t.id, s.id);
      return h('div', { class: `pc-col ${list.length >= 2 ? 'ok' : list.length === 1 ? 'thin' : 'none'}` },
        h('b', {}, `${s.label} · ${list.length}`),
        list.length ? h('ul', {}, list.map((b) => h('li', {}, h('a', { href: `#/blocks/${encodeURIComponent(b.id)}` }, b.title))))
          : h('div', { class: 'hint' }, 'No solution yet'));
    })));
}

// What linked content means for each kind of tile (they are not all judged the same way).
const LINKED_HELP = {
  role: 'Every role gets the same base deck (above). Elements linked to this role match it on slides that answer the contact role, e.g. the "why" cards.',
  segment: 'Content linked to a segment goes only to clients in that segment. Content with no segment goes to every segment.',
  pain: 'Solutions and use cases linked to a pain are what makes an offer solve it. Cards and other blocks also rank higher for it.',
  product: 'Content linked to a product goes only to offers with that product, e.g. Vault package items never appear in a SaaS offer.',
};

// One line per tile in the list, measured the way that matters for its category.
function tileStatus(t) {
  if (t.status === 'soon') return t.category === 'role' ? 'no scenario yet' : 'not offered yet';
  if (t.category === 'role') {
    const n = pinnedTo(t.id).length;
    return `base deck · ${n ? `${n} elements rank higher` : 'no role-specific elements'}`;
  }
  if (t.category === 'pain') {
    return `solutions: ${activeSegments().map((s) => `${s.label.split(' ')[0]} ${solutionsFor(t.id, s.id).length}`).join(' · ')}`;
  }
  const n = pinnedTo(t.id).length;
  if (t.category === 'segment') return n ? `${n} items fit this segment` : 'only shared content';
  return n ? `${n} items only for this product` : 'uses the shared content';
}

// For a role tile: which scenario it opens and how long it is.
function roleScenario(t) {
  const sc = state.scenarios.find((s) => s.id === 'base') || state.scenarios.find((s) => s.id === t.id);
  return h('div', { class: 'role-sc' },
    h('label', { class: 'f' }, 'Slides'),
    sc ? h('div', {}, h('a', { href: `#/scenarios/${encodeURIComponent(sc.id)}` }, `${sc.name}: ${sc.steps.length} slides, the same for every role`),
      h('div', { class: 'hint' }, sc.steps.map((st) => st.label).join(' → ')))
      : h('div', { class: 'hint' }, 'No base deck yet.'));
}

export function viewTiles(selectedId) {
  const listEl = h('div', { class: 'items' });
  const showSoon = {};
  const editor = h('div', { class: 'editor' });
  const renderList = () => listEl.replaceChildren(...Object.entries(CATEGORY_LABELS).flatMap(([cat, title]) => [
    h('div', { class: 'group tl-group' }, h('span', {}, title),
      h('button', { class: 'icon', title: 'Add a tile', onclick: () => addTile(cat) }, '+')),
    ...state.tiles.filter((t) => t.category === cat && (t.status !== 'soon' || showSoon[cat] || t.id === selectedId)).map((t) => {
      return h('div', { class: `item ${t.id === selectedId ? 'active' : ''} ${t.status === 'soon' ? 'soon' : ''}`, onclick: () => go('tiles', t.id) },
        h('div', {}, t.label, t.status === 'soon' ? h('span', { class: 'badge muted' }, 'coming soon') : null),
        h('div', { class: 'sub wrap' }, tileStatus(t)));
    }),
    ...(() => {
      const n = state.tiles.filter((t) => t.category === cat && t.status === 'soon').length;
      return n ? [h('button', { class: 'soon-toggle list', onclick: () => { showSoon[cat] = !showSoon[cat]; renderList(); } },
        showSoon[cat] ? `Hide ${n} coming soon` : `Show ${n} coming soon`)] : [];
    })(),
  ]));
  const addTile = async (cat) => {
    const label = prompt(`Name of the new tile (${CATEGORY_LABELS[cat]}):`);
    if (!label?.trim()) return;
    try {
      const t = await api('POST', '/tiles', { category: cat, label: label.trim(), position: state.tiles.filter((x) => x.category === cat).length });
      await loadAll();
      go('tiles', t.id);
    } catch (e) { toast(e.message, true); }
  };
  ui.refresh = () => { renderList(); renderEditor(); };

  const renderEditor = () => {
    const t = state.tiles.find((x) => x.id === selectedId);
    if (!t) {
      editor.replaceChildren(coverageMap());
      return;
    }
    const status = h('span', { class: 'status' });
    const save = saver(status, (patch) => api('PATCH', `/tiles/${encodeURIComponent(t.id)}`, patch));
    const pinned = pinnedTo(t.id);
    const q = h('input', { placeholder: 'Search for a block or card to pin…' });
    const results = h('div', { class: 'pin-results' });
    const search = () => {
      const s = q.value.trim().toLowerCase();
      if (s.length < 2) return results.replaceChildren();
      const cands = [
        ...state.blocks.map((b) => ({ kind: 'block', item: b, text: `${b.title} ${b.body}` })),
        ...state.components.filter((c) => !c.missing).map((c) => ({ kind: 'card', item: c, text: `${c.title} ${c.description}` })),
      ].filter((x) => !x.item.tags.includes(t.id) && x.text.toLowerCase().includes(s)).slice(0, 12);
      results.replaceChildren(...cands.map((x) => h('button', { class: 'cand', onclick: async () => {
        try { await setTags(x, [...x.item.tags, t.id]); await loadAll(); renderList(); renderEditor(); toast('Pinned'); } catch (e) { toast(e.message, true); }
      } }, h('b', {}, plain(x.item.title)), h('span', { class: 'hint' }, x.kind === 'card' ? `card · ${x.item.set_name}` : x.item.type))));
    };
    q.addEventListener('input', search);

    editor.replaceChildren(h('div', { class: 'tile-editor' },
      h('div', { class: 'bar' }, h('h2', {}, t.label), status,
        h('button', { class: 'btn danger', onclick: async () => {
          if (!confirm(`Delete the tile "${t.label}"? Offers that use it will show it as deleted.`)) return;
          await api('DELETE', `/tiles/${encodeURIComponent(t.id)}`);
          await loadAll();
          go('tiles');
        } }, 'Delete')),
      h('div', { class: 'id' }, `${CATEGORY_LABELS[t.category]} · id: ${t.id}`),
      h('label', { class: 'f' }, 'Name'),
      h('input', { value: t.label, oninput: (e) => save({ label: e.target.value }) }),
      h('label', { class: 'f' }, 'Description (what this tile means, shown in the picker)'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ description: e.target.value }) }, t.description)),
      t.category === 'pain' ? [
        h('label', { class: 'f' }, 'Client quotes (one per line)'),
        autosize(h('textarea', { rows: 3, oninput: (e) => save({ quotes: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) }) }, (t.quotes || []).join('\n'))),
      ] : null,
      t.category === 'pain' ? painCoverage(t, save) : null,
      h('label', { class: 'f' }, 'Fits when (the AI model reads this to pick tiles; the salesperson sees it in New offer)'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ data: { pick_when: e.target.value } }) }, t.data?.pick_when || '')),
      h('label', { class: 'f' }, 'Not when'),
      autosize(h('textarea', { rows: 2, oninput: (e) => save({ data: { avoid_when: e.target.value } }) }, t.data?.avoid_when || '')),
      h('label', { class: 'f' }, 'Status'),
      h('select', { onchange: (e) => save({ status: e.target.value }) },
        h('option', { value: 'active', selected: t.status === 'active' }, 'active: can be selected in an offer'),
        h('option', { value: 'soon', selected: t.status === 'soon' }, 'coming soon: visible but cannot be selected')),
      t.category === 'product' ? [
        h('label', { class: 'f' }, 'Default price (goes into new offers with this product)'),
        h('input', { value: t.data?.price || '', placeholder: 'e.g. 12,000 PLN / month', oninput: (e) => save({ data: { price: e.target.value } }) }),
      ] : null,
      t.category === 'role' ? roleScenario(t) : null,
      h('h3', { class: 'sec' }, `Linked content (${pinned.length})`),
      h('p', { class: 'hint' }, LINKED_HELP[t.category]),
      h('div', { class: 'pinned' }, pinned.length ? pinned.map((x) => h('div', { class: 'pin' },
        h('span', { class: 'pin-type' }, x.kind === 'card' ? 'card' : x.item.type),
        h('a', { href: x.kind === 'block' ? `#/blocks/${encodeURIComponent(x.item.id)}` : `#/components/${encodeURIComponent(x.item.set_name)}` }, plain(x.item.title)),
        h('button', { class: 'icon', title: 'Unpin', onclick: async () => {
          try { await setTags(x, x.item.tags.filter((tag) => tag !== t.id)); await loadAll(); renderList(); renderEditor(); } catch (e) { toast(e.message, true); }
        } }, '×'))) : h('div', { class: 'hint' }, 'Nothing pinned yet.')),
      h('label', { class: 'f' }, 'Pin content'), q, results));
  };
  $('#view').replaceChildren(h('div', { class: 'col list' }, listEl), editor);
  renderList();
  renderEditor();
}

export { tileLabel };

// Linked solutions: what an element delivers. A solution's tiles count as the element's own when slides are
// highlighted for a client.
export function solutionLinker(current, onChange) {
  let ids = [...(current || [])];
  const root = h('div', { class: 'sol-linker' });
  const solutions = () => state.blocks.filter((b) => b.type === 'solution');
  const render = () => root.replaceChildren(
    h('div', { class: 'tt-chips' }, ids.length ? ids.map((id) => h('span', { class: 'chip tile-chip small sol' },
      state.blocks.find((b) => b.id === id)?.title || `${id} (deleted)`,
      h('button', { class: 'icon', title: 'Unlink', onclick: () => { ids = ids.filter((x) => x !== id); render(); onChange(ids); } }, '×')))
      : h('span', { class: 'hint' }, 'No solutions linked yet.')),
    h('select', { onchange: (e) => { if (e.target.value && !ids.includes(e.target.value)) { ids = [...ids, e.target.value]; render(); onChange(ids); } } },
      h('option', { value: '' }, '+ link a solution…'),
      solutions().filter((b) => !ids.includes(b.id)).map((b) => h('option', { value: b.id }, b.title))));
  render();
  return root;
}
