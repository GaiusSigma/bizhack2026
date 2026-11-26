# Live demo: scenariusz

Bez pitchu, samo demo. Rdzeń trwa 5 minut. Wersja skrócona do 3 minut: kroki 1, 2, 5 i 6.
Każdy krok jest przypisany do kryterium oceny; tak mówimy o nim jury.

| Kryterium | Pkt | Gdzie to pokazujemy |
|---|---|---|
| Działa na żywo na prawdziwym przypadku właściciela wyzwania | 25 | krok 2 (prawdziwa rozmowa Gaius-Lex), krok 3 |
| Zmierzona poprawa czasu, kosztu lub jakości | 25 | krok 5 (wyniki z produkcji + „your run just now”) |
| Ktoś spoza zespołu uruchomi z repo | 20 | krok 6 (README, 4 komendy, sample-data) |
| Firma realnie może dalej używać | 15 | krok 3 (Offer Studio), krok 6 (Coolify, nasze narzędzia) |
| Problem i demo przedstawione jasno | 15 | krok 1 i jedno zdanie na każdy krok |

Role: **kierowca** (laptop, klika, nic nie mówi) i **narrator** (mówi, pokazuje palcem). Narrator zna skrót każdego
kroku na pamięć; kierowca ma otwarte karty w kolejności z listy niżej.

## Tryb prezentacji: /pitch

https://bizhack.trygaius.com/pitch (lokalnie: http://localhost:8080/pitch) prowadzi przez ten scenariusz slajd po slajdzie:
na każdym slajdzie są przyciski, które otwierają na żywo generator, Offer Studio i sekcję workflow.

- Strzałki / spacja: dalej, wstecz. **F**: pełny ekran. **P**: widok prowadzącego w drugim oknie (notatki po polsku, zegar
  do 5:00, cel czasowy slajdu, następny slajd). Okna są zsynchronizowane: można klikać w którymkolwiek.
- Slajd 4 („Under the hood”) jest opcjonalny: na pytanie „jak to działa” albo gdy deck się jeszcze generuje.
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

## Rdzeń: 5 minut

### 1. Problem (0:00–0:30)
Karta: landing, góra strony.

> „Gaius-Lex sprzedaje prywatne AI kancelariom i działom prawnym. Dziś dopasowana oferta po rozmowie to u nas
> około 3 godzin pracy handlowca, a klient czeka do 2 dni. Kupujący boją się dwóch rzeczy: złego narzędzia i wycieku
> danych. Ogólny deck nie odpowiada na żadną z nich. Pokażemy, jak robimy to teraz: na żywo, na prawdziwej rozmowie.”

### 2. Prawdziwy przypadek (0:30–2:00), 25 pkt
Karta: landing → zakładka **Paste a call**.

1. Kierowca: **Load a file** → `real-call.txt` (albo wkleja). Narrator: „To zanonimizowana transkrypcja naszej
   prawdziwej rozmowy sprzedażowej z <typ klienta, np. dział prawny grupy produkcyjnej>.”
2. **Generate my offer**. W trakcie (ok. 12 s) kierowca przełącza na kartę n8n: nowe wykonanie pojawia się na liście.
   Narrator: „n8n czyta rozmowę, dobiera kafelki z Offer Studio, model pisze treść slajdów, walidator sprawdza
   każde pole i limity znaków, a FigCraft renderuje PDF.”
3. Z powrotem na landing: kafelki (rola, segment, bóle) i „What you told us worries you”. Narrator wskazuje jeden
   ból, który klient naprawdę powiedział.
4. **View the deck**: slajd 2 (Starting point: słowa klienta), slajd 4 (Team support: obawy „From our call”),
   slajd 6 (Preparation: kroki przed decyzją). Nie czytamy slajdów, pokazujemy jedno zdanie, które padło w rozmowie.
5. Rozwiń **What our sales team gets with it**: notatka dla handlowca po polsku (co dopytać na następnym callu).

Plan B: n8n nie odpowiada → kierowca otwiera PDF z punktu 3 przygotowania, narrator mówi to wprost
(„tu wynik tego samego wejścia sprzed 20 minut”).

### 3. Handlowiec przejmuje (2:00–2:45), 15 pkt
Karta: Offer Studio → najnowsza oferta.

> „Oferta nie znika w PDF-ie. Leży w Offer Studio: handlowiec widzi, które slajdy napisało AI i dlaczego,
> poprawia jedno zdanie i pobiera nowy PDF. Wskazówki dla modelu też są tutaj, więc zmiana tonu nie wymaga programisty.”

Kierowca: otwiera ofertę, pokazuje oznaczenie „written by…”, zmienia jedno słowo, podgląd się odświeża.

### 4. Bez formularza: automat (2:45–3:30)
Karta: landing → sekcja **How it runs** → źródło **Fireflies transcript** → **Run the workflow**.

> „W codziennej pracy nikt nie wkleja tekstu. Po rozmowie transkrypcja trafia do n8n, a zespół dostaje gotowy deck
> z notatką. Teraz leci prawdziwy produkcyjny workflow na przykładowej rozmowie. Uczciwie: zapis do CRM i alert
> na Discordzie są tu zamockowane, oferta i PDF są prawdziwe.”

Po zakończeniu: **Open the deck** w karcie Discorda (jedno spojrzenie, bez przewijania).

### 5. Zmierzone (3:30–4:15), 25 pkt
Karta: landing → sekcja **Measured result**.

> „Te liczby nie są z prezentacji, tylko z wykonań produkcyjnego workflow, a skrypt `measure.mjs` w repo liczy je
> od nowa. Mediana 12 sekund zamiast około 3 godzin. Koszt AI 0,2 centa za ofertę. N decków, zero błędów.
> A tu zielona linia: wasze uruchomienie sprzed minuty, X sekund.”

Narrator podaje źródło baseline'u: dzisiejsza praca zespołu sprzedaży Gaius-Lex (listopad 2026).

### 6. Uruchom sam, używamy dalej (4:15–5:00), 20 + 15 pkt
Karta: GitHub → README, sekcja „Run it yourself in 5 minutes”.

> „Repo jest publiczne, na MIT. Dwie komendy: `git clone` i `./scripts/start.sh`. Skrypt pyta tylko o klucz
> OpenRouter, sam buduje stack, wypełnia bazy, publikuje workflow i robi dwie przykładowe oferty; w README są loginy
> i zrzuty ekranu. Sprawdziliśmy to na czystym klonie: pierwszy PDF po 2,5 minuty od `git clone`. To działa na naszym
> serwerze (Coolify) i na narzędziach, których zespół już używa, więc od poniedziałku tak robimy oferty.”

Zamknięcie, jedno zdanie: „Od rozmowy do oferty, która odpowiada na obawy tego klienta, w kilkanaście sekund
zamiast trzech godzin.”

## Pytania, które padną

| Pytanie | Odpowiedź |
|---|---|
| Czy AI zmyśla w ofercie? | Model pisze tylko z treści zgłoszenia i faktów o produkcie z Offer Studio. Walidator odrzuca pola spoza szablonu, przekroczone limity i złą liczbę elementów; po 3 próbach zostaje tekst domyślny, a handlowiec dostaje listę pominięć. Porównanie z narzędziem konkurencji pojawia się tylko, gdy klient sam je wymienił. |
| Dane klienta idą do zewnętrznego modelu? | Na demo tylko zanonimizowane rozmowy. Model to jeden parametr węzła OpenRouter w n8n; w produkcji podpinamy model hostowany w EOG albo lokalny (Gaius Vault). |
| Skąd 3 godziny? | Z obecnej pracy zespołu sprzedaży Gaius-Lex: rozmowa → notatki → wybór slajdów → przepisanie treści → PDF. |
| Co, jak zgłoszenie jest puste? | Dostaje ofertę domyślną (segment z domeny e-maila, rola champion), a notatka dla handlowca mówi, co dopytać. Pokazane w `sample-data/landing-role-only.json`. |
| Po polsku? | Wejście po polsku albo angielsku, deck po angielsku (taki jest szablon 2026). Notatka dla handlowca po polsku. |
| Ile to kosztuje w skali? | ~14 tys. tokenów na deck, ok. $0,002. 100 ofert miesięcznie to ok. 20 centów. |
| Co jest zamockowane? | Zapis do CRM i alert na Discordzie. Wszystko inne jest na produkcji. |
