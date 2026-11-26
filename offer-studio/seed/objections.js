// Objections clients raise and how we answer them, plus client testimonials.
// Source: the sales sheet "Gaius Work Templates.xlsx", translated once. The objection and its quotes come from
// the "Bóle (Fireflies)" tab (rows of type OBIEKCJA); every answer is taken from what sales already says in the
// "PRKW", "cold mail", "Prawny – produkcja v2" and "Prawny – produkcja (FS)" tabs. Nothing here is new product
// fact: an objection the sheet has no answer for is marked `no_answer`, so the copy model does not invent one.
// data.by_product: the answer for that product when it differs (SaaS, Vault, on-premise are different promises).

const ts = '2026-11-26T00:00:00.000Z';
const ALL = ['segment:law-firm', 'segment:in-house', 'segment:public-sector'];
const objection = (id, title, body, data, segments = ALL) => ({
  id, type: 'objection', title, body, data, tags: [...segments], created_at: ts, updated_at: ts,
});

export const objectionBlocks = [
  objection('obj-vs-general-ai', 'How is this different from Copilot, ChatGPT or the AI in LEX?',
    'A general chatbot does not know Polish case law well and can make up a case number. Gaius works on Polish statutes and case law, shows the source of every answer and is built for daily legal work: research, document analysis and drafting.',
    {
      quotes: ['how is this different from Copilot?', 'do they need it if they already have AI in LEX or ChatGPT Pro?', 'in what way is it worse than ChatGPT?'],
      by_product: {
        'product:vault': 'A general chatbot does not know Polish case law well and can make up a case number. Gaius works on Polish statutes and case law and shows the source of every answer. Copilot is a good general tool, but the provider’s cloud processes the data; Gaius Vault keeps your documents out of model training, and both tools can work side by side.',
        'product:on-prem': 'Copilot is a good general tool, but the provider’s cloud processes the data and it knows Polish law only in general. Gaius Vault runs in your infrastructure, so it handles the documents that should not go to that cloud, and its legal layer is built on Polish statutes and case law. Both tools can work side by side.',
      },
      source: 'Sales sheet, tab "Bóle (Fireflies)" (objection); answers from tab "cold mail" rows 1 and 3, tab "Prawny – produkcja v2" row 1',
    }),
  objection('obj-formal-security', 'Does the model learn from our data, where are the files, is there a security pack?',
    'Your documents are never used to train models. Files on My drive are always encrypted, the user holds the keys, and the encryption is post-quantum (PQC) from the start. Gaius is hosted in the European Economic Area.',
    {
      quotes: ['paperwork we can show our clients', 'to China… to what extent does that release data outside?', 'how are you prepared for a data leak?'],
      by_product: {
        'product:vault': 'Your documents are never used to train models, access is set per team and matter, and files on My drive are always encrypted with keys held by the user (post-quantum encryption from the start).',
        'product:on-prem': 'The models run locally, so data never reaches their provider. Outbound traffic is optional and goes through a proxy you control; for legal research only a paraphrased, general question goes out, which the user can approve, and in the fully local variant nothing goes out. A security pack for IT is ready: architecture, network and outbound traffic, models, updates and the security policy.',
      },
      source: 'Sales sheet, tab "Bóle (Fireflies)" (objection); answers from tab "cold mail" rows 1–4, tab "Prawny – produkcja v2" rows 2–3, tab "Prawny – produkcja (FS)" row 4; no training on documents: the base deck’s Security slide',
    }),
  objection('obj-second-database', 'We don’t want a second document database',
    'Gaius works on your documents where they already are: it connects to SharePoint, OneDrive, Google Drive, Outlook and Gmail and answers from their content, without building a second database.',
    {
      quotes: ['we have to build an alternative database… is that right?', 'we already have our internal case management system: will the endpoints be open enough?', 'moving things to a folder would take too much time'],
      by_product: {
        'product:on-prem': 'Gaius Vault works on your repositories (e.g. SharePoint) instead of building a second database, and it has an open API for your own systems.',
      },
      note: 'Integration with EZD or a specific case management system is not confirmed in the sheet: do not promise it by name.',
      source: 'Sales sheet, tab "Bóle (Fireflies)" (objection); answers from tab "PRKW" row 3, tab "Prawny – produkcja v2" rows 1 and 3',
    }),
  objection('obj-cost', 'Cost and predictability: limits, tokens, on-premise costing more than SaaS',
    'Gaius in the cloud comes in lite, standard and pro plans with a 14-day trial, so the team checks it on real matters before paying.',
    {
      quotes: ['the advantage of a solution almost three times as expensive', 'so that there are no usage limits', 'a heavy agent can kill you on cost'],
      by_product: {
        'product:vault': 'A fixed monthly licence per compute unit: no fee per user and no token billing, so the cost does not grow with every person who uses it. A 1–3 month pilot comes before the decision.',
        'product:on-prem': 'A fixed monthly licence per compute unit: no fee per user and no token billing, which at heavy use can kill you on cost. The hardware can be bought or, in some configurations, rented, depending on how you prefer to budget it. A 1–3 month pilot comes before the decision.',
      },
      source: 'Sales sheet, tab "Bóle (Fireflies)" (objection); answers from tab "PRKW" row 10, tab "Prawny – produkcja v2" rows 1 and 4, tab "cold mail" rows 4–8, tab "ICP" row 1',
    }),
  objection('obj-draft-quality', 'Quality of drafts and no commentaries, compared with LEX or Legalis',
    'Gaius shows the sources of every answer and the lawyer makes the final assessment: it shortens the search and organises the material, it does not replace your expertise. Drafts are prepared on your own templates and documents, also directly in the Word add-in.',
    {
      quotes: ['there are no commentaries here', 'the generated contract is not really a contract'],
      note: 'The sheet does not say Gaius has legal commentaries: never claim it. Do not promise a contract written from scratch; talk about working on the client’s templates.',
      source: 'Sales sheet, tab "Bóle (Fireflies)" (objection); answers from tab "cold mail" row 2, tab "PRKW" row 6 (with its note)',
    }, ['segment:law-firm', 'segment:in-house']),
  objection('obj-decision-blocked', 'IT is blocking it, the leadership is sceptical, the process is long',
    'Start small: a 14-day trial account, tested on a matter you are working on anyway (material without confidential data is enough to begin), and the result is what you show the decision makers.',
    {
      quotes: ['IT is blocking us a bit', 'the leadership was very sceptical', 'I have a conversation with my bosses ahead… and my IT person’s opinion'],
      by_product: {
        'product:vault': 'A 1–3 month pilot on your real matters before any longer contract; rollout and consultations with the team are on us. We prepare a short technical note for your CIO or CISO.',
        'product:on-prem': 'A 1–3 month pilot before any decision: we deliver the server with the models, the installation and the configuration, IT only provides one IP address, and for the test the server can be isolated from the rest of the network. We prepare a short technical note for your CIO or CISO.',
      },
      by_segment: {
        'segment:public-sector': 'The pilot gives you concrete material for the description of the procurement and the justification of the spend, before any purchasing decision.',
      },
      source: 'Sales sheet, tab "Bóle (Fireflies)" (objection); answers from tab "cold mail" rows 3, 6 and 8, tab "Prawny – produkcja v2" rows 2–3, tab "Prawny – produkcja (FS)" row 4',
    }, ['segment:in-house', 'segment:public-sector']),
  objection('obj-adoption', 'The team has no time or patience for a new tool',
    'We build skills together with the team in three workshops: gathering needs, working on a concrete example, adjustments after tests. From the start the tool does what the team does every day, to its own standard, and we train people on their real matters.',
    {
      quotes: ['if something does not work the way they are used to, it does not work for them', 'it overwhelms us cognitively', 'I won’t have time for this'],
      source: 'Sales sheet, tab "Bóle (Fireflies)" (objection); answers from tab "PRKW" row 15, tab "cold mail" row 6',
    }, ['segment:law-firm', 'segment:in-house']),
  objection('obj-model-ageing', 'Will the model become outdated? Is a small model weaker than the big ones?',
    'Answers rely on a database of legal sources updated daily and cite the statutes and rulings they use.',
    {
      quotes: ['won’t we be left with an outdated model?', 'will it develop as fast as the big foreign products?'],
      no_answer: true,
      note: 'The sheet has no answer about model updates or model size: do not promise either; offer a conversation with our technical team.',
      source: 'Sales sheet, tab "Bóle (Fireflies)" (objection); partial answer from tab "PRKW" row 1',
    }, ['segment:law-firm', 'segment:in-house']),
];

// What we know about the tools clients compare us with, for the comparison slide. Only what the sales sheet says:
// `them` is the tool's side, worded to fit the slide (max 60 characters) and copied as it is; `us` is our side,
// per product where the promise differs. `their_strength` marks a point where the tool is ahead: use it only when
// the client raised it. A tool not listed here gets no facts, so the slide may only repeat what the client said.
const tool = (id, title, aliases, facts, source) => ({
  id, type: 'competitor', title, body: '', data: { aliases, facts, source }, tags: [...ALL], created_at: ts, updated_at: ts,
});
const fact = (area, them, us, extra = {}) => ({ area, them, ...(typeof us === 'string' ? { us } : { us_by_product: us }), ...extra });

export const competitorBlocks = [
  tool('tool-copilot', 'Microsoft Copilot', ['Copilot', 'Microsoft Copilot', 'M365 Copilot', 'Copilota', 'Copilotem'], [
    fact('Purpose', 'A general tool for office work', 'Built for legal work: research, documents, drafts',
      { source: 'tab "cold mail" row 3 (follow-up 5): a good general tool' }),
    fact('Where data goes', 'Processed in the provider’s cloud', {
      'product:saas': 'Hosted in the EEA, files encrypted, user holds keys',
      'product:vault': 'Private environment, never used to train models',
      'product:on-prem': 'Stays on your server, on local models',
    }, { source: 'tab "cold mail" rows 3 and 8 (follow-up 5)' }),
    fact('Polish law', 'Knows Polish law only in general', 'Polish statutes and case law, with sources',
      { source: 'tab "cold mail" row 3 (follow-up 5); tab "Prawny – produkcja v2" row 1' }),
    fact('Side by side', 'Can stay for general office work', {
      'product:saas': 'Takes the legal work: research, contracts, drafts',
      'product:vault': 'Takes the documents that must stay private',
      'product:on-prem': 'Takes documents that must not go to the cloud',
    }, { source: 'tab "cold mail" rows 3 and 8 (follow-up 5): both tools can work side by side' }),
  ], 'Sales sheet, tabs "cold mail" and "Prawny – produkcja v2"'),
  tool('tool-chatgpt', 'ChatGPT', ['ChatGPT', 'ChatGPT-a', 'GPT', 'OpenAI', 'czat GPT', 'chatbot', 'general AI chatbots'], [
    fact('Citations', 'Can make up rulings and statute numbers', 'Cites the statute or ruling behind every answer',
      { source: 'tab "Bóle (Fireflies)": "five rulings, three did not exist"; tab "PRKW" row 1' }),
    fact('Polish case law', 'Does not know Polish case law well', 'Polish statutes and case law, updated daily',
      { source: 'tab "cold mail" row 1 (follow-up 4); tab "PRKW" row 1' }),
    fact('Document work', 'Gives information, does not draft or check', 'Drafts on your templates and checks contracts',
      { source: 'tab "Bóle (Fireflies)": ChatGPT "only gives information"; tab "PRKW" rows 2 and 6' }),
    fact('Into Word', 'Text copied into Word and formatted by hand', 'Drafts directly in the Word add-in',
      { source: 'tab "Bóle (Fireflies)": copying from the chat to Word; tab "PRKW" row 6' }),
    fact('Data control', 'Free accounts outside your organisation’s control', {
      'product:saas': 'One official tool, files encrypted, keys with users',
      'product:vault': 'One official tool, never used to train models',
      'product:on-prem': 'One official tool on your own server',
    }, { source: 'tab "Bóle (Fireflies)" (shadow AI); tab "PRKW" row 4' }),
  ], 'Sales sheet, tabs "Bóle (Fireflies)", "PRKW" and "cold mail"'),
  tool('tool-lex-legalis', 'LEX / Legalis', ['LEX', 'Lex', 'Lexa', 'Leksie', 'Lex AI', 'Legalis', 'Legalisie', 'Wolters Kluwer', 'C.H. Beck'], [
    fact('Case law', 'Users we spoke to often miss rulings', 'Rulings with case numbers, checked at the source',
      { source: 'tab "Bóle (Fireflies)": "on Legalis or LEX rulings are often simply missing" (in-house); tab "PRKW" row 1' }),
    fact('AI assistant', 'Its AI was weaker than users expected', 'Answers with sources, drafts on your templates',
      { source: 'tab "Bóle (Fireflies)": Lex AI "much weaker than I expected"; tab "PRKW" rows 1 and 6' }),
    fact('Commentaries', 'Has legal commentaries', 'No commentaries: statutes and case law with sources',
      { source: 'tab "Bóle (Fireflies)" (objection: "there are no commentaries here")', their_strength: true }),
  ], 'Sales sheet, tabs "Bóle (Fireflies)" and "PRKW"'),
];

// Testimonials. The sheet notes that consent to quote by name still has to be asked for (tab "PRKW", row 5),
// so the deck attributes them only by role; the names stay here for the sales team.
const testimonial = (id, title, body, data, tags) => ({
  id, type: 'testimonial', title, body, data, tags, created_at: ts, updated_at: ts,
});

export const testimonialBlocks = [
  testimonial('tm-litigation-deadlines', 'A litigation lawyer on deadlines and security',
    '“From the start Gaius was real help. It analyses limitation periods and claims very well and presents the results in tables with a description. When assessing arguments and risks it also shows which actions are urgent as deadlines approach. Data security was one of the main reasons I chose it.” (a lawyer at a law firm using Gaius)',
    { author: 'Marta Kudlik, Kancelaria Kudlik', quote_by_name: false, source: 'Sales sheet, tab "Testimonial"; consent to quote by name to be confirmed (tab "PRKW", row 5)' },
    ['segment:law-firm', 'pain:confidentiality', 'pain:board-pressure', 'pain:weak-case-law-search']),
  testimonial('tm-family-law-research', 'A legal counsel on research and first drafts',
    '“Of the several tools I tested, Gaius-Lex improves my work the most. I get to relevant rulings in family cases faster, and the draft letter is a solid starting point for my analysis. I save time on technical tasks and can spend it on the substance of the case.” (a legal counsel using Gaius)',
    { author: 'Justyna Kobiołka, legal counsel', quote_by_name: false, source: 'Sales sheet, tab "Testimonial"; consent to quote by name to be confirmed (tab "PRKW", row 5)' },
    ['segment:law-firm', 'pain:weak-case-law-search', 'pain:chatgpt-only-informs', 'pain:copy-to-word', 'pain:hallucinated-citations']),
];
