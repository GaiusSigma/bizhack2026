// Dane startowe, wczytywane tylko do PUSTEJ bazy. Treść pochodzi z gaius-offer.figcraft,
// a szablon (seed/gaius-template.figcraft) to ten sam plik z polami {{…}} w nazwach warstw.
// Format jak eksport z /api/export; plik szablonu dokłada serwer.
const ts = '2026-11-25T00:00:00.000Z';
const tags = ['vault'];

const block = (id, type, title, body, data = {}, extraTags = []) => ({
  id, type, title, body, data, tags: [...tags, ...extraTags], created_at: ts, updated_at: ts,
});

// ------------------------------------------------------------------ bloki wiedzy
const blocks = [
  // Use case'y: „Vault w codziennej praktyce”
  block('uc-pilne-pismo', 'use_case', 'Pilne pismo lub roszczenie', 'Gaius wyciąga tezy, luki, kontrargumenty i źródła do weryfikacji.', { effect: 'szybsza reakcja i większa kontrola ryzyka.' }, ['dzial-prawny']),
  block('uc-zmiana-prawa', 'use_case', 'Zmiana prawa lub procedury', 'Gaius wskazuje dokumenty, wzory i procedury wymagające aktualizacji.', { effect: 'większa kontrola compliance i mniej reaktywnego działania.' }, ['dzial-prawny', 'compliance']),
  block('uc-dokument-przed-wysylka', 'use_case', 'Dokument przed wysyłką', 'Gaius sprawdza cytowania, sygnatury, dane i zgodność z przyjętym standardem.', { effect: 'mniejsze ryzyko błędu przed wysłaniem dokumentu do klienta, kontrahenta, sądu albo zarządu.' }, ['dzial-prawny', 'kancelaria']),
  block('uc-umowa-do-podpisu', 'use_case', 'Umowa do podpisu', 'Gaius wskazuje ryzyka, braki, niespójności i punkty negocjacyjne.', { effect: 'krótszy czas akceptacji: podpisać, negocjować albo eskalować.' }, ['dzial-prawny']),
  block('uc-powracajacy-temat', 'use_case', 'Powracający temat', 'Gaius odnajduje wcześniejsze opinie, wzory, klauzule i argumenty.', { effect: 'mniej pracy od zera i lepsze wykorzystanie know-how organizacji.' }, ['dzial-prawny', 'kancelaria']),
  block('uc-pytanie-od-biznesu', 'use_case', 'Pytanie od biznesu', 'Gaius tworzy robocze memo: odpowiedź, podstawa, ryzyka, warianty i rekomendacja.', { effect: 'mniej czekania na decyzję i bardziej przejrzysta komunikacja prawna.' }, ['dzial-prawny']),

  // Problemy: „Gdzie ucieka czas działu prawnego?”
  block('pr-research-od-nowa', 'problem', 'Research zaczynany od nowa', 'Źródła, argumenty i podstawy prawne są odtwarzane za każdym razem.'),
  block('pr-analizy-powtarzane', 'problem', 'Analizy powtarzane przez różne osoby', 'Podobne pytania wracają, ale odpowiedzi nie zawsze korzystają z wcześniejszej pracy.'),
  block('pr-know-how-ukryte', 'problem', 'Know-how ukryte w folderach i mailach', 'Opinie, wzory i klauzule istnieją, ale nie są aktywnie wykorzystywane.'),
  block('pr-praca-odtworcza', 'problem', 'Eksperci zajęci pracą odtwórczą', 'Czas seniorów trafia na zadania, które można ustandaryzować.'),
  block('pr-ai-bez-zasad', 'problem', 'AI używane bez wspólnych zasad', 'Brakuje jednego standardu promptów, źródeł, weryfikacji i odpowiedzialności.'),

  // Filary: „Czym jest Vault?”
  block('pl-prywatne-srodowisko', 'pillar', 'Prywatne środowisko pracy', 'Vault działa w środowisku kontrolowanym przez organizację — bez traktowania dokumentów prawnych jak materiału dla publicznego chatbota.'),
  block('pl-odpowiedzi-ze-zrodlami', 'pillar', 'Odpowiedzi ze źródłami', 'Odpowiedzi prowadzą do podstaw: przepisów, orzeczeń, cytatów, sygnatur i dokumentów, które prawnik może zweryfikować.'),
  block('pl-standard-pracy', 'pillar', 'Standard pracy zespołu', 'Powtarzalne zadania zamieniamy w rutyny, checklisty i workflowy, z których korzysta cały zespół.'),

  // Wyróżniki: „Dlaczego Vault?”
  block('df-prywatne-legal-ai', 'differentiator', 'Prywatne Legal AI na realnych dokumentach', 'Vault może działać lokalnie i pod kontrolą organizacji, zgodnie z wymaganiami IT, compliance i zespołu prawnego.'),
  block('df-jedno-srodowisko', 'differentiator', 'Prawo, orzecznictwo i dokumenty w jednym środowisku', 'Gaius Vault łączy źródła prawne z dokumentami organizacji, dzięki czemu AI pracuje na rzeczywistym kontekście spraw.'),
  block('df-wdrozenie-rutyna', 'differentiator', 'Wdrożenie, które kończy się rutyną pracy', 'Vault nie kończy się na uruchomieniu dostępu. Warsztaty i Legal Engineering zamieniają procesy w workflowy, checklisty i rutyny.'),
  block('df-bez-blokady', 'differentiator', 'Skalowanie bez blokady licencyjnej', 'Organizacja nie płaci osobno za każdego użytkownika ani każdą przestrzeń roboczą. Parametry techniczne środowiska dobieramy do skali wdrożenia.'),
  block('df-jedna-usluga', 'differentiator', 'Jedna usługa', 'W ramach jednej licencji organizacja otrzymuje technologię, źródła, pracę na dokumentach, warsztaty, Legal Engineering i rozwój standardu pracy.'),
  block('df-bezpieczny-start', 'differentiator', 'Bezpieczny model startu', 'Stały koszt miesięczny, gwarancja ceny i opcjonalny 3-miesięczny POC z możliwością rezygnacji ograniczają ryzyko decyzji.'),

  // Sygnały gotowości
  block('sg-szybsze-odpowiedzi', 'signal', 'Szybsze odpowiedzi dla biznesu', 'Dział prawny ma wspierać decyzje szybciej, bez obniżania jakości.'),
  block('sg-wiecej-dokumentow', 'signal', 'Więcej dokumentów i źródeł', 'Umowy, pisma i materiały prawne wymagają coraz więcej selekcji i analizy.'),
  block('sg-wiedza-trudna', 'signal', 'Wiedza trudna do ponownego użycia', 'Poprzednie opinie i wzory istnieją, ale nie zawsze łatwo je wykorzystać w kolejnych sprawach.'),
  block('sg-powtarzalne-zadania', 'signal', 'Powtarzalne zadania zabierają czas ekspertów', 'Te same typy analiz, researchu i kontroli wracają w kolejnych sprawach.'),

  // Kroki wdrożenia
  block('st-procesy', 'step', 'Wybieramy procesy o największym wpływie', 'Identyfikujemy pytania, dokumenty i analizy, które wracają najczęściej.'),
  block('st-realne-sprawy', 'step', 'Pracujemy na realnych sprawach', 'Warsztat opieramy na dokumentach, pytaniach i standardach zespołu.'),
  block('st-rutyny', 'step', 'Budujemy rutyny', 'Zamieniamy procesy w workflowy, checklisty, prompty i wzorce odpowiedzi.'),
  block('st-weryfikacja', 'step', 'Ustalamy zasady weryfikacji', 'Określamy, jak sprawdzane są źródła, cytaty, ryzyka i odpowiedzialność.'),
  block('st-adopcja', 'step', 'Mierzymy adopcję i skalujemy', 'Sprawdzamy użycie, zbieramy feedback i wybieramy kolejne procesy.'),

  // Porównanie: kilka narzędzi vs Gaius Vault
  block('cmp-dane', 'comparison', 'Dane i dokumenty', '', { them: 'wymagają polityk, integracji i ograniczeń użycia', us: 'prywatne środowisko do pracy na dokumentach prawnych' }),
  block('cmp-zrodla', 'comparison', 'Źródła prawne', '', { them: 'często osobno od AI i dokumentów klienta', us: 'prawo, orzecznictwo i dokumenty w jednym miejscu' }),
  block('cmp-weryfikacja', 'comparison', 'Weryfikacja', '', { them: 'kontrola cytowań i podstaw zostaje po stronie użytkownika', us: 'odpowiedzi prowadzą do źródeł, sygnatur i dokumentów' }),
  block('cmp-wiedza', 'comparison', 'Wiedza organizacji', '', { them: 'foldery, DMS, SharePoint, maile', us: 'aktywna baza opinii, pism, wzorów i analiz' }),
  block('cmp-wdrozenie', 'comparison', 'Wdrożenie', '', { them: 'szkolenia i adopcja po stronie klienta', us: 'warsztaty + Legal Engineer + rutyny pracy' }),
  block('cmp-skalowanie', 'comparison', 'Skalowanie', '', { them: 'kolejne licencje, moduły i integracje', us: 'jedna licencja, brak limitów po stronie użytkowników i plików' }),
  block('cmp-word', 'comparison', 'Wtyczka do Word', '', { them: 'kolejna licencja', us: 'w cenie' }),

  // Składniki pakietu (slajd cenowy)
  block('pkg-technologia', 'package', 'Technologia Gaius-Lex', '- research prawny\n- analiza dokumentów\n- źródła i cytowania\n- baza wiedzy\n- rutyny pracy\n- aktualne prawo i orzecznictwo'),
  block('pkg-srodowisko', 'package', 'Prywatne środowisko Vault', '- lokalne i kontrolowane środowisko pracy\n- brak limitu po stronie licencji\n- sprzęt i konfiguracja środowiska u klienta\n- dostosowanie do potrzeb wdrożenia'),
  block('pkg-legal-engineering', 'package', 'Legal Engineering i adopcja', '- 5 h warsztatów miesięcznie\n- 10 h pracy Legal Engineera miesięcznie\n- rozwój rutyn i standardów pracy\n- rekomendacje kolejnych procesów'),

  // Osoby kontaktowe
  block('person-janusz', 'person', 'Janusz Marszałek', '', { role: 'Co-founder & Dyrektor Operacyjny', email: 'januszmarszalek@gaius-lex.pl', phone: '+48 579 122 689' }),
];

// ------------------------------------------------------------------ oferta bazowa
// `frame` to nazwa slajdu (ramki) w szablonie, `data` wypełnia pola {{data.*}}.
const OFFER = 'gaius-vault-bazowa';
const slide = (id, position, frame, data, block_ids = [], picks = {}) => ({
  id, offer_id: OFFER, position, frame, data, block_ids, query: null, picks, hidden: false, created_at: ts, updated_at: ts,
});
const ids = (type) => blocks.filter((b) => b.type === type).map((b) => b.id);

export const slides = [
  slide('s-okladka', 0, 'okladka', {
    title: 'Gaius Vault',
    subtitle: 'Legal AI, które możesz dopuścić **do realnej pracy prawnej**',
    lead: 'Prywatne Legal AI do pracy na realnych dokumentach - lokalnie, w jednej licencji, pod kontrolą organizacji.',
  }),
  slide('s-problem', 1, 'problemy', {
    title: 'Gdzie **ucieka** czas działu prawnego?',
    lead: 'Najwięcej kosztuje nie sama analiza, ale każdorazowe odtwarzanie drogi do odpowiedzi.',
    note: 'Problemem nie jest liczba spraw. Problemem jest powtarzanie tej samej drogi do odpowiedzi.',
  }, ids('problem')),
  slide('s-czym-jest', 2, 'czym-jest', {
    title: 'Czym jest ',
    title_accent: 'Vault?',
    lead: 'Prywatne środowisko Legal AI, które łączy źródła prawne, dokumenty organizacji i standard pracy zespołu.',
  }, ids('pillar')),
  slide('s-dlaczego', 3, 'dlaczego', {
    title: 'Dlaczego ',
    title_accent: 'Vault?',
    lead: 'Gaius Vault łączy technologię, źródła, dokumenty, wdrożenie i adopcję w jednym modelu.',
  }, [], {
    dlaczego: ['prywatne-legal-ai', 'jedno-srodowisko', 'wdrozenie-rutyna-wyroznienie', 'bez-blokady', 'jedna-usluga', 'bezpieczny-start']
      .map((k) => ({ component: `dlaczego/${k}` })),
  }),
  slide('s-sygnaly', 4, 'sygnaly', {
    title: 'Sygnał, że dział prawny jest',
    title_2: 'gotowy na',
    title_accent: 'Vault?',
    lead: 'Nie chodzi o samą technologię. Chodzi o moment, w którym Legal AI powinno stać się standardem pracy zespołu.',
    note: 'Gaius Vault pomaga zamienić te sygnały w plan wdrożenia: procesy, rutyny i mierzalny efekt.',
  }, ids('signal')),
  slide('s-wdrozenie', 5, 'wdrozenie', {
    quote: 'Nie wdrażamy dostępu.\nWdrażamy sposób pracy.',
    quote_lead: 'Dlatego Vault obejmuje nie tylko technologię, ale też proces, rutyny i zasady odpowiedzialności.',
  }, ids('step')),
  slide('s-use-case', 6, 'use-case', {
    title: 'Vault w codziennej praktyce',
    lead: 'Gaius Vault zamienia najczęstsze punkty styku biznesu z działem prawnym w powtarzalne rutyny: od akceptacji umów, przez reakcję na spór, po wykorzystanie wcześniejszych opinii i standardów.',
  }, ids('use_case')),
  slide('s-cennik', 7, 'cennik', {
    title: 'Co wchodzi w skład',
    title_accent: 'Vault?',
    lead: 'Organizacja kupuje nie tylko narzędzie AI, ale wdrożony standard pracy: technologię, środowisko, rutyny i wsparcie adopcji.',
    price_label: 'Koszt abonamentu',
    price_note: 'netto',
    lines: 'Koszt realizacji warsztatów | w cenie abonamentu\nKoszt szkolenia | w cenie abonamentu\nKoszt sprzętu | w cenie abonamentu',
  }, ['pkg-technologia', 'pkg-srodowisko', 'pkg-legal-engineering']),
  slide('s-architektura', 8, 'architektura', {}),
  slide('s-porownanie', 9, 'porownanie', {
    title: 'Gaius vs składanie Legal AI z kilku narzędzi',
    lead: 'Większość rozwiązań rozwiązuje jeden fragment problemu. Gaius Vault dostarcza kompletny standard pracy prawnej z AI — w ramach jednej licencji.',
    col_area: 'Obszar', col_them: 'Kilka narzędzi AI / LegalTech', col_us: 'Gaius Vault',
  }, ids('comparison')),
  slide('s-kontakt', 10, 'kontakt', {
    kicker: 'ZACZNIJMY WSPÓŁPRACĘ',
    title: 'Bezpieczne Legal AI w Twojej organizacji',
    text: 'Jeśli chcesz przyspieszyć research prawny, lepiej kontrolować ryzyka i bezpiecznie wykorzystać AI w swojej firmie, zostaw nam kontakt. Krótka rozmowa wystarczy, żebyśmy zrozumieli specyfikę Twojej organizacji i zaproponowali sensowny zakres pilotażu — od bezpiecznego wdrożenia testowego po pełne wdrożenie on-premise lub model hybrydowy.',
  }, ['person-janusz']),
];

// ------------------------------------------------------------------ komponenty (karty z zestawu @dlaczego)
// Karty rysuje się w FigCraft (seed/build-components.mjs zrobił je z kart slajdu „dlaczego”).
// Tu jest to, czego nie widać na rysunku: kiedy AI ma którą kartę wybrać.
// Warianty: zwykla (beżowa) i wyroznienie (zielona, jedna na slajd), liczba (duża liczba zamiast ikony).
const comp = (key, topic, variant, title, description, use_when, avoid_when = '', tags = []) => ({
  id: `dlaczego/${key}`, set_name: 'dlaczego', key, source: 'gaius', title, description, use_when, avoid_when, topic, variant,
  tags, data: {}, figma_text: '', fields: [], missing: false, created_at: ts, updated_at: ts,
});
const TOPICS = [
  ['prywatne-legal-ai', 'Prywatne Legal AI na realnych dokumentach',
    'Bezpieczeństwo i kontrola: Vault działa lokalnie, pod kontrolą IT i compliance. Ikona: baza danych z kłódką.',
    'Klient pracuje na poufnych dokumentach (tajemnica adwokacka, dane osobowe, M&A), ma wymagający dział IT/bezpieczeństwa albo boi się publicznych chatbotów.',
    'Klient ma już jasno ustalone wdrożenie on-premise: wtedy lepsza jest karta on-premise.', ['bezpieczenstwo', 'compliance']],
  ['jedno-srodowisko', 'Prawo, orzecznictwo i dokumenty w jednym środowisku',
    'Źródła prawne i dokumenty organizacji w jednym miejscu, AI pracuje na kontekście spraw. Ikona: folder z lupą.',
    'Klient dziś skacze między LEX/Legalis, DMS-em i ChatGPT; dużo researchu i pracy na własnych dokumentach.',
    '', ['research']],
  ['wdrozenie-rutyna', 'Wdrożenie, które kończy się rutyną pracy',
    'Adopcja: warsztaty i Legal Engineering zamieniają procesy w workflowy i checklisty. Ikona: warstwy.',
    'Klient miał już nieudane wdrożenie narzędzia AI, zespół jest sceptyczny albo zarząd pyta o realne wykorzystanie.',
    '', ['adopcja', 'wdrozenie']],
  ['bez-blokady', 'Skalowanie bez blokady licencyjnej',
    'Brak opłat za użytkownika i przestrzeń roboczą. Ikona: osoba z plusem.',
    'Duży zespół (kilkadziesiąt+ prawników), plan rozszerzenia na kolejne działy, porównanie z narzędziami licencjonowanymi per seat.',
    'Mała kancelaria (kilka osób): argument licencyjny jest słaby.', ['cena', 'skalowanie']],
  ['jedna-usluga', 'Jedna usługa',
    'Jedna licencja obejmuje technologię, źródła, warsztaty, Legal Engineering i rozwój standardu. Ikona: schowek z ptaszkiem.',
    'Klient nie chce składać rozwiązania z wielu dostawców, ma ograniczony zespół IT albo zakupy wolą jedną umowę.',
    '', ['zakupy', 'prostota']],
  ['bezpieczny-start', 'Bezpieczny model startu',
    'Stały koszt miesięczny, gwarancja ceny i opcjonalny 3-miesięczny POC z możliwością rezygnacji. Ikona: kalkulator.',
    'Klient waha się, ma ograniczony budżet albo decyzję podejmuje zarząd/finanse.',
    'Na slajdzie jest już karta „Pilotaż bez ryzyka” (ten sam argument).', ['cena', 'ryzyko']],
  ['odpowiedzi-ze-zrodlami', 'Odpowiedzi, które da się sprawdzić',
    'Weryfikowalność: każda odpowiedź prowadzi do przepisu, orzeczenia, cytatu albo dokumentu. Ikona: folder z lupą.',
    'Kancelaria procesowa, sporo pism do sądu, klient boi się halucynacji AI albo pyta o odpowiedzialność za błędy.',
    '', ['jakosc', 'kancelaria']],
  ['know-how-organizacji', 'Know-how pracuje przy każdej sprawie',
    'Wykorzystanie wcześniejszych opinii, pism i wzorów. Ikona: warstwy.',
    'Duża kancelaria albo dział prawny z latami archiwum; problem „wynajdujemy koło na nowo”, rotacja prawników.',
    'Młoda organizacja bez archiwum dokumentów.', ['wiedza', 'kancelaria', 'dzial-prawny']],
  ['on-premise', 'On-premise albo model hybrydowy',
    'Środowisko w infrastrukturze klienta, bez publicznej chmury. Ikona: baza danych z kłódką.',
    'Bank, ubezpieczyciel, sektor publiczny, energetyka, klient regulowany (KNF, KSC/NIS2) albo z zakazem chmury.',
    'Klient nie ma własnej infrastruktury i woli usługę zarządzaną.', ['bezpieczenstwo', 'regulowany']],
];
export const components = [
  ...TOPICS.map(([key, title, desc, use, avoid, tags]) => comp(key, key, 'zwykla', title, desc, use, avoid, tags)),
  ...TOPICS.map(([key, title, desc, use, avoid, tags]) => comp(`${key}-wyroznienie`, key, 'wyroznienie', `${title} (wyróżnienie)`,
    `Zielona, wyróżniona wersja karty. ${desc}`,
    `Najważniejszy argument dla tego klienta. ${use}`, avoid, tags)),
  comp('pilotaz-3-miesiace', 'bezpieczny-start', 'liczba', 'Pilotaż bez ryzyka (3 mies.)',
    'Karta z dużą liczbą „3 mies.” zamiast ikony: pilotaż na realnych sprawach z możliwością rezygnacji.',
    'Klient chce najpierw sprawdzić narzędzie, rozmowa jest na etapie pilotażu, decyzja wymaga dowodu efektów.',
    'Na slajdzie jest już karta „Bezpieczny model startu” (ten sam temat).', ['ryzyko', 'poc']),
];
export const componentSets = [{
  id: 'dlaczego',
  title: 'Dlaczego Vault? (6 kart)',
  rules: 'Dokładnie 6 kart. Dokładnie jedna karta w wariancie „wyroznienie” (zielona): najważniejszy argument dla klienta. Najwyżej jedna karta z danego tematu. Karta „liczba” najwyżej jedna. Pierwszy wiersz (karty 1–3) to argumenty najmocniejsze dla klienta.',
  created_at: ts, updated_at: ts,
}];

export const TEMPLATE = { id: 'gaius', name: 'Gaius Vault', file: 'gaius-template.figcraft' };

export default {
  format: 'offer-studio',
  version: 3,
  exported_at: ts,
  blocks,
  templates: [],
  offers: [{ id: OFFER, name: 'Gaius Vault – oferta bazowa', template_id: TEMPLATE.id, data: { client: '', price: '------' }, created_at: ts, updated_at: ts }],
  slides,
  components,
  component_sets: componentSets,
};
