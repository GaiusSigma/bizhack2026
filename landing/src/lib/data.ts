// Treści landingu (Offer Studio – generator ofert Gaius-Lex), wspólne dla HTML i skryptu w przeglądarce.
import type { IconName } from './icons';

export interface Role {
  id: string;
  icon: IconName;
  label: string;
  cares: string;
  gets: string;
  headline: string;
  answer: string;
  attach: string;
  /** Rola jeszcze nieobsługiwana przez generator (pokazywana jako „Coming soon”). */
  soon?: boolean;
}

/** Oferty piszemy dziś tylko pod dwie osoby: championa i zarząd. Reszta: coming soon. */
export const roles: Role[] = [
  { id: 'board', icon: 'briefcase', label: 'Board or management', cares: 'One accountable partner, a clear budget and a rollout that sticks.', gets: 'Short offer with the rollout plan and named owners', headline: 'One accountable partner for AI.', answer: 'A rollout plan for the whole organisation, with named owners and a fixed budget.', attach: 'Rollout plan for the board' },
  { id: 'champion', icon: 'star', label: 'Team champion', cares: 'A tool colleagues will actually open on Monday, and arguments to win the board.', gets: 'Offer with a team demo script and a one-page case for the board', headline: 'A tool your team will actually use.', answer: 'A demo script for your colleagues and a one-page case you can take to the board.', attach: 'Team demo script + board one-pager' },
  { id: 'legal', icon: 'scale', label: 'Head of Legal', cares: 'Answers the team can cite and defend.', gets: 'Offer with a source-linked research demo', headline: 'Answers your lawyers can cite.', answer: 'Contract analysis on your own templates, inside Word.', attach: 'Research demo on your case', soon: true },
  { id: 'budget', icon: 'wallet', label: 'Budget owner', cares: 'Return on the spend, in hours saved on research and contract review.', gets: 'Offer with a return-on-investment sheet', headline: 'Hours back on research and contract review.', answer: 'A return sheet built on your team size and caseload.', attach: 'ROI sheet [YOUR NUMBERS]', soon: true },
  { id: 'it', icon: 'server', label: 'IT or CTO', cares: 'Where it runs, how it is secured and what it needs.', gets: 'Technical deployment brief for Gaius Vault', headline: 'Runs on your servers, built to be checked.', answer: 'A deployment brief your IT team can review line by line.', attach: 'Gaius Vault deployment brief', soon: true },
  { id: 'dpo', icon: 'shield', label: 'DPO or compliance', cares: 'Where personal data goes and who processes it.', gets: 'Data-processing brief', headline: 'Your data stays where you keep it.', answer: 'A data-processing brief ready for your DPO.', attach: 'Data-processing brief', soon: true },
];

/** Segmenty, dla których dziś przygotowujemy oferty. */
export const segments: { id: string; icon: IconName; label: string; text: string }[] = [
  { id: 'firm', icon: 'scale', label: 'Law firms', text: 'Partners and teams who bill for answers they must be able to defend.' },
  { id: 'inhouse', icon: 'building', label: 'In-house legal teams', text: 'Legal departments that review contracts for the whole company.' },
  { id: 'public', icon: 'book', label: 'Public administration', text: 'Offices that apply regulations and must document every decision.' },
];

/** `segment` i `text` idą do n8n jako przykładowy lead (pole `text` uruchamia analizę AI). */
export const personas = [
  {
    id: 'firm-pl', label: 'Managing partner, Polish law firm', who: 'Managing partner · Law firm · Poland', role: 'board', segment: 'kancelaria',
    text: 'Dzień dobry, jestem partnerem zarządzającym w kancelarii w Warszawie (40 prawników). Rozważamy AI do researchu i analizy umów, ale boimy się halucynacji w cytatach i tego, że dokumenty klientów wyjdą poza kancelarię. Decyzję podejmujemy na zarządzie w grudniu.',
  },
  {
    id: 'inhouse-hu', label: 'Legal team lead, Hungarian manufacturer', who: 'Legal team lead · In-house legal · Hungary', role: 'champion', segment: 'in-house',
    text: 'Hi, I lead a 6-person legal team at a manufacturer in Győr. I want to bring an AI tool to my team, but I need to convince our board, and my colleagues gave up on the last tool after a month. Our IT insists everything runs on our own servers.',
  },
  {
    id: 'city-pl', label: 'City hall, Poland', who: 'Mayor’s office · Public administration · Poland', role: 'board', segment: 'administracja',
    text: 'Urząd miasta, wydział prawny i zamówienia publiczne. Kierownictwo chce sprawdzić, czy AI przyspieszy analizę nowych przepisów i odpowiedzi na wnioski. Warunek: dane nie mogą opuścić naszej infrastruktury, a każda odpowiedź musi mieć podstawę prawną.',
  },
];

/** Notatka głosowa w demie: przykładowy transkrypt (nagrywanie jest symulowane). */
export const voiceSample = 'Cześć, kieruję małym działem prawnym w firmie logistycznej. Chcę, żeby zespół zaczął korzystać z AI przy umowach, ale muszę mieć coś, co pokażę zarządowi. Martwi mnie, że ludzie spróbują raz i wrócą do starych nawyków.';

export const tabs: { id: 'email' | 'voice' | 'role'; label: string; icon: IconName }[] = [
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'voice', label: 'Voice note', icon: 'mic' },
  { id: 'role', label: 'Pick your role', icon: 'user' },
];

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
}

export const sources: Source[] = [
  { id: 'email', icon: 'mail', label: 'Email', desc: 'A lead writes to sales@. Gmail trigger.', short: 'email to sales@', trigger: 'New email in sales@', who: 'Managing partner · Law firm · Poland' },
  { id: 'fireflies', icon: 'file', label: 'Fireflies transcript', desc: 'A discovery call ends and the transcript is ready.', short: 'Fireflies call transcript', trigger: 'Transcript ready after the call', who: 'Legal team lead · In-house legal · Hungary' },
  { id: 'meet', icon: 'video', label: 'Gaius Meet', desc: 'Our own meeting plugin saves the notes.', short: 'Gaius Meet notes', trigger: 'Meeting notes saved', who: 'Mayor’s office · Public administration · Poland' },
];

export const defaultSource = 'fireflies';

/** Węzły workflow n8n; pierwszy węzeł zależy od wybranego źródła. */
export const flowNodes: { app: string; icon: IconName; label: string; mock?: boolean }[] = [
  { app: 'OFFER STUDIO', icon: 'eye', label: 'Work out who they are and what they need' },
  { app: 'OFFER STUDIO', icon: 'workflow', label: 'Match role and concerns to offer modules' },
  { app: 'OFFER STUDIO', icon: 'spark', label: 'Write the offer, check every claim against its source' },
  { app: 'CRM', icon: 'db', label: 'Create opportunity, move to stage Oferta, attach PDF', mock: true },
  { app: 'DISCORD', icon: 'chat', label: 'Post an alert to #sales', mock: true },
];

export const heroSteps: { icon: IconName; text: string }[] = [
  { icon: 'mail', text: 'Tell us if you are a law firm, an in-house legal team or a public office.' },
  { icon: 'workflow', text: 'Offer Studio writes the offer for the person who decides: your team champion or your board.' },
  { icon: 'file', text: 'You get a ready offer. Briefs for IT, DPO and budget owners are coming soon.' },
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
  { icon: 'briefcase', text: 'A case your board can sign off' },
];

export const concerns: { icon: IconName; title: string; text: string }[] = [
  { icon: 'quote', title: 'Hallucinated citations.', text: 'Source verification on every answer.' },
  { icon: 'server', title: 'It must run locally.', text: 'Gaius Vault, on-premise.' },
  { icon: 'bulb', title: 'Know-how leaving the firm.', text: 'Nothing leaves your infrastructure.' },
  { icon: 'book', title: 'A 2,000-page regulation lands.', text: 'Checked in hours, like EU–Mercosur preferences.' },
];

export const flowFacts: { icon: IconName; title: string; text: string }[] = [
  { icon: 'tool', title: 'Runs on tools we already use.', text: 'Gmail, Fireflies, Gaius Meet, n8n, our CRM and Discord. Nothing new to adopt, so it keeps running after the hackathon.' },
  { icon: 'code', title: 'Run it yourself in three steps.', text: 'Clone the repo, import workflow.json into n8n, start it on the files in sample-data.' },
  { icon: 'eye', title: 'Honest about the demo.', text: 'The CRM write and the Discord alert are mocked. Offers are generated live.' },
];

export const stats: { icon: IconName; label: string; before: string; strike: boolean; after: string }[] = [
  { icon: 'clock', label: 'Time per tailored offer', before: 'about 3 hours', strike: true, after: 'under 3 min' },
  { icon: 'send', label: 'Time to the client’s inbox', before: 'up to 2 days', strike: true, after: 'same day' },
  { icon: 'trend', label: 'Deals lost to late or generic offers', before: 'last 12 months', strike: false, after: '[ESTIMATE]' },
];
