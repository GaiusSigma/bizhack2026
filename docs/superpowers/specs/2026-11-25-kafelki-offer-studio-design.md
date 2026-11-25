# Kafelki i czytelny Offer Studio: projekt

Data: 2026-11-25. Dotyczy: `offer-studio/`.

## Po co

Sprzedawca Gaius po rozmowie diagnostycznej ma dostać prezentację dopasowaną do klienta: stały core plus treść,
która trafia w jego problemy (klient ma 3 bóle, a prezentacja pokazuje, jak Gaius rozwiązuje 2–3 z nich).
Docelowo ten sam proces uruchamia automat (n8n / agent AI) na podstawie zebranych informacji, ale człowiek
musi móc zajrzeć do oferty i od razu zrozumieć, co w niej jest i dlaczego.

Dziś Offer Studio jest edytorem dla kogoś, kto zna szablon: lista ramek FigCraft (`dlaczego`, `sygnaly`),
zmienne `{{offer.client}}`, zapytania „typ + tag”. „Nikt się z tego nie doczyta.” Ten projekt zmienia punkt
wyjścia z „składam slajdy” na „opisuję klienta kafelkami, a prezentacja składa się sama i tłumaczy się sama”.

## Decyzje użytkownika (z rozmowy)

- **Kafelki muszą istnieć**, w kategoriach. Wybiera je człowiek w aplikacji albo automat przez API.
- Kategorie: **rola rozmówcy**, **segment**, **bóle** (tak nazywamy problemy klientów, np. „Poufność”),
  **produkt / skala**. Bólów docelowo ok. 50.
- **Rola zmienia całą prezentację**: inny tok, inny ton, „trochę inny wygląd”. CTO interesuje architektura,
  zarząd coś innego. Wybrano podejście „scenariusz na rolę” (niżej).
- **Na start tylko dwie narracje: Champion i Zarząd.** Pozostałe role (CTO/CIO, dyrektor prawny, budżet, DPO)
  są widoczne jako „wkrótce”.
- **Na start tylko trzy segmenty: kancelarie, działy prawne in-house, administracja publiczna.** Pozostałe
  (banki i finanse, doradcy podatkowi, notariusze, kancelarie masowe) jako „wkrótce”.
- Wynik ma być **raczej na gotowo**, a nie do ręcznego składania.
- Nie chodzi o samo uproszczenie: cały Offer Studio ma być **dużo bardziej przejrzysty**.
- Źródło danych startowych: arkusz „Gaius Work Templates.xlsx” (zakładki Bóle, PRKW, ICP, Segmenty).

## Cele

1. Kafelki jako byt w aplikacji: lista w kategoriach, status aktywny / wkrótce, opis, cytaty klientów.
2. Treść oznaczona kafelkami: bloki wiedzy i karty komponentów mają przypisane kafelki, do których pasują.
3. Scenariusz na rolę (Champion, Zarząd): kolejność slajdów i reguły, czym wypełnić każde miejsce.
4. Generowanie oferty z kafelków: w UI i jednym wywołaniem API. Ten sam wynik dla tych samych kafelków.
5. Przejrzystość: przy każdym slajdzie i bloku widać, dlaczego tam jest; widać pokrycie bólów
   („rozwiązane 2 z 3 bólów”); szczegóły techniczne schowane.
6. Ręczne poprawki człowieka nie giną przy ponownym przeliczeniu.

## Poza zakresem

- Przepisywanie tonu tekstów przez AI (późniejszy dodatek, „droga C”).
- Nowe projekty slajdów w FigCraft dla każdej roli. System to obsługuje (scenariusz wskazuje ramkę), ale
  projektowanie robią graficy; na start oba scenariusze używają ramek z obecnego szablonu Gaius.
- Scenariusze dla ról „wkrótce” i segmentów „wkrótce”.
- Zmiany logowania, landingu, węzłów n8n poza tym, co daje nowy opis w OpenAPI.

## Czego nie wolno (anty-cele)

- Sprzedawca nie może potrzebować wiedzy o budowie szablonu (nazwy ramek, `{{…}}`, zapytania), żeby
  zrobić i zrozumieć ofertę.
- Te same kafelki nie mogą dawać za każdym razem innej prezentacji.
- Przeliczenie po zmianie kafelków nie może po cichu skasować tego, co człowiek poprawił.
- Oferta nie może twierdzić, że rozwiązuje ból, którego żaden blok w niej nie adresuje.

## Ograniczenia

- Stos bez zmian: Node 22 (`node:sqlite`), Hono, czysty JS w przeglądarce (`public/app.js`, bez frameworka),
  render i PDF przez `figcraft-cli`.
- Lokalnie nie ma Node; uruchamianie i testy przez Docker (obraz `offer-studio` ma `figcraft-cli`).
- Każda nowa trasa API wymaga opisu w `DOCS` w `src/openapi.js` (pilnuje tego `npm test`), bo z tego
  n8n buduje formularze.
- Migracja bazy jak dotąd: `SCHEMA_VERSION` w `src/db.js`, istniejące oferty, bloki i komponenty zostają.

## Rozważone podejścia

1. **Scenariusz na rolę** (wybrane). Każda rola ma swój scenariusz: listę slajdów w kolejności, z własną
   ramką FigCraft i regułą wypełnienia (np. „2–3 bloki typu `rozwiazanie` najlepiej pasujące do wybranych
   bólów i segmentu”). Dobór deterministyczny po kafelkach. Plusy: role naprawdę się różnią, wynik
   przewidywalny i wytłumaczalny, opiera się na istniejących blokach, tagach i komponentach. Minus: trzeba
   otagować treść i zaprojektować scenariusze.
2. **Jeden core, rola zmienia tylko dobór i motyw.** Mniej pracy, ale CEO i CTO dostają tę samą prezentację
   z inną treścią, wbrew temu, co użytkownik mówi o tonie i zainteresowaniach. Odrzucone.
3. **AI składa całą ofertę z kafelków.** Zero tagowania, ale wynik niepowtarzalny, wolny, trudny do
   wytłumaczenia i wymaga klucza. Odrzucone jako podstawa; AI zostaje jako dodatek później.

## Projekt

### 1. Kafelki

Nowa tabela `tiles`:

| kolumna | znaczenie |
|---|---|
| `id` | `kategoria:slug`, np. `rola:zarzad`, `segment:kancelaria`, `bol:poufnosc`, `produkt:vault` |
| `category` | `rola`, `segment`, `bol`, `produkt` |
| `label` | nazwa dla ludzi, np. „Poufność” |
| `description` | jedno-dwa zdania, co to znaczy |
| `quotes` | JSON: cytaty klientów (z zakładki Bóle) |
| `status` | `active` albo `soon` |
| `position` | kolejność w kategorii |

Dane startowe:

- **rola**: Champion, Zarząd (aktywne); CTO/CIO/CISO, Dyrektor prawny / GC, Właściciel budżetu, DPO / compliance (wkrótce).
- **segment**: Kancelaria, Dział prawny in-house, Administracja publiczna (aktywne); Banki i finanse,
  Doradcy podatkowi, Notariusze, Kancelarie masowe i windykacja (wkrótce).
- **bol**: 11 wierszy typu BÓL z zakładki „Bóle (Fireflies)” (Poufność, Shadow AI, Powtarzalne dokumenty,
  Presja zarządu, ChatGPT tylko daje informację, Zmyślone orzeczenia, Archiwum nie do przeszukania,
  Kopiowanie do Worda, Skala w grupach kapitałowych, Szablony w skali, Słabe wyszukiwanie w LEX/Legalis),
  z cytatami. Wszystkie aktywne.
- **produkt**: SaaS, Vault, On-premise (aktywne).

Kafelki można dodawać i edytować w aplikacji (zakładka Kafelki) i przez API. Kafelek „wkrótce” jest widoczny,
ale nie da się go wybrać w nowej ofercie.

### 2. Treść oznaczona kafelkami

- Bloki i komponenty mają już kolumnę `tags`. Kafelki trafiają tam jako ich id (`bol:poufnosc`,
  `segment:kancelaria`, …), obok dotychczasowych tagów. Bez zmiany schematu tych tabel.
- Nowy typ bloku `rozwiazanie` z 27 wierszy zakładki **PRKW**: `title` = krótka nazwa, `data` =
  `{ problem, rozwiazanie, korzysc, wartosc }`.
- **Wstępne przypisanie PRKW → bóle i segmenty robi Claude** na podstawie treści wierszy i kolumny
  „Segmenty” w zakładce Bóle. To decyzja Claude'a, nie użytkownika: w aplikacji ma być łatwe do przejrzenia
  i poprawienia (zakładka Kafelki pokazuje, które bloki są przypięte do kafelka).
- Istniejące bloki (`problem`, `use_case`, `differentiator`, `comparison`, …) i 19 kart `@dlaczego`
  dostają wstępne kafelki tą samą metodą.
- Wersje tonu: blok może mieć w `data.by_role` nadpisania tekstu dla roli, np.
  `data.by_role["rola:zarzad"] = { title, body }`. Bez nadpisania idzie tekst domyślny. Na start puste;
  mechanizm jest, treść piszą ludzie później.

### 3. Scenariusze

Nowa tabela `scenarios`: `id` (= id kafelka roli, np. `rola:zarzad`), `name`, `steps` (JSON).

Krok scenariusza:

```json
{
  "key": "bole",                       // stały identyfikator kroku w scenariuszu
  "label": "Problemy klienta",         // nazwa dla ludzi, widoczna w UI zamiast nazwy ramki
  "frame": "problemy",                 // ramka z biblioteki slajdów
  "data": { "title": "…", "lead": "…" },  // domyślna treść slajdu
  "fill": { "kind": "blocks", "type": "problem", "min": 2, "max": 3 },
  "when": { "any": ["produkt:vault", "produkt:on-prem"] }   // opcjonalnie: krok tylko przy tych kafelkach
}
```

`fill.kind`: `none` (sama treść), `blocks` (bloki danego typu dobrane po kafelkach), `picks` (karty zestawu
komponentów dobrane po kafelkach).

Scenariusze startowe (z ramek obecnej oferty bazowej):

- **Zarząd** (krótko, decyzja i pieniądze): okładka → problemy klienta (bóle) → dlaczego Gaius (karty) →
  jak rozwiązujemy (`rozwiazanie`, 2–3) → wdrożenie → cennik → kontakt.
- **Champion** (codzienna praca, argumenty do przekonania zespołu): okładka → problemy klienta →
  czym jest Gaius → jak rozwiązujemy (`rozwiazanie`, 3) → przypadki użycia (`use_case`) → sygnały →
  porównanie → wdrożenie → kontakt.
- Architektura: krok `when` produkt Vault lub On-premise, w obu scenariuszach.

Ramki slajdu `rozwiazanie` nie ma w obecnym szablonie: na start krok używa ramki `use-case` (karty
z `{{title}}`, `{{body}}`), a pola bloku `rozwiazanie` mapują się na `title` / `body`. Docelowo grafik
projektuje osobny slajd.

Scenariusze można edytować w aplikacji (prosty edytor kroków) i przez API.

### 4. Dobór

Dla każdego kroku `blocks` / `picks`:

1. Kandydaci: bloki danego typu (albo karty zestawu).
2. **Filtr segmentu**: kandydat z kafelkami segmentu pasuje tylko, jeśli ma któryś z wybranych segmentów.
   Kandydat bez kafelków segmentu pasuje zawsze.
3. **Wynik**: suma wag trafionych kafelków: ból 3, segment 2, rola 1, produkt 1.
4. Kolejność: wynik malejąco, przy remisie kolejność bloków w bazie (stała, żeby wynik był powtarzalny).
5. Bierzemy od `min` do `max`. Bloki z wynikiem 0 dobieramy tylko, żeby dobić do `min`.
6. Karty: z jednego `topic` najwyżej jedna (tak jak dziś przy AI).

Przy każdym wybranym bloku zapisujemy, które kafelki trafił. To jest „dlaczego tu jest” w UI.

**Pokrycie bólów**: ból jest pokryty, jeśli w ofercie jest widoczny blok z tym kafelkiem. Oferta pokazuje
„rozwiązane X z Y bólów” i listę niepokrytych (wtedy podpowiedź: brakuje treści dla tego bólu).

### 5. Oferta z kafelków i ręczne poprawki

- Oferta trzyma `data.tiles` (wybrane id) i `scenario_id`.
- Slajd dostaje `origin` (JSON: `{ step, matched: { <blockId>: [<tileId>…] } }`) i `locked` (0/1).
- Generowanie: tworzy slajdy z kroków scenariusza, wypełnia je doborem.
- Każda ręczna zmiana slajdu przez człowieka (treść, bloki, karty, ukrycie) ustawia `locked = 1`.
- **Przelicz** (po zmianie kafelków albo na żądanie): przebudowuje slajdy z `locked = 0`; slajdy
  zablokowane zostają, a UI mówi, ile zostało nietkniętych. Slajd można odblokować („Przywróć automat”).
- Istniejące oferty (bez `scenario_id`) działają jak dziś; można je przepiąć na kafelki.

### 6. API

- `GET /api/tiles`, `POST /api/tiles`, `PATCH /api/tiles/:id`, `DELETE /api/tiles/:id`.
- `GET /api/scenarios`, `GET/PUT /api/scenarios/:id`.
- `POST /api/offers/generate` `{ client, tiles: [...], name? }` → nowa oferta (z pokryciem bólów w odpowiedzi).
  Rola bierze się z kafelka `rola:*` (dokładnie jeden, aktywny). Błąd 400 przy kafelku „wkrótce” albo
  nieznanym.
- `PUT /api/offers/:id/tiles` `{ tiles }` → zapis i przeliczenie.
- `POST /api/offers/:id/recompute`.
- `GET /api/offers/:id` zwraca też `coverage` i `origin` slajdów.
- Wszystko opisane w `DOCS` w `src/openapi.js`, więc węzeł n8n pokaże to z polami.

### 7. Interfejs

Główna zasada: język sprzedawcy, nie szablonu. Nazwy kroków („Problemy klienta”) zamiast ramek, kafelki
zamiast tagów, szczegóły techniczne w zwiniętej sekcji „Zaawansowane”.

**Nawigacja**: Oferty · Kafelki · Wiedza · Scenariusze · Biblioteka (dotychczasowe Slajdy i Komponenty
razem, jako miejsce dla osób od szablonu).

**Nowa oferta** (ekran kafelków):

```
Nowa oferta
Klient  [ Kancelaria Nowak i Wspólnicy        ]

Kim jest rozmówca        ( Champion )  ( Zarząd )   CTO · wkrótce   GC · wkrótce …
Segment                  ( Kancelaria ) ( In-house ) ( Administracja )   Banki · wkrótce …
Bóle klienta (wybierz)   [ Poufność ] [ Shadow AI ] [ Powtarzalne dokumenty ] …   (+ opis i cytat po najechaniu)
Produkt / skala          ( SaaS ) ( Vault ) ( On-premise )

Podgląd: scenariusz Zarząd · 7 slajdów · bóle rozwiązane 3 z 3           [ Utwórz ofertę ]
```

**Oferta** (trzy kolumny):

```
┌ Klient ──────────────┐ ┌ Prezentacja ─────────────────────────────┐ ┌ Podgląd ────────┐
│ Kancelaria Nowak     │ │ 1 Okładka                                │ │ [ slajd 1 ]     │
│ Zarząd · Kancelaria  │ │ 2 Problemy klienta     Poufność  Shadow AI│ │ [ slajd 2 ]     │
│ Bóle:                │ │    • Poufność umów…        ← Poufność      │ │ …               │
│  ✓ Poufność          │ │    • AI bez zasad…         ← Shadow AI     │ │                 │
│  ✓ Shadow AI         │ │ 3 Jak rozwiązujemy  🔒 poprawione ręcznie   │ │ [Pobierz PDF]   │
│  ✗ Szablony w skali  │ │ 4 Architektura         bo: Vault          │ │                 │
│ Rozwiązane 2 z 3     │ │ …                                         │ │                 │
│ [Zmień kafelki]      │ │ [Przelicz]                                │ │                 │
└──────────────────────┘ └──────────────────────────────────────────┘ └─────────────────┘
```

- Lewa: klient, wybrane kafelki, pokrycie bólów (niepokryte z podpowiedzią), „Zmień kafelki”.
- Środek: slajdy jako karty z nazwą kroku, chipami „dlaczego” i listą bloków z kafelkami, które trafiły.
  Kliknięcie otwiera edycję: podmiana bloku (lista kandydatów posortowana po wyniku, z kafelkami), tekst
  slajdu, ukrycie. Znacznik „poprawione ręcznie” i „Przywróć automat”.
- Prawa: podgląd FigCraft jak dziś, klik w slajd zaznacza go w środku.

**Kafelki**: kategorie z listą kafelków; przy kafelku opis, cytaty, status i lista przypiętych bloków
i kart. Przypinanie klikiem (bez wpisywania tagów).

**Wiedza**: bloki pogrupowane po typie z kafelkami jako chipami; filtr po kafelku; edycja kafelków bloku
klikiem.

**Scenariusze**: lista kroków (nazwa, ramka z miniaturą, reguła wypełnienia, warunek) z przesuwaniem.

## Doprecyzowania po przeglądzie (decyzje Claude'a, do sprawdzenia)

- **Źródło danych**: `~/Downloads/Gaius Work Templates.xlsx`. Zakładki Bóle i PRKW są jednorazowo
  przepisywane do `offer-studio/seed/` jako JSON (w repo nie trzymamy xlsx). Przypięcie kafelków do treści
  też jest jednorazowe, robione przy budowie i zapisane w seedzie. To nie jest funkcja aplikacji (bez klucza AI).
- **Slajd „Problemy klienta”** pokazuje same wybrane kafelki bólów (nazwa, opis, cytat klienta), a nie bloki
  `problem`. Klient widzi swoje problemy jego słowami. Ogólne bloki `problem` zostają w bazie, scenariusze
  ich nie używają.
- **Pokrycie bólów** liczą tylko widoczne bloki `rozwiazanie` i `use_case`. Slajd problemów i karty
  „dlaczego” się nie liczą, żeby oferta nie twierdziła, że rozwiązuje ból, który tylko nazwała.
- **Ile kafelków**: rola dokładnie 1, segment dokładnie 1, produkt dokładnie 1, bóle od 1 do 5.
  W UI rola, segment i produkt to pojedynczy wybór, a bóle wielokrotny. `when.any` zostaje jako lista, bo
  jeden krok może zależeć od kilku produktów.
- **Karty „dlaczego”** (zasady zestawu: 6 kart, dokładnie jedna wyróżniona, najwyżej jedna „liczba”):
  karty oceniamy po kafelkach jak bloki. Bierzemy 6 tematów z najwyższym wynikiem (remis: kolejność
  z bazy). Temat z najwyższym wynikiem idzie w wariancie `wyroznienie`, reszta w `zwykla`. Karta „liczba”
  wchodzi tylko wtedy, gdy jej temat jest w szóstce i nie ma wariantu zwykłego. Przy mniej niż 6 trafionych
  tematach dobieramy brakujące w kolejności z bazy.
- **Cena**: `generate` przyjmuje opcjonalne `price`. Bez niego idzie cena domyślna z kafelka produktu
  (`tiles.data.price`), a bez niej zostaje puste pole do uzupełnienia, oznaczone w UI.
- **Przeliczanie, przypadki brzegowe**:
  - Slajd zablokowany, którego krok już nie obowiązuje (np. zniknął Vault), zostaje, ale jest ukryty,
    a UI to zaznacza.
  - Kolejność zawsze idzie za scenariuszem. Zablokowany slajd stoi na miejscu swojego kroku.
  - Slajd dodany ręcznie spoza scenariusza jest zablokowany i stoi za slajdem, za którym go dodano.
  - Zmiana scenariusza wchodzi do istniejących ofert dopiero przy przeliczeniu.
  - Każda zmiana slajdu przez API (także z n8n) blokuje slajd, tak samo jak z UI. Wyjątkiem są zmiany
    robione przez samo przeliczenie.
- **Teksty zależne od produktu** (decyzja użytkownika): krok scenariusza ma opcjonalne
  `data_by_product`, np. `{ "produkt:saas": { "title": "Czym jest Gaius?" } }`, nakładane na `data`
  według wybranego kafelka produktu. To samo dla bloków: `data.by_product` obok `data.by_role`
  (najpierw rola, potem produkt nadpisuje). Obecne teksty zostają jako wersja Vault. Wersje SaaS
  i On-premise pisze Claude jako szkice do poprawy, oznaczone w UI „szkic”, i tylko tam, gdzie tekst
  Vault byłby dla nich nieprawdziwy (nazwa produktu, cennik, gdzie działa).
- **Identyfikatory**: kafelki i scenariusze mają własną walidację id (z `:`), tak jak komponenty.
- **Eksport / import bazy**: format v4 z kafelkami i scenariuszami.

## Co zostaje dla wykonawcy

- Dokładny podział `public/app.js` na pliki i wygląd w szczegółach (zgodnie z obecnym `style.css`).
- Treść domyślna slajdów w scenariuszach (start: z oferty bazowej).
- Szczegóły migracji (`SCHEMA_VERSION` 4) i seedowania istniejących baz.
- Testy: dobór (powtarzalność, filtr segmentu, wagi, min/max, topic), blokowanie przy przeliczeniu,
  walidacja kafelków w `generate`, opisy OpenAPI.
