import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { correctionsFor, draftFromCorrection, lessonInput, lessonsFor, lessonUse } from '../src/lessons.js';

const TILES = ['role:board', 'role:champion', 'segment:law-firm', 'segment:public-sector', 'product:vault', 'pain:confidentiality', 'pain:time']
  .map((id) => ({ id, label: id.split(':')[1] }));
const lesson = (id, over) => ({ id, kind: 'copy', text: id, tiles: [], step: '', example: {}, active: true, created_at: `2026-11-0${id.length % 9}`, ...over });

test('lessons: input is checked (kind, text, known tiles) and PATCH takes only what was sent', () => {
  assert.throws(() => lessonInput({ kind: 'x', text: 'a' }, { tiles: TILES }), /kind/);
  assert.throws(() => lessonInput({ kind: 'copy', text: '  ' }, { tiles: TILES }), /text/);
  assert.throws(() => lessonInput({ kind: 'copy', text: 'a', tiles: ['pain:nope'] }, { tiles: TILES }), /unknown tiles pain:nope/);
  assert.throws(() => lessonInput({ kind: 'copy', text: 'x'.repeat(601) }, { tiles: TILES }), /600/);
  const ok = lessonInput({ kind: 'copy', text: ' Say partners. ', tiles: ['segment:law-firm', 'segment:law-firm'], example: { before: 'board', after: 'partners', junk: 1 } }, { tiles: TILES });
  assert.deepEqual(ok, { kind: 'copy', text: 'Say partners.', tiles: ['segment:law-firm'], example: { before: 'board', after: 'partners' } });
  assert.deepEqual(lessonInput({ active: false }, { tiles: TILES, partial: true }), { active: false });
});

test('lessons: copy lessons apply when the offer has all their tiles; plan lessons always; inactive never', () => {
  const all = [
    lesson('everyone'),
    lesson('law-firms', { tiles: ['segment:law-firm'] }),
    lesson('law-firm-boards', { tiles: ['segment:law-firm', 'role:board'] }),
    lesson('offices', { tiles: ['segment:public-sector'] }),
    lesson('only-title', { step: 'title' }),
    lesson('off', { active: false }),
    lesson('plan-rule', { kind: 'plan', tiles: ['product:vault'] }),
  ];
  const ids = (xs) => xs.map((l) => l.id).sort();
  assert.deepEqual(ids(lessonsFor(all, { kind: 'copy', tiles: ['role:champion', 'segment:law-firm'] })), ['everyone', 'law-firms', 'only-title']);
  assert.deepEqual(ids(lessonsFor(all, { kind: 'copy', tiles: ['role:board', 'segment:law-firm'], step: 'security' })), ['everyone', 'law-firm-boards', 'law-firms']);
  assert.deepEqual(ids(lessonsFor(all, { kind: 'plan' })), ['plan-rule']);
});

test('lessons: corrections are the tiles and the fields people changed after the model, each with a draft', () => {
  const offer = {
    id: 'o1',
    data: { made_by: 'n8n (AI)', first_tiles: ['role:board', 'segment:law-firm', 'product:vault', 'pain:time'], tiles: ['role:champion', 'segment:law-firm', 'product:vault', 'pain:time'], enquiry: 'We are 4 lawyers…' },
    slides: [
      { id: 's1', frame: 'title', data: { title: 'For the partners', lead: 'same' }, origin: { step: 'title', label: 'Title', ai_data: { title: 'For the board', lead: 'same' } } },
      { id: 's2', frame: 'x', data: { title: 'by hand' }, origin: { step: 'x' } },
    ],
  };
  const c = correctionsFor(offer);
  assert.equal(c.count, 2);
  assert.deepEqual(c.tiles.added, ['role:champion']);
  assert.deepEqual(c.tiles.removed, ['role:board']);
  assert.deepEqual(c.fields.map((f) => [f.step, f.field, f.model, f.now]), [['title', 'title', 'For the board', 'For the partners']]);

  const plan = draftFromCorrection(offer, { kind: 'tiles', ...c.tiles }, { tileLabel: (id) => id.split(':')[1] });
  assert.equal(plan.kind, 'plan');
  assert.deepEqual(plan.tiles, ['role:champion', 'role:board']);
  assert.match(plan.text, /^Choose champion, not board when $/);
  assert.equal(plan.example.quote, 'We are 4 lawyers…');
  const copy = draftFromCorrection(offer, c.fields[0]);
  assert.deepEqual(copy, { kind: 'copy', tiles: ['segment:law-firm'], step: 'title', text: 'Title · title: ', example: { field: 'title.title', before: 'For the board', after: 'For the partners' }, offer_id: 'o1' });

  // an offer made by a person has no tile corrections, however its tiles changed
  assert.equal(correctionsFor({ ...offer, data: { ...offer.data, made_by: undefined } }).tiles, null);
});

test('lessons: use is counted from the offers that list them; export and import keep lessons', () => {
  const used = lessonUse([
    { created_at: '2026-11-01', data: { lessons_used: ['a', 'b'] } },
    { created_at: '2026-11-03', data: { lessons_used: ['a', 'a'] } },
    { created_at: '2026-11-02', data: {} },
  ]);
  assert.deepEqual(used, { a: { offers: 2, last: '2026-11-03' }, b: { offers: 1, last: '2026-11-01' } });

  const a = openDb(':memory:');
  const l = a.insert('lessons', { kind: 'plan', text: 'Small firms are champions', tiles: ['role:champion'], step: '', example: { before: 'x' }, active: true }, 'lesson-plan');
  assert.equal(l.active, true);
  assert.deepEqual(l.tiles, ['role:champion']);
  const dump = JSON.parse(JSON.stringify(a.exportAll()));
  assert.equal(dump.lessons.length, 1);
  const b = openDb(':memory:');
  b.importAll(dump, 'replace');
  assert.deepEqual(b.get('lessons', l.id), l);
});
