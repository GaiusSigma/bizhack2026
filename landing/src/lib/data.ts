// Treści landingu (generator ofert Gaius-Lex), wspólne dla HTML i skryptu w przeglądarce.
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
}

export const roles: Role[] = [
  { id: 'legal', icon: 'scale', label: 'Head of Legal', cares: 'Answers the team can cite and defend.', gets: 'Offer with a source-linked research demo', headline: 'Answers your lawyers can cite.', answer: 'Contract analysis on your own templates, inside Word.', attach: 'Research demo on your case' },
  { id: 'board', icon: 'briefcase', label: 'CEO or board', cares: 'One accountable partner and a rollout that sticks.', gets: 'Short offer with the rollout plan', headline: 'One accountable partner for AI.', answer: 'A rollout plan for the whole organisation, with named owners.', attach: 'Rollout plan' },
  { id: 'budget', icon: 'wallet', label: 'Budget owner', cares: 'Return on the spend, in hours saved on research and contract review.', gets: 'Offer with a return-on-investment sheet', headline: 'Hours back on research and contract review.', answer: 'A return sheet built on your team size and caseload.', attach: 'ROI sheet [YOUR NUMBERS]' },
  { id: 'it', icon: 'server', label: 'IT or CTO', cares: 'Where it runs, how it is secured and what it needs.', gets: 'Technical deployment brief for Gaius Vault', headline: 'Runs on your servers, built to be checked.', answer: 'A deployment brief your IT team can review line by line.', attach: 'Gaius Vault deployment brief' },
  { id: 'dpo', icon: 'shield', label: 'DPO or compliance', cares: 'Where personal data goes and who processes it.', gets: 'Data-processing brief', headline: 'Your data stays where you keep it.', answer: 'A data-processing brief ready for your DPO.', attach: 'Data-processing brief' },
  { id: 'champion', icon: 'star', label: 'Team champion', cares: 'A tool colleagues will actually open on Monday.', gets: 'Demo script for the team', headline: 'A tool your team will actually use.', answer: 'A demo script to show your colleagues on day one.', attach: 'Team demo script' },
];

export const personas = [
  { id: 'legal-hu', label: 'Head of Legal, Hungarian manufacturer', who: 'Head of Legal · Manufacturing · Hungary', role: 'legal' },
  { id: 'cfo-cz', label: 'CFO, Czech bank', who: 'CFO · Banking · Czechia', role: 'budget' },
  { id: 'city-pl', label: 'City hall, Poland', who: 'City hall · Public sector · Poland', role: 'board' },
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
  { id: 'email', icon: 'mail', label: 'Email', desc: 'A lead writes to sales@. Gmail trigger.', short: 'email to sales@', trigger: 'New email in sales@', who: 'CFO · Banking · Czechia' },
  { id: 'fireflies', icon: 'file', label: 'Fireflies transcript', desc: 'A discovery call ends and the transcript is ready.', short: 'Fireflies call transcript', trigger: 'Transcript ready after the call', who: 'Head of Legal · Manufacturing · Hungary' },
  { id: 'meet', icon: 'video', label: 'Gaius Meet', desc: 'Our own meeting plugin saves the notes.', short: 'Gaius Meet notes', trigger: 'Meeting notes saved', who: 'City hall · Public sector · Poland' },
];

export const defaultSource = 'fireflies';

/** Węzły workflow n8n; pierwszy węzeł zależy od wybranego źródła. */
export const flowNodes: { app: string; icon: IconName; label: string; mock?: boolean }[] = [
  { app: 'GAIUS', icon: 'eye', label: 'Work out who they are and what they need' },
  { app: 'GAIUS', icon: 'workflow', label: 'Match role and concerns to offer modules' },
  { app: 'GAIUS', icon: 'spark', label: 'Write the offer, check every claim against its source' },
  { app: 'CRM', icon: 'db', label: 'Create opportunity, move to stage Oferta, attach PDF', mock: true },
  { app: 'DISCORD', icon: 'chat', label: 'Post an alert to #sales', mock: true },
];

export const heroSteps: { icon: IconName; text: string }[] = [
  { icon: 'mail', text: 'Type your work email, record a voice note, or pick your role.' },
  { icon: 'workflow', text: 'Gaius matches your concerns to the modules that answer them.' },
  { icon: 'file', text: 'You get a ready offer, plus the briefs your IT and data-protection teams will ask for.' },
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
  { icon: 'file', text: 'Briefs for IT and your DPO' },
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
