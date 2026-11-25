# n8n z węzłami Offer Studio

Obraz `n8n` w tym stacku to oficjalny `n8nio/n8n` z dwoma wbudowanymi węzłami do ofertownika
(Offer Studio). Są dostępne od razu po wdrożeniu, bez instalowania community nodes:

| Węzeł | Typ w workflow | Do czego |
|---|---|---|
| **Offer Studio** | `CUSTOM.offerStudio` | Każda operacja API: oferty, slajdy, bloki wiedzy, szablony, PDF, `.figcraft`, eksport/import. Działa też jako narzędzie agenta AI |
| **Offer Studio Trigger** | `CUSTOM.offerStudioTrigger` | Uruchamia workflow po zmianie oferty, slajdu, bloku albo szablonu (strumień `/api/events`) |

## Jak węzeł nadąża za ofertownikiem

Węzeł nie ma wpisanej na sztywno listy operacji. Czyta `GET /api/openapi.json` z Offer Studio
(cache 30 s) i z niego buduje:

- **Zasób**: tagi z opisu API (Oferty, Slajdy, Bloki wiedzy, Szablony, Baza, System),
- **Operację**: endpointy w danym zasobie (wartość zapisana w workflow to np. `GET /api/offers/{id}/pdf`),
- **Pola**: parametry ścieżki, filtry i pola treści żądania, z typami i opisami.

Nowy endpoint w Offer Studio jest więc widoczny w n8n zaraz po redeployu Offer Studio, bez przebudowy
n8n. Opis API powstaje z tras zarejestrowanych w serwerze (`offer-studio/src/openapi.js`), więc nie
rozjedzie się z kodem:

1. Dodajesz trasę w `offer-studio/src/server.js`.
2. Dopisujesz jej opis w `DOCS` w `offer-studio/src/openapi.js` (tag, summary, parametry, body).
   Trasa bez opisu i tak trafia do n8n, z jednym polem „Treść (JSON)”, a test
   `openapi: każda trasa API ma opis` w `npm test` przypomina o opisie.
3. Redeploy Offer Studio. W n8n otwierasz węzeł i nowa operacja jest na liście.

Gdy czegoś nie ma w opisie, zasób **Dowolne Żądanie** wysyła dowolną metodę na dowolną ścieżkę `/api/...`.

Węzeł sam rozpoznaje typ odpowiedzi:

- JSON z listą: jeden element n8n na rekord (opcja „Rozbij listę na elementy”),
- PDF albo `.figcraft`: plik binarny w polu `data` (opcja „Pole binarne wyniku”),
- 204: `{ "success": true }`.

Upload szablonu (`POST /api/templates`) bierze plik z pola binarnego wskazanego w polu `file`.
Opcja **Treść JSON** scala się z polami, a tablica zastępuje całą treść. Tak dodasz kilka bloków
jednym żądaniem.

Pola z id (oferta, szablon, blok) są tekstowe, żeby działały wyrażenia, np. `{{ $json.id }}`
z oferty utworzonej wcześniej w workflow. Opis pola podaje, skąd wziąć id (np. `/api/offers`).

## Poświadczenie

Typ **Offer Studio API**: adres (domyślnie `http://offer-studio:3000`) i token (`STUDIO_API_TOKEN`).

W tym stacku n8n wypełnia oba pola sam. `n8n/entrypoint.sh` składa z `OFFER_STUDIO_URL` i
`OFFER_STUDIO_API_TOKEN` zmienną `CREDENTIALS_OVERWRITE_DATA`, a n8n wpisuje te wartości w puste pola
i ukrywa je w edytorze. Wystarczy raz utworzyć poświadczenie „Offer Studio API” i je zapisać.
Token zna wtedy każdy użytkownik n8n, który może użyć tego poświadczenia, i to jest ten sam token co
w Offer Studio.

## Przykłady

- **Formularz → nowy use case**: Form Trigger → Offer Studio (Bloki wiedzy / Dodaj blok:
  `type` = `use_case`, `title`, `body`, `tags` = `["kancelaria"]`).
- **Oferta dla klienta**: Offer Studio (Oferty / Skopiuj ofertę, `id` = `gaius-vault-bazowa`) →
  Offer Studio (Oferty / Zmień ofertę, `data` = `{"client": "ACME S.A.", "price": "12 000"}`) →
  Offer Studio (Oferty / Pobierz PDF oferty) → Gmail z załącznikiem `data`.
- **Powiadomienie o zmianie**: Offer Studio Trigger (Zmiany w: Oferty) → Slack.

Trigger grupuje zmiany tego samego rekordu w oknie „Grupuj zmiany (ms)” (domyślnie 3 s), bo edycja w
dashboardzie zapisuje się na bieżąco. Z opcją „Pobierz aktualny rekord” dołącza ofertę, blok albo
szablon w obecnym stanie. Przy zmianie slajdu dołącza całą ofertę, a po usunięciu rekordu ustawia
`deleted: true`.

## Workflow „Offer Studio · oferta dla leada”

Plik: [`workflows/offer-studio-lead.json`](workflows/offer-studio-lead.json). n8n prowadzi cały proces
ofertowy, a Offer Studio jest narzędziem: trzyma wiedzę, kopiuje ofertę bazową i renderuje PDF.

```
Lead (webhook POST /webhook/offer)
  → Brief                        jeden format wejścia dla każdego źródła
  → CRM: co już wiemy            WYŁĄCZONY (po hackathonie: dane klienta z CRM)
  → Coś wiemy?                   jest tekst (mail, transkrypt, notatka)?
      tak → Analiza leada (AI)   POST /api/leads/analyze: segment, rola, obawy
      nie → (wartości domyślne)
  → Plan oferty                  segment, rola decydenta, treść
  → Use case'y segmentu          GET /api/blocks?type=use_case&tag=…
  → Kopia oferty bazowej         POST /api/offers/gaius-vault-bazowa/duplicate
  → Zmiany pod rolę i segment    lista PATCH-y: slajdy widoczne/ukryte, okładka, use case'y
  → Zastosuj zmiany
  → Slajd „dlaczego” → Dobór argumentów (AI)   POST /api/slides/:id/pick z briefem
  → Wynik → Odpowiedź dla źródła (JSON) + CRM + Discord (mock)

PDF oferty (webhook GET /webhook/offer-pdf?id=…)
  → Oferta do PDF → Oferta z leada? → Pobierz PDF → Wyślij PDF   (inaczej 404)
```

**Wejście** (`POST /webhook/offer`, JSON). Każde pole jest opcjonalne:

| Pole | Znaczenie |
|---|---|
| `source` | skąd lead: `landing-email`, `gmail`, `fireflies`, `gaius-meet`… |
| `segment` | `kancelaria`, `in-house` albo `administracja` |
| `role` | `champion` albo `zarzad` (kto czyta ofertę) |
| `email`, `client` | kontakt i nazwa organizacji |
| `text` | mail, transkrypt albo notatka. Gdy jest, AI ustala brakujące pola |

**Nic nie wiemy** (brak `text`): segment z pola `segment` albo z domeny maila, inaczej `in-house`;
rola z pola `role`, inaczej `zarzad`. **Coś wiemy**: to, co przyszło w polach, jest pewne, a AI
uzupełnia resztę i wyciąga obawy. Błąd AI (np. brak `ANTHROPIC_API_KEY`) nie zatrzymuje oferty.

**Rola decyduje o ofercie.** Zarząd dostaje krótką ofertę: okładka, dlaczego Vault, plan wdrożenia,
use case'y, cennik, kontakt. Champion dostaje dłuższą: problemy zespołu, czym jest Vault, use case'y,
porównanie, argumenty dla zarządu, cennik, kontakt.

**Odpowiedź**: `{offerId, offerName, known, segment, role, who, client, concerns, summary, pdfPath, ms}`.
`pdfPath` (`/webhook/offer-pdf?id=…`) zwraca PDF tylko dla ofert z `data.origin = "n8n-lead"`.

### Uruchomienie

1. W n8n: **Import from File** → `n8n/workflows/offer-studio-lead.json`.
2. Utwórz poświadczenie **Offer Studio API** (adres i token wypełniają się same) i wskaż je w węzłach
   Offer Studio, jeśli n8n o to poprosi.
3. W Offer Studio ustaw `ANTHROPIC_API_KEY` (analiza leada i dobór argumentów). Bez klucza workflow
   działa, tylko zawsze idzie wartościami domyślnymi.
4. Włącz workflow (**Active**). Landing woła `${PUBLIC_N8N_URL}/webhook/offer`; w `docker-compose.yml`
   `PUBLIC_N8N_URL` = `SERVICE_URL_N8N`. Bez tej zmiennej generator na landingu pokazuje ofertę przykładową.

Test z terminala:

```bash
curl -s -X POST http://localhost:5678/webhook/offer -H 'content-type: application/json' -d '{"segment":"kancelaria","text":"Jestem partnerem w kancelarii, boimy się halucynacji w cytatach."}'
```

Kolejne źródła (Gmail, Fireflies, Gaius Meet) dodajesz jako triggery podpięte do węzła **Brief**:
wystarczy, że podadzą `text` (treść maila, transkrypt) i `source`.

## Budowa obrazu

`n8n/Dockerfile`: etap `node:22-alpine` kompiluje paczkę `n8n-nodes-offer-studio` (TypeScript) i
uruchamia testy parsera, a etap `n8nio/n8n:<N8N_VERSION>` kopiuje ją do
`/opt/n8n-custom/node_modules/` i ustawia `N8N_CUSTOM_EXTENSIONS=/opt/n8n-custom`. Paczka leży poza
wolumenem `/home/node/.n8n`, więc każdy redeploy wgrywa jej aktualną wersję.

Podbicie n8n: `N8N_VERSION` w `docker-compose.yml` (argument builda usługi `n8n`) i ten sam tag
`n8nio/runners` w usłudze `n8n-runners`. W `n8n-nodes-offer-studio/package.json` możesz też podbić
`n8n-workflow` (służy tylko do kompilacji).

## Praca nad węzłem

```powershell
cd n8n/n8n-nodes-offer-studio; npm install --ignore-scripts; npm test
```

Testy w `test/live.test.cjs` i `test/trigger.test.cjs` wołają działające Offer Studio (domyślnie
`http://127.0.0.1:3917` z tokenem `tok`, inne przez `STUDIO_URL` i `STUDIO_TOKEN`). Bez serwera są pomijane:

```powershell
cd offer-studio; $env:PORT=3917; $env:STUDIO_API_TOKEN='tok'; $env:STUDIO_DB="$env:TEMP\studio-test.db"; npm start
```

Zmiana w kodzie węzła (np. nowy sposób obsługi odpowiedzi) wymaga przebudowy obrazu n8n. Zmiana w API
Offer Studio jej nie wymaga.
