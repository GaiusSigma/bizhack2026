// Opis API w formacie OpenAPI 3.1, budowany z tras zarejestrowanych w Hono.
//
// Z tego opisu korzysta węzeł n8n „Offer Studio” (katalog n8n/): czyta /api/openapi.json na żywo
// i sam buduje listę operacji oraz pól. Nowy endpoint pojawia się więc w n8n po redeployu
// Offer Studio, bez przebudowy n8n.
//
// Dodajesz trasę w server.js -> dopisz jej opis w DOCS (klucz "METHOD /api/ścieżka").
// Trasa bez opisu i tak trafia do specyfikacji (z ogólnym polem JSON), ale test
// `openapi: każda trasa API ma opis` przypomni o uzupełnieniu.
//
// Rozszerzenia czytane przez węzeł n8n:
//   x-n8n-list: '/api/offers'  przy parametrze/polu: lista do wyboru (id + name/title)
//   x-n8n-hidden: true         operacja nie jest pokazywana jako akcja (np. strumień SSE)
//   x-raw-body: true           całe body to jeden JSON (np. import bazy)

const json = (schema, description = 'OK') => ({ description, content: { 'application/json': { schema } } });
const binary = (type, description) => ({ description, content: { [type]: { schema: { type: 'string', format: 'binary' } } } });
const noContent = { description: 'Usunięto' };

const anyObject = { type: 'object', additionalProperties: true };
const list = (ref) => ({ type: 'array', items: { $ref: `#/components/schemas/${ref}` } });
const one = (ref) => ({ $ref: `#/components/schemas/${ref}` });

const idParam = (what, listPath) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `Id: ${what}`,
  schema: { type: 'string' },
  ...(listPath ? { 'x-n8n-list': listPath } : {}),
});
const replaceParam = {
  name: 'replace',
  in: 'query',
  description: '1 = zastąp całe pole data zamiast scalać',
  schema: { type: 'string', enum: ['', '1'] },
};

const TAGS = [
  { name: 'Oferty', description: 'Oferty: zmienne, slajdy, PDF i plik .figcraft' },
  { name: 'Slajdy', description: 'Slajdy oferty' },
  { name: 'Bloki wiedzy', description: 'Use case\'y, problemy, argumenty i inne bloki' },
  { name: 'Szablony', description: 'Szablony FigCraft (.figcraft)' },
  { name: 'Baza', description: 'Eksport i import całej bazy' },
  { name: 'System', description: 'Opis API, metadane, zdarzenia' },
];

const blockFields = {
  type: { type: 'string', description: 'Typ bloku, np. use_case, problem, argument' },
  title: { type: 'string', description: 'Tytuł' },
  body: { type: 'string', description: 'Treść' },
  data: { type: 'object', description: 'Pola specyficzne dla typu, np. {"effect": "..."}' },
  tags: { type: 'array', items: { type: 'string' }, description: 'Tagi, np. ["kancelaria"]' },
};
const slideFields = {
  frame: { type: 'string', description: 'Nazwa slajdu w szablonie FigCraft' },
  data: { type: 'object', description: 'Treść slajdu, np. {"title": "..."}' },
  block_ids: { type: 'array', items: { type: 'string' }, description: 'Konkretne bloki, w tej kolejności' },
  query: { type: 'object', description: 'Bloki z zapytania: {"type": "use_case", "tag": "kancelaria", "limit": 6}' },
  position: { type: 'number', description: 'Pozycja na liście slajdów (od 0)' },
  hidden: { type: 'boolean', description: 'Ukryty slajd (pomijany w PDF)' },
};

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
};

const body = (properties, required = []) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', properties, required } } },
});

export const DOCS = {
  // ---------------------------------------------------------------- system
  'GET /api/openapi.json': {
    tag: 'System', operationId: 'getOpenApi', summary: 'Opis API (OpenAPI)',
    responses: { 200: json(anyObject) },
  },
  'GET /api/meta': {
    tag: 'System', operationId: 'getMeta', summary: 'Typy i tagi w użyciu',
    description: 'Typy bloków, tagi i adres FigCraft web',
    responses: { 200: json(anyObject) },
  },
  'GET /api/events': {
    tag: 'System', operationId: 'streamEvents', summary: 'Strumień zmian (SSE)',
    description: 'Server-Sent Events: {table, id, offer_id} po każdej zmianie. W n8n: węzeł Offer Studio Trigger.',
    'x-n8n-hidden': true,
    responses: { 200: { description: 'text/event-stream', content: { 'text/event-stream': { schema: { type: 'string' } } } } },
  },

  // ---------------------------------------------------------------- bloki
  'GET /api/blocks': {
    tag: 'Bloki wiedzy', operationId: 'listBlocks', summary: 'Lista bloków',
    parameters: [
      { name: 'type', in: 'query', description: 'Tylko bloki tego typu', schema: { type: 'string' } },
      { name: 'tag', in: 'query', description: 'Tylko bloki z tym tagiem', schema: { type: 'string' } },
      { name: 'q', in: 'query', description: 'Szukaj w tytule i treści', schema: { type: 'string' } },
    ],
    responses: { 200: json(list('Block')) },
  },
  'GET /api/blocks/:id': {
    tag: 'Bloki wiedzy', operationId: 'getBlock', summary: 'Pobierz blok',
    parameters: [idParam('bloku', '/api/blocks')],
    responses: { 200: json(one('Block')) },
  },
  'POST /api/blocks': {
    tag: 'Bloki wiedzy', operationId: 'createBlock', summary: 'Dodaj blok',
    description: 'Jeden blok albo tablica bloków (tablicę podaj w opcji „Treść JSON”)',
    requestBody: body({ id: { type: 'string', description: 'Własne id (opcjonalnie)' }, ...blockFields }, ['type']),
    responses: { 201: json(one('Block'), 'Utworzono') },
  },
  'PATCH /api/blocks/:id': {
    tag: 'Bloki wiedzy', operationId: 'updateBlock', summary: 'Zmień blok',
    description: 'Pole data jest scalane (klucz = null usuwa pole), chyba że replace=1',
    parameters: [idParam('bloku', '/api/blocks'), replaceParam],
    requestBody: body(blockFields),
    responses: { 200: json(one('Block')) },
  },
  'DELETE /api/blocks/:id': {
    tag: 'Bloki wiedzy', operationId: 'deleteBlock', summary: 'Usuń blok',
    parameters: [idParam('bloku', '/api/blocks')],
    responses: { 204: noContent },
  },

  // ---------------------------------------------------------------- szablony
  'GET /api/templates': {
    tag: 'Szablony', operationId: 'listTemplates', summary: 'Lista szablonów',
    description: 'Z opisem slajdów: pola data.*, karty #item i ich pola',
    responses: { 200: json(list('Template')) },
  },
  'GET /api/templates/:id': {
    tag: 'Szablony', operationId: 'getTemplate', summary: 'Pobierz szablon',
    parameters: [idParam('szablonu', '/api/templates')],
    responses: { 200: json(one('Template')) },
  },
  'GET /api/templates/:id/file': {
    tag: 'Szablony', operationId: 'downloadTemplate', summary: 'Pobierz plik .figcraft szablonu',
    parameters: [idParam('szablonu', '/api/templates')],
    responses: { 200: binary('application/octet-stream', 'Plik .figcraft') },
  },
  'POST /api/templates': {
    tag: 'Szablony', operationId: 'uploadTemplate', summary: 'Wgraj szablon .figcraft',
    description: 'Istniejące id = podmiana pliku szablonu',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: { type: 'string', format: 'binary', description: 'Plik .figcraft' },
              id: { type: 'string', description: 'Id szablonu (domyślnie z nazwy pliku)' },
              name: { type: 'string', description: 'Nazwa szablonu' },
            },
          },
        },
      },
    },
    responses: { 201: json(one('Template'), 'Utworzono') },
  },
  'PATCH /api/templates/:id': {
    tag: 'Szablony', operationId: 'updateTemplate', summary: 'Zmień nazwę szablonu',
    parameters: [idParam('szablonu', '/api/templates')],
    requestBody: body({ name: { type: 'string', description: 'Nowa nazwa' } }, ['name']),
    responses: { 200: json(one('Template')) },
  },
  'DELETE /api/templates/:id': {
    tag: 'Szablony', operationId: 'deleteTemplate', summary: 'Usuń szablon',
    parameters: [idParam('szablonu', '/api/templates')],
    responses: { 204: noContent },
  },

  // ---------------------------------------------------------------- oferty
  'GET /api/offers': {
    tag: 'Oferty', operationId: 'listOffers', summary: 'Lista ofert',
    responses: { 200: json(list('Offer')) },
  },
  'GET /api/offers/:id': {
    tag: 'Oferty', operationId: 'getOffer', summary: 'Pobierz ofertę ze slajdami',
    parameters: [idParam('oferty', '/api/offers')],
    responses: { 200: json(one('Offer')) },
  },
  'POST /api/offers': {
    tag: 'Oferty', operationId: 'createOffer', summary: 'Utwórz ofertę',
    requestBody: body({
      id: { type: 'string', description: 'Własne id (opcjonalnie)' },
      name: { type: 'string', description: 'Nazwa oferty' },
      template_id: { type: 'string', description: 'Szablon (domyślnie pierwszy)', 'x-n8n-list': '/api/templates' },
      data: { type: 'object', description: 'Zmienne oferty, np. {"client": "ACME S.A.", "price": "12 000"}' },
      slides: { type: 'array', items: anyObject, description: 'Slajdy: [{frame, data, block_ids?, query?}]' },
    }, ['name']),
    responses: { 201: json(one('Offer'), 'Utworzono') },
  },
  'PATCH /api/offers/:id': {
    tag: 'Oferty', operationId: 'updateOffer', summary: 'Zmień ofertę',
    description: 'Np. klient i cena: data = {"client": "ACME S.A.", "price": "12 000"}. Pole data jest scalane, chyba że replace=1',
    parameters: [idParam('oferty', '/api/offers'), replaceParam],
    requestBody: body({
      name: { type: 'string', description: 'Nazwa oferty' },
      template_id: { type: 'string', description: 'Szablon', 'x-n8n-list': '/api/templates' },
      data: { type: 'object', description: 'Zmienne oferty' },
    }),
    responses: { 200: json(one('Offer')) },
  },
  'DELETE /api/offers/:id': {
    tag: 'Oferty', operationId: 'deleteOffer', summary: 'Usuń ofertę',
    parameters: [idParam('oferty', '/api/offers')],
    responses: { 204: noContent },
  },
  'POST /api/offers/:id/duplicate': {
    tag: 'Oferty', operationId: 'duplicateOffer', summary: 'Skopiuj ofertę',
    parameters: [idParam('oferty do skopiowania', '/api/offers')],
    requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string', description: 'Nazwa kopii' } } } } } },
    responses: { 201: json(one('Offer'), 'Utworzono') },
  },
  'PUT /api/offers/:id/order': {
    tag: 'Slajdy', operationId: 'reorderSlides', summary: 'Ustaw kolejność slajdów',
    parameters: [idParam('oferty', '/api/offers')],
    requestBody: body({ ids: { type: 'array', items: { type: 'string' }, description: 'Id wszystkich slajdów w nowej kolejności' } }, ['ids']),
    responses: { 200: json(one('Offer')) },
  },
  'GET /api/offers/:id/preview': {
    tag: 'Oferty', operationId: 'previewOffer', summary: 'Podgląd oferty (PNG slajdów)',
    description: 'Renderuje podgląd i zwraca {key, ms, slides: [{id, frame, hidden, url, error?}]}',
    parameters: [idParam('oferty', '/api/offers')],
    responses: { 200: json(anyObject) },
  },
  'GET /api/offers/:id/pdf': {
    tag: 'Oferty', operationId: 'downloadOfferPdf', summary: 'Pobierz PDF oferty',
    description: 'PDF z FigCraft; ukryte slajdy są pomijane',
    parameters: [idParam('oferty', '/api/offers')],
    responses: { 200: binary('application/pdf', 'PDF') },
  },
  'GET /api/offers/:id/figcraft': {
    tag: 'Oferty', operationId: 'downloadOfferFigcraft', summary: 'Pobierz ofertę jako .figcraft',
    description: 'Gotowa oferta do ręcznych poprawek w FigCraft',
    parameters: [idParam('oferty', '/api/offers')],
    responses: { 200: binary('application/octet-stream', 'Plik .figcraft') },
  },

  // ---------------------------------------------------------------- slajdy
  'POST /api/offers/:id/slides': {
    tag: 'Slajdy', operationId: 'addSlide', summary: 'Dodaj slajd do oferty',
    parameters: [idParam('oferty', '/api/offers')],
    requestBody: body(slideFields, ['frame']),
    responses: { 201: json(one('Slide'), 'Utworzono') },
  },
  'GET /api/slides/:id': {
    tag: 'Slajdy', operationId: 'getSlide', summary: 'Pobierz slajd',
    parameters: [idParam('slajdu')],
    responses: { 200: json(one('Slide')) },
  },
  'PATCH /api/slides/:id': {
    tag: 'Slajdy', operationId: 'updateSlide', summary: 'Zmień slajd',
    description: 'Pole data jest scalane, chyba że replace=1',
    parameters: [idParam('slajdu'), replaceParam],
    requestBody: body(slideFields),
    responses: { 200: json(one('Slide')) },
  },
  'DELETE /api/slides/:id': {
    tag: 'Slajdy', operationId: 'deleteSlide', summary: 'Usuń slajd',
    parameters: [idParam('slajdu')],
    responses: { 204: noContent },
  },

  // ---------------------------------------------------------------- baza
  'GET /api/export': {
    tag: 'Baza', operationId: 'exportAll', summary: 'Eksport całej bazy',
    description: 'Bloki, szablony (pliki w base64), oferty i slajdy w jednym JSON',
    responses: { 200: json(anyObject) },
  },
  'POST /api/import': {
    tag: 'Baza', operationId: 'importAll', summary: 'Import bazy',
    description: 'merge nadpisuje rekordy o tych samych id; replace zastępuje całą bazę',
    parameters: [{ name: 'mode', in: 'query', description: 'merge albo replace', schema: { type: 'string', enum: ['merge', 'replace'], default: 'merge' } }],
    requestBody: { required: true, 'x-raw-body': true, content: { 'application/json': { schema: anyObject } } },
    responses: { 200: json(anyObject) },
  },
};

// Tabele, o których mówi strumień zdarzeń /api/events (pole `table`; '*' = import całej bazy).
export const EVENT_TABLES = ['offers', 'slides', 'blocks', 'templates', '*'];

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/** Trasy API z aplikacji Hono: [{method, path}] bez middleware i bez duplikatów. */
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

/** Specyfikacja OpenAPI 3.1 dla tras z `routes` (zob. apiRoutes). */
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
      // Trasa bez opisu: i tak trafia do n8n, z ogólnym polem JSON.
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
      description: 'Baza wiedzy i składanie ofert. Slajdy, podgląd i PDF renderuje FigCraft.',
    },
    servers: [{ url: '/' }],
    security: [{ bearer: [] }, { basic: [] }],
    tags: TAGS,
    paths,
    components: {
      schemas: SCHEMAS,
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer', description: 'STUDIO_API_TOKEN' },
        basic: { type: 'http', scheme: 'basic', description: 'Dowolny login + STUDIO_PASSWORD' },
      },
    },
    'x-offer-studio': { events: { path: '/api/events', tables: EVENT_TABLES } },
  };
}
