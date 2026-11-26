# Live demo: scenariusz

Bez pitchu, samo demo. Rdzeń trwa 5 minut. Wersja skrócona do 3 minut: kroki 1, 2, 5 i 6.
Każdy krok jest przypisany do kryterium oceny; tak mówimy o nim jury.

| Kryterium | Pkt | Gdzie to pokazujemy (slajd /pitch) |
|---|---|---|
| Działa na żywo na prawdziwym przypadku właściciela wyzwania | 25 | 6: prawdziwa rozmowa sprzedażowa Gaius-Lex |
| Zmierzona poprawa czasu, kosztu lub jakości | 25 | 9: wyniki z produkcji + skala 1000 rejestracji |
| Ktoś spoza zespołu uruchomi z repo | 20 | 11: dwie komendy, README z loginami i zrzutami |
| Firma realnie może dalej używać | 15 | 10 i 11: element sprzedaży, działa na produkcji, zmiany bez kodu |
| Problem i demo przedstawione jasno | 15 | 2–5: kim jesteśmy, FOMU/FOBO, nasz proces, rozwiązanie |

Role: **kierowca** (laptop, klika, nic nie mówi) i **narrator** (mówi). Narrator prowadzi z widoku prowadzącego (/pitch, klawisz P).

## Tryb prezentacji: /pitch

https://bizhack.trygaius.com/pitch (lokalnie: http://localhost:8080/pitch) prowadzi przez ten scenariusz slajd po slajdzie:
na każdym slajdzie są przyciski, które otwierają na żywo generator, Offer Studio i sekcję workflow.

- Strzałki / spacja: dalej, wstecz. **F**: pełny ekran. **P**: widok prowadzącego w drugim oknie (notatki po polsku, zegar
  do 5:00, cel czasowy slajdu, następny slajd). Okna są zsynchronizowane: można klikać w którymkolwiek.
- Slajdy 7 („Under the hood”) i 8 (Offer Studio) są zapasowe: na pytanie „jak to działa” albo gdy deck się jeszcze generuje; w 5 minutach je przeskakujesz.
  Pełny opis techniczny: https://bizhack.trygaius.com/how-it-works.
- Układ ekranu: na projektorze okno /pitch (F), na laptopie widok prowadzącego; karty z landingiem, n8n i Offer Studio
  w tym samym oknie co /pitch, żeby przełączać się Ctrl+Tab.

## Przed wejściem (T−30 min)

1. Internet: Wi-Fi sali + hotspot z telefonu w zapasie. Test: https://bizhack.trygaius.com/ się ładuje.
2. Rozgrzewka i świeże liczby (kolejne prawdziwe uruchomienia trafiają do pomiaru):
   ```bash
   N8N=https://n8n.bizhack.trygaius.com node scripts/try-it.mjs
   N8N_URL=https://n8n.bizhack.trygaius.com N8N_API_KEY=... node scripts/measure.mjs
   ```
   Jeśli liczby się zmieniły, commit `landing/src/lib/measured.json` i redeploy landingu w Coolify (przed demo, nie w trakcie).
3. Prawdziwa rozmowa: zanonimizowana transkrypcja (bez nazwisk klienta, nazwy firmy, danych osobowych) jako
   `real-call.txt` na pulpicie. Przepuść ją raz przez `try-it.mjs --text-file` i zachowaj PDF jako plan B.
4. Karty w przeglądarce, w tej kolejności, zalogowane:
   1. Landing https://bizhack.trygaius.com/ (zoom 110–125%, żeby było widać z sali)
   2. n8n: lista wykonań workflow „Lead → oferta Gaius Vault” (Executions)
   3. Offer Studio https://studio.bizhack.trygaius.com/ (lista ofert)
   4. GitHub: https://github.com/GaiusSigma/bizhack2026 (README)
5. Nagranie ekranu całego demo (z próby) na pulpicie: ostatnia deska ratunku.
6. Wyłącz powiadomienia systemowe i komunikatory. Ustaw przeglądarkę na pełny ekran.

## Rdzeń: 5 minut (12 slajdów, 7 i 8 zapasowe)

Przekaz w jednym zdaniu: **Gaius to platforma document intelligence i automatyzacji na małych modelach językowych,
wdrażana on-prem; ofertowanie zautomatyzowaliśmy u siebie, i to jest dowód, że zautomatyzujemy każdy proces.**

| # | Slajd | Czas | Co mówimy |
|---|---|---|---|
| 1 | Tytuł | 0:00–0:15 | Kim jesteśmy, jednym zdaniem. „Dziś pokażemy na żywo, jak zautomatyzowaliśmy własne ofertowanie.” |
| 2 | Kim jesteśmy | 0:15–0:45 | Document intelligence na sLLM, wdrożenia on-prem (Gaius Vault), automatyzacje na integracjach: SharePoint, Teams, Outlook, OneDrive, Google Drive, Word, API, n8n. Produkcyjnie: SGB Bank, mKomornik. |
| 3 | FOMU i FOBO | 0:45–1:15 | W dobie AI slopu wyostrzyły się dwa lęki: strach przed pomyłką i strach, że jest coś lepszego. Przy wdrożeniu od 50 tys. € rocznie oferta „jesteśmy fajni” nie działa; trzeba pokazać, że rozumiemy ich potrzebę. |
| 4 | Nasz proces | 1:15–1:45 | Dopasowana oferta: ok. 3 h pracy, do 2 dni do klienta, nawet z szablonami. Ok. 1000 rejestracji w SaaS miesięcznie w samej Polsce; testują SaaS, nie wdrożenie. Startupowym zespołem nie da się zaopiekować wszystkimi. |
| 5 | Rozwiązanie | 1:45–2:05 | Każde zgłoszenie, rozmowa i rejestracja dostaje ofertę, która odpowiada na ich lęki ich słowami. „Zamiast mówić, pokażemy.” |
| 6 | **Demo** | 2:05–3:20 | Paste a call → plik z prawdziwą rozmową → Generate; w trakcie karta n8n (nowe wykonanie). View the deck: slajd 2 (słowa klienta), 4 (obawy „From our call” = FOMU zbite), 6 (kroki przed decyzją = FOBO). Notatka dla handlowca. Plan B: PDF z próby. |
| 7 | Jak to działa | zapas | Na pytanie „jak to działa” albo gdy deck się generuje. Pełny opis: /how-it-works. |
| 8 | Offer Studio | zapas | Handlowiec poprawia slajd i pobiera nowy PDF. |
| 9 | Zmierzone | 3:20–3:55 | Ok. 3 h → 12 s, do 2 dni → ten sam dzień, ok. $0,003 za ofertę, 0 błędów. Skala: 1000 rejestracji × 3 h = ok. 3000 h (ok. 19 etatów) ręcznie; automatem kilka godzin pracy maszyny i kilka dolarów. |
| 10 | Dowód | 3:55–4:25 | Ten system to element sprzedaży: pokazuje, że świetnie operujemy AI i zautomatyzujemy każdy proces, nawet ofertowanie. Ten sam wzorzec budujemy klientom na Gaiusie. |
| 11 | Uruchom sam | 4:25–4:45 | Repo publiczne, dwie komendy, pierwszy deck po 2,5 minuty; na produkcji działa na naszym serwerze. |
| 12 | Zamknięcie | 4:45–5:00 | „Gaius: document intelligence i automatyzacja na małych modelach. Sprawdzone na własnej sprzedaży.” Pytania. |

Plan B dla dema: n8n nie odpowiada → PDF z przygotowania (punkt 3), powiedz wprost, że to wynik sprzed 20 minut.

## Pytania, które padną

| Pytanie | Odpowiedź |
|---|---|
| Czy AI zmyśla w ofercie? | Model pisze tylko z treści zgłoszenia i faktów o produkcie z Offer Studio. Walidator odrzuca pola spoza szablonu, przekroczone limity i złą liczbę elementów; po 3 próbach zostaje tekst domyślny, a handlowiec dostaje listę pominięć. Porównanie z narzędziem konkurencji pojawia się tylko, gdy klient sam je wymienił. |
| Dane klienta idą do zewnętrznego modelu? | Na demo tylko zanonimizowane rozmowy. Model to jeden parametr węzła OpenRouter w n8n; w produkcji podpinamy model hostowany w EOG albo lokalny (Gaius Vault). |
| Skąd 3 godziny? | Z obecnej pracy zespołu sprzedaży Gaius-Lex: rozmowa → notatki → wybór slajdów → przepisanie treści → PDF. |
| Co, jak zgłoszenie jest puste? | Dostaje ofertę domyślną (segment z domeny e-maila, rola champion), a notatka dla handlowca mówi, co dopytać. Pokazane w `sample-data/landing-role-only.json`. |
| Po polsku? | Wejście po polsku albo angielsku, deck po angielsku (taki jest szablon 2026). Notatka dla handlowca po polsku. |
| Ile to kosztuje w skali? | ~17 tys. tokenów na deck, ok. $0,003. 1000 ofert miesięcznie to ok. $3. |
| Dlaczego sLLM i on-prem? | Dokumenty klientów zostają w organizacji; licencja Vault obejmuje całą organizację bez liczenia użytkowników. Nie twierdzimy, że każdy wariant Vault liczy wszystko lokalnie (research może korzystać z biblioteki prawa w chmurze w EOG, chyba że wariant z Legal Researcher on-premise). |
| Czym jest FOMU / FOBO? | Fear of messing up (strach przed złym wyborem) i fear of a better option (strach, że zaraz będzie coś lepszego). |
| Co jest zamockowane? | Zapis do CRM i alert na Discordzie. Wszystko inne jest na produkcji. |
