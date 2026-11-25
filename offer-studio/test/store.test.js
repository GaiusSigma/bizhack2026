import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { renderOffer } from '../src/render.js';
import seed from '../seed/seed.js';

const fresh = () => {
  const s = openDb(':memory:');
  s.importAll(seed, 'merge');
  return s;
};

test('seed: wszystkie slajdy oferty bazowej renderują się bez błędów', () => {
  const s = fresh();
  const html = renderOffer(s, 'gaius-vault-bazowa', { mode: 'pdf' });
  assert.equal((html.match(/<section class="slide /g) || []).length, 11);
  assert.ok(!html.includes('class="slide-error"'), 'żaden slajd nie powinien zgłaszać błędu');
  assert.ok(html.includes('Pilne pismo lub roszczenie'));
});

test('PATCH scala data, a null usuwa klucz', () => {
  const s = fresh();
  s.update('blocks', 'uc-pilne-pismo', { data: { extra: 'x' } });
  assert.deepEqual(s.get('blocks', 'uc-pilne-pismo').data, { effect: 'szybsza reakcja i większa kontrola ryzyka.', extra: 'x' });
  s.update('blocks', 'uc-pilne-pismo', { data: { extra: null } });
  assert.deepEqual(Object.keys(s.get('blocks', 'uc-pilne-pismo').data), ['effect']);
  s.update('blocks', 'uc-pilne-pismo', { data: { only: 1 } }, { replaceData: true });
  assert.deepEqual(s.get('blocks', 'uc-pilne-pismo').data, { only: 1 });
});

test('eksport -> import replace odtwarza bazę 1:1', () => {
  const a = fresh();
  a.putAsset({ id: 'logo', name: 'logo.png', mime: 'image/png', data: Buffer.from([1, 2, 3]) });
  const dump = JSON.parse(JSON.stringify(a.exportAll()));
  const b = openDb(':memory:');
  b.insert('blocks', { id: 'do-skasowania', type: 'x', title: 'x' });
  const counts = b.importAll(dump, 'replace');
  assert.equal(counts.blocks, seed.blocks.length);
  assert.equal(b.get('blocks', 'do-skasowania'), undefined);
  const again = JSON.parse(JSON.stringify(b.exportAll()));
  for (const k of ['blocks', 'layouts', 'offers', 'slides', 'assets', 'settings']) assert.deepEqual(again[k], dump[k], k);
});

test('import merge nie kasuje slajdów oferty (bez kaskady)', () => {
  const s = fresh();
  s.importAll({ format: 'offer-studio', version: 1, offers: [{ id: 'gaius-vault-bazowa', name: 'Nowa nazwa', data: {} }] }, 'merge');
  const o = s.getOffer('gaius-vault-bazowa');
  assert.equal(o.name, 'Nowa nazwa');
  assert.equal(o.slides.length, 11);
});

test('kolejność slajdów, wstawianie na pozycję i duplikat oferty', () => {
  const s = fresh();
  const ids = s.getOffer('gaius-vault-bazowa').slides.map((x) => x.id);
  s.reorderSlides('gaius-vault-bazowa', [...ids].reverse());
  assert.equal(s.getOffer('gaius-vault-bazowa').slides[0].id, ids.at(-1));
  const added = s.addSlide('gaius-vault-bazowa', { layout_id: 'html', data: { html: '<p>x</p>' }, position: 1 });
  assert.equal(s.getOffer('gaius-vault-bazowa').slides[1].id, added.id);
  assert.throws(() => s.reorderSlides('gaius-vault-bazowa', ids), /wszystkie slajdy/);
  const copy = s.duplicateOffer('gaius-vault-bazowa');
  assert.equal(copy.slides.length, 12);
  s.remove('offers', 'gaius-vault-bazowa');
  assert.equal(s.list('slides', 'offer_id = :id', { id: 'gaius-vault-bazowa' }).length, 0);
});

test('slajd z zapytaniem pokazuje bloki wg typu i tagu', () => {
  const s = fresh();
  const slide = s.addSlide('gaius-vault-bazowa', { layout_id: 'cards', data: { title: 'Kancelaria' }, query: { type: 'use_case', tag: 'kancelaria' } });
  const html = renderOffer(s, 'gaius-vault-bazowa', { mode: 'pdf' });
  const part = html.slice(html.indexOf(`data-slide="${slide.id}"`));
  assert.equal((part.match(/class="card" data-block=/g) || []).length, 2);
});

test('błąd w szablonie nie wywraca całej oferty', () => {
  const s = fresh();
  s.update('layouts', 'cards', { template: '{{#each blocks}}' });
  const html = renderOffer(s, 'gaius-vault-bazowa', { mode: 'pdf' });
  assert.ok(html.includes('class="slide-error"'));
  assert.ok(html.includes('Gaius Vault'));
});
