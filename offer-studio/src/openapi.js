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
  { name: 'Kafelki', description: 'Kafelki (rola, segment, ból, produkt), scenariusze ról i oferty generowane z kafelków' },
  { name: 'Slajdy', description: 'Slajdy oferty' },
  { name: 'Bloki wiedzy', description: 'Use case\'y, problemy, argumenty i inne bloki' },
  { name: 'Szablony', description: 'Biblioteka slajdów: pliki FigCraft, każda ramka najwyższego poziomu = slajd' },
  { name: 'Komponenty', description: 'Wymienne karty z zestawów @… (sloty #pick:…), ich opisy dla AI i dobór kart przez Claude' },
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
  picks: { type: 'object', description: 'Karty w slotach #pick: {"dlaczego": [{"component": "dlaczego/on-premise", "data": {"title": "..."}}]}' },
  position: { type: 'number', description: 'Pozycja na liście slajdów (od 0)' },
  hidden: { type: 'boolean', description: 'Ukryty slajd (pomijany w PDF)' },
  locked: { type: 'boolean', description: 'Poprawiony ręcznie: przeliczenie oferty go nie zmienia. Każda zmiana ustawia true, {"locked": false} przywraca automat' },
};
const tileFields = {
  label: { type: 'string', description: 'Nazwa, np. „Poufność”' },
  description: { type: 'string', description: 'Co ten kafelek znaczy' },
  quotes: { type: 'array', items: { type: 'string' }, description: 'Cytaty klientów' },
  status: { type: 'string', enum: ['active', 'soon'], description: 'soon = widoczny, ale nie do wybrania' },
  position: { type: 'number', description: 'Kolejność w kategorii' },
  data: { type: 'object', description: 'Dodatkowe pola, np. {"price": "12 000 zł"} dla produktu' },
};
const tilesList = { type: 'array', items: { type: 'string' }, description: 'Id kafelków: dokładnie jedna rola, jeden segment, jeden produkt i 1–5 bólów, np. ["rola:zarzad", "segment:kancelaria", "produkt:vault", "bol:poufnosc"]', 'x-n8n-list': '/api/tiles' };
const componentFields = {
  title: { type: 'string', description: 'Krótka nazwa karty' },
  description: { type: 'string', description: 'Co karta pokazuje (treść, wygląd)' },
  use_when: { type: 'string', description: 'Kiedy AI ma ją wybrać' },
  avoid_when: { type: 'string', description: 'Kiedy jej nie wybierać' },
  topic: { type: 'string', description: 'Temat: warianty jednego argumentu mają ten sam' },
  variant: { type: 'string', description: 'Wariant, np. zwykla, wyroznienie, liczba' },
  tags: { type: 'array', items: { type: 'string' }, description: 'Tagi' },
  data: { type: 'object', description: 'Stałe nadpisania pól {{…}} karty' },
};
const setParam = { name: 'set', in: 'path', required: true, description: 'Zestaw (nazwa ramki @… bez @)', schema: { type: 'string' } };
const keyParam = { name: 'key', in: 'path', required: true, description: 'Klucz karty (druga część id, np. on-premise)', schema: { type: 'string' } };

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
      fields: { type: 'object', description: '{data, item, sources, picks: {zestaw: liczba slotów}}' }, slots: { type: 'number' }, thumb: { type: 'string' },
    },
  },
  Component: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'zestaw/klucz' }, set_name: { type: 'string' }, key: { type: 'string' }, source: { type: 'string' },
      ...componentFields,
      figma_text: { type: 'string', description: 'Tekst narysowany w FigCraft' },
      fields: { type: 'array', items: { type: 'string' }, description: 'Pola {{…}} karty' },
      missing: { type: 'boolean', description: 'Karty nie ma już w bibliotece' },
      thumb: { type: 'string' }, created_at: { type: 'string' }, updated_at: { type: 'string' },
    },
  },
  Tile: {
    type: 'object',
    properties: { id: { type: 'string', description: 'kategoria:slug, np. bol:poufnosc' }, category: { type: 'string', enum: ['rola', 'segment', 'bol', 'produkt'] }, ...tileFields, created_at: { type: 'string' }, updated_at: { type: 'string' } },
  },
  Scenario: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Id kafelka roli, np. rola:zarzad' }, name: { type: 'string' },
      steps: { type: 'array', items: anyObject, description: 'Kroki: [{key, label, frame, data, data_by_product, fill: {kind: none|pains|blocks|picks, type, min, max, set}, when: {any: [kafelki]}}]' },
      created_at: { type: 'string' }, updated_at: { type: 'string' },
    },
  },
  ComponentSet: {
    type: 'object',
    properties: { id: { type: 'string' }, title: { type: 'string' }, rules: { type: 'string', description: 'Zasady doboru dla AI' }, components: { type: 'number' } },
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
  'GET /api/library': {
    tag: 'Szablony', operationId: 'listLibrarySlides', summary: 'Wszystkie slajdy biblioteki',
    description: 'Slajdy ze wszystkich plików: pola, karty #item, sloty #pick i miniatura',
    responses: { 200: json(list('LibrarySlide')) },
  },
  'POST /api/templates': {
    tag: 'Szablony', operationId: 'uploadTemplate', summary: 'Wgraj plik ze slajdami',
    description: 'multipart: .figcraft, .json, .fig, .penpot, .sketch albo .svg (konwersja przez FigCraft). Z content-type application/json: sam JSON strony/dokumentu, id i name w query. Istniejące id = podmiana pliku. Nazwy slajdów i komponentów muszą być unikalne w bibliotece (409)',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: { type: 'string', format: 'binary', description: 'Plik .figcraft, .json, .fig, .penpot, .sketch albo .svg' },
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
  // ---------------------------------------------------------------- kafelki i oferty z kafelków
  'GET /api/tiles': {
    tag: 'Kafelki', operationId: 'listTiles', summary: 'Lista kafelków',
    responses: { 200: json(list('Tile')) },
  },
  'POST /api/tiles': {
    tag: 'Kafelki', operationId: 'createTile', summary: 'Dodaj kafelek',
    description: 'Id powstaje z kategorii i nazwy (np. bol:nowy-bol), chyba że podasz własne',
    requestBody: body({ id: { type: 'string', description: 'Własne id (opcjonalnie), kategoria:slug' }, category: { type: 'string', enum: ['rola', 'segment', 'bol', 'produkt'] }, ...tileFields }, ['category', 'label']),
    responses: { 201: json(one('Tile'), 'Utworzono') },
  },
  'PATCH /api/tiles/:id': {
    tag: 'Kafelki', operationId: 'updateTile', summary: 'Zmień kafelek',
    parameters: [idParam('kafelka', '/api/tiles'), replaceParam],
    requestBody: body(tileFields),
    responses: { 200: json(one('Tile')) },
  },
  'DELETE /api/tiles/:id': {
    tag: 'Kafelki', operationId: 'deleteTile', summary: 'Usuń kafelek',
    description: 'Tagi bloków i oferty z tym kafelkiem zostają; w ofercie pokazuje się jako usunięty',
    parameters: [idParam('kafelka', '/api/tiles')],
    responses: { 204: noContent },
  },
  'GET /api/scenarios': {
    tag: 'Kafelki', operationId: 'listScenarios', summary: 'Scenariusze ról',
    responses: { 200: json(list('Scenario')) },
  },
  'GET /api/scenarios/:id': {
    tag: 'Kafelki', operationId: 'getScenario', summary: 'Pobierz scenariusz',
    parameters: [idParam('scenariusza (kafelek roli)', '/api/scenarios')],
    responses: { 200: json(one('Scenario')) },
  },
  'PUT /api/scenarios/:id': {
    tag: 'Kafelki', operationId: 'saveScenario', summary: 'Zapisz scenariusz',
    description: 'Zmiana wchodzi do istniejących ofert przy ich przeliczeniu',
    parameters: [idParam('scenariusza (kafelek roli)', '/api/scenarios')],
    requestBody: body({ name: { type: 'string' }, steps: { type: 'array', items: anyObject, description: 'Kroki scenariusza' } }, ['steps']),
    responses: { 200: json(one('Scenario')) },
  },
  'POST /api/offers/generate': {
    tag: 'Kafelki', operationId: 'generateOffer', summary: 'Wygeneruj ofertę z kafelków',
    description: 'Składa ofertę według scenariusza roli i dobiera treść do kafelków. Te same kafelki dają tę samą ofertę. Odpowiedź zawiera coverage: które bóle są rozwiązane',
    requestBody: body({
      client: { type: 'string', description: 'Nazwa klienta' },
      tiles: tilesList,
      name: { type: 'string', description: 'Nazwa oferty (domyślnie: klient · rola)' },
      price: { type: 'string', description: 'Cena (domyślnie cena z kafelka produktu)' },
    }, ['client', 'tiles']),
    responses: { 201: json(one('Offer'), 'Utworzono') },
  },
  'PUT /api/offers/:id/tiles': {
    tag: 'Kafelki', operationId: 'setOfferTiles', summary: 'Zmień kafelki oferty i przelicz',
    description: 'Slajdy poprawione ręcznie (locked) zostają bez zmian',
    parameters: [idParam('oferty', '/api/offers')],
    requestBody: body({ tiles: tilesList }, ['tiles']),
    responses: { 200: json(one('Offer')) },
  },
  'POST /api/offers/:id/recompute': {
    tag: 'Kafelki', operationId: 'recomputeOffer', summary: 'Przelicz ofertę z kafelków',
    description: 'Np. po zmianie scenariusza albo treści. Slajdy poprawione ręcznie zostają',
    parameters: [idParam('oferty', '/api/offers')],
    responses: { 200: json(one('Offer')) },
  },

  'GET /api/slides/:id': {
    tag: 'Slajdy', operationId: 'getSlide', summary: 'Pobierz slajd',
    parameters: [idParam('slajdu')],
    responses: { 200: json(one('Slide')) },
  },
  'PATCH /api/slides/:id': {
    tag: 'Slajdy', operationId: 'updateSlide', summary: 'Zmień slajd',
    description: 'Pole data jest scalane, chyba że replace=1. Zmiana oznacza slajd jako poprawiony ręcznie (locked). Samo {"locked": false} przywraca automat: przelicza ofertę i zwraca całą ofertę (slajd może dostać nowe id)',
    parameters: [idParam('slajdu'), replaceParam],
    requestBody: body(slideFields),
    responses: { 200: json(one('Slide')) },
  },
  'DELETE /api/slides/:id': {
    tag: 'Slajdy', operationId: 'deleteSlide', summary: 'Usuń slajd',
    parameters: [idParam('slajdu')],
    responses: { 204: noContent },
  },

  // ---------------------------------------------------------------- komponenty
  'GET /api/components': {
    tag: 'Komponenty', operationId: 'listComponents', summary: 'Lista kart z opisami',
    description: 'Karty z zestawów @… w bibliotece z opisami dla AI (SQLite) i miniaturą',
    parameters: [
      { name: 'set', in: 'query', description: 'Tylko karty z tego zestawu', schema: { type: 'string' } },
      { name: 'missing', in: 'query', description: '1 = także karty, których nie ma już w bibliotece', schema: { type: 'string', enum: ['', '1'] } },
    ],
    responses: { 200: json(list('Component')) },
  },
  'GET /api/components/:set/:key': {
    tag: 'Komponenty', operationId: 'getComponent', summary: 'Pobierz kartę',
    parameters: [setParam, keyParam],
    responses: { 200: json(one('Component')) },
  },
  'PATCH /api/components/:set/:key': {
    tag: 'Komponenty', operationId: 'updateComponent', summary: 'Zmień opis karty',
    description: 'Opis, kiedy wybrać / nie wybierać, temat, wariant, tagi, data. Pole data jest scalane, chyba że replace=1',
    parameters: [setParam, keyParam, replaceParam],
    requestBody: body(componentFields),
    responses: { 200: json(one('Component')) },
  },
  'GET /api/component-sets': {
    tag: 'Komponenty', operationId: 'listComponentSets', summary: 'Zestawy kart z zasadami',
    responses: { 200: json(list('ComponentSet')) },
  },
  'PATCH /api/component-sets/:id': {
    tag: 'Komponenty', operationId: 'updateComponentSet', summary: 'Zmień zasady zestawu',
    parameters: [idParam('zestawu', '/api/component-sets')],
    requestBody: body({ title: { type: 'string', description: 'Nazwa' }, rules: { type: 'string', description: 'Zasady doboru dla AI, np. „6 kart, dokładnie jedna wyróżniona”' } }),
    responses: { 200: json(one('ComponentSet')) },
  },
  'GET /api/slides/:id/pick-context': {
    tag: 'Komponenty', operationId: 'getPickContext', summary: 'Kontekst doboru kart',
    description: 'Oferta, slajd, liczba slotów, zasady i opisy kart: wszystko, czego potrzebuje agent, żeby wybrać karty',
    parameters: [idParam('slajdu')],
    responses: { 200: json(anyObject) },
  },
  'POST /api/slides/:id/pick': {
    tag: 'Komponenty', operationId: 'pickComponents', summary: 'Dobierz karty przez AI',
    description: 'Claude wybiera karty do slotów #pick z opisów w bazie, zasad zestawu, zmiennych oferty i briefu. Wymaga ANTHROPIC_API_KEY (inaczej 503)',
    parameters: [idParam('slajdu')],
    requestBody: {
      required: false,
      content: { 'application/json': { schema: { type: 'object', properties: {
        brief: { type: 'string', description: 'Kontekst od handlowca, np. „bank, boją się chmury”' },
        apply: { type: 'boolean', description: 'false = tylko podpowiedź, bez zapisu w slajdzie', default: true },
      } } } },
    },
    responses: { 200: json(anyObject, '{applied, picks, note, warnings, slide}') },
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
export const EVENT_TABLES = ['offers', 'slides', 'blocks', 'templates', 'components', 'component_sets', '*'];

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
