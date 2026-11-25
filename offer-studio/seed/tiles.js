// Kafelki (rola, segment, ból, produkt), bloki rozwiązań z zakładki PRKW i przypięcia treści do kafelków.
// Źródło: arkusz „Gaius Work Templates.xlsx” (zakładki „Bóle (Fireflies)” i „PRKW”), przepisany jednorazowo.
// Przypięcia bólów i segmentów do treści to wstępna propozycja: poprawia się je w zakładce Kafelki.
// Plik generuje skrypt; poprawki rób w aplikacji albo tutaj ręcznie.

export const tiles = [
  {
    "id": "rola:champion",
    "category": "rola",
    "label": "Champion",
    "description": "Zajawiona osoba w zespole, która wprowadza Gaius i musi przekonać kolegów.",
    "quotes": [],
    "status": "active",
    "position": 0,
    "data": {}
  },
  {
    "id": "rola:zarzad",
    "category": "rola",
    "label": "Zarząd",
    "description": "Zarząd, partner zarządzający albo dyrektor, który podpisuje decyzję i budżet.",
    "quotes": [],
    "status": "active",
    "position": 1,
    "data": {}
  },
  {
    "id": "rola:cto",
    "category": "rola",
    "label": "CTO / CIO / CISO",
    "description": "Zgoda techniczna: architektura, bezpieczeństwo, wdrożenie.",
    "quotes": [],
    "status": "soon",
    "position": 10,
    "data": {}
  },
  {
    "id": "rola:gc",
    "category": "rola",
    "label": "Dyrektor prawny / GC",
    "description": "Sponsor po stronie działu prawnego.",
    "quotes": [],
    "status": "soon",
    "position": 11,
    "data": {}
  },
  {
    "id": "rola:budzet",
    "category": "rola",
    "label": "Właściciel budżetu",
    "description": "Zwrot z inwestycji i przewidywalny koszt.",
    "quotes": [],
    "status": "soon",
    "position": 12,
    "data": {}
  },
  {
    "id": "rola:dpo",
    "category": "rola",
    "label": "DPO / compliance",
    "description": "Dane osobowe i zgodność z regulacjami.",
    "quotes": [],
    "status": "soon",
    "position": 13,
    "data": {}
  },
  {
    "id": "segment:kancelaria",
    "category": "segment",
    "label": "Kancelaria",
    "description": "Kancelaria prawna, od małej po dużą.",
    "quotes": [],
    "status": "active",
    "position": 0,
    "data": {}
  },
  {
    "id": "segment:in-house",
    "category": "segment",
    "label": "Dział prawny in-house",
    "description": "Dział prawny w firmie albo grupie kapitałowej.",
    "quotes": [],
    "status": "active",
    "position": 1,
    "data": {}
  },
  {
    "id": "segment:administracja",
    "category": "segment",
    "label": "Administracja publiczna",
    "description": "Urzędy, uczelnie, spółki komunalne, sądy.",
    "quotes": [],
    "status": "active",
    "position": 2,
    "data": {}
  },
  {
    "id": "segment:finanse",
    "category": "segment",
    "label": "Banki i finanse",
    "description": "Banki spółdzielcze, ubezpieczenia, leasing, fintech.",
    "quotes": [],
    "status": "soon",
    "position": 3,
    "data": {}
  },
  {
    "id": "segment:doradcy",
    "category": "segment",
    "label": "Doradcy podatkowi",
    "description": "Biura i działy podatkowe.",
    "quotes": [],
    "status": "soon",
    "position": 4,
    "data": {}
  },
  {
    "id": "segment:notariusze",
    "category": "segment",
    "label": "Notariusze",
    "description": "Kancelarie notarialne.",
    "quotes": [],
    "status": "soon",
    "position": 5,
    "data": {}
  },
  {
    "id": "segment:masowe",
    "category": "segment",
    "label": "Kancelarie masowe i windykacja",
    "description": "Setki lub tysiące podobnych spraw, komornicy.",
    "quotes": [],
    "status": "soon",
    "position": 6,
    "data": {}
  },
  {
    "id": "bol:poufnosc",
    "category": "bol",
    "label": "Poufność",
    "description": "Umowy i know-how nie mogą wyjść poza firmę.",
    "quotes": [
      "działy prawne są coraz bardziej świadome… własnego know-how… na własnej infrastrukturze",
      "tajemnice przedsiębiorstwa… żeby… model… nie nauczył się na tych danych",
      "polskie, lokalne i mamy na tym kontrolę"
    ],
    "status": "active",
    "position": 0,
    "data": {}
  },
  {
    "id": "bol:shadow-ai",
    "category": "bol",
    "label": "Shadow AI",
    "description": "Ludzie i tak wklejają dokumenty do darmowych czatów, a firma nie ma nad tym kontroli.",
    "quotes": [
      "wiem, że i tak będą wrzucać",
      "część ludzi korzysta z narzędzi AI… na prywatnych telefonach czy kontach e-mailowych",
      "mając dzisiaj dostęp tylko do zewnętrznych narzędzi, nawet nie jesteśmy w stanie uregulować tego"
    ],
    "status": "active",
    "position": 1,
    "data": {}
  },
  {
    "id": "bol:powtarzalne-dokumenty",
    "category": "bol",
    "label": "Powtarzalne dokumenty",
    "description": "NDA, umowy powierzenia i te same pisma przygotowywane od zera.",
    "quotes": [
      "oczekiwań… od zarządu… powtarzalnych czynności… niezliczoną ilość NDA-ek",
      "NDA… umowy powierzenia… klasyczne kejsy… bardzo często",
      "nie samemu nie przeszukiwać, nie pisać za każdym razem tego samego"
    ],
    "status": "active",
    "position": 2,
    "data": {}
  },
  {
    "id": "bol:presja-zarzadu",
    "category": "bol",
    "label": "Presja zarządu",
    "description": "Więcej pracy bez nowych etatów i oczekiwanie zwrotu z AI.",
    "quotes": [
      "ograniczyć liczbę prawników niż ją zwiększyć",
      "dużo firm szuka zwrotu z inwestycji w AI"
    ],
    "status": "active",
    "position": 3,
    "data": {}
  },
  {
    "id": "bol:chatgpt-tylko-informacja",
    "category": "bol",
    "label": "ChatGPT tylko informuje",
    "description": "Ogólne AI daje informację, ale nie pomaga tworzyć i sprawdzać dokumentów.",
    "quotes": [
      "czat GPT… tylko daje informację… chcielibyśmy… coś, co nam pomoże tworzyć dokumenty"
    ],
    "status": "active",
    "position": 4,
    "data": {}
  },
  {
    "id": "bol:zmyslone-orzeczenia",
    "category": "bol",
    "label": "Zmyślone orzeczenia",
    "description": "Ogólne AI zmyśla orzeczenia i przepisy, więc wszystko trzeba sprawdzać.",
    "quotes": [
      "pięć zaproponowanych orzeczeń, trzy nie istniały, a dwa nie dotyczyły danej sprawy",
      "Numery przepisów są nieprawidłowo podawane, łącznie z takimi, których nie ma w danym akcie",
      "Cały czas zmyśla… nigdy temu narzędziu się nie ufa"
    ],
    "status": "active",
    "position": 5,
    "data": {}
  },
  {
    "id": "bol:archiwum",
    "category": "bol",
    "label": "Archiwum nie do przeszukania",
    "description": "Opinie, umowy i maile leżą na dysku, w SharePoincie i Outlooku, a szuka się ich po nazwach plików.",
    "quotes": [
      "szukamy sobie po naszym dysku i po nazwach najczęściej",
      "szukaj po Windowsie… to jest bzdura… nic po prostu nie można znaleźć",
      "Z Outlookiem niestety problem… archiwum… on i tak go nie indeksuje"
    ],
    "status": "active",
    "position": 6,
    "data": {}
  },
  {
    "id": "bol:kopiowanie-do-worda",
    "category": "bol",
    "label": "Kopiowanie do Worda",
    "description": "Tekst z czatu trzeba przenosić do Worda i ręcznie formatować.",
    "quotes": [
      "to ciągle bazowało na jednak czacie i potem… muszę wrzucić do Worda… i sformatować",
      "formatowanie zajmuje mi na tyle dużo czasu"
    ],
    "status": "active",
    "position": 7,
    "data": {}
  },
  {
    "id": "bol:skala-grupy",
    "category": "bol",
    "label": "Skala w grupach kapitałowych",
    "description": "Wiele spółek i zespołów prawnych, a dokumenty trzeba obsłużyć jednym standardem.",
    "quotes": [
      "załadowani plikami w dużej ilości… prawie 500 [spółek]… musimy to zrobić dla 500 spółek"
    ],
    "status": "active",
    "position": 8,
    "data": {}
  },
  {
    "id": "bol:szablony-w-skali",
    "category": "bol",
    "label": "Szablony w skali",
    "description": "Dobre szablony istnieją, ale trzeba je ręcznie wypełniać danymi z setek spraw.",
    "quotes": [
      "problemem jest… skala… te szablony są dobrze przygotowane, natomiast je trzeba wypełnić odpowiednimi danymi",
      "kopiują treść skargi, wklejają… do nakładki gaius… wklejają do pisma"
    ],
    "status": "active",
    "position": 9,
    "data": {}
  },
  {
    "id": "bol:wyszukiwanie-orzecznictwa",
    "category": "bol",
    "label": "Słabe wyszukiwanie orzecznictwa",
    "description": "W LEX i Legalis często brakuje orzeczeń albo trudno je znaleźć.",
    "quotes": [
      "często na Legalisie czy [Leksie] brak jest po prostu orzeczeń",
      "dużo słabsze niż oczekiwałem"
    ],
    "status": "active",
    "position": 10,
    "data": {}
  },
  {
    "id": "produkt:saas",
    "category": "produkt",
    "label": "SaaS",
    "description": "Gaius w chmurze, plany lite, standard i pro.",
    "quotes": [],
    "status": "active",
    "position": 0,
    "data": {
      "price": ""
    }
  },
  {
    "id": "produkt:vault",
    "category": "produkt",
    "label": "Vault",
    "description": "Prywatne środowisko Gaius Vault dla działu albo kancelarii.",
    "quotes": [],
    "status": "active",
    "position": 1,
    "data": {
      "price": ""
    }
  },
  {
    "id": "produkt:on-prem",
    "category": "produkt",
    "label": "On-premise",
    "description": "Vault w infrastrukturze klienta, bez publicznej chmury.",
    "quotes": [],
    "status": "active",
    "position": 2,
    "data": {
      "price": ""
    }
  }
];

export const solutionBlocks = [
  {
    "id": "rz-zrodla",
    "type": "rozwiazanie",
    "title": "Odpowiedzi ze sprawdzalnymi źródłami",
    "body": "Gaius odpowiada na podstawie bazy źródeł prawa aktualizowanej codziennie i podaje przepisy oraz orzeczenia, na których się opiera.",
    "data": {
      "problem": "Ogólne AI zmyśla orzeczenia i numery przepisów, więc każdą odpowiedź trzeba sprawdzać od zera.",
      "effect": "Każde cytowanie sprawdzisz w źródle od razu, zamiast szukać, czy orzeczenie w ogóle istnieje.",
      "wartosc": "Mniejsze ryzyko błędnego cytatu w piśmie do sądu lub opinii dla klienta, czyli mniejsze ryzyko wpadki zawodowej.",
      "order": 0
    },
    "tags": [
      "bol:zmyslone-orzeczenia",
      "bol:wyszukiwanie-orzecznictwa",
      "segment:kancelaria",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-przeglad-nda",
    "type": "rozwiazanie",
    "title": "Przegląd NDA względem Waszych standardów",
    "body": "Gaius porównuje umowę kontrahenta z Waszymi standardami (skill przygotowany na Waszym wzorze lub playbooku) i wskazuje zapisy do zmiany.",
    "data": {
      "problem": "Dział prawny dostaje niezliczone NDA i umowy powierzenia na wzorach kontrahentów i czyta każdą od początku.",
      "effect": "Prawnik zatwierdza listę odchyleń zamiast czytać całą umowę.",
      "wartosc": "Dział obsługuje więcej umów bez nowego etatu, co odpowiada na presję zarządu.",
      "order": 1
    },
    "tags": [
      "bol:powtarzalne-dokumenty",
      "bol:presja-zarzadu",
      "segment:in-house",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-archiwum-po-tresci",
    "type": "rozwiazanie",
    "title": "Wyszukiwanie w archiwum po treści",
    "body": "Gaius łączy się z SharePoint, OneDrive, Google Drive, Outlookiem i Gmailem i odpowiada na podstawie treści Waszych dokumentów, bez budowania drugiej bazy.",
    "data": {
      "problem": "Wiedza firmy leży w setkach opinii, umów i maili, ale szuka się jej po nazwach plików, a Outlook nie indeksuje archiwum.",
      "effect": "Wcześniejszą opinię, klauzulę czy korespondencję znajdziesz po treści, a nie po nazwie pliku.",
      "wartosc": "Zespół korzysta z tego, co już wypracował, zamiast pisać to samo od nowa, a wiedza nie znika razem z odchodzącym pracownikiem.",
      "order": 2
    },
    "tags": [
      "bol:archiwum",
      "segment:kancelaria",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-oficjalne-ai",
    "type": "rozwiazanie",
    "title": "Oficjalne, kontrolowane AI dla zespołu",
    "body": "Gaius jako oficjalne narzędzie AI dla całego zespołu, tak wygodne jak czat, ale z kontrolą nad tym, gdzie trafiają dane (SaaS w EOG albo Gaius Vault w sieci firmy).",
    "data": {
      "problem": "Pracownicy i tak wklejają dokumenty do darmowych czatów na prywatnych kontach, a firma nie ma nad tym kontroli.",
      "effect": "Ludzie dostają narzędzie, z którego i tak chcą korzystać, a IT i compliance wiedzą, co się dzieje z dokumentami.",
      "wartosc": "Firma może wprowadzić politykę korzystania z AI i ją egzekwować, zamiast udawać, że problemu nie ma.",
      "order": 3
    },
    "tags": [
      "bol:shadow-ai",
      "bol:poufnosc",
      "segment:in-house",
      "segment:administracja"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-analiza-akt",
    "type": "rozwiazanie",
    "title": "Analiza akt: terminy, roszczenia, ryzyka",
    "body": "Gaius analizuje akta, wypisuje terminy przedawnienia, roszczenia i ryzyka w tabeli z opisem i wskazuje, które działania są pilne.",
    "data": {
      "problem": "W aktach procesowych łatwo przeoczyć termin przedawnienia lub roszczenie, a ich wypisanie z setek stron trwa godzinami.",
      "effect": "Masz przegląd sprawy w jednej tabeli zamiast notatek z całych akt.",
      "wartosc": "Mniejsze ryzyko przeoczonego terminu, a więc odpowiedzialności zawodowej i utraty klienta.",
      "order": 4
    },
    "tags": [
      "bol:presja-zarzadu",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-pismo-w-wordzie",
    "type": "rozwiazanie",
    "title": "Projekt pisma od razu w Wordzie",
    "body": "Gaius pracuje na Waszych wzorach i dokumentach i przygotowuje projekt pisma na podstawie akt, także bezpośrednio we wtyczce do Worda.",
    "data": {
      "problem": "ChatGPT tylko daje informację: tekst z czatu trzeba kopiować do Worda i ręcznie formatować, a pisma i tak powstają od zera.",
      "effect": "Koniec przeklejania i formatowania, projekt powstaje w formie, w której i tak go wysyłasz.",
      "wartosc": "Czas prawnika idzie na merytorykę i strategię, a nie na pracę biurową.",
      "order": 5
    },
    "tags": [
      "bol:chatgpt-tylko-informacja",
      "bol:kopiowanie-do-worda",
      "bol:powtarzalne-dokumenty",
      "segment:kancelaria",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-szablony-masowe",
    "type": "rozwiazanie",
    "title": "Wypełnianie szablonów danymi ze spraw",
    "body": "Gaius wyciąga dane z dokumentów sprawy (skarg, nakazów, pism) i uzupełnia nimi Wasze szablony.",
    "data": {
      "problem": "W sprawach masowych dobre szablony istnieją, ale trzeba je ręcznie wypełniać danymi z setek dokumentów.",
      "effect": "Asystent zatwierdza gotowe pismo zamiast przepisywać dane.",
      "wartosc": "Kancelaria obsługuje więcej spraw tym samym zespołem, co przy sprawach masowych przekłada się wprost na marżę.",
      "order": 6
    },
    "tags": [
      "bol:szablony-w-skali",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-klauzule-niedozwolone",
    "type": "rozwiazanie",
    "title": "Wykrywanie klauzul niedozwolonych",
    "body": "Gaius wykrywa w umowach i regulaminach zapisy, które mogą być uznane za niedozwolone, i wskazuje, co zmienić.",
    "data": {
      "problem": "Wzorce umów i regulaminy dla konsumentów mogą zawierać klauzule niedozwolone, a ręczne sprawdzanie każdego wzorca po zmianach jest żmudne.",
      "effect": "Wzorzec sprawdzisz przed publikacją albo po każdej zmianie, bez czytania go od nowa.",
      "wartosc": "Mniejsze ryzyko sporów z konsumentami, postępowań UOKiK i kar za niedozwolone klauzule.",
      "order": 7
    },
    "tags": [
      "bol:powtarzalne-dokumenty",
      "segment:in-house",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-pismo-dla-urzednika",
    "type": "rozwiazanie",
    "title": "Projekt pisma dla urzędnika",
    "body": "Gaius przygotowuje urzędnikowi analizę prawną i projekt pisma na aktualnych przepisach, a szkolenie Gaius Administracja uczy zespół z niego korzystać.",
    "data": {
      "problem": "W urzędzie jeden prawnik obsługuje cały wydział, a urzędnicy czekają na jego opinię, podczas gdy biegną terminy z KPA.",
      "effect": "Prawnik dostaje do weryfikacji gotowy projekt zamiast pustej kartki, a urzędnik nie stoi w kolejce.",
      "wartosc": "Sprawy załatwiane są szybciej, z mniejszym ryzykiem przekroczenia terminu i skargi na bezczynność.",
      "order": 8
    },
    "tags": [
      "bol:presja-zarzadu",
      "bol:chatgpt-tylko-informacja",
      "segment:administracja"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-staly-koszt",
    "type": "rozwiazanie",
    "title": "Stały koszt bez limitów użytkowników",
    "body": "Gaius Vault: licencja miesięczna per jednostka obliczeniowa, bez opłat za użytkownika i bez tokenów, z pilotażem przed decyzją.",
    "data": {
      "problem": "Narzędzia AI liczone per użytkownik lub za tokeny dają nieprzewidywalne rachunki, a limity hamują korzystanie.",
      "effect": "Cały zespół korzysta bez liczenia zapytań, a budżet jest znany z góry.",
      "wartosc": "Koszt na użytkownika spada z każdą kolejną osobą, a decyzja zakupowa jest prostsza dla CFO i zarządu.",
      "order": 9
    },
    "tags": [
      "bol:presja-zarzadu",
      "bol:skala-grupy"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-weryfikacja-cytowan",
    "type": "rozwiazanie",
    "title": "Weryfikacja cytowań w pismach",
    "body": "Gaius weryfikuje cytowania w gotowym dokumencie: sygnatury orzeczeń, przepisy i ich aktualność.",
    "data": {
      "problem": "Pismo przeciwnika, aplikanta albo wygenerowane w ChatGPT może zawierać przekręcone sygnatury i nieaktualne przepisy, a sprawdzenie każdego cytatu zajmuje godziny.",
      "effect": "Dostajesz listę cytatów do poprawy zamiast sprawdzać każdy ręcznie.",
      "wartosc": "Słabe punkty pisma przeciwnika znajdujesz szybciej, a własne pisma wychodzą bez błędów, które podważają wiarygodność.",
      "order": 10
    },
    "tags": [
      "bol:zmyslone-orzeczenia",
      "segment:kancelaria",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-ocr",
    "type": "rozwiazanie",
    "title": "OCR: skany jak zwykłe dokumenty",
    "body": "Gaius rozpoznaje tekst ze skanów (OCR) i analizuje je jak zwykłe dokumenty.",
    "data": {
      "problem": "Akta, stare umowy i korespondencja to często skany PDF, których nie da się przeszukać ani przeanalizować.",
      "effect": "Skan staje się dokumentem, który można przeszukać, streścić i porównać.",
      "wartosc": "Archiwum papierowe da się wykorzystać bez przepisywania dokumentów.",
      "order": 11
    },
    "tags": [
      "bol:archiwum",
      "segment:kancelaria",
      "segment:administracja"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-anonimizacja",
    "type": "rozwiazanie",
    "title": "Automatyczna anonimizacja",
    "body": "Gaius automatycznie anonimizuje tekst i wskazuje dane, które usunął.",
    "data": {
      "problem": "Przed publikacją decyzji w BIP, przekazaniem dokumentów podwykonawcy albo użyciem sprawy na szkoleniu trzeba ręcznie usunąć dane osobowe.",
      "effect": "Prawnik sprawdza zanonimizowany tekst zamiast zaczerniać go ręcznie.",
      "wartosc": "Szybsze udostępnianie dokumentów i mniejsze ryzyko ujawnienia danych przy publikacji.",
      "order": 12
    },
    "tags": [
      "bol:poufnosc",
      "segment:administracja",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-maile-klientow",
    "type": "rozwiazanie",
    "title": "Odpowiedzi na maile klientów ze skrzynki",
    "body": "Gaius łączy się z Gmailem i Outlookiem, analizuje wiadomość z załącznikami i przygotowuje projekt odpowiedzi z podstawą prawną.",
    "data": {
      "problem": "Pytania klientów przychodzą mailem, a przygotowanie odpowiedzi wymaga kopiowania treści i załączników do innego narzędzia.",
      "effect": "Odpowiadasz klientowi z poziomu skrzynki, bez przenoszenia plików.",
      "wartosc": "Szybsza obsługa klientów przy tym samym zespole, a krótkie porady przestają zajmować cały dzień.",
      "order": 13
    },
    "tags": [
      "bol:kopiowanie-do-worda",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-skille-z-zespolem",
    "type": "rozwiazanie",
    "title": "Skille budowane razem z zespołem",
    "body": "Skille budowane razem z zespołem w trzech warsztatach: zebranie potrzeb, praca na konkretnym przykładzie, poprawki po testach.",
    "data": {
      "problem": "Zespół nie ma czasu uczyć się nowego narzędzia, a gdy coś działa inaczej niż zwykle, wraca do starych nawyków.",
      "effect": "Narzędzie od początku robi to, co zespół robi na co dzień, według jego standardu.",
      "wartosc": "Licencja jest faktycznie używana, więc inwestycja w AI się zwraca.",
      "order": 14
    },
    "tags": [
      "bol:presja-zarzadu",
      "segment:in-house",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-krs",
    "type": "rozwiazanie",
    "title": "Weryfikacja reprezentacji w KRS",
    "body": "Gaius sprawdza w KRS zarząd, wspólników i sposób reprezentacji oraz porównuje je z umową.",
    "data": {
      "problem": "Przed podpisaniem umowy trzeba sprawdzić, czy osoby po stronie kontrahenta mogą go reprezentować, a ręczne porównywanie z KRS jest żmudne.",
      "effect": "Od razu wiesz, czy podpisy pod umową wystarczą.",
      "wartosc": "Mniejsze ryzyko umowy podpisanej przez osobę bez umocowania i sporu o jej ważność.",
      "order": 15
    },
    "tags": [
      "bol:powtarzalne-dokumenty",
      "segment:in-house",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-kio",
    "type": "rozwiazanie",
    "title": "Orzecznictwo KIO z sygnaturami",
    "body": "Gaius wyszukuje i weryfikuje orzeczenia KIO w kontekście konkretnego postępowania.",
    "data": {
      "problem": "Termin na odwołanie do KIO jest krótki, a orzecznictwo Izby trzeba przeszukiwać ręcznie.",
      "effect": "Argumenty z orzecznictwa KIO masz z sygnaturami, bez przekopywania wyszukiwarki.",
      "wartosc": "Lepiej przygotowane odwołanie albo odpowiedź na nie w czasie, który zostaje.",
      "order": 16
    },
    "tags": [
      "bol:wyszukiwanie-orzecznictwa",
      "segment:kancelaria",
      "segment:administracja"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-interpretacje",
    "type": "rozwiazanie",
    "title": "Interpretacje podatkowe bez zmyśleń",
    "body": "Gaius wyszukuje interpretacje podatkowe i orzecznictwo, a w gotowej opinii weryfikuje cytowane interpretacje.",
    "data": {
      "problem": "Doradca szuka interpretacji indywidualnych w wyszukiwarce Eureka, a ogólne AI je zmyśla albo podaje nieaktualne.",
      "effect": "Szybciej znajdujesz interpretacje pasujące do stanu faktycznego klienta, z sygnaturą do sprawdzenia.",
      "wartosc": "Opinia dla klienta oparta na aktualnym stanowisku organów, przygotowana w krótszym czasie.",
      "order": 17
    },
    "tags": [
      "bol:zmyslone-orzeczenia",
      "bol:wyszukiwanie-orzecznictwa",
      "segment:doradcy"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-knf-dora",
    "type": "rozwiazanie",
    "title": "Zgodność procedur z KNF, DORA i AML",
    "body": "Gaius sprawdza dokumenty według zestawu zasad (np. wymogów regulacji) i wskazuje zapisy, które ich nie spełniają.",
    "data": {
      "problem": "Każda nowa rekomendacja KNF, DORA czy przepisy AML wymagają sprawdzenia, które procedury i umowy wewnętrzne trzeba zmienić.",
      "effect": "Dostajesz listę rozbieżności zamiast czytać wszystkie polityki od nowa.",
      "wartosc": "Szybsze dostosowanie do regulacji i mniejsze ryzyko zastrzeżeń przy kontroli KNF.",
      "order": 18
    },
    "tags": [
      "bol:presja-zarzadu",
      "segment:finanse"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-audio",
    "type": "rozwiazanie",
    "title": "Praca na nagraniach rozpraw i spotkań",
    "body": "Gaius przyjmuje pliki audio i pozwala pracować na ich treści: wyszukiwać, streśczać, cytować.",
    "data": {
      "problem": "Nagrania rozpraw albo spotkań trzeba odsłuchiwać godzinami, żeby znaleźć jedną wypowiedź.",
      "effect": "Potrzebny fragment nagrania znajdujesz po treści.",
      "wartosc": "Mniej godzin na odsłuch, więcej na argumentację.",
      "order": 19
    },
    "tags": [
      "bol:archiwum",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-ksc",
    "type": "rozwiazanie",
    "title": "Przegląd umów z dostawcami pod KSC",
    "body": "Gaius analizuje umowy z dostawcami pod kątem wymogów UKSC i wskazuje te, które wymagają aneksu.",
    "data": {
      "problem": "Nowe przepisy o krajowym systemie cyberbezpieczeństwa wymagają przejrzenia wszystkich umów z dostawcami i sprawdzenia, które trzeba zmienić.",
      "effect": "Zamiast czytać każdą umowę, dostajesz listę umów do zmiany z brakującymi zapisami.",
      "wartosc": "Organizacja spełnia obowiązki wobec łańcucha dostaw w terminie, bez zlecania zewnętrznej kancelarii przeglądu całego portfela.",
      "order": 20
    },
    "tags": [
      "bol:skala-grupy",
      "bol:powtarzalne-dokumenty",
      "segment:in-house",
      "segment:administracja"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-pip",
    "type": "rozwiazanie",
    "title": "Masowy przegląd umów pod reformę PIP",
    "body": "Gaius analizuje nawet 5 tys. umów jednocześnie pod kątem reformy PIP i przygotowuje projekty aneksów.",
    "data": {
      "problem": "Reforma PIP wymaga przejrzenia nawet tysięcy umów (np. zleceń i B2B) i przygotowania aneksów, a ręcznie zajęłoby to miesiące.",
      "effect": "Cały portfel umów przejrzany w jednym przebiegu, z listą umów do zmiany i gotowymi aneksami.",
      "wartosc": "Mniejsze ryzyko negatywnych ustaleń i kar po kontroli PIP.",
      "order": 21
    },
    "tags": [
      "bol:skala-grupy",
      "bol:szablony-w-skali",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-mercosur",
    "type": "rozwiazanie",
    "title": "Ulgi z umowy UE–Mercosur",
    "body": "Gaius sprawdza produkty organizacji pod kątem ulg wynikających z umowy UE–Mercosur.",
    "data": {
      "problem": "Firma nie wie, czy na jej produkty przysługuje ulga z umowy UE–Mercosur, a samodzielna analiza umowy jest pracochłonna.",
      "effect": "Wiesz, które produkty mogą korzystać z ulgi, bez studiowania umowy międzynarodowej.",
      "wartosc": "Niższe cła i przewaga cenowa nad konkurencją, która z ulg nie korzysta.",
      "order": 22
    },
    "tags": [
      "bol:presja-zarzadu",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-ustalenia-z-maili",
    "type": "rozwiazanie",
    "title": "Umowa kontra ustalenia z maili",
    "body": "Gaius porównuje ostateczną wersję umowy z wątkiem mailowym i wskazuje ustalenia, których w niej brakuje.",
    "data": {
      "problem": "Ustalenia z negocjacji są rozsiane po długim wątku mailowym i łatwo je pominąć w ostatecznej wersji umowy.",
      "effect": "Przed podpisem masz listę rozbieżności między umową a ustaleniami.",
      "wartosc": "Mniej sporów o to, co było ustalone, i mniej aneksów po podpisaniu.",
      "order": 23
    },
    "tags": [
      "bol:powtarzalne-dokumenty",
      "bol:archiwum",
      "segment:in-house",
      "segment:kancelaria"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-rejestr-umow",
    "type": "rozwiazanie",
    "title": "Rejestr umów z rozproszonych plików",
    "body": "Gaius wyciąga umowy z rozproszonych dokumentów i porządkuje je w jednym miejscu, gotowe do przeszukania.",
    "data": {
      "problem": "Umowy są rozproszone po dyskach, mailach i folderach, a firma nie ma ich rejestru, więc nie wie, co ją wiąże.",
      "effect": "Każdą umowę i jej kluczowe warunki znajdziesz w jednym miejscu.",
      "wartosc": "Kontrola nad zobowiązaniami firmy (terminy, kary, okresy wypowiedzenia), także przy audycie lub due diligence.",
      "order": 24
    },
    "tags": [
      "bol:archiwum",
      "bol:skala-grupy",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-wezwanie-do-zaplaty",
    "type": "rozwiazanie",
    "title": "Analiza wezwania do zapłaty",
    "body": "Agent Gaius analizuje zasadność roszczenia, wskazuje argumenty za i przeciw oraz ryzyka procesowe, przygotowuje tabelę tez ze źródłami i szkic odpowiedzi.",
    "data": {
      "problem": "Ocena wezwania do zapłaty wymaga ustalenia podstaw prawnych, argumentów obu stron i ryzyk, a potem napisania odpowiedzi, co zajmuje wiele godzin.",
      "effect": "Zlecasz zadanie jak zewnętrznej kancelarii i dostajesz kompletną analizę do sprawdzenia.",
      "wartosc": "Mniej spraw przekazywanych na zewnątrz i szybsza decyzja: płacić, negocjować czy się bronić.",
      "order": 25
    },
    "tags": [
      "bol:presja-zarzadu",
      "bol:chatgpt-tylko-informacja",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  },
  {
    "id": "rz-moc-tez",
    "type": "rozwiazanie",
    "title": "Ocena mocy tez z orzecznictwa",
    "body": "Gaius ocenia moc tez na tle orzecznictwa i wskazuje źródła za i przeciw.",
    "data": {
      "problem": "Argument w piśmie opiera się na tezie z orzeczenia, ale nie wiadomo, czy linia orzecznicza nadal ją wspiera.",
      "effect": "Przed złożeniem pisma wiesz, które argumenty są mocne, a które łatwo podważyć.",
      "wartosc": "Lepsza strategia procesowa i mniejsze ryzyko przegranej na słabym argumencie.",
      "order": 26
    },
    "tags": [
      "bol:zmyslone-orzeczenia",
      "bol:wyszukiwanie-orzecznictwa",
      "segment:kancelaria",
      "segment:in-house"
    ],
    "created_at": "2026-11-25T00:00:00.000Z",
    "updated_at": "2026-11-25T00:00:00.000Z"
  }
];

// id bloku albo karty -> kafelki do dopisania do jej `tags`
export const tileTags = {
  "uc-pilne-pismo": [
    "bol:presja-zarzadu",
    "bol:zmyslone-orzeczenia",
    "segment:in-house",
    "segment:kancelaria"
  ],
  "uc-zmiana-prawa": [
    "bol:skala-grupy",
    "bol:powtarzalne-dokumenty",
    "segment:in-house",
    "segment:administracja"
  ],
  "uc-dokument-przed-wysylka": [
    "bol:zmyslone-orzeczenia",
    "segment:kancelaria",
    "segment:in-house"
  ],
  "uc-umowa-do-podpisu": [
    "bol:powtarzalne-dokumenty",
    "segment:in-house",
    "segment:kancelaria"
  ],
  "uc-powracajacy-temat": [
    "bol:archiwum",
    "segment:kancelaria",
    "segment:in-house"
  ],
  "uc-pytanie-od-biznesu": [
    "bol:presja-zarzadu",
    "bol:chatgpt-tylko-informacja",
    "segment:in-house"
  ],
  "pl-prywatne-srodowisko": [
    "bol:poufnosc"
  ],
  "pl-odpowiedzi-ze-zrodlami": [
    "bol:zmyslone-orzeczenia"
  ],
  "pl-standard-pracy": [
    "bol:shadow-ai",
    "bol:powtarzalne-dokumenty"
  ],
  "sg-szybsze-odpowiedzi": [
    "bol:presja-zarzadu"
  ],
  "sg-wiecej-dokumentow": [
    "bol:skala-grupy"
  ],
  "sg-wiedza-trudna": [
    "bol:archiwum"
  ],
  "sg-powtarzalne-zadania": [
    "bol:powtarzalne-dokumenty"
  ],
  "cmp-dane": [
    "bol:poufnosc"
  ],
  "cmp-zrodla": [
    "bol:wyszukiwanie-orzecznictwa"
  ],
  "cmp-weryfikacja": [
    "bol:zmyslone-orzeczenia"
  ],
  "cmp-wiedza": [
    "bol:archiwum"
  ],
  "cmp-wdrozenie": [
    "bol:presja-zarzadu"
  ],
  "cmp-skalowanie": [
    "bol:skala-grupy"
  ],
  "cmp-word": [
    "bol:kopiowanie-do-worda"
  ],
  "dlaczego/bez-blokady": [
    "bol:presja-zarzadu",
    "bol:skala-grupy",
    "rola:zarzad"
  ],
  "dlaczego/bezpieczny-start": [
    "bol:presja-zarzadu",
    "rola:zarzad"
  ],
  "dlaczego/jedna-usluga": [
    "bol:presja-zarzadu",
    "rola:zarzad"
  ],
  "dlaczego/jedno-srodowisko": [
    "bol:wyszukiwanie-orzecznictwa",
    "bol:archiwum",
    "rola:champion"
  ],
  "dlaczego/know-how-organizacji": [
    "bol:archiwum",
    "bol:powtarzalne-dokumenty",
    "rola:champion"
  ],
  "dlaczego/odpowiedzi-ze-zrodlami": [
    "bol:zmyslone-orzeczenia",
    "rola:champion"
  ],
  "dlaczego/on-premise": [
    "bol:poufnosc",
    "produkt:on-prem",
    "produkt:vault"
  ],
  "dlaczego/prywatne-legal-ai": [
    "bol:poufnosc",
    "bol:shadow-ai"
  ],
  "dlaczego/wdrozenie-rutyna": [
    "bol:shadow-ai",
    "rola:champion"
  ],
  "dlaczego/bez-blokady-wyroznienie": [
    "bol:presja-zarzadu",
    "bol:skala-grupy",
    "rola:zarzad"
  ],
  "dlaczego/bezpieczny-start-wyroznienie": [
    "bol:presja-zarzadu",
    "rola:zarzad"
  ],
  "dlaczego/jedna-usluga-wyroznienie": [
    "bol:presja-zarzadu",
    "rola:zarzad"
  ],
  "dlaczego/jedno-srodowisko-wyroznienie": [
    "bol:wyszukiwanie-orzecznictwa",
    "bol:archiwum",
    "rola:champion"
  ],
  "dlaczego/know-how-organizacji-wyroznienie": [
    "bol:archiwum",
    "bol:powtarzalne-dokumenty",
    "rola:champion"
  ],
  "dlaczego/odpowiedzi-ze-zrodlami-wyroznienie": [
    "bol:zmyslone-orzeczenia",
    "rola:champion"
  ],
  "dlaczego/on-premise-wyroznienie": [
    "bol:poufnosc",
    "produkt:on-prem",
    "produkt:vault"
  ],
  "dlaczego/prywatne-legal-ai-wyroznienie": [
    "bol:poufnosc",
    "bol:shadow-ai"
  ],
  "dlaczego/wdrozenie-rutyna-wyroznienie": [
    "bol:shadow-ai",
    "rola:champion"
  ],
  "dlaczego/pilotaz-3-miesiace": [
    "bol:presja-zarzadu",
    "rola:zarzad"
  ]
};
