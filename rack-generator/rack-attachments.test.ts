/** #131 proof entries: Rogue Monster Band Peg 2.0 and REP Fitness Leg Roller (1.0). Published dimensions come out of
 * the builds; placement, pairing, bores and 3MF credits behave like the other vendor rack parts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';
import { catalog, definitions } from './catalog.ts';
import { createAssembly, resolveAssembly, validateAssembly, addAccessory } from './assembly.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { validateRackParams, coerceRackParams } from './rack-registry.ts';
import { ROGUE_MONSTER_BAND_PEG, BAND_PEG } from './rack-parts/rogue-band-pegs.ts';
import { REP_LEG_ROLLER, LEG_ROLLER_SERIES } from './rack-parts/rep-leg-roller.ts';
import { exportPrint3MF } from '../src/exports/print-3mf.ts';
import type { NumericParams, RackDoc, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
type Box = { min: number[]; max: number[] };
function measure(id: string, params: NumericParams, tube = 75) {
  const def = definitions.find(d => d.id === id)!, parts: SolidPart[] = def.build(api, { upright: tube, mountSpacing: 50, holeDiameter: 25, ...def.defaults, ...params });
  try {
    const boxes = new Map<string, Box>(), all: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const p of parts) {
      const b = p.solid.boundingBox(); boxes.set(p.name, { min: [...b.min], max: [...b.max] });
      for (let i = 0; i < 3; i++) { all.min[i] = Math.min(all.min[i], b.min[i]); all.max[i] = Math.max(all.max[i], b.max[i]); }
    }
    return { all, boxes, colors: new Map(parts.map(p => [p.name, p.color])) };
  } finally { parts.forEach(p => p.solid.delete()); }
}
const size = (b: Box, i: number) => b.max[i] - b.min[i];
const near = (actual: number, expected: number, tolerance: number, label: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tolerance}`);
test('band peg: 11 in overall, 1 in rod, 7-3/8 in proud of a 3 in upright, both heads and finishes', () => {
  for (const [head, finish] of [[0, 0], [1, 0], [1, 1]]) {
    const m = measure(ROGUE_MONSTER_BAND_PEG.id, { head, finish }, inch(3)), rod = m.boxes.get('Band peg 1 in solid rod')!;
    near(size(m.all, 1), inch(11), .3, 'overall length (incl. cap)');
    near(m.all.max[1] - inch(3) / 2, inch(7.375), .3, 'projection from the mounting face');
    near(size(rod, 0), inch(1), .2, 'rod diameter'); near(size(rod, 2), inch(1), .2, 'rod diameter');
    const cap = m.boxes.get(head ? 'Cast hex head' : 'Machined chamfered cap')!;
    near(size(cap, 1), BAND_PEG.cap, .1, 'cap height');
    near(size(cap, 2), inch(1.5), .3, head ? 'hex across flats' : 'cap diameter');
    assert.equal(cap.max[1], -inch(3) / 2, 'cap bears on the far upright face');
    assert.equal(m.colors.get('Band peg 1 in solid rod'), finish ? '#c7cbce' : '#1c1d1f');
  }
  assert.throws(() => validateRackParams(ROGUE_MONSTER_BAND_PEG, { head: 0, finish: 1 }), /band peg finish/, 'the machined cap ships in matte black only');
  assert.deepEqual(coerceRackParams(ROGUE_MONSTER_BAND_PEG, { head: 0, finish: 1 }), { head: 0, finish: 0 });
});
test('band pegs place as a pair low on the outer side faces, pointing outward, and refuse 5/8-inch holes', () => {
  const stock = createAssembly(), p = suggestPlacement(stock, ROGUE_MONSTER_BAND_PEG.id).proposal!;
  const a = p.doc.accessories.at(-1)!, units = resolveAssembly(p.doc).filter(e => e.ownerId === a.id);
  assert.equal(a.paired, true); assert.equal(units.length, 2);
  assert.deepEqual(units.map(u => u.mount!.face).sort(), ['left', 'right']);
  for (const u of units) {
    assert.equal(u.mount!.center[2], 115, 'hole 2, 115 mm up');
    const post = p.doc.uprights[u.mount!.uprightId], out = u.mount!.face === 'left' ? -1 : 1;
    assert.ok(out * (u.mount!.position[0] - post.x) > 0, 'mount point on the outer face');
  }
  const pr4000 = validateAssembly({ ...createAssembly({ emptyAccessories: true }), profileId: 'rep-pr-4000', rack: { ...createAssembly().rack, pitch: 50.8, holeDiameter: 15.875 } } as RackDoc);
  const refused = suggestPlacement(pr4000, ROGUE_MONSTER_BAND_PEG.id);
  assert.equal(refused.proposal, null); assert.match(refused.reason, /exceeds the rack bore/);
});
test('leg roller 5000: 20.1 in overall, 15.4 in by 4.8 in pad against the face, shaft through the upright', () => {
  const s = LEG_ROLLER_SERIES[0], m = measure(REP_LEG_ROLLER.id, { series: 0 }), pad = m.boxes.get('Vinyl-covered foam roller pad')!;
  near(size(m.all, 1), inch(20.1), 1, 'overall length'); near(size(pad, 1), inch(15.4), 1, 'pad length'); near(size(pad, 0), inch(4.8), .5, 'pad diameter');
  near(pad.min[1], 75 / 2 + 8, .01, 'pad starts at the collar on the mounting face');
  assert.ok(m.boxes.get('Chrome-plated solid 1 in shaft')!.min[1] < -75 / 2 - 15, 'shaft passes through and out of the far face');
  assert.ok(m.boxes.get('Lynch pin')!.max[1] < -75 / 2, 'lynch pin behind the upright');
  near(s.length, 510.54, .01, 'published 20.1 in');
});
test('leg roller 4000: 33.4 in overall, 17.4 in by 4.9 in pad on a hanger arm, mirrored for the pair', () => {
  const m = measure(REP_LEG_ROLLER.id, { series: 1 }), pad = m.boxes.get('Vinyl-covered foam roller pad')!;
  near(size(m.all, 0), inch(33.4), 1, 'overall length'); near(size(pad, 0), inch(17.4), 2.5, 'pad length'); near(size(pad, 2), inch(4.9), .5, 'pad diameter');
  const mirrored = measure(REP_LEG_ROLLER.id, { series: 1, mirror: 1 });
  near(mirrored.all.min[0], -m.all.max[0], .01, 'mirror flips local X');
  assert.ok(m.boxes.get('Red pop-pin pull ring'));
});
test('leg roller picks its series from the rack bore and uses the pop-pin station on 5/8-inch racks', () => {
  const stock = suggestPlacement(createAssembly(), REP_LEG_ROLLER.id).proposal!;
  const a = stock.doc.accessories.at(-1)!, [unit] = resolveAssembly(stock.doc).filter(e => e.ownerId === a.id);
  assert.equal(a.paired, false); assert.equal({ ...REP_LEG_ROLLER.defaults, ...a.params }.series, 0); assert.equal(unit.mounts.length, 1);
  const pr4000 = validateAssembly({ ...createAssembly({ emptyAccessories: true }), profileId: 'rep-pr-4000', rack: { ...createAssembly().rack, pitch: 50.8, holeDiameter: 15.875 } } as RackDoc);
  const fitted = suggestPlacement(pr4000, REP_LEG_ROLLER.id).proposal!, b = fitted.doc.accessories.at(-1)!;
  assert.equal(b.params.series, 1, '5/8-inch holes get the 4000 hanger');
  const [hanger] = resolveAssembly(fitted.doc).filter(e => e.ownerId === b.id);
  assert.deepEqual(hanger.mounts.map(m => m.hole), [b.target.hole, b.target.hole - 1]);
  assert.throws(() => addAccessory(pr4000, REP_LEG_ROLLER.id, { hole: 8 }, false, { series: 0 }), /exceeds the rack bore/);
});
test('3MF export keeps both proof parts with their vendor credits', () => {
  let doc = createAssembly({ emptyAccessories: true });
  doc = addAccessory(doc, ROGUE_MONSTER_BAND_PEG.id, { uprightId: 'front-left', face: 'left', hole: 1 }, true);
  doc = addAccessory(doc, REP_LEG_ROLLER.id, { uprightId: 'rear-left', face: 'right', hole: 3 }, false);
  const ours = new Set<string>([ROGUE_MONSTER_BAND_PEG.id, REP_LEG_ROLLER.id]);
  const builders = catalog.definitions.map(def => ours.has(def.id) ? def : { ...def, build: () => [{ name: 'Frame fixture', solid: api.Manifold.cube([1, 1, 1]), role: 'frame' as const }] });
  const result = exportPrint3MF(api, doc, builders, { layout: 'assembled' }, undefined, catalog.attribution);
  assert.equal(result.report.parts.filter(p => p.part === ROGUE_MONSTER_BAND_PEG.id && p.plate === 'Parts').length, 2);
  const credits = JSON.parse(strFromU8(unzipSync(result.bytes)['Metadata/print-report.json'])).vendorCredits;
  assert.deepEqual(credits.map((c: { part: string }) => c.part).sort(), [...ours].sort());
  assert.deepEqual(credits.find((c: { part: string }) => c.part === REP_LEG_ROLLER.id).attribution, REP_LEG_ROLLER.vendor);
});
