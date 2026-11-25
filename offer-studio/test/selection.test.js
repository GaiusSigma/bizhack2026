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
