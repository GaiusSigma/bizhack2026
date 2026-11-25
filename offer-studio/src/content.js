// Slide copy written for one client by a model (n8n): pure functions, no database access.
//
// A scenario step says which fields of its slide a model writes (`write`): a text field has a hint and a length
// limit; a list field (the slide's repeated cards, stored as "a | b | c" lines) has an item count and columns.
// contentContext() describes every writable field of an offer, with its current value, for the model's prompt;
// applyContent() validates the model's answer and turns it into slide patches.
import { HttpError } from './db.js';

// "a | b" lines -> [{title, value}] with the step's columns.
function parseLines(text, columns) {
  const keys = Object.keys(columns);
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const parts = l.split('|').map((x) => x.trim());
    return Object.fromEntries(keys.map((k, i) => [k, parts[i] ?? '']));
  });
}

// [{title, value}] -> "a | b" lines. A "|" or a line break inside a value would break the format.
const clean = (v) => String(v ?? '').replace(/\s*\|\s*/g, ' / ').replace(/\s*\n\s*/g, ' ').trim();
export const toLines = (items, columns) => items.map((it) => Object.keys(columns).map((k) => clean(it[k])).join(' | ')).join('\n');

// Everything a model needs to write an offer's copy: per slide (in offer order) the fields it may write.
// `tiles` (id -> tile) names the reader: the role tile's label, description and writing brief.
export function contentContext(offer, scenario, { tiles = {} } = {}) {
  const role = (offer.data?.tiles || []).find((t) => String(t).startsWith('role:')) || '';
  const roleTile = tiles[role];
  const roleLabel = roleTile?.label || role.slice(5).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  // a field's hint for this reader: the general hint plus what changes for the role
  const hintFor = (w) => [w.hint || '', w.hint_by_role?.[role] ? `For the ${roleLabel}: ${w.hint_by_role[role]}` : ''].filter(Boolean).join(' ');
  const steps = Object.fromEntries((scenario?.steps || []).map((s) => [s.key, s]));
  const slides = [];
  for (const slide of [...offer.slides].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    const step = steps[slide.origin?.step];
    if (!step?.write) continue;
    const fields = {};
    for (const [key, w] of Object.entries(step.write)) {
      fields[key] = w.columns
        ? { kind: 'list', hint: hintFor(w), min: w.min ?? 0, max: w.max ?? 6, columns: w.columns, current: parseLines(slide.data?.[key], w.columns) }
        : { kind: 'text', hint: hintFor(w), max: w.max ?? 200, current: String(slide.data?.[key] ?? '') };
    }
    slides.push({
      step: step.key, slide_id: slide.id, label: step.label || step.key, hidden: !!slide.hidden,
      optional: !!step.optional, ...(slide.origin?.written_by ? { written_by: slide.origin.written_by } : {}), fields,
    });
  }
  const reader = role ? { role, label: roleLabel, description: roleTile?.description || '', brief: roleTile?.data?.writing_brief || '' } : null;
  return { offer_id: offer.id, client: offer.data?.client || '', tiles: offer.data?.tiles || [], reader, slides };
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
      data[key] = toLines(value.slice(0, f.max).filter((it) => it && typeof it === 'object'), f.columns);
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

