# Determinism: same enquiry, same offer?

A sales team can only trust a generator that gives the same offer to the same enquiry. We measured how far ours does,
changed what made it drift, and added a way for the team to settle the cases where the model cannot decide by itself
(lessons, below). Every number here comes from `scripts/determinism.mjs`; every run is in `bench/`.

## Method

- **Inputs:** the 9 test enquiries in `sample-data/eval/` that go through the website webhook (the Fireflies one
  answers before the deck is built, so it is left out): a law-firm board, a solo advocate, a construction group,
  a ministry, an international firm in English, an empty Gmail enquiry, an off-target bakery, a prompt injection and
  a champion with numbers and a deadline.
- **Runs:** each enquiry 5 times through the whole production workflow (local stack, same code and model as
  production), 3 at a time. 45 runs per configuration.
- **Two layers, measured separately:**
  1. **Offer Studio (no AI):** every tile set the runs produced is built 3 more times straight through
     `POST /api/offers/generate` and compared slide by slide (template, step, blocks, cards, copy, hidden).
  2. **The model:** per enquiry, the share of runs that agree with the most common answer for role, segment,
     product, the main pain, the whole tile set and the client name; the overlap of the pain sets (pairwise Jaccard);
     whether the optional comparison slide is shown the same way; and for the slide copy, the share of words two runs
     have in common (pairwise, per field) and how many fields are word for word the same.

```bash
node scripts/determinism.mjs --runs 5 --label final            # all of sample-data/eval, local stack
node scripts/determinism.mjs --label x path/to/enquiry.json     # your own enquiries
N8N=https://n8n.example.com STUDIO=https://studio.example.com STUDIO_TOKEN=… node scripts/determinism.mjs
node scripts/lessons-check.mjs bench/determinism-a.json bench/determinism-b.json   # roles, products, words to avoid
```

## Results

| Share of runs that agree | Before | Temperature 0 | Now (temperature 0 + rules fixed) |
|---|---|---|---|
| Role | 98% | 96% | 96% |
| Segment | 100% | 100% | 100% |
| Product | 98% | 98% | 96% |
| Main pain | 84% | 96% | 96% |
| All pains (overlap) | 84% | 93% | 90% |
| The whole tile set | 84% | 89% | 84% |
| Client name on the deck | 98% | 100% | 100% |
| Optional slides shown or hidden | 100% | 100% | 100% |
| Slide copy: words in common | 63% | 68% | 69% |
| Slide copy: fields word for word the same | 30% | 34% | 37% |
| Median seconds per deck | 10.0 | 10.3 | 10.6 |
| Failed runs | 0 / 45 | 0 / 45 | 0 / 45 |
| **Offer Studio: identical deck from the same tiles** | 15 / 15 | 13 / 13 | 14 / 14 |

Files: `bench/determinism-baseline.json`, `-temp0.json`, `-final.json`.

**Offer Studio is deterministic.** Every tile set gave the same deck 3 times out of 3, in every configuration.
Once the tiles are chosen, the offer is fixed: the same slides, the same blocks, the same default copy.

**The model is not, and the drift is concentrated.** Segment never changed. Role and product changed on the
enquiries that are genuinely ambiguous (03: a head of legal who "decides with the group board"; 04: a ministry
department). The pain set varied most on the shortest enquiries (07: a two-line Gmail; 08: an off-target bakery),
where there is little to go on. Slide copy is worded differently run to run (about 2 words in 3 shared), while
the facts in it come from the enquiry and the library, which do not change.

With 5 runs per enquiry, one different run moves an enquiry by 20 points and the average by about 2: read
differences of a few points between columns as noise.

## What we changed, and what we found

1. **Temperature 0** on both model calls (n8n left it at the provider default). The main pain went from 84% to 96%
   and the copy became a little steadier.
2. **The client name** is taken from the model only when it is a proper name that appears in the enquiry. The
   benchmark caught a description passing as a name once ("Departament Prawny ministerstwa": a capitalised adjective
   counted as a proper noun). Now a generic first word needs a real proper noun after it. 98% → 100%.
3. **A bug the benchmark found: consistent is not the same as correct.** Enquiry 01 says documents must not leave
   "naszą infrastrukturę" (our infrastructure), which by our rules means on-premise. In the "Before" and
   "Temperature 0" runs the deck said Vault 5 times out of 5: perfectly consistent, and wrong. The rule that
   detects own-server requirements in code missed it, because in JavaScript `\w` does not match Polish letters
   ("naszą"). Fixed with `\p{L}` and the `u` flag; 01 is now on-premise 5 of 5, decided by the rule, not the model.
4. **Where the rest of the variance comes from.** OpenRouter serves this model through about 40 providers at
   different precisions (fp4, fp8, …) and routes each call to the fastest. We tried pinning three providers
   (`order` with fallback): decks took 33–54 s instead of about 10 s, and the ambiguous enquiry 03 was no steadier
   (role 3 to 2). On enquiry 01 the pinned provider chose on-premise where the fast ones chose Vault, which is what
   led us to the bug above. We kept routing by throughput. A single model on one machine, the way Gaius deploys its
   sLLMs on-premise, removes this source of variance altogether; in this stack that is one parameter of the n8n
   model node.

## Lessons: the team decides what the model cannot

Some questions are business decisions, not something a model should guess: is the head of legal of a capital group
a champion who tries the product, or the budget owner who gets Vault? Temperature does not answer that. The sales
team does, once, and the model follows from the next offer on.

How it works (details in [offer-studio/README.md](../offer-studio/README.md#lessons-the-team-teaches-the-model)):
an offer made by n8n remembers the model's tiles, the enquiry and what it wrote. When a salesperson changes it,
**Teach the model** in the offer shows the change, and **Make a lesson** turns it into one rule with the before and
after. n8n gives the model the active lessons on every run (plan lessons before choosing tiles, copy lessons for the
offer's tiles when writing). No retraining: switching a lesson off stops it at once, and every offer records which
lessons it was made with.

**The experiment** (`bench/determinism-final.json`, `-heldout-off.json`, `-lessons.json`):

1. A salesperson corrected one offer for enquiry 03 from Champion/SaaS to Board/Vault and saved the lesson
   *"A director or head of the legal department of a capital group is the Board role and gets Vault: they own the
   legal budget and choose the tool, even when the group board signs it off."*
2. A second lesson for law firms: *"Law firms decide through their partners. Write the partners (or the managing
   partner), never the board or the management…"*
3. We ran enquiry 03, an enquiry the lesson had never seen (`sample-data/lessons/heldout-energy-group.json`: the head
   of legal of an energy group, worded differently), and the five law-firm enquiries, 5 times each.

| Enquiry | Without lessons | With lessons |
|---|---|---|
| 03, construction group (the correction came from it) | Champion 3, Board 2 | Board 5 of 5 |
| Energy group (never seen by the lesson) | Champion 5 of 5 | Board 5 of 5 |
| 5 law-firm enquiries (the plan lesson is not about them) | 1 Board, 4 Champion, each 5 of 5 | the same |
| Law-firm decks that say "the board" | 1 of 25 | 0 of 25 |

On these 7 enquiries the whole tile set agreed in 91% of runs (100% on all but the two-line Gmail enquiry), and the
copy shared 73% of words. All 35 offers recorded the lessons they were made with; the law-firm lesson reached only
the 25 law-firm offers, as scoped.

## Limits

- 5 runs per enquiry and 9 enquiries: enough to find what drifts and why, not a precise rate.
- Words in common measures how alike the copy is, not whether it is right; correctness is graded separately in
  [EVAL.md](EVAL.md).
- Lessons are instructions, not guarantees: the model applies them when it judges they fit. That is why a person
  reviews every offer, and why the before/after of each lesson is visible in Offer Studio.
