// Tiles: role, segment, pain, product. This is where a tile is described (name, description, quotes, status)
// and content is pinned to it (knowledge blocks and cards) that the generator builds offers from.
import { $, CATEGORY_LABELS, api, autosize, go, h, loadAll, saver, state, tileLabel, toast, ui } from '../lib.js';

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

export function viewTiles(selectedId) {
  const listEl = h('div', { class: 'items' });
  const editor = h('div', { class: 'editor' });
  const renderList = () => listEl.replaceChildren(...Object.entries(CATEGORY_LABELS).flatMap(([cat, title]) => [
    h('div', { class: 'group tl-group' }, h('span', {}, title),
      h('button', { class: 'icon', title: 'Add a tile', onclick: () => addTile(cat) }, '+')),
    ...state.tiles.filter((t) => t.category === cat).map((t) => {
      const n = pinnedTo(t.id).length;
      return h('div', { class: `item ${t.id === selectedId ? 'active' : ''} ${t.status === 'soon' ? 'soon' : ''}`, onclick: () => go('tiles', t.id) },
        h('div', {}, t.label, t.status === 'soon' ? h('span', { class: 'badge muted' }, 'coming soon') : null),
        h('div', { class: 'sub' }, n ? `pinned: ${n}` : (cat === 'pain' ? 'no content: offers won\'t solve this pain' : 'nothing pinned')));
    }),
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
      editor.replaceChildren(h('div', { class: 'empty' }, 'Pick a tile. Tiles describe the client in a new offer, and the content pinned to them goes into the deck.'));
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
      h('label', { class: 'f' }, 'Client quotes (one per line)'),
      autosize(h('textarea', { rows: 3, oninput: (e) => save({ quotes: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) }) }, (t.quotes || []).join('\n'))),
      h('label', { class: 'f' }, 'Status'),
      h('select', { onchange: (e) => save({ status: e.target.value }) },
        h('option', { value: 'active', selected: t.status === 'active' }, 'active: can be selected in an offer'),
        h('option', { value: 'soon', selected: t.status === 'soon' }, 'coming soon: visible but cannot be selected')),
      t.category === 'product' ? [
        h('label', { class: 'f' }, 'Default price (goes into new offers with this product)'),
        h('input', { value: t.data?.price || '', placeholder: 'e.g. 12,000 PLN / month', oninput: (e) => save({ data: { price: e.target.value } }) }),
      ] : null,
      h('h3', { class: 'sec' }, `Pinned content (${pinned.length})`),
      h('p', { class: 'hint' }, t.category === 'pain'
        ? 'Solutions and use cases pinned to a pain make offers solve it. Cards and other blocks help with picking.'
        : 'Content pinned to a tile gets priority when the client has that tile.'),
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
