#!/usr/bin/env node
// Measures the offer workflow on its real runs and writes landing/src/lib/measured.json (the landing's Results).
//
//   N8N_URL=https://n8n.example.com N8N_API_KEY=... node scripts/measure.mjs
//
// Reads every execution of the deck workflow from the n8n public API (n8n ▸ Settings ▸ n8n API creates the key),
// and counts: runs, decks delivered, time from enquiry to PDF, AI tokens and their cost (OpenRouter's current
// price for the model in the workflow), and how often the AI copy passed the checks on the first try.
// No dependencies; Node 18+.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = String(process.env.N8N_URL || '').replace(/\/+$/, '');
const KEY = process.env.N8N_API_KEY || process.env.N8N_PROD_API_KEY;
const WORKFLOW = process.env.N8N_WORKFLOW_ID || 'offerStudioDeck';
const OUT = process.env.MEASURE_OUT || join(ROOT, 'landing/src/lib/measured.json');
if (!BASE || !KEY) {
  console.error('Set N8N_URL and N8N_API_KEY (n8n ▸ Settings ▸ n8n API).');
  process.exit(1);
}

const api = async (path) => {
  const res = await fetch(`${BASE}/api/v1${path}`, { headers: { 'X-N8N-API-KEY': KEY, accept: 'application/json' } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
};

// The model the workflow uses, and its price per token on OpenRouter right now.
const wf = JSON.parse(readFileSync(join(ROOT, 'n8n/workflows/offer-studio-deck.json'), 'utf8'));
const model = wf.nodes.find((n) => /lmChatOpenRouter/.test(n.type))?.parameters?.model;
let price = null;
try {
  const { data } = await (await fetch('https://openrouter.ai/api/v1/models')).json();
  const m = data.find((x) => x.id === model);
  if (m) price = { prompt: Number(m.pricing.prompt), completion: Number(m.pricing.completion) };
} catch { /* offline: cost is left out */ }

const runs = [];
let cursor = '';
do {
  const page = await api(`/executions?workflowId=${encodeURIComponent(WORKFLOW)}&includeData=true&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
  runs.push(...page.data);
  cursor = page.nextCursor || '';
} while (cursor);

const TRIGGERS = { 'Website form': 'landing', 'Transkrypcja z fireflies': 'fireflies', 'Gmail Trigger': 'gmail', Form: 'n8n form' };
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)] : null);
const pct = (xs, p) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(p * xs.length) - 1)] : null);

const rows = runs.map((e) => {
  const rd = e.data?.resultData?.runData || {};
  const trigger = Object.keys(TRIGGERS).find((t) => rd[t]);
  let tokens = { prompt: 0, completion: 0 };
  for (const [name, list] of Object.entries(rd)) {
    if (!/OpenRouter/.test(name)) continue;
    for (const r of list) {
      const s = JSON.stringify(r.data || {});
      for (const m of s.matchAll(/"completionTokens":(\d+),"promptTokens":(\d+)/g)) {
        tokens.completion += Number(m[1]);
        tokens.prompt += Number(m[2]);
      }
    }
  }
  const summary = rd['Podsumowanie']?.[0]?.data?.main?.[0]?.[0]?.json || null;
  return {
    status: e.status,
    source: TRIGGERS[trigger] || 'other',
    deck: !!summary,
    seconds: e.stoppedAt ? (new Date(e.stoppedAt) - new Date(e.startedAt)) / 1000 : null,
    startedAt: e.startedAt,
    tokens,
    written: summary?.written?.length ?? null,
    warnings: summary?.warnings?.length ?? null,
    // 1 = the AI's answers passed every check the first time (tile plan and slide copy)
    firstTry: summary ? (rd['AI Agent']?.length || 0) === 1 && (rd['Sprawdź treść']?.length || 0) === 1 : null,
  };
});

const decks = rows.filter((r) => r.deck && r.seconds != null);
const secs = decks.map((r) => r.seconds);
const tok = decks.map((r) => r.tokens.prompt + r.tokens.completion).filter(Boolean);
const costs = price ? decks.filter((r) => r.tokens.prompt).map((r) => r.tokens.prompt * price.prompt + r.tokens.completion * price.completion) : [];
const round = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const bySource = {};
for (const r of decks) bySource[r.source] = (bySource[r.source] || 0) + 1;
const dates = rows.map((r) => r.startedAt).sort();

const measured = {
  measuredAt: new Date().toISOString(),
  workflow: WORKFLOW,
  model,
  from: dates[0] || null,
  to: dates.at(-1) || null,
  runs: rows.length,
  failed: rows.filter((r) => r.status === 'error' || r.status === 'crashed').length,
  decks: decks.length,
  bySource,
  seconds: { median: round(median(secs)), p90: round(pct(secs, 0.9)), max: round(Math.max(...secs)) },
  tokensPerDeck: median(tok),
  costPerDeckUsd: costs.length ? round(median(costs), 4) : null,
  slidesWrittenMedian: median(decks.map((r) => r.written).filter((x) => x != null)),
  decksWithoutWarnings: decks.filter((r) => r.warnings === 0).length,
  firstTryValid: decks.filter((r) => r.firstTry).length,
};

writeFileSync(OUT, `${JSON.stringify(measured, null, 2)}\n`);
console.log(JSON.stringify(measured, null, 2));
console.log(`\nWritten to ${OUT}`);
