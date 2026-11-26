#!/usr/bin/env node
// Determinism benchmark: the same enquiry, N times, through the whole workflow. How often does it give the same offer?
//
//   node scripts/determinism.mjs                         sample-data/eval/*.json, 5 runs each, local stack
//   node scripts/determinism.mjs --runs 10 --parallel 4 sample-data/eval/03-inhouse-group-copilot.json
//   node scripts/determinism.mjs --label temp0           names the result file (bench/determinism-temp0.json)
//   node scripts/determinism.mjs --label temp0 --landing also puts the summary on the landing (/how-it-works),
//                                                        landing/src/lib/determinism.json, under that label
//
//   N8N=http://localhost:5678  STUDIO=http://localhost:8082  STUDIO_PASSWORD=studio   (defaults)
//   STUDIO_TOKEN=…  instead of the password (Bearer, e.g. the token n8n uses)
//
// Two layers are measured separately, because only one of them is a model:
//   1. Offer Studio (no AI): the same tiles must give the same deck, slide for slide. Checked by building each tile
//      set the runs produced 3 more times straight through the API (POST /api/offers/generate) and comparing.
//   2. The model (tile plan and slide copy): per enquiry, how many runs agree on role, segment, product, the main pain,
//      the whole tile set and the client name; how alike the written copy is (share of words in common, pairwise);
//      whether the optional comparison slide is shown or hidden the same way.
// Results: bench/determinism-<label>.json (every run) and a summary printed as a table.
// Runs go to the website-form webhook (files named fireflies-* are skipped: that webhook answers before the deck).
// No dependencies; Node 18+.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const N8N = String(process.env.N8N || 'http://localhost:5678').replace(/\/+$/, '');
const STUDIO = String(process.env.STUDIO || 'http://localhost:8082').replace(/\/+$/, '');
const AUTH = process.env.STUDIO_TOKEN
  ? `Bearer ${process.env.STUDIO_TOKEN}`
  : `Basic ${Buffer.from(`bench:${process.env.STUDIO_PASSWORD || 'studio'}`).toString('base64')}`;
const wf = JSON.parse(readFileSync(join(ROOT, 'n8n/workflows/offer-studio-deck.json'), 'utf8'));
const FORM = `${N8N}/webhook/${wf.nodes.find((n) => n.name === 'Website form').parameters.path}`;

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
let runs = 5;
let parallel = 3;
let label = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
let landing = false;
const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--runs') runs = Number(args[++i]);
  else if (args[i] === '--parallel') parallel = Number(args[++i]);
  else if (args[i] === '--label') label = args[++i];
  else if (args[i] === '--landing') landing = true;
  else files.push(args[i]);
}
if (!files.length) {
  const dir = join(ROOT, 'sample-data/eval');
  files.push(...readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => join(dir, f)));
}
const inputs = files
  .filter((f) => !basename(f).startsWith('fireflies') && !/fireflies/.test(JSON.parse(readFileSync(f, 'utf8')).source || ''))
  .map((f) => ({ name: basename(f).replace(/\.json$/, ''), body: JSON.parse(readFileSync(f, 'utf8')) }))
  .filter((x) => !x.body.data?.transcript && !x.body.meetingId);

// ---------------------------------------------------------------- helpers
const studio = async (path, init = {}) => {
  const res = await fetch(`${STUDIO}/api${path}`, { ...init, headers: { authorization: AUTH, 'content-type': 'application/json', ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`Offer Studio ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
};
const words = (s) => new Set(String(s || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
const jaccard = (a, b) => {
  if (!a.size && !b.size) return 1;
  let both = 0;
  for (const x of a) if (b.has(x)) both++;
  return both / (a.size + b.size - both);
};
const pairs = (xs) => xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b]));
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)] : null);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
// share of runs that agree with the most common answer (1 = every run the same)
const agreement = (xs) => {
  if (!xs.length) return null;
  const counts = new Map();
  for (const x of xs) counts.set(x, (counts.get(x) || 0) + 1);
  return Math.max(...counts.values()) / xs.length;
};
const flat = (v) => (Array.isArray(v) ? v.map((it) => (it && typeof it === 'object' ? Object.values(it).join(' | ') : String(it))).join('\n') : String(v ?? ''));

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

// ---------------------------------------------------------------- one run
async function runOnce(input, k) {
  const t0 = performance.now();
  let res;
  for (let waited = 0; ; waited += 5) {
    res = await fetch(FORM, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input.body), signal: AbortSignal.timeout(300_000) }).catch((e) => e);
    const notYet = res instanceof Error || res.status === 404 || res.status === 502;
    if (!notYet || waited >= 90) break;
    await new Promise((ok) => setTimeout(ok, 5000));
  }
  const seconds = (performance.now() - t0) / 1000;
  if (res instanceof Error) return { input: input.name, k, ok: false, error: res.message, seconds };
  if (!res.ok || !(res.headers.get('content-type') || '').includes('pdf')) {
    return { input: input.name, k, ok: false, error: `HTTP ${res.status} ${(await res.text()).slice(0, 200)}`, seconds };
  }
  await res.arrayBuffer();
  const id = res.headers.get('x-offer-id');
  const tiles = String(res.headers.get('x-offer-tiles') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const offer = await studio(`/offers/${encodeURIComponent(id)}`);
  const content = await studio(`/offers/${encodeURIComponent(id)}/content`);
  const copy = {};
  for (const s of content.slides || []) for (const [f, def] of Object.entries(s.fields || {})) copy[`${s.step}.${f}`] = flat(def.current);
  const hidden = Object.fromEntries((offer.slides || []).filter((s) => s.origin?.step).map((s) => [s.origin.step, !!s.hidden]));
  return { input: input.name, k, ok: true, seconds, offer_id: id, client: offer.data?.client || '', tiles, copy, hidden };
}

// ---------------------------------------------------------------- layer 1: Offer Studio is deterministic
const signature = (offer) => JSON.stringify((offer.slides || []).map((s) => [s.frame, s.origin?.step || '', s.block_ids, s.query, s.picks, s.hidden, s.data]));
async function studioLayer(tileSets) {
  const sets = [...new Map(tileSets.map((t) => [t.join(','), t])).values()];
  let identical = 0;
  for (const tiles of sets) {
    const sigs = [];
    for (let i = 0; i < 3; i++) {
      const o = await studio('/offers/generate', { method: 'POST', body: JSON.stringify({ client: 'Determinism check', tiles }) });
      sigs.push(signature(o));
      await studio(`/offers/${encodeURIComponent(o.id)}`, { method: 'DELETE' });
    }
    if (sigs.every((s) => s === sigs[0])) identical++;
  }
  return { tileSets: sets.length, identical };
}

// ---------------------------------------------------------------- main
console.log(`${inputs.length} enquiries × ${runs} runs, ${parallel} at a time → ${FORM}`);
const jobs = inputs.flatMap((input) => Array.from({ length: runs }, (_, k) => ({ input, k })));
const started = Date.now();
const results = await pool(jobs, parallel, async ({ input, k }) => {
  const r = await runOnce(input, k).catch((e) => ({ input: input.name, k, ok: false, error: e.message }));
  console.log(`${r.ok ? '✓' : '✗'} ${input.name} #${k + 1} ${r.seconds ? `${r.seconds.toFixed(1)} s` : ''} ${r.ok ? r.tiles.join(',') : r.error}`);
  return r;
});

const perInput = inputs.map((input) => {
  const rs = results.filter((r) => r.input === input.name && r.ok);
  const role = (r) => r.tiles.find((t) => t.startsWith('role:')) || '';
  const seg = (r) => r.tiles.find((t) => t.startsWith('segment:')) || '';
  const prod = (r) => r.tiles.find((t) => t.startsWith('product:')) || '';
  const pains = (r) => r.tiles.filter((t) => t.startsWith('pain:'));
  const fields = [...new Set(rs.flatMap((r) => Object.keys(r.copy)))];
  const fieldSim = Object.fromEntries(fields.map((f) => {
    const ps = pairs(rs.map((r) => r.copy[f] ?? ''));
    return [f, { words: r2(mean(ps.map(([a, b]) => jaccard(words(a), words(b))))), exact: r2(mean(ps.map(([a, b]) => (a === b ? 1 : 0)))) }];
  }));
  const steps = [...new Set(rs.flatMap((r) => Object.keys(r.hidden)))];
  return {
    input: input.name,
    runs: rs.length,
    failed: results.filter((r) => r.input === input.name && !r.ok).length,
    seconds: { median: r2(median(rs.map((r) => r.seconds))), min: r2(Math.min(...rs.map((r) => r.seconds))), max: r2(Math.max(...rs.map((r) => r.seconds))) },
    plan: {
      role: r2(agreement(rs.map(role))),
      segment: r2(agreement(rs.map(seg))),
      product: r2(agreement(rs.map(prod))),
      mainPain: r2(agreement(rs.map((r) => pains(r)[0] || ''))),
      painSet: r2(mean(pairs(rs.map((r) => new Set(pains(r)))).map(([a, b]) => jaccard(a, b)))),
      wholeTileSet: r2(agreement(rs.map((r) => [...r.tiles].sort().join(',')))),
      variants: [...new Set(rs.map((r) => r.tiles.join(',')))],
    },
    client: { agreement: r2(agreement(rs.map((r) => r.client))), names: [...new Set(rs.map((r) => r.client))] },
    slidesShown: r2(mean(steps.map((s) => agreement(rs.map((r) => String(r.hidden[s])))))),
    copy: {
      words: r2(mean(Object.values(fieldSim).map((x) => x.words))),
      exact: r2(mean(Object.values(fieldSim).map((x) => x.exact))),
      fields: fieldSim,
    },
  };
});

const ok = results.filter((r) => r.ok);
const studioCheck = await studioLayer(ok.map((r) => r.tiles)).catch((e) => ({ error: e.message }));
const avg = (f) => r2(mean(perInput.filter((p) => p.runs > 1).map(f).filter((x) => x != null)));
const summary = {
  label,
  measuredAt: new Date().toISOString(),
  model: wf.nodes.find((n) => /lmChatOpenRouter/.test(n.type))?.parameters?.model,
  modelOptions: wf.nodes.filter((n) => /lmChatOpenRouter/.test(n.type)).map((n) => ({ node: n.name, ...n.parameters.options })),
  enquiries: inputs.length,
  runsPerEnquiry: runs,
  runs: results.length,
  failed: results.length - ok.length,
  minutes: r2((Date.now() - started) / 60000),
  studio: studioCheck,
  plan: {
    role: avg((p) => p.plan.role),
    segment: avg((p) => p.plan.segment),
    product: avg((p) => p.plan.product),
    mainPain: avg((p) => p.plan.mainPain),
    painSet: avg((p) => p.plan.painSet),
    wholeTileSet: avg((p) => p.plan.wholeTileSet),
  },
  client: avg((p) => p.client.agreement),
  slidesShown: avg((p) => p.slidesShown),
  copy: { words: avg((p) => p.copy.words), exact: avg((p) => p.copy.exact) },
  seconds: { median: r2(median(ok.map((r) => r.seconds))), max: r2(Math.max(...ok.map((r) => r.seconds))) },
};

mkdirSync(join(ROOT, 'bench'), { recursive: true });
const file = join(ROOT, 'bench', `determinism-${label}.json`);
writeFileSync(file, `${JSON.stringify({ summary, perInput, runs: results }, null, 2)}\n`);
if (landing) {
  const out = join(ROOT, 'landing/src/lib/determinism.json');
  let all = {};
  try { all = JSON.parse(readFileSync(out, 'utf8')); } catch { /* first run */ }
  all[label] = summary;
  writeFileSync(out, `${JSON.stringify(all, null, 2)}\n`);
}

const pc = (x) => (x == null ? '  –' : `${Math.round(x * 100)}%`.padStart(4));
console.log(`\nSame answer across ${runs} runs of the same enquiry (share of runs that agree with the most common answer):`);
console.log('enquiry                              role  segm  prod  pain1 pains tiles client shown copy  s');
for (const p of perInput) {
  console.log(`${p.input.padEnd(36).slice(0, 36)} ${pc(p.plan.role)}  ${pc(p.plan.segment)}  ${pc(p.plan.product)}  ${pc(p.plan.mainPain)}  ${pc(p.plan.painSet)}  ${pc(p.plan.wholeTileSet)}  ${pc(p.client.agreement)}  ${pc(p.slidesShown)}  ${pc(p.copy.words)}  ${p.seconds.median}`);
}
const s = summary;
console.log(`${'average'.padEnd(36)} ${pc(s.plan.role)}  ${pc(s.plan.segment)}  ${pc(s.plan.product)}  ${pc(s.plan.mainPain)}  ${pc(s.plan.painSet)}  ${pc(s.plan.wholeTileSet)}  ${pc(s.client)}  ${pc(s.slidesShown)}  ${pc(s.copy.words)}  ${s.seconds.median}`);
console.log(`\nOffer Studio (no AI): ${s.studio.error ? `not checked (${s.studio.error})` : `${s.studio.identical} of ${s.studio.tileSets} tile sets gave the identical deck 3 times out of 3`}`);
console.log(`Copy: ${pc(s.copy.words)} of words in common between two runs (pairwise, per field), ${pc(s.copy.exact)} of fields word for word the same.`);
console.log(`Runs: ${s.runs}, failed ${s.failed}, ${s.minutes} min. Written to ${file}`);
