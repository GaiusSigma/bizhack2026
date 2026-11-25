# Offer Studio

Minimalistyczny dashboard do zbierania wiedzy o ofercie i składania z niej prezentacji.

- **Wiedza**: bloki (use case'y, problemy, argumenty, wiersze porównań, składniki pakietów…).
  Typ i tagi to dowolne napisy, a pola specyficzne dla typu (np. `effect` w use case) dodajesz sam.
- **Oferty**: oferta to lista slajdów. Slajd = layout + treść + wybrane bloki (konkretne albo
  „wszystkie use case'y z tagiem kancelaria”). Obok edytora jest podgląd na żywo: każda zmiana,
  także przez API, pojawia się na slajdzie w ok. sekundę. Kliknięcie w element slajdu otwiera jego edycję.
- **Layouty**: wygląd slajdów to szablony Handlebars + CSS trzymane w bazie, nie w kodzie.
  Gdy prezentacja się zmieni, edytujesz layout albo dodajesz nowy, bez deployu.
- **PDF**: przycisk „Pobierz PDF” (Gotenberg/Chromium, slajdy 1920×1080) albo „Drukuj” z przeglądarki.
- **Eksport / import**: cała baza (bloki, layouty, oferty, motyw, obrazki) w jednym pliku JSON.
- **API**: wszystko przez REST, opis pod `/static/api.html`.

Na start baza jest wypełniona treścią z `gaius-offer.figcraft`: 40 bloków, 9 layoutów w stylu
Gaius i oferta bazowa z 11 slajdami. Slajd z architekturą jest obrazkiem wyeksportowanym z FigCraft.

## Uruchomienie lokalne bez Dockera

```powershell
cd offer-studio; npm install; npm run dev
```

Aplikacja wstaje na http://localhost:3000 bez hasła. Baza ląduje w `offer-studio/data/studio.db`.
Bez Gotenberga przycisk „Pobierz PDF” zgłosi błąd; użyj „Drukuj” → „Zapisz jako PDF”.

Testy:

```powershell
cd offer-studio; npm test
```

## W stacku (docker-compose / Coolify)

Usługi `offer-studio` i `gotenberg` są w głównym `docker-compose.yml`. W Coolify ustaw domenę dla
`offer-studio` (port 3000 jest już w `SERVICE_URL_OFFER_STUDIO_3000`). Gotenberg nie potrzebuje domeny.

| Zmienna | Skąd | Do czego |
|---|---|---|
| `STUDIO_PASSWORD` | `SERVICE_PASSWORD_STUDIO` | Hasło w przeglądarce (login dowolny) |
| `STUDIO_API_TOKEN` | `SERVICE_PASSWORD_64_STUDIOAPI` | `Authorization: Bearer …` dla skryptów i n8n |
| `STUDIO_SECRET` | `SERVICE_PASSWORD_64_STUDIOSECRET` | Podpis jednorazowych linków, z których Gotenberg robi PDF |
| `GOTENBERG_URL` | `http://gotenberg:3000` | Silnik PDF |
| `STUDIO_DB` | `/data/studio.db` | Plik bazy (wolumen `offer-studio-data`) |
| `STUDIO_SEED` | – | `false` wyłącza dane startowe przy pustej bazie |

Bez `STUDIO_PASSWORD` i `STUDIO_API_TOKEN` aplikacja jest otwarta. Tak ma być tylko lokalnie.

### n8n

n8n jest w tej samej sieci, więc węzeł HTTP Request woła `http://offer-studio:3000/api/...`
z nagłówkiem `Authorization: Bearer <STUDIO_API_TOKEN>`. Przykłady: dopisanie use case'u z formularza,
podmiana klienta i ceny w ofercie (`PATCH /api/offers/<id>`), pobranie PDF (`GET /api/offers/<id>/pdf`)
i wysłanie go mailem.

## Jak zmieniać wygląd

- `**słowo**` w tytule slajdu daje kolor akcentu.
- Wspólne kolory i klasy są w „Layouty → Motyw”, a każdy layout ma własny CSS w zakresie `.layout-<id>`.
- W szablonie: `{{data.*}}` to treść slajdu, `{{offer.*}}` to zmienne oferty (np. `client`, `price`),
  a `{{#each blocks}}` przechodzi po blokach. Pola bloku są dostępne wprost, np. `{{effect}}`.
- Element z `data-block="{{id}}"` da się kliknąć w podglądzie.
- Gotowy slajd z FigCraft: wyeksportuj go jako PNG/WebP, wgraj w „Obrazki” i użyj layoutu
  „Obraz na cały slajd”.
