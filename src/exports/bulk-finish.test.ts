import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';
import { BuilderStore } from '../state/builder-store.ts';
import { createAssembly, resolveAssembly } from '../../rack-generator/assembly.ts';
import { exportPrint3MF } from './print-3mf.ts';
import type { PartDefinition } from '../../rack-generator/types.ts';

const api = await Module(); api.setup();
test('3MF consumes bulk physical finish overrides and subsequent paint through the shared resolver', () => {
  const doc = createAssembly({ emptyAccessories: true });
  const ids = ['front-left', 'front-right'];
  doc.removed = resolveAssembly(doc).filter(r => !ids.includes(r.id)).map(r => r.id);
  doc.appearance = { hardwareFinish: 'gold' };
  const store = new BuilderStore(); store.commit(doc); store.selectMany(ids);
  store.finishSelection('clear-grind'); store.select('front-left'); store.finishSelection('stainless');
  const definition: PartDefinition = { id: 'upright', name: 'Fixture', category: 'Test', defaults: {}, build: api => [
    { name: 'frame', role: 'frame', solid: api.Manifold.cube([10, 10, 10]) },
    { name: 'bolt', role: 'fastener', solid: api.Manifold.cube([3, 3, 3]).translate([20, 0, 0]) },
  ] };
  const colors = () => {
    const archive = exportPrint3MF(api, store.getSnapshot().doc, [definition], { layout: 'assembled' });
    const xml = strFromU8(unzipSync(archive.bytes)['3D/3dmodel.model']);
    return [...xml.matchAll(/displaycolor="([^"]+)"/g)].map(match => match[1]);
  };
  assert.deepEqual(new Set(colors()), new Set(['#C5C9CCFF', '#AAA59AFF', '#D6AD52FF']));
  store.selectMany(ids); store.paintSelection('#ff0000');
  assert.deepEqual(new Set(colors()), new Set(['#FF0000FF', '#D6AD52FF']));
  store.history('undo');
  assert.deepEqual(new Set(colors()), new Set(['#C5C9CCFF', '#AAA59AFF', '#D6AD52FF']));
});
