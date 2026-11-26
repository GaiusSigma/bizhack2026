# Offer Studio

A minimal dashboard for collecting knowledge about an offer and assembling presentations from it.
**FigCraft** handles slide design, preview and PDF: the dashboard holds the data and FigCraft renders it.

- **Offers from tiles** (the main path, see below): the salesperson describes the client with tiles
  (role, segment, pains, product), and the deck builds itself from the role's scenario.
- **Knowledge**: blocks (use cases, problems, arguments, comparison rows, package components…).
  Type and tags are free-form strings, and you add type-specific fields yourself (e.g. `effect` on a use case).
- **Slides (library)**: anyone can add a new slide designed in FigCraft by dropping a file
  (`.figcraft`, page JSON, `.fig`, `.penpot`, `.sketch`, `.svg`). Every top-level frame becomes a slide
  you can pick in offers (with a thumbnail). Fields are bound by layer names (see below). No deploy needed.
- **Offers**: a list of slides. Slide = a design from the library + content + blocks (specific ones or
  "all use cases tagged law-firm"). Next to the editor is a FigCraft-rendered preview that refreshes
  after every change, including changes made through the API.
- **Export**: "Download PDF" (FigCraft, text stays text) and "Download .figcraft" (the finished offer,
  ready for manual touch-ups in FigCraft).
- **Database export / import**: blocks, templates (with files), offers and slides in one JSON file.
- **API**: everything over REST, documented at `/static/api.html`.

Out of the box the database holds the content of `gaius-offer.figcraft` (40 blocks, a base offer with
11 slides) and `seed/gaius-template.figcraft` (the same file with marked-up fields) as the first library entry.

## The 2026 deck: copy written per client

The base deck (the `base` scenario) uses the **Gaius deck 2026** template (`seed/gaius-deck.figcraft`, library id
`gaius-deck`): ten slides, from the title slide to the contact person. Most of its copy is written for each client
by a model from the call transcript or the enquiry; n8n does that (workflow `n8n/workflows/offer-studio-deck.json`).

| Slide (frame) | Written per client | Fixed or from product material |
|---|---|---|
| `title` | title, one-sentence lead | client name, date |
| `starting-point` | who the organisation is, 3–4 areas of work in the client's words | |
| `use-areas` | for each area, the product feature that handles it | |
| `team-support` | lead, 1–2 concerns from the call with our answers (labelled "From our call"; the default cards say "Common question") | the "from similar rollouts" card |
| `tool-comparison` | the tool the client mentioned, 4–6 comparison rows | **optional**: hidden until written |
| `security` | lead answering the client's security concern | the six features (per product) |
| `preparation` | title, lead, 3–5 steps before the pilot or the contract | |
| `rollout-process` | | the five rollout stages |
| `add-on-services` | lead, workshops / developer hours / development plans | |
| `contact-person` | the next step | the person (a `person` block) |

What a model may write, and how long, lives in the scenario: each step's `write` lists its fields with a hint and a
character limit, and list fields (a slide's repeated cards) with an item count and columns. Change the hints in
`seed/scenarios.js` (or the Scenarios tab), not in n8n: n8n reads them from the API.

- A list column with `fixed` (e.g. `value2: { fixed: 'From our call' }`) is not shown to the model and always gets that text on save.
- `GET /api/offers/:id/content`: per slide, the fields to write with hint, limit and current value.
- `PUT /api/offers/:id/content` with `{"slides": {"starting-point": {"lead": "…", "areas": [{"title": "…", "value": "…"}]}, "tool-comparison": {"hide": true}}}`.
  Unknown fields, texts over their limit and wrong item counts are refused with one 400 that lists every problem.
  Written slides are kept on recompute, like manual edits, and show "written by …" in the offer.

The slides print `{{offer.product_name}}` (Gaius Vault, or Gaius-Lex for SaaS; `data.product_name` on the offer
overrides it) and `{{offer.date}}` (the offer's creation date). Offers built with this deck have no pain-coverage
box: their slides are written, not picked from knowledge blocks.

**Changing the design.** The designer works on `seed/source/gaius-deck.figcraft` (Polish placeholders, plain
groups). `node seed/build-deck.mjs` turns it into the template: it names the slides, binds the fields, translates
fixed copy to English and turns card groups into auto-layout frames so written copy wraps and cards grow. Then
upload the result on the Slides tab (it replaces `gaius-deck`), or start with an empty database.

**Existing databases.** On the first start of this version the `gaius-deck` template joins the library and the
`base` scenario moves onto it; the previous base deck is kept as the `base-2025` scenario, and offers made from it
keep their slides (the 2025 template stays in the library).

## Editing slides in the browser (FigCraft web)

Offer Studio ships the FigCraft web editor (WebAssembly) and serves it at `/figcraft/`, so slide files
can be designed and changed without the desktop app or the CLI:

- **Slides ▸ Edit in FigCraft** opens a file from the library in a new tab. **Ctrl+S saves it straight
  back to the library**: thumbnails, components and every offer that uses its slides update right away.
- **Slides ▸ New in FigCraft** starts an empty editor (Home screen ▸ new design file). The first Save asks
  whether to add the file to the library; its file name becomes the library name.
- **Offer ▸ Open in FigCraft** opens the finished offer for manual touch-ups. It is generated, so saving
  there downloads a `.figcraft` and the offer in Offer Studio does not change.
- Exports from the editor (PNG, PDF, SVG…) are ordinary downloads.

Several people can work on the library at once. If someone saves a file you have open, a banner says so
(load their version or keep editing yours), and saving over a newer version is refused until you choose
**Overwrite with my version** (or download yours). "Set your name" in the editor bar names you on
FigCraft comments. To edit one file together live, use FigCraft's own Share ▸ Online: in the stack the
editor already knows the `figcraft-server` collaboration server.

How it works: `/static/editor.html` frames `/figcraft/?host=parent` on the same origin. FigCraft's host
mode hands every Save to the page over `postMessage` instead of downloading it, and the page uploads it with
`POST /api/templates` plus `base` (the `x-updated-at` of the version it opened) for the conflict check.

## Tiles and scenarios

**How a salesperson makes an offer.** Offers → "+ New offer": the client name and tiles from four categories:

| Category | Pick | Active at launch |
|---|---|---|
| Who you are talking to (role) | one | Champion, Board (CTO, GC, budget owner, DPO: coming soon) |
| Segment | one | Law firm, In-house legal team, Public administration (others: coming soon) |
| Client pains | 1 to 5 | 11 pains from sales calls (the "Bóle (Fireflies)" tab of the sales sheet) |
| Product / scale | one | SaaS, Vault, On-premise |

The role picks a **scenario** (slide order and default copy), and the other tiles pick the content:
blocks and cards carry tiles in their tags. On a slide like "How we solve it", every selected pain first
gets its best-matching block, so a pain that has content is never left out; the remaining slots go to the
highest sum of matched tile weights (pain 3, segment 2, role 1, product 1), with ties broken by a fixed order. Content tagged with a segment only goes to
that segment. The same tiles always give the same offer. Every slide shows "because: …", the tiles that
picked it, and the left column shows "X of Y pains solved" (only solutions and use cases count).

**Manual edits.** Any slide change (copy, swapping a block, hiding, also through the API) marks it as
"edited by hand". "Recompute" and "Change tiles" rebuild the offer but leave those slides alone; a slide whose
step no longer applies (e.g. architecture after switching to SaaS) is hidden, and comes back when the step
applies again. "Restore automatic" discards a slide's edits. Offers made before tiles open in the existing editor.

**Pinning content.** The Tiles tab: a tile's description and quotes, and its pinned content ("Pin content"
searches blocks and cards). Pains without a pinned solution are flagged in the list. In Knowledge, a block's
tiles are toggled with a click. The starting pins (27 solutions from the sheet's PRKW tab and 5 from its
product sentences, each with its source) are a proposal to review. A solution is pinned only where it truly fits;
nothing is pinned to raise a count. The Tiles tab opens on a coverage map (solutions per pain and segment): bold
pairs are where the sales sheet reports the pain, amber pairs have one solution only. In New offer, every pain
shows how many solutions it has for the selected segment and whether it is less common there.

**Scenarios.** The Scenarios tab: steps with a slide thumbnail, a fill rule ("2–3 solutions that best fit
the client's tiles") and a condition ("only with: Vault or On-premise"). Offers pick up changes after
"Recompute". Step copy has a Vault version; SaaS and On-premise versions (`data_by_product`) are drafts,
marked in the editor.

**Automation.** `POST /api/offers/generate` with `{"client": "...", "tiles": [...]}` does what the
"New offer" screen does (400 for a coming-soon tile or a wrong tile count). Also:
`PUT /api/offers/:id/tiles`, `POST /api/offers/:id/recompute`, `GET/POST/PATCH/DELETE /api/tiles`,
`GET/PUT /api/scenarios/:id`. The n8n node shows them under the "Tiles" resource.

**Databases from the Polish version.** A database created before the English translation still held the
Polish seed content (blocks, "why" cards, the base offer and the old slide template with Polish frame names).
On startup it is migrated once: a full export is saved first (download it with `GET /api/legacy-backup`),
seed records are swapped for their English versions, every offer is re-pointed to the new slide, block and
card ids, default slide copy becomes English, and copy written for a client stays. Seed records edited by
hand before the switch are listed in Knowledge with a link to the backup. The id map is `seed/legacy-pl.js`.

An existing database gets tiles, scenarios and solution blocks on the first start of this version
(only when it has no tiles yet). Seed data: `seed/tiles.js` and `seed/scenarios.js`.

## Adding a new slide

1. In FigCraft, draw a frame (e.g. 1920×1080) and name it, e.g. `case-study`. The frame name is the slide's
   name in the library and must be unique across the whole library (a clash is rejected with a clear message).
2. Name the texts that should change as fields (table below). Everything else stays exactly as drawn.
3. Save the file or page as JSON and drop it onto the **Slides** tab (or use "Paste JSON").
   Replacing a file with the same name updates every offer that uses its slides.

JSON does not carry images: upload slides with images as `.figcraft`.

Under the hood all files are merged into one document (`file.import` in `figcraft-cli`) and offers are
rendered from it, so slides from different files can be mixed in one PDF.

Layer names:

| Layer name | What it does |
|---|---|
| `use-case` (top-level frame) | the slide's name in the library |
| `{{data.title}}` (text) | slide content from the offer editor |
| `{{offer.client\|upper}}` | an offer variable, optionally upper-cased |
| `Business impact: {{effect}}` | fixed text + a field; an empty result hides the layer |
| `#item` (frame/group) | a card per block. Inside: `{{title}}`, `{{body}}`, `{{n}}` and the block's fields |
| `#item:lines` | a row from the `data.lines` field (each line `label \| value`): `{{title}}`, `{{value}}` |
| `[[2:text]]` | the style of the 2nd highlight in the layer's original text |
| `\n` | a new line |

In content, `**word**` gets the style of the template's first highlight (in the Gaius template: the red accent).
There can be more `#item` cards than blocks (extras disappear) or fewer (the last card is repeated).
This works best in auto layout (grid or list), because extra cards then arrange themselves.
Set cards that should grow with their text to "hug" vertically.

## Components: swappable cards picked by AI

A slide can have slots for ready-made cards from Figma/FigCraft that differ in more than text
(icon, colour, layout, e.g. a card with a big number instead of an icon). Example in the starter file: the
`why` slide has 6 slots, and the `@why` set (on the "Components" page) has 19 cards: 9 arguments in a
regular and a green (highlighted) version, plus a "3 mo." stat card.

1. In FigCraft, draw a top-level frame `@set-name`. Each frame inside is one card; the card's name is its key
   (database id: `set/key`). `@…` frames are not slides.
2. On the slide, name the card placeholders `#pick:set-name` (ideally in an auto-layout grid).
   Picked cards take their places in pick order. With nothing picked, what was drawn stays.
3. Name card texts that may be adapted to the client `{{title}}`, `{{body}}`… Without a value, the drawn
   text stays.
4. After uploading the file, the cards appear in the **Components** tab (and in the `components` table in SQLite).
   There you describe what the card shows, **when to pick it**, when not to, its topic (variants of the same
   argument share a topic) and its variant. Rules for the whole set (e.g. "6 cards, exactly one highlighted")
   live in `component_sets`. Replacing the file refreshes the cards' text and fields but leaves descriptions alone.
5. In the slide editor you pick cards by hand (thumbnails + "when") or click **Pick cards (AI)**
   with a short brief. Claude (`STUDIO_AI_MODEL`, default `claude-opus-5-5`) reads the descriptions from the
   database, the set rules and the offer variables, picks the cards, orders them and explains each choice.
   The same context for another agent: `GET /api/slides/:id/pick-context`.

`seed/build-components.mjs` shows how the starter set was made (from the cards on the "why" slide).
On start, a database without components gets the new Gaius file, the descriptions of the 19 cards and
a card selection in the base offer.

## Running locally without Docker

You need FigCraft installed. On Windows `figcraft-cli.exe` is detected automatically; anywhere else,
point the `FIGCRAFT_CLI` variable at it.

```powershell
cd offer-studio; npm install; npm run figcraft-web; npm run dev
```

`npm run figcraft-web` downloads the FigCraft web build (about 25 MB, SHA-256 checked) into
`vendor/figcraft-web` once; without it everything works except the in-browser editor.

The app starts at http://localhost:3000 with no password. The database lives in `offer-studio/data/studio.db`.

Tests (PDF rendering is tested when `figcraft-cli` is available):

```powershell
cd offer-studio; npm test
```

## In the stack (docker-compose / Coolify)

The image includes `figcraft-cli` from the official FigCraft release (SHA-256 checked at build time)
and the Figtree font (`fonts/`, OFL licence). In Coolify, set a domain for `offer-studio`.

| Variable | Source | Purpose |
|---|---|---|
| `STUDIO_PASSWORD` | `SERVICE_PASSWORD_STUDIO` | Browser password (any username) |
| `STUDIO_API_TOKEN` | `SERVICE_PASSWORD_64_STUDIOAPI` | `Authorization: Bearer …` for scripts and n8n |
| `FIGCRAFT_WEB_URL` | `SERVICE_URL_FIGCRAFT` | The stack's FigCraft domain; the editor's collaboration server is derived from it (`wss://<domain>/sync/`) |
| `FIGCRAFT_SERVER_URL` | – | Collaboration server for Share ▸ Online in the editor, if it is not at `FIGCRAFT_WEB_URL` + `/sync/` |
| `FIGCRAFT_WEB_DIR` | `/app/vendor/figcraft-web` | The FigCraft web build served at `/figcraft/` |
| `FIGCRAFT_CLI` | `/usr/local/bin/figcraft-cli` | Path to figcraft-cli |
| `STUDIO_DB` | `/data/studio.db` | Database file (`offer-studio-data` volume) |
| `STUDIO_SEED` | – | `false` disables starter data on an empty database |
| `ANTHROPIC_API_KEY` | set by hand | AI card picking; everything else works without a key |
| `STUDIO_AI_MODEL` | `claude-opus-5-5` | Model used for card picking |

Without `STUDIO_PASSWORD` and `STUDIO_API_TOKEN` the app is open. That is only meant for local use.

The starter data is loaded into an **empty** database only. An existing database keeps its content;
to get the current starter content, start with an empty `offer-studio-data` volume.

On the first start of a new version against a database with HTML layouts, the database migrates itself:
blocks and offers stay, the Gaius template is added and the base offer gets slides for that template.

Upgrading FigCraft: in the `Dockerfile`, change `FIGCRAFT_VERSION` and both checksums from the release's `SHA256SUMS.txt`,
and in `scripts/fetch-figcraft-web.mjs` the web build's `VERSION` and `SHA256` (the `figcraft-web-<version>.zip` line).

### n8n

The stack's n8n ships the **Offer Studio** and **Offer Studio Trigger** nodes ([details](../n8n/README.md)),
with the credential filled in automatically. The node reads its list of operations and fields live from
`GET /api/openapi.json`, which is built from the server routes and the descriptions in `src/openapi.js`.

**A new API route = a description in `DOCS` in `src/openapi.js`.** n8n then shows it with a name, fields and types.
Without a description it still appears, but only with a "Body (JSON)" field, and `npm test` reports the gap.

Examples: adding a use case from a form, changing the client and price of an offer
(`PATCH /api/offers/<id>`), downloading the PDF (`GET /api/offers/<id>/pdf`) and emailing it.
