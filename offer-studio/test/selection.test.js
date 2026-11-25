import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSelection } from '../public/selection.js';

test('cleanSelection: usuwa z wyboru kafelki usunięte i „wkrótce”, resztę zostawia w kolejności', () => {
  const tiles = [
    { id: 'rola:zarzad', status: 'active' }, { id: 'bol:a', status: 'active' }, { id: 'bol:b', status: 'soon' },
  ];
  assert.deepEqual(cleanSelection(['rola:zarzad', 'bol:usuniety', 'bol:b', 'bol:a'], tiles), ['rola:zarzad', 'bol:a']);
  assert.deepEqual(cleanSelection(undefined, tiles), []);
});
