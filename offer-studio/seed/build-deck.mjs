// Builds the Offer Studio template (seed/gaius-deck.figcraft) from the designer's file
// (seed/source/gaius-deck.figcraft: ten slides in Polish, drawn as plain groups with placeholder copy).
//
//   node seed/build-deck.mjs [source.figcraft] [output.figcraft]
//
// What it does, slide by slide:
// - names each slide with a stable key (title, starting-point, … contact-person): the scenario refers to these;
// - turns placeholder copy into fields ({{data.lead}}, {{offer.client}}, …) and translates fixed copy to English;
// - turns card groups into auto-layout frames, so copy written by the model wraps and the cards grow with it;
// - turns repeated cards into slots (#item:areas, #item:rows…): one card per line of that field, extra cards hidden.
//
// The designer keeps working on the Polish source; run this again after each change. Layer ids below are the
// source file's ids (they are stable as long as the designer edits the file rather than redrawing it).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [, , input = join(HERE, 'source', 'gaius-deck.figcraft'), output = join(HERE, 'gaius-deck.figcraft')] = process.argv;
const WIN_CLI = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe';
const CLI = process.env.FIGCRAFT_CLI || (process.platform === 'win32' && existsSync(WIN_CLI) ? WIN_CLI : 'figcraft-cli');

// Layer ids in the source file are 8589934000 + n; the script uses n.
const I = (n) => (typeof n === 'number' ? 8589934000 + n : n);
const steps = [];
let seq = 0;
const add = (command, params, as) => steps.push(as ? { command, as, params } : { command, params });
// "fill" sizing needs the parent's auto layout, which is often added later in a slide, so it is applied at the end.
const late = [];
const set = (ids, props) => {
  const now = {};
  const after = {};
  const sizing = {};
  for (const [k, v] of Object.entries(props)) {
    const isSizing = k === 'sizingH' || k === 'sizingV';
    (isSizing && v === 'fill' ? after : isSizing && 'layout' in props ? sizing : now)[k] = v;
  }
  const list = [].concat(ids).map(I);
  if (Object.keys(now).length) add('node.set', { ids: list, props: now });
  // hug/fixed sizing of a frame takes effect once its auto layout is on
  if (Object.keys(sizing).length) add('node.set', { ids: list, props: sizing });
  if (Object.keys(after).length) late.push({ command: 'node.set', params: { ids: list, props: after } });
};
const del = (...ids) => add('edit.delete', { ids: ids.map(I) });
const toFrame = (...ids) => add('object.convertToFrame', { ids: ids.map(I) });
const text = (id, characters) => add('text.set', { id: I(id), characters });
// Wraps layers in a new frame; returns a reference usable wherever an id is.
const wrap = (ids, name) => {
  const as = `w${seq++}`;
  add('object.frameSelection', { ids: ids.map(I), name }, as);
  const ref = { $ref: as, field: 'id' };
  add('node.set', { ids: [ref], props: { fills: [] } });
  return ref;
};

const C = {
  ink: '#1D1F21', body: '#3D4043', muted: '#62666A', grey: '#4A4D50',
  red: '#CE5E64', wine: '#9B5155', beige: '#F4F1EB', line: '#E6E1D8', sand: '#D8C9AD', white: '#FFFFFF',
};

// A text field: the layer name binds it, the characters are sample copy for thumbnails. Wraps at its width.
function field(id, name, sample, extra = {}) {
  set(id, { name, textAutoResize: 'height', ...extra });
  if (sample != null) text(id, sample);
}
// Fixed copy in English (the layer keeps its name only if it has no field).
function copy(id, characters, extra = {}) {
  text(id, characters);
  set(id, { name: characters.split('\n')[0].slice(0, 40), ...extra });
}
// A text that fills its auto-layout parent's width and wraps.
const fill = { sizingH: 'fill', textAutoResize: 'height' };

// Header of a content slide: kicker, title and optional lead stacked; then the header and the slide body
// go into one vertical frame, so a longer title pushes the body down instead of overlapping it.
function header(head, gap = 22) {
  toFrame(head);
  set(head, { layout: 'vertical', gap, sizingH: 'fixed', width: 1664, sizingV: 'hug', crossAlign: 'min' });
}
function column(head, body, gap) {
  const col = wrap([head, body], 'content');
  set(col, { layout: 'vertical', gap, sizingV: 'hug', sizingH: 'fixed', width: 1664 });
  return col;
}
// A grid of cards (2 or 3 columns, rows as tall as their tallest card).
function grid(id, columns, gap = 24, rowGap = 24) {
  toFrame(id);
  set(id, {
    layout: 'grid', gridColumns: columns, columnTracks: Array(columns).fill('1fr'), rowTracks: ['auto', 'auto', 'auto'],
    gridRows: 3, gap, crossGap: rowGap, sizingH: 'fixed', width: 1664, sizingV: 'hug',
  });
}
const cell = { gridColumn: null, gridRow: null, sizingH: 'fill', sizingV: 'hug' };

// Card with an icon and a text block with a red bar on its left (slides 02, 03, 06).
// bg: the card's background rectangle (its paint moves to the card), txt: the text group [bar, title, body?];
// the drawn bar is replaced by a left border on the text.
function barCard({ card, bg, txt, bar, texts, fills, strokes, padding, gap, barGap = 24, textGap = 8, inGrid = true, minHeight }) {
  toFrame(card, txt);
  set(card, {
    fills, ...(strokes ? { stroke: strokes, strokeAlign: 'inside', strokeWeight: 2 } : {}),
    layout: 'horizontal', padding, gap, crossAlign: 'min', sizingV: 'hug', ...(inGrid ? cell : {}), ...(minHeight ? { minHeight } : {}),
  });
  del(bg);
  const col = wrap(texts, 'text');
  // the red bar becomes the text block's left border, so it is always as tall as the text
  del(bar);
  set(txt, { layout: 'horizontal', gap: 0, sizingH: 'fill', sizingV: 'hug', crossAlign: 'min' });
  set(col, {
    layout: 'vertical', gap: textGap, paddingLeft: barGap, sizingH: 'fill', sizingV: 'hug',
    stroke: C.red, strokeAlign: 'inside', strokeTopWeight: 0, strokeRightWeight: 0, strokeBottomWeight: 0, strokeLeftWeight: 3,
  });
  set(texts, fill);
}

// ---------------------------------------------------------------- 01 cover
set(663, { name: 'title' });
field(670, 'PROPOSAL FOR {{offer.client|upper}}', 'PROPOSAL FOR ACME LAW');
field(672, '{{data.title}}', 'Secure Legal AI for\nthe litigation team', { width: 1096 });
field(674, 'Rollout plan\\nfor {{offer.client}}', 'Rollout plan\nfor ACME Law', { width: 900 });
field(675, '{{data.lead}}', 'A private Legal AI environment for research and document work, under your own control.', { width: 883 });
toFrame(671);
set(671, { layout: 'vertical', gap: 36, sizingV: 'hug', crossAlign: 'min' });
field(676, '{{offer.date}}', '25.11.2026', { textAlign: 'right', width: 300, x: 1493 });

// ---------------------------------------------------------------- 02 starting point
set(677, { name: 'starting-point' });
copy(682, 'Starting point');
field(683, 'Rolling out {{offer.product_name}}\\nat {{offer.client}}', 'Rolling out Gaius Vault\nat ACME Law', fill);
field(684, '{{data.lead}}', 'ACME Law is a 40-lawyer litigation firm in Warsaw. The disputes team of 12 will use Gaius first, led by two partners.', { ...fill, maxWidth: 1100 });
header(681);
grid(685, 2);
const areaCards = [[686, 687, 690, 691, 692, 693], [694, 695, 699, 700, 701, 702], [703, 704, 708, 709, 710, 711], [712, 713, 719, 720, 721, 722]];
const areaSamples = [
  ['Case-law research', 'They spend hours finding rulings for each brief, often starting from scratch.'],
  ['Drafting pleadings', 'First drafts take a full day; they want a solid starting point in an hour.'],
  ['Contract review', 'Clients send long contracts with a 24-hour turnaround.'],
  ['Know-how reuse', 'Past opinions sit in folders and nobody can find them.'],
];
areaCards.forEach(([card, bg, txt, bar, title, body], i) => {
  set(card, { name: '#item:areas' });
  field(title, '{{title}}', areaSamples[i][0]);
  field(body, '{{value}}', areaSamples[i][1]);
  barCard({ card, bg, txt, bar, texts: [title, body], fills: [C.beige], padding: [32, 40, 32, 44], gap: 38, minHeight: 160 });
});
column(681, 685, 56);

// ---------------------------------------------------------------- 03 use areas
set(723, { name: 'use-areas' });
copy(728, 'Use areas');
field(729, 'What you need and how\\n{{offer.product_name}} covers it', 'What you need and how\nGaius Vault covers it', fill);
header(727);
copy(733, 'AREA');
field(734, 'HOW {{offer.product_name|upper}} HANDLES IT', 'HOW GAIUS VAULT HANDLES IT');
set(734, { textAutoResize: 'widthAndHeight' });
toFrame(732);
set(732, { layout: 'horizontal', gap: 0, sizingV: 'hug', sizingH: 'fill' });
set(733, { sizingH: 'fixed', width: 799 });
// rows: [row, area card, area bg, area border, area text, arrow, fn card, fn bg, fn txt, fn bar, fn text, extra text]
const useRows = [
  [735, 736, 737, 738, 739, 740, 742, 743, 747, 748, 749, 750],
  [751, 752, 753, 754, 755, 756, 758, 759, 763, 764, 765],
  [766, 767, 768, 769, 770, 771, 773, 774, 777, 778, 779],
  [780, 781, 782, 783, 784, 785, 787, 788, 793, 794, 795],
];
const useSamples = [
  ['Case-law research', 'Research with case numbers and quotes from Polish and EU case law, in one question.'],
  ['Drafting pleadings', 'Drafts from your own templates and past briefs, with sources for every claim.'],
  ['Contract review', 'Clause-by-clause review against your playbook, with a risk summary.'],
  ['Know-how reuse', 'One searchable base of the firm’s opinions and templates.'],
];
useRows.forEach(([row, oc, obg, oborder, otext, arrow, fc, fbg, ftxt, fbar, ftext, extra], i) => {
  if (extra) del(extra);
  set(row, { name: '#item:solutions' });
  toFrame(row, oc);
  set(row, { layout: 'horizontal', gap: 24, crossAlign: 'center', sizingH: 'fill', sizingV: 'hug' });
  // the area box: white with a sand border, text centred vertically
  set(oc, { fills: [C.white], stroke: C.sand, strokeAlign: 'inside', strokeWeight: 2, layout: 'horizontal', padding: [26, 34, 26, 34], sizingH: 'fixed', width: 688, sizingV: 'hug', crossAlign: 'center' });
  del(obg, oborder);
  field(otext, '{{title}}', useSamples[i][0], fill);
  field(ftext, '{{value}}', useSamples[i][1]);
  barCard({ card: fc, bg: fbg, txt: ftxt, bar: fbar, texts: [ftext], fills: [C.beige], padding: [24, 40, 24, 39], gap: 35, inGrid: false });
  set(fc, { sizingH: 'fill' });
});
toFrame(731);
set(731, { layout: 'vertical', gap: 16, sizingH: 'fixed', width: 1664, sizingV: 'hug' });
column(727, 731, 45);

// ---------------------------------------------------------------- 04 team support
set(796, { name: 'team-support' });
copy(801, 'Team support');
copy(802, 'How we support your team day to day', fill);
field(803, '{{data.lead}}', 'We roll Gaius out together with your team: short sessions, real matters and a person to call.', { ...fill, maxWidth: 1100 });
header(800);
grid(804, 3);
// [card, bg, icon, label, title, body, extra]
const teamCards = [[805, 806, 807, 812, 813, 814], [815, 816, 817, 820, 821, 822], [823, 824, 825, 828, 829, 830, 831]];
teamCards.forEach(([card, bg, , label, title, body, extra], i) => {
  if (extra) del(extra);
  toFrame(card);
  set(card, { fills: [C.beige], layout: 'vertical', padding: [48, 40, 40, 40], gap: 20, crossAlign: 'min', ...cell, minHeight: 469 });
  del(bg);
  set([label, title, body], fill);
  if (i < 2) {
    set(card, { name: '#item:concerns' });
    // "From our call" on cards written from the call, "Common question" on the defaults (third column of `concerns`)
    field(label, '{{value2}}', 'From our call', fill);
    field(title, '{{title}}', i ? 'Will people actually use it?' : 'Is the AI’s output reliable?');
    field(body, '{{value}}', i ? 'Each lawyer gets a short onboarding on their own matters, and we check usage with you after two weeks.' : 'Every answer links to the statute, ruling or document it is based on, so it can be checked in seconds.');
  } else {
    copy(label, 'From similar rollouts', fill);
    copy(title, 'A tool only a few people use', fill);
    copy(body, 'We turn common tasks into shared workflows, checklists and prompts, and workshops build adoption across the team.', fill);
  }
});
column(800, 804, 56);

// ---------------------------------------------------------------- 05 comparison
set(832, { name: 'tool-comparison' });
copy(837, 'Comparison');
field(838, '{{offer.product_name}} and {{data.tool}}:\\nside by side', 'Gaius Vault and ChatGPT:\nside by side', fill);
field(839, '{{data.lead}}', 'You mentioned the team already tries ChatGPT for first drafts. Here is how the two compare for legal work.', { ...fill, maxWidth: 1100 });
header(836);
// table: header row + six rows; each row is [row, [cell, line, text] × 3]
const COLS = [366, 649, 649];
function tableRow(row, cells, { header: isHeader = false, bg } = {}) {
  toFrame(row, ...cells.map((c) => c[0]));
  set(row, {
    layout: 'horizontal', gap: 0, sizingH: 'fill', sizingV: 'hug', crossAlign: 'min',
    ...(isHeader ? { fills: [C.beige], paddingTop: 21 } : {}),
    stroke: C.line, strokeAlign: 'inside', strokeTopWeight: 0, strokeLeftWeight: 0, strokeRightWeight: 0, strokeBottomWeight: 2,
  });
  if (bg) del(bg);
  cells.forEach(([c, line, t], k) => {
    del(line);
    set(c, { layout: 'vertical', padding: [0, 24, isHeader ? 22 : 20, 24], sizingH: 'fixed', width: COLS[k], sizingV: 'hug' });
    set(t, fill);
  });
}
tableRow(841, [[843, 844, 845], [846, 847, 848], [849, 850, 851]], { header: true, bg: 842 });
copy(845, 'Area', fill);
field(848, '{{data.tool}}', 'ChatGPT', fill);
field(851, '{{offer.product_name}}', 'Gaius Vault', fill);
const rowIds = [852, 862, 872, 882, 892, 902];
const cmpSamples = [
  ['Legal sources', 'General knowledge, no access to current case law', 'Polish and EU law and case law, with case numbers'],
  ['Your documents', 'Uploaded one chat at a time', 'One base of the firm’s documents and templates'],
  ['Confidentiality', 'Public cloud outside your control', 'Private environment, data never used for training'],
  ['Verification', 'Answers without sources', 'Every answer links to its basis'],
  ['Team rollout', 'Self-service', 'Workshops and shared workflows'],
  ['Price model', 'Per user', 'One licence for the team'],
];
rowIds.forEach((r, i) => {
  const b = r + 1;
  // [lab, line, text], [them, line, text], [us, line, text]
  const cells = [[b, b + 1, b + 2], [b + 3, b + 4, b + 5], [b + 6, b + 7, b + 8]];
  tableRow(r, cells);
  set(r, { name: '#item:rows' });
  field(b + 2, '{{title}}', cmpSamples[i][0]);
  field(b + 5, '{{value}}', cmpSamples[i][1]);
  field(b + 8, '{{value2}}', cmpSamples[i][2]);
});
toFrame(840);
set(840, { layout: 'vertical', gap: 20, sizingH: 'fixed', width: 1664, sizingV: 'hug' });
column(836, 840, 56);

// ---------------------------------------------------------------- 06 security
set(597, { name: 'security' });
copy(600, 'Security');
copy(601, 'Data security model', fill);
field(602, '{{data.lead}}', 'Your documents stay in a private environment: encrypted, never used for training and visible only to the people you choose.', { ...fill, maxWidth: 1100 });
header(599);
grid(603, 3);
const secCards = [[604, 605, 609, 610, 611, 612], [613, 614, 619, 620, 621, 622], [623, 624, 629, 630, 631, 632], [633, 634, 639, 640, 641, 642], [643, 644, 648, 649, 650, 651], [652, 653, 659, 660, 661, 662]];
const secSamples = [
  ['Encrypted storage', 'Documents and answers are encrypted at rest.'],
  ['Encrypted transmission', 'All traffic uses TLS.'],
  ['No AI training', 'Your data is never used to train models.'],
  ['Infrastructure in the EEA', 'Servers in the European Economic Area.'],
  ['GDPR compliant', 'A data processing agreement and a clear processing register.'],
  ['Access control', 'Roles and permissions per team and matter.'],
];
secCards.forEach(([card, bg, txt, bar, title, body], i) => {
  set(card, { name: '#item:features' });
  field(title, '{{title}}', secSamples[i][0]);
  field(body, '{{value}}', secSamples[i][1]);
  barCard({ card, bg, txt, bar, texts: [title, body], fills: [C.white], padding: [27, 32, 27, 36], gap: 30, barGap: 20, textGap: 6, minHeight: 167 });
});
column(599, 603, 120);

// ---------------------------------------------------------------- 07 preparation
set(912, { name: 'preparation' });
copy(917, 'Preparation');
field(918, '{{data.title}}', 'Recommended steps before\nthe pilot starts', fill);
field(919, '{{data.lead}}', 'A few conversations that will get you ready for the pilot.', { ...fill, maxWidth: 1100 });
header(916);
grid(920, 2);
// [card, bg, border, box, boxFill, boxBorder, div, title, body, note, check]
const prepCards = [
  [921, 922, null, 923, 924, 925, 928, 929, 930, 931, 926],
  [932, 933, null, 934, 935, 936, 937, 938, 939],
  [940, 941, null, 942, 943, 944, 945, 946, 947],
  [948, 949, null, 950, 951, 952, 953, 954, 955],
  [956, 957, 958, 959, 960, 961, 962, 963, 964],
];
const prepSamples = [
  ['Talk to your DPO', 'To agree on data processing rules and have the data processing agreement ready.'],
  ['Talk to IT', 'To check server and network access, so the pilot starts on day one.'],
  ['A short meeting with us', 'To pick the matters for the pilot and decide who from the team takes part.'],
  ['Talk to the board', 'So they know what you are testing and how you will judge the result.'],
  ['Prepare sample contracts', 'You asked to test on anonymised contracts: pick five before we start.'],
];
prepCards.forEach(([card, bg, border, box, boxFill, , div, title, body, note, check], i) => {
  if (note) del(note);
  if (check) del(check);
  set(card, { name: '#item:steps' });
  toFrame(card, div);
  const last = i === 4; // the client's own point: white with a dashed sand border
  set(card, {
    fills: [last ? C.white : C.beige], ...(last ? { stroke: C.sand, strokeAlign: 'inside', strokeWeight: 2, dashes: [8, 6] } : {}),
    layout: 'horizontal', padding: [27, 40, 27, 32], gap: 24, crossAlign: 'center', sizingV: 'hug', ...cell, minHeight: 160,
  });
  del(bg);
  if (border) del(border);
  set(boxFill, { fills: [C.white] });
  set(div, { layout: 'vertical', gap: 4, sizingH: 'fill', sizingV: 'hug' });
  field(title, '{{title}}', prepSamples[i][0], { ...fill, fills: [C.ink] });
  field(body, '{{value}}', prepSamples[i][1], { ...fill, fills: [C.body] });
});
column(916, 920, 60);

// ---------------------------------------------------------------- 08 rollout process (fixed copy)
set(965, { name: 'rollout-process' });
copy(969, 'THE GAIUS ROLLOUT PROCESS');
del(971);
text(970, 'From the first meeting to Gaius in production.');
set(970, { name: 'From the first meeting to Gaius in production.' });
add('text.style', { id: I(970), start: 45, end: 46, textFills: [C.red] });
copy(972, 'Five stages. At each one you know how long it takes, what you get and when you move on.');
copy(988, 'Discovery');
copy(996, 'Pilot');
copy(1003, 'Decision');
copy(1012, 'Production\nrollout');
copy(1019, 'Scaling');
copy(1027, 'TIME');
copy(1038, 'WHAT HAPPENS');
copy(1057, 'WHAT YOU GET');
copy(1075, 'YOU MOVE ON\nWHEN');
const proc = [
  // [first text, continuation, English]
  [1028, null, '1 meeting'], [1029, null, 'up to 14 days'], [1030, null, '1 meeting'], [1031, null, 'right away'], [1032, null, 'ongoing'],
  [1039, 1040, 'An introductory meeting and the first Gaius training.'],
  [1041, 1042, 'Unlimited Pro accounts for the team. A workshop on building skills.'],
  [1043, 1044, 'A meeting to review the pilot results.'],
  [1045, 1046, '1–3 licences for your most promising AI adopters.'],
  [1047, 1048, 'Adoption sessions. More licences and automations.'],
  [1058, 1059, 'The skill to work with AI. After training, the team uses Gaius on its own.'],
  [1060, 1061, 'Full, unlimited access to Gaius and your first own skills.'],
  [1062, 1063, 'A clear picture of the tasks where Gaius really takes work off the team.'],
  [1064, 1065, 'Your own AI leaders who bring the rest of the team along.'],
  [1066, 1067, 'AI across the organisation: more teams and automated tasks.'],
  [1076, 1077, 'You want to try Gaius on your own matters.'],
  [1078, null, 'The pilot period ends.'],
  [1085, 1086, 'The first people work with Gaius every day.'],
  [1087, 1088, 'You add licences when you need them.'],
];
for (const [id, cont, en] of proc) {
  if (cont) del(cont);
  copy(id, en, { textAutoResize: 'height', width: id < 1039 ? 300 : 270 });
}
copy(1083, 'The pilot was enough.');
copy(1084, 'Need more time? +14 days for PLN 1,000 or a testimonial.', { textAutoResize: 'height', width: 270 });

// ---------------------------------------------------------------- 09 add-on services
set(1089, { name: 'add-on-services' });
copy(1094, 'Additional services');
copy(1095, 'Complementary services', fill);
field(1096, '{{data.lead}}', 'Beyond the areas above, these follow from what we discussed.', { ...fill, maxWidth: 1100 });
header(1093);
grid(1097, 3);
// [card, bg, icon, title, body, foot, foot line, foot text]
const svcCards = [[1098, 1099, 1100, 1104, 1105, 1106, 1107, 1108], [1109, 1110, 1111, 1114, 1115, 1116, 1117, 1118], [1119, 1120, 1121, 1125, 1126, 1127, 1128, 1129]];
const svcSamples = [
  ['Workshops', 'Prompting and verification for the disputes team.', '2 × 3 hours, up to 12 people'],
  ['Developer hours', 'Connecting Gaius to your document management system.', '20-hour package'],
  ['Development plans', 'Rolling out to the transactional team next.', 'Q2 2027'],
];
svcCards.forEach(([card, bg, , title, body, foot, line, ft], i) => {
  set(card, { name: '#item:services' });
  toFrame(card, foot);
  set(card, { fills: [C.beige], layout: 'vertical', padding: [53, 40, 40, 40], gap: 24, crossAlign: 'min', ...cell, minHeight: 371 });
  del(bg);
  field(title, '{{title}}', svcSamples[i][0], fill);
  field(body, '{{value}}', svcSamples[i][1], fill);
  set(foot, { layout: 'vertical', gap: 18, sizingH: 'fill', sizingV: 'hug' });
  set(line, { sizingH: 'fill' });
  field(ft, '{{value2}}', svcSamples[i][2], fill);
});
column(1093, 1097, 120);

// ---------------------------------------------------------------- 10 contact
set(1130, { name: 'contact-person' });
copy(1136, 'Contact');
copy(1137, 'Your contact person', { textAutoResize: 'height', width: 842 });
field(1138, '{{data.lead}}', 'Next step: a 30-minute call with your IT team in the week of 1 December to plan the pilot.', { width: 842 });
toFrame(1135);
set(1135, { layout: 'vertical', gap: 20, sizingV: 'hug', sizingH: 'fixed', width: 842 });
set(1139, { name: '#item' });
field(1149, '{{title}}', 'Janusz Marszałek', { width: 460 });
field(1150, '{{role}}', 'Co-founder & COO', { width: 460 });
field(1151, '{{email}}', 'januszmarszalek@gaius-lex.pl', { width: 460 });
field(1152, '{{phone}}', '+48 579 122 689', { width: 460 });
toFrame(1148);
set(1148, { layout: 'vertical', gap: 10, sizingV: 'hug' });
toFrame(1134);
set(1134, { layout: 'vertical', gap: 41, sizingV: 'hug' });
field(1159, '{{data.calendar}}', 'Book a call: gaius-lex.pl', { width: 400, textAlign: 'center', x: 1350 });

// ---------------------------------------------------------------- run
steps.push(...late);
const dir = mkdtempSync(join(tmpdir(), 'build-deck-'));
writeFileSync(join(dir, 'steps.json'), JSON.stringify(steps, null, 1));
let out;
try {
  out = execFileSync(CLI, ['run', join(dir, 'steps.json'), '--in', resolve(input), '--out', resolve(output)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  const failed = String(e.stdout || '').split('\n').filter((l) => l.includes('"ok":false'));
  throw new Error(`figcraft-cli failed (steps in ${dir}):\n${failed.join('\n') || e.stderr || e.message}`);
}
console.log(`wrote ${output}: ${steps.length} steps`);
