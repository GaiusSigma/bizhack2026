// Dobór komponentów przez Claude'a.
//
// Wejście to to samo, co widzi człowiek w zakładce „Komponenty”: opisy kart z SQLite (co pokazuje,
// kiedy wybrać, kiedy nie, temat, wariant), zasady zestawu i tekst narysowany w FigCraft, plus
// kontekst oferty (klient, zmienne, brief handlowca, treść slajdu). Wyjście: lista id kart na sloty
// i krótkie uzasadnienie. Opcjonalnie AI może przepisać pola {{…}} karty pod klienta.
//
// Klucz: ANTHROPIC_API_KEY (albo profil `ant auth login`). Model: STUDIO_AI_MODEL (domyślnie claude-opus-5-5).
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { HttpError } from './db.js';

const MODEL = process.env.STUDIO_AI_MODEL || 'claude-opus-5-5';

let client = null;
const getClient = () => (client ??= new Anthropic());

const SYSTEM = `Jesteś doświadczonym handlowcem i redaktorem ofert B2B dla Gaius Vault (prywatne Legal AI dla działów prawnych i kancelarii).
Składasz slajd oferty z gotowych kart zaprojektowanych w Figmie. Każda karta ma opis: co pokazuje, kiedy ją wybrać, kiedy jej nie wybierać, temat i wariant.

Zasady:
- Wybierz dokładnie tyle kart, ile slotów ma zestaw (pole "slots"), chyba że zasady zestawu mówią inaczej.
- Kieruj się opisami "use_when" i "avoid_when" oraz kontekstem klienta. Nie zgaduj faktów o kliencie, których nie ma w kontekście.
- Z jednego tematu ("topic") bierz najwyżej jedną kartę (warianty to ten sam argument w innym wyglądzie).
- Przestrzegaj zasad zestawu ("rules").
- Kolejność ma znaczenie: karty układają się wierszami od lewej do prawej, najmocniejsze argumenty dla tego klienta daj najwyżej.
- Uzasadnienie ("reason") pisz po polsku, jednym zdaniem, konkretnie pod tego klienta.
- Pola tekstowe kart (np. title, body) zostaw jako null, chyba że handlowiec w briefie prosi o dopasowanie tekstów albo karta bez zmian byłaby nieprawdziwa dla klienta. Nowy tekst ma mieć podobną długość jak oryginał ("figma_text").`;

// sets: [{ set, slots, rules, components: [{ id, title, description, use_when, avoid_when, topic, variant, tags, figma_text, fields }] }]
// `api` tylko w testach (atrapa klienta).
export async function pickComponents({ offer, slide, brief, sets, api = null }) {
  const usable = sets.filter((s) => s.components.length);
  if (!usable.length) throw new HttpError(400, 'Zestaw nie ma żadnych komponentów w bibliotece');

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
        content: `Dobierz karty na slajd. Kontekst (JSON):\n\n${JSON.stringify(context, null, 2)}`,
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || /api.?key|credentials/i.test(e.message)) {
      throw new HttpError(503, 'Brak klucza do Claude API: ustaw ANTHROPIC_API_KEY w środowisku offer-studio');
    }
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, 'Claude API: limit zapytań, spróbuj za chwilę');
    if (e instanceof Anthropic.APIError) throw new HttpError(502, `Claude API ${e.status ?? ''}: ${e.message}`.trim());
    throw e;
  }
  if (res.stop_reason === 'refusal') throw new HttpError(502, 'Claude odmówił doboru kart dla tego kontekstu');
  if (!res.parsed_output) throw new HttpError(502, `Claude nie zwrócił wyniku (stop_reason: ${res.stop_reason})`);

  // Porządki: tylko karty z danego zestawu, bez powtórek i najwyżej tyle, ile slotów.
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
      if (!c) { warnings.push(`${p.component}: spoza zestawu ${s.set}`); continue; }
      if (seen.has(c.id)) continue;
      if (c.topic && topics.has(c.topic)) warnings.push(`${c.id}: drugi wariant tematu „${c.topic}”`);
      seen.add(c.id);
      if (c.topic) topics.add(c.topic);
      const data = {};
      for (const f of c.fields) if (typeof p[f] === 'string' && p[f].trim()) data[f] = p[f].trim();
      picks[s.set].push({ component: c.id, reason: p.reason, ...(Object.keys(data).length ? { data } : {}) });
    }
    if (picks[s.set].length > s.slots) {
      warnings.push(`${s.set}: AI wybrało ${picks[s.set].length} kart na ${s.slots} slotów, nadmiar pominięty`);
      picks[s.set] = picks[s.set].slice(0, s.slots);
    }
    if (picks[s.set].length < s.slots) warnings.push(`${s.set}: wybrano ${picks[s.set].length} z ${s.slots} kart`);
  }
  return { picks, note: res.parsed_output.note, warnings, model: res.model, usage: res.usage };
}
