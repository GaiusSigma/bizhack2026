// Scenarios: the flow of the presentation for each contact role (id = role tile).
// Step = a slide from the library (`frame`) + default copy (`data`) + a fill rule (`fill`).
//   fill.kind: none (copy only) | pains (the client's selected pain tiles) | blocks (blocks of `type` picked by tiles,
//   from `min` to `max`) | picks (cards from a component set picked by tiles).
//   when.any: the step appears only with one of these tiles.
//   data_by_product: copy overrides per product (the default copy is the Vault version).
//   draft: products whose copy is a draft to review (shown as "draft" in the UI).
// Order and copy are edited in the Scenarios tab.

const SAAS = 'product:saas';
const ONPREM = 'product:on-prem';
const VAULT_LIKE = { any: ['product:vault', ONPREM] };

// The template prints "GAIUS" before the accent, so SaaS gets "Pro?" (Gaius Pro is the SaaS product).
const cover = {
  key: 'cover', label: 'Cover', frame: 'cover',
  data: {
    title: 'Gaius Vault',
    subtitle: 'Legal AI you can trust **with real legal work**',
    lead: 'Private Legal AI for work on real documents: on-premise, under one licence, under your organisation’s control.',
  },
  data_by_product: {
    [SAAS]: {
      title: 'Gaius Pro',
      lead: 'Legal AI for work on real documents: legal sources, your templates and ready drafts in one tool, nothing to install.',
    },
    [ONPREM]: {
      lead: 'Private Legal AI on your own infrastructure: documents never leave the organisation and your IT team controls the environment.',
    },
  },
  draft: [SAAS, ONPREM],
  fill: { kind: 'none' },
};

const architecture = { key: 'architecture', label: 'Architecture', frame: 'architecture', data: {}, fill: { kind: 'none' }, when: VAULT_LIKE };

const rollout = {
  key: 'rollout', label: 'Rollout', frame: 'rollout',
  data: {
    quote: 'We don’t roll out access.\nWe roll out a way of working.',
    quote_lead: 'That is why Vault covers not just the technology, but also the process, routines and accountability rules.',
  },
  data_by_product: {
    [SAAS]: { quote_lead: 'That is why Gaius is not just access to a tool, but also workshops, routines and verification rules for the team.' },
  },
  draft: [SAAS],
  fill: { kind: 'blocks', type: 'step', min: 5, max: 5 },
};

const contact = {
  key: 'contact', label: 'Contact', frame: 'contact',
  data: {
    kicker: 'LET’S WORK TOGETHER',
    title: 'Secure Legal AI in your organisation',
    text: 'If you want faster legal research, tighter risk control and a safe way to use AI in your company, get in touch. A short call is enough for us to understand your organisation and propose a sensible pilot scope, from a safe test rollout to a full on-premise or hybrid deployment.',
  },
  data_by_product: {
    [SAAS]: { text: 'If you want faster legal research and document work, get in touch. A short call is enough for us to pick the right plan and show Gaius on your own matters.' },
  },
  draft: [SAAS],
  fill: { kind: 'blocks', type: 'person', min: 1, max: 1 },
};

const pricing = {
  key: 'pricing', label: 'Pricing', frame: 'pricing',
  data: {
    title: 'What’s included in',
    title_accent: 'Vault?',
    lead: 'You are not just buying an AI tool, but a working standard that is rolled out: technology, environment, routines and adoption support.',
    price_label: 'Subscription fee',
    price_note: 'net',
    lines: 'Workshops | included in subscription\nTraining | included in subscription\nHardware | included in subscription',
  },
  data_by_product: {
    [SAAS]: {
      title_accent: 'Pro?',
      lead: 'The subscription covers the tool, up-to-date legal sources and help rolling it out to the team.',
      lines: 'Team access | included in subscription\nSource updates | included in subscription\nRollout and training | included in subscription',
    },
    [ONPREM]: {
      lines: 'Workshops | included in subscription\nTraining | included in subscription\nInfrastructure | provided by the organisation, setup included',
    },
  },
  draft: [SAAS, ONPREM],
  fill: { kind: 'blocks', type: 'package', min: 3, max: 3 },
};

export const scenarios = [
  {
    id: 'role:board',
    name: 'Board',
    steps: [
      cover,
      {
        key: 'pains', label: 'Client pains', frame: 'problems',
        data: {
          title: 'What is **costing** your organisation today?',
          lead: 'This is what we heard in our conversation. Each point has its answer later in this deck.',
          note: 'The goal is not another tool. The goal is less repetitive work with the same team.',
        },
        fill: { kind: 'pains' },
      },
      {
        key: 'why', label: 'Why Gaius', frame: 'why',
        data: { title: 'Why ', title_accent: 'Vault?', lead: 'Gaius Vault combines technology, sources, documents, rollout and adoption in one model.' },
        data_by_product: { [SAAS]: { title_accent: 'Pro?', lead: 'Gaius combines technology, legal sources, your documents and team rollout in one subscription.' } },
        draft: [SAAS],
        fill: { kind: 'picks', set: 'why' },
      },
      {
        key: 'solutions', label: 'How we solve it', frame: 'use-case',
        data: { title: 'How Gaius solves your problems', lead: 'For each problem: what Gaius does and what your organisation gains.' },
        fill: { kind: 'blocks', type: 'solution', min: 2, max: 3 },
      },
      architecture,
      rollout,
      pricing,
      contact,
    ],
  },
  {
    id: 'role:champion',
    name: 'Champion',
    steps: [
      cover,
      {
        key: 'pains', label: 'Client pains', frame: 'problems',
        data: {
          title: 'What is your team **up against**?',
          lead: 'What we hear from lawyers in similar teams, and what came up in our conversation.',
          note: 'Each of these problems has a concrete answer you can show your team on its own documents.',
        },
        fill: { kind: 'pains' },
      },
      {
        key: 'what-is', label: 'What Gaius is', frame: 'what-is',
        data: { title: 'What is ', title_accent: 'Vault?', lead: 'A private Legal AI environment that brings together legal sources, your documents and your team’s way of working.' },
        data_by_product: { [SAAS]: { title_accent: 'Pro?', lead: 'Legal AI that brings together legal sources, your team’s documents and a shared way of working.' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'pillar', min: 3, max: 3 },
      },
      {
        key: 'solutions', label: 'How we solve it', frame: 'use-case',
        data: { title: 'How Gaius solves your problems', lead: 'In concrete terms: what Gaius does and what you and your team gain.' },
        fill: { kind: 'blocks', type: 'solution', min: 3, max: 3 },
      },
      {
        key: 'use-cases', label: 'Use cases', frame: 'use-case',
        data: {
          title: 'Vault in everyday practice',
          lead: 'Gaius Vault turns the most common touchpoints between the business and legal into repeatable routines: from contract approval and dispute response to reusing past opinions and standards.',
        },
        data_by_product: { [SAAS]: { title: 'Gaius in everyday practice', lead: 'Gaius turns your team’s most common tasks into repeatable routines: from contract approval and dispute response to reusing past opinions.' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'use_case', min: 3, max: 6 },
      },
      {
        key: 'signals', label: 'Readiness signals', frame: 'signals',
        data: {
          title: 'Signs your team is',
          title_2: 'ready for',
          title_accent: 'Vault?',
          lead: 'It is not about the technology itself. It is about the moment Legal AI should become how your team works.',
          note: 'Gaius helps turn these signals into a rollout plan: processes, routines and measurable impact.',
        },
        data_by_product: { [SAAS]: { title_accent: 'Pro?' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'signal', min: 4, max: 4 },
      },
      architecture,
      {
        key: 'comparison', label: 'Comparison', frame: 'comparison',
        data: {
          title: 'Gaius vs. a patchwork of Legal AI tools',
          lead: 'Most tools solve one piece of the problem. Gaius Vault delivers a complete standard for legal work with AI, under one licence.',
          col_area: 'Area', col_them: 'Several AI / LegalTech tools', col_us: 'Gaius Vault',
        },
        data_by_product: { [SAAS]: { lead: 'Most tools solve one piece of the problem. Gaius brings legal sources, documents and drafting together in one tool.', col_us: 'Gaius Pro' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'comparison', min: 5, max: 7 },
      },
      rollout,
      contact,
    ],
  },
];
