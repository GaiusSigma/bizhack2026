#!/usr/bin/env node
// Sends enquiries to the offer workflow and saves the decks it answers with. No dependencies; Node 18+.
//
//   node scripts/try-it.mjs                                  every file in sample-data/, against your local stack
//   node scripts/try-it.mjs sample-data/landing-voice-energy.json
//   node scripts/try-it.mjs --text-file my-call.txt          your own email or call transcript
//   node scripts/try-it.mjs --text "We are a 10-lawyer firm…"
//   N8N=https://n8n.example.com node scripts/try-it.mjs      another n8n (default http://localhost:5678)
//
// Files named fireflies-*.json go to the Fireflies webhook, which acknowledges at once and builds the deck in the
// background (it lands in Offer Studio). Everything else goes to the website-form webhook, which answers with the PDF.
// Decks are saved to out/.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const N8N = String(process.env.N8N || 'http://localhost:5678').replace(/\/+$/, '');
const wf = JSON.parse(readFileSync(join(ROOT, 'n8n/workflows/offer-studio-deck.json'), 'utf8'));
const hook = (name) => `${N8N}/webhook/${wf.nodes.find((n) => n.name === name).parameters.path}`;
const FORM = hook('Website form');
const FIREFLIES = hook('Transkrypcja z fireflies');
const OUT = join(ROOT, 'out');
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const jobs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--text') jobs.push({ name: 'text', body: { source: 'cli', mode: 'text', touched: ['text'], text: args[++i] } });
  else if (args[i] === '--text-file') {
    const f = args[++i];
    jobs.push({ name: basename(f).replace(/\.\w+$/, ''), body: { source: 'cli', mode: 'text', touched: ['text'], text: readFileSync(f, 'utf8') } });
  } else jobs.push({ name: basename(args[i]).replace(/\.json$/, ''), body: JSON.parse(readFileSync(args[i], 'utf8')) });
}
if (!jobs.length) {
  const dir = join(ROOT, 'sample-data');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) jobs.push({ name: f.replace(/\.json$/, ''), body: JSON.parse(readFileSync(join(dir, f), 'utf8')) });
}

let failed = 0;
for (const job of jobs) {
  const url = job.name.startsWith('fireflies') ? FIREFLIES : FORM;
  const t0 = performance.now();
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(job.body), signal: AbortSignal.timeout(300_000) });
    const s = ((performance.now() - t0) / 1000).toFixed(1);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    if ((res.headers.get('content-type') || '').includes('application/pdf')) {
      const file = join(OUT, `${job.name}.pdf`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      console.log(`✓ ${job.name}: ${s} s · ${decodeURIComponent(res.headers.get('x-offer-name') || '')} · ${res.headers.get('x-offer-tiles')} → ${file}`);
    } else {
      console.log(`✓ ${job.name}: ${s} s · ${await res.text()} (deck is built in the background, see Offer Studio)`);
    }
  } catch (e) {
    failed++;
    console.log(`✗ ${job.name}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
