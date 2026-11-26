// API description in OpenAPI 3.1 format, built from the routes registered in Hono.
//
// The "Offer Studio" n8n node (n8n/ directory) uses it: it reads /api/openapi.json live
// and builds its list of operations and fields from it. A new endpoint therefore shows up in n8n
// after an Offer Studio redeploy, without rebuilding n8n.
//
// Adding a route in server.js -> add its description to DOCS (key "METHOD /api/path").
// A route without a description still goes into the spec (with a generic JSON field), but the test
// `openapi: every API route is documented` will remind you to fill it in.
//
// Extensions read by the n8n node:
//   x-n8n-list: '/api/offers'  on a parameter/field: a pick list (id + name/title)
//   x-n8n-hidden: true         the operation is not shown as an action (e.g. the SSE stream)
//   x-raw-body: true           the whole body is a single JSON (e.g. database import)

const json = (schema, description = 'OK') => ({ description, content: { 'application/json': { schema } } });
const binary = (type, description) => ({ description, content: { [type]: { schema: { type: 'string', format: 'binary' } } } });
const noContent = { description: 'Deleted' };

const anyObject = { type: 'object', additionalProperties: true };
const list = (ref) => ({ type: 'array', items: { $ref: `#/components/schemas/${ref}` } });
const one = (ref) => ({ $ref: `#/components/schemas/${ref}` });

const idParam = (what, listPath) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `Id of the ${what}`,
  schema: { type: 'string' },
  ...(listPath ? { 'x-n8n-list': listPath } : {}),
});
const replaceParam = {
  name: 'replace',
  in: 'query',
  description: '1 = replace the whole data field instead of merging',
  schema: { type: 'string', enum: ['', '1'] },
};

const TAGS = [
  { name: 'Offers', description: 'Offers: variables, slides, PDF and .figcraft file' },
  { name: 'Tiles', description: 'Tiles (role, segment, pain, product), role scenarios and offers generated from tiles' },
  { name: 'Slides', description: 'Offer slides' },
  { name: 'Knowledge blocks', description: 'Use cases, problems, arguments and other blocks' },
  { name: 'Templates', description: 'Slide library: FigCraft files, every top-level frame = a slide' },
  { name: 'Components', description: 'Swappable cards from @… sets (#pick:… slots) and their descriptions for an AI agent in n8n' },
  { name: 'Lessons', description: 'Rules the sales team teaches the model (choosing tiles, writing slides), and the corrections they come from' },
  { name: 'Database', description: 'Export and import of the whole database' },
  { name: 'System', description: 'API description, metadata, events' },
];

const blockFields = {
  type: { type: 'string', description: 'Block type, e.g. use_case, problem, argument' },
  title: { type: 'string', description: 'Title' },
  body: { type: 'string', description: 'Body' },
  data: { type: 'object', description: 'Type-specific fields, e.g. {"effect": "..."}' },
  tags: { type: 'array', items: { type: 'string' }, description: 'Tags, e.g. ["law-firm"]' },
};
const slideFields = {
  frame: { type: 'string', description: 'Slide name in the FigCraft template' },
  data: { type: 'object', description: 'Slide content, e.g. {"title": "..."}' },
  block_ids: { type: 'array', items: { type: 'string' }, description: 'Specific blocks, in this order' },
  query: { type: 'object', description: 'Blocks from a query: {"type": "use_case", "tag": "law-firm", "limit": 6}' },
  picks: { type: 'object', description: 'Cards in #pick slots: {"why": [{"component": "why/on-premise", "data": {"title": "..."}}]}' },
  position: { type: 'number', description: 'Position in the slide list (from 0)' },
  hidden: { type: 'boolean', description: 'Hidden slide (skipped in the PDF)' },
  locked: { type: 'boolean', description: 'Edited by hand: recompute leaves it alone. Any change sets true; {"locked": false} restores the automatic content' },
};
const lessonFields = {
  kind: { type: 'string', enum: ['plan', 'copy'], description: 'plan: choosing the tiles from the enquiry; copy: writing the slides' },
  text: { type: 'string', description: 'The rule, in one or two sentences (max 600 characters)' },
  tiles: { type: 'array', items: { type: 'string' }, description: 'plan: the tiles it is about; copy: it applies when the offer has all of these tiles (empty = every offer)' },
  step: { type: 'string', description: 'copy: the slide (scenario step key, e.g. starting-point) it is for; empty = the whole deck' },
  example: { type: 'object', description: 'The correction that taught it: {field, before, after, quote}' },
  offer_id: { type: 'string', description: 'The offer it came from' },
  author: { type: 'string', description: 'Who wrote it' },
  active: { type: 'boolean', description: 'false = the model stops reading it' },
};
const tileFields = {
  label: { type: 'string', description: 'Name, e.g. "Confidentiality"' },
  description: { type: 'string', description: 'What the tile means' },
  quotes: { type: 'array', items: { type: 'string' }, description: 'Client quotes' },
  status: { type: 'string', enum: ['active', 'soon'], description: 'soon = visible but cannot be selected' },
  position: { type: 'number', description: 'Order within the category' },
  data: { type: 'object', description: 'Extra fields: pick_when and avoid_when (guidance for choosing the tile, e.g. by an AI agent), price for a product' },
};
const tilesList = { type: 'array', items: { type: 'string' }, description: 'Tile ids: exactly one role, one segment, one product and 1–5 pains, e.g. ["role:board", "segment:law-firm", "product:vault", "pain:confidentiality"]', 'x-n8n-list': '/api/tiles' };
const componentFields = {
  title: { type: 'string', description: 'Short card name' },
  description: { type: 'string', description: 'What the card shows (content, look)' },
  use_when: { type: 'string', description: 'When the AI should pick it' },
  avoid_when: { type: 'string', description: 'When not to pick it' },
  topic: { type: 'string', description: 'Topic: variants of one argument share it' },
  variant: { type: 'string', description: 'Variant, e.g. regular, highlight, stat' },
  tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
  data: { type: 'object', description: 'Fixed overrides of the card\'s {{…}} fields' },
};
const setParam = { name: 'set', in: 'path', required: true, description: 'Set (name of the @… frame without the @)', schema: { type: 'string' } };
const keyParam = { name: 'key', in: 'path', required: true, description: 'Card key (second part of the id, e.g. on-premise)', schema: { type: 'string' } };

const SCHEMAS = {
  Block: {
    type: 'object',
    properties: { id: { type: 'string' }, ...blockFields, created_at: { type: 'string' }, updated_at: { type: 'string' } },
  },
  Template: {
    type: 'object',
    properties: {
      id: { type: 'string' }, name: { type: 'string' }, size: { type: 'number' },
      frames: { type: 'array', items: anyObject }, created_at: { type: 'string' }, updated_at: { type: 'string' },
    },
  },
  Offer: {
    type: 'object',
    properties: {
      id: { type: 'string' }, name: { type: 'string' }, template_id: { type: 'string' }, data: anyObject,
      slides: { type: 'array', items: { $ref: '#/components/schemas/Slide' } },
      created_at: { type: 'string' }, updated_at: { type: 'string' },
    },
  },
  Slide: {
    type: 'object',
    properties: { id: { type: 'string' }, offer_id: { type: 'string' }, ...slideFields, created_at: { type: 'string' }, updated_at: { type: 'string' } },
  },
  LibrarySlide: {
    type: 'object',
    properties: {
      frame: { type: 'string' }, source: { type: 'string' }, source_name: { type: 'string' }, width: { type: 'number' }, height: { type: 'number' },
      fields: { type: 'object', description: '{data, item, sources, picks: {set: slot count}}' }, slots: { type: 'number' }, thumb: { type: 'string' },
    },
  },
  Component: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'set/key' }, set_name: { type: 'string' }, key: { type: 'string' }, source: { type: 'string' },
      ...componentFields,
      figma_text: { type: 'string', description: 'Text drawn in FigCraft' },
      fields: { type: 'array', items: { type: 'string' }, description: 'The card\'s {{…}} fields' },
      missing: { type: 'boolean', description: 'The card is no longer in the library' },
      thumb: { type: 'string' }, created_at: { type: 'string' }, updated_at: { type: 'string' },
    },
  },
  Tile: {
    type: 'object',
    properties: { id: { type: 'string', description: 'category:slug, e.g. pain:confidentiality' }, category: { type: 'string', enum: ['role', 'segment', 'pain', 'product'] }, ...tileFields, created_at: { type: 'string' }, updated_at: { type: 'string' } },
  },
  Scenario: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Role tile id, e.g. role:board' }, name: { type: 'string' },
      steps: { type: 'array', items: anyObject, description: 'Steps: [{key, label, frame, data, data_by_product, fill: {kind: none|pains|blocks|picks, type, min, max, set}, when: {any: [tiles]}}]' },
      created_at: { type: 'string' }, updated_at: { type: 'string' },
    },
  },
  Lesson: {
    type: 'object',
    properties: {
      id: { type: 'string' }, ...lessonFields,
      used: { type: 'number', description: 'Offers made with it' }, last_used: { type: 'string' },
      created_at: { type: 'string' }, updated_at: { type: 'string' },
    },
  },
  ComponentSet: {
    type: 'object',
    properties: { id: { type: 'string' }, title: { type: 'string' }, rules: { type: 'string', description: 'Picking rules for the AI' }, components: { type: 'number' } },
  },
};

const body = (properties, required = []) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', properties, required } } },
});

export const DOCS = {
  // ---------------------------------------------------------------- system
  'GET /api/openapi.json': {
    tag: 'System', operationId: 'getOpenApi', summary: 'API description (OpenAPI)',
    responses: { 200: json(anyObject) },
  },
  'GET /api/meta': {
    tag: 'System', operationId: 'getMeta', summary: 'Types and tags in use',
    description: 'Block types, tags and the FigCraft web URL',
    responses: { 200: json(anyObject) },
  },
  'GET /api/events': {
    tag: 'System', operationId: 'streamEvents', summary: 'Change stream (SSE)',
    description: 'Server-Sent Events: {table, id, offer_id} after every change. In n8n: the Offer Studio Trigger node.',
    'x-n8n-hidden': true,
    responses: { 200: { description: 'text/event-stream', content: { 'text/event-stream': { schema: { type: 'string' } } } } },
  },

  // ---------------------------------------------------------------- knowledge blocks
  'GET /api/legacy-backup': {
    tag: 'Database', operationId: 'getLegacyBackup', summary: 'Download the backup made before the Polish-to-English migration',
    description: 'Full export of the database as it was before its Polish seed content was replaced with English. 404 if the database was never migrated',
    responses: { 200: json(anyObject, 'Export file') },
  },
  'GET /api/blocks': {
    tag: 'Knowledge blocks', operationId: 'listBlocks', summary: 'List blocks',
    parameters: [
      { name: 'type', in: 'query', description: 'Only blocks of this type', schema: { type: 'string' } },
      { name: 'tag', in: 'query', description: 'Only blocks with this tag', schema: { type: 'string' } },
      { name: 'q', in: 'query', description: 'Search in title and body', schema: { type: 'string' } },
    ],
    responses: { 200: json(list('Block')) },
  },
  'GET /api/blocks/:id': {
    tag: 'Knowledge blocks', operationId: 'getBlock', summary: 'Get a block',
    parameters: [idParam('block', '/api/blocks')],
    responses: { 200: json(one('Block')) },
  },
  'POST /api/blocks': {
    tag: 'Knowledge blocks', operationId: 'createBlock', summary: 'Create a block',
    description: 'One block or an array of blocks (pass the array in the "Body (JSON)" option)',
    requestBody: body({ id: { type: 'string', description: 'Custom id (optional)' }, ...blockFields }, ['type']),
    responses: { 201: json(one('Block'), 'Utworzono') },
  },
  'PATCH /api/blocks/:id': {
    tag: 'Knowledge blocks', operationId: 'updateBlock', summary: 'Update a block',
    description: 'The data field is merged (key = null removes the field), unless replace=1',
    parameters: [idParam('block', '/api/blocks'), replaceParam],
    requestBody: body(blockFields),
    responses: { 200: json(one('Block')) },
  },
  'DELETE /api/blocks/:id': {
    tag: 'Knowledge blocks', operationId: 'deleteBlock', summary: 'Delete a block',
    parameters: [idParam('block', '/api/blocks')],
    responses: { 204: noContent },
  },

  // ---------------------------------------------------------------- templates
  'GET /api/templates': {
    tag: 'Templates', operationId: 'listTemplates', summary: 'List templates',
    description: 'With slide descriptions: data.* fields, #item cards and their fields',
    responses: { 200: json(list('Template')) },
  },
  'GET /api/templates/:id': {
    tag: 'Templates', operationId: 'getTemplate', summary: 'Get a template',
    parameters: [idParam('template', '/api/templates')],
    responses: { 200: json(one('Template')) },
  },
  'GET /api/templates/:id/file': {
    tag: 'Templates', operationId: 'downloadTemplate', summary: 'Download the template .figcraft file',
    parameters: [idParam('template', '/api/templates')],
    responses: { 200: binary('application/octet-stream', '.figcraft file') },
  },
  'GET /api/library': {
    tag: 'Templates', operationId: 'listLibrarySlides', summary: 'All library slides',
    description: 'Slides from all files: fields, #item cards, #pick slots and thumbnail',
    responses: { 200: json(list('LibrarySlide')) },
  },
  'POST /api/templates': {
    tag: 'Templates', operationId: 'uploadTemplate', summary: 'Upload a slide file',
    description: 'multipart: .figcraft, .json, .fig, .penpot, .sketch or .svg (converted by FigCraft). With content-type application/json: raw page/document JSON, id and name in the query. An existing id = file replacement. Slide and component names must be unique in the library (409)',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: { type: 'string', format: 'binary', description: 'A .figcraft, .json, .fig, .penpot, .sketch or .svg file' },
              id: { type: 'string', description: 'Template id (defaults to the file name)' },
              name: { type: 'string', description: 'Template name' },
              base: { type: 'string', description: 'Optional: the updated_at of the version you edited (x-updated-at of GET …/file). If the file was saved since, nothing is stored and the answer is 409 with code "stale"' },
            },
          },
        },
      },
    },
    responses: { 201: json(one('Template'), 'Utworzono') },
  },
  'PATCH /api/templates/:id': {
    tag: 'Templates', operationId: 'updateTemplate', summary: 'Rename a template',
    parameters: [idParam('template', '/api/templates')],
    requestBody: body({ name: { type: 'string', description: 'New name' } }, ['name']),
    responses: { 200: json(one('Template')) },
  },
  'DELETE /api/templates/:id': {
    tag: 'Templates', operationId: 'deleteTemplate', summary: 'Delete a template',
    parameters: [idParam('template', '/api/templates')],
    responses: { 204: noContent },
  },

  // ---------------------------------------------------------------- offers
  'GET /api/offers': {
    tag: 'Offers', operationId: 'listOffers', summary: 'List offers',
    responses: { 200: json(list('Offer')) },
  },
  'GET /api/offers/:id': {
    tag: 'Offers', operationId: 'getOffer', summary: 'Get an offer with its slides',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 200: json(one('Offer')) },
  },
  'POST /api/offers': {
    tag: 'Offers', operationId: 'createOffer', summary: 'Create an offer',
    requestBody: body({
      id: { type: 'string', description: 'Custom id (optional)' },
      name: { type: 'string', description: 'Offer name' },
      template_id: { type: 'string', description: 'Template (defaults to the first one)', 'x-n8n-list': '/api/templates' },
      data: { type: 'object', description: 'Offer variables, e.g. {"client": "ACME Inc.", "price": "12,000"}' },
      slides: { type: 'array', items: anyObject, description: 'Slides: [{frame, data, block_ids?, query?}]' },
    }, ['name']),
    responses: { 201: json(one('Offer'), 'Utworzono') },
  },
  'PATCH /api/offers/:id': {
    tag: 'Offers', operationId: 'updateOffer', summary: 'Update an offer',
    description: 'E.g. client and price: data = {"client": "ACME Inc.", "price": "12,000"}. The data field is merged, unless replace=1',
    parameters: [idParam('offer', '/api/offers'), replaceParam],
    requestBody: body({
      name: { type: 'string', description: 'Offer name' },
      template_id: { type: 'string', description: 'Template', 'x-n8n-list': '/api/templates' },
      data: { type: 'object', description: 'Offer variables' },
    }),
    responses: { 200: json(one('Offer')) },
  },
  'DELETE /api/offers/:id': {
    tag: 'Offers', operationId: 'deleteOffer', summary: 'Delete an offer',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 204: noContent },
  },
  'POST /api/offers/:id/duplicate': {
    tag: 'Offers', operationId: 'duplicateOffer', summary: 'Duplicate an offer',
    parameters: [idParam('offer to duplicate', '/api/offers')],
    requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string', description: 'Name of the copy' } } } } } },
    responses: { 201: json(one('Offer'), 'Utworzono') },
  },
  'PUT /api/offers/:id/order': {
    tag: 'Slides', operationId: 'reorderSlides', summary: 'Reorder slides',
    parameters: [idParam('offer', '/api/offers')],
    requestBody: body({ ids: { type: 'array', items: { type: 'string' }, description: 'Ids of all slides in the new order' } }, ['ids']),
    responses: { 200: json(one('Offer')) },
  },
  'GET /api/offers/:id/preview': {
    tag: 'Offers', operationId: 'previewOffer', summary: 'Offer preview (slide PNGs)',
    description: 'Renders the preview and returns {key, ms, slides: [{id, frame, hidden, url, error?}]}',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 200: json(anyObject) },
  },
  'GET /api/offers/:id/pdf': {
    tag: 'Offers', operationId: 'downloadOfferPdf', summary: 'Download the offer PDF',
    description: 'PDF from FigCraft; hidden slides are skipped',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 200: binary('application/pdf', 'PDF') },
  },
  'GET /api/offers/:id/figcraft': {
    tag: 'Offers', operationId: 'downloadOfferFigcraft', summary: 'Download the offer as .figcraft',
    description: 'The finished offer, for manual edits in FigCraft',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 200: binary('application/octet-stream', '.figcraft file') },
  },

  // ---------------------------------------------------------------- slides
  'POST /api/offers/:id/slides': {
    tag: 'Slides', operationId: 'addSlide', summary: 'Add a slide to an offer',
    parameters: [idParam('offer', '/api/offers')],
    requestBody: body(slideFields, ['frame']),
    responses: { 201: json(one('Slide'), 'Utworzono') },
  },
  // ---------------------------------------------------------------- tiles and offers from tiles
  'GET /api/tiles': {
    tag: 'Tiles', operationId: 'listTiles', summary: 'List tiles',
    responses: { 200: json(list('Tile')) },
  },
  'POST /api/tiles': {
    tag: 'Tiles', operationId: 'createTile', summary: 'Add a tile',
    description: 'The id is built from the category and name (e.g. pain:new-pain) unless you give one',
    requestBody: body({ id: { type: 'string', description: 'Own id (optional), category:slug' }, category: { type: 'string', enum: ['role', 'segment', 'pain', 'product'] }, ...tileFields }, ['category', 'label']),
    responses: { 201: json(one('Tile'), 'Created') },
  },
  'PATCH /api/tiles/:id': {
    tag: 'Tiles', operationId: 'updateTile', summary: 'Update a tile',
    parameters: [idParam('tile', '/api/tiles'), replaceParam],
    requestBody: body(tileFields),
    responses: { 200: json(one('Tile')) },
  },
  'DELETE /api/tiles/:id': {
    tag: 'Tiles', operationId: 'deleteTile', summary: 'Delete a tile',
    description: 'Block tags and offers that use the tile keep it; an offer shows it as deleted',
    parameters: [idParam('tile', '/api/tiles')],
    responses: { 204: noContent },
  },
  'GET /api/scenarios': {
    tag: 'Tiles', operationId: 'listScenarios', summary: 'Role scenarios',
    responses: { 200: json(list('Scenario')) },
  },
  'GET /api/scenarios/:id': {
    tag: 'Tiles', operationId: 'getScenario', summary: 'Get a scenario',
    parameters: [idParam('scenario (role tile)', '/api/scenarios')],
    responses: { 200: json(one('Scenario')) },
  },
  'PUT /api/scenarios/:id': {
    tag: 'Tiles', operationId: 'saveScenario', summary: 'Save a scenario',
    description: 'Existing offers pick up the change when they are recomputed',
    parameters: [idParam('scenario (role tile)', '/api/scenarios')],
    requestBody: body({ name: { type: 'string' }, steps: { type: 'array', items: anyObject, description: 'Scenario steps' } }, ['steps']),
    responses: { 200: json(one('Scenario')) },
  },
  'POST /api/offers/generate': {
    tag: 'Tiles', operationId: 'generateOffer', summary: 'Generate an offer from tiles',
    description: 'Builds the offer from the role scenario and picks content by tiles. Choose the tiles with GET /api/tiles: each tile has data.pick_when and data.avoid_when. The same tiles give the same offer. The response includes coverage: which pains are solved',
    requestBody: body({
      client: { type: 'string', description: 'Client name' },
      tiles: tilesList,
      name: { type: 'string', description: 'Offer name (default: client · role)' },
      price: { type: 'string', description: 'Price (default: the product tile price)' },
      made_by: { type: 'string', description: 'Set when a model chose the tiles (e.g. "n8n (AI)"): the offer keeps these tiles, so later changes show as corrections' },
      enquiry: { type: 'string', description: 'The enquiry the model read (kept on the offer, shown with corrections)' },
      summary: { type: 'string', description: 'The model\'s note for the salesperson' },
      lessons: { type: 'array', items: { type: 'string' }, description: 'Ids of the lessons the model was given (counted as used)' },
      intake: { type: 'object', description: 'How the request was read, shown in the offer view: {source, text (what came in), transcribed_by, summary, analysis: [steps], reasons: {role, segment, product, pains}, evidence: {<tile id>: "the client\'s words behind it"}}. Only these keys, capped sizes' },
    }, ['client', 'tiles']),
    responses: { 201: json(one('Offer'), 'Created') },
  },
  'PUT /api/offers/:id/tiles': {
    tag: 'Tiles', operationId: 'setOfferTiles', summary: 'Change offer tiles and recompute',
    description: 'Slides edited by hand (locked) stay unchanged',
    parameters: [idParam('offer', '/api/offers')],
    requestBody: body({ tiles: tilesList }, ['tiles']),
    responses: { 200: json(one('Offer')) },
  },
  'GET /api/offers/:id/slots': {
    tag: 'Tiles', operationId: 'getOfferSlots', summary: 'Swappable slots of an offer, with candidates',
    description: 'For each slide of the base deck: its slots (kind, capacity), which kinds of client tiles it answers, the elements in it now and every candidate element with its description, tiles, linked solutions and the client tiles it matches (matched not empty = highlighted). Feed this to a model to choose elements, then send the choice with PUT',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 200: json(anyObject) },
  },
  'PUT /api/offers/:id/slots': {
    tag: 'Tiles', operationId: 'setOfferSlots', summary: 'Put chosen elements into slots',
    description: 'The choice per slide, e.g. from a model: {"slides": [{"slide_id": "...", "items": [{"id": "pr-hidden-know-how", "reason": "Client wants local research"}]}]}. Elements must be candidates of that slot and fit its capacity (400 otherwise). Chosen slides are kept on recompute, like manual edits. Returns the offer',
    parameters: [idParam('offer', '/api/offers')],
    requestBody: body({
      slides: { type: 'array', items: anyObject, description: 'Per slide: {slide_id, items: [{id, reason?}]}' },
      chosen_by: { type: 'string', description: 'Who chose, shown in the offer (default "model")' },
    }, ['slides']),
    responses: { 200: json(one('Offer')) },
  },
  'GET /api/offers/:id/content': {
    tag: 'Tiles', operationId: 'getOfferContent', summary: 'Slide copy a model writes for the client',
    description: 'For each slide of the base deck that has copy written per client: the fields, what to write in each (hint), the length limit, the current value, and for list fields (a slide\'s cards) the item count and columns. Optional slides (e.g. the tool comparison) start hidden. "reader" names who the deck is for (the role tile: label, description, writing brief) and "product" the product with its brief; hints already include what changes for that role and product, and the default copy is written for them. "evidence" is what the library knows for the client tiles: per pain its description, typical quotes from other clients, up to 3 solutions that fit the segment and product and up to 3 proof items (a solution marked general comes from another segment when the segment has none; no_solution: true when the library has nothing that fits the product). Feed this to a model with the call transcript, then send its answer with PUT',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 200: json(anyObject) },
  },
  'PUT /api/offers/:id/content': {
    tag: 'Tiles', operationId: 'setOfferContent', summary: 'Write slide copy for the client',
    description: 'Per slide key: text fields as strings and list fields as items, e.g. {"slides": {"starting-point": {"lead": "...", "areas": [{"title": "Contract review", "value": "..."}]}, "tool-comparison": {"hide": true}}}. Only the fields from GET; texts over their limit, wrong item counts or unknown fields are refused with a 400 that lists every problem. Written slides are kept on recompute, like manual edits. "hide" works on optional slides only; writing an optional slide shows it. Returns the offer',
    parameters: [idParam('offer', '/api/offers')],
    requestBody: body({
      slides: { type: 'object', description: '{"<slide key>": {"<field>": "text" | [{"title", "value", "value2"?}], "hide"?: true}}' },
      written_by: { type: 'string', description: 'Who wrote it, shown in the offer (default "model")' },
      lessons: { type: 'array', items: { type: 'string' }, description: 'Ids of the lessons the model was given (from "lessons" in GET)' },
    }, ['slides']),
    responses: { 200: json(one('Offer')) },
  },
  'POST /api/offers/:id/recompute': {
    tag: 'Tiles', operationId: 'recomputeOffer', summary: 'Recompute an offer from tiles',
    description: 'E.g. after a scenario or content change. Slides edited by hand stay',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 200: json(one('Offer')) },
  },

  'GET /api/slides/:id': {
    tag: 'Slides', operationId: 'getSlide', summary: 'Get a slide',
    parameters: [idParam('slide')],
    responses: { 200: json(one('Slide')) },
  },
  'PATCH /api/slides/:id': {
    tag: 'Slides', operationId: 'updateSlide', summary: 'Update a slide',
    description: 'The data field is merged, unless replace=1. A change marks the slide as edited by hand (locked). {"locked": false} alone restores the automatic content: it recomputes the offer and returns the whole offer (the slide may get a new id)',
    parameters: [idParam('slide'), replaceParam],
    requestBody: body(slideFields),
    responses: { 200: json(one('Slide')) },
  },
  'DELETE /api/slides/:id': {
    tag: 'Slides', operationId: 'deleteSlide', summary: 'Delete a slide',
    parameters: [idParam('slide')],
    responses: { 204: noContent },
  },

  // ---------------------------------------------------------------- components
  'GET /api/components': {
    tag: 'Components', operationId: 'listComponents', summary: 'List cards with descriptions',
    description: 'Cards from @… sets in the library, with descriptions for the AI (SQLite) and a thumbnail',
    parameters: [
      { name: 'set', in: 'query', description: 'Only cards from this set', schema: { type: 'string' } },
      { name: 'missing', in: 'query', description: '1 = also cards that are no longer in the library', schema: { type: 'string', enum: ['', '1'] } },
    ],
    responses: { 200: json(list('Component')) },
  },
  'GET /api/components/:set/:key': {
    tag: 'Components', operationId: 'getComponent', summary: 'Get a card',
    parameters: [setParam, keyParam],
    responses: { 200: json(one('Component')) },
  },
  'PATCH /api/components/:set/:key': {
    tag: 'Components', operationId: 'updateComponent', summary: 'Update a card description',
    description: 'Description, when to pick / when to avoid, topic, variant, tags, data. The data field is merged, unless replace=1',
    parameters: [setParam, keyParam, replaceParam],
    requestBody: body(componentFields),
    responses: { 200: json(one('Component')) },
  },
  'GET /api/component-sets': {
    tag: 'Components', operationId: 'listComponentSets', summary: 'Card sets with rules',
    responses: { 200: json(list('ComponentSet')) },
  },
  'PATCH /api/component-sets/:id': {
    tag: 'Components', operationId: 'updateComponentSet', summary: 'Update set rules',
    parameters: [idParam('set', '/api/component-sets')],
    requestBody: body({ title: { type: 'string', description: 'Name' }, rules: { type: 'string', description: 'Picking rules for the AI, e.g. "6 cards, exactly one highlighted"' } }),
    responses: { 200: json(one('ComponentSet')) },
  },
  'GET /api/slides/:id/pick-context': {
    tag: 'Components', operationId: 'getPickContext', summary: 'Card-picking context',
    description: 'Offer, slide, slot count, set rules and card descriptions: everything an agent (e.g. in n8n) needs to pick cards. Send the choice with PATCH /api/slides/:id {"picks": {"<set>": [{"component": "…"}]}}',
    parameters: [idParam('slide')],
    responses: { 200: json(anyObject) },
  },

  // ---------------------------------------------------------------- lessons
  'GET /api/lessons': {
    tag: 'Lessons', operationId: 'listLessons', summary: 'List lessons',
    description: 'Every lesson, or with active=1 / tiles / step only the active ones that apply: kind=plan for choosing tiles (n8n reads these before planning), kind=copy&tiles=<offer tiles> for writing (the content endpoint already includes them). Each has "used": how many offers were made with it',
    parameters: [
      { name: 'kind', in: 'query', schema: { type: 'string', enum: ['', 'plan', 'copy'] }, description: 'plan or copy' },
      { name: 'active', in: 'query', schema: { type: 'string', enum: ['', '1'] }, description: '1 = only active lessons' },
      { name: 'tiles', in: 'query', schema: { type: 'string' }, description: 'Comma-separated offer tiles: copy lessons that apply to them' },
      { name: 'step', in: 'query', schema: { type: 'string' }, description: 'Only lessons for this slide (and the whole deck)' },
    ],
    responses: { 200: json(list('Lesson')) },
  },
  'GET /api/lessons/:id': {
    tag: 'Lessons', operationId: 'getLesson', summary: 'Get a lesson',
    parameters: [idParam('lesson', '/api/lessons')],
    responses: { 200: json(one('Lesson')) },
  },
  'POST /api/lessons': {
    tag: 'Lessons', operationId: 'createLesson', summary: 'Teach the model a rule',
    description: 'Works from the next offer: the model reads active lessons on every run. Start from a draft in GET /api/offers/:id/corrections',
    requestBody: body(lessonFields, ['kind', 'text']),
    responses: { 201: json(one('Lesson'), 'Created') },
  },
  'PATCH /api/lessons/:id': {
    tag: 'Lessons', operationId: 'updateLesson', summary: 'Update a lesson (e.g. {"active": false})',
    parameters: [idParam('lesson', '/api/lessons')],
    requestBody: body(lessonFields),
    responses: { 200: json(one('Lesson')) },
  },
  'DELETE /api/lessons/:id': {
    tag: 'Lessons', operationId: 'deleteLesson', summary: 'Delete a lesson',
    parameters: [idParam('lesson', '/api/lessons')],
    responses: { 204: noContent },
  },
  'GET /api/offers/:id/corrections': {
    tag: 'Lessons', operationId: 'getOfferCorrections', summary: 'What people changed after the model',
    description: 'For an offer made by the model: the tiles it chose against the tiles now (tiles: {model, now, added, removed}) and every slide field it wrote whose text was changed since (fields: [{step, field, model, now}]). Each comes with "draft": a lesson to finish and send to POST /api/lessons',
    parameters: [idParam('offer', '/api/offers')],
    responses: { 200: json(anyObject) },
  },
  // ---------------------------------------------------------------- database
  'GET /api/export': {
    tag: 'Database', operationId: 'exportAll', summary: 'Export the whole database',
    description: 'Blocks, templates (files in base64), offers and slides in one JSON',
    responses: { 200: json(anyObject) },
  },
  'POST /api/import': {
    tag: 'Database', operationId: 'importAll', summary: 'Import the database',
    description: 'merge overwrites records with the same ids; replace replaces the whole database',
    parameters: [{ name: 'mode', in: 'query', description: 'merge or replace', schema: { type: 'string', enum: ['merge', 'replace'], default: 'merge' } }],
    requestBody: { required: true, 'x-raw-body': true, content: { 'application/json': { schema: anyObject } } },
    responses: { 200: json(anyObject) },
  },
};

// Tables reported by the /api/events stream (the `table` field; '*' = whole-database import).
export const EVENT_TABLES = ['offers', 'slides', 'blocks', 'templates', 'components', 'component_sets', '*'];

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/** API routes of the Hono app: [{method, path}] without middleware or duplicates. */
export function apiRoutes(app) {
  const seen = new Set();
  const out = [];
  for (const r of app.routes) {
    if (!HTTP_METHODS.has(r.method) || !r.path.startsWith('/api/')) continue;
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ method: r.method, path: r.path, key });
  }
  return out;
}

const toOpenApiPath = (p) => p.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
const camel = (s) => s.replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase());

/** OpenAPI 3.1 spec for the given `routes` (see apiRoutes). */
export function buildSpec(routes, { version = '0.0.0', docs = DOCS } = {}) {
  const paths = {};
  for (const { method, path, key } of routes) {
    const doc = docs[key];
    const oaPath = toOpenApiPath(path);
    const pathParams = [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    let op;
    if (doc) {
      const { tag, ...rest } = doc;
      op = { tags: [tag], ...rest };
    } else {
      // Undocumented route: still reaches n8n, with a generic JSON field.
      op = {
        tags: [path.split('/')[2] || 'api'],
        operationId: camel(`${method.toLowerCase()} ${path.replace(/^\/api\//, '').replace(/:/g, 'by ')}`),
        summary: `${method} ${path}`,
        'x-undocumented': true,
        parameters: pathParams.map((name) => ({ name, in: 'path', required: true, schema: { type: 'string' } })),
        responses: { 200: { description: 'OK' } },
      };
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        op.requestBody = { required: false, 'x-raw-body': true, content: { 'application/json': { schema: anyObject } } };
      }
    }
    (paths[oaPath] ??= {})[method.toLowerCase()] = op;
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Offer Studio API',
      version,
      description: 'Knowledge base and offer builder. Slides, previews and PDFs are rendered by FigCraft.',
    },
    servers: [{ url: '/' }],
    security: [{ bearer: [] }, { basic: [] }],
    tags: TAGS,
    paths,
    components: {
      schemas: SCHEMAS,
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer', description: 'STUDIO_API_TOKEN' },
        basic: { type: 'http', scheme: 'basic', description: 'Any username + STUDIO_PASSWORD' },
      },
    },
    'x-offer-studio': { events: { path: '/api/events', tables: EVENT_TABLES } },
  };
}
