// One-off generator: adds a "Components" page with the `@why` set (card variants for the "why" slide)
// to seed/gaius-template.figcraft and turns the slide's cards into `#pick:why` slots.
// Kept in the repo to show how the starter file was made. Day to day, components are drawn by hand
// in FigCraft/Figma: a top-level frame `@set-name` with the cards inside (card name = key).
//
//   node seed/build-components.mjs <input.figcraft> <output.figcraft>
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { unzipSync } from 'fflate';

const [, , input, output] = process.argv;
if (!input || !output) throw new Error('usage: node seed/build-components.mjs <input.figcraft> <output.figcraft>');
const WIN_CLI = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe';
const CLI = process.env.FIGCRAFT_CLI || (process.platform === 'win32' && existsSync(WIN_CLI) ? WIN_CLI : 'figcraft-cli');

const doc = JSON.parse(Buffer.from(unzipSync(new Uint8Array(readFileSync(input)))['document.json']).toString('utf8'));
const N = doc.nodes;
const node = (id) => N[String(id)];
const kids = (id) => (node(id)?.children || []).map(String);
const find = (id, pred) => {
  const out = [];
  const walk = (x) => { const n = node(x); if (!n) return; if (pred(n)) out.push(n); kids(x).forEach(walk); };
  walk(id);
  return out;
};

const slide = Object.values(N).find((n) => n.name === 'why' && n.type === 'frame');
const grid = find(slide.id, (n) => n.name === 'Frame 62')[0];
const cards = kids(grid.id).map(node).filter((n) => n.name === '#item');
if (cards.length !== 6) throw new Error(`expected 6 #item cards, found ${cards.length}`);

// Card parts: icon (72×72 frame), bar (Rectangle 4), {{title}} / {{body}} texts, row (Frame 51).
const parts = (card) => {
  const icon = find(card.id, (n) => n.type === 'frame' && n.width === 72 && n.height === 72)[0];
  return {
    card: card.id,
    icon: icon.id,
    vectors: find(icon.id, (n) => n.type === 'vector').map((n) => n.id),
    bar: find(card.id, (n) => n.name === 'Rectangle 4')[0].id,
    title: find(card.id, (n) => n.type === 'text' && n.name === '{{title}}')[0].id,
    body: find(card.id, (n) => n.type === 'text' && n.name === '{{body}}')[0].id,
    row: find(card.id, (n) => n.name === 'Frame 51')[0].id,
    green: (card.fills || []).some((f) => f.type === 'solid' && f.color.g > 0.6 && f.color.r < 0.3),
  };
};
const [A, B, C, D, E, F] = cards.map(parts); // in slide order

const BEIGE = { card: [{ type: 'solid', color: '#F3EDE2', opacity: 0.6 }], text: '#1D1F21', bar: '#36A82C', barW: 4, icon: '#36A82C' };
const GREEN = { card: ['#36A82C'], text: '#FFFFFF', bar: '#E5DCCD', barW: 2, icon: '#E5DCCD' };

// [key, source card, variant, title?, body?, stat?]
const SPEC = [
  ['private-legal-ai', A], ['one-environment', B], ['rollout-routine', C],
  ['no-lock-in', D], ['one-service', E], ['safe-start', F],
  ['sourced-answers', B, null, 'Answers you can check',
    'Every answer links to a statute, ruling, quote or document, so a lawyer can verify it in seconds.'],
  ['organization-know-how', C, null, 'Know-how at work on every matter',
    'Past opinions, briefs and templates get reused instead of sitting in folders and inboxes.'],
  ['on-premise', A, null, 'On-premise or hybrid',
    'Runs on your own infrastructure, with no documents sent to a public cloud. Built for banks, insurers and the public sector.'],
];

const steps = [];
const add = (command, params, as) => steps.push(as ? { command, as, params } : { command, params });
add('page.add', { name: 'Components' }, 'kp');
add('page.select', { id: { $ref: 'kp' } });
const total = SPEC.length * 2 + 1;
add('frame.create', {
  x: 0, y: 0, width: 1710, height: 400, name: '@why',
  props: {
    fills: ['#FFFFFF'], layout: 'grid', gridColumns: 3, gridRows: Math.ceil(total / 3),
    columnTracks: ['1fr', '1fr', '1fr'], rowTracks: Array(Math.ceil(total / 3)).fill('auto'),
    gap: 24, crossGap: 24, padding: 0, sizingV: 'hug',
  },
}, 'set');

let k = 0;
const card = (key, src, look, { title, body, stat } = {}) => {
  const as = `c${k++}`;
  const m = (id) => ({ $ref: as, field: `map/${id}` });
  add('edit.duplicate', { ids: [src.card], map: true }, as);
  add('node.reparent', { ids: [m(src.card)], parent: { $ref: 'set' } });
  add('node.set', { ids: [m(src.card)], props: { name: key, gridColumn: null, gridRow: null, sizingH: 'fill', sizingV: 'fixed', height: 198, fills: look.card } });
  add('node.set', { ids: [m(src.title), m(src.body)], props: { fills: [look.text] } });
  add('node.set', { ids: [m(src.bar)], props: { fills: [look.bar], width: look.barW } });
  if (src.vectors.length) add('node.set', { ids: src.vectors.map(m), props: { fills: [look.icon] } });
  if (title) add('text.set', { id: m(src.title), characters: title });
  if (body) add('text.set', { id: m(src.body), characters: body });
  if (stat) {
    add('node.set', { ids: [m(src.icon)], props: { visible: false } });
    add('text.create', {
      text: stat, x: 0, y: 0, parent: m(src.row), index: 0, name: '{{stat}}',
      props: { fontFamily: 'Figtree', fontStyle: 'Bold', fontSize: 52, fills: [look === GREEN ? '#FFFFFF' : '#36A82C'] },
    });
  }
};
for (const [key, src, , title, body] of SPEC) card(key, src, BEIGE, { title, body });
for (const [key, src, , title, body] of SPEC) card(`${key}-highlight`, src, GREEN, { title, body });
card('pilot-3-months', F, BEIGE, {
  title: 'A risk-free pilot',
  body: 'Three months on real matters, with the option to walk away. You decide on a full rollout after seeing the results.',
  stat: '3 mo.',
});

// The cards on the "why" slide become slots for components from the `@why` set.
for (const c of cards) add('node.set', { ids: [c.id], props: { name: '#pick:why' } });
add('page.select', { id: doc.pages[0] });

const dir = mkdtempSync(join(tmpdir(), 'build-components-'));
writeFileSync(join(dir, 'steps.json'), JSON.stringify(steps, null, 1));
const out = execFileSync(CLI, ['run', join(dir, 'steps.json'), '--in', resolve(input), '--out', resolve(output)], { encoding: 'utf8' });
const failed = out.split('\n').filter((l) => l.includes('"ok":false'));
if (failed.length) throw new Error(failed.join('\n'));
console.log(`wrote ${output}: ${total} components in @why, ${steps.length} steps`);
