// Offer generator from tiles: pure functions, no database access.
//
// Input: selected tiles (role, segment, product, pains), the role's scenario and content tagged with tiles
// (block and card tags). Output: concrete slides (frame, data, block_ids, picks) recording which tiles
// picked each block (`origin.matched`), plus pain coverage and a recompute plan.
// The same tiles always give the same result: ties are broken by input order.
import { HttpError } from './db.js';

export const WEIGHTS = { pain: 3, segment: 2, role: 1, product: 1 };
// Block types that count towards "X of Y pains solved".
export const COVERAGE_TYPES = ['solution', 'use_case'];
const MAX_PAINS = 5;

const categoryOf = (id) => String(id).split(':')[0];

// Tile ids -> { role, segment, product, pains }. 400 errors name the tile.
export function parseSelection(tileIds, allTiles) {
  const byId = new Map(allTiles.map((t) => [t.id, t]));
  const ids = [...new Set(tileIds || [])];
  for (const id of ids) {
    const t = byId.get(id);
    if (!t) throw new HttpError(400, `No tile "${id}"`);
    if (t.status === 'soon') throw new HttpError(400, `The tile "${t.label || id}" is marked as coming soon and cannot be selected yet`);
  }
  const of = (cat) => ids.filter((id) => byId.get(id).category === cat);
  const one = (cat, msg) => {
    const found = of(cat);
    if (found.length !== 1) throw new HttpError(400, msg);
    return found[0];
  };
  const role = one('role', 'Select exactly one contact role');
  const segment = one('segment', 'Select exactly one segment');
  const product = one('product', 'Select exactly one product');
  const pains = of('pain');
  if (pains.length < 1 || pains.length > MAX_PAINS) throw new HttpError(400, `Select 1 to ${MAX_PAINS} client pains`);
  return { role, segment, product, pains };
}

const selected = (sel) => new Set([sel.role, sel.segment, sel.product, ...sel.pains]);

// Sum of the weights of selected tiles found in `tags`. Other tags (plain tags, deleted tiles) add nothing.
export function score(tags, sel) {
  const chosen = selected(sel);
  const matched = [];
  let total = 0;
  for (const t of new Set(tags || [])) {
    if (!chosen.has(t)) continue;
    matched.push(t);
    total += WEIGHTS[categoryOf(t)] || 0;
  }
  return { score: total, matched };
}

// Content tagged with segments fits only the selected segment; content without segments always fits.
export function segmentOk(tags, sel) {
  const segs = (tags || []).filter((t) => categoryOf(t) === 'segment');
  return !segs.length || segs.includes(sel.segment);
}

// Candidates sorted by score (descending), ties in input order.
const ranked = (items, sel) =>
  items
    .map((item, i) => ({ item, i, ...score(item.tags, sel) }))
    .filter((x) => segmentOk(x.item.tags, sel))
    .sort((a, b) => b.score - a.score || a.i - b.i);

// First every selected pain (in selection order) gets its best-scoring block, so a pain with content is never
// left unsolved because other pains' blocks score higher; the remaining slots go by score. Up to `max` blocks,
// shown on the slide by score.
export function pickBlocks(candidates, fill, sel) {
  const r = ranked(candidates, sel);
  const scored = r.filter((x) => x.score > 0);
  const hits = [];
  for (const p of sel.pains) {
    if (hits.length >= fill.max) break;
    if (hits.some((x) => x.matched.includes(p))) continue;
    const best = scored.find((x) => !hits.includes(x) && x.matched.includes(p));
    if (best) hits.push(best);
  }
  for (const x of scored) {
    if (hits.length >= fill.max) break;
    if (!hits.includes(x)) hits.push(x);
  }
  hits.sort((a, b) => b.score - a.score || a.i - b.i);
  const zeros = r.filter((x) => x.score === 0).slice(0, Math.max(0, (fill.min || 0) - hits.length));
  return [...hits, ...zeros].map((x) => ({ id: x.item.id, matched: x.matched }));
}

// Set cards: at most one per topic, the `slots` topics with the highest score. The first ranked topic that has
// a "highlight" variant gets it; the rest get "regular"; "stat" only for a topic without a regular card.
export function pickCards(components, slots, sel) {
  const topics = new Map();
  for (const c of components) {
    if (c.missing) continue;
    const key = c.topic || c.id;
    if (!topics.has(key)) topics.set(key, { key, tags: new Set(), variants: {} });
    const t = topics.get(key);
    for (const tag of c.tags || []) t.tags.add(tag);
    t.variants[c.variant || 'regular'] ??= c;
  }
  const top = ranked([...topics.values()].map((t) => ({ ...t, tags: [...t.tags] })), sel).slice(0, slots);
  let highlighted = false;
  return top.map(({ item, matched }) => {
    const v = item.variants;
    let c;
    if (!highlighted && v.highlight) { c = v.highlight; highlighted = true; } else c = v.regular || v.stat || Object.values(v)[0];
    return { component: c.id, matched };
  });
}

export const stepApplies = (step, sel) => !step.when?.any?.length || step.when.any.some((t) => selected(sel).has(t));

export const stepData = (step, sel) => ({ ...(step.data || {}), ...(step.data_by_product?.[sel.product] || {}) });

// Offer slides from the scenario steps. `data.blocks` in the order that should break ties.
export function buildSlides(scenario, sel, { blocks = [], components = [], slots = {} } = {}) {
  const out = [];
  for (const step of scenario.steps || []) {
    if (!stepApplies(step, sel)) continue;
    const fill = step.fill || { kind: 'none' };
    let block_ids = [];
    let picks = {};
    const matched = {};
    if (fill.kind === 'pains') {
      block_ids = [...sel.pains];
      for (const p of sel.pains) matched[p] = [p];
    } else if (fill.kind === 'blocks') {
      for (const x of pickBlocks(blocks.filter((b) => b.type === fill.type), fill, sel)) {
        block_ids.push(x.id);
        matched[x.id] = x.matched;
      }
    } else if (fill.kind === 'picks') {
      const chosen = pickCards(components.filter((c) => c.set_name === fill.set), slots[fill.set] ?? 6, sel);
      picks = { [fill.set]: chosen.map((x) => ({ component: x.component })) };
      for (const x of chosen) matched[x.component] = x.matched;
    }
    out.push({
      frame: step.frame,
      data: stepData(step, sel),
      block_ids,
      picks,
      hidden: false,
      locked: false,
      origin: { step: step.key, label: step.label || step.key, matched },
    });
  }
  return out;
}

// A pain is covered when a visible slide has a block of a COVERAGE_TYPES type tagged with it.
export function coverage(slides, pains, blocksById) {
  const hit = new Set();
  for (const s of slides) {
    if (s.hidden) continue;
    for (const id of s.block_ids || []) {
      const b = blocksById[id];
      if (!b || !COVERAGE_TYPES.includes(b.type)) continue;
      for (const t of b.tags || []) hit.add(t);
    }
  }
  return { covered: pains.filter((p) => hit.has(p)), missing: pains.filter((p) => !hit.has(p)) };
}

// JSON with sorted keys: compares slide content regardless of key order.
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
    : JSON.stringify(v ?? null));
const content = (s) => stable({ frame: s.frame, data: s.data || {}, block_ids: s.block_ids || [], picks: s.picks || {}, origin: s.origin || null });

// Recompute plan for an offer: existing slides (with ids, in current order) versus freshly built ones.
// - an automatic (unlocked) slide with the same content stays; a different one is replaced (remove + create);
// - a locked slide stays unchanged; if its step no longer applies, it is hidden (origin.auto_hidden),
//   and when the step applies again it is shown again (a slide hidden by hand stays hidden);
// - a slide added by hand (no origin.step) stays;
// - order follows the scenario, and slides outside it stay right after their former predecessor.
export function mergeRecompute(existing, fresh) {
  const sorted = [...existing].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const freshByStep = new Map(fresh.map((s, i) => [s.origin.step, i]));
  const keep = [];
  const remove = [];
  const hide = [];
  const unhide = []; // hidden by recompute (origin.auto_hidden) whose step applies again
  const claimed = new Map(); // step -> id of the slide that holds it
  const orphans = [];

  for (const s of sorted) {
    const step = s.origin?.step;
    const has = step != null && freshByStep.has(step);
    if (s.locked || step == null) {
      keep.push(s);
      if (has && !claimed.has(step)) {
        claimed.set(step, s.id);
        if (s.hidden && s.origin?.auto_hidden) unhide.push(s.id);
      } else {
        orphans.push(s);
        if (step != null && !s.hidden) hide.push(s.id); // a manual slide (no step) is never hidden
      }
    } else if (has && !claimed.has(step) && content(s) === content(fresh[freshByStep.get(step)])) {
      keep.push(s);
      claimed.set(step, s.id);
    } else remove.push(s.id);
  }

  const create = [];
  const order = fresh.map((f, i) => {
    const id = claimed.get(f.origin.step);
    if (id) return id;
    create.push(f);
    return { create: create.length - 1 };
  });
  // Manual and hidden slides: right after the nearest earlier slide that has a place in the new order
  // (itself or through the step that replaced it).
  const tokenOf = (s) => {
    const at = order.findIndex((x) => x === s.id);
    if (at >= 0) return order[at];
    const step = s.origin?.step;
    if (step != null && freshByStep.has(step)) {
      const i = freshByStep.get(step);
      return order[i];
    }
    return null;
  };
  for (const o of orphans) {
    const idx = sorted.findIndex((s) => s.id === o.id);
    let pos = 0;
    for (let j = idx - 1; j >= 0; j--) {
      const tok = tokenOf(sorted[j]);
      if (tok != null) { pos = order.indexOf(tok) + 1; break; }
    }
    order.splice(pos, 0, o.id);
  }
  return { keep, create, remove, hide, unhide, order };
}
