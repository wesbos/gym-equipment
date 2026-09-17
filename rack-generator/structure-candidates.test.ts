import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly, resolveAssembly, validateAssembly, removeInstance } from './assembly.ts';
import { structureCandidates } from './structure-candidates.ts';
import { extendUpright } from './graph-edits.ts';

test('outside candidates add a fifth upright and two real connecting members without mutating input', () => {
  const doc = createAssembly(), before = JSON.stringify(doc);
  const candidates = structureCandidates(doc, 'upright');
  assert.equal(candidates.length, 8);
  for (const c of candidates) {
    assert.equal(Object.keys(c.doc.uprights).length, 5);
    assert.equal(c.doc.connections.length, doc.connections.length+2);
    assert.equal(c.entries.filter(e => e.part === 'upright').length, 1);
    assert.deepEqual(validateAssembly(c.doc), c.doc);
    assert.ok(c.entries.every(e => resolveAssembly(c.doc).some(r => r.id === e.id)));
  }
  assert.equal(JSON.stringify(doc), before);
  assert.ok(!candidates.some(c => c.key === 'front-left:right' || c.key === 'front-left:rear'));
});
test('crossmembers bridge only adjacent posts and missing levels, using chosen real part', () => {
  const doc = createAssembly(), candidates = structureCandidates(doc, 'crossmember-725');
  assert.equal(candidates.length, 3);
  for (const c of candidates) {
    assert.equal(c.doc.connections.length, doc.connections.length+1);
    assert.ok(c.entries.some(e => e.part === 'crossmember-725'));
    assert.ok(!structureCandidates(c.doc, 'crossmember-725').some(next => next.key === c.key));
  }
  const extended = extendUpright(doc, 'front-left', 'left');
  assert.ok(!structureCandidates(extended,'crossmember-725').some(c => c.key.includes('front-right') && c.key.includes('upright-')));
});
test('removed anchors, occupied cells and out of bounds positions are never offered', () => {
  const doc = removeInstance(createAssembly(), 'front-left');
  assert.ok(structureCandidates(doc,'upright').every(c => c.anchorId !== 'front-left'));
  const shifted = createAssembly();
  for (const p of Object.values(shifted.uprights)) p.x += 14350;
  for (const c of structureCandidates(shifted,'upright')) assert.ok(Object.values(c.doc.uprights).every(p => Math.abs(p.x) <= 15000));
  assert.deepEqual(structureCandidates(createAssembly(),'landmine'), []);
});
