// Editors for the library blocks that came from the sales sheet and have a structure of their own:
// objections with our answers, facts about other tools (comparison slide) and testimonials.
// Each editor keeps a local copy of block.data and always saves it whole, so quick edits in several
// fields are not lost to the debounced save.
import { autosize, h } from '../lib.js';

export const LIBRARY_TYPE_LABELS = {
  objection: 'Objections and our answers',
  competitor: 'Other tools (facts for the comparison slide)',
  testimonial: 'Testimonials',
};

const PRODUCTS = [['product:saas', 'Gaius in the cloud (SaaS)'], ['product:vault', 'Gaius Vault'], ['product:on-prem', 'Vault on-premise']];
const SLIDE_MAX = 60; // a comparison cell on the slide

const toLines = (arr) => (arr || []).join('\n');
const fromLines = (s) => String(s).split('\n').map((x) => x.trim()).filter(Boolean);

// A labelled text field (one line: an input, more: a textarea); with `max`, a live character count that turns amber past the limit.
function field(label, hint, value, onInput, { rows = 2, max } = {}) {
  const count = max ? h('div', { class: 'hint' }) : null;
  const show = (v) => {
    if (!count) return;
    count.textContent = v ? `${v.length}/${max} characters` : '';
    count.className = v.length > max ? 'hint warn' : 'hint';
  };
  const oninput = (e) => { show(e.target.value); onInput(e.target.value); };
  const ta = rows === 1 ? h('input', { value: value || '', oninput }) : autosize(h('textarea', { rows, oninput }, value || ''));
  show(value || '');
  return [h('label', { class: 'f' }, label), hint ? h('div', { class: 'hint' }, hint) : null, ta, count];
}

const source = (d) => (d.source ? h('div', { class: 'hint source' }, `Source: ${d.source}`) : null);

function objectionFields(block, put) {
  const d = structuredClone(block.data || {});
  const keep = () => put({ data: d });
  const setIn = (key, id, v) => {
    d[key] = { ...(d[key] || {}), [id]: v };
    if (!v.trim()) delete d[key][id];
    keep();
  };
  return [
    source(d),
    h('div', { class: 'hint' }, 'Title: the objection as clients put it. The model uses this only when the client raises the objection, and answers it with the text below. It never adds an objection the client did not raise.'),
    field('What clients said (one quote per line)', 'Real words from calls: a hint for the writer, never attributed to this client.', toLines(d.quotes), (v) => { d.quotes = fromLines(v); keep(); }),
    field('Our answer (default)', 'Used for every product that has no answer of its own below.', block.body, (v) => put({ body: v }), { rows: 3 }),
    PRODUCTS.map(([id, label]) => field(`Answer for ${label}`, 'Empty: the default answer is used.', d.by_product?.[id], (v) => setIn('by_product', id, v))),
    field('Added for the public sector', 'Appended to the answer in offers for public bodies.', d.by_segment?.['segment:public-sector'], (v) => setIn('by_segment', 'segment:public-sector', v)),
    field('Note for the writer', 'What not to promise or name.', d.note, (v) => { d.note = v; keep(); }),
    h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !!d.no_answer, onchange: (e) => { d.no_answer = e.target.checked; keep(); } }),
      ' No confirmed answer yet: the writer must not promise more than the default answer'),
  ];
}

function competitorFields(block, put) {
  const d = structuredClone(block.data || {});
  d.facts ||= [];
  const keep = () => put({ data: d });
  const list = h('div', {});
  const render = () => list.replaceChildren(...d.facts.map((f, i) => h('div', { class: 'lib-row' },
    h('div', { class: 'bar' },
      h('strong', {}, `Row ${i + 1}${f.area ? `: ${f.area}` : ''}`),
      h('button', { class: 'btn danger', onclick: () => { d.facts.splice(i, 1); keep(); render(); } }, 'Remove')),
    f.source ? h('div', { class: 'hint source' }, `Source: ${f.source}`) : null,
    field('Area (first column)', null, f.area, (v) => { f.area = v; keep(); }, { rows: 1, max: 25 }),
    field(`${block.title || 'The tool'} (copied to the slide word for word)`, null, f.them, (v) => { f.them = v; keep(); }, { rows: 1, max: SLIDE_MAX }),
    field('Gaius (default)', null, f.us, (v) => { f.us = v; if (!v.trim()) delete f.us; keep(); }, { rows: 1, max: SLIDE_MAX }),
    PRODUCTS.map(([id, label]) => field(`Gaius, in a ${label} offer`, 'Empty: the default is used.', f.us_by_product?.[id], (v) => {
      f.us_by_product = { ...(f.us_by_product || {}), [id]: v };
      if (!v.trim()) delete f.us_by_product[id];
      keep();
    }, { rows: 1, max: SLIDE_MAX })),
    h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !!f.their_strength, onchange: (e) => { f.their_strength = e.target.checked; keep(); } }),
      ' The tool is ahead here: use this row only when the client raised it'),
  )));
  render();
  return [
    source(d),
    h('div', { class: 'hint' }, 'Title: the tool name. When a client mentions this tool, the comparison slide uses only these rows: the tool side word for word, our side for the offered product. n8n rejects any other claim about the tool.'),
    field('Recognised as (comma-separated, Polish forms too)', 'How the tool may appear in a call or an email, e.g. Copilota, ChatGPT-a.', (d.aliases || []).join(', '), (v) => { d.aliases = v.split(',').map((x) => x.trim()).filter(Boolean); keep(); }, { rows: 1 }),
    h('label', { class: 'f' }, 'Rows'),
    list,
    h('button', { class: 'btn', onclick: () => { d.facts.push({ area: '', them: '', us: '' }); keep(); render(); } }, '+ Add a row'),
  ];
}

function testimonialFields(block, put) {
  const d = structuredClone(block.data || {});
  const keep = () => put({ data: d });
  return [
    source(d),
    h('div', { class: 'hint' }, 'Shown to the writer as proof for the pains this block is pinned to. In the deck it is attributed by role only, unless the person agreed to be named.'),
    field('Quote as it may appear in the deck (with the role in brackets)', null, block.body, (v) => put({ body: v }), { rows: 4 }),
    field('Who said it (internal, not sent to the model)', null, d.author, (v) => { d.author = v; keep(); }, { rows: 1 }),
    h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !!d.quote_by_name, onchange: (e) => { d.quote_by_name = e.target.checked; keep(); } }),
      ' The person agreed to be quoted by name'),
  ];
}

export const LIBRARY_EDITORS = { objection: objectionFields, competitor: competitorFields, testimonial: testimonialFields };
