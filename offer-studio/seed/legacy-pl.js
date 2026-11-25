// Seed data of the first, Polish version of Offer Studio, mapped to the English ids that replaced it.
// Used once per database by the legacy migration (src/server.js): databases created before the English
// translation still hold this content. The Polish text is kept here only to recognise unedited seed records;
// the migration saves a full backup before it changes anything. Generated from commit d59d4d4.

export const legacyPl = {
  "offers": {
    "gaius-vault-bazowa": "gaius-vault-base"
  },
  "componentSets": {
    "dlaczego": "why"
  },
  "frames": {
    "okladka": "cover",
    "problemy": "problems",
    "czym-jest": "what-is",
    "dlaczego": "why",
    "sygnaly": "signals",
    "wdrozenie": "rollout",
    "use-case": "use-case",
    "cennik": "pricing",
    "architektura": "architecture",
    "porownanie": "comparison",
    "kontakt": "contact"
  },
  "templateFrames": [
    "okladka",
    "problemy",
    "czym-jest",
    "dlaczego",
    "sygnaly",
    "wdrozenie",
    "use-case",
    "architektura",
    "porownanie",
    "kontakt",
    "cennik"
  ],
  "blocks": [
    {
      "id": "uc-pilne-pismo",
      "en": "uc-urgent-letter",
      "type": "use_case",
      "title": "Pilne pismo lub roszczenie",
      "body": "Gaius wyciąga tezy, luki, kontrargumenty i źródła do weryfikacji.",
      "data": {
        "effect": "szybsza reakcja i większa kontrola ryzyka."
      }
    },
    {
      "id": "uc-zmiana-prawa",
      "en": "uc-law-change",
      "type": "use_case",
      "title": "Zmiana prawa lub procedury",
      "body": "Gaius wskazuje dokumenty, wzory i procedury wymagające aktualizacji.",
      "data": {
        "effect": "większa kontrola compliance i mniej reaktywnego działania."
      }
    },
    {
      "id": "uc-dokument-przed-wysylka",
      "en": "uc-document-check",
      "type": "use_case",
      "title": "Dokument przed wysyłką",
      "body": "Gaius sprawdza cytowania, sygnatury, dane i zgodność z przyjętym standardem.",
      "data": {
        "effect": "mniejsze ryzyko błędu przed wysłaniem dokumentu do klienta, kontrahenta, sądu albo zarządu."
      }
    },
    {
      "id": "uc-umowa-do-podpisu",
      "en": "uc-contract-to-sign",
      "type": "use_case",
      "title": "Umowa do podpisu",
      "body": "Gaius wskazuje ryzyka, braki, niespójności i punkty negocjacyjne.",
      "data": {
        "effect": "krótszy czas akceptacji: podpisać, negocjować albo eskalować."
      }
    },
    {
      "id": "uc-powracajacy-temat",
      "en": "uc-recurring-topic",
      "type": "use_case",
      "title": "Powracający temat",
      "body": "Gaius odnajduje wcześniejsze opinie, wzory, klauzule i argumenty.",
      "data": {
        "effect": "mniej pracy od zera i lepsze wykorzystanie know-how organizacji."
      }
    },
    {
      "id": "uc-pytanie-od-biznesu",
      "en": "uc-business-question",
      "type": "use_case",
      "title": "Pytanie od biznesu",
      "body": "Gaius tworzy robocze memo: odpowiedź, podstawa, ryzyka, warianty i rekomendacja.",
      "data": {
        "effect": "mniej czekania na decyzję i bardziej przejrzysta komunikacja prawna."
      }
    },
    {
      "id": "pr-research-od-nowa",
      "en": "pr-research-from-scratch",
      "type": "problem",
      "title": "Research zaczynany od nowa",
      "body": "Źródła, argumenty i podstawy prawne są odtwarzane za każdym razem.",
      "data": {}
    },
    {
      "id": "pr-analizy-powtarzane",
      "en": "pr-repeated-analyses",
      "type": "problem",
      "title": "Analizy powtarzane przez różne osoby",
      "body": "Podobne pytania wracają, ale odpowiedzi nie zawsze korzystają z wcześniejszej pracy.",
      "data": {}
    },
    {
      "id": "pr-know-how-ukryte",
      "en": "pr-hidden-know-how",
      "type": "problem",
      "title": "Know-how ukryte w folderach i mailach",
      "body": "Opinie, wzory i klauzule istnieją, ale nie są aktywnie wykorzystywane.",
      "data": {}
    },
    {
      "id": "pr-praca-odtworcza",
      "en": "pr-repetitive-work",
      "type": "problem",
      "title": "Eksperci zajęci pracą odtwórczą",
      "body": "Czas seniorów trafia na zadania, które można ustandaryzować.",
      "data": {}
    },
    {
      "id": "pr-ai-bez-zasad",
      "en": "pr-ai-without-rules",
      "type": "problem",
      "title": "AI używane bez wspólnych zasad",
      "body": "Brakuje jednego standardu promptów, źródeł, weryfikacji i odpowiedzialności.",
      "data": {}
    },
    {
      "id": "pl-prywatne-srodowisko",
      "en": "pl-private-environment",
      "type": "pillar",
      "title": "Prywatne środowisko pracy",
      "body": "Vault działa w środowisku kontrolowanym przez organizację — bez traktowania dokumentów prawnych jak materiału dla publicznego chatbota.",
      "data": {}
    },
    {
      "id": "pl-odpowiedzi-ze-zrodlami",
      "en": "pl-sourced-answers",
      "type": "pillar",
      "title": "Odpowiedzi ze źródłami",
      "body": "Odpowiedzi prowadzą do podstaw: przepisów, orzeczeń, cytatów, sygnatur i dokumentów, które prawnik może zweryfikować.",
      "data": {}
    },
    {
      "id": "pl-standard-pracy",
      "en": "pl-team-standard",
      "type": "pillar",
      "title": "Standard pracy zespołu",
      "body": "Powtarzalne zadania zamieniamy w rutyny, checklisty i workflowy, z których korzysta cały zespół.",
      "data": {}
    },
    {
      "id": "df-prywatne-legal-ai",
      "en": "df-private-legal-ai",
      "type": "differentiator",
      "title": "Prywatne Legal AI na realnych dokumentach",
      "body": "Vault może działać lokalnie i pod kontrolą organizacji, zgodnie z wymaganiami IT, compliance i zespołu prawnego.",
      "data": {}
    },
    {
      "id": "df-jedno-srodowisko",
      "en": "df-one-environment",
      "type": "differentiator",
      "title": "Prawo, orzecznictwo i dokumenty w jednym środowisku",
      "body": "Gaius Vault łączy źródła prawne z dokumentami organizacji, dzięki czemu AI pracuje na rzeczywistym kontekście spraw.",
      "data": {}
    },
    {
      "id": "df-wdrozenie-rutyna",
      "en": "df-rollout-routine",
      "type": "differentiator",
      "title": "Wdrożenie, które kończy się rutyną pracy",
      "body": "Vault nie kończy się na uruchomieniu dostępu. Warsztaty i Legal Engineering zamieniają procesy w workflowy, checklisty i rutyny.",
      "data": {}
    },
    {
      "id": "df-bez-blokady",
      "en": "df-no-lock-in",
      "type": "differentiator",
      "title": "Skalowanie bez blokady licencyjnej",
      "body": "Organizacja nie płaci osobno za każdego użytkownika ani każdą przestrzeń roboczą. Parametry techniczne środowiska dobieramy do skali wdrożenia.",
      "data": {}
    },
    {
      "id": "df-jedna-usluga",
      "en": "df-one-service",
      "type": "differentiator",
      "title": "Jedna usługa",
      "body": "W ramach jednej licencji organizacja otrzymuje technologię, źródła, pracę na dokumentach, warsztaty, Legal Engineering i rozwój standardu pracy.",
      "data": {}
    },
    {
      "id": "df-bezpieczny-start",
      "en": "df-safe-start",
      "type": "differentiator",
      "title": "Bezpieczny model startu",
      "body": "Stały koszt miesięczny, gwarancja ceny i opcjonalny 3-miesięczny POC z możliwością rezygnacji ograniczają ryzyko decyzji.",
      "data": {}
    },
    {
      "id": "sg-szybsze-odpowiedzi",
      "en": "sg-faster-answers",
      "type": "signal",
      "title": "Szybsze odpowiedzi dla biznesu",
      "body": "Dział prawny ma wspierać decyzje szybciej, bez obniżania jakości.",
      "data": {}
    },
    {
      "id": "sg-wiecej-dokumentow",
      "en": "sg-more-documents",
      "type": "signal",
      "title": "Więcej dokumentów i źródeł",
      "body": "Umowy, pisma i materiały prawne wymagają coraz więcej selekcji i analizy.",
      "data": {}
    },
    {
      "id": "sg-wiedza-trudna",
      "en": "sg-hard-to-reuse",
      "type": "signal",
      "title": "Wiedza trudna do ponownego użycia",
      "body": "Poprzednie opinie i wzory istnieją, ale nie zawsze łatwo je wykorzystać w kolejnych sprawach.",
      "data": {}
    },
    {
      "id": "sg-powtarzalne-zadania",
      "en": "sg-repetitive-tasks",
      "type": "signal",
      "title": "Powtarzalne zadania zabierają czas ekspertów",
      "body": "Te same typy analiz, researchu i kontroli wracają w kolejnych sprawach.",
      "data": {}
    },
    {
      "id": "st-procesy",
      "en": "st-processes",
      "type": "step",
      "title": "Wybieramy procesy o największym wpływie",
      "body": "Identyfikujemy pytania, dokumenty i analizy, które wracają najczęściej.",
      "data": {}
    },
    {
      "id": "st-realne-sprawy",
      "en": "st-real-matters",
      "type": "step",
      "title": "Pracujemy na realnych sprawach",
      "body": "Warsztat opieramy na dokumentach, pytaniach i standardach zespołu.",
      "data": {}
    },
    {
      "id": "st-rutyny",
      "en": "st-routines",
      "type": "step",
      "title": "Budujemy rutyny",
      "body": "Zamieniamy procesy w workflowy, checklisty, prompty i wzorce odpowiedzi.",
      "data": {}
    },
    {
      "id": "st-weryfikacja",
      "en": "st-verification",
      "type": "step",
      "title": "Ustalamy zasady weryfikacji",
      "body": "Określamy, jak sprawdzane są źródła, cytaty, ryzyka i odpowiedzialność.",
      "data": {}
    },
    {
      "id": "st-adopcja",
      "en": "st-adoption",
      "type": "step",
      "title": "Mierzymy adopcję i skalujemy",
      "body": "Sprawdzamy użycie, zbieramy feedback i wybieramy kolejne procesy.",
      "data": {}
    },
    {
      "id": "cmp-dane",
      "en": "cmp-data",
      "type": "comparison",
      "title": "Dane i dokumenty",
      "body": "",
      "data": {
        "them": "wymagają polityk, integracji i ograniczeń użycia",
        "us": "prywatne środowisko do pracy na dokumentach prawnych"
      }
    },
    {
      "id": "cmp-zrodla",
      "en": "cmp-sources",
      "type": "comparison",
      "title": "Źródła prawne",
      "body": "",
      "data": {
        "them": "często osobno od AI i dokumentów klienta",
        "us": "prawo, orzecznictwo i dokumenty w jednym miejscu"
      }
    },
    {
      "id": "cmp-weryfikacja",
      "en": "cmp-verification",
      "type": "comparison",
      "title": "Weryfikacja",
      "body": "",
      "data": {
        "them": "kontrola cytowań i podstaw zostaje po stronie użytkownika",
        "us": "odpowiedzi prowadzą do źródeł, sygnatur i dokumentów"
      }
    },
    {
      "id": "cmp-wiedza",
      "en": "cmp-knowledge",
      "type": "comparison",
      "title": "Wiedza organizacji",
      "body": "",
      "data": {
        "them": "foldery, DMS, SharePoint, maile",
        "us": "aktywna baza opinii, pism, wzorów i analiz"
      }
    },
    {
      "id": "cmp-wdrozenie",
      "en": "cmp-rollout",
      "type": "comparison",
      "title": "Wdrożenie",
      "body": "",
      "data": {
        "them": "szkolenia i adopcja po stronie klienta",
        "us": "warsztaty + Legal Engineer + rutyny pracy"
      }
    },
    {
      "id": "cmp-skalowanie",
      "en": "cmp-scaling",
      "type": "comparison",
      "title": "Skalowanie",
      "body": "",
      "data": {
        "them": "kolejne licencje, moduły i integracje",
        "us": "jedna licencja, brak limitów po stronie użytkowników i plików"
      }
    },
    {
      "id": "cmp-word",
      "en": "cmp-word",
      "type": "comparison",
      "title": "Wtyczka do Word",
      "body": "",
      "data": {
        "them": "kolejna licencja",
        "us": "w cenie"
      }
    },
    {
      "id": "pkg-technologia",
      "en": "pkg-technology",
      "type": "package",
      "title": "Technologia Gaius-Lex",
      "body": "- research prawny\n- analiza dokumentów\n- źródła i cytowania\n- baza wiedzy\n- rutyny pracy\n- aktualne prawo i orzecznictwo",
      "data": {}
    },
    {
      "id": "pkg-srodowisko",
      "en": "pkg-environment",
      "type": "package",
      "title": "Prywatne środowisko Vault",
      "body": "- lokalne i kontrolowane środowisko pracy\n- brak limitu po stronie licencji\n- sprzęt i konfiguracja środowiska u klienta\n- dostosowanie do potrzeb wdrożenia",
      "data": {}
    },
    {
      "id": "pkg-legal-engineering",
      "en": "pkg-legal-engineering",
      "type": "package",
      "title": "Legal Engineering i adopcja",
      "body": "- 5 h warsztatów miesięcznie\n- 10 h pracy Legal Engineera miesięcznie\n- rozwój rutyn i standardów pracy\n- rekomendacje kolejnych procesów",
      "data": {}
    },
    {
      "id": "person-janusz",
      "en": "person-janusz",
      "type": "person",
      "title": "Janusz Marszałek",
      "body": "",
      "data": {
        "role": "Co-founder & Dyrektor Operacyjny",
        "email": "januszmarszalek@gaius-lex.pl",
        "phone": "+48 579 122 689"
      }
    }
  ],
  "components": [
    {
      "id": "dlaczego/prywatne-legal-ai",
      "en": "why/private-legal-ai",
      "title": "Prywatne Legal AI na realnych dokumentach",
      "description": "Bezpieczeństwo i kontrola: Vault działa lokalnie, pod kontrolą IT i compliance. Ikona: baza danych z kłódką.",
      "use_when": "Klient pracuje na poufnych dokumentach (tajemnica adwokacka, dane osobowe, M&A), ma wymagający dział IT/bezpieczeństwa albo boi się publicznych chatbotów.",
      "avoid_when": "Klient ma już jasno ustalone wdrożenie on-premise: wtedy lepsza jest karta on-premise."
    },
    {
      "id": "dlaczego/jedno-srodowisko",
      "en": "why/one-environment",
      "title": "Prawo, orzecznictwo i dokumenty w jednym środowisku",
      "description": "Źródła prawne i dokumenty organizacji w jednym miejscu, AI pracuje na kontekście spraw. Ikona: folder z lupą.",
      "use_when": "Klient dziś skacze między LEX/Legalis, DMS-em i ChatGPT; dużo researchu i pracy na własnych dokumentach.",
      "avoid_when": ""
    },
    {
      "id": "dlaczego/wdrozenie-rutyna",
      "en": "why/rollout-routine",
      "title": "Wdrożenie, które kończy się rutyną pracy",
      "description": "Adopcja: warsztaty i Legal Engineering zamieniają procesy w workflowy i checklisty. Ikona: warstwy.",
      "use_when": "Klient miał już nieudane wdrożenie narzędzia AI, zespół jest sceptyczny albo zarząd pyta o realne wykorzystanie.",
      "avoid_when": ""
    },
    {
      "id": "dlaczego/bez-blokady",
      "en": "why/no-lock-in",
      "title": "Skalowanie bez blokady licencyjnej",
      "description": "Brak opłat za użytkownika i przestrzeń roboczą. Ikona: osoba z plusem.",
      "use_when": "Duży zespół (kilkadziesiąt+ prawników), plan rozszerzenia na kolejne działy, porównanie z narzędziami licencjonowanymi per seat.",
      "avoid_when": "Mała kancelaria (kilka osób): argument licencyjny jest słaby."
    },
    {
      "id": "dlaczego/jedna-usluga",
      "en": "why/one-service",
      "title": "Jedna usługa",
      "description": "Jedna licencja obejmuje technologię, źródła, warsztaty, Legal Engineering i rozwój standardu. Ikona: schowek z ptaszkiem.",
      "use_when": "Klient nie chce składać rozwiązania z wielu dostawców, ma ograniczony zespół IT albo zakupy wolą jedną umowę.",
      "avoid_when": ""
    },
    {
      "id": "dlaczego/bezpieczny-start",
      "en": "why/safe-start",
      "title": "Bezpieczny model startu",
      "description": "Stały koszt miesięczny, gwarancja ceny i opcjonalny 3-miesięczny POC z możliwością rezygnacji. Ikona: kalkulator.",
      "use_when": "Klient waha się, ma ograniczony budżet albo decyzję podejmuje zarząd/finanse.",
      "avoid_when": "Na slajdzie jest już karta „Pilotaż bez ryzyka” (ten sam argument)."
    },
    {
      "id": "dlaczego/odpowiedzi-ze-zrodlami",
      "en": "why/sourced-answers",
      "title": "Odpowiedzi, które da się sprawdzić",
      "description": "Weryfikowalność: każda odpowiedź prowadzi do przepisu, orzeczenia, cytatu albo dokumentu. Ikona: folder z lupą.",
      "use_when": "Kancelaria procesowa, sporo pism do sądu, klient boi się halucynacji AI albo pyta o odpowiedzialność za błędy.",
      "avoid_when": ""
    },
    {
      "id": "dlaczego/know-how-organizacji",
      "en": "why/organization-know-how",
      "title": "Know-how pracuje przy każdej sprawie",
      "description": "Wykorzystanie wcześniejszych opinii, pism i wzorów. Ikona: warstwy.",
      "use_when": "Duża kancelaria albo dział prawny z latami archiwum; problem „wynajdujemy koło na nowo”, rotacja prawników.",
      "avoid_when": "Młoda organizacja bez archiwum dokumentów."
    },
    {
      "id": "dlaczego/on-premise",
      "en": "why/on-premise",
      "title": "On-premise albo model hybrydowy",
      "description": "Środowisko w infrastrukturze klienta, bez publicznej chmury. Ikona: baza danych z kłódką.",
      "use_when": "Bank, ubezpieczyciel, sektor publiczny, energetyka, klient regulowany (KNF, KSC/NIS2) albo z zakazem chmury.",
      "avoid_when": "Klient nie ma własnej infrastruktury i woli usługę zarządzaną."
    },
    {
      "id": "dlaczego/prywatne-legal-ai-wyroznienie",
      "en": "why/private-legal-ai-highlight",
      "title": "Prywatne Legal AI na realnych dokumentach (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Bezpieczeństwo i kontrola: Vault działa lokalnie, pod kontrolą IT i compliance. Ikona: baza danych z kłódką.",
      "use_when": "Najważniejszy argument dla tego klienta. Klient pracuje na poufnych dokumentach (tajemnica adwokacka, dane osobowe, M&A), ma wymagający dział IT/bezpieczeństwa albo boi się publicznych chatbotów.",
      "avoid_when": "Klient ma już jasno ustalone wdrożenie on-premise: wtedy lepsza jest karta on-premise."
    },
    {
      "id": "dlaczego/jedno-srodowisko-wyroznienie",
      "en": "why/one-environment-highlight",
      "title": "Prawo, orzecznictwo i dokumenty w jednym środowisku (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Źródła prawne i dokumenty organizacji w jednym miejscu, AI pracuje na kontekście spraw. Ikona: folder z lupą.",
      "use_when": "Najważniejszy argument dla tego klienta. Klient dziś skacze między LEX/Legalis, DMS-em i ChatGPT; dużo researchu i pracy na własnych dokumentach.",
      "avoid_when": ""
    },
    {
      "id": "dlaczego/wdrozenie-rutyna-wyroznienie",
      "en": "why/rollout-routine-highlight",
      "title": "Wdrożenie, które kończy się rutyną pracy (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Adopcja: warsztaty i Legal Engineering zamieniają procesy w workflowy i checklisty. Ikona: warstwy.",
      "use_when": "Najważniejszy argument dla tego klienta. Klient miał już nieudane wdrożenie narzędzia AI, zespół jest sceptyczny albo zarząd pyta o realne wykorzystanie.",
      "avoid_when": ""
    },
    {
      "id": "dlaczego/bez-blokady-wyroznienie",
      "en": "why/no-lock-in-highlight",
      "title": "Skalowanie bez blokady licencyjnej (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Brak opłat za użytkownika i przestrzeń roboczą. Ikona: osoba z plusem.",
      "use_when": "Najważniejszy argument dla tego klienta. Duży zespół (kilkadziesiąt+ prawników), plan rozszerzenia na kolejne działy, porównanie z narzędziami licencjonowanymi per seat.",
      "avoid_when": "Mała kancelaria (kilka osób): argument licencyjny jest słaby."
    },
    {
      "id": "dlaczego/jedna-usluga-wyroznienie",
      "en": "why/one-service-highlight",
      "title": "Jedna usługa (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Jedna licencja obejmuje technologię, źródła, warsztaty, Legal Engineering i rozwój standardu. Ikona: schowek z ptaszkiem.",
      "use_when": "Najważniejszy argument dla tego klienta. Klient nie chce składać rozwiązania z wielu dostawców, ma ograniczony zespół IT albo zakupy wolą jedną umowę.",
      "avoid_when": ""
    },
    {
      "id": "dlaczego/bezpieczny-start-wyroznienie",
      "en": "why/safe-start-highlight",
      "title": "Bezpieczny model startu (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Stały koszt miesięczny, gwarancja ceny i opcjonalny 3-miesięczny POC z możliwością rezygnacji. Ikona: kalkulator.",
      "use_when": "Najważniejszy argument dla tego klienta. Klient waha się, ma ograniczony budżet albo decyzję podejmuje zarząd/finanse.",
      "avoid_when": "Na slajdzie jest już karta „Pilotaż bez ryzyka” (ten sam argument)."
    },
    {
      "id": "dlaczego/odpowiedzi-ze-zrodlami-wyroznienie",
      "en": "why/sourced-answers-highlight",
      "title": "Odpowiedzi, które da się sprawdzić (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Weryfikowalność: każda odpowiedź prowadzi do przepisu, orzeczenia, cytatu albo dokumentu. Ikona: folder z lupą.",
      "use_when": "Najważniejszy argument dla tego klienta. Kancelaria procesowa, sporo pism do sądu, klient boi się halucynacji AI albo pyta o odpowiedzialność za błędy.",
      "avoid_when": ""
    },
    {
      "id": "dlaczego/know-how-organizacji-wyroznienie",
      "en": "why/organization-know-how-highlight",
      "title": "Know-how pracuje przy każdej sprawie (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Wykorzystanie wcześniejszych opinii, pism i wzorów. Ikona: warstwy.",
      "use_when": "Najważniejszy argument dla tego klienta. Duża kancelaria albo dział prawny z latami archiwum; problem „wynajdujemy koło na nowo”, rotacja prawników.",
      "avoid_when": "Młoda organizacja bez archiwum dokumentów."
    },
    {
      "id": "dlaczego/on-premise-wyroznienie",
      "en": "why/on-premise-highlight",
      "title": "On-premise albo model hybrydowy (wyróżnienie)",
      "description": "Zielona, wyróżniona wersja karty. Środowisko w infrastrukturze klienta, bez publicznej chmury. Ikona: baza danych z kłódką.",
      "use_when": "Najważniejszy argument dla tego klienta. Bank, ubezpieczyciel, sektor publiczny, energetyka, klient regulowany (KNF, KSC/NIS2) albo z zakazem chmury.",
      "avoid_when": "Klient nie ma własnej infrastruktury i woli usługę zarządzaną."
    },
    {
      "id": "dlaczego/pilotaz-3-miesiace",
      "en": "why/pilot-3-months",
      "title": "Pilotaż bez ryzyka (3 mies.)",
      "description": "Karta z dużą liczbą „3 mies.” zamiast ikony: pilotaż na realnych sprawach z możliwością rezygnacji.",
      "use_when": "Klient chce najpierw sprawdzić narzędzie, rozmowa jest na etapie pilotażu, decyzja wymaga dowodu efektów.",
      "avoid_when": "Na slajdzie jest już karta „Bezpieczny model startu” (ten sam temat)."
    }
  ],
  "slides": [
    {
      "id": "s-okladka",
      "en": "s-cover",
      "frame": "okladka",
      "data": {
        "title": "Gaius Vault",
        "subtitle": "Legal AI, które możesz dopuścić **do realnej pracy prawnej**",
        "lead": "Prywatne Legal AI do pracy na realnych dokumentach - lokalnie, w jednej licencji, pod kontrolą organizacji."
      }
    },
    {
      "id": "s-problem",
      "en": "s-problem",
      "frame": "problemy",
      "data": {
        "title": "Gdzie **ucieka** czas działu prawnego?",
        "lead": "Najwięcej kosztuje nie sama analiza, ale każdorazowe odtwarzanie drogi do odpowiedzi.",
        "note": "Problemem nie jest liczba spraw. Problemem jest powtarzanie tej samej drogi do odpowiedzi."
      }
    },
    {
      "id": "s-czym-jest",
      "en": "s-what-is",
      "frame": "czym-jest",
      "data": {
        "title": "Czym jest ",
        "title_accent": "Vault?",
        "lead": "Prywatne środowisko Legal AI, które łączy źródła prawne, dokumenty organizacji i standard pracy zespołu."
      }
    },
    {
      "id": "s-dlaczego",
      "en": "s-why",
      "frame": "dlaczego",
      "data": {
        "title": "Dlaczego ",
        "title_accent": "Vault?",
        "lead": "Gaius Vault łączy technologię, źródła, dokumenty, wdrożenie i adopcję w jednym modelu."
      }
    },
    {
      "id": "s-sygnaly",
      "en": "s-signals",
      "frame": "sygnaly",
      "data": {
        "title": "Sygnał, że dział prawny jest",
        "title_2": "gotowy na",
        "title_accent": "Vault?",
        "lead": "Nie chodzi o samą technologię. Chodzi o moment, w którym Legal AI powinno stać się standardem pracy zespołu.",
        "note": "Gaius Vault pomaga zamienić te sygnały w plan wdrożenia: procesy, rutyny i mierzalny efekt."
      }
    },
    {
      "id": "s-wdrozenie",
      "en": "s-rollout",
      "frame": "wdrozenie",
      "data": {
        "quote": "Nie wdrażamy dostępu.\nWdrażamy sposób pracy.",
        "quote_lead": "Dlatego Vault obejmuje nie tylko technologię, ale też proces, rutyny i zasady odpowiedzialności."
      }
    },
    {
      "id": "s-use-case",
      "en": "s-use-case",
      "frame": "use-case",
      "data": {
        "title": "Vault w codziennej praktyce",
        "lead": "Gaius Vault zamienia najczęstsze punkty styku biznesu z działem prawnym w powtarzalne rutyny: od akceptacji umów, przez reakcję na spór, po wykorzystanie wcześniejszych opinii i standardów."
      }
    },
    {
      "id": "s-cennik",
      "en": "s-pricing",
      "frame": "cennik",
      "data": {
        "title": "Co wchodzi w skład",
        "title_accent": "Vault?",
        "lead": "Organizacja kupuje nie tylko narzędzie AI, ale wdrożony standard pracy: technologię, środowisko, rutyny i wsparcie adopcji.",
        "price_label": "Koszt abonamentu",
        "price_note": "netto",
        "lines": "Koszt realizacji warsztatów | w cenie abonamentu\nKoszt szkolenia | w cenie abonamentu\nKoszt sprzętu | w cenie abonamentu"
      }
    },
    {
      "id": "s-architektura",
      "en": "s-architecture",
      "frame": "architektura",
      "data": {}
    },
    {
      "id": "s-porownanie",
      "en": "s-comparison",
      "frame": "porownanie",
      "data": {
        "title": "Gaius vs składanie Legal AI z kilku narzędzi",
        "lead": "Większość rozwiązań rozwiązuje jeden fragment problemu. Gaius Vault dostarcza kompletny standard pracy prawnej z AI — w ramach jednej licencji.",
        "col_area": "Obszar",
        "col_them": "Kilka narzędzi AI / LegalTech",
        "col_us": "Gaius Vault"
      }
    },
    {
      "id": "s-kontakt",
      "en": "s-contact",
      "frame": "kontakt",
      "data": {
        "kicker": "ZACZNIJMY WSPÓŁPRACĘ",
        "title": "Bezpieczne Legal AI w Twojej organizacji",
        "text": "Jeśli chcesz przyspieszyć research prawny, lepiej kontrolować ryzyka i bezpiecznie wykorzystać AI w swojej firmie, zostaw nam kontakt. Krótka rozmowa wystarczy, żebyśmy zrozumieli specyfikę Twojej organizacji i zaproponowali sensowny zakres pilotażu — od bezpiecznego wdrożenia testowego po pełne wdrożenie on-premise lub model hybrydowy."
      }
    }
  ]
};
