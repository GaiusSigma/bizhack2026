# Offer Studio

Minimalistyczny dashboard do zbierania wiedzy o ofercie i składania z niej prezentacji.
Wygląd slajdów, podgląd i PDF robi **FigCraft**: dashboard trzyma dane, a FigCraft je renderuje.

- **Wiedza**: bloki (use case'y, problemy, argumenty, wiersze porównań, składniki pakietów…).
  Typ i tagi to dowolne napisy, a pola specyficzne dla typu (np. `effect` w use case) dodajesz sam.
- **Szablony**: pliki `.figcraft`. Każda ramka najwyższego poziomu to slajd szablonu, a pola wiąże się
  nazwami warstw (niżej). Wygląd zmieniasz w FigCraft i wgrywasz plik z powrotem, bez deployu.
- **Oferty**: lista slajdów. Slajd = slajd szablonu + treść + bloki (konkretne albo
  „wszystkie use case'y z tagiem kancelaria”). Obok edytora jest podgląd renderowany przez FigCraft,
  odświeżany po każdej zmianie, także przez API.
- **Eksport**: „Pobierz PDF” (FigCraft, tekst zostaje tekstem) i „Pobierz .figcraft” (gotowa oferta
  do ręcznych poprawek w FigCraft).
- **Eksport / import bazy**: bloki, szablony (z plikami), oferty i slajdy w jednym pliku JSON.
- **API**: wszystko przez REST, opis pod `/static/api.html`.

Na start baza zawiera treść z `gaius-offer.figcraft` (40 bloków, oferta bazowa z 11 slajdami)
i szablon `seed/gaius-template.figcraft`, czyli ten sam plik z oznaczonymi polami.

## Jak oznaczyć szablon w FigCraft

Zmieniasz tylko **nazwy warstw**, wygląd zostaje Twój:

| Nazwa warstwy | Co robi |
|---|---|
| `use-case` (ramka najwyższego poziomu) | identyfikator slajdu szablonu |
| `{{data.title}}` (tekst) | treść slajdu z edytora oferty |
| `{{offer.client\|upper}}` | zmienna oferty, opcjonalnie wielkimi literami |
| `Efekt dla biznesu: {{effect}}` | tekst stały + pole; pusty wynik ukrywa warstwę |
| `#item` (ramka/grupa) | karta na blok. W środku `{{title}}`, `{{body}}`, `{{n}}` i pola bloku |
| `#item:lines` | wiersz z pola `data.lines` (każda linia `etykieta \| wartość`): `{{title}}`, `{{value}}` |
| `[[2:tekst]]` | styl 2. wyróżnienia z oryginalnego tekstu warstwy |
| `\n` | nowa linia |

W treści `**słowo**` dostaje styl pierwszego wyróżnienia z szablonu (w szablonie Gaius: czerwony akcent).
Kart `#item` może być więcej niż bloków (nadmiar znika) albo mniej (ostatnia karta jest powielana).
Najlepiej działa to w auto-layoucie (siatka albo lista), bo wtedy dodatkowe karty układają się same.
Karty, które mają rosnąć z tekstem, ustaw na „hug” w pionie.

## Uruchomienie lokalne bez Dockera

Potrzebny zainstalowany FigCraft. Na Windows `figcraft-cli.exe` jest wykrywany automatycznie, a w innym
miejscu wskazuje go zmienna `FIGCRAFT_CLI`.

```powershell
cd offer-studio; npm install; npm run dev
```

Aplikacja wstaje na http://localhost:3000 bez hasła. Baza ląduje w `offer-studio/data/studio.db`.

Testy (render PDF testują, gdy jest `figcraft-cli`):

```powershell
cd offer-studio; npm test
```

## W stacku (docker-compose / Coolify)

Obraz zawiera `figcraft-cli` z oficjalnego releasu FigCraft (suma SHA-256 sprawdzana przy buildzie)
i font Figtree (`fonts/`, licencja OFL). W Coolify ustaw domenę dla `offer-studio`.

| Zmienna | Skąd | Do czego |
|---|---|---|
| `STUDIO_PASSWORD` | `SERVICE_PASSWORD_STUDIO` | Hasło w przeglądarce (login dowolny) |
| `STUDIO_API_TOKEN` | `SERVICE_PASSWORD_64_STUDIOAPI` | `Authorization: Bearer …` dla skryptów i n8n |
| `FIGCRAFT_WEB_URL` | `SERVICE_URL_FIGCRAFT` | Link „Otwórz FigCraft” |
| `FIGCRAFT_CLI` | `/usr/local/bin/figcraft-cli` | Ścieżka do figcraft-cli |
| `STUDIO_DB` | `/data/studio.db` | Plik bazy (wolumen `offer-studio-data`) |
| `STUDIO_SEED` | – | `false` wyłącza dane startowe przy pustej bazie |

Bez `STUDIO_PASSWORD` i `STUDIO_API_TOKEN` aplikacja jest otwarta. Tak ma być tylko lokalnie.

Przy pierwszym starcie nowej wersji na bazie z layoutami HTML baza migruje się sama: bloki i oferty
zostają, dochodzi szablon Gaius, a oferta bazowa dostaje slajdy pod ten szablon.

Podbicie FigCraft: w `Dockerfile` zmień `FIGCRAFT_VERSION` i obie sumy z `SHA256SUMS.txt` releasu.

### n8n

n8n ze stacku ma wbudowane węzły **Offer Studio** i **Offer Studio Trigger** ([opis](../n8n/README.md)),
z poświadczeniem wypełnionym automatycznie. Listę operacji i pól węzeł czyta na żywo z
`GET /api/openapi.json`, który powstaje z tras serwera i opisów w `src/openapi.js`.

**Nowa trasa API = opis w `DOCS` w `src/openapi.js`.** Wtedy n8n pokaże ją z nazwą, polami i typami.
Bez opisu też się pojawi, ale tylko z polem „Treść (JSON)”, a `npm test` zgłosi brak.

Przykłady: dopisanie use case'u z formularza, podmiana klienta i ceny w ofercie
(`PATCH /api/offers/<id>`), pobranie PDF (`GET /api/offers/<id>/pdf`) i wysłanie go mailem.
