/** Built-in BOS attachments on real 2x2, 2x3 and 3x3 racks (#162): every J-hook, safety and attachment places on each
 * manufacturer starter, adapts its sleeve and pin to the tube and bore, clears the upright, and cradles still park a bar.
 * 75 mm documents keep the source geometry untouched. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { Euler, Matrix4 } from 'three';
import { RACK_PRESETS, applyPreset } from './presets.ts';
import { gridProfile } from './profiles.ts';
import { addAccessory, createAssembly, getMounts, pairedByDefault, resolveAssembly, validateAssembly } from './assembly.ts';
import { attachmentPartIds, getAttachmentAnchor, getAttachmentCollisionBoxes, hookAnchor } from './attachment-mounts.ts';
import { FIT_KEYS, fitStationOffsets, paramsFit, rackMountFit } from './mount-fit.ts';
import { barCradles, barSupports, freeCradles, suggestCradle } from './barbell-cradles.ts';
import { addFloorItem } from './floor-items.ts';
import { BAR, BARBELL } from './floor-parts/barbell.ts';
import { definitions } from './catalog.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import type { Manifold } from 'manifold-3d';
import type { Face, RackDoc, ResolvedInstance, Vec3 } from './types.ts';

const api = await Module(); api.setup();
const HOOKS = ['j-hook-standard', 'j-hook-roller', 'j-hook-sandwich'];
const SAFETIES = ['safety-box', 'safety-pin-pipe', 'safety-webbing'];
const BUILTINS = [...HOOKS, ...SAFETIES, ...attachmentPartIds];
/** Every featured starter whose uprights are not the source 75 mm tube (manufacturer 2x2, 2x3, 3x3 and Kraken 3x3). */
const STARTERS = RACK_PRESETS.filter(p => p.featured && (gridProfile(p.profileId).tube ?? 75) !== 75);
const HEIGHT: Record<string, number> = { 'spotter-arm': 800, landmine: 300, 'storage-pin-short': 500, 'storage-pin-long': 500, monolift: 1100 };
const hasRear = (doc: RackDoc) => Object.keys(doc.uprights).some(id => id.startsWith('rear-'));
const build = (r: ResolvedInstance) => definitions.find(d => d.id === r.part)!.build(api, r.params);

/** New placement on the front-left post: the preferred face at a working height (every candidate is a validated mount). */
function place(doc: RackDoc, part: string, faces: Face[]) {
  const mounts = getMounts(doc, part).filter(m => m.uprightId === 'front-left' && faces.includes(m.face as Face));
  if (!mounts.length) return null;
  const target = HEIGHT[part] ?? 1250, best = mounts.sort((a, b) => Math.abs(a.center[2] - target) - Math.abs(b.center[2] - target))[0];
  return addAccessory(doc, part, { uprightId: best.uprightId, face: best.face, hole: best.hole }, pairedByDefault(part, doc));
}
const world = (r: ResolvedInstance) => new Matrix4().makeRotationFromEuler(new Euler(...r.rotation)).setPosition(...r.position).elements as unknown as number[];
const NORMAL: Record<Face, Vec3> = { front: [0, -1, 0], back: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0] };
/** Post volume around the part (minus its pin bores), and a 1.5 mm skin just outside it. */
function post(doc: RackDoc, r: ResolvedInstance, id: string, zMin: number, zMax: number) {
  const p = doc.uprights[id], w = doc.rack.tube, d = doc.rack.tubeDepth ?? w, h = zMax - zMin + 40;
  const box = (grow: number) => api.Manifold.cube([w + 2 * grow, d + 2 * grow, h], true).translate([p.x, p.y, (zMin + zMax) / 2]);
  const bores = r.mounts.filter(m => m.uprightId === id).map(m => {
    const axis = m.pinAxis ?? NORMAL[m.face as Face], c = api.Manifold.cylinder(400, doc.rack.holeDiameter / 2 + .2, doc.rack.holeDiameter / 2 + .2, 48, true);
    const along = Math.abs(axis[0]) > .5 ? c.rotate([0, 90, 0]) : c.rotate([90, 0, 0]), placed = along.translate(m.center);
    c.delete(); along.delete(); return placed;
  });
  const solid = box(0), skin = box(1.5), drilled = bores.length ? solid.subtract(api.Manifold.union(bores)) : solid;
  const shell = skin.subtract(solid);
  bores.forEach(b => b.delete()); skin.delete(); if (drilled !== solid) solid.delete();
  return { drilled, shell };
}

test('every built-in attachment places on each non-75 mm starter and validates, round-trips and resolves with a fit', () => {
  assert.ok(STARTERS.length >= 18);
  for (const preset of STARTERS) {
    const doc = applyPreset(preset.id);
    for (const part of BUILTINS) {
      if (SAFETIES.includes(part) && !hasRear(doc)) {
        assert.throws(() => addAccessory(doc, part, { uprightId: 'front-left', face: 'right' }, true), /Safeties need an upright at both ends/, `${preset.id} ${part}`);
        continue;
      }
      const faces: Face[] = SAFETIES.includes(part) ? ['right'] : ['front', 'right', 'left', 'back'];
      const next = place(doc, part, faces);
      assert.ok(next, `${preset.id}: ${part} has a mount`);
      assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(next))), next);
      const added = next.accessories.at(-1)!, instances = resolveAssembly(next).filter(r => r.ownerId === added.id);
      assert.ok(instances.length, `${preset.id} ${part} resolves`);
      for (const r of instances) {
        assert.ok(r.position.every(Number.isFinite));
        if (SAFETIES.includes(part)) assert.ok(r.params.rackHole === doc.rack.holeDiameter && (r.params.rackPin ?? r.params.pinDiameter)! <= doc.rack.holeDiameter, `${part} pin fits`);
        else {
          const fit = paramsFit(r.params)!;
          assert.ok(fit && fit.pin <= doc.rack.holeDiameter, `${preset.id} ${part} fitted pin ${fit?.pin} fits the ${doc.rack.holeDiameter} mm bore`);
          assert.deepEqual([fit.depth, fit.width].sort(), [doc.rack.tube, doc.rack.tubeDepth ?? doc.rack.tube].sort());
        }
      }
    }
  }
});

/** Material inside the drilled post and within 1.5 mm of its faces, for one placement (null when it has no mount). */
function postContact(doc: RackDoc, part: string, faces: Face[], check?: (r: ResolvedInstance, solids: { name: string; solid: Manifold }[]) => void) {
  const next = place(doc, part, faces);
  if (!next) return null;
  const added = next.accessories.at(-1)!, r = resolveAssembly(next).find(e => e.ownerId === added.id)!;
  const started = performance.now(), solids = build(r), elapsed = performance.now() - started, placed: Manifold[] = [];
  assert.ok(elapsed < BUILD_BUDGET_MS, `${part} builds in ${elapsed.toFixed(0)} ms`);
  try {
    check?.(r, solids);
    for (const s of solids) placed.push(s.solid.transform(world(r) as never));
    const boxes = placed.map(m => m.boundingBox()), zMin = Math.min(...boxes.map(b => b.min[2])), zMax = Math.max(...boxes.map(b => b.max[2]));
    const result = (SAFETIES.includes(part) ? r.connectedTo : [r.connectedTo[0]]).map(id => {
      const { drilled, shell } = post(next, r, id, zMin, zMax), volumes = { clash: 0, touch: 0 };
      for (const m of placed) { const clash = m.intersect(drilled), touch = m.intersect(shell); volumes.clash += clash.volume(); volumes.touch += touch.volume(); clash.delete(); touch.delete(); }
      drilled.delete(); shell.delete();
      return volumes;
    });
    return { r, clash: Math.max(...result.map(v => v.clash)), touch: Math.min(...result.map(v => v.touch)) };
  } finally { placed.forEach(m => m.delete()); solids.forEach(s => s.solid.delete()); }
}
const FACE_SETS = (part: string): Face[][] => SAFETIES.includes(part) ? [['right']] : [['front'], ['left', 'right']];

test('fitted sleeves, collars and pins clear the upright no more than the source does on 75 mm, bear on its faces and build valid solids', () => {
  // The source reconstructions already overlap their 75 mm post a little (liners, the dip-horn collar floor); a fit
  // may not add to that.
  const generic = createAssembly({ emptyAccessories: true }), baseline = new Map<string, number>();
  for (const part of BUILTINS) for (const faces of FACE_SETS(part)) baseline.set(part + faces, postContact(generic, part, faces)!.clash);
  const seen = new Set<string>();
  for (const preset of STARTERS) {
    const doc = applyPreset(preset.id);
    for (const part of BUILTINS) for (const faces of FACE_SETS(part)) {
      if (SAFETIES.includes(part) && !hasRear(doc)) continue;
      const probe = place(doc, part, faces);
      if (!probe) continue;
      // One geometry check per distinct fit (tube depth/width, pin class, pitch) of each part.
      const added = probe.accessories.at(-1)!, p = resolveAssembly(probe).find(e => e.ownerId === added.id)!.params;
      const key = part + JSON.stringify(SAFETIES.includes(part) ? [p.upright, p.uprightSpan, p.rackPin ?? p.pinDiameter] : paramsFit(p));
      if (seen.has(key)) continue;
      seen.add(key);
      const contact = postContact(doc, part, faces, (r, solids) => {
        for (const s of solids) {
          assert.equal(s.solid.status(), 'NoError', `${preset.id} ${part} ${s.name}`);
          assert.ok(!s.solid.isEmpty() && s.solid.volume() > 0, `${preset.id} ${part} ${s.name} has volume`);
        }
      })!;
      const allowed = baseline.get(part + faces)! * 1.1 + 60, label = `${preset.id} ${part} (${contact.r.mount?.face}) on the ${doc.rack.tube}×${doc.rack.tubeDepth ?? doc.rack.tube} post`;
      assert.ok(contact.clash < allowed, `${label} intrudes ${contact.clash.toFixed(0)} mm³ (source ${baseline.get(part + faces)!.toFixed(0)})`);
      assert.ok(contact.touch > 500, `${label} bears on the post (${contact.touch.toFixed(0)} mm³ within 1.5 mm)`);
    }
  }
  assert.ok(seen.size >= BUILTINS.length * 4, `checked ${seen.size} distinct part fits`);
});

test('bolt patterns snap to the rack pitch; pins take the 5/8- or 1-inch class', () => {
  const snapped = (z: number[], pitch: number) => fitStationOffsets(z, pitch).map(v => +v.toFixed(3));
  assert.deepEqual(snapped([0, 150], 50.8), [0, 152.4]);
  assert.deepEqual(snapped([0, 100], 76.2), [0, 76.2]);
  assert.deepEqual(fitStationOffsets([0, 250, 50, 200], 50.8).map(v => +v.toFixed(3)), [0, 254, 50.8, 203.2]);
  assert.deepEqual(fitStationOffsets([0, 250, 50, 200], 76.2).map(v => +v.toFixed(3)), [0, 304.8, 76.2, 228.6]);
  const rack = (tube: number, holeDiameter: number, tubeDepth?: number) => ({ tube, holeDiameter, pitch: 50.8, ...(tubeDepth ? { tubeDepth } : {}) });
  assert.equal(rackMountFit(rack(75, 25), 'front'), null);
  assert.deepEqual(rackMountFit(rack(50.8, 17.4625, 76.2), 'front'), { depth: 76.2, width: 50.8, pin: 15.5, pitch: 50.8 });
  assert.deepEqual(rackMountFit(rack(50.8, 17.4625, 76.2), 'left'), { depth: 50.8, width: 76.2, pin: 15.5, pitch: 50.8 });
  assert.equal(rackMountFit(rack(76.2, 26.9875), 'front')!.pin, 24.8);
  // The mating face stays put; the upright centre moves to the new tube.
  for (const part of attachmentPartIds) {
    const fit = rackMountFit(rack(50.8, 25.4), 'front'), source = getAttachmentAnchor(part), fitted = getAttachmentAnchor(part, {}, fit);
    assert.ok(fitted.matingFacePoint.every((v, i) => Math.abs(v - source.matingFacePoint[i]) < 1e-9), part);
    assert.ok(Math.abs(fitted.point.reduce((sum, v, i) => sum + (fitted.matingFacePoint[i] - v) * source.outward[i], 0) - 25.4) < 1e-9, `${part} centre sits half the tube behind the face`);
    assert.ok(fitted.boltStations.every(s => s.diameter === 24.8));
  }
  for (const part of HOOKS) assert.ok(Math.abs(hookAnchor(part, rackMountFit(rack(76.2, 26.9875), 'front'))[1] - (hookAnchor(part, null)[1] - 0.6)) < 1e-9);
});

test('J-hooks and monolifts park a barbell on every non-75 mm starter, seated on the fitted cup', () => {
  const seats = new Set<string>();
  for (const preset of STARTERS) {
    let doc = applyPreset(preset.id);
    doc = addAccessory(doc, 'j-hook-standard', { uprightId: 'front-left', face: 'front', hole: Math.round((1300 - doc.rack.firstHole) / doc.rack.pitch) }, true);
    doc = addAccessory(doc, 'monolift', { uprightId: 'front-left', face: 'front', hole: Math.round((1000 - doc.rack.firstHole) / doc.rack.pitch) }, true);
    const resolved = resolveAssembly(doc), cradles = barCradles(resolved);
    assert.deepEqual(cradles.map(c => c.label.split(' · ')[0]).sort(), ['J-cups', 'Monolift arms'], preset.id);
    const best = suggestCradle(freeCradles(resolved))!;
    assert.match(best.label, /^J-cups/);
    for (const c of cradles) {
      const next = addFloorItem(doc, BARBELL.id), bar = next.floorItems!.at(-1)!;
      bar.cradle = c.key;
      const parked = validateAssembly(next), entry = resolveAssembly(parked).find(e => e.id === bar.id)!;
      assert.ok(Math.abs(entry.position[2] + BAR.axisZ - c.center[2]) < 1e-9, `${preset.id}: bar rests in ${c.label}`);
    }
    // The 28.5 mm shaft sits on the fitted cup floor without cutting into it.
    for (const r of resolved.filter(e => e.part === 'j-hook-standard' || e.part === 'monolift')) {
      const key = r.part + JSON.stringify(r.params);
      if (seats.has(key)) continue;
      seats.add(key);
      const solids = build(r), body = api.Manifold.union(solids.map(s => s.solid)), local = { ...r, position: [0, 0, 0] as Vec3, rotation: [0, 0, 0] as Vec3 };
      for (const s of barSupports([local])) {
        const rod = (radius: number) => { const c = api.Manifold.cylinder(260, radius, radius, 48, true), o = c.rotate([0, 90, 0]), t = o.translate(s.point); c.delete(); o.delete(); return t; };
        const shaft = rod(BAR.shaft / 2), near = rod(BAR.shaft / 2 + 1.5), hit = shaft.intersect(body), touch = near.intersect(body);
        assert.ok(hit.volume() < 3, `${r.part} on ${preset.id}: shaft penetrates ${hit.volume().toFixed(1)} mm³`);
        assert.ok(touch.volume() > 1, `${r.part} on ${preset.id}: shaft rests on the cradle`);
        [shaft, near, hit, touch].forEach(m => m.delete());
      }
      body.delete(); solids.forEach(s => s.solid.delete());
    }
  }
});

test('75 mm racks keep the source attachments: no fit params, source anchors and bolt patterns', () => {
  for (const id of ['generic-four', 'rep-pr-5000-four-2032-1041.4', 'rep-pr-4000-four-2362.2-762']) {
    let doc = id === 'generic-four' ? createAssembly({ emptyAccessories: true }) : applyPreset(id);
    for (const part of BUILTINS) try { doc = addAccessory(doc, part, { face: SAFETIES.includes(part) ? 'right' : 'front' }, pairedByDefault(part, doc)); } catch { /* not every part fits every 75 mm lattice */ }
    assert.ok(doc.accessories.length >= 3, `${id}: ${doc.accessories.length} built-ins placed`);
    for (const r of resolveAssembly(doc).filter(e => e.kind === 'accessory')) {
      for (const key of [...FIT_KEYS, 'uprightSpan', 'rackPin', 'rackHole']) assert.equal(r.params[key], undefined, `${id} ${r.part} ${key}`);
      if (attachmentPartIds.includes(r.part)) assert.deepEqual(r.collisionBoxes, getAttachmentCollisionBoxes(r.part));
    }
  }
  assert.throws(() => validateAssembly({ ...createAssembly(), accessories: [{ id: 'a', part: 'spotter-arm', target: { uprightId: 'front-left', face: 'front', hole: 12 }, paired: false, params: { fitDepth: 50.8 } }] }), /Unsupported spotter-arm parameter: fitDepth/);
});
