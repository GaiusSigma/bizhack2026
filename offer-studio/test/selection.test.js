import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSelection } from '../public/selection.js';

test('cleanSelection: drops deleted and coming-soon tiles, keeps the rest in order', () => {
  const tiles = [
    { id: 'role:board', status: 'active' }, { id: 'pain:a', status: 'active' }, { id: 'pain:b', status: 'soon' },
  ];
  assert.deepEqual(cleanSelection(['role:board', 'pain:usuniety', 'pain:b', 'pain:a'], tiles), ['role:board', 'pain:a']);
  assert.deepEqual(cleanSelection(undefined, tiles), []);
});

test('slotMatches: client tiles of the kinds a slide answers, directly or through a linked solution', async () => {
  const { slotMatches } = await import('../public/selection.js');
  const sols = { 'sol-x': { tags: ['pain:archive', 'segment:law-firm'] } };
  const item = { tags: ['pain:privacy', 'role:board'], data: { solutions: ['sol-x'] } };
  const client = ['role:board', 'segment:law-firm', 'pain:archive', 'pain:privacy'];
  assert.deepEqual(slotMatches(item, client, ['pain'], sols), ['pain:privacy', 'pain:archive']);
  assert.deepEqual(slotMatches(item, client, ['role', 'segment'], sols), ['role:board', 'segment:law-firm']);
  assert.deepEqual(slotMatches(item, client, [], sols), []);
});
