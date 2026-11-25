// Nowa oferta z kafelków: sprzedawca opisuje klienta (rola, segment, bóle, produkt),
// a prezentacja składa się według scenariusza roli. Ten sam wybór kafelków służy do „Zmień kafelki”.
import { $, CATEGORY_LABELS, api, go, h, loadAll, state, toast } from '../lib.js';
import { cleanSelection } from '../selection.js';

export const MAX_PAINS = 5;
const WEIGHTS = { bol: 3, segment: 2, rola: 1, produkt: 1 };
const COVERAGE_TYPES = ['rozwiazanie', 'use_case'];

// Te same reguły co src/generate.js (dobór po stronie serwera); tu tylko do podpowiedzi na żywo.
export const selectionOf = (ids) => {
  const of = (cat) => ids.filter((id) => id.startsWith(`${cat}:`));
  return { role: of('rola')[0], segment: of('segment')[0], product: of('produkt')[0], pains: of('bol') };
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
// Bóle, dla których w bazie jest treść pasująca do segmentu (rozwiązanie albo przypadek użycia).
export const painsWithContent = (sel) => sel.pains.filter((p) => state.blocks.some((b) =>
  COVERAGE_TYPES.includes(b.type) && b.tags.includes(p) && segmentOk(b.tags, sel)));

// Wybór kafelków. `selected` = lista id; onChange dostaje nową listę.
export function tilePicker(selected, onChange) {
  let ids = cleanSelection(selected, state.tiles);
  const root = h('div', { class: 'tile-picker' });
  const render = () => {
    root.replaceChildren(...Object.entries(CATEGORY_LABELS).map(([cat, title]) => {
      const tiles = state.tiles.filter((t) => t.category === cat).sort((a, b) => (a.status === 'soon') - (b.status === 'soon') || a.position - b.position);
      const multi = cat === 'bol';
      const count = ids.filter((id) => id.startsWith(`${cat}:`)).length;
      return h('section', { class: 'tp-cat' },
        h('div', { class: 'tp-head' }, h('h3', {}, title),
          h('span', { class: 'hint' }, multi ? `wybierz od 1 do ${MAX_PAINS} · wybrano ${count}` : 'wybierz jeden')),
        h('div', { class: `tp-tiles ${multi ? 'multi' : ''}` }, tiles.map((t) => {
          const on = ids.includes(t.id);
          const soon = t.status === 'soon';
          return h('button', {
            class: `tile ${on ? 'on' : ''} ${soon ? 'soon' : ''}`,
            disabled: soon,
            title: [t.description, t.quotes?.[0] && `„${t.quotes[0]}”`].filter(Boolean).join('\n'),
            onclick: () => {
              if (multi) {
                if (on) ids = ids.filter((x) => x !== t.id);
                else if (count >= MAX_PAINS) return toast(`Najwyżej ${MAX_PAINS} bólów. Odznacz któryś, żeby dodać nowy.`, true);
                else ids = [...ids, t.id];
              } else ids = [...ids.filter((x) => !x.startsWith(`${cat}:`)), t.id];
              render();
              onChange(ids);
            },
          },
          h('span', { class: 'tile-label' }, t.label),
          multi && t.description ? h('span', { class: 'tile-desc' }, t.description) : null,
          soon ? h('span', { class: 'soon-tag' }, 'wkrótce') : null);
        })));
    }));
  };
  render();
  return root;
}

// Podsumowanie na żywo: scenariusz, liczba slajdów, bóle z treścią.
export function selectionSummary(ids) {
  const sel = selectionOf(ids);
  const scenario = state.scenarios.find((s) => s.id === sel.role);
  const missing = [];
  if (!sel.role) missing.push('rolę');
  if (!sel.segment) missing.push('segment');
  if (!sel.product) missing.push('produkt');
  if (!sel.pains.length) missing.push('co najmniej jeden ból');
  if (missing.length) return { ok: false, text: `Wybierz jeszcze: ${missing.join(', ')}.` };
  if (!scenario) return { ok: false, text: 'Dla tej roli nie ma jeszcze scenariusza.' };
  const chosen = new Set(ids);
  const steps = scenario.steps.filter((st) => !st.when?.any?.length || st.when.any.some((t) => chosen.has(t)));
  const withContent = painsWithContent(sel);
  const lacking = sel.pains.filter((p) => !withContent.includes(p)).map((p) => state.tiles.find((t) => t.id === p)?.label || p);
  return {
    ok: true,
    text: `Scenariusz ${scenario.name} · ${steps.length} slajdów · bóle z gotową treścią: ${withContent.length} z ${sel.pains.length}`,
    warn: lacking.length ? `Brak treści dla: ${lacking.join(', ')}. Oferta powstanie, ale tego bólu nie rozwiąże.` : '',
  };
}

export async function viewNewOffer() {
  const firstActive = (cat) => state.tiles.find((t) => t.category === cat && t.status === 'active')?.id;
  let ids = ['rola', 'segment', 'produkt'].map(firstActive).filter(Boolean);
  const client = h('input', { placeholder: 'np. Kancelaria Nowak i Wspólnicy', class: 'client-input' });
  const summary = h('div', { class: 'summary-text' });
  const warn = h('div', { class: 'summary-warn' });
  const create = h('button', { class: 'btn primary big', onclick: async () => {
    if (!client.value.trim()) { client.focus(); return toast('Podaj nazwę klienta', true); }
    create.disabled = true;
    try {
      const o = await api('POST', '/offers/generate', { client: client.value.trim(), tiles: ids });
      await loadAll();
      go('offers', o.id);
    } catch (e) {
      toast(e.message, true);
      create.disabled = false;
    }
  } }, 'Utwórz ofertę');
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
      h('a', { class: 'back', href: '#/offers' }, '← Wszystkie oferty'),
      h('h1', {}, 'Nowa oferta'),
      h('p', { class: 'lead' }, 'Opisz klienta po rozmowie. Prezentacja ułoży się sama według roli rozmówcy, a każdy slajd pokaże, dlaczego się w niej znalazł.'),
      h('label', { class: 'f' }, 'Klient'), client,
      picker),
    h('div', { class: 'summary-bar' }, h('div', { class: 'summary-copy' }, summary, warn), create)));
  client.focus();
}
