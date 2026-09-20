/** Brand J-cups, safeties, spotter arms, pull-up bars and monoliths (#133): published dimensions come out of the builds;
 * spans reach the real neighbouring posts; 2x3 faces get the right mating plane; bars park in the brand cradles on the
 * real Rogue, Titan and REP starters. The registry contract (rack-registry.test.ts) sweeps every option separately. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';
import { catalog, definitions } from './catalog.ts';
import { exportPrint3MF } from '../src/exports/print-3mf.ts';
import { printableMesh } from '../src/exports/print-mesh.ts';
import { floorOptions } from './floor-part.ts';
import { addAccessory, createAssembly, resolveAssembly, validateAssembly } from './assembly.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { barCradles, suggestCradle, parkedPose } from './barbell-cradles.ts';
import { applyPreset } from './presets.ts';
import { rackBuildParams, rackPart, validateRackParams, coerceRackParams } from './rack-registry.ts';
import { rackSpan } from './rack-mounts.ts';
import { PARTS } from './rack-parts/rack-jcups-safeties.ts';
import { GHOST, GHOST_ROLLER_J_CUP, REP_FLAT_SANDWICH_J_CUPS, ROGUE_MONSTER_LITE_J_CUPS, ROGUE_MONSTER_SANDWICH_J_CUP, TITAN_ROLLER_J_HOOKS, IRWIN_RETURN_ROLLER_J_CUPS, BOS_ROLLER_J_CUPS } from './rack-parts/rack-jcups-safeties-cups.ts';
import { ROGUE_SAML_24_SPOTTER_ARMS, ROGUE_MONSTER_SPOTTER_ARMS_2, REP_SPOTTER_ARMS, SURPLUS_STEALTH_SPOTTERS, OAK_CLUB_ALPHA_SPOTTER_ARMS } from './rack-parts/rack-jcups-safeties-spotters.ts';
import { REP_STRAP_SAFETIES, ROGUE_MONSTER_STRAP_SAFETY_2, REP_FLIP_DOWN_SAFETIES, REP_PULL_UP_BAR, REP_MULTI_GRIP_PULL_UP_BAR, ROGUE_FAT_SKINNY_PULL_UP_BAR, BOS_SAFETY_STRAPS } from './rack-parts/rack-jcups-safeties-spans.ts';
import { ROGUE_AM_2_MONOLIFT, MUTANT_METALS_SNAP_BACK_MONOLIFT } from './rack-parts/rack-jcups-safeties-monolifts.ts';
import type { NumericParams, PartId, RackDoc, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
type Box = { min: number[]; max: number[] };
type Part = (typeof PARTS)[number];
function measure(part: Part, params: NumericParams = {}, context: NumericParams = {}) {
  const def = definitions.find(d => d.id === part.id)!, parts: SolidPart[] = def.build(api, { ...rackBuildParams(part, params), ...context });
  try {
    const boxes = new Map<string, Box>(), all: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const p of parts) {
      assert.equal(p.solid.status(), 'NoError', p.name); assert.ok(p.solid.volume() > 0, p.name);
      const b = p.solid.boundingBox(); boxes.set(p.name, { min: [...b.min], max: [...b.max] });
      for (let i = 0; i < 3; i++) { all.min[i] = Math.min(all.min[i], b.min[i]); all.max[i] = Math.max(all.max[i], b.max[i]); }
    }
    const get = (name: string) => { const b = boxes.get(name); assert.ok(b, `${part.id}: solid "${name}" (have ${[...boxes.keys()].join(', ')})`); return b!; };
    return { all, get, names: [...boxes.keys()], colors: new Map(parts.map(p => [p.name, p.color])) };
  } finally { parts.forEach(p => p.solid.delete()); }
}
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tol: number, label: string) => assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tol}`);
const F = 75 / 2;

test('Ghost Roller J-Cup 2.0: 2.75 in wide, 10.625 in total, 7.875 in roller to top, 2.875 in rackable depth', () => {
  for (const pin of [0, 1]) {
    const m = measure(GHOST_ROLLER_J_CUP, { pin }), roller = m.get('Composite roller'), liner = m.get('UHMW face liner'), lip = m.get('UHMW lip liner');
    const channel = m.get('Formed 3/8 in steel channel and clasp');
    near(size(channel, 2), inch(10.625), 1, 'total height');
    near(channel.max[2] - roller.max[2], inch(7.875), 2, 'roller top to top');
    near(lip.min[1] - liner.max[1], inch(2.875), .5, 'rackable depth');
    near(size(liner, 0) + 6, inch(2.75), 1, 'cup width');
    assert.ok(m.get(pin ? '1 in welded pin' : '5/8 in welded pin').min[1] < -F + 20, 'pin runs into the upright');
  }
  assert.ok(measure(GHOST_ROLLER_J_CUP, { roller: 1 }).names.includes('Silicon carbide coated steel roller'));
  near(GHOST.rackable, 73.025, .01, 'published 2.875 in');
});
test('REP Flat Sandwich J-Cups: 6 in extension, 1.2 in wide landing, steel core in textured liners, U-wrap', () => {
  for (const version of [0, 1]) for (const series of [0, 1]) {
    const m = measure(REP_FLAT_SANDWICH_J_CUPS, { version, series }), liners = m.get('Textured plastic liners'), wrap = m.get('Formed U-wrap');
    near(liners.max[1] - F, inch(6), 1, 'extension from the rack');
    near(size(liners, 0), inch(1.2), .6, 'landing width');
    assert.ok(wrap.min[1] < -F + 20 && size(wrap, 0) > 75, 'wrap hugs both side faces');
    assert.ok(m.names.includes(series ? '1 in mounting pin' : '5/8 in mounting pin'));
  }
  assert.ok(measure(REP_FLAT_SANDWICH_J_CUPS, { version: 1 }).names.includes('Brushed stainless logo plates'), '1.0 has the stainless side plates');
});
test('Rogue Monster Lite and Monster J-cups: published widths, heights and rackable depths', () => {
  const ml = measure(ROGUE_MONSTER_LITE_J_CUPS, { style: 0 }), mlCup = ml.get('Laser-cut, bent 3/8 in plate and clasp');
  near(size(ml.get('UHMW face insert'), 0) + 12, inch(3), 1, 'ML standard 3 in wide'); near(size(mlCup, 2), inch(6), 1, 'ML standard 6 in tall');
  near(mlCup.max[1] - F, inch(4), 2, 'ML standard 4 in long');
  const mls = measure(ROGUE_MONSTER_LITE_J_CUPS, { style: 1 }), plates = mls.get('3/8 in laser-cut side plates, back plate and clasp'), core = mls.get('UHMW sandwich core');
  near(size(core, 0) + 2 * inch(3 / 8), inch(1.5), .5, '1 in sandwich 1.5 in wide'); near(size(plates, 2), inch(10), 1, 'sandwich 10 in tall');
  const monster = measure(ROGUE_MONSTER_SANDWICH_J_CUP, { style: 1 });
  near(size(monster.get('Laser-cut, bent 3/8 in plate and clasp'), 2), inch(7.75), 1, 'Monster standard 7.75 in tall');
  assert.ok(measure(ROGUE_MONSTER_SANDWICH_J_CUP).names.includes('1 in mounting pin'));
});
test('roller J-cups: Titan 9.5 in tall with a 1.5 × 3 in roller and a pop-pin behind the upright; BoS and Irwin rollers', () => {
  const t = measure(TITAN_ROLLER_J_HOOKS), r = t.get('Center return roller');
  near(size(t.get('Steel back plate, channel and clasp'), 2), inch(9.5), 1, 'Titan height');
  near(size(r, 0), inch(1.5), .5, 'roller pad diameter'); near(size(r, 1), inch(3), 6, 'roller pad length');
  assert.ok(t.get('Locking pop-pin knob').max[1] < -F, 'pop-pin knob behind the upright');
  near(t.all.max[1] - t.all.min[1], inch(10), 25, 'overall depth');
  for (const roller of [0, 1, 2, 3]) assert.ok(measure(IRWIN_RETURN_ROLLER_J_CUPS, { roller }).names.includes(roller % 2 ? 'Flat roller' : 'Center return roller'));
  assert.ok(measure(BOS_ROLLER_J_CUPS, { version: 1 }).names.includes('Knurled mag pin knob'), 'Manticore has the mag pin');
});
test('spotter arms: published lengths, sections and heights', () => {
  const saml = measure(ROGUE_SAML_24_SPOTTER_ARMS), arm = saml.get('3 × 3 in 11-gauge arm, end plate, clasp and gusset');
  near(arm.max[1] - F, inch(24.625), 1, 'SAML-24 length'); near(size(saml.get('UHMW top insert'), 0) + 12, inch(3), 1, 'SAML 3 in tube');
  const mon = measure(ROGUE_MONSTER_SPOTTER_ARMS_2), uhmw = mon.get('UHMW top liner');
  near(mon.get('3/8 in clasp, 3 × 3 in arm and gussets').max[1] - F, inch(24), 1, 'Monster 24 in from upright'); near(size(uhmw, 1), inch(19), 15, 'Monster 19 in flat');
  const rep = measure(REP_SPOTTER_ARMS), repArm = rep.get('Matte black arm, end plate, clasps, strut and gusset');
  near(size(repArm, 2), inch(11.3), 3, 'REP 11.3 in tall'); near(rep.all.max[1] - rep.all.min[1], inch(27.6), 12, 'REP 27.6 in long');
  const st = measure(SURPLUS_STEALTH_SPOTTERS), stSteel = st.get('Hand-welded side plates, channel and lip');
  near(size(stSteel, 2), inch(7), 1, 'Stealth 7 in tall'); near(size(stSteel, 1), inch(27 + 3 / 16), 3, 'Stealth 27 3/16 in overall');
  near(size(st.get('UHMW catch'), 1), inch(20), 30, 'Stealth 20 in+ flat catch');
  const alpha = measure(OAK_CLUB_ALPHA_SPOTTER_ARMS), both = alpha.get('3/8 in UHMW catch, both faces');
  assert.ok(both.min[2] < 0 && both.max[2] > 0, 'Alpha UHMW on both faces'); near(size(alpha.get('3/8 in UHMW catch, both faces'), 2), inch(3) + 2 * inch(3 / 8), 1, 'Alpha section');
});
test('monolifts: AM-2 16.75 in from the face, 14 / 17 in tall; Snap-Back roller catch with 2.25 in roller', () => {
  for (const [line, h] of [[0, 14], [1, 17]]) {
    const m = measure(ROGUE_AM_2_MONOLIFT, { line });
    near(m.get('Red counterweight handle').max[1] - F, inch(16.75), 1, 'AM-2 depth');
    near(m.get('Red counterweight handle').max[2] - m.get('Red 1.25 in jaw').min[2], inch(h), inch(1), 'AM-2 height');
    near(size(m.get('Red 1.25 in jaw'), 0), inch(1.25), .3, 'jaw width');
  }
  const s = measure(MUTANT_METALS_SNAP_BACK_MONOLIFT), roller = s.get('Nylon roller');
  near(size(roller, 1), inch(2.25), 1, 'roller usable space');
});
test('strap safeties and flip-downs span to the rear post: the far bracket sits on it and the strap is 3 in wide', () => {
  const doc = createAssembly({ emptyAccessories: true });
  for (const part of [REP_STRAP_SAFETIES, ROGUE_MONSTER_STRAP_SAFETY_2, BOS_SAFETY_STRAPS, REP_FLIP_DOWN_SAFETIES]) {
    const placed = addAccessory(doc, part.id as PartId, { uprightId: 'front-left', face: 'right', hole: 12 }, true);
    const units = resolveAssembly(placed).filter(e => (e.part as string) === part.id);
    assert.equal(units.length, 2, `${part.id}: left and right units`);
    for (const u of units) {
      const post = placed.uprights[u.mount!.uprightId], rear = Object.values(placed.uprights).find(q => q.x === post.x && q.y !== post.y)!;
      assert.equal(Math.abs(u.params.uprightSpan), Math.abs(rear.y - post.y), `${part.id}: span is the post spacing`);
      const m = measure(part, u.params, { uprightSpan: u.params.uprightSpan, upright: 75 });
      near(size(m.all, 0), Math.abs(u.params.uprightSpan) + 75, 45, `${part.id}: reaches the rear post`);
    }
  }
  const strap = measure(REP_STRAP_SAFETIES), web = strap.get('Reinforced nylon strap');
  near(size(web, 1), inch(3), .5, '3 in strap');
  assert.ok(measure(ROGUE_MONSTER_STRAP_SAFETY_2).names.includes('Grey wear sleeve'));
  // Without a rear post (viewer) the nominal 30 in depth is drawn; with one removed, the span is simply absent.
  const lonely = { ...doc, removed: ['rear-left'] } as RackDoc;
  assert.equal(rackSpan(lonely, rackPart(REP_STRAP_SAFETIES.id)!, { uprightId: 'front-left', face: 'right', hole: 5 }), undefined);
});
test('pull-up bars span between the inner faces of the front posts at the real rack width', () => {
  const doc = createAssembly({ emptyAccessories: true });
  for (const part of [REP_PULL_UP_BAR, REP_MULTI_GRIP_PULL_UP_BAR, ROGUE_FAT_SKINNY_PULL_UP_BAR]) {
    const r = suggestPlacement(doc, part.id as PartId), a = r.proposal!.doc.accessories.at(-1)!;
    const [unit] = resolveAssembly(r.proposal!.doc).filter(e => e.ownerId === a.id);
    assert.equal(a.paired, false); assert.ok(['left', 'right'].includes(unit.mount!.face));
    near(unit.params.uprightSpan, doc.rack.width + doc.rack.tube, .01, `${part.id}: centre-to-centre span`);
    const m = measure(part, a.params, { uprightSpan: unit.params.uprightSpan });
    assert.ok(m.all.max[1] >= unit.params.uprightSpan - F - 1, `${part.id}: reaches the far inner face`);
  }
  const rep = measure(REP_PULL_UP_BAR, {}, { uprightSpan: inch(40.8) + 75 + 2 * 6.35 });
  near(size(rep.get('1.25 in pull-up bar'), 2), inch(1.25), .3, 'REP bar diameter');
  near(size(rep.get('1.25 in pull-up bar'), 1), inch(40.8), 2, 'REP 40.8 in usable length');
  const multi = measure(REP_MULTI_GRIP_PULL_UP_BAR), frame = multi.get('14-gauge frame, 1.25 in bar and grips'), fat = multi.get('2 in fat rear bar');
  near(size(frame, 0) + (fat.max[0] - frame.max[0] > 0 ? fat.max[0] - frame.max[0] : 0), inch(14.6), 25, 'multi-grip 14.6 in wide');
  near(size(fat, 2), inch(2), .3, '2 in rear bar');
  near(Math.max(frame.max[2], fat.max[2]) - frame.min[2], inch(7.3), 15, 'multi-grip 7.3 in tall');
  const fs = measure(ROGUE_FAT_SKINNY_PULL_UP_BAR, {}, { uprightSpan: inch(43) + inch(3), upright: inch(3) });
  near(size(fs.get('1.25 in OD skinny bar'), 2), inch(1.25), .3, 'skinny'); near(size(fs.get('2 in OD fat bar'), 2), inch(2), .3, 'fat');
  near(size(fs.get('3/8 in bolt-on flanges'), 2), inch(14), 1, '14 in flanges'); near(size(fs.get('2 in OD fat bar'), 1) + 2 * inch(3 / 8), inch(43), 2, '43 in over the flanges');
});
test('2x3 posts: the mating face follows the tube depth and the T-3 J-hook clasps the 2 in face', () => {
  const t3 = applyPreset('titan-t3-four-2311.4-609.6');
  const r = suggestPlacement(t3, TITAN_ROLLER_J_HOOKS.id as PartId), a = r.proposal!.doc.accessories.at(-1)!;
  assert.equal(a.params.series, 1, 'autoFit picks the T-3 hook');
  const [unit] = resolveAssembly(r.proposal!.doc).filter(e => e.ownerId === a.id);
  near(unit.params.upright, inch(3), 1e-6, 'front face sits 1.5 in from the post centre'); near(unit.params.uprightWidth, inch(2), 1e-6, 'face width');
  assert.throws(() => addAccessory(t3, TITAN_ROLLER_J_HOOKS.id as PartId, { uprightId: 'front-left', face: 'front', hole: 20 }, false, { series: 0 }), /clasp fits a 3 in upright face/);
  assert.throws(() => addAccessory(t3, GHOST_ROLLER_J_CUP.id as PartId, { uprightId: 'front-left', face: 'front', hole: 20 }, false, { pin: 0 }), /clasp fits a 3 in upright face/);
});
test('brand J-cups, spotters and monolifts park the Olympic bar on the real Rogue, Titan and REP starters', () => {
  const cases: [string, Part][] = [
    ['rogue-rm-monster-2-four-2295.525-1092.2', ROGUE_MONSTER_SANDWICH_J_CUP], ['rogue-rm-monster-2-four-2295.525-1092.2', GHOST_ROLLER_J_CUP],
    ['rogue-rm-monster-2-four-2295.525-1092.2', ROGUE_AM_2_MONOLIFT], ['rogue-rm-monster-2-four-2295.525-1092.2', ROGUE_MONSTER_SPOTTER_ARMS_2],
    ['rogue-rml-3-four-2295.525-762', ROGUE_MONSTER_LITE_J_CUPS], ['rogue-rml-3-four-2295.525-762', ROGUE_SAML_24_SPOTTER_ARMS],
    ['titan-x3-four-2286-609.6', TITAN_ROLLER_J_HOOKS], ['titan-t3-four-2311.4-609.6', TITAN_ROLLER_J_HOOKS],
    ['rep-pr-5000-four-2032-762', REP_FLAT_SANDWICH_J_CUPS], ['rep-pr-4000-four-2032-762', REP_FLAT_SANDWICH_J_CUPS], ['rep-pr-5000-four-2032-762', REP_SPOTTER_ARMS],
    ['rep-pr-5000-four-2032-762', MUTANT_METALS_SNAP_BACK_MONOLIFT],
  ];
  for (const [preset, part] of cases) {
    const doc = applyPreset(preset), r = suggestPlacement(doc, part.id as PartId);
    assert.ok(r.proposal, `${preset}/${part.id}: ${r.reason}`);
    const placed = r.proposal!.doc, a = placed.accessories.at(-1)!;
    assert.equal(a.paired, true, `${preset}/${part.id}: pair`);
    const cradles = barCradles(resolveAssembly(placed)).filter(c => c.supports.every(s => s.ownerId === a.id));
    assert.equal(cradles.length, 1, `${preset}/${part.id}: one cradle from the pair`);
    const c = suggestCradle(cradles)!, pose = parkedPose(c);
    assert.equal(c.kind, 'working'); assert.ok(pose.position[2] > 300, 'bar sits up on the rack');
    assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(placed))), placed);
  }
});
test('bores and params: 1 in parts refuse 5/8 in racks, autoFit picks the 5/8 in variants, strict params', () => {
  const pr4000 = applyPreset('rep-pr-4000-four-2032-762');
  assert.throws(() => addAccessory(pr4000, ROGUE_MONSTER_SANDWICH_J_CUP.id as PartId, { uprightId: 'front-left', face: 'front', hole: 20 }, true), /exceeds the rack bore/);
  for (const part of [GHOST_ROLLER_J_CUP, REP_FLAT_SANDWICH_J_CUPS, REP_SPOTTER_ARMS, ROGUE_AM_2_MONOLIFT]) {
    const r = suggestPlacement(pr4000, part.id as PartId); assert.ok(r.proposal, `${part.id}: ${r.reason}`);
  }
  assert.throws(() => validateRackParams(GHOST_ROLLER_J_CUP, { color: 99 }), /j-cup/);
  assert.deepEqual(coerceRackParams(REP_FLAT_SANDWICH_J_CUPS, { series: 0, version: 1 }), { series: 0, version: 1 });
  assert.equal(PARTS.length, 22);
});
test('every option exports closed, printable meshes (no zero-area or open triangles), spans included', () => {
  for (const part of PARTS) {
    let combos: NumericParams[] = [{ ...part.defaults }];
    for (const param of part.params) combos = combos.flatMap(p => floorOptions(param, p).map(v => ({ ...p, [param.key]: v })));
    const def = definitions.find(d => d.id === part.id)!;
    const spans = part.mount.span === 'across' ? [undefined, -800, 1104] : part.mount.span === 'normal' ? [undefined, 1150] : [undefined];
    for (const params of combos) for (const tube of [75, 76.2]) for (const uprightSpan of spans) {
      const solids = def.build(api, { ...rackBuildParams(part, params), upright: tube, ...(uprightSpan ? { uprightSpan } : {}) });
      try { for (const solid of solids) printableMesh(solid.solid, `${part.id} ${JSON.stringify(params)} ${tube} ${uprightSpan} ${solid.name}`); } finally { solids.forEach(x => x.solid.delete()); }
    }
  }
});
test('3MF export prints every brand J-cup, safety, spotter, bar and monolift with its vendor credit', () => {
  const ours = new Set<string>(PARTS.map(p => p.id));
  const builders = catalog.definitions.map(def => ours.has(def.id) ? def : { ...def, build: () => [{ name: 'Frame fixture', solid: api.Manifold.cube([1, 1, 1]), role: 'frame' as const }] });
  const credited = new Set<string>();
  for (let i = 0; i < PARTS.length; i += 4) {
    let doc = createAssembly({ emptyAccessories: true });
    for (const part of PARTS.slice(i, i + 4)) { const r = suggestPlacement(doc, part.id as PartId); assert.ok(r.proposal, `${part.id}: ${r.reason}`); doc = r.proposal!.doc; }
    const result = exportPrint3MF(api, doc, builders, { layout: 'assembled' }, undefined, catalog.attribution);
    for (const c of JSON.parse(strFromU8(unzipSync(result.bytes)['Metadata/print-report.json'])).vendorCredits as { part: string }[]) credited.add(c.part);
  }
  assert.deepEqual([...credited].filter(id => ours.has(id)).sort(), [...ours].sort());
});
