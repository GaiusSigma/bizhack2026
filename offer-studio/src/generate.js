// Generator oferty z kafelków: czyste funkcje, bez dostępu do bazy.
//
// Wejście: wybrane kafelki (rola, segment, produkt, bóle), scenariusz roli i treść oznaczona kafelkami
// (tagi bloków i kart). Wyjście: konkretne slajdy (frame, data, block_ids, picks) z zapisem, które
// kafelki wybrały każdy blok (`origin.matched`), plus pokrycie bólów i plan przeliczenia.
// Te same kafelki zawsze dają ten sam wynik: przy remisie decyduje kolejność wejściowa.
import { HttpError } from './db.js';

export const WEIGHTS = { bol: 3, segment: 2, rola: 1, produkt: 1 };
// Typy bloków, które liczą się do „rozwiązane X z Y bólów”.
export const COVERAGE_TYPES = ['rozwiazanie', 'use_case'];
const MAX_PAINS = 5;

const categoryOf = (id) => String(id).split(':')[0];

// Lista id kafelków -> { role, segment, product, pains }. Błędy 400 po polsku, z nazwą kafelka.
export function parseSelection(tileIds, allTiles) {
  const byId = new Map(allTiles.map((t) => [t.id, t]));
  const ids = [...new Set(tileIds || [])];
  for (const id of ids) {
    const t = byId.get(id);
    if (!t) throw new HttpError(400, `Nie ma kafelka „${id}”`);
    if (t.status === 'soon') throw new HttpError(400, `Kafelek „${t.label || id}” jest oznaczony jako wkrótce i nie można go jeszcze wybrać`);
  }
  const of = (cat) => ids.filter((id) => byId.get(id).category === cat);
  const one = (cat, msg) => {
    const found = of(cat);
    if (found.length !== 1) throw new HttpError(400, msg);
    return found[0];
  };
  const role = one('rola', 'Wybierz dokładnie jedną rolę rozmówcy');
  const segment = one('segment', 'Wybierz dokładnie jeden segment');
  const product = one('produkt', 'Wybierz dokładnie jeden produkt');
  const pains = of('bol');
  if (pains.length < 1 || pains.length > MAX_PAINS) throw new HttpError(400, `Wybierz od 1 do ${MAX_PAINS} bólów klienta`);
  return { role, segment, product, pains };
}

const selected = (sel) => new Set([sel.role, sel.segment, sel.product, ...sel.pains]);

// Suma wag kafelków z `tags`, które są wybrane. Inne tagi (zwykłe, usunięte kafelki) nic nie dają.
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

// Treść oznaczona segmentami pasuje tylko do wybranego segmentu; bez segmentów pasuje zawsze.
export function segmentOk(tags, sel) {
  const segs = (tags || []).filter((t) => categoryOf(t) === 'segment');
  return !segs.length || segs.includes(sel.segment);
}

// Kandydaci posortowani po wyniku (malejąco), przy remisie w kolejności wejściowej.
const ranked = (items, sel) =>
  items
    .map((item, i) => ({ item, i, ...score(item.tags, sel) }))
    .filter((x) => segmentOk(x.item.tags, sel))
    .sort((a, b) => b.score - a.score || a.i - b.i);

export function pickBlocks(candidates, fill, sel) {
  const r = ranked(candidates, sel);
  const hits = r.filter((x) => x.score > 0).slice(0, fill.max);
  const zeros = r.filter((x) => x.score === 0).slice(0, Math.max(0, (fill.min || 0) - hits.length));
  return [...hits, ...zeros].map((x) => ({ id: x.item.id, matched: x.matched }));
}

// Karty zestawu: najwyżej jedna na temat, `slots` tematów z najwyższym wynikiem. Pierwszy temat w rankingu,
// który ma wariant „wyroznienie”, dostaje go; reszta wariant „zwykla”; „liczba” tylko dla tematu bez zwykłej.
export function pickCards(components, slots, sel) {
  const topics = new Map();
  for (const c of components) {
    if (c.missing) continue;
    const key = c.topic || c.id;
    if (!topics.has(key)) topics.set(key, { key, tags: new Set(), variants: {} });
    const t = topics.get(key);
    for (const tag of c.tags || []) t.tags.add(tag);
    t.variants[c.variant || 'zwykla'] ??= c;
  }
  const top = ranked([...topics.values()].map((t) => ({ ...t, tags: [...t.tags] })), sel).slice(0, slots);
  let highlighted = false;
  return top.map(({ item, matched }) => {
    const v = item.variants;
    let c;
    if (!highlighted && v.wyroznienie) { c = v.wyroznienie; highlighted = true; } else c = v.zwykla || v.liczba || Object.values(v)[0];
    return { component: c.id, matched };
  });
}

export const stepApplies = (step, sel) => !step.when?.any?.length || step.when.any.some((t) => selected(sel).has(t));

export const stepData = (step, sel) => ({ ...(step.data || {}), ...(step.data_by_product?.[sel.product] || {}) });

// Slajdy oferty z kroków scenariusza. `data.blocks` w kolejności, w jakiej mają rozstrzygać remisy.
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

// Ból jest pokryty, jeśli na widocznym slajdzie jest blok typu z COVERAGE_TYPES z tym kafelkiem.
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

// JSON z posortowanymi kluczami: porównanie treści slajdu niezależne od kolejności pól.
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
    : JSON.stringify(v ?? null));
const content = (s) => stable({ frame: s.frame, data: s.data || {}, block_ids: s.block_ids || [], picks: s.picks || {}, origin: s.origin || null });

// Plan przeliczenia oferty: istniejące slajdy (z id, w obecnej kolejności) kontra świeżo wyliczone.
// - slajd automatyczny (bez blokady) o tej samej treści zostaje; inny jest wymieniany (remove + create);
// - slajd zablokowany zostaje bez zmian; jeśli jego krok już nie obowiązuje, zostaje ukryty (origin.auto_hidden),
//   a gdy krok wróci, znowu się pokazuje (ukrytego ręcznie przeliczenie nie pokazuje);
// - slajd dodany ręcznie (bez origin.step) zostaje;
// - kolejność idzie za scenariuszem, a slajdy spoza niego stoją za swoim dawnym poprzednikiem.
export function mergeRecompute(existing, fresh) {
  const sorted = [...existing].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const freshByStep = new Map(fresh.map((s, i) => [s.origin.step, i]));
  const keep = [];
  const remove = [];
  const hide = [];
  const unhide = []; // ukryte przez przeliczenie (origin.auto_hidden), których krok znowu obowiązuje
  const claimed = new Map(); // krok -> id slajdu, który go zajmuje
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
        if (step != null && !s.hidden) hide.push(s.id); // slajd ręczny (bez kroku) nigdy nie jest ukrywany
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
  // Ręczne i ukryte slajdy: za najbliższym wcześniejszym slajdem, który ma miejsce w nowej kolejności
  // (sam albo przez krok, który go zastąpił).
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
