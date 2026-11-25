// Card picking by Claude.
//
// The input is what a human sees in the "Components" tab: card descriptions from SQLite (what it shows,
// when to pick it, when to avoid it, topic, variant), set rules and the text drawn in FigCraft, plus
// the offer context (client, variables, salesperson's brief, slide content). Output: a list of card ids
// for the slots and a short reason. Optionally the AI can rewrite a card's {{…}} fields for the client.
//
// Key: ANTHROPIC_API_KEY (or an `ant auth login` profile). Model: STUDIO_AI_MODEL (default claude-opus-5-5).
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { HttpError } from './db.js';

const MODEL = process.env.STUDIO_AI_MODEL || 'claude-opus-5-5';

let client = null;
const getClient = () => (client ??= new Anthropic());

const SYSTEM = `You are an experienced salesperson and B2B offer editor for Gaius Vault (private Legal AI for in-house legal departments and law firms).
You are assembling an offer slide from ready-made cards designed in Figma. Each card has a description: what it shows, when to pick it, when to avoid it, its topic and its variant.

Rules:
- Pick exactly as many cards as the set has slots (the "slots" field), unless the set rules say otherwise.
- Follow the "use_when" and "avoid_when" descriptions and the client context. Do not guess facts about the client that are not in the context.
- Take at most one card per topic ("topic") (variants are the same argument with a different look).
- Follow the set rules ("rules").
- Order matters: cards are laid out in rows from left to right; put the strongest arguments for this client first.
- Write the reason ("reason") in English, one sentence, specific to this client.
- Leave the cards' text fields (e.g. title, body) as null, unless the salesperson's brief asks for tailored text or the card as-is would be untrue for this client. Write any new text in English, at a length similar to the original ("figma_text").`;

// sets: [{ set, slots, rules, components: [{ id, title, description, use_when, avoid_when, topic, variant, tags, figma_text, fields }] }]
// `api` only in tests (mock client).
export async function pickComponents({ offer, slide, brief, sets, api = null }) {
  const usable = sets.filter((s) => s.components.length);
  if (!usable.length) throw new HttpError(400, 'The set has no components in the library');

  const fieldNames = [...new Set(usable.flatMap((s) => s.components.flatMap((c) => c.fields)))].filter((f) => /^[a-z_][a-z0-9_]*$/i.test(f) && f !== 'n');
  const allIds = usable.flatMap((s) => s.components.map((c) => c.id));
  const Pick = z.object({
    component: z.enum(allIds),
    reason: z.string(),
    ...Object.fromEntries(fieldNames.map((f) => [f, z.string().nullable()])),
  });
  const Output = z.object({
    sets: z.array(z.object({ set: z.enum(usable.map((s) => s.set)), picks: z.array(Pick) })),
    note: z.string(),
  });

  const context = {
    offer: { name: offer.name, ...offer.data },
    brief: brief || null,
    slide: { frame: slide.frame, data: slide.data },
    sets: usable.map((s) => ({
      set: s.set,
      slots: s.slots,
      rules: s.rules || null,
      components: s.components.map((c) => ({
        id: c.id, title: c.title, topic: c.topic || null, variant: c.variant || null,
        description: c.description || null, use_when: c.use_when || null, avoid_when: c.avoid_when || null,
        tags: c.tags, figma_text: c.figma_text, editable_fields: c.fields,
      })),
    })),
  };

  let res;
  try {
    res = await (api || getClient()).beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(Output) },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Pick the cards for the slide. Context (JSON):\n\n${JSON.stringify(context, null, 2)}`,
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || /api.?key|credentials/i.test(e.message)) {
      throw new HttpError(503, 'No Claude API key: set ANTHROPIC_API_KEY in the offer-studio environment');
    }
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, 'Claude API: rate limited, try again shortly');
    if (e instanceof Anthropic.APIError) throw new HttpError(502, `Claude API ${e.status ?? ''}: ${e.message}`.trim());
    throw e;
  }
  if (res.stop_reason === 'refusal') throw new HttpError(502, 'Claude declined to pick cards for this context');
  if (!res.parsed_output) throw new HttpError(502, `Claude returned no result (stop_reason: ${res.stop_reason})`);

  // Clean-up: only cards from the given set, no repeats, and at most as many as there are slots.
  const warnings = [];
  const picks = {};
  for (const s of usable) {
    const byId = Object.fromEntries(s.components.map((c) => [c.id, c]));
    const got = res.parsed_output.sets.find((x) => x.set === s.set)?.picks || [];
    const seen = new Set();
    const topics = new Set();
    picks[s.set] = [];
    for (const p of got) {
      const c = byId[p.component];
      if (!c) { warnings.push(`${p.component}: not in set ${s.set}`); continue; }
      if (seen.has(c.id)) continue;
      if (c.topic && topics.has(c.topic)) warnings.push(`${c.id}: second variant of topic "${c.topic}"`);
      seen.add(c.id);
      if (c.topic) topics.add(c.topic);
      const data = {};
      for (const f of c.fields) if (typeof p[f] === 'string' && p[f].trim()) data[f] = p[f].trim();
      picks[s.set].push({ component: c.id, reason: p.reason, ...(Object.keys(data).length ? { data } : {}) });
    }
    if (picks[s.set].length > s.slots) {
      warnings.push(`${s.set}: the AI picked ${picks[s.set].length} cards for ${s.slots} slots, extras dropped`);
      picks[s.set] = picks[s.set].slice(0, s.slots);
    }
    if (picks[s.set].length < s.slots) warnings.push(`${s.set}: picked ${picks[s.set].length} of ${s.slots} cards`);
  }
  return { picks, note: res.parsed_output.note, warnings, model: res.model, usage: res.usage };
}

// ------------------------------------------------------------------ lead analysis (for the n8n workflow)
// n8n runs the whole offer process. When we know something about a lead (an email, a call transcript,
// a meeting note) it calls this endpoint to pull out the segment, the decision-maker role and the
// concerns. When we know nothing, n8n does not call it and uses its defaults.
export const SEGMENTS = ['law-firm', 'in-house', 'public-sector', 'other'];
export const ROLES = ['champion', 'board'];

const LEAD_SYSTEM = `You analyze a message from a prospective client of Gaius-Lex (private Legal AI, the Gaius Vault product).
We prepare offers for three segments only:
- "law-firm": a law firm,
- "in-house": a legal department inside a company,
- "public-sector": public administration (a city hall, a municipality, a public institution).
Mark any other organization as "other". If the text does not tell you the segment, return null.

Each offer is written for one of two readers:
- "champion": the person who wants to bring AI into the team and has to win over colleagues and the board,
- "board": the board, the managing partners or the head of the office, whoever signs the decision.
If the text does not tell you which, return null.

Rules:
- Do not guess facts that are not in the text. An empty field is better than an invented one.
- "concerns": at most 3 concerns the client has about AI, short, in the language the client writes in.
- "summary": one sentence in English: who the client is and what they need.
- Treat "hints" from n8n (e.g. the segment picked on the website) as certain unless the text plainly contradicts them.`;

export async function analyzeLead({ text, hints = {}, api = null }) {
  const Output = z.object({
    segment: z.enum(SEGMENTS).nullable(),
    role: z.enum(ROLES).nullable(),
    client: z.string().nullable().describe('Name of the client organization, if given'),
    person: z.string().nullable().describe('Name or job title of the person writing, if given'),
    country: z.string().nullable(),
    concerns: z.array(z.string()),
    summary: z.string(),
  });

  let res;
  try {
    res = await (api || getClient()).beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(Output) },
      system: LEAD_SYSTEM,
      messages: [{
        role: 'user',
        content: `Hints from n8n (JSON): ${JSON.stringify(hints)}\n\nText from the client:\n<lead>\n${text}\n</lead>`,
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || /api.?key|credentials/i.test(e.message)) {
      throw new HttpError(503, 'No Claude API key: set ANTHROPIC_API_KEY in the offer-studio environment');
    }
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, 'Claude API: rate limited, try again shortly');
    if (e instanceof Anthropic.APIError) throw new HttpError(502, `Claude API ${e.status ?? ''}: ${e.message}`.trim());
    throw e;
  }
  if (res.stop_reason === 'refusal') throw new HttpError(502, 'Claude declined to analyze this text');
  if (!res.parsed_output) throw new HttpError(502, `Claude returned no result (stop_reason: ${res.stop_reason})`);
  const out = res.parsed_output;
  return { ...out, concerns: out.concerns.slice(0, 3), model: res.model };
}
