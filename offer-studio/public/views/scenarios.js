// Scenariusze: tok prezentacji dla każdej roli. Krok = slajd z biblioteki + reguła, czym go wypełnić.
// Zmiana wchodzi do istniejących ofert przy ich przeliczeniu.
import { $, api, go, h, kvEditor, loadAll, state, tileLabel, toast, ui } from '../lib.js';

const KIND_LABELS = { none: 'Sama treść slajdu', pains: 'Bóle wybrane dla klienta', blocks: 'Bloki dobrane do kafelków', picks: 'Karty dobrane do kafelków' };
const TYPE_LABELS = {
  rozwiazanie: 'rozwiązania', use_case: 'przypadki użycia', problem: 'problemy', pillar: 'filary', signal: 'sygnały', step: 'kroki wdrożenia',
  comparison: 'wiersze porównania', package: 'składniki pakietu', person: 'osoby', differentiator: 'wyróżniki',
};

export const describeFill = (fill = { kind: 'none' }) => {
  if (fill.kind === 'blocks') {
    const n = fill.min === fill.max ? `${fill.max}` : `${fill.min}–${fill.max}`;
    return `${n} × ${TYPE_LABELS[fill.type] || fill.type}, najlepiej pasujące do kafelków klienta`;
  }
  if (fill.kind === 'picks') return `Karty z zestawu „${fill.set}”, dobrane do kafelków klienta`;
  return KIND_LABELS[fill.kind] || fill.kind;
};
const describeWhen = (when) => (when?.any?.length ? `Tylko gdy: ${when.any.map(tileLabel).join(' albo ')}` : '');

export function viewScenarios(selectedId) {
  if (!selectedId && state.scenarios[0]) return go('scenarios', state.scenarios[0].id);
  const sc = state.scenarios.find((s) => s.id === selectedId);
  let steps = structuredClone(sc?.steps || []);
  let dirty = false;
  const editor = h('div', { class: 'editor' });
  const saveBtn = h('button', { class: 'btn primary', disabled: true, onclick: async () => {
    try {
      await api('PUT', `/scenarios/${encodeURIComponent(sc.id)}`, { name: sc.name, steps });
      dirty = false;
      saveBtn.disabled = true;
      await loadAll();
      toast('Zapisano. Istniejące oferty zmienią się po „Przelicz”.');
    } catch (e) { toast(e.message, true); }
  } }, 'Zapisz scenariusz');
  const touch = () => { dirty = true; saveBtn.disabled = false; };
  ui.refresh = () => { if (!dirty) viewScenarios(selectedId); };

  const frames = state.library.map((f) => f.frame);
  const thumb = (frame) => state.library.find((f) => f.frame === frame)?.thumb;
  const types = [...new Set(state.blocks.map((b) => b.type))].sort();
  const sets = state.componentSets.map((c) => c.id);
  const products = state.tiles.filter((t) => t.category === 'produkt');

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    touch();
    render();
  };

  const stepCard = (st, i) => {
    const fill = st.fill || { kind: 'none' };
    const setFill = (patch) => { st.fill = { ...fill, ...patch }; touch(); render(); };
    const num = (key, val) => h('input', { type: 'number', min: 0, value: val ?? 0, class: 'num', onchange: (e) => setFill({ [key]: Number(e.target.value) }) });
    return h('div', { class: 'step-card' },
      h('div', { class: 'stc-head' },
        h('span', { class: 'sc-n' }, i + 1),
        thumb(st.frame) ? h('img', { src: thumb(st.frame), alt: st.frame }) : h('div', { class: 'shot-error mini' }, 'brak slajdu'),
        h('div', { class: 'stc-main' },
          h('input', { class: 'stc-label', value: st.label || '', placeholder: 'Nazwa kroku', oninput: (e) => { st.label = e.target.value; touch(); } }),
          h('div', { class: 'hint' }, describeFill(fill)),
          describeWhen(st.when) ? h('div', { class: 'hint' }, describeWhen(st.when)) : null,
          st.draft?.length ? h('div', { class: 'hint warn' }, `Szkic tekstu dla: ${st.draft.map(tileLabel).join(', ')}`) : null),
        h('div', { class: 'stc-acts' },
          h('button', { class: 'icon', title: 'W górę', onclick: () => move(i, -1) }, '↑'),
          h('button', { class: 'icon', title: 'W dół', onclick: () => move(i, 1) }, '↓'),
          h('button', { class: 'icon', title: 'Usuń krok', onclick: () => { if (confirm(`Usunąć krok „${st.label || st.key}”?`)) { steps.splice(i, 1); touch(); render(); } } }, '×'))),
      h('details', { class: 'stc-edit' }, h('summary', {}, 'Ustawienia kroku'),
        h('div', { class: 'stc-grid' },
          h('label', { class: 'f' }, 'Slajd z biblioteki'),
          h('select', { onchange: (e) => { st.frame = e.target.value; touch(); render(); } }, frames.map((f) => h('option', { value: f, selected: f === st.frame }, f))),
          h('label', { class: 'f' }, 'Czym wypełnić'),
          h('select', { onchange: (e) => setFill(e.target.value === 'blocks' ? { kind: 'blocks', type: types[0], min: 1, max: 3 } : e.target.value === 'picks' ? { kind: 'picks', set: sets[0] } : { kind: e.target.value }) },
            Object.entries(KIND_LABELS).map(([k, l]) => h('option', { value: k, selected: k === fill.kind }, l))),
          fill.kind === 'blocks' ? [
            h('label', { class: 'f' }, 'Typ bloków'),
            h('select', { onchange: (e) => setFill({ type: e.target.value }) }, types.map((t) => h('option', { value: t, selected: t === fill.type }, TYPE_LABELS[t] || t))),
            h('label', { class: 'f' }, 'Ile bloków (od – do)'),
            h('div', { class: 'row' }, num('min', fill.min), ' – ', num('max', fill.max)),
          ] : null,
          fill.kind === 'picks' ? [
            h('label', { class: 'f' }, 'Zestaw kart'),
            h('select', { onchange: (e) => setFill({ set: e.target.value }) }, sets.map((s) => h('option', { value: s, selected: s === fill.set }, s))),
          ] : null,
          h('label', { class: 'f' }, 'Pokazuj tylko przy produkcie (puste = zawsze)'),
          h('div', { class: 'row' }, products.map((p) => h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: st.when?.any?.includes(p.id), onchange: (e) => {
              const any = new Set(st.when?.any || []);
              if (e.target.checked) any.add(p.id); else any.delete(p.id);
              if (any.size) st.when = { any: [...any] }; else delete st.when;
              touch();
              render();
            } }), ` ${p.label}`)))),
        h('label', { class: 'f' }, 'Treść domyślna slajdu (wersja Vault)'),
        kvEditor(st.data || {}, state.library.find((f) => f.frame === st.frame)?.fields?.data || [], (data) => {
          st.data = Object.fromEntries(Object.entries(data).filter(([, v]) => v != null && v !== ''));
          touch();
        })));
  };

  const addStep = () => {
    const frame = frames[0];
    let key = frame;
    for (let n = 2; steps.some((s) => s.key === key); n++) key = `${frame}-${n}`;
    steps.push({ key, label: 'Nowy krok', frame, data: {}, fill: { kind: 'none' } });
    touch();
    render();
  };

  const render = () => editor.replaceChildren(h('div', { class: 'scenario-editor' },
    h('div', { class: 'bar' }, h('h2', {}, sc ? `Scenariusz: ${sc.name}` : 'Scenariusze'), saveBtn),
    h('p', { class: 'hint' }, 'Kolejność slajdów w ofercie dla tej roli. Zmiany trafią do istniejących ofert po kliknięciu „Przelicz” w ofercie.'),
    steps.map(stepCard),
    sc ? h('button', { class: 'btn', onclick: addStep }, '+ krok') : null));

  const list = h('div', { class: 'items' }, state.scenarios.map((s) => h('div', { class: `item ${s.id === selectedId ? 'active' : ''}`, onclick: () => {
    if (dirty && !confirm('Masz niezapisane zmiany. Porzucić je?')) return;
    go('scenarios', s.id);
  } }, h('div', {}, s.name), h('div', { class: 'sub' }, `${s.steps.length} kroków · ${tileLabel(s.id)}`))));
  $('#view').replaceChildren(h('div', { class: 'col list' }, h('div', { class: 'tools' }, h('div', { class: 'hint' }, 'Jeden scenariusz na rolę rozmówcy.')), list), editor);
  render();
}
