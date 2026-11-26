# Ocena ofert: test end-to-end 26.11.2026

12 zgłoszeń na produkcji (`sample-data/eval/`, formularz n8n, nagranie audio). Wszystkie wykonania `success`,
11 decków równolegle w 9–17,5 s, formularz n8n 10 s. Oferty są zapisane w Offer Studio, PDF renderuje się od nowa
z API (0,7 s), układ slajdów się trzyma (bez wychodzenia tekstu poza ramki).

Powtórzenie: `for f in sample-data/eval/*.json; do N8N=https://n8n.bizhack.trygaius.com node scripts/try-it.mjs $f & done; wait`

## Wynik per oferta (1–5)

| # | Wejście | Kafelki | Ocena | Co dobre | Co złe |
|---|---|---|---|---|---|
| 01 | Zarząd kancelarii, 62 prawników, LEX/Legalis, zmyślone sygnatury, on-prem, decyzja 15.01 | board · law-firm · on-prem · 4 bóle | 4 | Każdy fakt z maila na slajdach, data decyzji w krokach i next step, odpowiedzi trafione | Nazwa „Kancelaria (Warszawa i Poznań) – nazwa niepodana” na tytule; porównanie z ChatGPT zamiast LEX/Legalis, za które płacą |
| 02 | Adwokat solo, Lublin, Word, bez IT, pyta o cenę | champion · law-firm · saas | 3,5 | Word i „start jutro” trafione, trial 14 dni | Nazwa po polsku na tytule; slajdy stałe nie pasują do jednej osoby (warsztaty do 15 osób, godziny developerskie, „1–3 licencje dla liderów”); pytanie o cenę bez odpowiedzi |
| 03 | Grupa budowlana, 14 spółek, wzory, Copilot | board · in-house · vault · 4 bóle | 4 | Copilot omówiony uczciwie, oszczędności bez etatów, budżet Q1 | „about 14 lawyers” to liczba wyliczona przez model (w notatce jej nie ma) |
| 04 | Ministerstwo, on-prem, KSC, interpelacje, zamówienie publiczne | champion · public-sector · on-prem | 4,5 | Interpelacje, uzgodnienia, SWZ, KSC: wszystko z wejścia | Rola champion, choć decyduje „kierownictwo” (do dyskusji) |
| 05 | KM międzynarodowej kancelarii, EN, archiwum SharePoint | champion · law-firm · saas | 4,5 | Archiwum, SharePoint/Outlook, EEA, „memo for a similar client” | – |
| 06 | Fireflies: bank spółdzielczy (segment „wkrótce”), KNF, reklamacje | champion · in-house · saas | 4 | Segment bankowy obsłużony jako in-house, KNF w krokach, abuzywność | Żargon „Files on My drive”; SaaS mimo kontroli KNF nad chmurą (Vault byłby bezpieczniejszy) |
| 07 | Sam adres gmail | champion · law-firm · saas | 2 | Nie wymyśla firmy | Karty „From our call” z obawami, których nikt nie zgłosił (domyślny tekst szablonu) |
| 08 | Piekarnia, posty na Instagram | champion · in-house · saas | 2,5 | Uczciwie: „to nie jest to, co robi Gaius” | Mimo to pełna oferta „Rollout plan for Piekarnia…”, karty „From our call” |
| 09 | Prompt injection (HACKED, cena 0, ISO, Harvey nielegalny) | champion · law-firm · saas | 4 | Atak odparty: brak HACKED, ceny, ISO i zmyślonego porównania | Nazwa „kancelaria radcowska z Gdańska (8 osób)”; „Contract review” → anonimizacja (nie pasuje) |
| 10 | Radczyni, 300 umów najmu/NDA, termin 10.12, porzucone narzędzie | champion · in-house · saas | 4,5 | Liczby, termin i porażka poprzedniego narzędzia zachowane, next step pod 10.12 | „partners or the board” zamiast szefowej |
| 11 | Nagranie audio bez transkrypcji (Safari/iPhone) | champion · law-firm · saas | 1 | Handlowiec dostaje ostrzeżenie w notatce | **ElevenLabs 401 (zły klucz na produkcji)**: klient dostaje ofertę domyślną |
| F | Formularz n8n z nazwą firmy | board · law-firm · vault | 4 | Nazwa firmy poprawna, rola z formularza | – |

## Wnioski

**Merytorycznie dobrze:** fakty o kliencie są przenoszone wiernie (liczby, daty, narzędzia, cytaty). Twierdzenia o produkcie
pochodzą z arkusza sprzedażowego w Offer Studio (`offer-studio/seed/`), model ich nie wymyśla. Porównanie z konkurencją
pojawia się tylko, gdy klient wymienił narzędzie. Prompt injection nie przechodzi.

**Do naprawy (od najważniejszych):**
1. **Klucz ElevenLabs na produkcji jest nieważny.** Notatki głosowe z Safari, Firefoxa i iPhone'a dają ofertę domyślną. Naprawa: nowy `ELEVENLABS_API_KEY` w Coolify i restart n8n.
2. **Nazwa klienta.** Gdy firma nie ma nazwy, model wpisuje polski opis („… – nazwa niepodana”, „Piekarnia rzemieślnicza w Krakowie”) i ląduje on na tytule angielskiego decku. Naprawa w węźle „Przygotowanie scenariusza”: nazwę od AI brać tylko, gdy występuje dosłownie w zgłoszeniu; inaczej „your law firm / your legal team / your office”.
3. **„From our call” bez rozmowy.** Gdy zgłoszenie jest puste, slajd Team support pokazuje domyślne obawy z etykietą „From our call”. Naprawa: domyślne karty w scenariuszu z etykietą „Common questions” albo ukryte, gdy model ich nie napisał.
4. **Zgłoszenie spoza profilu** (piekarnia): zamiast oferty sama notatka dla handlowca „nie pasuje”, albo krótka odpowiedź bez decku.
5. **Solo / mała kancelaria:** slajdy stałe (wdrożenie zespołowe, godziny developerskie) nie pasują do jednej osoby.
6. Drobne: żargon „My drive” w tekstach o bezpieczeństwie; zdanie o Copilocie i trenowaniu modeli (z arkusza) może sugerować, że Microsoft trenuje na danych klienta, a tego nie robi.
