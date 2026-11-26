// Brings the offer workflows from git into n8n on every start, so a deploy needs no manual import.
//
// For each file in /opt/offer-workflows that has a fixed "id": other workflows that listen on the same webhook
// paths (e.g. an older copy imported by hand) are unpublished (not deleted, nothing is lost), then the file is
// imported under its id (replacing that workflow) and published. Files without an "id" are skipped.
// The workflow in git is the source of truth: edits made in the n8n editor are replaced on the next start.
// Turn it off with N8N_SYNC_WORKFLOWS=false. A failure is logged and never stops n8n from starting.
import { execFileSync, spawn } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = process.env.OFFER_WORKFLOWS_DIR || '/opt/offer-workflows';
const n8n = (...args) => execFileSync('n8n', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const log = (msg) => console.log(`offer-workflows: ${msg}`);
const paths = (wf) => (wf.nodes || []).filter((n) => /webhook/i.test(n.type || '') && n.parameters?.path).map((n) => String(n.parameters.path));

// "ElevenLabs" credential (header xi-api-key) used by the workflow to transcribe voice notes the browser could not.
// With ELEVENLABS_API_KEY it is set from the env on every start. Without it, it is only created (empty) when missing:
// n8n refuses to publish a workflow whose node points at a credential that does not exist, and a key entered in
// the editor stays. With an empty key the transcription step fails softly and the offer is built without the text.
const credentialExists = () => {
  try { n8n('export:credentials', '--id=elevenLabsKey', '--output=/tmp/offer-elevenlabs-check.json'); return true; } catch { return false; } finally { rmSync('/tmp/offer-elevenlabs-check.json', { force: true }); }
};
if (process.env.ELEVENLABS_API_KEY || !credentialExists()) {
  const file = '/tmp/offer-elevenlabs-credential.json';
  try {
    writeFileSync(file, JSON.stringify([{ id: 'elevenLabsKey', name: 'ElevenLabs', type: 'httpHeaderAuth', data: { name: 'xi-api-key', value: process.env.ELEVENLABS_API_KEY || '' } }]), { mode: 0o600 });
    n8n('import:credentials', `--input=${file}`);
    log(process.env.ELEVENLABS_API_KEY ? 'ElevenLabs credential set from ELEVENLABS_API_KEY' : 'ElevenLabs credential created empty (set ELEVENLABS_API_KEY to transcribe voice notes in n8n)');
  } catch (e) {
    log(`could not set the ElevenLabs credential: ${String(e.stderr || e.message).trim().split('\n').pop()}`);
  } finally {
    rmSync(file, { force: true });
  }
}

try {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  const wanted = files.map((f) => ({ file: join(DIR, f), wf: JSON.parse(readFileSync(join(DIR, f), 'utf8')) })).filter((x) => x.wf.id);
  if (!wanted.length) process.exit(0);

  let existing = [];
  try {
    n8n('export:workflow', '--all', '--output=/tmp/offer-all-workflows.json');
    existing = JSON.parse(readFileSync('/tmp/offer-all-workflows.json', 'utf8'));
    rmSync('/tmp/offer-all-workflows.json', { force: true });
  } catch {
    existing = []; // empty database: nothing to compare with
  }

  for (const { file, wf } of wanted) {
    const mine = new Set(paths(wf));
    for (const other of existing) {
      if (other.id === wf.id || !paths(other).some((p) => mine.has(p))) continue;
      try {
        n8n('unpublish:workflow', `--id=${other.id}`);
        log(`unpublished "${other.name}" (${other.id}): it listened on the same webhook as "${wf.name}"`);
      } catch (e) {
        log(`could not unpublish ${other.id}: ${String(e.stderr || e.message).trim().split('\n').pop()}`);
      }
    }
    n8n('import:workflow', `--input=${file}`);
    try {
      n8n('publish:workflow', `--id=${wf.id}`);
      log(`"${wf.name}" (${wf.id}) imported from git and published`);
    } catch {
      // The webhooks of a copy unpublished a moment ago stay registered until n8n starts and clears them,
      // so the first publish can fail on a webhook conflict: retry in the background once n8n is up.
      log(`"${wf.name}" (${wf.id}) imported; publishing once n8n has started`);
      spawn('sh', ['-c', `for i in 1 2 3 4; do sleep 30; if n8n publish:workflow --id=${wf.id} >/dev/null 2>&1; then echo "offer-workflows: ${wf.id} published"; exit 0; fi; done; echo "offer-workflows: ${wf.id} NOT published, publish it in the editor"`], { detached: true, stdio: ['ignore', 'inherit', 'inherit'] }).unref();
    }
  }
} catch (e) {
  log(`sync failed, n8n starts with the workflows it has: ${String(e.stdout || '').trim().split('\n').slice(-3).join(' | ')} ${String(e.stderr || e.message).trim().split('\n').slice(-3).join(' | ')}`);
}
