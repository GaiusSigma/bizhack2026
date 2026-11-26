// Lessons: what the sales team teaches the model, in their own words.
//
// A lesson is one rule ("For public offices, call the decision makers 'the management', never 'the board'"),
// optionally with the correction that taught it (what the model wrote, what the salesperson changed it to).
// Two kinds, one for each place the model decides:
//   plan – choosing the tiles from the enquiry (role, segment, product, pains). n8n reads them with
//          GET /api/lessons?kind=plan and puts them into the planning prompt. `tiles` says which tiles it is about.
//   copy – writing the slides. GET /api/offers/:id/content returns the ones that apply to the offer: every tile in
//          the lesson's `tiles` is on the offer (none = every offer), and `step` limits it to one slide.
// Where lessons come from: the offer view lists what the team changed after the model (corrections, below) and
// turns any of them into a lesson draft. The model never edits lessons; people do.
// Nothing is retrained: lessons are context the model reads on every run, so a lesson works from the next offer,
// switching it off stops it at once, and every offer records which lessons it was written with.
import { HttpError } from './db.js';

export const LESSON_KINDS = ['plan', 'copy'];
const MAX_TEXT = 600;
const MAX_EXAMPLE = 1200;

const str = (v, max) => String(v ?? '').trim().slice(0, max);

// Request body -> lesson fields (PATCH: only the fields that were sent). Unknown tiles are refused.
export function lessonInput(b, { tiles = [], partial = false } = {}) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'Expected a JSON object');
  const out = {};
  if (!partial || 'kind' in b) {
    if (!LESSON_KINDS.includes(b.kind)) throw new HttpError(400, `"kind": ${LESSON_KINDS.join(' or ')} (plan: choosing tiles, copy: writing slides)`);
    out.kind = b.kind;
  }
  if (!partial || 'text' in b) {
    const text = str(b.text, MAX_TEXT + 1);
    if (!text) throw new HttpError(400, '"text": the rule, in one or two sentences');
    if (text.length > MAX_TEXT) throw new HttpError(400, `"text": at most ${MAX_TEXT} characters`);
    out.text = text;
  }
  if ('tiles' in b) {
    if (!Array.isArray(b.tiles)) throw new HttpError(400, '"tiles": a list of tile ids');
    const known = new Set(tiles.map((t) => t.id));
    const bad = b.tiles.filter((id) => !known.has(id));
    if (bad.length) throw new HttpError(400, `"tiles": unknown tiles ${bad.join(', ')}`);
    out.tiles = [...new Set(b.tiles)];
  }
  if ('step' in b) out.step = str(b.step, 80);
  if ('example' in b) {
    const e = b.example && typeof b.example === 'object' ? b.example : {};
    out.example = Object.fromEntries(['field', 'before', 'after', 'quote'].filter((k) => e[k]).map((k) => [k, str(e[k], MAX_EXAMPLE)]));
  }
  if ('offer_id' in b) out.offer_id = b.offer_id ? str(b.offer_id, 80) : null;
  if ('author' in b) out.author = str(b.author, 80);
  if ('active' in b) out.active = !!b.active;
  return out;
}

// Active lessons that apply: plan lessons always, copy lessons when the offer has all of the lesson's tiles
// (and, with `step`, the lesson is for that slide or for the whole deck). Oldest first, so the order is stable.
export function lessonsFor(all, { kind, tiles = null, step = null } = {}) {
  const have = tiles ? new Set(tiles) : null;
  return all
    .filter((l) => l.active && (!kind || l.kind === kind))
    .filter((l) => l.kind !== 'copy' || !have || (l.tiles || []).every((t) => have.has(t)))
    .filter((l) => !step || !l.step || l.step === step)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

// How many offers were made with each lesson (the offer keeps the ids in data.lessons_used).
export function lessonUse(offers) {
  const used = {};
  for (const o of offers) {
    for (const id of new Set(o.data?.lessons_used || [])) {
      const u = (used[id] ||= { offers: 0, last: null });
      u.offers++;
      if (!u.last || o.created_at > u.last) u.last = o.created_at;
    }
  }
  return used;
}

// What the team changed after the model, on one offer:
//   tiles  – the model's tiles (data.first_tiles, offers made by n8n) against the tiles now;
//   fields – every field the model wrote (slide origin.ai_data) whose text is different now.
// `fieldLabel` turns field keys into names for people.
export function correctionsFor(offer, { fieldLabel = (k) => k } = {}) {
  const d = offer.data || {};
  let tiles = null;
  if (d.made_by && Array.isArray(d.first_tiles) && Array.isArray(d.tiles)) {
    const first = new Set(d.first_tiles);
    const now = new Set(d.tiles);
    const added = d.tiles.filter((t) => !first.has(t));
    const removed = d.first_tiles.filter((t) => !now.has(t));
    if (added.length || removed.length) tiles = { model: d.first_tiles, now: d.tiles, added, removed };
  }
  const fields = [];
  for (const s of offer.slides || []) {
    const ai = s.origin?.ai_data;
    if (!ai) continue;
    for (const [field, before] of Object.entries(ai)) {
      const after = String(s.data?.[field] ?? '');
      if (after.trim() === String(before).trim()) continue;
      fields.push({ slide_id: s.id, step: s.origin.step || '', step_label: s.origin.label || s.frame, field, field_label: fieldLabel(field), model: String(before), now: after });
    }
  }
  return { tiles, fields, count: fields.length + (tiles ? 1 : 0) };
}

// A lesson draft from one correction: kind, scope, the example, and a sentence for the salesperson to finish.
// The sentence is a start, not the rule: only a person knows why they changed it.
export function draftFromCorrection(offer, c, { tileLabel = (id) => id } = {}) {
  const tiles = offer.data?.tiles || [];
  const segment = tiles.find((t) => t.startsWith('segment:'));
  if (c.kind === 'tiles' || c.added) {
    const list = (ids) => ids.map(tileLabel).join(', ');
    return {
      kind: 'plan',
      tiles: [...new Set([...c.added, ...c.removed])],
      text: `${c.added.length ? `Choose ${list(c.added)}` : ''}${c.added.length && c.removed.length ? ', not ' : c.removed.length ? 'Do not choose ' : ''}${c.removed.length ? list(c.removed) : ''} when `,
      example: { before: list(c.model), after: list(c.now), ...(offer.data?.enquiry ? { quote: String(offer.data.enquiry).slice(0, 600) } : {}) },
      offer_id: offer.id,
    };
  }
  return {
    kind: 'copy',
    tiles: segment ? [segment] : [],
    step: c.step,
    text: `${c.step_label} · ${c.field_label}: `,
    example: { field: `${c.step}.${c.field}`, before: c.model, after: c.now },
    offer_id: offer.id,
  };
}
