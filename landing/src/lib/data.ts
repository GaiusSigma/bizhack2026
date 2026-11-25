// Landing page content (Gaius-Lex offer generator), shared by the HTML and the browser script.
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
  /** Rola, dla której generator jeszcze nie pisze ofert (pokazywana jako „Coming soon”). */
  soon?: boolean;
}

// Oferty piszemy dziś tylko w dwóch narracjach: pod championa i pod zarząd. Reszta ról: coming soon.
export const roles: Role[] = [
  { id: 'champion', icon: 'star', label: 'Team champion', cares: 'A tool colleagues will actually open on Monday.', gets: 'Offer with a demo script for the team', headline: 'A tool your team will actually use.', answer: 'A demo script to show your colleagues on day one, built on your own documents.', attach: 'Team demo script' },
  { id: 'board', icon: 'briefcase', label: 'Board or managing partner', cares: 'One accountable partner and a rollout that sticks.', gets: 'Short offer with the rollout plan', headline: 'One accountable partner for AI.', answer: 'A rollout plan for the whole organisation, with named owners.', attach: 'Rollout plan' },
  { id: 'legal', icon: 'scale', label: 'Head of Legal', cares: 'Answers the team can cite and defend.', gets: 'Offer with a source-linked research demo', headline: 'Answers your lawyers can cite.', answer: 'Contract analysis on your own templates, inside Word.', attach: 'Research demo on your case', soon: true },
  { id: 'budget', icon: 'wallet', label: 'Budget owner', cares: 'Return on the spend, in hours saved on research and contract review.', gets: 'Offer with a return-on-investment sheet', headline: 'Hours back on research and contract review.', answer: 'A return sheet built on your team size and caseload.', attach: 'ROI sheet [YOUR NUMBERS]', soon: true },
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

export const personas = [
  { id: 'firm-pl', label: 'Managing partner, law firm', who: 'Managing partner · Law firm · Poland', role: 'board' },
  { id: 'inhouse-pl', label: 'In-house lawyer, manufacturing group', who: 'In-house lawyer · Legal team · Poland', role: 'champion' },
  { id: 'city-pl', label: 'City hall legal office', who: 'City hall · Public administration · Poland', role: 'board' },
];

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
  { id: 'fireflies', icon: 'file', label: 'Fireflies transcript', desc: 'A discovery call ends and the transcript is ready.', short: 'Fireflies call transcript', trigger: 'Transcript ready after the call', who: 'In-house lawyer · Legal team · Poland' },
  { id: 'meet', icon: 'video', label: 'Gaius Meet', desc: 'Our own meeting plugin saves the notes.', short: 'Gaius Meet notes', trigger: 'Meeting notes saved', who: 'City hall · Public administration · Poland' },
];

export const defaultSource = 'fireflies';

/** n8n workflow nodes; the first node depends on the selected source. */
export const flowNodes: { app: string; icon: IconName; label: string; mock?: boolean }[] = [
  { app: 'GAIUS', icon: 'eye', label: 'Work out who they are and what they need' },
  { app: 'GAIUS', icon: 'workflow', label: 'Match role and concerns to offer modules' },
  { app: 'GAIUS', icon: 'spark', label: 'Write the offer, check every claim against its source' },
  { app: 'CRM', icon: 'db', label: 'Create opportunity, move to stage Offer, attach PDF', mock: true },
  { app: 'DISCORD', icon: 'chat', label: 'Post an alert to #sales', mock: true },
];

export const heroSteps: { icon: IconName; text: string }[] = [
  { icon: 'mail', text: 'Type your work email, record a voice note, or pick your role.' },
  { icon: 'workflow', text: 'Gaius matches your concerns to the modules that answer them.' },
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
  { icon: 'code', title: 'Run it yourself in three steps.', text: 'Clone the repo, import workflow.json into n8n, start it on the files in sample-data.' },
  { icon: 'eye', title: 'Honest about the demo.', text: 'The CRM write and the Discord alert are mocked. Offers are generated live.' },
];

export const stats: { icon: IconName; label: string; before: string; strike: boolean; after: string }[] = [
  { icon: 'clock', label: 'Time per tailored offer', before: 'about 3 hours', strike: true, after: 'under 3 min' },
  { icon: 'send', label: 'Time to the client’s inbox', before: 'up to 2 days', strike: true, after: 'same day' },
  { icon: 'trend', label: 'Deals lost to late or generic offers', before: 'last 12 months', strike: false, after: '[ESTIMATE]' },
];
