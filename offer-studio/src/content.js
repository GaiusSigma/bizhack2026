// Slide copy written for one client by a model (n8n): pure functions, no database access.
//
// A scenario step says which fields of its slide a model writes (`write`): a text field has a hint and a length
// limit; a list field (the slide's repeated cards, stored as "a | b | c" lines) has an item count and columns.
// contentContext() describes every writable field of an offer, with its current value, for the model's prompt;
// applyContent() validates the model's answer and turns it into slide patches.
import { HttpError } from './db.js';
import { productOk, score, segmentOk } from './generate.js';

// "a | b" lines -> [{title, value}] with the step's columns.
function parseLines(text, columns) {
  const keys = Object.keys(columns);
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const parts = l.split('|').map((x) => x.trim());
    return Object.fromEntries(keys.map((k, i) => [k, parts[i] ?? '']));
  });
}

// [{title, value}] -> "a | b" lines. A "|" or a line break inside a value would break the format.
// A column with `fixed` (e.g. a card's "From our call" label) always gets that text: the model never writes it.
const clean = (v) => String(v ?? '').replace(/\s*\|\s*/g, ' / ').replace(/\s*\n\s*/g, ' ').trim();
export const toLines = (items, columns) => items.map((it) => Object.entries(columns).map(([k, col]) => clean(col?.fixed ?? it[k])).join(' | ')).join('\n');

// The columns a model writes: every column except the fixed ones.
const writable = (columns) => Object.fromEntries(Object.entries(columns).filter(([, col]) => col?.fixed == null));

// Everything a model needs to write an offer's copy: per slide (in offer order) the fields it may write.
// `tiles` (id -> tile) names the reader (role tile) and the product: label, description and writing brief.
export function contentContext(offer, scenario, { tiles = {} } = {}) {
  const pick = (cat) => (offer.data?.tiles || []).find((t) => String(t).startsWith(`${cat}:`)) || '';
  const nameOf = (id) => tiles[id]?.label || id.slice(id.indexOf(':') + 1).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const about = (id) => ({ label: nameOf(id), description: tiles[id]?.description || '', brief: tiles[id]?.data?.writing_brief || '' });
  const role = pick('role');
  const product = pick('product');
  // a field's hint for this offer: the general hint, then what changes for the role (reader) and for the product
  const hintFor = (w) => [
    w.hint || '',
    w.hint_by_role?.[role] ? `For the ${nameOf(role)}: ${w.hint_by_role[role]}` : '',
    w.hint_by_product?.[product] ? `For ${nameOf(product)}: ${w.hint_by_product[product]}` : '',
  ].filter(Boolean).join(' ');
  const steps = Object.fromEntries((scenario?.steps || []).map((s) => [s.key, s]));
  const slides = [];
  for (const slide of [...offer.slides].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    const step = steps[slide.origin?.step];
    if (!step?.write) continue;
    const fields = {};
    for (const [key, w] of Object.entries(step.write)) {
      if (w.columns) {
        const cols = writable(w.columns);
        const current = parseLines(slide.data?.[key], w.columns).map((it) => Object.fromEntries(Object.keys(cols).map((k) => [k, it[k]])));
        fields[key] = { kind: 'list', hint: hintFor(w), min: w.min ?? 0, max: w.max ?? 6, columns: cols, current };
        // all columns, fixed ones included, for saving (not part of the JSON the model sees)
        Object.defineProperty(fields[key], 'allColumns', { value: w.columns, enumerable: false });
      } else {
        fields[key] = { kind: 'text', hint: hintFor(w), max: w.max ?? 200, current: String(slide.data?.[key] ?? '') };
      }
    }
    slides.push({
      step: step.key, slide_id: slide.id, label: step.label || step.key, hidden: !!slide.hidden,
      optional: !!step.optional, ...(slide.origin?.written_by ? { written_by: slide.origin.written_by } : {}), fields,
    });
  }
  const reader = role ? { role, ...about(role) } : null;
  return { offer_id: offer.id, client: offer.data?.client || '', tiles: offer.data?.tiles || [], reader, product: product ? { id: product, ...about(product) } : null, slides };
}

// A model's answer: { slides: { <step>: { <field>: text | [{title, value…}], hide?: true } } }.
// Returns { patches: {slide_id: {data, hidden?}}, problems: [] }; with `strict` a problem throws 400 listing them all.
export function applyContent(ctx, answer, { strict = true } = {}) {
  const slides = answer?.slides;
  if (!slides || typeof slides !== 'object' || Array.isArray(slides)) {
    throw new HttpError(400, 'Send "slides": { "<step>": { "<field>": "text" or [{ "title": "…", "value": "…" }], "hide": true? } }');
  }
  const byStep = Object.fromEntries(ctx.slides.map((s) => [s.step, s]));
  const problems = [];
  const patches = {};
  for (const [stepKey, fields] of Object.entries(slides)) {
    const slot = byStep[stepKey];
    if (!slot) { problems.push(`"${stepKey}": this offer has no slide with copy to write under that key (known: ${Object.keys(byStep).join(', ')})`); continue; }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) { problems.push(`"${stepKey}": expected an object of fields`); continue; }
    const data = {};
    let hide;
    for (const [key, value] of Object.entries(fields)) {
      const at = `${stepKey}.${key}`;
      if (key === 'hide') {
        if (!slot.optional && value) problems.push(`"${at}": only optional slides can be hidden (${ctx.slides.filter((s) => s.optional).map((s) => s.step).join(', ') || 'none in this offer'})`);
        else hide = !!value;
        continue;
      }
      const f = slot.fields[key];
      if (!f) { problems.push(`"${at}": not a field the model writes (fields: ${Object.keys(slot.fields).join(', ')})`); continue; }
      if (f.kind === 'text') {
        if (typeof value !== 'string') { problems.push(`"${at}": expected text`); continue; }
        const v = value.trim();
        if (v.length > f.max) problems.push(`"${at}": ${v.length} characters, at most ${f.max}`);
        data[key] = v;
        continue;
      }
      if (!Array.isArray(value)) { problems.push(`"${at}": expected a list of ${f.min}–${f.max} items`); continue; }
      if (value.length < f.min || value.length > f.max) problems.push(`"${at}": ${value.length} items, expected ${f.min}–${f.max}`);
      value.forEach((item, i) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) { problems.push(`"${at}[${i}]": expected an object with ${Object.keys(f.columns).join(', ')}`); return; }
        for (const k of Object.keys(item)) if (!f.columns[k]) problems.push(`"${at}[${i}].${k}": unknown column (columns: ${Object.keys(f.columns).join(', ')})`);
        for (const [k, col] of Object.entries(f.columns)) {
          const v = clean(item[k]);
          if (!v && k === 'title') problems.push(`"${at}[${i}].title": empty`);
          if (col.max && v.length > col.max) problems.push(`"${at}[${i}].${k}": ${v.length} characters, at most ${col.max}`);
        }
      });
      data[key] = toLines(value.slice(0, f.max).filter((it) => it && typeof it === 'object'), f.allColumns || f.columns);
    }
    const patch = { data };
    // An optional slide is shown once something is written on it, unless the model hides it.
    if (hide !== undefined) patch.hidden = hide;
    else if (slot.optional && Object.keys(data).length) patch.hidden = false;
    patches[slot.slide_id] = patch;
  }
  if (strict && problems.length) {
    throw new HttpError(400, `The copy was not saved. Fix these and send it again:\n- ${problems.join('\n- ')}`);
  }
  return { patches, problems };
}


// What the library knows about this client's situation, for the model writing the copy: per selected pain its
// description, typical quotes (from other clients, not this one), the solutions that fit the client's segment and
// product (best match first) and proof (differentiators, comparisons, pillars). With nothing for the segment, a general
// solution of the same pain from another segment (general: true, product still fits); with nothing at all, no_solution.
// Never another pain's solution.
export const SOLUTION_TYPES = ['solution', 'use_case'];
export const PROOF_TYPES = ['differentiator', 'comparison', 'pillar', 'testimonial'];
export const OBJECTION_TYPE = 'objection';
export const COMPETITOR_TYPE = 'competitor';
const PER_PAIN = 3;

export function evidencePack(sel, { tiles = {}, blocks = [] } = {}) {
  const about = (id) => ({ id, label: tiles[id]?.label || id, description: tiles[id]?.description || '' });
  const fitting = (types, pain, { anySegment = false } = {}) => blocks
    .map((b, i) => ({ b, i, ...score(b.tags, sel) }))
    .filter((x) => types.includes(x.b.type) && x.matched.includes(pain) && (anySegment || segmentOk(x.b.tags, sel)) && productOk(x.b.tags, sel))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, PER_PAIN)
    .map((x) => x.b);
  const solution = (b) => ({
    id: b.id, type: b.type, title: b.title, text: b.body || '',
    ...(b.data?.effect ? { effect: b.data.effect } : {}), ...(b.data?.value ? { value: b.data.value } : {}),
  });
  const proof = (b) => {
    const cmp = b.data?.them || b.data?.us ? `Others: ${b.data.them || '-'}. Gaius: ${b.data.us || '-'}` : '';
    // a testimonial is named only with the person's consent (data.quote_by_name); otherwise its body gives the role only
    const by = b.type === 'testimonial' && b.data?.quote_by_name && b.data?.author ? ` (${b.data.author})` : '';
    return { id: b.id, type: b.type, title: b.title, text: [`${b.body || ''}${by}`, cmp].filter(Boolean).join(' ') };
  };
  // Objections clients raise, with our answer for this product and segment (for the concerns, security and
  // comparison slides). Only the answers the library has; `no_answer` means none is confirmed.
  const objection = (b) => ({
    id: b.id, concern: b.title,
    answer: [b.data?.by_product?.[sel.product] || b.body, b.data?.by_segment?.[sel.segment]].filter(Boolean).join(' '),
    ...(b.data?.note ? { note: b.data.note } : {}),
    ...(b.data?.quotes?.length ? { typical_quotes: b.data.quotes } : {}),
    ...(b.data?.no_answer ? { no_answer: true } : {}),
  });
  // Other tools clients compare us with: the facts the library has, our side worded for this product.
  const tool = (b) => ({
    id: b.id, name: b.title, aliases: b.data?.aliases || [],
    facts: (b.data?.facts || []).map((f) => ({
      area: f.area, them: f.them, us: f.us_by_product?.[sel.product] || f.us || '',
      ...(f.their_strength ? { their_strength: true } : {}),
    })).filter((f) => f.them && f.us),
  });
  return {
    segment: about(sel.segment),
    product: about(sel.product),
    tools: blocks.filter((b) => b.type === COMPETITOR_TYPE && segmentOk(b.tags, sel)).map(tool),
    objections: blocks.filter((b) => b.type === OBJECTION_TYPE && segmentOk(b.tags, sel) && productOk(b.tags, sel)).map(objection),
    pains: sel.pains.map((id) => {
      let solutions = fitting(SOLUTION_TYPES, id).map(solution);
      // nothing for this segment: a general answer from another segment that still fits the product
      if (!solutions.length) solutions = fitting(SOLUTION_TYPES, id, { anySegment: true }).slice(0, 2).map((b) => ({ ...solution(b), general: true }));
      return {
        ...about(id), typical_quotes: tiles[id]?.quotes || [], solutions,
        proof: fitting(PROOF_TYPES, id).map(proof),
        ...(solutions.length ? {} : { no_solution: true }),
      };
    }),
  };
}

// The product name printed on the slides ({{offer.product_name}}). "Gaius-Lex" only for law firms: people outside
// the legal profession read "Lex" as not meant for them, so other teams see "Gaius". Vault keeps its name.
export function productName(tiles = []) {
  const product = tiles.find((t) => String(t).startsWith('product:'));
  if (product === 'product:vault' || product === 'product:on-prem') return 'Gaius Vault';
  if (product === 'product:saas') return tiles.includes('segment:law-firm') ? 'Gaius-Lex' : 'Gaius';
  return 'Gaius';
}
