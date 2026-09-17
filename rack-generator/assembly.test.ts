import type { ResolvedInstance, Vec3, RackDoc } from './types.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly, validateAssembly, resolveAssembly, addAccessory, moveAccessory, unpairAccessory, removeInstance, restoreInstance, resizeAssembly, getMounts, getAvailableStructure, replaceStructurePart, getPartPlacementInfo } from './assembly.ts';
import { attachmentPartIds, getAttachmentAnchor } from './attachment-mounts.ts';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.00001, `${a} != ${b}`);
const world = (instance: ResolvedInstance, point: Vec3) => {
  const a = instance.rotation[2];
  return [point[0] * Math.cos(a) - point[1] * Math.sin(a) + instance.position[0], point[0] * Math.sin(a) + point[1] * Math.cos(a) + instance.position[1], point[2] + instance.position[2]];
};

test('default frame uses clear distances and compensates asymmetric upright origins', () => {
  const doc = createAssembly(), instances = resolveAssembly(doc);
  assert.equal(instances.length, 14);
  assert.deepEqual(doc.rack, { height: 2032, width: 1075, depth: 725, tube: 75, holeDiameter: 25, pitch: 50, firstHole: 65 });
  const centers = instances.filter(x => x.part === 'upright').map(x => world(x, [15, 0, 0]));
  centers.forEach(p => { close(Math.abs(p[0]), 575); close(Math.abs(p[1]), 400); close(p[2], 0); });
  const depth = instances.find(x => x.id === 'left-upper-crossmember')!;
  close(world(depth, [-362.5, 0, 25])[1], -362.5);
  close(world(depth, [362.5, 0, 25])[1], 362.5);
  close(world(depth, [0, 0, 25])[2], depth.mount!.center[2]);
  assert.equal(depth.params.holeDiameter, 25);
  assert.equal(instances.find(x => x.id === 'rear-crossmember')!.params.length, 1075);
});

test('actual J-hook retaining-pin midpoints align with both paired upright hole centers', () => {
  for (const part of ['j-hook-standard', 'j-hook-roller', 'j-hook-sandwich']) {
    const doc = addAccessory(createAssembly({ emptyAccessories: true }), part, { uprightId: 'front-left', face: 'front', hole: 20 }, true);
    for (const instance of resolveAssembly(doc).filter(x => x.kind === 'accessory')) {
      world(instance, instance.mount!.localAnchor!).forEach((v, i) => close(v, instance.mount!.center[i]));
      assert.equal(instance.rotation[2], Math.PI);
      assert.equal(instance.mount!.hole, 20);
    }
  }
});

test('safety cradle origins align with front and rear post centers after a depth change', () => {
  let doc = createAssembly(); doc = resizeAssembly(doc, { depth: 1075 });
  const safety = resolveAssembly(doc).find(x => x.id === 'safeties:left')!;
  assert.equal(safety.params.length, 1069);
  assert.equal(safety.params.upright, 75);
  for (const m of safety.mounts) world(safety, m.localAnchor!).forEach((v, i) => close(v, m.center[i]));
  const pipeDoc = addAccessory(createAssembly({ emptyAccessories: true }), 'safety-pin-pipe', { uprightId: 'front-right', face: 'left', hole: 10 }, false);
  assert.equal(resolveAssembly(pipeDoc).find(x => x.kind === 'accessory')!.params.length, 725);
});

test('height resize preserves explicit accessory stations and moves the top-connected bar', () => {
  const before = createAssembly(), after = resizeAssembly(before, { height: 2300 });
  assert.equal(after.accessories.find(x => x.id === 'jhooks-front')!.target.hole, 24);
  assert.equal(after.accessories.find(x => x.id === 'safeties')!.target.hole, 12);
  assert.ok(after.accessories.find(x => x.id === 'pullup-front')!.target.hole > before.accessories.find(x => x.id === 'pullup-front')!.target.hole);
  assert.equal(before.rack.height, 2032);
  assert.throws(() => resizeAssembly(before, { height: 1100 }), /fits hole numbers/);
});

test('move, pairing and deletion are immutable and use owner IDs from resolved meshes', () => {
  const before = createAssembly();
  const moved = moveAccessory(before, 'jhooks-front:left', { uprightId: 'rear-left', face: 'back', hole: 22 }, false);
  assert.equal(before.accessories.find(a => a.id === 'jhooks-front')!.target.hole, 24);
  assert.equal(resolveAssembly(moved).filter(x => x.ownerId === 'jhooks-front').length, 1);
  const removed = removeInstance(before, 'jhooks-front:right');
  assert.equal(removed.accessories.some(a => a.id === 'jhooks-front'), false);
  assert.equal(before.accessories.length, 3);
});

test('unpair keeps both matching hooks in place and permits independent height changes', () => {
  const before = createAssembly(), unpaired = unpairAccessory(before, 'jhooks-front:left');
  const hooks = unpaired.accessories.filter(a => a.part === 'j-hook-standard');
  assert.equal(hooks.length, 2); assert.ok(hooks.every(a => !a.paired));
  assert.deepEqual(hooks.map(a => a.target.uprightId).sort(), ['front-left', 'front-right']);
  const moved = moveAccessory(unpaired, hooks[1].id, { hole: 25 });
  assert.equal(moved.accessories.find(a => a.id === 'jhooks-front')!.target.hole, 24);
  assert.equal(moved.accessories.find(a => a.id === hooks[1].id)!.target.hole, 25);
  assert.equal(before.accessories.filter(a => a.part === 'j-hook-standard').length, 1);
});

test('removing an upright cascades to its frame connections and spanning accessories', () => {
  const doc = removeInstance(createAssembly(), 'front-left');
  assert.ok(doc.removed.includes('left-upper-crossmember'));
  assert.ok(doc.removed.includes('left-lower-crossmember'));
  assert.equal(doc.accessories.length, 0);
  assert.equal(resolveAssembly(doc).some(x => x.connectedTo.includes('front-left')), false);
  assert.deepEqual(getAvailableStructure(doc), [{ id: 'front-left', part: 'upright' }]);
  assert.throws(() => restoreInstance(doc, 'left-upper-crossmember'), /uprights first/);
  const restored = restoreInstance(doc, 'front-left');
  assert.equal(getAvailableStructure(restored).length, 2);
  assert.equal(restored.accessories.length, 0);
});

test('available mount positions correspond to real 50 mm stations on all four faces', () => {
  const doc = createAssembly(), mounts = getMounts(doc);
  const m = mounts.find(x => x.uprightId === 'front-left' && x.face === 'front' && x.hole === 3)!;
  assert.deepEqual(m.position, [-575, -437.5, 215]);
  assert.deepEqual(m.center, [-575, -400, 215]);
  assert.ok(mounts.every(x => x.position[2] + 12.5 <= doc.rack.height));
  assert.equal(getMounts(removeInstance(doc, 'front-left')).some(x => x.uprightId === 'front-left'), false);
});

test('wide pull-up variants use upper rail connections and reject missing supporting rails', () => {
  for (const part of ['pullup-multigrip', 'pullup-sphere']) {
    const doc = addAccessory(createAssembly({ emptyAccessories: true }), part, { uprightId: 'front-left', face: 'right', hole: 10 });
    const instance = resolveAssembly(doc).find(x => x.kind === 'accessory')!;
    assert.equal(instance.params.length, 1075);
    assert.ok(instance.connectedTo.includes('left-upper-crossmember'));
    assert.equal(doc.accessories[0].paired, false);
    assert.equal(doc.accessories[0].target.hole, 37);
    assert.equal(instance.mounts.length, 4);
    for (const m of instance.mounts) world(instance, m.localAnchor!).forEach((v, i) => close(v, m.position[i]));
    const targets = getMounts(doc, part);
    assert.equal(targets.length, 4); assert.ok(targets.every(m => m.hole === 37 && m.label === 'Upper side rails'));
    assert.equal(removeInstance(doc, 'left-upper-crossmember').accessories.length, 0);
  }
});

test('connection compatibility rejects wrong faces and dimensions that alter sleeve fit', () => {
  const doc = createAssembly({ emptyAccessories: true });
  assert.throws(() => addAccessory(doc, 'safety-box', { uprightId: 'front-left', face: 'front', hole: 12 }), /inward-facing/);
  assert.throws(() => addAccessory(doc, 'unknown-part'), /adapter/);
  assert.throws(() => addAccessory(doc, 'j-hook-standard', {}, true, { width: 100 }), /75 mm upright fit/);
  assert.throws(() => resizeAssembly(doc, { tube: 80 }), /75 mm uprights/);
  assert.throws(() => addAccessory(doc, 'pullup-straight', {}, false, { length: 1500 }), /controlled by/);
});

test('untrusted documents reject invalid version, nonfinite values, unknown parts and duplicate IDs', () => {
  const doc = createAssembly();
  assert.throws(() => validateAssembly({ ...doc, version: 99 }), /Unsupported/);
  assert.throws(() => validateAssembly({ ...doc, rack: { ...doc.rack, height: Infinity } }), /Height/);
  assert.throws(() => validateAssembly({ ...doc, accessories: [...doc.accessories, doc.accessories[0]] }), /unique/);
  assert.throws(() => validateAssembly({ ...doc, accessories: [{ ...doc.accessories[0], part: '../../x' }] }), /adapter/);
  assert.throws(() => validateAssembly({ ...doc, accessories: Array.from({ length: 41 }, (_, i) => ({ ...doc.accessories[0], id: `a-${i}` })) }), /at most/);
  const clone = validateAssembly(JSON.parse(JSON.stringify(doc))); clone.rack.width = 999;
  assert.equal(doc.rack.width, 1075);
});

test('legacy version-one documents acquire empty structural overrides without moving parts', () => {
  const doc: Omit<RackDoc, 'structure'> & { structure?: RackDoc['structure'] } = createAssembly(); delete doc.structure;
  const normalized = validateAssembly(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(normalized.structure, {});
  assert.equal(resolveAssembly(normalized).length, 14);
});

test('all nominal straight variants use the actual connection span and restore a removed slot', () => {
  for (const part of ['crossmember-425', 'crossmember-725', 'crossmember-1075']) {
    let doc = removeInstance(createAssembly(), 'left-lower-crossmember');
    doc = replaceStructurePart(doc, 'left-lower-crossmember', part);
    const instance = resolveAssembly(doc).find(i => i.id === 'left-lower-crossmember')!;
    assert.equal(instance.part, part); assert.equal(instance.params.length, 725);
    assert.equal(doc.removed.includes('left-lower-crossmember'), false);
  }
});

test('angled crossmember flanges meet real front and rear hole stations', () => {
  let doc = replaceStructurePart(createAssembly(), 'left-upper-crossmember', 'angled-crossmember');
  const instance = resolveAssembly(doc).find(i => i.id === 'left-upper-crossmember')!;
  assert.equal(instance.params.rise, 200);
  assert.equal(instance.mounts[0].hole - instance.mounts[1].hole, 4);
  for (const m of instance.mounts) world(instance, m.localAnchor!).forEach((v, i) => close(v, m.position[i]));
  assert.throws(() => replaceStructurePart(doc, 'left-upper-crossmember', 'angled-crossmember', { rise: 199 }), /hole stations/);
  assert.throws(() => addAccessory(doc, 'pullup-multigrip', { uprightId: 'front-left', face: 'right' }), /level upper/);
  assert.equal(getMounts(doc, 'pullup-multigrip').length, 0);
});

test('offset crossmember uses rear post face plates rather than centered span assumptions', () => {
  const doc = replaceStructurePart(createAssembly(), 'rear-crossmember', 'offset-crossmember');
  const instance = resolveAssembly(doc).find(i => i.id === 'rear-crossmember')!;
  assert.equal(instance.params.length, 1225);
  for (const m of instance.mounts) world(instance, m.localAnchor!).forEach((v, i) => close(v, m.position[i]));
  assert.equal(instance.mounts[0].face, 'front');
  const resized = resolveAssembly(resizeAssembly(doc, { width: 1200 })).find(i => i.id === 'rear-crossmember')!;
  for (const m of resized.mounts) world(resized, m.localAnchor!).forEach((v, i) => close(v, m.position[i]));
});

test('full branded rail clears the top and standalone panel retains its supporting rail', () => {
  const full = resolveAssembly(replaceStructurePart(createAssembly(), 'rear-crossmember', 'branded-crossmember')).find(i => i.id === 'rear-crossmember')!;
  assert.equal(full.params.panelHeight, 300); assert.ok(full.position[2] + 300 <= 2032);
  const doc = replaceStructurePart(createAssembly(), 'rear-crossmember', 'nameplate');
  const entries = resolveAssembly(doc).filter(i => i.ownerId === 'rear-crossmember');
  assert.equal(entries.length, 2);
  const panel = entries.find(i => i.part === 'nameplate')!, beam = entries.find(i => i.part === 'crossmember-1075')!;
  close(panel.position[2] + 225, beam.position[2] + 37.5);
  assert.throws(() => replaceStructurePart(doc, 'left-upper-crossmember', 'nameplate'), /does not fit/);
});

test('stabilizer feet stay on the floor and align their mounting plate with each post face', () => {
  for (const part of ['foot-400', 'foot-800']) for (const face of ['front', 'back', 'left', 'right'] as const) {
    const doc = addAccessory(createAssembly(), part, { uprightId: 'front-left', face, hole: 0 }, true);
    const instances = resolveAssembly(doc).filter(i => i.part === part);
    assert.equal(instances.length, 2);
    for (const instance of instances) {
      close(instance.position[2], 0);
      world(instance, instance.mount!.localAnchor!).forEach((v, i) => close(v, instance.mount!.position[i]));
    }
    assert.equal(getPartPlacementInfo(part)!.fixedHole, 0);
    assert.ok(getMounts(doc, part).every(m => m.hole === 0));
  }
});

test('all eight additional attachments align their real pin and bolt stations on every face', () => {
  for (const part of attachmentPartIds) for (const face of ['front', 'back', 'left', 'right'] as const) {
    const doc = addAccessory(createAssembly({ emptyAccessories: true }), part, { uprightId: 'front-left', face, hole: 12 }, true);
    const info = getPartPlacementInfo(part), entries = resolveAssembly(doc).filter(i => i.kind === 'accessory');
    assert.equal(entries.length, info!.paired ? 2 : 1, part);
    for (const instance of entries) for (const m of instance.mounts) {
      world(instance, m.localAnchor!).forEach((v, i) => close(v, m.center[i]));
      assert.ok(m.position[2] >= 65 && m.position[2] + 12.5 < doc.rack.height);
      assert.ok(instance.collisionBoxes!.length > 0);
    }
  }
});

test('attachment adapters preserve clamp fit, full bolt patterns and body height limits', () => {
  const doc = createAssembly({ emptyAccessories: true });
  assert.throws(() => addAccessory(doc, 'monolift', { hole: 0 }), /fits hole numbers/);
  assert.throws(() => addAccessory(doc, 'dip-bar-adjustable', { hole: 39 }), /fits hole numbers/);
  assert.throws(() => addAccessory(doc, 'storage-pin-short', {}, true, { width: 500 }), /upright fit/);
  const spaced = resizeAssembly(doc, { pitch: 100 });
  assert.throws(() => addAccessory(spaced, 'landmine'), /50 mm/);
  const mounted = addAccessory(doc, 'storage-pin-long', { uprightId: 'rear-right', face: 'right', hole: 20 });
  assert.equal(removeInstance(mounted, 'rear-right').accessories.length, 0);
  assert.deepEqual(getAttachmentAnchor('storage-pin-short').outward, [1, 0, 0]);
});

test('metadata covers all twenty-eight library parts with valid placement or frame slots', () => {
  const ids = ['upright', 'crossmember-425', 'crossmember-725', 'crossmember-1075', 'angled-crossmember', 'offset-crossmember', 'nameplate', 'branded-crossmember', 'branded-crossmember-lite', 'foot-400', 'foot-800', 'pullup-straight', 'pullup-multigrip', 'pullup-sphere', 'safety-box', 'safety-pin-pipe', 'safety-webbing', 'j-hook-standard', 'j-hook-roller', 'j-hook-sandwich', ...attachmentPartIds];
  assert.equal(ids.length, 28);
  for (const id of ids) {
    const info = getPartPlacementInfo(id, createAssembly());
    assert.ok(info?.family && info?.label, id);
    assert.ok(info.slots?.length || info.faces?.length, id);
  }
  assert.equal(getPartPlacementInfo('storage-pin-short')!.family, getPartPlacementInfo('storage-pin-long')!.family);
  assert.notEqual(getPartPlacementInfo('monolift')!.family, getPartPlacementInfo('landmine')!.family);
});

test('every paired safety span validates its own endpoints before import', () => {
  const original = createAssembly();
  for (const endpoint of ['front-right', 'rear-left']) {
    const doc = structuredClone(original);
    doc.accessories.find(a => a.id === 'safeties')!.pairedSpanTo = endpoint;
    assert.throws(() => validateAssembly(JSON.parse(JSON.stringify(doc))), /Spanning endpoints/);
  }
  for (const distance of [300, 3200]) {
    const doc = structuredClone(original);
    doc.connections = [];
    doc.accessories = doc.accessories.filter(a => a.id === 'safeties');
    doc.uprights['rear-right'].y = doc.uprights['front-right'].y + distance;
    assert.throws(() => validateAssembly(doc), /Spanning endpoints/);
  }
  assert.deepEqual(validateAssembly(original), original);
  const pair = resolveAssembly(original).filter(r => r.ownerId === 'safeties');
  assert.equal(pair.length, 2);
  assert.ok(pair.every(r => r.params.length > 0));
});

test('paired spans check actual mounting-face holes on the second side', async () => {
  const { applyPreset } = await import('./presets.ts');
  const doc = applyPreset('rep-pr-4000-four-2032-762');
  doc.accessories = [{
    id: 'paired-safety', part: 'safety-pin-pipe', paired: true,
    target: { uprightId: 'front-left', face: 'front', hole: 8.5 },
    spanTo: 'rear-left', pairTo: 'front-right', pairedSpanTo: 'rear-right',
    params: { pinDiameter: 12 },
  }];
  assert.doesNotThrow(() => validateAssembly(doc));
  // PR-4000 half stations exist on front/back faces only. The second span
  // now crosses the width, where the same station has no left/right holes.
  doc.accessories[0].pairTo = 'rear-left';
  assert.throws(() => validateAssembly(doc), /real holes/);
});
