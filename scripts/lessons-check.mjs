#!/usr/bin/env node
// Does a lesson change what the model does? Compares two determinism runs (before and after the team added lessons)
// on what the lessons are about, and lists the lessons each offer was made with.
//
//   node scripts/determinism.mjs --label before …   (no lessons)
//   … add lessons in Offer Studio ▸ Lessons (or turn a correction into one) …
//   node scripts/determinism.mjs --label after …
//   node scripts/lessons-check.mjs bench/determinism-before.json bench/determinism-after.json
//
// Checks, per enquiry: the share of runs per role and product (plan lessons are usually about these), and how many
// decks use a word the team asked to avoid (--avoid "board" --segment law-firm: only decks for that segment).
// STUDIO / STUDIO_PASSWORD as in determinism.mjs. No dependencies; Node 18+.
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const files = args.filter((a, i) => !a.startsWith('--') && !['--avoid', '--segment'].includes(args[i - 1]));
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const avoid = new RegExp(`\\b(${opt('--avoid', 'board')})\\b`, 'i');
const segment = opt('--segment', 'law-firm');
const STUDIO = String(process.env.STUDIO || 'http://localhost:8082').replace(/\/+$/, '');
const AUTH = process.env.STUDIO_TOKEN ? `Bearer ${process.env.STUDIO_TOKEN}` : `Basic ${Buffer.from(`x:${process.env.STUDIO_PASSWORD || 'studio'}`).toString('base64')}`;
const get = async (p) => (await fetch(`${STUDIO}/api${p}`, { headers: { authorization: AUTH } })).json();

const runs = Object.fromEntries(files.map((f) => [f, JSON.parse(readFileSync(f, 'utf8')).runs.filter((r) => r.ok)]));
const share = (rs, f) => {
  const c = {};
  for (const r of rs) { const v = f(r); c[v] = (c[v] || 0) + 1; }
  return Object.entries(c).map(([k, n]) => `${k} ${n}/${rs.length}`).join(', ');
};
const inputs = [...new Set(Object.values(runs).flat().map((r) => r.input))].filter((i) => Object.values(runs).every((rs) => rs.some((r) => r.input === i)));
for (const input of inputs) {
  console.log(`\n${input}`);
  for (const [f, rs] of Object.entries(runs)) {
    const mine = rs.filter((r) => r.input === input);
    const tile = (cat) => (r) => (r.tiles.find((t) => t.startsWith(`${cat}:`)) || '-').split(':')[1];
    const inSeg = mine.filter((r) => r.tiles.includes(`segment:${segment}`));
    const hits = inSeg.filter((r) => Object.values(r.copy).some((v) => avoid.test(v)));
    console.log(`  ${f.replace(/.*determinism-/, '').replace('.json', '').padEnd(14)} role: ${share(mine, tile('role'))} · product: ${share(mine, tile('product'))}${inSeg.length ? ` · decks with "${avoid.source.slice(3, -3)}": ${hits.length}/${inSeg.length}` : ''}`);
  }
}

// which lessons the offers of the last run were made with
const last = Object.values(runs).at(-1) || [];
const lessons = await get('/lessons');
if (Array.isArray(lessons) && lessons.length) {
  console.log('\nLessons:');
  for (const l of lessons) console.log(`  [${l.kind}] ${l.active ? 'on ' : 'off'} used in ${l.used} offers: ${l.text}`);
  let withLessons = 0;
  for (const r of last) {
    const o = await get(`/offers/${encodeURIComponent(r.offer_id)}`);
    if ((o.data?.lessons_used || []).length) withLessons++;
  }
  console.log(`Offers of the last run made with at least one lesson: ${withLessons}/${last.length}`);
}
