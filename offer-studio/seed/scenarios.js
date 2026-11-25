// Scenariusze: tok prezentacji dla każdej roli rozmówcy (id = kafelek roli).
// Krok = slajd z biblioteki (`frame`) + domyślna treść (`data`) + reguła wypełnienia (`fill`).
//   fill.kind: none (sama treść) | pains (wybrane kafelki bólów) | blocks (bloki typu `type` dobrane po kafelkach,
//   od `min` do `max`) | picks (karty zestawu komponentów dobrane po kafelkach).
//   when.any: krok tylko przy którymś z tych kafelków.
//   data_by_product: nadpisania treści dla produktu (domyślna treść to wersja Vault).
//   draft: produkty, których teksty są szkicem do poprawy (pokazywane w UI jako „szkic”).
// Kolejność i treść edytuje się w zakładce Scenariusze.

const SAAS = 'produkt:saas';
const ONPREM = 'produkt:on-prem';
const VAULT_LIKE = { any: ['produkt:vault', ONPREM] };

const okladka = {
  key: 'okladka', label: 'Okładka', frame: 'okladka',
  data: {
    title: 'Gaius Vault',
    subtitle: 'Legal AI, które możesz dopuścić **do realnej pracy prawnej**',
    lead: 'Prywatne Legal AI do pracy na realnych dokumentach - lokalnie, w jednej licencji, pod kontrolą organizacji.',
  },
  data_by_product: {
    [SAAS]: {
      title: 'Gaius',
      lead: 'Legal AI do pracy na realnych dokumentach: źródła prawa, Wasze wzory i gotowe pisma w jednym narzędziu, bez instalacji.',
    },
    [ONPREM]: {
      lead: 'Prywatne Legal AI w Waszej infrastrukturze: dokumenty nie opuszczają organizacji, a środowisko kontroluje Wasz dział IT.',
    },
  },
  draft: [SAAS, ONPREM],
  fill: { kind: 'none' },
};

const architektura = { key: 'architektura', label: 'Architektura', frame: 'architektura', data: {}, fill: { kind: 'none' }, when: VAULT_LIKE };

const wdrozenie = {
  key: 'wdrozenie', label: 'Wdrożenie', frame: 'wdrozenie',
  data: {
    quote: 'Nie wdrażamy dostępu.\nWdrażamy sposób pracy.',
    quote_lead: 'Dlatego Vault obejmuje nie tylko technologię, ale też proces, rutyny i zasady odpowiedzialności.',
  },
  data_by_product: {
    [SAAS]: { quote_lead: 'Dlatego Gaius to nie tylko dostęp do narzędzia, ale też warsztaty, rutyny i zasady weryfikacji dla zespołu.' },
  },
  draft: [SAAS],
  fill: { kind: 'blocks', type: 'step', min: 5, max: 5 },
};

const kontakt = {
  key: 'kontakt', label: 'Kontakt', frame: 'kontakt',
  data: {
    kicker: 'ZACZNIJMY WSPÓŁPRACĘ',
    title: 'Bezpieczne Legal AI w Twojej organizacji',
    text: 'Jeśli chcesz przyspieszyć research prawny, lepiej kontrolować ryzyka i bezpiecznie wykorzystać AI w swojej firmie, zostaw nam kontakt. Krótka rozmowa wystarczy, żebyśmy zrozumieli specyfikę Twojej organizacji i zaproponowali sensowny zakres pilotażu — od bezpiecznego wdrożenia testowego po pełne wdrożenie on-premise lub model hybrydowy.',
  },
  data_by_product: {
    [SAAS]: { text: 'Jeśli chcesz przyspieszyć research prawny i pracę na dokumentach, zostaw nam kontakt. Krótka rozmowa wystarczy, żebyśmy dobrali plan i pokazali Gaius na Waszych sprawach.' },
  },
  draft: [SAAS],
  fill: { kind: 'blocks', type: 'person', min: 1, max: 1 },
};

const cennik = {
  key: 'cennik', label: 'Cennik', frame: 'cennik',
  data: {
    title: 'Co wchodzi w skład',
    title_accent: 'Vault?',
    lead: 'Organizacja kupuje nie tylko narzędzie AI, ale wdrożony standard pracy: technologię, środowisko, rutyny i wsparcie adopcji.',
    price_label: 'Koszt abonamentu',
    price_note: 'netto',
    lines: 'Koszt realizacji warsztatów | w cenie abonamentu\nKoszt szkolenia | w cenie abonamentu\nKoszt sprzętu | w cenie abonamentu',
  },
  data_by_product: {
    [SAAS]: {
      title_accent: 'Gaius?',
      lead: 'Abonament obejmuje narzędzie, aktualne źródła prawa i pomoc we wdrożeniu zespołu.',
      lines: 'Dostęp dla zespołu | w cenie abonamentu\nAktualizacje źródeł | w cenie abonamentu\nWdrożenie i szkolenie | w cenie abonamentu',
    },
    [ONPREM]: {
      lines: 'Koszt realizacji warsztatów | w cenie abonamentu\nKoszt szkolenia | w cenie abonamentu\nInfrastruktura | po stronie organizacji, konfiguracja w cenie',
    },
  },
  draft: [SAAS, ONPREM],
  fill: { kind: 'blocks', type: 'package', min: 3, max: 3 },
};

const czymJestOverrides = { [SAAS]: { title_accent: 'Gaius?' } };

export const scenarios = [
  {
    id: 'rola:zarzad',
    name: 'Zarząd',
    steps: [
      okladka,
      {
        key: 'bole', label: 'Problemy klienta', frame: 'problemy',
        data: {
          title: 'Co dziś **kosztuje** Waszą organizację?',
          lead: 'Zebraliśmy to, co usłyszeliśmy w rozmowie. Każdy z tych punktów ma swoje rozwiązanie w dalszej części.',
          note: 'Celem nie jest kolejne narzędzie. Celem jest mniej pracy odtwórczej przy tym samym zespole.',
        },
        fill: { kind: 'pains' },
      },
      {
        key: 'dlaczego', label: 'Dlaczego Gaius', frame: 'dlaczego',
        data: { title: 'Dlaczego ', title_accent: 'Vault?', lead: 'Gaius Vault łączy technologię, źródła, dokumenty, wdrożenie i adopcję w jednym modelu.' },
        data_by_product: { [SAAS]: { title_accent: 'Gaius?', lead: 'Gaius łączy technologię, źródła prawa, Wasze dokumenty i wdrożenie zespołu w jednym abonamencie.' } },
        draft: [SAAS],
        fill: { kind: 'picks', set: 'dlaczego' },
      },
      {
        key: 'rozwiazania', label: 'Jak rozwiązujemy', frame: 'use-case',
        data: { title: 'Jak Gaius rozwiązuje Wasze problemy', lead: 'Dla każdego problemu: co robi Gaius i co zyskuje organizacja.' },
        fill: { kind: 'blocks', type: 'rozwiazanie', min: 2, max: 3 },
      },
      architektura,
      wdrozenie,
      cennik,
      kontakt,
    ],
  },
  {
    id: 'rola:champion',
    name: 'Champion',
    steps: [
      okladka,
      {
        key: 'bole', label: 'Problemy klienta', frame: 'problemy',
        data: {
          title: 'Z czym **mierzy się** Twój zespół?',
          lead: 'To, co słyszymy od prawników w podobnych zespołach i co padło w naszej rozmowie.',
          note: 'Każdy z tych problemów ma konkretne rozwiązanie, które pokażesz zespołowi na jego dokumentach.',
        },
        fill: { kind: 'pains' },
      },
      {
        key: 'czym-jest', label: 'Czym jest Gaius', frame: 'czym-jest',
        data: { title: 'Czym jest ', title_accent: 'Vault?', lead: 'Prywatne środowisko Legal AI, które łączy źródła prawne, dokumenty organizacji i standard pracy zespołu.' },
        data_by_product: { [SAAS]: { ...czymJestOverrides[SAAS], lead: 'Legal AI, które łączy źródła prawne, dokumenty zespołu i wspólny standard pracy.' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'pillar', min: 3, max: 3 },
      },
      {
        key: 'rozwiazania', label: 'Jak rozwiązujemy', frame: 'use-case',
        data: { title: 'Jak Gaius rozwiązuje Wasze problemy', lead: 'Konkretnie: co robi Gaius i co zyskujesz Ty i Twój zespół.' },
        fill: { kind: 'blocks', type: 'rozwiazanie', min: 3, max: 3 },
      },
      {
        key: 'przypadki', label: 'Przypadki użycia', frame: 'use-case',
        data: {
          title: 'Vault w codziennej praktyce',
          lead: 'Gaius Vault zamienia najczęstsze punkty styku biznesu z działem prawnym w powtarzalne rutyny: od akceptacji umów, przez reakcję na spór, po wykorzystanie wcześniejszych opinii i standardów.',
        },
        data_by_product: { [SAAS]: { title: 'Gaius w codziennej praktyce', lead: 'Gaius zamienia najczęstsze zadania zespołu w powtarzalne rutyny: od akceptacji umów, przez reakcję na spór, po wykorzystanie wcześniejszych opinii.' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'use_case', min: 3, max: 6 },
      },
      {
        key: 'sygnaly', label: 'Sygnały gotowości', frame: 'sygnaly',
        data: {
          title: 'Sygnał, że zespół jest',
          title_2: 'gotowy na',
          title_accent: 'Vault?',
          lead: 'Nie chodzi o samą technologię. Chodzi o moment, w którym Legal AI powinno stać się standardem pracy zespołu.',
          note: 'Gaius pomaga zamienić te sygnały w plan wdrożenia: procesy, rutyny i mierzalny efekt.',
        },
        data_by_product: { [SAAS]: { title_accent: 'Gaius?' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'signal', min: 4, max: 4 },
      },
      architektura,
      {
        key: 'porownanie', label: 'Porównanie', frame: 'porownanie',
        data: {
          title: 'Gaius vs składanie Legal AI z kilku narzędzi',
          lead: 'Większość rozwiązań rozwiązuje jeden fragment problemu. Gaius Vault dostarcza kompletny standard pracy prawnej z AI — w ramach jednej licencji.',
          col_area: 'Obszar', col_them: 'Kilka narzędzi AI / LegalTech', col_us: 'Gaius Vault',
        },
        data_by_product: { [SAAS]: { lead: 'Większość rozwiązań rozwiązuje jeden fragment problemu. Gaius łączy źródła prawa, dokumenty i pisma w jednym narzędziu.', col_us: 'Gaius' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'comparison', min: 5, max: 7 },
      },
      wdrozenie,
      kontakt,
    ],
  },
];
