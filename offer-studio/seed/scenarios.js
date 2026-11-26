// The base deck: one presentation for every client, built on the 2026 Gaius deck (seed/gaius-deck.figcraft,
// made from the designer's file by seed/build-deck.mjs). Ten slides; most of the copy is written for each client
// by a model from the call transcript or the enquiry (n8n: GET/PUT /api/offers/:id/content).
//
// Step = a slide from the library (`frame`) + default copy (`data`) + a fill rule (`fill`).
//   fill.kind: none (copy only) | pains | blocks (blocks of `type`, from `min` to `max`) | picks (cards of a set).
//   data_by_product: copy overrides per product (the default copy is the Vault version).
//   data_by_role: copy overrides per role tile, for the reader's perspective (the default copy is written for
//     the Champion, who uses the tool and wins over the board); data_by_role_product: per role and product.
//     Same slides for every role: only the copy changes.
//   write: the fields a model writes for the client, each with what to write (`hint`) and a length limit
//     (`max` characters). A list field (a slide's repeated cards) has `min`/`max` items and `columns`.
//     `hint_by_role` / `hint_by_product` add what changes in that field for a role or a product (the model also
//     gets the role's and the product's writing brief).
//     Fields without `write` stay as in `data` (e.g. the security features, which come from product material).
//   optional: the slide starts hidden and is shown only once a model writes it (e.g. the comparison, which
//     only makes sense when the client mentioned another tool).
//   answers: which kinds of client tiles the slide answers (highlighting in the offer view).
// Order and copy are edited in the Scenarios tab.

const SAAS = 'product:saas';
const ONPREM = 'product:on-prem';
const VAULT = 'product:vault';
const BOARD = 'role:board';
const CHAMPION = 'role:champion';

// "label | value" lines, the format of list fields (#item:<field> cards).
const lines = (rows) => rows.map((r) => r.join(' | ')).join('\n');

export const DECK_TEMPLATE = { id: 'gaius-deck', name: 'Gaius deck 2026', file: 'gaius-deck.figcraft' };

const steps = [
  {
    key: 'title', label: 'Title', frame: 'title', answers: [],
    data: {
      title: 'Secure Legal AI\nfor your legal team',
      lead: 'A private Legal AI environment for research and document work, under your organisation’s control.',
    },
    data_by_product: {
      [SAAS]: { lead: 'Legal AI for research and document work: legal sources, your templates and ready drafts in one tool.' },
      [ONPREM]: { lead: 'Private Legal AI on your own infrastructure: documents never leave the organisation.' },
    },
    data_by_role: {
      [BOARD]: { lead: 'A private Legal AI that gives your lawyers back hours of research and drafting, with client data under your control.' },
    },
    data_by_role_product: {
      [BOARD]: {
        [SAAS]: { lead: 'Legal AI that gives your lawyers back hours of research and drafting, ready to test in a short pilot.' },
        [ONPREM]: { lead: 'Private Legal AI on your own infrastructure: faster legal work, and documents never leave the organisation.' },
      },
    },
    write: {
      title: { hint: 'A title that fits what the client asked about or discussed on the call, in their terms. 3–8 words, at most two lines (use \\n). Say what changes for them, not just their name. Never set the organisation against its own people (e.g. not "…, not your lawyers").', max: 60 },
      lead: {
        hint: 'One sentence: what the product is for this client, in the language of their field. Factual, no sales adjectives.', max: 150,
        hint_by_role: {
          [BOARD]: 'what it changes for the organisation (time, risk, control of client data), not how it works.',
          [CHAMPION]: 'what it changes in the team’s daily work (research, drafting, review).',
        },
        hint_by_product: {
          [SAAS]: 'a tool the team can start using right away.',
          [VAULT]: 'a private environment under the organisation’s control.',
          [ONPREM]: 'it runs on the organisation’s own infrastructure.',
        },
      },
    },
    fill: { kind: 'none' },
  },
  {
    key: 'starting-point', label: 'Starting point', frame: 'starting-point', answers: ['segment', 'pain'],
    data: {
      lead: 'Your team works on large volumes of legal documents and wants to spend less time on research and first drafts.',
      areas: lines([
        ['Legal research', 'Finding the right rulings and sources for each matter takes hours.'],
        ['Document drafting', 'First drafts of letters and pleadings start from scratch.'],
        ['Contract review', 'Contracts need fast, consistent review against the team’s standards.'],
      ]),
    },
    data_by_role: {
      [BOARD]: { lead: 'Your lawyers spend hours on research and first drafts. The question is how to win that time back without putting client data or quality at risk.' },
    },
    write: {
      lead: {
        hint: 'Two sentences from the transcript: who the organisation is, what it does, how big it is and who will really use the tool (team, number of people, roles).', max: 240,
        hint_by_role: {
          [BOARD]: 'end on the cost of the current way of working (time, risk, missed work) as the client described it.',
          [CHAMPION]: 'end on what slows the team down day to day, as the client described it.',
        },
      },
      areas: {
        hint: 'The areas of work the client wants help with, as they described them. 3 or 4 (a 4th only if the call really had one).', min: 3, max: 4,
        columns: {
          title: { hint: 'The area, 2–5 words.', max: 40 },
          value: { hint: 'One sentence: what the client said about this area, in their own words where possible.', max: 130 },
        },
      },
    },
    fill: { kind: 'none' },
  },
  {
    key: 'use-areas', label: 'Use areas', frame: 'use-areas', answers: ['pain'],
    data: {
      solutions: lines([
        ['Legal research', 'Answers with case numbers and quotes from Polish and EU law and case law.'],
        ['Document drafting', 'Drafts built from your own templates and past documents, with sources.'],
        ['Contract review', 'Clause-by-clause review against your playbook, with a risk summary.'],
      ]),
    },
    write: {
      solutions: {
        hint: 'For each area from the Starting point slide (same areas, same order): the specific product feature that handles it. The more specific, the better; only what the product really does.', min: 3, max: 4,
        columns: {
          title: { hint: 'The area, exactly as on the Starting point slide.', max: 40 },
          value: { hint: 'One sentence: the feature that handles it, e.g. research with case numbers.', max: 120 },
        },
      },
    },
    fill: { kind: 'none' },
  },
  {
    key: 'team-support', label: 'Team support', frame: 'team-support', answers: ['pain', 'role'],
    data: {
      lead: 'We roll Gaius out together with your team: short sessions on real matters and a person to call.',
      concerns: lines([
        ['Is the AI’s output reliable?', 'Every answer links to the statute, ruling or document it is based on, so it can be checked in seconds.'],
        ['Will people actually use it?', 'Each lawyer gets a short onboarding on their own matters, and we review usage together after two weeks.'],
      ]),
    },
    data_by_role: {
      [BOARD]: {
        lead: 'We run the rollout with your team, so adoption does not depend on your lawyers’ spare time.',
        concerns: lines([
          ['Is it worth the cost?', 'During the pilot we measure time saved on real matters and review the result with you before any wider rollout.'],
          ['Is the AI’s output reliable?', 'Every answer links to the statute, ruling or document it is based on, so it can be checked in seconds.'],
        ]),
      },
    },
    write: {
      lead: {
        hint: 'One sentence: how we work with the team during the rollout. Calm tone, no scaremongering.', max: 140,
        hint_by_role: {
          [BOARD]: 'that adoption is taken care of without a burden on the team.',
          [CHAMPION]: 'how the team gets started and who helps them.',
        },
      },
      concerns: {
        hint: 'Only concerns the client raised in their own words, each with our answer from the library. One is enough: add a second only if the client raised a second one. If they raised none, leave this field out.', min: 1, max: 2,
        hint_by_role: {
          [BOARD]: 'concerns about cost, return, risk and the decision; answers say how the pilot will show it.',
          [CHAMPION]: 'concerns about daily use and the team’s trust in the answers.',
        },
        columns: {
          title: { hint: 'The concern, named neutrally, 3–8 words.', max: 50 },
          value: { hint: 'How we answer it: a concrete action or feature.', max: 150 },
        },
      },
    },
    fill: { kind: 'none' },
  },
  {
    key: 'tool-comparison', label: 'Comparison', frame: 'tool-comparison', answers: ['pain'], optional: true,
    data: {
      tool: 'general AI chatbots',
      lead: 'How a general AI chatbot compares with a Legal AI built for work on legal documents.',
      rows: lines([
        ['Legal sources', 'General knowledge, no current case law', 'Polish and EU law and case law, with case numbers'],
        ['Your documents', 'Uploaded one chat at a time', 'One base of your documents and templates'],
        ['Confidentiality', 'Public cloud outside your control', 'Private environment, never used for training'],
        ['Verification', 'Answers without sources', 'Every answer links to its basis'],
      ]),
    },
    write: {
      tool: { hint: 'The name of the tool the client mentioned (e.g. ChatGPT, Copilot, Lex). Write this slide ONLY if the client mentioned another tool on the call or in the email; otherwise hide it.', max: 30 },
      lead: { hint: 'One sentence: in what context the client mentioned the tool.', max: 150 },
      rows: {
        hint: 'A comparison of the tool and our product, area by area: 3–6 rows, only differences that matter to this client. For a tool in the library’s list of other tools, use only its facts (one row per fact, the tool side copied as it is); a fact marked as the tool’s strength only when the client raised it. For any other tool, only what the client said about it.', min: 3, max: 6,
        columns: {
          title: { hint: 'The area, 1–3 words (the fact’s area, or the client’s words).', max: 25 },
          value: { hint: 'The tool side: a fact from the library, copied as it is, or what the client said about the tool.', max: 60 },
          value2: { hint: 'Our side: the fact’s answer for this product, or a solution from the library.', max: 60 },
        },
      },
    },
    fill: { kind: 'none' },
  },
  {
    key: 'security', label: 'Security', frame: 'security', answers: ['product'],
    data: {
      lead: 'Your documents stay in a private environment: encrypted, never used to train AI and visible only to the people you choose.',
      features: lines([
        ['Encrypted storage', 'Documents and answers are encrypted at rest.'],
        ['Encrypted transmission', 'All traffic between your team and Gaius uses TLS.'],
        ['No AI training', 'Your documents are never used to train models.'],
        ['Infrastructure in the EEA', 'A private environment hosted in the European Economic Area.'],
        ['GDPR compliant', 'A data processing agreement and a clear processing register.'],
        ['Access control', 'Roles and permissions per team and per matter.'],
      ]),
    },
    data_by_product: {
      [SAAS]: {
        features: lines([
          ['Encrypted storage', 'Documents and answers are encrypted at rest.'],
          ['Encrypted transmission', 'All traffic between your team and Gaius uses TLS.'],
          ['No AI training', 'Your documents are never used to train models.'],
          ['Infrastructure in the EEA', 'Hosted on servers in the European Economic Area.'],
          ['GDPR compliant', 'A data processing agreement and a clear processing register.'],
          ['Access control', 'Team accounts with separate workspaces.'],
        ]),
      },
      [ONPREM]: {
        lead: 'Gaius runs on your own infrastructure: documents never leave the organisation and your IT team controls the environment.',
        features: lines([
          ['Encrypted storage', 'Documents and answers are encrypted at rest on your servers.'],
          ['Encrypted transmission', 'All traffic inside your network uses TLS.'],
          ['No AI training', 'Your documents are never used to train models.'],
          ['On your infrastructure', 'Installed on your own servers, with no public cloud.'],
          ['GDPR compliant', 'You stay the sole controller of the data.'],
          ['Access control', 'Integration with your directory, roles per team and matter.'],
        ]),
      },
    },
    draft: [SAAS, ONPREM],
    write: {
      lead: {
        hint: 'One sentence answering the security concern the client raised on the call or in the email. If they raised none, a general sentence about keeping documents private.', max: 160,
        hint_by_product: {
          [SAAS]: 'hosted in the European Economic Area, documents never used to train models.',
          [VAULT]: 'a private environment, documents never used to train models, access per team and matter.',
          [ONPREM]: 'documents never leave the organisation; IT controls the environment.',
        },
      },
    },
    fill: { kind: 'none' },
  },
  {
    key: 'preparation', label: 'Preparation', frame: 'preparation', answers: ['role'],
    data: {
      title: 'Recommended steps before\nthe pilot starts',
      lead: 'A few conversations that will get you ready for the pilot.',
      steps: lines([
        ['Talk to your DPO', 'To agree on the data processing rules and have the data processing agreement ready.'],
        ['Talk to IT', 'To check server and network access, so the pilot can start on day one.'],
        ['A short meeting with us', 'To pick the matters for the pilot and decide who from the team takes part.'],
        ['Talk to the board', 'So they know what you are testing and how you will judge the result.'],
      ]),
    },
    data_by_product: {
      [SAAS]: {
        steps: lines([
          ['Talk to your DPO', 'To agree on the data processing rules and have the data processing agreement ready.'],
          ['Talk to IT', 'To check accounts and sign-in, so the pilot can start on day one.'],
          ['A short meeting with us', 'To pick the matters for the pilot and decide who from the team takes part.'],
          ['Talk to the board', 'So they know what you are testing and how you will judge the result.'],
        ]),
      },
    },
    data_by_role: {
      [CHAMPION]: {
        steps: lines([
          ['Talk to your DPO', 'To agree on the data processing rules and have the data processing agreement ready.'],
          ['Talk to IT', 'To check server and network access, so the pilot can start on day one.'],
          ['A short meeting with us', 'To pick the matters for the pilot and decide who from the team takes part.'],
          ['Talk to the decision makers', 'So the partners or the board know what you are testing and how you will judge the result.'],
        ]),
      },
      [BOARD]: {
        lead: 'A few decisions that give the pilot a clear owner and a clear basis for your decision.',
        steps: lines([
          ['Name a pilot owner', 'So one person runs the pilot on the team and reports the result to you.'],
          ['Agree on success criteria', 'So the pilot ends with a clear answer: time saved, quality, adoption.'],
          ['Involve your DPO', 'To agree on the data processing rules and have the data processing agreement ready.'],
          ['Involve IT', 'To check server and network access, so the pilot can start on day one.'],
        ]),
      },
    },
    data_by_role_product: {
      [CHAMPION]: {
        [SAAS]: {
          steps: lines([
            ['Talk to your DPO', 'To agree on the data processing rules and have the data processing agreement ready.'],
            ['Talk to IT', 'To check accounts and sign-in, so the trial can start on day one.'],
            ['A short meeting with us', 'To pick the matters for the trial and decide who from the team takes part.'],
            ['Talk to the decision makers', 'So the partners or the board know what you are testing and how you will judge the result.'],
          ]),
        },
      },
      [BOARD]: {
        [SAAS]: {
          steps: lines([
            ['Name a pilot owner', 'So one person runs the pilot on the team and reports the result to you.'],
            ['Agree on success criteria', 'So the pilot ends with a clear answer: time saved, quality, adoption.'],
            ['Involve your DPO', 'To agree on the data processing rules and have the data processing agreement ready.'],
            ['Involve IT', 'To check accounts and sign-in, so the pilot can start on day one.'],
          ]),
        },
      },
    },
    draft: [SAAS],
    write: {
      title: { hint: 'Recommended steps before the next stage: before the pilot starts or before signing the contract, whichever is next for this client. At most two lines (use \\n).', max: 60 },
      lead: {
        hint: 'One sentence: a few conversations after which the client goes into the pilot or the contract well prepared.', max: 120,
        hint_by_role: {
          [BOARD]: 'decisions the board makes so the pilot gives a clear basis for the decision.',
          [CHAMPION]: 'conversations the champion leads to get the team and the board ready.',
        },
      },
      steps: {
        hint: 'Steps the client should take first: talk to the DPO, to IT, a short meeting with us, talk to the decision makers. Leave out a step the client already did (e.g. a signed agreement). A 5th step only for something the client itself raised on the call.', min: 3, max: 5,
        hint_by_role: {
          [BOARD]: 'the decision makers do not talk to themselves: name a pilot owner and agree on success criteria instead of a step about talking to the decision makers.',
          [CHAMPION]: 'keep a step about talking to the decision makers, named as the client calls them (the partners in a law firm, the board in a company).',
        },
        hint_by_product: {
          [SAAS]: 'the IT step is about accounts and sign-in, no server work.',
          [ONPREM]: 'the IT step is about the server and network access (one IP address).',
        },
        columns: {
          title: { hint: 'The step, 2–5 words.', max: 35 },
          value: { hint: 'One sentence: why, starting with "To" or "So".', max: 120 },
        },
      },
    },
    fill: { kind: 'none' },
  },
  {
    key: 'rollout-process', label: 'Rollout process', frame: 'rollout-process', answers: [],
    data: {},
    fill: { kind: 'none' },
  },
  {
    key: 'add-on-services', label: 'Additional services', frame: 'add-on-services', answers: ['pain'],
    data: {
      lead: 'Services that go beyond the areas above but follow from them.',
      services: lines([
        ['Workshops', 'Prompting and verification workshops for the team.', 'half a day, up to 15 people'],
        ['Developer hours', 'Connecting Gaius to your document management system.', 'package of hours'],
        ['Development plans', 'Rolling Gaius out to more teams.', 'after the pilot'],
      ]),
    },
    write: {
      lead: { hint: 'One sentence: what goes beyond the identified areas but follows from them. Nothing unrelated to the call.', max: 140 },
      services: {
        hint: 'Workshops, developer hours, development plans, in this order, adapted to the client. 1–3.', min: 1, max: 3,
        columns: {
          title: { hint: 'Workshops, Developer hours or Development plans.', max: 25 },
          value: { hint: 'One sentence: for whom and what scope (workshops), what the hours could be used for, or which areas come next (e.g. other departments).', max: 100 },
          value2: { hint: 'Time and number of people, the package of hours, or the time horizon.', max: 40 },
        },
      },
    },
    fill: { kind: 'none' },
  },
  {
    key: 'contact-person', label: 'Contact', frame: 'contact-person', answers: [],
    data: {
      lead: 'Next step: a short call to plan the pilot with your team.',
      calendar: 'Book a call: gaius-lex.pl',
    },
    data_by_role: {
      [BOARD]: { lead: 'Next step: a short call to agree on the pilot scope and how you will judge the result.' },
    },
    write: {
      lead: {
        hint: 'One or two sentences: the concrete next step, e.g. a meeting with IT or the start of the pilot, with the date if one came up on the call.', max: 150,
        hint_by_role: {
          [BOARD]: 'a decision or a date, not a demo.',
          [CHAMPION]: 'what the champion does next with their team.',
        },
        hint_by_product: {
          [SAAS]: 'the next step can be the 14-day trial.',
          [ONPREM]: 'the next step usually involves IT (server and network).',
        },
      },
    },
    fill: { kind: 'blocks', type: 'person', min: 1, max: 1 },
  },
];

export const scenarios = [{ id: 'base', name: 'Base deck', steps }];

// Scenarios of earlier versions that the base deck replaces (removed from existing databases on startup).
export const retiredScenarios = ['role:board', 'role:champion'];

// The previous base deck (on the 2025 template) is kept under this id when the new deck replaces it.
export const PREVIOUS_BASE = 'base-2025';
