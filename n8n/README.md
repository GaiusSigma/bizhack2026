# n8n with Offer Studio nodes

The `n8n` image in this stack is the official `n8nio/n8n` with two built-in nodes for Offer Studio.
They are available right after deployment, with no community nodes to install:

| Node | Type in workflows | What it does |
|---|---|---|
| **Offer Studio** | `CUSTOM.offerStudio` | Every API operation: offers, slides, knowledge blocks, templates, PDF, `.figcraft`, export/import. Also works as an AI agent tool |
| **Offer Studio Trigger** | `CUSTOM.offerStudioTrigger` | Starts a workflow when an offer, slide, block or template changes (the `/api/events` stream) |

## How the node keeps up with Offer Studio

The node has no hard-coded list of operations. It reads `GET /api/openapi.json` from Offer Studio
(cached for 30 s) and builds from it:

- **Resource**: the tags from the API description (Offers, Slides, Knowledge blocks, Templates, Components, Database, System),
- **Operation**: the endpoints in that resource (the value saved in the workflow is e.g. `GET /api/offers/{id}/pdf`),
- **Fields**: path parameters, filters and request body fields, with their types and descriptions.

A new endpoint in Offer Studio therefore shows up in n8n as soon as Offer Studio is redeployed, without
rebuilding n8n. The API description is generated from the routes registered in the server
(`offer-studio/src/openapi.js`), so it cannot drift from the code:

1. Add the route in `offer-studio/src/server.js`.
2. Describe it in `DOCS` in `offer-studio/src/openapi.js` (tag, summary, parameters, body).
   A route without a description still reaches n8n, with a single JSON `body` field, and an
   `openapi` test in `npm test` reminds you to describe it.
3. Redeploy Offer Studio. Open the node in n8n and the new operation is in the list.

For anything the description does not cover, the **Custom API Call** resource sends any method to any `/api/...` path.

The node detects the response type itself:

- JSON list: one n8n item per record (option "Split List Into Items"),
- PDF or `.figcraft`: a binary file in the `data` property (option "Output Binary Property"),
- 204: `{ "success": true }`.

Template upload (`POST /api/templates`) takes the file from the binary property named in the `file` field.
The **Body JSON** option is merged with the fields, and an array replaces the whole body. This lets you add
several blocks in one request.

ID fields (offer, template, block) are plain text so that expressions work, e.g. `{{ $json.id }}`
from an offer created earlier in the workflow. The field description says where to get the id (e.g. `/api/offers`).

## Credential

Type **Offer Studio API**: base URL (default `http://offer-studio:3000`) and token (`STUDIO_API_TOKEN`).

In this stack n8n fills in both fields itself. `n8n/entrypoint.sh` builds `CREDENTIALS_OVERWRITE_DATA`
from `OFFER_STUDIO_URL` and `OFFER_STUDIO_API_TOKEN`, and n8n puts these values into the empty fields
and hides them in the editor. Just create an "Offer Studio API" credential once and save it.
Every n8n user who can use that credential then has the token, and it is the same token as in
Offer Studio.

## Examples

- **Form → new use case**: Form Trigger → Offer Studio (Knowledge blocks / Create a block:
  `type` = `use_case`, `title`, `body`, `tags` = `["law-firm"]`).
- **Offer for a client**: Offer Studio (Offers / Duplicate an offer, `id` = `gaius-vault-base`) →
  Offer Studio (Offers / Update an offer, `data` = `{"client": "ACME Ltd.", "price": "12,000"}`) →
  Offer Studio (Offers / Download the offer PDF) → Gmail with the `data` attachment.
- **Offer from tiles after a call**: transcript (e.g. Fireflies) → an AI agent picks tiles from the list
  (Tiles / List tiles) → Offer Studio (Tiles / Generate an offer from tiles: `client` = "ACME S.A.",
  `tiles` = `["role:board", "segment:in-house", "product:vault", "pain:confidentiality", "pain:shadow-ai"]`) →
  Offer Studio (Offers / Download the offer PDF). The response includes `coverage`: which pains the offer solves.
- **Change notification**: Offer Studio Trigger (Changes In: Offers) → Slack.

The trigger groups changes to the same record within the "Debounce (ms)" window (3 s by default), because
the dashboard saves edits as you type. With "Fetch Current Record" it attaches the offer, block or
template in its current state. On a slide change it attaches the whole offer, and after a record is
deleted it sets `deleted: true`.

## Workflow "Lead → oferta Gaius Vault (Offer Studio)": the 2026 deck

File: [`workflows/offer-studio-deck.json`](workflows/offer-studio-deck.json), the workflow running in production,
extended for the 2026 deck. The tile part is unchanged; after the offer is created, a second AI step writes the
slides' copy from the enquiry or the call transcript. This workflow is the only place the stack calls a model:
Offer Studio holds the knowledge, lessons and templates and calls no AI itself. Both prompts include the sales team's
lessons from Offer Studio (`GET /api/lessons?kind=plan`, and `lessons` in the content endpoint).

```
Form / Website form / Fireflies transcript / Gmail
  → Normalizuj zgłoszenie        one input format, every text part labelled
  → Kafelki → Lekcje (wybór kafelków) → Kontekst dla AI → AI Agent → Przygotowanie scenariusza ⇄ Samopoprawka AI
  → Utwórz ofertę                POST /api/offers/generate
  → Pola slajdów                 GET /api/offers/:id/content (fields, hints, limits)
  → Kontekst treści → AI: treść slajdów → Sprawdź treść ⇄ Samopoprawka treści (up to 3 tries)
  → Zapisz treść                 PUT /api/offers/:id/content
  → Pobierz PDF → Podsumowanie → Discord
                               → Zgłoszenie z landingu? → PDF dla landingu (Respond to Webhook)
```

**Website form** answers only when the deck is ready (`responseMode: responseNode`): **PDF dla landingu** sends
the same PDF that goes to Discord (`application/pdf`, headers `X-Offer-Id`, `X-Offer-Name` URL-encoded,
`X-Offer-Tiles`). The landing turns it into its "Download PDF" button. The Form, Fireflies and Gmail triggers
skip that node.

The model writes the copy in English and only from the enquiry; a field it has nothing for keeps the scenario's
default. **Sprawdź treść** applies the same rules as Offer Studio (fields, character limits, item counts) and sends
the model its mistakes; after the third try it saves what is valid and lists the rest in the Discord summary.
What to write in each field comes from Offer Studio's scenario, so changing a hint needs no change here.

Import it over the running workflow only after Offer Studio with `/api/offers/:id/content` is deployed.

## Building the image

`n8n/Dockerfile`: a `node:22-alpine` stage compiles the `n8n-nodes-offer-studio` package (TypeScript) and
runs the parser tests, and an `n8nio/n8n:<N8N_VERSION>` stage copies it to
`/opt/n8n-custom/node_modules/` and sets `N8N_CUSTOM_EXTENSIONS=/opt/n8n-custom`. The package lives outside
the `/home/node/.n8n` volume, so every redeploy installs its current version.

Upgrading n8n: `N8N_VERSION` in `docker-compose.yml` (build argument of the `n8n` service) and the same
`n8nio/runners` tag in the `n8n-runners` service. You can also bump `n8n-workflow` in
`n8n-nodes-offer-studio/package.json` (it is only used for compilation).

## Working on the node

```powershell
cd n8n/n8n-nodes-offer-studio; npm install --ignore-scripts; npm test
```

The tests in `test/live.test.cjs` and `test/trigger.test.cjs` call a running Offer Studio (by default
`http://127.0.0.1:3917` with token `tok`; override with `STUDIO_URL` and `STUDIO_TOKEN`). Without a server they are skipped:

```powershell
cd offer-studio; $env:PORT=3917; $env:STUDIO_API_TOKEN='tok'; $env:STUDIO_DB="$env:TEMP\studio-test.db"; npm start
```

A change to the node code (e.g. a new way of handling responses) requires rebuilding the n8n image. A change
to the Offer Studio API does not.
