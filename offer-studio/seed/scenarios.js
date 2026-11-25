// The base deck: one presentation for every client (the 8 slides of the base offer). Only the swappable
// elements on its slides change. A step is one slide; its slots are filled from a pool of elements.
// Step = a slide from the library (`frame`) + default copy (`data`) + a fill rule (`fill`).
//   fill.kind: none (copy only) | pains (the client's selected pain tiles) | blocks (blocks of `type` picked by tiles,
//   from `min` to `max`) | picks (cards from a component set picked by tiles).
//   when.any: the step appears only with one of these tiles.
//   data_by_product: copy overrides per product (the default copy is the Vault version).
//   draft: products whose copy is a draft to review (shown as "draft" in the UI).
//   answers: which kinds of client tiles the slide answers (e.g. the problems slide answers pains); elements
//   linked to the client's tiles of those kinds are highlighted for this slide.
// Order and copy are edited in the Scenarios tab.

const SAAS = 'product:saas';
const ONPREM = 'product:on-prem';

// The template prints "GAIUS" before the accent, so SaaS gets "Pro?" (Gaius Pro is the SaaS product).
const cover = {
  answers: [],
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

const contact = {
  answers: [],
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
  answers: ['product'],
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
    id: 'base',
    name: 'Base deck',
    steps: [
      cover,
      {
        key: 'problems', label: 'Problems', frame: 'problems', answers: ['pain'],
        data: {
          title: 'Where is the legal team’s time **leaking**?',
          lead: 'What costs the most is not the analysis itself, but rebuilding the path to the answer every time.',
          note: 'The problem is not the number of matters. It is walking the same road to every answer.',
        },
        fill: { kind: 'blocks', type: 'problem', min: 5, max: 5 },
      },
      {
        key: 'what-is', label: 'What Gaius is', frame: 'what-is', answers: ['pain'],
        data: { title: 'What is ', title_accent: 'Vault?', lead: 'A private Legal AI environment that brings together legal sources, your documents and your team’s way of working.' },
        data_by_product: { [SAAS]: { title_accent: 'Pro?', lead: 'Legal AI that brings together legal sources, your team’s documents and a shared way of working.' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'pillar', min: 3, max: 3 },
      },
      {
        key: 'why', label: 'Why Gaius', frame: 'why', answers: ['pain', 'role', 'product'],
        data: { title: 'Why ', title_accent: 'Vault?', lead: 'Gaius Vault combines technology, sources, documents, rollout and adoption in one model.' },
        data_by_product: { [SAAS]: { title_accent: 'Pro?', lead: 'Gaius combines technology, legal sources, your documents and team rollout in one subscription.' } },
        draft: [SAAS],
        fill: { kind: 'picks', set: 'why' },
      },
      {
        key: 'use-cases', label: 'Use cases', frame: 'use-case', answers: ['pain', 'segment'],
        data: {
          title: 'Vault in everyday practice',
          lead: 'Gaius Vault turns the most common touchpoints between the business and legal into repeatable routines: from contract approval and dispute response to reusing past opinions and standards.',
        },
        data_by_product: { [SAAS]: { title: 'Gaius in everyday practice', lead: 'Gaius turns your team’s most common tasks into repeatable routines: from contract approval and dispute response to reusing past opinions.' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'use_case', min: 6, max: 6 },
      },
      { ...pricing, key: 'pricing' },
      {
        key: 'comparison', label: 'Comparison', frame: 'comparison', answers: ['pain'],
        data: {
          title: 'Gaius vs. a patchwork of Legal AI tools',
          lead: 'Most tools solve one piece of the problem. Gaius Vault delivers a complete standard for legal work with AI, under one licence.',
          col_area: 'Area', col_them: 'Several AI / LegalTech tools', col_us: 'Gaius Vault',
        },
        data_by_product: { [SAAS]: { lead: 'Most tools solve one piece of the problem. Gaius brings legal sources, documents and drafting together in one tool.', col_us: 'Gaius Pro' } },
        draft: [SAAS],
        fill: { kind: 'blocks', type: 'comparison', min: 7, max: 7 },
      },
      contact,
    ],
  },
];

// Scenarios of earlier versions that the base deck replaces (removed from existing databases on startup).
export const retiredScenarios = ['role:board', 'role:champion'];
