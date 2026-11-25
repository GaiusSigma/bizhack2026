// Scenarios: the flow of the deck for each role. Step = a library slide + a rule for what fills it.
// Changes reach existing offers when they are recomputed.
import { $, api, go, h, kvEditor, loadAll, state, tileLabel, toast, ui } from '../lib.js';

const KIND_LABELS = { none: 'Slide copy only', pains: 'The client\'s selected pains', blocks: 'Blocks picked by tiles', picks: 'Cards picked by tiles' };
const TYPE_LABELS = {
  solution: 'solutions', use_case: 'use cases', problem: 'problems', pillar: 'pillars', signal: 'signals', step: 'rollout steps',
  comparison: 'comparison rows', package: 'package items', person: 'people', differentiator: 'differentiators',
};

export const describeFill = (fill = { kind: 'none' }) => {
  if (fill.kind === 'blocks') {
    const n = fill.min === fill.max ? `${fill.max}` : `${fill.min}–${fill.max}`;
    return `${n} × ${TYPE_LABELS[fill.type] || fill.type}, best fit for the client\'s tiles`;
  }
  if (fill.kind === 'picks') return `Cards from the "${fill.set}" set, picked by the client\'s tiles`;
  return KIND_LABELS[fill.kind] || fill.kind;
};
const describeWhen = (when) => (when?.any?.length ? `Only with: ${when.any.map(tileLabel).join(' or ')}` : '');

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
      toast('Saved. Existing offers change after "Recompute".');
    } catch (e) { toast(e.message, true); }
  } }, 'Save scenario');
  const touch = () => { dirty = true; saveBtn.disabled = false; };
  ui.refresh = () => { if (!dirty) viewScenarios(selectedId); };

  const frames = state.library.map((f) => f.frame);
  const thumb = (frame) => state.library.find((f) => f.frame === frame)?.thumb;
  const types = [...new Set(state.blocks.map((b) => b.type))].sort();
  const sets = state.componentSets.map((c) => c.id);
  const products = state.tiles.filter((t) => t.category === 'product');

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
        thumb(st.frame) ? h('img', { src: thumb(st.frame), alt: st.frame }) : h('div', { class: 'shot-error mini' }, 'no slide'),
        h('div', { class: 'stc-main' },
          h('input', { class: 'stc-label', value: st.label || '', placeholder: 'Step name', oninput: (e) => { st.label = e.target.value; touch(); } }),
          h('div', { class: 'hint' }, describeFill(fill)),
          describeWhen(st.when) ? h('div', { class: 'hint' }, describeWhen(st.when)) : null,
          st.answers?.length ? h('div', { class: 'hint' }, `Answers: ${st.answers.join(', ')}`) : null,
          Object.keys({ ...st.data_by_role, ...st.data_by_role_product }).length ? h('div', { class: 'hint' }, `Own copy for: ${Object.keys({ ...st.data_by_role, ...st.data_by_role_product }).map(tileLabel).join(', ')}`) : null,
          st.draft?.length ? h('div', { class: 'hint warn' }, `Draft copy for: ${st.draft.map(tileLabel).join(', ')}`) : null),
        h('div', { class: 'stc-acts' },
          h('button', { class: 'icon', title: 'Move up', onclick: () => move(i, -1) }, '↑'),
          h('button', { class: 'icon', title: 'Move down', onclick: () => move(i, 1) }, '↓'),
          h('button', { class: 'icon', title: 'Delete step', onclick: () => { if (confirm(`Delete the step "${st.label || st.key}"?`)) { steps.splice(i, 1); touch(); render(); } } }, '×'))),
      h('details', { class: 'stc-edit' }, h('summary', {}, 'Step settings'),
        h('div', { class: 'stc-grid' },
          h('label', { class: 'f' }, 'Library slide'),
          h('select', { onchange: (e) => { st.frame = e.target.value; touch(); render(); } }, frames.map((f) => h('option', { value: f, selected: f === st.frame }, f))),
          h('label', { class: 'f' }, 'Fill with'),
          h('select', { onchange: (e) => setFill(e.target.value === 'blocks' ? { kind: 'blocks', type: types[0], min: 1, max: 3 } : e.target.value === 'picks' ? { kind: 'picks', set: sets[0] } : { kind: e.target.value }) },
            Object.entries(KIND_LABELS).map(([k, l]) => h('option', { value: k, selected: k === fill.kind }, l))),
          fill.kind === 'blocks' ? [
            h('label', { class: 'f' }, 'Block type'),
            h('select', { onchange: (e) => setFill({ type: e.target.value }) }, types.map((t) => h('option', { value: t, selected: t === fill.type }, TYPE_LABELS[t] || t))),
            h('label', { class: 'f' }, 'How many blocks (from – to)'),
            h('div', { class: 'row' }, num('min', fill.min), ' – ', num('max', fill.max)),
          ] : null,
          fill.kind === 'picks' ? [
            h('label', { class: 'f' }, 'Card set'),
            h('select', { onchange: (e) => setFill({ set: e.target.value }) }, sets.map((s) => h('option', { value: s, selected: s === fill.set }, s))),
          ] : null,
          h('label', { class: 'f' }, 'This slide answers (elements linked to the client\'s tiles of these kinds are highlighted)'),
          h('div', { class: 'row' }, Object.entries({ pain: 'Client pains', segment: 'Segment', role: 'Contact role', product: 'Product' }).map(([k, l]) => h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: (st.answers || []).includes(k), onchange: (e) => {
              const a = new Set(st.answers || []);
              if (e.target.checked) a.add(k); else a.delete(k);
              st.answers = [...a];
              touch();
              render();
            } }), ` ${l}`))),
          h('label', { class: 'f' }, 'Show only with product (empty = always)'),
          h('div', { class: 'row' }, products.map((p) => h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: st.when?.any?.includes(p.id), onchange: (e) => {
              const any = new Set(st.when?.any || []);
              if (e.target.checked) any.add(p.id); else any.delete(p.id);
              if (any.size) st.when = { any: [...any] }; else delete st.when;
              touch();
              render();
            } }), ` ${p.label}`)))),
        h('label', { class: 'f' }, 'Default slide copy (Vault version)'),
        kvEditor(st.data || {}, state.library.find((f) => f.frame === st.frame)?.fields?.data || [], (data) => {
          st.data = Object.fromEntries(Object.entries(data).filter(([, v]) => v != null && v !== ''));
          touch();
        })));
  };

  const addStep = () => {
    const frame = frames[0];
    let key = frame;
    for (let n = 2; steps.some((s) => s.key === key); n++) key = `${frame}-${n}`;
    steps.push({ key, label: 'New step', frame, data: {}, fill: { kind: 'none' } });
    touch();
    render();
  };

  const render = () => editor.replaceChildren(h('div', { class: 'scenario-editor' },
    h('div', { class: 'bar' }, h('h2', {}, sc ? `Scenario: ${sc.name}` : 'Scenarios'), saveBtn),
    h('p', { class: 'hint' }, 'The slide order in offers for this role. Changes reach existing offers after "Recompute" in the offer.'),
    steps.map(stepCard),
    sc ? h('button', { class: 'btn', onclick: addStep }, '+ step') : null));

  const list = h('div', { class: 'items' }, state.scenarios.map((s) => h('div', { class: `item ${s.id === selectedId ? 'active' : ''}`, onclick: () => {
    if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
    go('scenarios', s.id);
  } }, h('div', {}, s.name), h('div', { class: 'sub' }, `${s.steps.length} steps · ${tileLabel(s.id)}`))));
  $('#view').replaceChildren(h('div', { class: 'col list' }, h('div', { class: 'tools' }, h('div', { class: 'hint' }, 'One scenario per contact role.')), list), editor);
  render();
}
