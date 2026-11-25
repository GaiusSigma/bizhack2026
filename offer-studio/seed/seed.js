// Dane startowe, wczytywane tylko do PUSTEJ bazy. Treść pochodzi z gaius-offer.figcraft.
// Format jest taki sam jak eksport z /api/export (bez assetów, te leżą w seed/assets/).
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

// ------------------------------------------------------------------ motyw (wspólny CSS)
const theme_css = `
:root {
  --ink: #1d1f21; --muted: #6f737a; --accent: #ce5e64; --accent-dark: #9b5155;
  --line: #cebfa6; --sand: #f3ede2; --soft: #f9f9f9; --paper: #ffffff;
}
.slide { background: var(--paper); color: var(--ink); font-family: 'Figtree', system-ui, sans-serif; }
.slide .pattern { position: absolute; inset: 0; background: url(/assets/triangles) center / 100% 100% no-repeat; pointer-events: none; }
.slide .content { position: relative; height: 100%; padding: 96px 100px; display: flex; flex-direction: column; }
:where(.slide h1, .slide h2, .slide h3, .slide p, .slide ol, .slide ul, .slide dl) { margin: 0; }
.slide strong { font-weight: inherit; color: var(--accent); }
.h1 { font-size: 86px; font-weight: 700; line-height: 1.08; letter-spacing: -0.01em; }
.lead { font-size: 28px; line-height: 1.45; max-width: 1150px; margin-top: 28px; }
.muted { color: var(--muted); }
.card { background: #fff; border: 2px solid var(--line); padding: 30px 32px; }
.card h3 { font-size: 28px; font-weight: 600; line-height: 1.25; margin-bottom: 12px; }
.card p, .card li { font-size: 19px; line-height: 1.5; }
.card p + p { margin-top: 10px; }
.note { margin-top: auto; font-size: 30px; font-weight: 600; line-height: 1.35; max-width: 1400px; padding-left: 28px; border-left: 8px solid var(--accent); }
`;

// ------------------------------------------------------------------ layouty slajdów
const layout = (id, name, description, template, css) => ({ id, name, description, template: template.trim(), css: css.trim(), created_at: ts, updated_at: ts });

const layouts = [
  layout('cover', 'Okładka', 'Tytuł oferty. data: title, subtitle, subtitle_accent, lead. Klient z oferty: offer.client.', `
<img class="cover-bg" src="/assets/home-bg" alt="">
<div class="pattern"></div>
<div class="content">
  <div class="brand">
    <img class="brand-logo" src="/assets/gaius-logo" alt="Gaius-Lex">
    <span class="brand-sep"></span>
    <span class="brand-for">OFERTA DLA{{#if offer.client}} <b>{{upper offer.client}}</b>{{/if}}</span>
  </div>
  <div class="cover-main">
    <h1 class="cover-title">{{data.title}}</h1>
    <div class="cover-bar"></div>
    <p class="cover-sub">{{data.subtitle}} <span>{{data.subtitle_accent}}</span></p>
    <p class="cover-lead">{{data.lead}}</p>
  </div>
</div>`, `
.layout-cover .cover-bg { position: absolute; left: 476px; top: 0; width: 1448px; height: 1086px; object-fit: cover; }
.layout-cover .brand { display: flex; align-items: center; gap: 24px; }
.layout-cover .brand-logo { height: 58px; }
.layout-cover .brand-sep { width: 4px; height: 48px; background: var(--accent); }
.layout-cover .brand-for { font-size: 20px; font-weight: 500; letter-spacing: .04em; }
.layout-cover .brand-for b { font-weight: 700; }
.layout-cover .cover-main { margin-top: 150px; max-width: 1200px; }
.layout-cover .cover-title { font-size: 148px; font-weight: 700; line-height: 1.1; }
.layout-cover .cover-bar { width: 248px; height: 8px; background: var(--accent); margin: 40px 0 44px; }
.layout-cover .cover-sub { font-size: 64px; line-height: 1.2; }
.layout-cover .cover-sub span { display: block; color: var(--accent); font-weight: 500; }
.layout-cover .cover-lead { font-size: 32px; line-height: 1.4; margin-top: 36px; max-width: 1080px; }`),

  layout('cards', 'Karty', 'Tytuł + lead + siatka kart z bloków (title, body, opcjonalnie effect). data: title (**słowo** = akcent), lead, columns, effect_label, note.', `
<div class="pattern"></div>
<div class="content">
  <h2 class="h1">{{mdi data.title}}</h2>
  {{#if data.lead}}<p class="lead">{{data.lead}}</p>{{/if}}
  <div class="cards" style="--cols: {{or data.columns 3}}">
    {{#each blocks}}
    <article class="card" data-block="{{id}}">
      <h3>{{title}}</h3>
      {{md body}}
      {{#if effect}}<p class="effect"><b>{{or ../data.effect_label "Efekt dla biznesu:"}}</b> {{effect}}</p>{{/if}}
    </article>
    {{/each}}
  </div>
  {{#if data.note}}<p class="note">{{mdi data.note}}</p>{{/if}}
</div>`, `
.layout-cards .cards { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 28px; margin-top: 72px; }
.layout-cards .card .effect { color: var(--muted); margin-top: 14px; }
.layout-cards .card .effect b { color: var(--ink); font-weight: 600; }
.layout-cards .note { margin-top: auto; }`),

  layout('numbered', 'Lista numerowana', 'Tytuł i lead po lewej, numerowane bloki po prawej. data: title, lead, note.', `
<div class="pattern"></div>
<div class="content numbered-wrap">
  <div class="left">
    <h2 class="h1">{{mdi data.title}}</h2>
    {{#if data.lead}}<p class="lead">{{data.lead}}</p>{{/if}}
    {{#if data.note}}<p class="note">{{mdi data.note}}</p>{{/if}}
  </div>
  <ol class="items">
    {{#each blocks}}
    <li data-block="{{id}}">
      <span class="num">{{inc @index}}</span>
      <div><h3>{{title}}</h3>{{md body}}</div>
    </li>
    {{/each}}
  </ol>
</div>`, `
.layout-numbered .numbered-wrap { flex-direction: row; gap: 96px; align-items: center; }
.layout-numbered .left { flex: 0 0 640px; display: flex; flex-direction: column; }
.layout-numbered .left .note { margin-top: 48px; font-size: 26px; }
.layout-numbered .items { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 26px; }
.layout-numbered .items li { display: flex; gap: 28px; align-items: flex-start; background: #fff; border: 2px solid var(--line); padding: 26px 32px; }
.layout-numbered .num { flex: 0 0 56px; height: 56px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 26px; font-weight: 700; display: grid; place-items: center; }
.layout-numbered h3 { font-size: 28px; font-weight: 600; margin-bottom: 6px; }
.layout-numbered .items p { font-size: 19px; line-height: 1.5; color: var(--ink); }`),

  layout('steps', 'Kroki (proces)', 'Kroki w poziomie + wyróżnione hasło. data: title, lead, quote, quote_lead.', `
<div class="pattern"></div>
<div class="content">
  {{#if data.title}}<h2 class="h1">{{mdi data.title}}</h2>{{/if}}
  {{#if data.lead}}<p class="lead">{{data.lead}}</p>{{/if}}
  <ol class="steps" style="--n: {{blocks.length}}">
    {{#each blocks}}
    <li data-block="{{id}}"><span class="n">{{inc @index}}.</span><h3>{{title}}</h3>{{md body}}</li>
    {{/each}}
  </ol>
  {{#if data.quote}}
  <div class="quote"><p class="q">{{mdi data.quote}}</p>{{#if data.quote_lead}}<p class="ql">{{data.quote_lead}}</p>{{/if}}</div>
  {{/if}}
</div>`, `
.layout-steps .steps { list-style: none; padding: 0; margin: 64px 0 0; display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 24px; }
.layout-steps .steps li { border-top: 6px solid var(--accent); padding-top: 26px; }
.layout-steps .n { display: block; font-size: 64px; font-weight: 700; color: var(--accent); line-height: 1; margin-bottom: 18px; }
.layout-steps h3 { font-size: 28px; font-weight: 600; line-height: 1.25; margin-bottom: 12px; }
.layout-steps .steps p { font-size: 19px; line-height: 1.5; }
.layout-steps .quote { margin-top: auto; background: var(--sand); padding: 44px 56px; }
.layout-steps .quote .q { font-size: 48px; font-weight: 700; line-height: 1.2; white-space: pre-line; }
.layout-steps .quote .ql { font-size: 24px; margin-top: 14px; color: var(--muted); }`),

  layout('comparison', 'Porównanie', 'Tabela: obszar | oni | my. Bloki typu comparison (title, them, us). data: title, lead, col_area, col_them, col_us.', `
<div class="pattern"></div>
<div class="content">
  <h2 class="h1 small">{{mdi data.title}}</h2>
  {{#if data.lead}}<p class="lead">{{data.lead}}</p>{{/if}}
  <table class="cmp">
    <thead><tr><th>{{or data.col_area "Obszar"}}</th><th>{{or data.col_them "Inne rozwiązania"}}</th><th class="us">{{or data.col_us "Gaius Vault"}}</th></tr></thead>
    <tbody>
      {{#each blocks}}
      <tr data-block="{{id}}"><td class="area">{{title}}</td><td class="them">{{them}}</td><td class="us">{{us}}</td></tr>
      {{/each}}
    </tbody>
  </table>
</div>`, `
.layout-comparison .h1.small { font-size: 64px; }
.layout-comparison .cmp { margin-top: 48px; width: 100%; border-collapse: collapse; font-size: 22px; }
.layout-comparison th { text-align: left; font-size: 20px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); padding: 0 24px 16px; }
.layout-comparison th.us { color: var(--accent); }
.layout-comparison td { padding: 18px 24px; border-top: 2px solid var(--line); line-height: 1.35; }
.layout-comparison td.area { font-weight: 600; width: 22%; }
.layout-comparison td.them { color: var(--muted); width: 36%; }
.layout-comparison td.us { background: var(--sand); font-weight: 500; }`),

  layout('pricing', 'Cennik', 'Składniki pakietu (bloki package) + cena z oferty (offer.price). data: title, lead, price_label, price_note, lines (każda linia: "etykieta | wartość").', `
<div class="pattern"></div>
<div class="content">
  <h2 class="h1">{{mdi data.title}}</h2>
  {{#if data.lead}}<p class="lead">{{data.lead}}</p>{{/if}}
  <div class="pricing">
    <div class="packages" style="--cols: {{blocks.length}}">
      {{#each blocks}}
      <article class="card" data-block="{{id}}"><span class="n">{{inc @index}}</span><h3>{{title}}</h3>{{md body}}</article>
      {{/each}}
    </div>
    <aside class="price">
      <p class="label">{{or data.price_label "Koszt abonamentu"}}</p>
      <p class="value">{{or offer.price "------"}} <small>zł / mies</small></p>
      <p class="netto">{{or data.price_note "netto"}}</p>
      <dl>
        {{#each (lines data.lines)}}{{#with (split this "|")}}<div><dt>{{this.[0]}}</dt><dd>{{this.[1]}}</dd></div>{{/with}}{{/each}}
      </dl>
    </aside>
  </div>
</div>`, `
.layout-pricing .pricing { display: flex; gap: 32px; margin-top: 56px; flex: 1; min-height: 0; }
.layout-pricing .packages { flex: 1; display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 24px; align-content: start; }
.layout-pricing .packages .n { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--accent); color: #fff; font-weight: 700; font-size: 20px; margin-bottom: 16px; }
.layout-pricing .packages ul { margin: 0; padding-left: 22px; }
.layout-pricing .packages li { margin: 6px 0; }
.layout-pricing .price { flex: 0 0 470px; background: var(--ink); color: #fff; padding: 40px; align-self: start; }
.layout-pricing .price .label { font-size: 22px; color: #c9c9c9; }
.layout-pricing .price .value { font-size: 64px; font-weight: 700; margin-top: 8px; }
.layout-pricing .price .value small { font-size: 26px; font-weight: 500; }
.layout-pricing .price .netto { font-size: 20px; color: #c9c9c9; }
.layout-pricing dl { margin: 32px 0 0; }
.layout-pricing dl div { border-top: 1px solid #44474b; padding: 14px 0; }
.layout-pricing dt { font-size: 20px; }
.layout-pricing dd { margin: 4px 0 0; font-size: 18px; color: var(--accent); font-weight: 600; }`),

  layout('contact', 'Kontakt', 'Zamknięcie z osobą kontaktową (blok person: title, role, email, phone). data: kicker, title, text.', `
<div class="pattern"></div>
<div class="content contact">
  <img class="brand-logo" src="/assets/gaius-logo" alt="Gaius-Lex">
  <p class="kicker">{{or data.kicker "ZACZNIJMY WSPÓŁPRACĘ"}}</p>
  <h2 class="h1">{{mdi data.title}}</h2>
  {{#if data.text}}<div class="text">{{md data.text}}</div>{{/if}}
  <div class="people">
    {{#each blocks}}
    <div class="person" data-block="{{id}}">
      <p class="name">{{title}}</p><p class="role">{{role}}</p>
      <p class="reach">{{email}}{{#if phone}}<br>{{phone}}{{/if}}</p>
    </div>
    {{/each}}
  </div>
</div>`, `
.layout-contact .brand-logo { height: 58px; align-self: flex-start; }
.layout-contact .kicker { margin-top: 120px; font-size: 22px; font-weight: 600; letter-spacing: .08em; color: var(--accent); }
.layout-contact .h1 { margin-top: 20px; max-width: 1300px; }
.layout-contact .text { font-size: 26px; line-height: 1.5; max-width: 1250px; margin-top: 32px; }
.layout-contact .people { margin-top: auto; display: flex; gap: 64px; }
.layout-contact .person { border-left: 8px solid var(--accent); padding-left: 28px; }
.layout-contact .name { font-size: 36px; font-weight: 700; }
.layout-contact .role { font-size: 22px; color: var(--muted); margin-top: 4px; }
.layout-contact .reach { font-size: 22px; margin-top: 14px; line-height: 1.5; }`),

  layout('image', 'Obraz na cały slajd', 'Gotowa grafika (np. eksport z FigCraft). data: asset (id obrazka z zakładki Obrazki), fit (contain/cover).', `
<img class="full" src="/assets/{{data.asset}}" alt="" style="object-fit: {{or data.fit "contain"}}">`, `
.layout-image .full { position: absolute; inset: 0; width: 100%; height: 100%; }`),

  layout('html', 'Wolny HTML', 'Dowolny HTML slajdu w data.html (dla jednorazowych slajdów).', `
<div class="content">{{{data.html}}}</div>`, ''),
];

// ------------------------------------------------------------------ oferta bazowa
const slide = (id, position, layout_id, data, block_ids = []) => ({
  id, offer_id: 'gaius-vault-bazowa', position, layout_id, data, block_ids, query: null, hidden: false, created_at: ts, updated_at: ts,
});
const ids = (type) => blocks.filter((b) => b.type === type).map((b) => b.id);

const slides = [
  slide('s-okladka', 0, 'cover', {
    title: 'Gaius Vault',
    subtitle: 'Legal AI, które możesz dopuścić',
    subtitle_accent: 'do realnej pracy prawnej',
    lead: 'Prywatne Legal AI do pracy na realnych dokumentach - lokalnie, w jednej licencji, pod kontrolą organizacji.',
  }),
  slide('s-problem', 1, 'cards', {
    title: 'Gdzie ucieka czas **działu prawnego?**',
    lead: 'Najwięcej kosztuje nie sama analiza, ale każdorazowe odtwarzanie drogi do odpowiedzi.',
    columns: 3,
    note: 'Problemem nie jest liczba spraw. Problemem jest powtarzanie tej samej drogi do odpowiedzi.',
  }, ids('problem')),
  slide('s-czym-jest', 2, 'numbered', {
    title: 'Czym jest **Vault?**',
    lead: 'Prywatne środowisko Legal AI, które łączy źródła prawne, dokumenty organizacji i standard pracy zespołu.',
  }, ids('pillar')),
  slide('s-dlaczego', 3, 'cards', {
    title: 'Dlaczego **Vault?**',
    lead: 'Gaius Vault łączy technologię, źródła, dokumenty, wdrożenie i adopcję w jednym modelu.',
    columns: 3,
  }, ids('differentiator')),
  slide('s-sygnaly', 4, 'numbered', {
    title: 'Sygnał, że dział prawny jest gotowy na **Vault?**',
    lead: 'Nie chodzi o samą technologię. Chodzi o moment, w którym Legal AI powinno stać się standardem pracy zespołu.',
    note: 'Gaius Vault pomaga zamienić te sygnały w plan wdrożenia: procesy, rutyny i mierzalny efekt.',
  }, ids('signal')),
  slide('s-wdrozenie', 5, 'steps', {
    title: 'Jak wygląda **wdrożenie**',
    quote: 'Nie wdrażamy dostępu.\nWdrażamy sposób pracy.',
    quote_lead: 'Dlatego Vault obejmuje nie tylko technologię, ale też proces, rutyny i zasady odpowiedzialności.',
  }, ids('step')),
  slide('s-use-case', 6, 'cards', {
    title: 'Vault w **codziennej praktyce**',
    lead: 'Gaius Vault zamienia najczęstsze punkty styku biznesu z działem prawnym w powtarzalne rutyny: od akceptacji umów, przez reakcję na spór, po wykorzystanie wcześniejszych opinii i standardów.',
    columns: 3,
  }, ids('use_case')),
  slide('s-architektura', 7, 'image', { asset: 'architektura', fit: 'contain' }),
  slide('s-porownanie', 8, 'comparison', {
    title: 'Gaius vs składanie Legal AI **z kilku narzędzi**',
    lead: 'Większość rozwiązań rozwiązuje jeden fragment problemu. Gaius Vault dostarcza kompletny standard pracy prawnej z AI — w ramach jednej licencji.',
    col_area: 'Obszar', col_them: 'Kilka narzędzi AI / LegalTech', col_us: 'Gaius Vault',
  }, ids('comparison')),
  slide('s-cennik', 9, 'pricing', {
    title: 'Co wchodzi w skład **Vault?**',
    lead: 'Organizacja kupuje nie tylko narzędzie AI, ale wdrożony standard pracy: technologię, środowisko, rutyny i wsparcie adopcji.',
    price_label: 'Koszt abonamentu',
    price_note: 'netto',
    lines: 'Koszt realizacji warsztatów | w cenie abonamentu\nKoszt szkolenia | w cenie abonamentu\nKoszt sprzętu | w cenie abonamentu',
  }, ['pkg-technologia', 'pkg-srodowisko', 'pkg-legal-engineering']),
  slide('s-kontakt', 10, 'contact', {
    kicker: 'ZACZNIJMY WSPÓŁPRACĘ',
    title: 'Bezpieczne Legal AI **w Twojej organizacji**',
    text: 'Jeśli chcesz przyspieszyć research prawny, lepiej kontrolować ryzyka i bezpiecznie wykorzystać AI w swojej firmie, zostaw nam kontakt. Krótka rozmowa wystarczy, żebyśmy zrozumieli specyfikę Twojej organizacji i zaproponowali sensowny zakres pilotażu — od bezpiecznego wdrożenia testowego po pełne wdrożenie on-premise lub model hybrydowy.',
  }, ['person-janusz']),
];

export default {
  format: 'offer-studio',
  version: 1,
  exported_at: ts,
  settings: { theme_css },
  blocks,
  layouts,
  offers: [{ id: 'gaius-vault-bazowa', name: 'Gaius Vault – oferta bazowa', data: { client: '', price: '------' }, created_at: ts, updated_at: ts }],
  slides,
  assets: [],
};
