// Renderowanie ofert przez FigCraft.
//
// Szablon to zwykły plik .figcraft. Każda ramka najwyższego poziomu to jeden slajd szablonu
// (nazwa ramki = jego identyfikator). Pola wiąże się NAZWAMI warstw:
//
//   {{data.title}}            treść slajdu (z edytora slajdu)
//   {{offer.client|upper}}    zmienna oferty, opcjonalny filtr upper/lower
//   Efekt: {{effect}}         tekst stały + pole; pusty wynik ukrywa warstwę
//   #item                     slot na blok (karta). Wewnątrz: {{title}}, {{body}}, {{n}}, {{effect}}…
//   #item:lines               slot na wiersz z pola data.lines ("etykieta | wartość" w każdej linii)
//   **tekst**                 w wartości: styl pierwszego wyróżnienia z szablonu (np. czerwony akcent)
//   [[2:tekst]]               w nazwie warstwy: styl drugiego wyróżnienia z szablonu
//   \n                        w nazwie warstwy: nowa linia
//
// Slotów może być więcej niż bloków (nadmiar jest ukrywany) albo mniej (ostatni slot jest
// powielany; w auto-layoucie kolejne karty układają się same).
//
// Render to dwa przebiegi `figcraft-cli run` (1: kopie slajdów i dodatkowe sloty, 2: treść),
// a potem `figcraft-cli export` do PNG (podgląd) albo PDF.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { HttpError } from './db.js';

// figcraft-cli: z FIGCRAFT_CLI, z typowej instalacji FigCraft na Windows albo z PATH (Docker).
const WIN_CLI = 'C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe';
const CLI = process.env.FIGCRAFT_CLI || (process.platform === 'win32' && existsSync(WIN_CLI) ? WIN_CLI : 'figcraft-cli');
const WORK = process.env.RENDER_DIR || join(tmpdir(), 'offer-studio-renders');

const PLACEHOLDER = /\{\{|\[\[/;
const SLOT = /^#item(?::([A-Za-z_][\w]*))?$/;

// ------------------------------------------------------------------ analiza szablonu
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
    throw new HttpError(400, 'To nie jest plik .figcraft (oczekiwano archiwum z document.json)');
  }
  if (!files['document.json']) throw new HttpError(400, 'W pliku .figcraft brakuje document.json');
  const doc = JSON.parse(Buffer.from(files['document.json']).toString('utf8'));
  const N = doc.nodes;
  // Slajdy to ramki najwyższego poziomu ze wszystkich stron (plik może mieć ich kilka).
  const tops = doc.pages.flatMap((pid) =>
    (N[String(pid)]?.children || []).map((fid) => ({ page: Number(pid), frame: N[String(fid)] })))
    .filter((x) => x.frame && x.frame.type === 'frame');

  const frames = tops.map(({ page, frame }) => {
    const texts = []; // {id, name, slot (id slotu albo null), runs}
    const slots = []; // {id, source, parentLayout}
    const walk = (id, slotId) => {
      const n = N[String(id)];
      if (!n) return;
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
      for (const c of n.children || []) walk(c, inSlot);
    };
    walk(frame.id, null);

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
    return {
      id: frame.id,
      page,
      name: frame.name,
      width: frame.width,
      height: frame.height,
      texts,
      slots,
      fields: { data: [...dataKeys], item: [...itemKeys], sources },
    };
  });
  return { name: doc.name, pages: doc.pages.map(Number), frames, images: (doc.imageIndex || []).length };
}

// Krótki opis do API/UI (bez wewnętrznych id).
export const describeTemplate = (parsed) =>
  parsed.frames.map((f) => ({ name: f.name, width: f.width, height: f.height, fields: f.fields, slots: f.slots.length }));

// ------------------------------------------------------------------ wartości i style
function lookup(ctx, path) {
  let v = ctx;
  for (const k of path.split('.')) v = v == null ? undefined : v[k];
  return v;
}

// Markdown z bloków -> zwykły tekst: listy bez znaczników, **wyróżnienia** zostają do stylowania.
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
    if (filter === 'upper') v = v.toLocaleUpperCase('pl');
    if (filter === 'lower') v = v.toLocaleLowerCase('pl');
    return v;
  });
  return { text: out, hadValue };
}

// "[[2:abc]]" i "**abc**" -> czysty tekst + zakresy ze stylem.
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
    // zagnieżdżone ** w [[k:…]] (np. cena z akcentem) traktujemy jako zwykły tekst
    const clean = inner.replace(/\*\*/g, '');
    ranges.push({ start: text.length, end: text.length + clean.length, run });
    text += clean;
    last = m.index + m[0].length;
  }
  text += s.slice(last);
  return { text, ranges: ranges.filter((r) => r.end > r.start) };
}

const ACCENT = { textFills: ['#CE5E64'] };

// ------------------------------------------------------------------ uruchamianie CLI
function cli(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(CLI, args, { cwd, timeout: 120_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        if (err.code === 'ENOENT') return reject(new HttpError(503, `Nie znaleziono figcraft-cli (${CLI}). Ustaw FIGCRAFT_CLI albo zainstaluj FigCraft.`));
        const failed = String(stdout).split('\n').find((l) => l.includes('"ok":false'));
        return reject(new HttpError(500, `figcraft-cli ${args[0]}: ${failed || stderr || err.message}`.slice(0, 800)));
      }
      resolve(String(stdout));
    });
  });
}

const results = (stdout) =>
  stdout.split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));

// ------------------------------------------------------------------ budowa dokumentu oferty
// slides: [{ id, frame, data, items: { blocks: [...], lines: [...] } }]
// templateBuf/parsed: dokument biblioteki (wszystkie pliki ze slajdami sklejone w jeden).
async function build({ templateBuf, parsed, slides, offer, dir }) {
  const frames = {};
  for (const f of parsed.frames) frames[f.name] ??= f;
  for (const s of slides) {
    if (!frames[s.frame]) throw new HttpError(400, `W bibliotece nie ma slajdu "${s.frame}"`);
  }
  await writeFile(join(dir, 'template.figcraft'), templateBuf);

  // Przebieg 1: kopie ramek na nowej stronie „oferta” (w kolejności oferty, w jednym rzędzie)
  // + dodatkowe sloty; na końcu znikają wszystkie strony biblioteki.
  const p1 = [{ command: 'page.add', as: 'out', params: { name: 'oferta' } }];
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
  });
  p1.push({ command: 'page.select', params: { id: { $ref: 'out' } } });
  for (const page of parsed.pages) p1.push({ command: 'page.delete', params: { id: page } });
  await writeFile(join(dir, 'pass1.json'), JSON.stringify(p1));
  const r1 = results(await cli(['run', 'pass1.json', '--in', 'template.figcraft', '--out', 'pass1.figcraft'], dir));
  const byName = {};
  p1.forEach((step, idx) => { if (step.as) byName[step.as] = r1[idx]?.result; });

  // Przebieg 2: treść.
  const p2 = [];
  slides.forEach((s, i) => {
    const f = frames[s.frame];
    const map = byName[`s${i}`].map;
    const ctx = { data: s.data || {}, offer };
    const copy = (origId) => map[String(origId)];

    // sloty: lista [mapa orig->id kopii] w kolejności wypełniania
    const slotMaps = {};
    for (const source of f.fields.sources) {
      const group = f.slots.filter((sl) => sl.source === source);
      const list = group.map((sl) => ({ orig: sl.id, idOf: (o) => copy(o) }));
      const ex = extras.find((e) => e.slide === i && e.source === source);
      if (ex) {
        // łańcuch: kopia ostatniego slotu -> x0 -> x1 …; id warstwy wewnątrz = złożenie map
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
        // Tekst z danego slotu szablonu; dodatkowe sloty są kopiami ostatniego, więc też do niego pasują.
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
  });
  await writeFile(join(dir, 'pass2.json'), JSON.stringify(p2));
  await cli(['run', 'pass2.json', '--in', 'pass1.figcraft', '--out', 'offer.figcraft'], dir);
  return join(dir, 'offer.figcraft');
}

// ------------------------------------------------------------------ API modułu
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

// Podgląd: PNG każdego slajdu. Zwraca { key, files: [Buffer w kolejności slajdów] }.
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

// ------------------------------------------------------------------ biblioteka slajdów
// Formaty, które FigCraft umie otworzyć; wszystko zamieniamy na .figcraft przy wgrywaniu.
export const UPLOAD_EXT = ['.figcraft', '.json', '.fig', '.penpot', '.sketch', '.svg'];

export async function normalizeUpload(buf, filename) {
  const ext = (/\.[a-z]+$/i.exec(filename || '')?.[0] || '').toLowerCase();
  if (!UPLOAD_EXT.includes(ext)) throw new HttpError(400, `Nieobsługiwany plik "${filename}". Dozwolone: ${UPLOAD_EXT.join(', ')}`);
  if (ext === '.figcraft') return buf;
  const dir = await workdir('conv');
  try {
    await writeFile(join(dir, `in${ext}`), buf);
    await cli(['convert', `in${ext}`, 'out.figcraft'], dir).catch((e) => {
      throw new HttpError(400, `FigCraft nie otworzył pliku "${filename}": ${e.message}`);
    });
    return await readFile(join(dir, 'out.figcraft'));
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Wszystkie pliki ze slajdami sklejone w jeden dokument (strony doklejane przez file.import).
export async function buildLibrary(sources) {
  if (!sources.length) throw new HttpError(400, 'Biblioteka slajdów jest pusta: wgraj plik ze slajdami');
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

// Miniatury wszystkich slajdów jednego pliku: { nazwaRamki: Buffer PNG }.
export async function renderThumbnails(buf, parsed, { scale = 0.25 } = {}) {
  const dir = await workdir('thumb');
  try {
    await writeFile(join(dir, 'src.figcraft'), buf);
    const steps = parsed.frames.map((f, i) => ({
      command: 'file.export',
      params: { ids: [f.id], format: 'png', scale, path: join(dir, `t${i}.png`) },
    }));
    await writeFile(join(dir, 'thumbs.json'), JSON.stringify(steps));
    await cli(['run', 'thumbs.json', '--in', 'src.figcraft'], dir);
    const out = {};
    for (const [i, f] of parsed.frames.entries()) out[f.name] ??= await readFile(join(dir, `t${i}.png`)).catch(() => null);
    return out;
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
