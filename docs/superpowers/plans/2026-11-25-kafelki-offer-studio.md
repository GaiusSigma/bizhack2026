# Kafelki i czytelny Offer Studio: plan wykonania

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sprzedawca (albo automat) wybiera kafelki: rolę, segment, produkt i bóle. Offer Studio składa z nich prezentację według scenariusza roli i pokazuje przy każdym slajdzie, dlaczego tam jest.

**Architecture:** Kafelki i scenariusze to nowe tabele SQLite. Generator (`src/generate.js`) to czyste funkcje: z kafelków, scenariusza i treści oznaczonej kafelkami (`tags`) liczy konkretne slajdy (`frame`, `data`, `block_ids`, `picks`) i zapisuje je jak dotychczasowe slajdy, więc render przez FigCraft prawie się nie zmienia. UI dostaje nowe ekrany w osobnych modułach ES (`public/views/*.js`), wspólne helpery idą do `public/lib.js`.

**Tech Stack:** Node 24 w obrazie (`node:sqlite`, `node:test`), Hono, czysty JS w przeglądarce, `figcraft-cli`.

**Spec:** `docs/superpowers/specs/2026-11-25-kafelki-offer-studio-design.md`

## Global Constraints

- Lokalnie nie ma Node. Testy uruchamiaj w obrazie `offer-studio` z repo podmontowanym jako `/work` (moduły z obrazu przez symlink; `node_modules` jest w `.gitignore`):
  `cd /Users/maciejszporak/bizhack/bizhack2026 && docker compose -f docker-compose.yml -f docker-compose.local.yml build offer-studio` (raz, i ponownie po zmianie `package.json`), potem
  `docker run --rm --user root -v "$PWD/offer-studio":/work -w /work bizhack2026-offer-studio sh -c 'ln -sfn /app/node_modules node_modules && node --disable-warning=ExperimentalWarning --test test/*.test.js'`
- Aplikację po zmianach uruchamiaj tak: `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build offer-studio`, adres http://localhost:8082 (bez hasła).
- Każda nowa trasa `api.*` w `src/server.js` potrzebuje wpisu w `DOCS` w `src/openapi.js` (unikalne `operationId`, opisane parametry ścieżki). Pilnuje tego `test/openapi.test.js`.
- Id kafelka: `kategoria:slug`, kategorie dokładnie `rola`, `segment`, `bol`, `produkt`. Regex: `^(rola|segment|bol|produkt):[a-z0-9][a-z0-9-]{0,59}$`. Id scenariusza = id kafelka roli.
- Status kafelka: `active` albo `soon`. Aktywne role: `rola:champion`, `rola:zarzad`. Aktywne segmenty: `segment:kancelaria`, `segment:in-house`, `segment:administracja`. Produkty: `produkt:saas`, `produkt:vault`, `produkt:on-prem`.
- Wagi doboru: ból 3, segment 2, rola 1, produkt 1.
- Liczba kafelków w ofercie: rola 1, segment 1, produkt 1, bóle 1–5.
- Pokrycie bólu liczą tylko widoczne bloki typu `rozwiazanie` i `use_case`.
- Cały tekst UI i komunikaty błędów po polsku, językiem sprzedawcy. Nazw ramek, `{{…}}` i zapytań nie ma w głównym widoku, tylko w sekcji „Zaawansowane”.
- `SCHEMA_VERSION` = 4. Format eksportu `version: 4` (import przyjmuje 1–4).
- Zmiany w aplikacji nie mogą skasować istniejących ofert, bloków, szablonów ani komponentów.

## Review Focus

1. **Istniejąca baza z wolumenu** (v3, oferta bazowa, bez kafelków) po starcie dostaje kafelki, scenariusze, bloki `rozwiazanie` i tagi, a stara oferta działa jak dotąd. Test w Task 2.
2. **Ból bez żadnej treści**: generowanie się udaje, ból jest na liście niepokrytych, a slajd „Jak rozwiązujemy” dostaje bloki dobrane wg pozostałych kafelków. Test w Task 4.
3. **Przeliczenie bez zmian kafelków jest idempotentne**: dwa przeliczenia z rzędu dają identyczne slajdy (id, kolejność, treść), a slajd zablokowany zostaje bit w bit. Test w Task 4.
4. **Kafelek „wkrótce”, nieznany albo zła liczba kafelków** w `POST /api/offers/generate` daje 400 z polskim komunikatem, który wskazuje kafelek. Test w Task 4 (walidacja), sprawdzenie curl w Task 5.
5. **Usunięty kafelek wciąż obecny w tagach bloków albo w `offer.data.tiles`**: render i widok oferty nie wywracają się, a UI pokazuje „usunięty kafelek”. Test w Task 4 (generator ignoruje nieznane tagi), sprawdzenie w Task 6.

---

### Task 1: Dane startowe z arkusza (kafelki, bloki rozwiązań, przypięcia)

**Files:**
- Create: `offer-studio/seed/tiles.js`
- Modify: `offer-studio/seed/seed.js` (eksport `default` dostaje `tiles`, nowe bloki i tagi)
- Test: `offer-studio/test/seed-tiles.test.js`

**Interfaces:**
- Produces: `seed/tiles.js` eksportuje
  - `tiles: Array<{ id, category, label, description, quotes: string[], status: 'active'|'soon', position: number, data: object }>`
  - `solutionBlocks: Array<block>` — 27 bloków `type: 'rozwiazanie'`, id `rz-<slug>`, `title` = krótka nazwa (do ~60 znaków), `body` = kolumna „Rozwiązanie”, `data = { problem, effect /* = Korzyść */, wartosc }`, `tags` = kafelki `bol:*` i `segment:*`
  - `tileTags: Record<blockOrComponentId, string[]>` — kafelki do dopisania do istniejących bloków z `seed.js` i 19 kart `dlaczego/*`
- `seed.js` `default` ma pole `tiles` i zawiera `solutionBlocks`, a bloki i komponenty mają już dopisane `tileTags`.

- [ ] **Step 1: Wyciągnij dane z arkusza.** Uruchom `python3 -I <scratchpad>/dump_xlsx.py "/Users/maciejszporak/Downloads/Gaius Work Templates.xlsx"` (skrypt jest w scratchpadzie sesji; jeśli go nie ma, czytaj xlsx przez `zipfile` + `xml.etree`). Zakładka „Bóle (Fireflies)”: wiersze 2–12 (Typ = BÓL) dają 11 kafelków `bol:*`: `label` = krótka nazwa przed dwukropkiem kolumny „Temat”, `description` = reszta tematu, `quotes` = cytaty z kolumny D bez nawiasów z opisem rozmówcy. Zakładka „PRKW”: 27 wierszy dają `solutionBlocks`.
- [ ] **Step 2: Napisz test `test/seed-tiles.test.js`**

```js
test('kafelki: id i kategorie poprawne, statusy wg ustaleń', () => {
  // każdy tile.id pasuje do ^(rola|segment|bol|produkt):[a-z0-9][a-z0-9-]{0,59}$ i zaczyna się od `${category}:`
  // aktywne role dokładnie: rola:champion, rola:zarzad; pozostałe role: soon (cto, gc, budzet, dpo)
  // aktywne segmenty dokładnie: segment:kancelaria, segment:in-house, segment:administracja
  // 11 kafelków bol:*, wszystkie active, każdy ma >= 1 cytat
  // produkty: produkt:saas, produkt:vault, produkt:on-prem
});
test('rozwiązania: 27 bloków PRKW, każdy przypięty do >= 1 bólu', () => { /* type rozwiazanie, body i data.effect niepuste */ });
test('pokrycie: każdy ból ma >= 1 blok rozwiazanie albo use_case', () => {});
test('przypięcia: każde id w tileTags istnieje w seedzie, każdy tag to istniejący kafelek', () => {});
```

- [ ] **Step 3: Uruchom test i sprawdź, że pada** (brak `seed/tiles.js`).
- [ ] **Step 4: Utwórz `seed/tiles.js`.** Role: `champion` „Champion”, `zarzad` „Zarząd”, soon: `cto` „CTO / CIO / CISO”, `gc` „Dyrektor prawny / GC”, `budzet` „Właściciel budżetu”, `dpo` „DPO / compliance”. Segmenty active: `kancelaria` „Kancelaria”, `in-house` „Dział prawny in-house”, `administracja` „Administracja publiczna”; soon: `finanse` „Banki i finanse”, `doradcy` „Doradcy podatkowi”, `notariusze` „Notariusze”, `masowe` „Kancelarie masowe i windykacja”. Produkty: `saas` „SaaS”, `vault` „Vault”, `on-prem` „On-premise”, `data.price` puste. Przypięcia PRKW → bóle i segmenty oraz `tileTags` dla istniejących bloków i kart przypisz sam na podstawie treści i kolumny „Segmenty” z zakładki Bóle. To decyzja wykonawcy, później do przejrzenia w UI.
- [ ] **Step 5: Wepnij w `seed.js`.** Dopisz `tileTags` do `tags` bloków i komponentów, dodaj `solutionBlocks` do `blocks`, a `tiles` do eksportu `default`.
- [ ] **Step 6: Uruchom wszystkie testy.** Oczekiwane: PASS (nowe i stare; `test/store.test.js` liczy `seed.blocks.length`, więc nie zmieniaj tam stałych).
- [ ] **Step 7: Commit** `feat(offer-studio): seed tiles and PRKW solution blocks from the sales sheet`

### Task 2: Schemat v4, magazyn kafelków i scenariuszy, migracja

**Files:**
- Modify: `offer-studio/src/db.js`, `offer-studio/src/server.js` (blok startowy z seedem, ok. linie 28–65)
- Test: `offer-studio/test/store.test.js` (dopisz testy)

**Interfaces:**
- Consumes: `seed.default.tiles`, `seed.default.scenarios` (z Task 3, do tego czasu `[]`).
- Produces:
  - Tabele `tiles(id, category, label, description, quotes JSON, status, position, data JSON, created_at, updated_at)` i `scenarios(id, name, steps JSON, created_at, updated_at)`. W `TABLES`: `tiles.fields = ['category','label','description','quotes','status','position','data']`, `json: { quotes: [], data: {} }`, `order: 'category, position, label'`; `scenarios.fields = ['name','steps']`, `json: { steps: [] }`, `order: 'id'`.
  - `slides` dostaje kolumny `origin TEXT` (JSON, domyślnie `null`) i `locked INTEGER NOT NULL DEFAULT 0` (w `TABLES.slides`: `fields` + `json.origin = null`, `bool` + `locked`).
  - `idOk`: tiles → regex kafelka z Global Constraints; scenarios → regex kafelka z kategorią `rola`.
  - `exportAll()` → `version: 4`, z polami `tiles` i `scenarios`; `importAll` przyjmuje wersje 1–4 i wczytuje `tiles`, `scenarios`.
  - `store.ensureTiles(seed)`: jeśli tabela `tiles` jest pusta, w jednej transakcji wstawia `seed.tiles`, `seed.scenarios`, brakujące bloki `rozwiazanie` i dopisuje `tileTags` do tagów istniejących bloków i komponentów (bez duplikatów i bez usuwania obecnych tagów). Zwraca `{ tiles, scenarios, blocks, tagged }` (liczniki).
- [ ] **Step 1: Napisz testy**

```js
test('v4: baza v3 z wolumenu dostaje kafelki, a oferta bazowa zostaje', () => {
  // zbuduj bazę v3: DatabaseSync na pliku w mkdtemp, schemat v3 przez openDb z SCHEMA_VERSION 3 niedostępne,
  // więc: openDb(path) -> importAll(seed bez tiles) -> PRAGMA user_version = 3 -> DROP TABLE tiles, scenarios -> ALTER TABLE slides DROP COLUMN origin/locked
  // ponowne openDb(path): user_version 4, kolumny origin i locked są, getOffer('gaius-vault-bazowa').slides.length === 11
  // ensureTiles(seed) zwraca tiles > 0; drugie wywołanie zwraca same zera
  // blok 'uc-pilne-pismo' ma stare tagi + kafelki z tileTags, bez duplikatów
});
test('kafelki: złe id odrzucone (400)', () => { /* insert tiles z id 'kolor:zielony' i 'bol:Zła' -> HttpError 400 */ });
test('eksport v4 -> import replace odtwarza kafelki i scenariusze', () => {});
```

- [ ] **Step 2: Uruchom i sprawdź, że padają.**
- [ ] **Step 3: Zaimplementuj w `db.js`.** W `migrate()` dla `version < 4` dodaj brakujące kolumny `origin` i `locked` przez `ALTER TABLE`. Tabele tworzy `SCHEMA`.
- [ ] **Step 4: W `server.js`** po imporcie pustej bazy i po migracjach wywołaj `store.ensureTiles(seedModule.default)`, jeśli `STUDIO_SEED !== 'false'`. Zaloguj liczniki, gdy coś dodano.
- [ ] **Step 5: Uruchom wszystkie testy.** Oczekiwane: PASS.
- [ ] **Step 6: Commit** `feat(offer-studio): schema v4 with tiles, scenarios and slide origin/lock`

### Task 3: Scenariusze Champion i Zarząd

**Files:**
- Create: `offer-studio/seed/scenarios.js`
- Modify: `offer-studio/seed/seed.js` (`default.scenarios`)
- Test: `offer-studio/test/seed-tiles.test.js` (dopisz)

**Interfaces:**
- Produces: `scenarios: Array<{ id: 'rola:champion'|'rola:zarzad', name, steps: Step[] }>`, gdzie
  `Step = { key, label, frame, data, data_by_product?: Record<tileId, object>, fill: Fill, when?: { any: tileId[] } }`,
  `Fill = { kind: 'none' } | { kind: 'pains' } | { kind: 'blocks', type, min, max } | { kind: 'picks', set }`.
  `pains` = slajd pokazuje wybrane kafelki bólów (rozwiązanie decyzji „slajd Problemy klienta”).
- Kroki (frame w nawiasie):
  - Zarząd: `okladka` (okladka), `bole` „Problemy klienta” (problemy, pains), `dlaczego` „Dlaczego Gaius” (dlaczego, picks `dlaczego`), `rozwiazania` „Jak rozwiązujemy” (use-case, blocks `rozwiazanie` 2–3), `architektura` (architektura, `when.any` [vault, on-prem]), `wdrozenie` (wdrozenie, blocks `step` 5–5), `cennik` (cennik, blocks `package` 3–3), `kontakt` (kontakt, blocks `person` 1–1).
  - Champion: `okladka`, `bole`, `czym-jest` (czym-jest, blocks `pillar` 3–3), `rozwiazania` (use-case, `rozwiazanie` 3–3), `przypadki` „Przypadki użycia” (use-case, blocks `use_case` 3–6), `sygnaly` (sygnaly, blocks `signal` 4–4), `architektura` (jw.), `porownanie` (porownanie, blocks `comparison` 5–7), `wdrozenie`, `kontakt`.
  - `data` każdego kroku = treść odpowiadającego slajdu oferty bazowej z `seed.js` (Vault). `data_by_product` dla `produkt:saas` i `produkt:on-prem` tylko tam, gdzie tekst Vault byłby nieprawdziwy (nazwa produktu, cennik, gdzie działa). Szkice oznacz w kroku polem `draft: ['produkt:saas', …]`.
- [ ] **Step 1: Dopisz testy**

```js
test('scenariusze: każda ramka istnieje w szablonie, a klucze data i data_by_product są polami ramki', () => {
  // parseTemplate(TEMPLATE_FILE) jak w store.test.js
});
test('scenariusze: fill i when poprawne', () => {
  // kind z listy; blocks: min <= max, type istnieje w seed.blocks; picks: zestaw istnieje w seed.componentSets
  // when.any: same istniejące kafelki produkt:*
  // klucze kroków unikalne w scenariuszu; oba id to aktywne role
});
```

- [ ] **Step 2: Uruchom i sprawdź, że padają.**
- [ ] **Step 3: Utwórz `seed/scenarios.js` i wepnij w `seed.js`.**
- [ ] **Step 4: Uruchom wszystkie testy.** Oczekiwane: PASS.
- [ ] **Step 5: Commit** `feat(offer-studio): champion and board scenarios with product-specific copy`

### Task 4: Generator (czyste funkcje)

**Files:**
- Create: `offer-studio/src/generate.js`
- Test: `offer-studio/test/generate.test.js`

**Interfaces:**
- Consumes: kształty kafelków, scenariuszy, bloków i komponentów z Task 1–3.
- Produces (wszystko bez dostępu do bazy, dane wchodzą parametrami):
  - `WEIGHTS = { bol: 3, segment: 2, rola: 1, produkt: 1 }`
  - `parseSelection(tileIds: string[], allTiles: Tile[]) -> { role, segment, product, pains: string[] }`. Rzuca `HttpError(400)` po polsku: nieznany kafelek („Nie ma kafelka „x””), kafelek „wkrótce” („Kafelek „CTO / CIO / CISO” jest oznaczony jako wkrótce”), zła liczba („Wybierz dokładnie jedną rolę” itd., bóle „od 1 do 5”).
  - `score(tags: string[], sel) -> { score: number, matched: string[] }`. Nieznane i nie-kafelkowe tagi ignoruje.
  - `segmentOk(tags, sel) -> boolean` (kandydat z kafelkami `segment:*` musi mieć wybrany segment).
  - `pickBlocks(candidates: Block[], fill, sel) -> Array<{ id, matched }>`: filtr segmentu, sortowanie po wyniku malejąco i stabilnie po kolejności wejściowej, od `min` do `max`, bloki z wynikiem 0 tylko do `min`.
  - `pickCards(components: Component[], slots: number, sel) -> Array<{ component, matched }>`: algorytm z sekcji „Karty dlaczego” w specu (6 tematów, temat z najwyższym wynikiem w wariancie `wyroznienie`, reszta `zwykla`, `liczba` tylko bez wariantu zwykłego, dobicie w kolejności wejściowej).
  - `stepApplies(step, sel) -> boolean` (`when.any`).
  - `stepData(step, sel) -> object` (`data` nałożone przez `data_by_product[sel.product]`).
  - `buildSlides(scenario, sel, { blocks, components, tiles }) -> NewSlide[]`, gdzie `NewSlide = { frame, data, block_ids, picks, hidden: false, locked: false, origin: { step, matched: Record<id, string[]> } }`. Krok `pains` daje `block_ids` = id kafelków bólów (render rozwiązuje je w Task 5).
  - `coverage(slides, pains, blocksById) -> { covered: string[], missing: string[] }`. Liczą tylko bloki `rozwiazanie`/`use_case` na slajdach z `hidden: false`.
  - `mergeRecompute(existing: Slide[], fresh: NewSlide[]) -> { keep: Slide[], create: NewSlide[], remove: string[], hide: string[], order: Array<slideId|{create:index}> }` według reguł „Przeliczanie, przypadki brzegowe” ze specu (zablokowany slajd nieobowiązującego kroku → `hide`; ręcznie dodany slajd bez `origin.step` zostaje za poprzednikiem; reszta wg kolejności scenariusza).
- [ ] **Step 1: Napisz testy (dane w teście, małe atrapy)**

```js
test('parseSelection: kafelek wkrótce, nieznany i zła liczba -> 400 z nazwą kafelka', () => {});
test('score: ból 3, segment 2, rola 1, produkt 1; obce tagi (vault, kancelaria) ignorowane', () => {
  // tags ['bol:poufnosc','segment:kancelaria','vault'] przy sel {pains:['bol:poufnosc'], segment:'segment:kancelaria'} -> score 5
});
test('pickBlocks: filtr segmentu, min/max, zera tylko do min, remis wg kolejności wejściowej', () => {});
test('pickCards: 6 różnych tematów, dokładnie jedna wyroznienie (temat z najwyższym wynikiem), max jedna liczba', () => {});
test('buildSlides: architektura tylko przy vault/on-prem; krok pains ma id bólów; data_by_product nadpisuje tytuł', () => {});
test('buildSlides: te same kafelki dwa razy -> identyczny wynik', () => {});
test('buildSlides: ból bez treści -> slajd rozwiązań i tak ma min bloków, coverage.missing zawiera ten ból', () => {});
test('coverage: blok problem i karty nie liczą się, ukryty rozwiazanie nie liczy się', () => {});
test('mergeRecompute: zablokowany zostaje bit w bit, zablokowany nieobowiązujący -> hide, ręczny bez origin za poprzednikiem', () => {});
test('mergeRecompute: dwa przeliczenia z rzędu bez zmian -> brak create/remove w drugim', () => {});
```

- [ ] **Step 2: Uruchom i sprawdź, że padają.**
- [ ] **Step 3: Zaimplementuj `src/generate.js`.**
- [ ] **Step 4: Uruchom wszystkie testy.** Oczekiwane: PASS.
- [ ] **Step 5: Commit** `feat(offer-studio): deterministic offer generator from tiles`

### Task 5: API kafelków, scenariuszy i generowania

**Files:**
- Modify: `offer-studio/src/server.js`, `offer-studio/src/db.js` (pomocnik `applyRecompute`), `offer-studio/src/openapi.js`
- Test: `offer-studio/test/openapi.test.js` (pilnuje opisów), `offer-studio/test/store.test.js` (dopisz)

**Interfaces:**
- Consumes: `generate.js` (Task 4), tabele (Task 2).
- Produces (trasy, wszystkie opisane w `DOCS`):
  - `GET /api/tiles`, `POST /api/tiles`, `PATCH /api/tiles/:id`, `DELETE /api/tiles/:id` (usunięcie nie rusza tagów bloków ani ofert).
  - `GET /api/scenarios`, `GET /api/scenarios/:id`, `PUT /api/scenarios/:id` (`{ name?, steps }`, walidacja kształtu kroku jak w teście Task 3, błędy 400 po polsku).
  - `POST /api/offers/generate` `{ client, tiles, name?, price? }` → `201` z ofertą jak `GET /api/offers/:id`. Nazwa domyślna: `${client} · ${label roli}`. `offer.data = { client, price, tiles, scenario_id }`; `price` z body, inaczej z `tiles.data.price` produktu, inaczej `''`.
  - `PUT /api/offers/:id/tiles` `{ tiles }` → zapis i przeliczenie; `POST /api/offers/:id/recompute` → przeliczenie. Oferta bez `scenario_id` → 400 „Ta oferta nie powstała z kafelków”.
  - `GET /api/offers/:id` dodaje `coverage` (z `generate.coverage`) i `tiles` (pełne obiekty wybranych kafelków; brakujące jako `{ id, missing: true }`).
  - `PATCH /api/slides/:id`, `POST /api/offers/:id/slides`, `POST /api/slides/:id/pick` ustawiają `locked: true` (wyjątek: zapisy z `applyRecompute`). `PATCH` z `{ locked: false }` odblokowuje, a zaraz potem przelicza ofertę.
  - `resolveBlocks(slide, ctx)` z `ctx = { role, product }`: id z dwukropkiem rozwiązuje jako kafelek (`title` = `label`, `body` = `description`). Dla bloków nakłada `data.by_role[role]`, potem `data.by_product[product]` na `title`/`body`/pola.
  - `store.applyRecompute(offerId, plan)` wykonuje wynik `mergeRecompute` w jednej transakcji (bez ustawiania `locked`).
- [ ] **Step 1: Dopisz test w `store.test.js`**

```js
test('applyRecompute: tworzy, ukrywa i układa slajdy w jednej transakcji, nie rusza locked', () => {});
```

- [ ] **Step 2: Uruchom i sprawdź, że pada.** `test/openapi.test.js` zacznie padać po dodaniu tras bez opisów; dopisz opisy w tym samym kroku co trasy.
- [ ] **Step 3: Zaimplementuj trasy, `resolveBlocks(ctx)`, `applyRecompute` i opisy `DOCS`.**
- [ ] **Step 4: Uruchom wszystkie testy.** Oczekiwane: PASS.
- [ ] **Step 5: Sprawdź na żywo.** Przebuduj kontener i:
  `curl -s -XPOST localhost:8082/api/offers/generate -H 'content-type: application/json' -d '{"client":"Kancelaria Test","tiles":["rola:zarzad","segment:kancelaria","produkt:vault","bol:poufnosc","bol:shadow-ai"]}'` → 201, slajdy z `origin`, `coverage`.
  Z `"rola:cto"` → 400 z nazwą kafelka. `curl -s localhost:8082/api/offers/<id>/pdf -o /tmp/x.pdf` → PDF.
- [ ] **Step 6: Commit** `feat(offer-studio): tiles, scenarios and generate API`

### Task 6: Nowa oferta z kafelków i czytelny widok oferty

**Files:**
- Create: `offer-studio/public/lib.js` (przeniesione z `app.js`: `h`, `api`, `toast`, `debounce`, `saver`, `autosize`, `modal`, `download`, `$`), `offer-studio/public/views/new-offer.js`, `offer-studio/public/views/offer.js`
- Modify: `offer-studio/public/app.js` (importy z `lib.js`, routing), `offer-studio/public/index.html` (nawigacja), `offer-studio/public/style.css`

**Interfaces:**
- Consumes: trasy z Task 5.
- Produces:
  - Nawigacja: Oferty · Kafelki · Wiedza · Scenariusze · Biblioteka (Biblioteka = dotychczasowe Slajdy + Komponenty jako dwie podzakładki).
  - Trasy hash: `#/offers/new` → `viewNewOffer()`; `#/offers/:id` → oferta z `scenario_id` używa `viewOffer(offerId, slideId)` z `views/offer.js`, starsza zostaje przy dotychczasowym edytorze (z banerem „Ta oferta nie powstała z kafelków”).
  - `viewNewOffer`: pole Klient; cztery sekcje kafelków (rola, segment i produkt jako pojedynczy wybór, bóle jako wielokrotny 1–5; „wkrótce” wyszarzone, nieklikalne, z etykietą; przy bólu opis i pierwszy cytat w podpowiedzi); pasek podsumowania liczony na żywo, bez zapisu (nazwa scenariusza, liczba slajdów z `when`, bóle z treścią i bez) i „Utwórz ofertę” → `POST /api/offers/generate` → przejście do oferty. Do podsumowania wystarczy `GET /api/scenarios` i `GET /api/blocks` (licz po stronie przeglądarki tym samym regułom co `coverage`).
  - `viewOffer`, trzy kolumny jak szkic w specu: (1) Klient: nazwa, chipy kafelków, „Rozwiązane X z Y bólów” z ✓/✗ i podpowiedzią przy brakujących, „Zmień kafelki” (modal jak ekran nowej oferty → `PUT /tiles`), cena; (2) Prezentacja: karta na slajd z nazwą kroku (`step.label`), chipy „dlaczego” (kafelki z `origin.matched`), lista bloków z kafelkami, znaczniki „poprawione ręcznie” + „Przywróć automat” i „ukryty”; po kliknięciu edycja: podmiana bloku (kandydaci tego typu posortowani po wyniku z chipami), tekst slajdu (pola `data` z etykietami, bez `{{…}}`), ukryj/pokaż; sekcja „Zaawansowane” zwinięta: ramka, zmienne, zapytania, dotychczasowy edytor kart; „Przelicz” z informacją, ile slajdów zostało nietkniętych; (3) Podgląd FigCraft i przyciski PDF/.figcraft jak dziś (przenieś kod podglądu z `viewOffers`).
- [ ] **Step 1: Przenieś helpery do `lib.js`.** Uruchom aplikację i sprawdź w przeglądarce, że stare widoki działają (Wiedza, Oferty, Slajdy, Komponenty, brak błędów w konsoli).
- [ ] **Step 2: Zbuduj `viewNewOffer`.** Sprawdź w przeglądarce: kafelek „wkrótce” się nie zaznacza, szósty ból się nie zaznacza (komunikat), podsumowanie zmienia się przy przełączaniu produktu (architektura), „Utwórz” prowadzi do oferty.
- [ ] **Step 3: Zbuduj `viewOffer`.** Sprawdź w przeglądarce na ofercie z kroku 2: chipy „dlaczego” zgadzają się z `origin`, podmiana bloku ustawia „poprawione ręcznie”, „Przelicz” zostawia ten slajd, „Przywróć automat” wraca do doboru, „Zmień kafelki” z Vault na SaaS zmienia tytuły i usuwa architekturę, podgląd się odświeża, PDF się pobiera. Ból usunięty z bazy pokazuje się jako „usunięty kafelek” bez błędu.
- [ ] **Step 4: Sprawdź szerokość 1280 px i 1024 px** (kolumny się nie nakładają).
- [ ] **Step 5: Commit** `feat(offer-studio): tile-based new offer flow and readable offer view`

### Task 7: Kafelki, Wiedza z kafelkami, Scenariusze

**Files:**
- Create: `offer-studio/public/views/tiles.js`, `offer-studio/public/views/scenarios.js`
- Modify: `offer-studio/public/app.js` (widok Wiedzy: chipy kafelków i filtr), `offer-studio/public/style.css`

**Interfaces:**
- Consumes: trasy z Task 5, `GET/PATCH /api/blocks`, `GET/PATCH /api/components/:set/:key`.
- Produces:
  - `#/tiles/:id?`: kategorie, lista kafelków (status, liczba przypiętych treści), edycja: nazwa, opis, cytaty (lista), status, cena domyślna dla produktu; lista przypiętych bloków i kart z odpinaniem; „Przypnij treść” (wyszukiwarka bloków i kart) dopisuje id kafelka do `tags`.
  - Wiedza: przy bloku kafelki jako chipy (klik dodaje/usuwa w `tags`), filtr po kafelku, typ `rozwiazanie` wyświetla `problem`, `body`, `effect`, `wartosc` z etykietami „Problem / Rozwiązanie / Korzyść / Wartość”. Zwykłe tagi (nie-kafelki) zostają w „Zaawansowane”.
  - `#/scenarios/:id?`: lista kroków (nazwa, miniatura ramki, reguła wypełnienia słownie, np. „2–3 rozwiązania najlepiej pasujące do bólów”, warunek słownie), przesuwanie, edycja pól kroku, dodanie kroku z biblioteki slajdów; zapis `PUT /api/scenarios/:id`, błędy walidacji pokazane przy kroku.
- [ ] **Step 1: Zbuduj widok Kafelki.** Sprawdź: przypięcie bloku do bólu zmienia pokrycie w nowej ofercie.
- [ ] **Step 2: Dodaj kafelki w Wiedzy.** Sprawdź: filtr po `bol:poufnosc` pokazuje przypięte bloki, klik na chip zapisuje.
- [ ] **Step 3: Zbuduj widok Scenariusze.** Sprawdź: zmiana kolejności kroku i „Przelicz” w ofercie dają nową kolejność.
- [ ] **Step 4: Commit** `feat(offer-studio): tiles manager, tile chips in knowledge and scenario editor`

### Task 8: Dokumentacja i końcowe sprawdzenie

**Files:**
- Modify: `offer-studio/README.md` (sekcja „Kafelki i scenariusze” na górze: jak sprzedawca robi ofertę, jak automat woła `POST /api/offers/generate`, jak przypinać treść, jak działa „poprawione ręcznie”), `n8n/README.md` (przykład operacji generowania, jeśli lista operacji jest tam opisana)

- [ ] **Step 1: Uzupełnij README.**
- [ ] **Step 2: Uruchom wszystkie testy.** Oczekiwane: PASS.
- [ ] **Step 3: Przebuduj i uruchom kontener na istniejącym wolumenie.** Sprawdź logi (liczniki `ensureTiles`), stara oferta bazowa działa, nowa oferta z kafelków Champion + In-house + SaaS + 3 bóle daje PDF.
- [ ] **Step 4: Commit** `docs(offer-studio): document tiles, scenarios and generation`
