import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly, validateAssembly, resolveAssembly, removeInstance, getMounts, addAccessory, unpairAccessory } from './assembly.ts';
import { extendUpright, moveUpright, connectUprights, spanAccessory } from './graph-edits.ts';
import { BuilderStore } from '../src/state/builder-store.ts';
import { detectCollisions } from './assembly-collisions.ts';
test('v1 migration preserves exact world transforms, IDs and optional appearance at every level', () => {
  const current = createAssembly();
  const { uprights, connections, ...rest } = current;
  const legacy = { ...rest, version: 1, appearance: { finish: 'red' }, accessories: current.accessories.map(a => ({ ...a, appearance: { metalness: 0.3 } })) };
  const migrated = validateAssembly(legacy);
  assert.equal(migrated.version, 2);
  assert.deepEqual(resolveAssembly(migrated), resolveAssembly(current));
  assert.deepEqual((migrated as unknown as typeof legacy).appearance, legacy.appearance);
  assert.deepEqual((migrated.accessories[0] as unknown as typeof legacy.accessories[0]).appearance, { metalness: 0.3 });
  assert.deepEqual(validateAssembly(migrated), migrated);
  assert.deepEqual(migrated.uprights, uprights); assert.deepEqual(migrated.connections, connections);
});
test('arbitrary stable post IDs resolve mounts, oriented edges and explicit spans', () => {
  const base = createAssembly({ emptyAccessories: true });
  const extended = extendUpright(base, 'front-left', 'left');
  const id = Object.keys(extended.uprights).at(-1)!;
  assert.equal(Object.keys(extended.uprights).length, 5);
  assert.equal(Object.keys(base.uprights).length, 4);
  assert.ok(getMounts(extended, 'storage-pin-short').some(m => m.uprightId === id));
  const doc = spanAccessory(extended, id, 'front-left', 'pullup-straight', 25);
  const bar = resolveAssembly(doc).find(r => r.ownerId === doc.accessories[0].id)!;
  assert.equal(bar.params.length, 725); assert.deepEqual(bar.connectedTo, [id, 'front-left']);
  for (const instance of resolveAssembly(doc).filter(r => r.part.startsWith('crossmember-') || r.id === bar.id)) for (const m of instance.mounts) {
    const [x,y,z] = m.localAnchor!, angle = instance.rotation[2];
    const world = [instance.position[0]+x*Math.cos(angle)-y*Math.sin(angle),instance.position[1]+x*Math.sin(angle)+y*Math.cos(angle),instance.position[2]+z];
    world.forEach((v,i) => assert.ok(Math.abs(v-m.position[i])<1e-6, `${instance.id}: anchor ${i}`));
  }
  const removed = removeInstance(doc,id);
  assert.equal(removed.accessories.length,0);
  assert.ok(!resolveAssembly(removed).some(r => r.id === id || r.connectedTo.includes(id)));
});
test('graph validation rejects dangling endpoints, duplicate IDs, diagonal and overlapping posts', () => {
  const base = createAssembly({ emptyAccessories:true });
  assert.throws(() => connectUprights(base,'front-left','missing','upper'), /edge/);
  assert.throws(() => connectUprights(base,'front-left','rear-right','upper'), /axis/);
  assert.throws(() => extendUpright(base,'front-left','rear',725), /overlap/);
  assert.throws(() => validateAssembly({...base, connections:[...base.connections,base.connections[0]]}), /edge/);
  assert.throws(() => spanAccessory(base,'front-left','missing','pullup-straight',25), /endpoint/);
  assert.throws(() => spanAccessory(base,'front-left','rear-right','pullup-straight',25), /axis/);
});
test('free post movement snaps on its existing phase and topology undo/redo is atomic', () => {
  const store = new BuilderStore();
  const base = store.getSnapshot().doc;
  const extended = extendUpright(base,'front-left','left',425,false), id = Object.keys(extended.uprights).at(-1)!;
  const moved = moveUpright(extended,id,extended.uprights[id].x-74,extended.uprights[id].y);
  assert.equal(moved.uprights[id].x,extended.uprights[id].x-50);
  store.commit(moved); store.history('undo'); assert.deepEqual(store.getSnapshot().doc,base);
  store.history('redo'); assert.deepEqual(store.getSnapshot().doc,moved);
});
test('dynamic attachment collisions retain real adapters and unpair keeps both safety spans', () => {
  let doc = extendUpright(createAssembly({emptyAccessories:true}),'front-left','left');
  const id = Object.keys(doc.uprights).at(-1)!;
  doc = addAccessory(doc,'storage-pin-short',{uprightId:id,face:'front',hole:12},false);
  doc = addAccessory(doc,'storage-pin-short',{uprightId:id,face:'front',hole:12},false);
  assert.ok(detectCollisions(resolveAssembly(doc)).length > 0);
  const base = createAssembly(), before = resolveAssembly(base).filter(r => r.part === 'safety-box');
  const after = resolveAssembly(unpairAccessory(base,'safeties')).filter(r => r.part === 'safety-box');
  assert.deepEqual(after.map(r => r.position),before.map(r => r.position));
});
