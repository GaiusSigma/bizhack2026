// Rendering offers with FigCraft.
//
// A template is a plain .figcraft file. Every top-level frame is one template slide
// (frame name = its identifier). Fields are bound by layer NAMES:
//
//   {{data.title}}            slide content (from the slide editor)
//   {{offer.client|upper}}    offer variable, optional upper/lower filter
//   Effect: {{effect}}        fixed text + field; an empty result hides the layer
//   #item                     slot for a block (card). Inside: {{title}}, {{body}}, {{n}}, {{effect}}…
//   #item:lines               slot for a row of the data.lines field ("label | value" on each line)
//   **text**                  in a value: style of the template's first highlight (e.g. red accent)
//   [[2:text]]                in a layer name: style of the template's second highlight
//   \n                        in a layer name: new line
//
// There can be more slots than blocks (the extra ones are hidden) or fewer (the last slot is
// duplicated; in auto layout the extra cards arrange themselves).
//
// A render is two `figcraft-cli run` passes (1: slide copies and extra slots, 2: content),
// followed by `figcraft-cli export` to PNG (preview) or PDF.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { componentId, HttpError } from './db.js';

// figcraft-cli: from FIGCRAFT_CLI, from the default FigCraft install on Windows, or from PATH (Docker).
const WIN_CLI = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe';
const CLI = process.env.FIGCRAFT_CLI || (process.platform === 'win32' && existsSync(WIN_CLI) ? WIN_CLI : 'figcraft-cli');
const WORK = process.env.RENDER_DIR || join(tmpdir(), 'offer-studio-renders');

const PLACEHOLDER = /\{\{|\[\[/;
const SLOT = /^#item(?::([A-Za-z_][\w]*))?$/;
const PICK = /^#pick:([\w-]+)$/;
const SET = /^@([\w-]+)$/;

// ------------------------------------------------------------------ template parsing
const hex = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

function runStyle(style) {
  const s = {};
  if (style.font_style) s.fontStyle = style.font_style;
  if (style.font_size) s.fontSize = style.font_size;
  const fill = (style.fills || []).find((f) => f.type === 'solid' && f.visible !== false);
  if (fill) s.textFills = [hex(fill.color)];
  return s;
}

export function parseTemplate(buffer) {
  let files;
  try {
    files = unzipSync(new Uint8Array(buffer), { filter: (f) => f.name === 'document.json' });
  } catch {
    throw new HttpError(400, 'This is not a .figcraft file (expected an archive with document.json)');
  }
  if (!files['document.json']) throw new HttpError(400, 'The .figcraft file is missing document.json');
  const doc = JSON.parse(Buffer.from(files['document.json']).toString('utf8'));
  const N = doc.nodes;
  // Top-level frames from all pages (a file can have several): slides or `@…` sets.
  const tops = doc.pages.flatMap((pid) =>
    (N[String(pid)]?.children || []).map((fid) => ({ page: Number(pid), frame: N[String(fid)] })))
    .filter((x) => x.frame && x.frame.type === 'frame');

  // Texts with {{…}} fields in a subtree; `stopAt` stops the descent (#pick slots are replaced whole).
  const collect = (rootId, onNode) => {
    const walk = (id, ctx) => {
      const n = N[String(id)];
      if (!n) return;
      const next = onNode(n, ctx);
      if (next === false) return;
      for (const c of n.children || []) walk(c, next ?? ctx);
    };
    walk(rootId, null);
  };
  const textOf = (rootId) => {
    const out = [];
    collect(rootId, (n) => { if (n.type === 'text' && n.visible !== false && n.characters) out.push(n.characters.trim()); });
    return out.filter(Boolean).join('\n');
  };

  // Component sets: @name -> the frame's children are cards.
  const components = [];
  for (const { frame } of tops.filter((t) => SET.test(t.frame.name || ''))) {
    const set = SET.exec(frame.name)[1];
    for (const cid of frame.children || []) {
      const n = N[String(cid)];
      if (!n || !['frame', 'group', 'component', 'instance'].includes(n.type)) continue;
      const texts = [];
      collect(n.id, (x) => {
        if (x.type === 'text' && PLACEHOLDER.test(x.name || '')) texts.push({ id: x.id, name: x.name, runs: (x.runs || []).map((r) => runStyle(r.style)) });
      });
      const fields = new Set();
      for (const t of texts) for (const [, expr] of t.name.matchAll(/\{\{\s*([^}|]+?)\s*(?:\|[^}]*)?\}\}/g)) fields.add(expr);
      const text = textOf(n.id);
      components.push({
        id: componentId(set, n.name), set, key: n.name, node: n.id, width: n.width, height: n.height,
        texts, fields: [...fields], text, title: text.split('\n')[0].slice(0, 80) || n.name,
      });
    }
  }

  const frames = tops.filter((t) => !SET.test(t.frame.name || '')).map(({ page, frame }) => {
    const texts = []; // {id, name, slot (slot id or null), runs}
    const slots = []; // {id, source, grid}
    const picks = []; // {id, set, parent, index, sizingH}
    collect(frame.id, (n, slotId) => {
      const pm = PICK.exec(n.name || '');
      if (pm && slotId == null) {
        const parent = N[String(n.parent)];
        picks.push({
          id: n.id, set: pm[1], parent: n.parent, grid: parent?.layout?.mode === 'grid',
          index: (parent?.children || []).indexOf(n.id), sizingH: n.child_layout?.sizing_h,
        });
        return false;
      }
      const m = SLOT.exec(n.name || '');
      let inSlot = slotId;
      if (m && slotId == null) {
        const parent = N[String(n.parent)];
        slots.push({ id: n.id, source: m[1] || 'blocks', grid: parent?.layout?.mode === 'grid' });
        inSlot = n.id;
      }
      if (n.type === 'text' && PLACEHOLDER.test(n.name || '')) {
        texts.push({ id: n.id, name: n.name, slot: inSlot, runs: (n.runs || []).map((r) => runStyle(r.style)) });
      }
      return inSlot;
    });

    const dataKeys = new Set();
    const itemKeys = new Set();
    for (const t of texts) {
      for (const [, expr] of t.name.matchAll(/\{\{\s*([^}|]+?)\s*(?:\|[^}]*)?\}\}/g)) {
        if (expr.startsWith('data.')) dataKeys.add(expr.slice(5));
        else if (!expr.startsWith('offer.') && t.slot != null) itemKeys.add(expr);
      }
    }
    const sources = [...new Set(slots.map((s) => s.source))];
    for (const s of sources) if (s !== 'blocks') dataKeys.add(s);
    const pickSets = {};
    for (const p of picks) pickSets[p.set] = (pickSets[p.set] || 0) + 1;
    return {
      id: frame.id,
      page,
      name: frame.name,
      width: frame.width,
      height: frame.height,
      texts,
      slots,
      picks,
      fields: { data: [...dataKeys], item: [...itemKeys], sources, picks: pickSets },
    };
  });
  return { name: doc.name, pages: doc.pages.map(Number), frames, components, images: (doc.imageIndex || []).length };
}

// Short description for the API/UI (no internal ids).
export const describeTemplate = (parsed) =>
  parsed.frames.map((f) => ({ name: f.name, width: f.width, height: f.height, fields: f.fields, slots: f.slots.length }));
export const describeComponents = (parsed) =>
  parsed.components.map((c) => ({ id: c.id, set: c.set, key: c.key, title: c.title, text: c.text, fields: c.fields, width: c.width, height: c.height }));

// ------------------------------------------------------------------ values and styles
function lookup(ctx, path) {
  let v = ctx;
  for (const k of path.split('.')) v = v == null ? undefined : v[k];
  return v;
}

// Markdown from blocks -> plain text: lists lose their markers, **highlights** stay for styling.
function plain(v) {
  if (v == null) return '';
  if (typeof v !== 'string') return String(v);
  return v
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').replace(/^#+\s+/, ''))
    .join('\n')
    .trim();
}

function fill(template, ctx) {
  const t = template.replace(/\\n/g, '\n');
  let hadValue = false;
  const out = t.replace(/\{\{\s*([^}|]+?)\s*(?:\|\s*(\w+)\s*)?\}\}/g, (_, path, filter) => {
    let v = plain(lookup(ctx, path));
    if (v !== '') hadValue = true;
    if (filter === 'upper') v = v.toLocaleUpperCase('en');
    if (filter === 'lower') v = v.toLocaleLowerCase('en');
    return v;
  });
  return { text: out, hadValue };
}

// "[[2:abc]]" and "**abc**" -> plain text + styled ranges.
export function parseMarks(s) {
  const ranges = [];
  let text = '';
  const re = /\[\[(\d+):([\s\S]*?)\]\]|\*\*([\s\S]+?)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    text += s.slice(last, m.index);
    const inner = m[2] ?? m[3];
    const run = m[2] != null ? Number(m[1]) : 1;
    // nested ** inside [[k:…]] (e.g. a price with an accent) is treated as plain text
    const clean = inner.replace(/\*\*/g, '');
    ranges.push({ start: text.length, end: text.length + clean.length, run });
    text += clean;
    last = m.index + m[0].length;
  }
  text += s.slice(last);
  return { text, ranges: ranges.filter((r) => r.end > r.start) };
}

const ACCENT = { textFills: ['#CE5E64'] };

// ------------------------------------------------------------------ running the CLI
function cli(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(CLI, args, { cwd, timeout: 120_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        if (err.code === 'ENOENT') return reject(new HttpError(503, `figcraft-cli not found (${CLI}). Set FIGCRAFT_CLI or install FigCraft.`));
        const failed = String(stdout).split('\n').find((l) => l.includes('"ok":false'));
        return reject(new HttpError(500, `figcraft-cli ${args[0]}: ${failed || stderr || err.message}`.slice(0, 800)));
      }
      resolve(String(stdout));
    });
  });
}

const results = (stdout) =>
  stdout.split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));

// ------------------------------------------------------------------ building the offer document
// slides: [{ id, frame, data, items: { blocks: [...], lines: [...] }, picks: { set: [{ comp, data }] } }]
//   comp = component from parsed.components (same library document), data = overrides of {{…}} fields
// templateBuf/parsed: the library document (all slide files merged into one).
async function build({ templateBuf, parsed, slides, offer, dir }) {
  const frames = {};
  for (const f of parsed.frames) frames[f.name] ??= f;
  for (const s of slides) {
    if (!frames[s.frame]) throw new HttpError(400, `No slide "${s.frame}" in the library`);
  }
  await writeFile(join(dir, 'template.figcraft'), templateBuf);

  // Pass 1: frame copies on a new "offer" page (in offer order, in one row)
  // + extra slots; at the end all library pages are deleted.
  const p1 = [{ command: 'page.add', as: 'out', params: { name: 'offer' } }];
  const extras = []; // {slide, slotId, count}
  let x = 0;
  slides.forEach((s, i) => {
    const f = frames[s.frame];
    const copyId = { $ref: `s${i}`, field: 'ids/0' };
    p1.push({ command: 'edit.duplicate', as: `s${i}`, params: { ids: [f.id], dx: 0, dy: 0, map: true } });
    p1.push({ command: 'object.moveToPage', params: { ids: [copyId], page: { $ref: 'out' } } });
    p1.push({ command: 'node.set', params: { ids: [copyId], props: { name: `slide-${String(i + 1).padStart(3, '0')}`, x, y: 0 } } });
    x += f.width + 200;
    for (const source of f.fields.sources) {
      const group = f.slots.filter((sl) => sl.source === source);
      const need = (s.items[source] || []).length - group.length;
      const lastSlot = group.at(-1);
      for (let k = 0; k < need; k++) {
        const prev = k === 0 ? { $ref: `s${i}`, field: `map/${lastSlot.id}` } : { $ref: `x${i}_${source}_${k - 1}`, field: 'ids/0' };
        p1.push({ command: 'edit.duplicate', as: `x${i}_${source}_${k}`, params: { ids: [prev], map: true } });
      }
      if (need > 0) extras.push({ slide: i, source, count: need, lastSlot: lastSlot.id });
    }
    // Components: copies of the set's cards replace the #pick slots (in pick order),
    // and the slots are removed. Without picks the slots stay as drawn.
    for (const [set, chosen] of Object.entries(s.picks || {})) {
      const group = f.picks.filter((p) => p.set === set);
      if (!group.length || !chosen.length) continue;
      const first = group[0];
      chosen.forEach((pick, j) => {
        const as = `p${i}_${set}_${j}`;
        const copyRef = { $ref: as, field: 'ids/0' };
        p1.push({ command: 'edit.duplicate', as, params: { ids: [pick.comp.node], map: true } });
        p1.push({ command: 'node.reparent', params: { ids: [copyRef], parent: { $ref: `s${i}`, field: `map/${first.parent}` }, index: first.index + j } });
        const props = { visible: true };
        if (first.grid) Object.assign(props, { gridColumn: null, gridRow: null });
        if (first.sizingH) props.sizingH = first.sizingH;
        p1.push({ command: 'node.set', params: { ids: [copyRef], props } });
      });
      p1.push({ command: 'edit.delete', params: { ids: group.map((p) => ({ $ref: `s${i}`, field: `map/${p.id}` })) } });
    }
  });
  p1.push({ command: 'page.select', params: { id: { $ref: 'out' } } });
  for (const page of parsed.pages) p1.push({ command: 'page.delete', params: { id: page } });
  await writeFile(join(dir, 'pass1.json'), JSON.stringify(p1));
  const r1 = results(await cli(['run', 'pass1.json', '--in', 'template.figcraft', '--out', 'pass1.figcraft'], dir));
  const byName = {};
  p1.forEach((step, idx) => { if (step.as) byName[step.as] = r1[idx]?.result; });

  // Pass 2: content.
  const p2 = [];
  slides.forEach((s, i) => {
    const f = frames[s.frame];
    const map = byName[`s${i}`].map;
    const ctx = { data: s.data || {}, offer };
    const copy = (origId) => map[String(origId)];

    // slots: list of [orig -> copy id maps] in fill order
    const slotMaps = {};
    for (const source of f.fields.sources) {
      const group = f.slots.filter((sl) => sl.source === source);
      const list = group.map((sl) => ({ orig: sl.id, idOf: (o) => copy(o) }));
      const ex = extras.find((e) => e.slide === i && e.source === source);
      if (ex) {
        // chain: copy of the last slot -> x0 -> x1 …; inner layer id = composition of the maps
        let resolveId = (o) => copy(o);
        for (let k = 0; k < ex.count; k++) {
          const m = byName[`x${i}_${source}_${k}`].map;
          const parent = resolveId;
          resolveId = (o) => m[String(parent(o))];
          list.push({ orig: ex.lastSlot, idOf: resolveId });
        }
      }
      slotMaps[source] = list;

      const items = s.items[source] || [];
      list.forEach((slot, idx) => {
        const slotId = slot.idOf(slot.orig);
        const props = { visible: idx < items.length };
        if (group[0]?.grid) Object.assign(props, { gridColumn: null, gridRow: null });
        p2.push({ command: 'node.set', params: { ids: [slotId], props } });
      });
    }

    for (const t of f.texts) {
      let targetIds;
      let ctxs;
      if (t.slot == null) {
        targetIds = [copy(t.id)];
        ctxs = [ctx];
      } else {
        // Text from a given template slot; extra slots are copies of the last one, so they match it too.
        const sl = f.slots.find((x) => x.id === t.slot);
        const items = s.items[sl.source] || [];
        targetIds = [];
        ctxs = [];
        slotMaps[sl.source].forEach((slot, idx) => {
          if (slot.orig !== sl.id || idx >= items.length) return;
          targetIds.push(slot.idOf(t.id));
          ctxs.push({ ...ctx, ...items[idx], n: idx + 1 });
        });
      }
      targetIds.forEach((id, k) => {
        const { text: raw, hadValue } = fill(t.name, ctxs[k]);
        const { text, ranges } = parseMarks(raw);
        if (!hadValue && /\{\{/.test(t.name)) {
          p2.push({ command: 'node.set', params: { ids: [id], props: { visible: false } } });
          return;
        }
        p2.push({ command: 'text.set', params: { id, characters: text } });
        for (const r of ranges) {
          const style = t.runs[r.run - 1] || ACCENT;
          p2.push({ command: 'text.style', params: { id, start: r.start, end: r.end, ...style } });
        }
      });
    }

    // Texts in components: only fields that have a value (override from the pick or from the database);
    // the rest stays as drawn in FigCraft.
    for (const [set, chosen] of Object.entries(s.picks || {})) {
      if (!f.picks.some((p) => p.set === set)) continue;
      chosen.forEach((pick, j) => {
        const cmap = byName[`p${i}_${set}_${j}`].map;
        for (const t of pick.comp.texts) {
          const { text: raw, hadValue } = fill(t.name, { ...ctx, ...pick.data, n: j + 1 });
          if (!hadValue) continue;
          const id = cmap[String(t.id)];
          const { text, ranges } = parseMarks(raw);
          p2.push({ command: 'text.set', params: { id, characters: text } });
          for (const r of ranges) p2.push({ command: 'text.style', params: { id, start: r.start, end: r.end, ...(t.runs[r.run - 1] || ACCENT) } });
        }
      });
    }
  });
  await writeFile(join(dir, 'pass2.json'), JSON.stringify(p2));
  await cli(['run', 'pass2.json', '--in', 'pass1.figcraft', '--out', 'offer.figcraft'], dir);
  return join(dir, 'offer.figcraft');
}

// ------------------------------------------------------------------ module API
let seq = 0;
async function workdir(kind) {
  const dir = join(WORK, `${kind}-${Date.now()}-${process.pid}-${seq++}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function renderFigcraft(input) {
  const dir = await workdir('fc');
  try {
    const file = await build({ ...input, dir });
    return await readFile(file);
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function renderPdf(input) {
  const dir = await workdir('pdf');
  try {
    await build({ ...input, dir });
    await cli(['export', 'offer.figcraft', '-o', 'offer.pdf'], dir);
    return await readFile(join(dir, 'offer.pdf'));
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Preview: a PNG of every slide. Returns { key, files: [Buffer in slide order] }.
export async function renderPreview(input, { scale = 0.5 } = {}) {
  const dir = await workdir('png');
  try {
    await build({ ...input, dir });
    await cli(['export', 'offer.figcraft', '-o', 'png', '--format', 'png', '--scale', String(scale)], dir);
    const names = (await readdir(join(dir, 'png'))).filter((n) => n.endsWith('.png')).sort();
    return Promise.all(names.map((n) => readFile(join(dir, 'png', n))));
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export const hashOf = (obj) => createHash('sha1').update(JSON.stringify(obj)).digest('hex').slice(0, 16);

// ------------------------------------------------------------------ slide library
// Formats FigCraft can open; everything is converted to .figcraft on upload.
export const UPLOAD_EXT = ['.figcraft', '.json', '.fig', '.penpot', '.sketch', '.svg'];

export async function normalizeUpload(buf, filename) {
  const ext = (/\.[a-z]+$/i.exec(filename || '')?.[0] || '').toLowerCase();
  if (!UPLOAD_EXT.includes(ext)) throw new HttpError(400, `Unsupported file "${filename}". Allowed: ${UPLOAD_EXT.join(', ')}`);
  if (ext === '.figcraft') return buf;
  const dir = await workdir('conv');
  try {
    await writeFile(join(dir, `in${ext}`), buf);
    await cli(['convert', `in${ext}`, 'out.figcraft'], dir).catch((e) => {
      throw new HttpError(400, `FigCraft could not open "${filename}": ${e.message}`);
    });
    return await readFile(join(dir, 'out.figcraft'));
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// All slide files merged into one document (pages appended with file.import).
export async function buildLibrary(sources) {
  if (!sources.length) throw new HttpError(400, 'The slide library is empty: upload a slide file');
  if (sources.length === 1) return { buf: sources[0].file, parsed: parseTemplate(sources[0].file) };
  const dir = await workdir('lib');
  try {
    const steps = [];
    for (const [i, s] of sources.entries()) {
      await writeFile(join(dir, `src${i}.figcraft`), s.file);
      if (i > 0) steps.push({ command: 'file.import', params: { path: join(dir, `src${i}.figcraft`) } });
    }
    await writeFile(join(dir, 'import.json'), JSON.stringify(steps));
    await cli(['run', 'import.json', '--in', 'src0.figcraft', '--out', 'library.figcraft'], dir);
    const buf = await readFile(join(dir, 'library.figcraft'));
    return { buf, parsed: parseTemplate(buf) };
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Thumbnails of all slides in one file: { frameName: PNG Buffer }.
export async function renderThumbnails(buf, parsed, { scale = 0.25 } = {}) {
  const dir = await workdir('thumb');
  try {
    await writeFile(join(dir, 'src.figcraft'), buf);
    // slides under the frame name, components under "@<id>" (cards are smaller, so a larger scale)
    const items = [
      ...parsed.frames.map((f) => ({ key: f.name, id: f.id, scale })),
      ...parsed.components.map((c) => ({ key: `@${c.id}`, id: c.node, scale: scale * 2 })),
    ];
    const steps = items.map((it, i) => ({
      command: 'file.export',
      params: { ids: [it.id], format: 'png', scale: it.scale, path: join(dir, `t${i}.png`) },
    }));
    await writeFile(join(dir, 'thumbs.json'), JSON.stringify(steps));
    await cli(['run', 'thumbs.json', '--in', 'src.figcraft'], dir);
    const out = {};
    for (const [i, it] of items.entries()) out[it.key] ??= await readFile(join(dir, `t${i}.png`)).catch(() => null);
    return out;
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
