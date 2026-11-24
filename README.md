# BizHack 2026: stack Docker Compose

Jeden `docker-compose.yml` z trzema aplikacjami, przygotowany do wdrożenia przez **Coolify**:

| Usługa | Co to jest | Port w kontenerze | Domena w Coolify |
|---|---|---|---|
| `landing` | Landing page w Astro, zbudowany statycznie i serwowany przez nginx | 80 | tak |
| `n8n` | n8n 2.50 (automatyzacje) | 5678 | tak |
| `n8n-runners` | Zewnętrzne task runnery n8n (JS i Python w węzłach Code) | – | nie |
| `postgres` | Baza danych n8n (Postgres 17) | 5432 | nie |
| `figcraft` | FigCraft w wersji webowej (WebAssembly) serwowany przez nginx + proxy `/sync/` | 80 | tak |
| `figcraft-server` | Serwer współpracy FigCraft (udostępnianie plików, linki, lista zespołu) | 47900 | nie, dostępny przez `figcraft` pod `/sync/` |

```
.
├── docker-compose.yml          # produkcja / Coolify
├── docker-compose.local.yml    # nakładka lokalna: porty na localhost, n8n po http
├── .env.example                # zmienne do uruchomienia lokalnego
├── landing/                    # projekt Astro + Dockerfile (node -> nginx) + nginx.conf
└── figcraft/
    ├── web/                    # Dockerfile: oficjalny figcraft-web-<wersja>.zip + nginx
    └── server/                 # Dockerfile: oficjalna binarka figcraft-server + entrypoint
```

## Uruchomienie lokalne

```powershell
Copy-Item .env.example .env
```

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

- landing: http://localhost:8080
- FigCraft: http://localhost:8081
- n8n: http://localhost:5678 (przy pierwszym wejściu zakładasz konto właściciela)

Praca nad samym landingiem z hot reloadem:

```powershell
cd landing; npm install; npm run dev
```

## Wdrożenie w Coolify

1. Wypchnij repo na GitHuba (lub inny Git, który Coolify widzi).
2. W Coolify: **New Resource → Public/Private Repository**, wybierz repo i gałąź, jako
   **Build Pack** wybierz **Docker Compose**, ścieżka pliku: `/docker-compose.yml`.
3. Coolify wczyta usługi. Przy `landing`, `n8n` i `figcraft` ustaw domeny, np.:
   - `landing` → `https://bizhack.example.com`
   - `n8n` → `https://n8n.bizhack.example.com`
   - `figcraft` → `https://figcraft.bizhack.example.com`

   Porty są już zapisane w nazwach zmiennych `SERVICE_URL_<USŁUGA>_<PORT>`, więc Coolify sam
   kieruje ruch na właściwy port kontenera. Nie dodawaj `ports:` do compose: wszystko idzie przez
   proxy Coolify z certyfikatem Let's Encrypt.
4. **Deploy.** Hasła (`SERVICE_USER_POSTGRES`, `SERVICE_PASSWORD_POSTGRES`,
   `SERVICE_PASSWORD_N8NRUNNERS`, `SERVICE_PASSWORD_64_N8NKEY`) Coolify generuje przy pierwszym
   wdrożeniu i trzyma w zakładce Environment Variables.

> **Klucz szyfrowania n8n** (`SERVICE_PASSWORD_64_N8NKEY`) szyfruje zapisane w n8n poświadczenia.
> Zrób jego kopię. Po zmianie albo utracie klucza n8n nie odczyta zapisanych credentiali.

Wolumeny `n8n-data`, `postgres-data` i `figcraft-data` są trwałe i widać je w Coolify w
**Persistent Storage**. Warto włączyć w Coolify backup bazy albo całego serwera.

## FigCraft

- Obraz `figcraft` pobiera **oficjalny** build `figcraft-web-0.18.1.zip` z
  [releasów FigCraft](https://github.com/storytold/figcraft/releases) i sprawdza jego SHA-256.
  Obraz `figcraft-server` robi to samo z `figcraft-server-0.18.1-linux-<arch>.tar.gz`
  (amd64 i arm64).
- Przy starcie kontener `figcraft` wpisuje do `index.html`
  `<meta name="figcraft-server" content="wss://<domena-figcraft>/sync/">`, więc aplikacja w
  przeglądarce od razu zna serwer współpracy (Home ▸ Online, udostępnianie, kody dołączania).
- FigCraft jest we wczesnej fazie rozwoju (alpha). W przeglądarce pliki trzymane są lokalnie;
  żeby pracować wspólnie, publikuje się je na serwer.

### Publikowanie plików na serwer

Domyślnie (`FIGCRAFT_OPEN_PUBLISH=false`) pliki może publikować tylko ktoś, kto zna **klucz
serwera**. Adres z kluczem wypisuje polecenie uruchomione w kontenerze `figcraft-server`
(w Coolify: zakładka **Terminal** tej usługi):

```sh
figcraft-server --config /etc/figcraft-server/server.toml key
```

Ten adres wklejasz w FigCraft w Preferences jako serwer albo używasz go w Share ▸ Publish to server.
Traktuj go jak hasło.

Ustawienia serwera (zmienne środowiskowe usługi `figcraft-server`):

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `FIGCRAFT_OPEN_PUBLISH` | `false` | `true` pozwala publikować każdemu, bez klucza (serwer publiczny) |
| `FIGCRAFT_TEAM_FILES` | pusta (wyłączona) | Lista plików zespołu: `edit`, `comment` albo `view`. Widzi ją **każdy**, kto dotrze do serwera, więc na publicznej domenie włączaj ją świadomie |
| `FIGCRAFT_MAX_FILE_MB` | `64` | Największy plik w MiB |

### Podbicie wersji FigCraft

W `figcraft/web/Dockerfile` i `figcraft/server/Dockerfile` zmień `FIGCRAFT_VERSION` i sumy
SHA-256 na wartości z pliku `SHA256SUMS.txt` nowego releasu.

## n8n

- Konfiguracja wzorowana na oficjalnym szablonie Coolify „n8n with PostgreSQL”: Postgres,
  zewnętrzne task runnery (`n8nio/runners`), `N8N_PROXY_HOPS=1` za proxy Coolify.
- Webhooki są dostępne pod `https://<domena-n8n>/webhook/...`.
- Aktualizacja: zmień tag `n8nio/n8n` i `n8nio/runners` (zawsze ta sama wersja) i zrób redeploy.
