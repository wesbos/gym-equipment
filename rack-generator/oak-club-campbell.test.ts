import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { Euler, Matrix4, Vector3 } from 'three';
import { addAccessory, createAssembly, resolveAssembly, unpairAccessory, validateAssembly, moveAccessory } from './assembly.ts';
import { definitions } from './catalog.ts';
import { OAK_CLUB_CAMPBELL as P, CAMPBELL as C, campbellLayout } from './rack-parts/oak-club-campbell.ts';
import { buildCampbell } from './parts/oak-club-campbell.ts';
import { rackBuildParams } from './rack-part.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { applyPreset } from './presets.ts';
import { detectCollisions } from './assembly-collisions.ts';
import { exportPrint3MF } from '../src/exports/print-3mf.ts';
import type { CrossmemberTopTarget, RackDoc, ResolvedInstance, Vec3 } from './types.ts';
const api = await Module(); api.setup();
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < .001, `${a} != ${b}`);
const units = (doc: RackDoc) => resolveAssembly(doc).filter(r => r.part === P.id);
const world = (r: ResolvedInstance) => new Matrix4().makeRotationFromEuler(new Euler(...r.rotation)).setPosition(...r.position).elements;
const direction = (r: ResolvedInstance, v: Vec3) => new Vector3(...v).applyEuler(new Euler(...r.rotation)).toArray();
const railTarget = (station = 4, side: 1 | -1 = -1): CrossmemberTopTarget => ({ kind: 'crossmember-top', connectionId: 'rear-crossmember', uprightId: 'rear-left', face: 'front', hole: 0, station, side });

test('Campbell published grip sizes, plate/liner thicknesses, closed solids and handed bracket', () => {
  for (const hand of [0, 1]) {
    const parts = buildCampbell(api, rackBuildParams(P, { hand, upright: 76.2 }));
    try {
      for (const p of parts) { assert.equal(p.solid.status(), 'NoError', p.name); assert.ok(p.solid.volume() > 0, p.name); }
      const part = (name: string) => parts.find(p => p.name === name)!.solid.boundingBox();
      const grip = part('32 mm welded L grip'), cap = part('Machined steel grip end cap'), l = campbellLayout({ upright: 76.2 });
      near(grip.max[0] - grip.min[0], 32);
      near((grip.max[1] - C.grip) - l.outer, 133.35);
      near(cap.max[2] - C.grip / 2, 133.35);
      const web = part('Quarter-inch UHMW web liner');
      assert.ok(hand ? web.max[0] < -38 : web.min[0] > 38, 'web changes sides; grip stays upright');
      const bracket = part('Quarter-inch welded U bracket with club cutout');
      near(bracket.max[1] - bracket.min[1], 76.2 + 4 * 6.35);
    } finally { parts.forEach(p => p.solid.delete()); }
  }
});

test('Hatfield pair has upward grips, inward shafts, front-facing mirrored webs, and splits without changing geometry', () => {
  const d = addAccessory(createAssembly({ emptyAccessories: true }), P.id, { uprightId: 'front-left', face: 'right', hole: 23 }, true);
  const pair = units(d);
  assert.equal(pair.length, 2);
  for (const [i, r] of pair.entries()) {
    near(direction(r, [0, 0, 1])[2], 1);
    near(direction(r, [0, 1, 0])[0], i ? -1 : 1);
    near(direction(r, [i ? -1 : 1, 0, 0])[1], -1);
  }
  const split = unpairAccessory(d, d.accessories[0].id), separate = units(split);
  assert.deepEqual(separate.map(r => r.position), pair.map(r => r.position));
  assert.deepEqual(split.accessories.map(a => a.params.hand ?? 0), [0, 1]);
  near(campbellLayout(separate[1].params).hand, campbellLayout(pair[1].params).hand);
  assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(split))), split);
  assert.ok(suggestPlacement(createAssembly(), P.id).proposal);
});

test('pull-up pair mounts at two real holes of one crossmember with level grips and top-bearing webs', () => {
  for (const side of [1, -1] as const) for (const hand of [0, 1]) {
    const d = addAccessory(createAssembly({ emptyAccessories: true }), P.id, railTarget(4, side), true, { hand });
    const a = d.accessories[0], pair = units(d);
    assert.equal(a.pairTarget?.connectionId, 'rear-crossmember');
    assert.equal(Math.abs(a.pairTarget!.station - 4), 9);
    for (const r of pair) {
      const l = campbellLayout(r.params);
      near(direction(r, [l.hand, 0, 0])[2], 1);
      near(direction(r, [0, 0, 1])[2], 0);
      const axis = direction(r, [0, 1, 0]);
      axis.forEach((v, i) => near(v, r.mount!.pinAxis![i]));
      assert.deepEqual(r.position, r.mount!.center);
    }
    const split = units(unpairAccessory(d, a.id));
    assert.deepEqual(split.map(r => r.rotation), pair.map(r => r.rotation));
    const moved = moveAccessory(d, a.id, railTarget(5, side));
    assert.equal(moved.accessories[0].pairTarget?.station, 14);
    assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(d))), d);
    assert.throws(() => validateAssembly({ ...d, accessories: [{ ...a, pairTarget: railTarget(5, side) }] }), /separate holes/);
    assert.throws(() => validateAssembly({ ...d, accessories: [{ ...a, pairTarget: { ...a.pairTarget!, side: -side as 1 | -1 } }] }), /same crossmember side/);
  }
});

test('actual Campbell solids clear perforated posts and rails; pins traverse their bores on 75 mm and true 3-inch racks', () => {
  const docs = [createAssembly({ emptyAccessories: true }), applyPreset('rogue-rm-monster-2-four-2295.525-1092.2')];
  for (const original of docs) for (const rail of [false, true]) {
    const stock = { ...original, accessories: [] };
    const d = addAccessory(stock, P.id, rail ? { ...railTarget(3), connectionId: 'left-upper-crossmember', uprightId: 'front-left' } : { uprightId: 'front-left', face: 'right', hole: 20 }, true);
    const all = resolveAssembly(d), handles = units(d);
    const host = all.find(r => r.id === (rail ? 'left-upper-crossmember' : 'front-left'))!;
    const hostParts = definitions.find(p => p.id === host.part)!.build(api, host.params);
    const hostWorld = hostParts.map(p => p.solid.transform(world(host)));
    try {
      for (const r of rail ? handles : handles.slice(0, 1)) {
        const parts = buildCampbell(api, r.params);
        try {
          for (const p of parts) {
            const placed = p.solid.transform(world(r));
            try { for (const hostSolid of hostWorld) {
              const intersection = placed.intersect(hostSolid);
              try { assert.ok(intersection.volume() < .02, `${d.profileId} ${rail ? 'rail' : 'post'} ${r.id} at ${r.position} / ${r.rotation} intersects ${p.name} against ${hostParts[hostWorld.indexOf(hostSolid)].name}: ${intersection.volume()} mm³`); }
              finally { intersection.delete(); }
            } } finally { placed.delete(); }
          }
        } finally { parts.forEach(p => p.solid.delete()); }
      }
      const ids = new Set(handles.map(r => r.id));
      assert.ok(!detectCollisions(all).some(c => c.ids.some(id => ids.has(id))), 'grip collision bodies clear the rack');
    } finally { hostWorld.forEach(p => p.delete()); hostParts.forEach(p => p.solid.delete()); }
  }
});

test('Campbell refuses undersized pin bores and incompatible tube sections', () => {
  const target = { uprightId: 'front-left', face: 'right' as const, hole: 20 };
  assert.throws(() => addAccessory(applyPreset('rogue-rml-3-four-2295.525-762'), P.id, target), /bore/);
  assert.throws(() => P.mount.validate!({ ...createAssembly().rack, tube: 50 }, {}), /fit 3×3/);
  assert.throws(() => addAccessory(createAssembly({ emptyAccessories: true }), P.id, railTarget(0)), /end bolts/);
});

test('both Campbell hands survive material partitioning at both print scales', () => {
  const d = createAssembly({ emptyAccessories: true });
  d.removed = resolveAssembly(d).filter(r => r.id !== 'front-left').map(r => r.id);
  const def = definitions.find(p => p.id === P.id)!;
  for (const hand of [0, 1]) for (const scale of [10, 20] as const) {
    // Use a single slot to exercise the actual export path without rebuilding
    // unrelated rack geometry, just as the catalog-wide 3MF checks do.
    const adapter = { ...def, id: 'upright', build: (_: typeof api, p: Record<string, number>) => buildCampbell(api, { ...def.defaults, hand, printMinFeature: p.printMinFeature }) };
    const result = exportPrint3MF(api, d, [adapter], { layout: 'laid-out', scale });
    assert.equal(result.report.instances, 1);
    assert.ok(result.report.volumes > 0);
  }
});
