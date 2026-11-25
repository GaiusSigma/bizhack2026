// Starter data, loaded into an EMPTY database only. The content comes from gaius-offer.figcraft,
// and the template (seed/gaius-template.figcraft) is the same file with {{…}} fields in its layer names.
// Same format as an /api/export dump; the server adds the template file itself.
const ts = '2026-11-25T00:00:00.000Z';
const tags = ['vault'];

const block = (id, type, title, body, data = {}, extraTags = []) => ({
  id, type, title, body, data, tags: [...tags, ...extraTags], created_at: ts, updated_at: ts,
});

// ------------------------------------------------------------------ knowledge blocks
const blocks = [
  // Use cases: "Vault in everyday practice"
  block('uc-urgent-letter', 'use_case', 'Urgent letter or claim', 'Gaius extracts the key points, gaps, counter-arguments and sources to verify.', { effect: 'faster response and tighter risk control.' }, ['legal-dept']),
  block('uc-law-change', 'use_case', 'A change in law or procedure', 'Gaius points out the documents, templates and procedures that need updating.', { effect: 'stronger compliance control and less firefighting.' }, ['legal-dept', 'compliance']),
  block('uc-document-check', 'use_case', 'A document before it goes out', 'Gaius checks citations, case numbers, data and consistency with your standard.', { effect: 'lower risk of errors before a document reaches a client, counterparty, court or the board.' }, ['legal-dept', 'law-firm']),
  block('uc-contract-to-sign', 'use_case', 'A contract to sign', 'Gaius flags risks, gaps, inconsistencies and negotiation points.', { effect: 'faster approval: sign, negotiate or escalate.' }, ['legal-dept']),
  block('uc-recurring-topic', 'use_case', 'A recurring topic', 'Gaius finds earlier opinions, templates, clauses and arguments.', { effect: 'less work from scratch and better use of in-house know-how.' }, ['legal-dept', 'law-firm']),
  block('uc-business-question', 'use_case', 'A question from the business', 'Gaius drafts a working memo: answer, legal basis, risks, options and recommendation.', { effect: 'less waiting for decisions and clearer legal communication.' }, ['legal-dept']),

  // Problems: "Where is the legal team's time leaking?"
  block('pr-research-from-scratch', 'problem', 'Research started from scratch', 'Sources, arguments and legal grounds are rebuilt every single time.'),
  block('pr-repeated-analyses', 'problem', 'The same analysis done by different people', 'Similar questions come back, but answers rarely build on earlier work.'),
  block('pr-hidden-know-how', 'problem', 'Know-how buried in folders and emails', 'Opinions, templates and clauses exist, but nobody actively reuses them.'),
  block('pr-repetitive-work', 'problem', 'Experts stuck on repetitive work', 'Senior lawyers spend time on tasks that could be standardised.'),
  block('pr-ai-without-rules', 'problem', 'AI used without shared rules', 'There is no common standard for prompts, sources, verification and accountability.'),

  // Pillars: "What is Vault?"
  block('pl-private-environment', 'pillar', 'A private workspace', 'Vault runs in an environment your organisation controls, so legal documents never become material for a public chatbot.'),
  block('pl-sourced-answers', 'pillar', 'Answers with sources', 'Every answer leads to its basis: statutes, rulings, quotes, case numbers and documents a lawyer can verify.'),
  block('pl-team-standard', 'pillar', 'A shared team standard', 'We turn repetitive tasks into routines, checklists and workflows the whole team uses.'),

  // Differentiators: "Why Vault?"
  block('df-private-legal-ai', 'differentiator', 'Private Legal AI on real documents', 'Vault can run on-premise under your control, in line with IT, compliance and legal team requirements.'),
  block('df-one-environment', 'differentiator', 'Law, case law and documents in one environment', 'Gaius Vault connects legal sources with your documents, so the AI works with the real context of each matter.'),
  block('df-rollout-routine', 'differentiator', 'A rollout that ends in daily routine', 'Vault does not stop at handing out logins. Workshops and Legal Engineering turn processes into workflows, checklists and routines.'),
  block('df-no-lock-in', 'differentiator', 'Scale without licence lock-in', 'No fee per user or per workspace. We size the environment to the scale of your rollout.'),
  block('df-one-service', 'differentiator', 'One service', 'One licence covers the technology, legal sources, document work, workshops, Legal Engineering and an evolving work standard.'),
  block('df-safe-start', 'differentiator', 'A safe way to start', 'A fixed monthly fee, a price guarantee and an optional 3-month POC you can walk away from keep the decision low-risk.'),

  // Readiness signals
  block('sg-faster-answers', 'signal', 'Faster answers for the business', 'Legal has to support decisions faster, without lowering quality.'),
  block('sg-more-documents', 'signal', 'More documents and sources', 'Contracts, letters and legal materials need ever more triage and analysis.'),
  block('sg-hard-to-reuse', 'signal', 'Knowledge that is hard to reuse', 'Past opinions and templates exist, but they are hard to reuse in the next matter.'),
  block('sg-repetitive-tasks', 'signal', 'Repetitive tasks eat up experts’ time', 'The same kinds of analysis, research and checks come back in matter after matter.'),

  // Rollout steps
  block('st-processes', 'step', 'We pick the highest-impact processes', 'We identify the questions, documents and analyses that come back most often.'),
  block('st-real-matters', 'step', 'We work on real matters', 'Workshops are built on your documents, questions and team standards.'),
  block('st-routines', 'step', 'We build routines', 'We turn processes into workflows, checklists, prompts and answer patterns.'),
  block('st-verification', 'step', 'We set verification rules', 'We define how sources, quotes, risks and accountability are checked.'),
  block('st-adoption', 'step', 'We measure adoption and scale', 'We track usage, collect feedback and pick the next processes.'),

  // Comparison: several tools vs Gaius Vault
  block('cmp-data', 'comparison', 'Data and documents', '', { them: 'need policies, integrations and usage limits', us: 'a private environment for work on legal documents' }),
  block('cmp-sources', 'comparison', 'Legal sources', '', { them: 'often separate from the AI and client documents', us: 'law, case law and documents in one place' }),
  block('cmp-verification', 'comparison', 'Verification', '', { them: 'checking citations and sources is left to the user', us: 'answers link to sources, case numbers and documents' }),
  block('cmp-knowledge', 'comparison', 'Organisational knowledge', '', { them: 'folders, DMS, SharePoint, emails', us: 'a living base of opinions, letters, templates and analyses' }),
  block('cmp-rollout', 'comparison', 'Rollout', '', { them: 'training and adoption left to the client', us: 'workshops + Legal Engineer + work routines' }),
  block('cmp-scaling', 'comparison', 'Scaling', '', { them: 'more licences, modules and integrations', us: 'one licence, no limits on users or files' }),
  block('cmp-word', 'comparison', 'Word add-in', '', { them: 'another licence', us: 'included' }),

  // Package components (pricing slide)
  block('pkg-technology', 'package', 'Gaius-Lex technology', '- legal research\n- document analysis\n- sources and citations\n- knowledge base\n- work routines\n- up-to-date law and case law'),
  block('pkg-environment', 'package', 'Private Vault environment', '- on-premise, controlled workspace\n- no licence limits\n- hardware and setup at the client\n- tailored to your rollout'),
  block('pkg-legal-engineering', 'package', 'Legal Engineering and adoption', '- 5 h of workshops per month\n- 10 h of Legal Engineer time per month\n- evolving routines and work standards\n- recommendations for next processes'),

  // Contact people
  block('person-janusz', 'person', 'Janusz Marszałek', '', { role: 'Co-founder & COO', email: 'januszmarszalek@gaius-lex.pl', phone: '+48 579 122 689' }),
];

// ------------------------------------------------------------------ base offer
// `frame` is the slide (frame) name in the template, `data` fills the {{data.*}} fields.
const OFFER = 'gaius-vault-base';
const slide = (id, position, frame, data, block_ids = [], picks = {}) => ({
  id, offer_id: OFFER, position, frame, data, block_ids, query: null, picks, hidden: false, created_at: ts, updated_at: ts,
});
const ids = (type) => blocks.filter((b) => b.type === type).map((b) => b.id);

export const slides = [
  slide('s-cover', 0, 'cover', {
    title: 'Gaius Vault',
    subtitle: 'Legal AI you can trust **with real legal work**',
    lead: 'Private Legal AI for work on real documents: on-premise, under one licence, under your organisation’s control.',
  }),
  slide('s-problem', 1, 'problems', {
    title: 'Where is the legal team’s time **leaking**?',
    lead: 'What costs the most is not the analysis itself, but rebuilding the path to the answer every time.',
    note: 'The problem is not the number of matters. It is walking the same road to every answer.',
  }, ids('problem')),
  slide('s-what-is', 2, 'what-is', {
    title: 'What is ',
    title_accent: 'Vault?',
    lead: 'A private Legal AI environment that brings together legal sources, your documents and your team’s way of working.',
  }, ids('pillar')),
  slide('s-why', 3, 'why', {
    title: 'Why ',
    title_accent: 'Vault?',
    lead: 'Gaius Vault combines technology, sources, documents, rollout and adoption in one model.',
  }, [], {
    why: ['private-legal-ai', 'one-environment', 'rollout-routine-highlight', 'no-lock-in', 'one-service', 'safe-start']
      .map((k) => ({ component: `why/${k}` })),
  }),
  slide('s-signals', 4, 'signals', {
    title: 'Signs your legal team is',
    title_2: 'ready for',
    title_accent: 'Vault?',
    lead: 'It is not about the technology itself. It is about the moment Legal AI should become how your team works.',
    note: 'Gaius Vault helps turn these signals into a rollout plan: processes, routines and measurable impact.',
  }, ids('signal')),
  slide('s-rollout', 5, 'rollout', {
    quote: 'We don’t roll out access.\nWe roll out a way of working.',
    quote_lead: 'That is why Vault covers not just the technology, but also the process, routines and accountability rules.',
  }, ids('step')),
  slide('s-use-case', 6, 'use-case', {
    title: 'Vault in everyday practice',
    lead: 'Gaius Vault turns the most common touchpoints between the business and legal into repeatable routines: from contract approval and dispute response to reusing past opinions and standards.',
  }, ids('use_case')),
  slide('s-pricing', 7, 'pricing', {
    title: 'What’s included in',
    title_accent: 'Vault?',
    lead: 'You are not just buying an AI tool, but a working standard that is rolled out: technology, environment, routines and adoption support.',
    price_label: 'Subscription fee',
    price_note: 'net',
    lines: 'Workshops | included in subscription\nTraining | included in subscription\nHardware | included in subscription',
  }, ['pkg-technology', 'pkg-environment', 'pkg-legal-engineering']),
  slide('s-architecture', 8, 'architecture', {}),
  slide('s-comparison', 9, 'comparison', {
    title: 'Gaius vs. a patchwork of Legal AI tools',
    lead: 'Most tools solve one piece of the problem. Gaius Vault delivers a complete standard for legal work with AI, under one licence.',
    col_area: 'Area', col_them: 'Several AI / LegalTech tools', col_us: 'Gaius Vault',
  }, ids('comparison')),
  slide('s-contact', 10, 'contact', {
    kicker: 'LET’S WORK TOGETHER',
    title: 'Secure Legal AI in your organisation',
    text: 'If you want faster legal research, tighter risk control and a safe way to use AI in your company, get in touch. A short call is enough for us to understand your organisation and propose a sensible pilot scope, from a safe test rollout to a full on-premise or hybrid deployment.',
  }, ['person-janusz']),
];

// ------------------------------------------------------------------ components (cards in the @why set)
// The cards are drawn in FigCraft (seed/build-components.mjs made them from the cards on the "why" slide).
// This is what the drawing cannot show: when the AI should pick which card.
// Variants: regular (beige), highlight (green, one per slide), stat (a big number instead of an icon).
const comp = (key, topic, variant, title, description, use_when, avoid_when = '', tags = []) => ({
  id: `why/${key}`, set_name: 'why', key, source: 'gaius', title, description, use_when, avoid_when, topic, variant,
  tags, data: {}, figma_text: '', fields: [], missing: false, created_at: ts, updated_at: ts,
});
const TOPICS = [
  ['private-legal-ai', 'Private Legal AI on real documents',
    'Security and control: Vault runs on-premise, under IT and compliance control. Icon: database with a padlock.',
    'The client works on confidential documents (legal privilege, personal data, M&A), has a demanding IT/security team, or is wary of public chatbots.',
    'The client has already settled on an on-premise deployment: the on-premise card fits better.', ['security', 'compliance']],
  ['one-environment', 'Law, case law and documents in one environment',
    'Legal sources and the organisation’s documents in one place; the AI works with the context of each matter. Icon: folder with a magnifier.',
    'Today the client jumps between legal databases, a DMS and ChatGPT; lots of research and work on their own documents.',
    '', ['research']],
  ['rollout-routine', 'A rollout that ends in daily routine',
    'Adoption: workshops and Legal Engineering turn processes into workflows and checklists. Icon: layers.',
    'The client has had a failed AI tool rollout before, the team is sceptical, or the board asks about real usage.',
    '', ['adoption', 'rollout']],
  ['no-lock-in', 'Scale without licence lock-in',
    'No fees per user or per workspace. Icon: person with a plus.',
    'A large team (dozens of lawyers or more), plans to expand to other departments, comparison with per-seat licensed tools.',
    'A small firm (a few people): the licensing argument is weak.', ['price', 'scaling']],
  ['one-service', 'One service',
    'One licence covers the technology, sources, workshops, Legal Engineering and an evolving standard. Icon: clipboard with a tick.',
    'The client does not want to assemble a solution from many vendors, has a small IT team, or procurement prefers a single contract.',
    '', ['procurement', 'simplicity']],
  ['safe-start', 'A safe way to start',
    'Fixed monthly fee, price guarantee and an optional 3-month POC you can walk away from. Icon: calculator.',
    'The client hesitates, has a limited budget, or the decision is made by the board/finance.',
    'The slide already has the "A risk-free pilot" card (same argument).', ['price', 'risk']],
  ['sourced-answers', 'Answers you can check',
    'Verifiability: every answer links to a statute, ruling, quote or document. Icon: folder with a magnifier.',
    'A litigation firm with many court filings, a client afraid of AI hallucinations or asking who is liable for mistakes.',
    '', ['quality', 'law-firm']],
  ['organization-know-how', 'Know-how at work on every matter',
    'Reuse of past opinions, letters and templates. Icon: layers.',
    'A large firm or legal department with years of archives; a "reinventing the wheel" problem, lawyer turnover.',
    'A young organisation with no document archive.', ['knowledge', 'law-firm', 'legal-dept']],
  ['on-premise', 'On-premise or hybrid',
    'Runs on the client’s infrastructure, no public cloud. Icon: database with a padlock.',
    'A bank, insurer, public sector body, energy company, a regulated client (financial supervisor, NIS2) or one with a cloud ban.',
    'The client has no infrastructure of its own and prefers a managed service.', ['security', 'regulated']],
];
export const components = [
  ...TOPICS.map(([key, title, desc, use, avoid, tags]) => comp(key, key, 'regular', title, desc, use, avoid, tags)),
  ...TOPICS.map(([key, title, desc, use, avoid, tags]) => comp(`${key}-highlight`, key, 'highlight', `${title} (highlight)`,
    `Green, highlighted version of the card. ${desc}`,
    `The most important argument for this client. ${use}`, avoid, tags)),
  comp('pilot-3-months', 'safe-start', 'stat', 'A risk-free pilot (3 mo.)',
    'Card with a big "3 mo." instead of an icon: a pilot on real matters with the option to walk away.',
    'The client wants to try the tool first, the conversation is at the pilot stage, the decision needs proof of results.',
    'The slide already has the "A safe way to start" card (same topic).', ['risk', 'poc']),
];
export const componentSets = [{
  id: 'why',
  title: 'Why Vault? (6 cards)',
  rules: 'Exactly 6 cards. Exactly one card in the "highlight" variant (green): the most important argument for the client. At most one card per topic. At most one "stat" card. The first row (cards 1–3) holds the strongest arguments for the client.',
  created_at: ts, updated_at: ts,
}];

export const TEMPLATE = { id: 'gaius', name: 'Gaius Vault', file: 'gaius-template.figcraft' };

export default {
  format: 'offer-studio',
  version: 3,
  exported_at: ts,
  blocks,
  templates: [],
  offers: [{ id: OFFER, name: 'Gaius Vault – base offer', template_id: TEMPLATE.id, data: { client: '', price: '------' }, created_at: ts, updated_at: ts }],
  slides,
  components,
  component_sets: componentSets,
};
