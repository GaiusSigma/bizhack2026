// Landing page content (Gaius-Lex offer generator), shared by the HTML and the browser script.
import type { IconName } from './icons';
import measured from './measured.json';

export interface Role {
  id: string;
  icon: IconName;
  label: string;
  cares: string;
  gets: string;
  headline: string;
  answer: string;
  attach: string;
  /** Rola, dla której generator jeszcze nie pisze ofert (pokazywana jako „Coming soon”). */
  soon?: boolean;
}

// Oferty piszemy dziś tylko w dwóch narracjach: pod championa i pod zarząd. Reszta ról: coming soon.
export const roles: Role[] = [
  { id: 'champion', icon: 'star', label: 'Team champion', cares: 'A tool colleagues will actually open on Monday.', gets: 'Offer with a demo script for the team', headline: 'A tool your team will actually use.', answer: 'A demo script to show your colleagues on day one, built on your own documents.', attach: 'Team demo script' },
  { id: 'board', icon: 'briefcase', label: 'Board or managing partner', cares: 'One accountable partner and a rollout that sticks.', gets: 'Short offer with the rollout plan', headline: 'One accountable partner for AI.', answer: 'A rollout plan for the whole organisation, with named owners.', attach: 'Rollout plan' },
  { id: 'legal', icon: 'scale', label: 'Head of Legal', cares: 'Answers the team can cite and defend.', gets: 'Offer with a source-linked research demo', headline: 'Answers your lawyers can cite.', answer: 'Contract analysis on your own templates, inside Word.', attach: 'Research demo on your case', soon: true },
  { id: 'budget', icon: 'wallet', label: 'Budget owner', cares: 'Return on the spend, in hours saved on research and contract review.', gets: 'Offer with a return-on-investment sheet', headline: 'Hours back on research and contract review.', answer: 'A return sheet built on your team size and caseload.', attach: 'ROI sheet', soon: true },
  { id: 'it', icon: 'server', label: 'IT or CTO', cares: 'Where it runs, how it is secured and what it needs.', gets: 'Technical deployment brief for Gaius Vault', headline: 'Runs on your servers, built to be checked.', answer: 'A deployment brief your IT team can review line by line.', attach: 'Gaius Vault deployment brief', soon: true },
  { id: 'dpo', icon: 'shield', label: 'DPO or compliance', cares: 'Where personal data goes and who processes it.', gets: 'Data-processing brief', headline: 'Your data stays where you keep it.', answer: 'A data-processing brief ready for your DPO.', attach: 'Data-processing brief', soon: true },
];

export const activeRoles = roles.filter((r) => !r.soon);

/** Dla kogo piszemy oferty. Aktywne: kancelarie, działy prawne in-house, administracja publiczna. */
export const segments: { label: string; icon: IconName; soon?: boolean }[] = [
  { label: 'Law firms', icon: 'scale' },
  { label: 'In-house legal teams', icon: 'building' },
  { label: 'Public administration', icon: 'shield' },
  { label: 'Banks and financial institutions', icon: 'wallet', soon: true },
  { label: 'Tax advisors', icon: 'book', soon: true },
  { label: 'Notaries', icon: 'file', soon: true },
];

/** `segment` and `text` are sent to n8n as a sample lead (`text` triggers the AI analysis). */
export const personas = [
  {
    id: 'firm-pl', label: 'Managing partner, law firm', who: 'Managing partner · Law firm · Poland', role: 'board', segment: 'law-firm',
    text: 'Dzień dobry, jestem partnerem zarządzającym w kancelarii w Warszawie (40 prawników). Rozważamy AI do researchu i analizy umów, ale boimy się halucynacji w cytatach i tego, że dokumenty klientów wyjdą poza kancelarię. Decyzję podejmujemy na zarządzie w grudniu.',
  },
  {
    id: 'inhouse-pl', label: 'In-house lawyer, manufacturing group', who: 'In-house lawyer · Legal team · Poland', role: 'champion', segment: 'in-house',
    text: 'Pracuję w 6-osobowym dziale prawnym grupy produkcyjnej. Chcę wprowadzić narzędzie AI w zespole, ale muszę przekonać zarząd, a koledzy porzucili poprzednie narzędzie po miesiącu. IT wymaga, żeby wszystko działało na naszych serwerach.',
  },
  {
    id: 'city-pl', label: 'City hall legal office', who: 'City hall · Public administration · Poland', role: 'board', segment: 'public-sector',
    text: 'Urząd miasta, wydział prawny i zamówienia publiczne. Kierownictwo chce sprawdzić, czy AI przyspieszy analizę nowych przepisów i odpowiedzi na wnioski. Warunek: dane nie mogą opuścić naszej infrastruktury, a każda odpowiedź musi mieć podstawę prawną.',
  },
];

export const tabs: { id: 'email' | 'voice' | 'text' | 'role'; label: string; icon: IconName }[] = [
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'voice', label: 'Voice note', icon: 'mic' },
  { id: 'text', label: 'Paste a call', icon: 'quote' },
  { id: 'role', label: 'Pick your role', icon: 'user' },
];

/** "Paste a call" tab: a sample discovery call (made up, no real client) for a quick try. */
export const sampleCall = `Gaius-Lex x in-house legal team, discovery call (sample, no real client)

Agnieszka (Head of Legal): We are eight lawyers in the legal department of a logistics group, twelve companies in Poland and Czechia. Most of our week goes on supplier contracts, NDAs and data processing agreements, every company has its own templates.
Agnieszka: People already paste contracts into ChatGPT on their phones. I know it, the board knows it. I would rather give them something approved than pretend it does not happen.
Janusz (Gaius): What would the board need to see to say yes?
Agnieszka: Two things. Documents cannot leave our infrastructure, our IT is strict about that. And I need to show that the team will actually use it, the last tool we bought was dead after a month.
Agnieszka: We looked at Microsoft Copilot, we already have the licences, but it does not know Polish law and it cannot check rulings.
Janusz: Who signs off on the budget?
Agnieszka: The management board, in January. I would like a pilot before that.`;

/** Pain tiles (Offer Studio) in the visitor's words: the landing shows the ones the offer answers. */
export const pains: Record<string, string> = {
  confidentiality: 'Contracts and know-how must not leave the organisation.',
  'shadow-ai': 'People paste documents into free chatbots anyway, with no control over it.',
  'repetitive-documents': 'NDAs, data processing agreements and the same letters drafted from scratch.',
  'board-pressure': 'More work without new hires, and the board expects a return on AI.',
  'chatgpt-only-informs': 'General AI gives information but does not help draft and check documents.',
  'hallucinated-citations': 'General AI makes up rulings and statutes, so everything has to be checked.',
  'unsearchable-archive': 'Opinions, contracts and emails sit on drives, found only by file name.',
  'copy-to-word': 'Chat output has to be moved into Word and formatted by hand.',
  'group-scale': 'Many companies and legal teams, and documents must follow one standard.',
  'templates-at-scale': 'Good templates exist, but they are filled by hand with data from hundreds of matters.',
  'weak-case-law-search': 'LEX and Legalis often miss rulings or make them hard to find.',
};

export const buildSteps = [
  'Reading what you shared',
  'Matching your role and concerns',
  'Assembling the offer modules',
  'Checking every claim against its source',
];

export interface Source {
  id: string;
  icon: IconName;
  label: string;
  desc: string;
  short: string;
  trigger: string;
  who: string;
  /** What this source hands n8n in the live run (made up, no real client). */
  sample: string;
}

export const sources: Source[] = [
  { id: 'email', icon: 'mail', label: 'Email', desc: 'A lead writes to sales@. Gmail trigger.', short: 'email to sales@', trigger: 'New email in sales@', who: 'Managing partner · Law firm · Poland',
    sample: 'Subject: AI for research and contracts\n\nGood morning, I am a managing partner at a 25-lawyer firm in Kraków. We want AI for legal research and contract review, but every citation must lead to a real ruling, and client files cannot go to a public cloud. Could you send an offer before our partners meeting next week?' },
  { id: 'fireflies', icon: 'file', label: 'Fireflies transcript', desc: 'A discovery call ends and the transcript is ready.', short: 'Fireflies call transcript', trigger: 'Transcript ready after the call', who: 'In-house lawyer · Legal team · Poland',
    sample: 'Call summary: in-house lawyer at a pharma company, legal team of 5. They review dozens of NDAs and supply contracts a month, all from templates. Some colleagues already use ChatGPT on private accounts. She wants to bring a tool in, but needs the board to approve it, and IT wants it on their own servers.\n\nLawyer: I would be the one showing it to the team, so it has to be simple.\nGaius: What did you try before?\nLawyer: Copilot, but it does not cite Polish law.' },
  { id: 'meet', icon: 'video', label: 'Gaius Meet', desc: 'Our own meeting plugin saves the notes.', short: 'Gaius Meet notes', trigger: 'Meeting notes saved', who: 'City hall · Public administration · Poland',
    sample: 'Meeting notes: head of the legal office at a city hall, 15 legal advisers. Hundreds of freedom-of-information requests and public procurement questions a year. Conditions: data must stay on the city servers, and every answer needs its legal basis. Management decides on the budget in Q1.' },
];

export const defaultSource = 'fireflies';

/** n8n workflow nodes; the first node depends on the selected source. */
export const flowNodes: { app: string; icon: IconName; label: string; mock?: boolean }[] = [
  { app: 'OFFER STUDIO', icon: 'eye', label: 'Work out who they are and what they need' },
  { app: 'OFFER STUDIO', icon: 'workflow', label: 'Match role and concerns to offer modules' },
  { app: 'OFFER STUDIO', icon: 'spark', label: 'Write the offer, check every claim against its source' },
  { app: 'CRM', icon: 'db', label: 'Create opportunity, move to stage Offer, attach PDF', mock: true },
  { app: 'DISCORD', icon: 'chat', label: 'Post an alert to #sales', mock: true },
];

export const heroSteps: { icon: IconName; text: string }[] = [
  { icon: 'mail', text: 'Type your work email, record a voice note, or pick your role.' },
  { icon: 'workflow', text: 'Offer Studio matches your concerns to the modules that answer them.' },
  { icon: 'file', text: 'You get a ready offer, written for the team champion or for the board.' },
];

export const apps: { label: string; icon: IconName }[] = [
  { label: 'Gmail', icon: 'mail' },
  { label: 'Fireflies', icon: 'file' },
  { label: 'Gaius Meet', icon: 'video' },
  { label: 'n8n', icon: 'workflow' },
  { label: 'CRM', icon: 'db' },
  { label: 'Discord', icon: 'chat' },
];

export const includes: { icon: IconName; text: string }[] = [
  { icon: 'user', text: 'Your situation, in your words' },
  { icon: 'alert', text: 'The concerns we heard' },
  { icon: 'shield', text: 'How Gaius answers each one' },
  { icon: 'file', text: 'Next steps your team can act on' },
];

export const concerns: { icon: IconName; title: string; text: string }[] = [
  { icon: 'quote', title: 'Hallucinated citations.', text: 'Source verification on every answer.' },
  { icon: 'server', title: 'It must run locally.', text: 'Gaius Vault, on-premise.' },
  { icon: 'bulb', title: 'Know-how leaving the firm.', text: 'Nothing leaves your infrastructure.' },
  { icon: 'book', title: 'A 2,000-page regulation lands.', text: 'Checked in hours, like EU–Mercosur preferences.' },
];

export const flowFacts: { icon: IconName; title: string; text: string }[] = [
  { icon: 'tool', title: 'Runs on tools we already use.', text: 'Gmail, Fireflies, Gaius Meet, n8n, our CRM and Discord. Nothing new to adopt, so it keeps running after the hackathon.' },
  { icon: 'code', title: 'Run it yourself in three steps.', text: 'Clone the repo, start it with Docker Compose, send a file from sample-data. The workflow imports itself.' },
  { icon: 'eye', title: 'Honest about the demo.', text: 'The CRM write and the Discord alert are mocked. The offer, the AI copy and the PDF are generated live.' },
];

/** Measured on the production workflow's real runs: `node scripts/measure.mjs` writes measured.json. */
export { measured };
const usd = (x: number | null) => (x == null ? '' : x < 0.01 ? `$${x.toFixed(3)}` : `$${x.toFixed(2)}`);

export const stats: { icon: IconName; label: string; before: string; strike: boolean; after: string; note: string }[] = [
  { icon: 'clock', label: 'Time per tailored offer', before: 'about 3 hours', strike: true, after: `${Math.round(measured.seconds.median ?? 0)} s`, note: `median · 9 in 10 under ${Math.ceil(measured.seconds.p90 ?? 0)} s` },
  { icon: 'send', label: 'Time to the client’s inbox', before: 'up to 2 days', strike: true, after: 'same day', note: 'deck ready seconds after the call; a salesperson checks it and sends it' },
  { icon: 'wallet', label: 'Cost per offer', before: '3 h of a salesperson', strike: true, after: usd(measured.costPerDeckUsd), note: `AI cost · ${measured.model}` },
  { icon: 'check', label: 'Deck sections written for this client', before: 'generic deck', strike: true, after: `${measured.slidesWrittenMedian} of 10`, note: `${measured.decksWithoutWarnings} of ${measured.decks} decks passed every check` },
];
