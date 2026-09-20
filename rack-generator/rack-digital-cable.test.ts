/** #136 VOLTRA accessories and rack-mounted cable systems: published dimensions come out of the builds, and the fit
 * rules (bores, 3 x 3 posts, strap post size, VTS post variants) hold on the real rack profiles. The registry contract
 * (every option, extents, bodies, placement, pairs, JSON round trip) is swept by rack-registry.test.ts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';
import { catalog, definitions } from './catalog.ts';
import { addAccessory, createAssembly, resolveAssembly, validateAssembly } from './assembly.ts';
import { applyPreset, RACK_PRESETS } from './presets.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { coerceRackParams, rackBuildParams, validateRackParams } from './rack-part.ts';
import { rackPart } from './rack-registry.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
import {
  PARTS, DARKO_QUICKMOUNT, BEYOND_POWER_STRAP_MOUNT, BEYOND_POWER_ADAPTIVE_BAR_MOUNT, BEYOND_POWER_FIXED_BAR_MOUNT, BEYOND_POWER_ROTATOR,
  BULLETPROOF_VTS, BULLETPROOF_ISOLATOR, QUICKMOUNT, RACK_PEG, FIXED_BAR, VTS, VTS_HORN_SOCKET, quickMountLayout,
} from './rack-parts/rack-digital-cable.ts';
import { exportPrint3MF } from '../src/exports/print-3mf.ts';
import type { NumericParams, RackDoc, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
type Box = { min: number[]; max: number[] };
type Part = (typeof PARTS)[number];
function measure(part: Part, params: NumericParams = {}, tube = 75) {
  const def = definitions.find(d => d.id === part.id)!, started = performance.now();
  const parts: SolidPart[] = def.build(api, rackBuildParams(part, { upright: tube, ...params }));
  const ms = performance.now() - started;
  try {
    const boxes = new Map<string, Box>(), all: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    const union = (name: string, b: Box) => { const o = boxes.get(name); boxes.set(name, o ? { min: o.min.map((v, i) => Math.min(v, b.min[i])), max: o.max.map((v, i) => Math.max(v, b.max[i])) } : b); };
    for (const p of parts) {
      assert.equal(p.solid.status(), 'NoError', p.name); assert.ok(p.solid.volume() > 0, p.name);
      const b = p.solid.boundingBox(), box = { min: [...b.min], max: [...b.max] }; union(p.name, box);
      for (let i = 0; i < 3; i++) { all.min[i] = Math.min(all.min[i], b.min[i]); all.max[i] = Math.max(all.max[i], b.max[i]); }
    }
    return { all, boxes, ms, colors: new Map(parts.map(p => [p.name, p.color])), names: parts.map(p => p.name) };
  } finally { parts.forEach(p => p.solid.delete()); }
}
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tolerance: number, label: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tolerance}`);
const preset = (pattern: RegExp) => applyPreset(RACK_PRESETS.find(p => pattern.test(p.id))!.id);
const pr4000 = () => validateAssembly({ ...createAssembly({ emptyAccessories: true }), profileId: 'rep-pr-4000', rack: { ...createAssembly().rack, pitch: 50.8, holeDiameter: 15.875 } } as RackDoc);
/** The built-in VOLTRA I housing (parts/voltra.ts): 323 × 139 × 100 mm published envelope. */
function assertVoltra(m: ReturnType<typeof measure>, axis: 'y' | 'z' = 'y') {
  const housing = m.boxes.get('VOLTRA rounded housing')!, handle = m.boxes.get('Integral carry handle')!;
  const long = Math.max(housing.max[0], handle.max[0]) - Math.min(housing.min[0], handle.min[0]);
  near(long, 323, 1.5, 'VOLTRA length with carry handle');
  near(axis === 'y' ? size(housing, 2) : size(housing, 1), 139, 1, 'VOLTRA height');
}

test('every entry is registered in Digital & cable with the right mount kind, and builds within budget', () => {
  for (const part of PARTS) {
    assert.equal(rackPart(part.id), part); assert.equal(part.section, 'Digital & cable');
    const m = measure(part);
    assert.ok(m.ms < BUILD_BUDGET_MS, `${part.id}: ${m.ms.toFixed(0)} ms`);
    assert.deepEqual(validateRackParams(part, {}), part.defaults);
    assert.throws(() => validateRackParams(part, { bogus: 1 }), new RegExp(part.noun));
  }
});

test('QuickMount: 1/4 in steel U over a 3 in post, 0.98 in Magpin side to side, keyhole for 5/8 in, VOLTRA on the web', () => {
  for (const tube of [75, inch(3)]) {
    const m = measure(DARKO_QUICKMOUNT, {}, tube), bracket = m.boxes.get('QuickMount 1/4 in steel bracket')!, l = quickMountLayout({ upright: tube, ...DARKO_QUICKMOUNT.defaults });
    near(size(bracket, 0), tube + 2 * (QUICKMOUNT.liner + inch(0.25)), .05, 'bracket width = post + liners + 2 × 1/4 in');
    near(bracket.max[1] - (tube / 2 + QUICKMOUNT.liner), inch(0.25), .05, 'web is 1/4 in steel on the liner');
    near(size(bracket, 2), inch(5), .05, 'bracket height');
    const pin = m.boxes.get('0.98 in Magpin')!;
    near(size(pin, 1), inch(0.98), .3, 'Magpin diameter'); near((pin.min[2] + pin.max[2]) / 2, 0, .01, 'Magpin on the hole axis');
    assert.ok(pin.min[0] < -tube / 2 - 6 && pin.max[0] > tube / 2 + 6, 'Magpin spans both flanges (side to side)');
    assert.ok(m.boxes.get('Magpin knurled knob')!.min[0] > tube / 2, 'knob outside the +X flange');
    assert.ok(m.boxes.get('VOLTRA rounded housing')!.min[1] > l.dockY, 'VOLTRA stands off the dock cup');
    assertVoltra(m);
  }
  // The 5/8 in pin sits in the small lobe: the bracket rides 14 mm higher than on a 1 in Magpin.
  const one = measure(DARKO_QUICKMOUNT, { pin: 0 }).boxes.get('QuickMount 1/4 in steel bracket')!, five = measure(DARKO_QUICKMOUNT, { pin: 1 }).boxes.get('QuickMount 1/4 in steel bracket')!;
  near(five.min[2] - one.min[2], 2 * QUICKMOUNT.keyholeOffset, .05, 'keyhole lobe offset');
  assert.ok(measure(DARKO_QUICKMOUNT, { handle: 1 }).all.max[2] > quickMountLayout({ upright: 75, handle: 1 }).top + 120, 'handle loop above the bracket');
  assert.equal(measure(DARKO_QUICKMOUNT, { version: 2 }).colors.get('QuickMount stainless steel bracket'), '#b7bbbe');
  assert.ok(measure(DARKO_QUICKMOUNT, { version: 3 }).all.max[2] > quickMountLayout({ upright: 75, version: 3 }).top + 50, 'PM pulley tab');
  // Vertical VOLTRA: its long axis turns to Z.
  near(size(measure(DARKO_QUICKMOUNT, { orientation: 2 }).all, 2), 323, 2, 'vertical VOLTRA height');
  // 1 in hole only brackets have no 5/8 in option; strict params refuse and the UI snaps it back.
  assert.throws(() => validateRackParams(DARKO_QUICKMOUNT, { version: 1, pin: 1 }), /quickmount bracket/);
  assert.deepEqual(coerceRackParams(DARKO_QUICKMOUNT, { version: 1, pin: 1 }), { ...DARKO_QUICKMOUNT.defaults, version: 1, pin: 0 });
});

test('QuickMount fits 3 x 3 posts: 1 in Magpin on Rogue Monster, 5/8 in pin on Monster Lite and PR-4000, refused on 2 x 3', () => {
  const rm4 = suggestPlacement(preset(/^rogue-rm-monster-2-four/), DARKO_QUICKMOUNT.id).proposal!;
  const a = rm4.doc.accessories.at(-1)!;
  assert.equal({ ...DARKO_QUICKMOUNT.defaults, ...a.params }.pin, 0);
  const [unit] = resolveAssembly(rm4.doc).filter(e => e.ownerId === a.id);
  assert.notDeepEqual(unit.mount!.pinAxis!.map(Math.round), [0, -1, 0], 'the Magpin runs across the face, not through it');
  const lite = suggestPlacement(preset(/^rogue-rml-3-four/), DARKO_QUICKMOUNT.id).proposal!;
  assert.equal(lite.doc.accessories.at(-1)!.params.pin, 1, 'Monster Lite gets the 5/8 in pin in the keyhole');
  assert.throws(() => addAccessory(pr4000(), DARKO_QUICKMOUNT.id, { uprightId: 'front-left', face: 'front', hole: 20 }, false, { version: 1 }), /exceeds the rack bore/);
  const r3 = suggestPlacement(preset(/^rogue-r3-/), DARKO_QUICKMOUNT.id);
  assert.equal(r3.proposal, null); assert.match(r3.reason, /3 x 3/);
});

test('Strap Mount: 50 mm strap around the post, closes in a buckle, 1 m strap rolls its excess, posts from 70 x 70 mm', () => {
  const m = measure(BEYOND_POWER_STRAP_MOUNT), strap = m.boxes.get('Polyester strap')!;
  near(size(strap, 2), 50, .05, 'strap width');
  assert.ok(strap.min[1] < -75 / 2 && strap.min[0] < -75 / 2 && strap.max[0] > 75 / 2, 'strap wraps the sides and back of the post');
  assert.ok(m.boxes.get('Cam buckle')!.max[1] < -75 / 2, 'buckle behind the post');
  assertVoltra(m);
  const short = measure(BEYOND_POWER_STRAP_MOUNT, { strap: 0 }).boxes.get('Excess strap roll')!, long = measure(BEYOND_POWER_STRAP_MOUNT, { strap: 1 }).boxes.get('Excess strap roll')!;
  assert.ok(size(long, 0) > size(short, 0) + 10, '1 m strap leaves a bigger roll');
  const t2 = suggestPlacement(preset(/^titan-t2-/), BEYOND_POWER_STRAP_MOUNT.id);
  assert.equal(t2.proposal, null); assert.match(t2.reason, /70 x 70/);
  assert.ok(suggestPlacement(pr4000(), BEYOND_POWER_STRAP_MOUNT.id).proposal, 'no rack pin, so 5/8 in racks are fine');
});

test('Adaptive Bar Mount: 16–51 mm jaws on a 1 in peg, 105 mm dock flange, 168 mm knob to dock, VOLTRA hanging or beside', () => {
  const m = measure(BEYOND_POWER_ADAPTIVE_BAR_MOUNT), peg = m.boxes.get('1 in rack peg (sold separately)')!;
  near(size(peg, 0), inch(1.5), .2, 'peg cap'); near(peg.max[1] - 75 / 2, RACK_PEG.proud, .01, 'peg proud of the face (7-3/8 in)');
  const body = m.boxes.get('Adaptive clamp aluminium body')!, flange = m.boxes.get('Quick-release dock flange')!, knob = m.boxes.get('Tightening knob')!;
  near(size(flange, 0), 105, .5, 'flange width (published 103 mm body W with side bolts ~105)');
  near(knob.max[2] - m.boxes.get('Magnetic dock locking rim')!.min[2], 168, 3, 'knob top to the dock face (dimension drawing)');
  assert.ok(body.min[1] > 75 / 2 && body.max[1] < 75 / 2 + RACK_PEG.proud, 'clamp on the peg');
  assert.ok(m.boxes.get('VOLTRA rounded housing')!.max[2] < flange.min[2], 'VOLTRA hangs below the dock');
  assertVoltra(m, 'z');
  const side = measure(BEYOND_POWER_ADAPTIVE_BAR_MOUNT, { dock: 1 });
  assert.ok(side.boxes.get('VOLTRA rounded housing')!.min[0] > side.boxes.get('Quick-release dock flange')!.max[0], 'sideways dock puts the VOLTRA beside the peg');
  assert.throws(() => validateRackParams(BEYOND_POWER_ADAPTIVE_BAR_MOUNT, { dock: 0, orientation: 2 }), /bar mount/, 'hanging along the peg would hit the upright');
  const refused = suggestPlacement(pr4000(), BEYOND_POWER_ADAPTIVE_BAR_MOUNT.id);
  assert.equal(refused.proposal, null); assert.match(refused.reason, /exceeds the rack bore/);
});

test('Fixed Bar Mount: 2 in bore with 1 in spacer shells on the peg, four cap screws, dock underneath', () => {
  const m = measure(BEYOND_POWER_FIXED_BAR_MOUNT), spacer = m.boxes.get('1 in spacer shells')!;
  near(size(spacer, 0), FIXED_BAR.bore - .6, .1, 'spacer outer = 2 in bore');
  assert.equal(m.names.filter(n => n === 'Cap screw').length, 4);
  near(size(m.boxes.get('Fixed mount lower block')!, 0), 110, .1, 'block width');
  assert.ok(m.boxes.get('VOLTRA rounded housing')!.max[2] < m.boxes.get('Fixed mount lower block')!.min[2]);
  assertVoltra(m, 'z');
});

test('Rotator: head pitches ±60° (120° of travel) on the Sliding Rack Mount; pins by bore; 3 x 3 only', () => {
  const level = measure(BEYOND_POWER_ROTATOR, { angle: 0 }), up = measure(BEYOND_POWER_ROTATOR, { angle: 60 }), down = measure(BEYOND_POWER_ROTATOR, { angle: -60 });
  const z = (m: ReturnType<typeof measure>) => { const b = m.boxes.get('Titanium connector eye')!; return (b.min[2] + b.max[2]) / 2; };
  near(z(level), 0, .5, 'level head keeps the cable on the pin axis');
  assert.ok(z(up) > 150 && z(down) < -150, 'the cable end swings up and down with the head');
  near(z(up), -z(down), .5, 'symmetric travel');
  assert.ok(level.boxes.get('Sliding split collar'), 'reuses the built-in Sliding Rack Mount');
  assertVoltra(level);
  assert.equal(suggestPlacement(pr4000(), BEYOND_POWER_ROTATOR.id).proposal!.doc.accessories.at(-1)!.params.pin, 0, '5/8 in sliding pin on 5/8 in racks');
});

test('VTS: 6.7 × 8.78 in body, 10.57 in to the eye, 9.13 in with hex ports, 12.3 in with the clamp, 27 in with the horn; pairs mirrored', () => {
  const m = measure(BULLETPROOF_VTS, { horn: 1 });
  const plates = [...m.boxes.entries()].filter(([n]) => n === 'VTS side plate').map(([, b]) => b)[0];
  near(size(plates, 2), inch(8.78), .1, 'body height');
  near(m.boxes.get('Cable eye')!.max[2] - plates.min[2], inch(10.57), .2, 'height to the top eye');
  const body = ['VTS side plate', 'VTS front plate', 'VTS back plate'].map(n => m.boxes.get(n)!);
  near(Math.max(...body.map(b => b.max[1])) - Math.min(...body.map(b => b.min[1])), inch(6.7), .1, 'body width');
  near(Math.max(...body.map(b => b.max[1])) - m.boxes.get('Hex port')!.min[1], inch(9.13), .2, 'body with hex ports');
  near(size(m.all, 0), inch(12.3), .5, 'overall depth with the clamp jaws');
  near(m.all.max[1] - m.all.min[1], inch(27), .5, 'overall width with the weight horn');
  near(size(m.boxes.get('VTS weight horn')!, 1), inch(15.25), .1, 'horn sleeve');
  near(VTS_HORN_SOCKET, inch(27) - inch(6.7) - inch(9.13 - 6.7) - inch(15.25), 1e-9, 'socket from the published total');
  assert.equal(m.names.filter(n => n === 'UHMW roller').length, 8, 'eight UHMW rollers');
  const mirrored = measure(BULLETPROOF_VTS, { horn: 1, mirror: 1 });
  near(mirrored.all.min[0], -m.all.max[0], .01, 'mirror flips the clamp side');
  const stock = suggestPlacement(createAssembly(), BULLETPROOF_VTS.id).proposal!, a = stock.doc.accessories.at(-1)!;
  assert.equal(a.paired, true);
  const faces = resolveAssembly(stock.doc).filter(e => e.ownerId === a.id).map(u => u.mount!.face).sort();
  assert.deepEqual(faces, ['left', 'right'], 'on the outer side faces');
  assert.throws(() => addAccessory(stock.doc, BULLETPROOF_VTS.id, { uprightId: 'rear-left', face: 'left', hole: 20 }, false, { post: 1 }), /2 x 2 in posts/);
  const t2 = suggestPlacement(preset(/^titan-t2-/), BULLETPROOF_VTS.id).proposal!;
  assert.equal(t2.doc.accessories.at(-1)!.params.post, 1, '2 x 2 racks get the 2 x 2 pair');
});

test('ISOLATOR 3x3: carriage pinned at two stations, shaft, dial, seat, long pad, curl arm and weight horn; side and colours', () => {
  const m = measure(BULLETPROOF_ISOLATOR);
  for (const name of ['Carriage sleeve', 'Hex internal shaft', 'Degree dial', 'Seat / preacher pad', 'Long leg pad', 'Curl arm', 'Weight arm', 'Weight horn']) assert.ok(m.boxes.get(name), name);
  assert.equal(m.names.filter(n => n === 'Universal pin').length, 2);
  const pad = m.boxes.get('Seat / preacher pad')!, horn = m.boxes.get('Weight horn')!;
  assert.ok(pad.max[0] < 0 && horn.min[0] > 0, 'pads left, weight horn right');
  const right = measure(BULLETPROOF_ISOLATOR, { side: 1 });
  near(right.boxes.get('Seat / preacher pad')!.min[0], -pad.max[0], .01, 'side swaps the pads');
  assert.equal(measure(BULLETPROOF_ISOLATOR, { frame: 1 }).colors.get('Carriage sleeve'), '#e6e7e6');
  assert.equal(measure(BULLETPROOF_ISOLATOR, { pads: 1 }).colors.get('Long leg pad'), '#b3151d');
  const stock = suggestPlacement(createAssembly(), BULLETPROOF_ISOLATOR.id).proposal!, a = stock.doc.accessories.at(-1)!;
  const [unit] = resolveAssembly(stock.doc).filter(e => e.ownerId === a.id);
  assert.deepEqual(unit.mounts.map(x => x.hole), [a.target.hole, a.target.hole - 2], 'two universal pins, two stations apart');
  assert.equal(suggestPlacement(pr4000(), BULLETPROOF_ISOLATOR.id).proposal!.doc.accessories.at(-1)!.params.pin, 1, '5/8 in pins with reducer plates');
});

test('3MF export prints the family with its vendor credits', () => {
  let doc = createAssembly({ emptyAccessories: true });
  doc = addAccessory(doc, DARKO_QUICKMOUNT.id, { uprightId: 'front-left', face: 'front', hole: 20 }, false);
  doc = addAccessory(doc, BULLETPROOF_VTS.id, { uprightId: 'front-left', face: 'left', hole: 14 }, true);
  const ours = new Set<string>([DARKO_QUICKMOUNT.id, BULLETPROOF_VTS.id]);
  const builders = catalog.definitions.map(def => ours.has(def.id) ? def : { ...def, build: () => [{ name: 'Frame fixture', solid: api.Manifold.cube([1, 1, 1]), role: 'frame' as const }] });
  const result = exportPrint3MF(api, doc, builders, { layout: 'assembled' }, undefined, catalog.attribution);
  assert.equal(result.report.parts.filter(p => p.part === BULLETPROOF_VTS.id && p.plate === 'Parts').length, 2);
  const credits = JSON.parse(strFromU8(unzipSync(result.bytes)['Metadata/print-report.json'])).vendorCredits;
  assert.deepEqual(credits.map((c: { part: string }) => c.part).sort(), [...ours].sort());
  assert.deepEqual(credits.find((c: { part: string }) => c.part === DARKO_QUICKMOUNT.id).attribution, DARKO_QUICKMOUNT.vendor);
});
