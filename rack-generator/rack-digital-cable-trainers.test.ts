/** Rack-system cable machines (#178, #136, #122, #130): REP lat pulldown & low row (selectorized and plate-loaded), Rogue
 * Monster Rhino + INDY, Fringe Sport The Dane 2.0 stacks, and the leftover rack profiles (Fitness Reality 810XLT, Fray
 * Savage F-1, The Dane 2.0 frame). Every entry builds valid solids across its options, the published envelopes come out
 * of the builds placed on their makers' racks, and each refuses the racks it does not fit with a reason. The registry
 * contract (extents, bodies, budgets, pairing, round trips) is swept by rack-registry.test.ts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { definitions } from './catalog.ts';
import { rackBuildParams, validateRackParams, coerceRackParams } from './rack-registry.ts';
import { floorOptions } from './floor-part.ts';
import { applyPreset, RACK_PRESETS } from './presets.ts';
import { suggestPlacement } from './placement-proposals.ts';
import { addAccessory, createAssembly, resolveAssembly, validateAssembly } from './assembly.ts';
import { definitions as structure } from './parts/structure.ts';
import { PARTS, REP_SELECTORIZED_LAT, REP_PLATE_LAT, ROGUE_RHINO_INDY, FRINGE_DANE_STACKS, REP_LAT, inch } from './rack-parts/rack-digital-cable-trainers.ts';
import type { NumericParams, RackDoc, ResolvedInstance } from './types.ts';
import { BUILD_BUDGET_MS } from './test-budget.ts';
const api = await Module(); api.setup();
const IN = 25.4;
const PR5000 = 'rep-pr-5000-four-2362.2-762', PR4000_80 = 'rep-pr-4000-four-2032-762', PR5000_6 = 'rep-pr-5000-six-2362.2-1041.4';
const RM4 = 'rogue-rm-monster-2-four-2295.525-1092.2', RM6 = 'rogue-rm-monster-2-six-2295.525-1092.2', RML390 = 'rogue-rml-3-four-2295.525-762';
const DANE = 'fringe-dane-2-four-2260.6-762', FR810 = 'fitness-reality-810xlt-four-1892.3-482.6', FRAY = 'fray-savage-f1-four-2387.6-787.4', FRAY_DEEP = 'fray-savage-f1-four-2387.6-1092.2';
const near = (actual: number, expected: number, tolerance: number, label: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)} ±${tolerance}`);

/** World bounds of resolved instances (rotation about Z, as the builder places them). */
function bounds(instances: ResolvedInstance[]) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const r of instances) {
    const def = [...definitions, ...structure].find(d => d.id === r.part)!, parts = def.build(api, r.params);
    try {
      for (const p of parts) {
        assert.equal(p.solid.status(), 'NoError', `${r.part} ${p.name}`); assert.ok(!p.solid.isEmpty() && p.solid.volume() > 0, `${r.part} ${p.name}`);
        const b = p.solid.boundingBox(), c = Math.cos(r.rotation[2]), s = Math.sin(r.rotation[2]);
        for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) {
          const X = r.position[0] + x * c - y * s, Y = r.position[1] + x * s + y * c;
          min[0] = Math.min(min[0], X); max[0] = Math.max(max[0], X); min[1] = Math.min(min[1], Y); max[1] = Math.max(max[1], Y);
        }
        min[2] = Math.min(min[2], r.position[2] + b.min[2]); max[2] = Math.max(max[2], r.position[2] + b.max[2]);
      }
    } finally { parts.forEach(p => p.solid.delete()); }
  }
  return { min, max };
}
/** Place `part` on a starter through the placement proposals (the sidebar's Place button) and return its units. */
function place(preset: string | RackDoc, part: string) {
  const doc = typeof preset === 'string' ? applyPreset(preset) : preset, r = suggestPlacement(doc, part as Parameters<typeof suggestPlacement>[1]);
  if (!r.proposal) return { reason: r.reason, doc, units: [] as ResolvedInstance[] };
  const a = r.proposal.doc.accessories.at(-1)!;
  return { reason: '', doc: r.proposal.doc, accessory: a, units: resolveAssembly(r.proposal.doc).filter(e => e.ownerId === a.id) };
}
const posts = (doc: RackDoc) => Object.entries(doc.uprights).filter(([id]) => !doc.removed.includes(id)).map(([, n]) => n);

test('every entry builds valid closed solids for defaults and the first, middle and last value of every param, within budget', () => {
  for (const part of PARTS) {
    const def = definitions.find(d => d.id === part.id)!, sets: NumericParams[] = [{}];
    for (const param of part.params) {
      const options = floorOptions(param, part.defaults);
      for (const v of new Set([options[0], options[Math.floor(options.length / 2)], options.at(-1)!])) sets.push({ [param.key]: v });
    }
    for (const p of sets) for (const context of [{}, { acrossOut: -1, rowSide: 1, uprightSpan: 1215, holeHeight: 166, rackHeight: inch(80) }] as NumericParams[]) {
      const started = performance.now(), solids = def.build(api, rackBuildParams(part, { ...p, ...context }));
      try {
        assert.ok(performance.now() - started < BUILD_BUDGET_MS, part.id);
        let tris = 0;
        for (const s of solids) { assert.equal(s.solid.status(), 'NoError', `${part.id} ${s.name}`); assert.ok(!s.solid.isEmpty() && s.solid.volume() > 0, `${part.id} ${s.name}`); tris += s.solid.numTri(); }
        assert.ok(tris < 80000, `${part.id}: ${tris} triangles`);
      } finally { solids.forEach(s => s.solid.delete()); }
    }
    assert.deepEqual(validateRackParams(part, {}), part.defaults);
    assert.throws(() => validateRackParams(part, { junk: 1 }), new RegExp(part.noun));
    assert.deepEqual(coerceRackParams(part, { ...part.defaults }), part.defaults);
  }
});

test('REP lat pulldown: 95.7 / 83.6 in overall on 93 / 80 in racks, 27.5 in behind the rear uprights, 28.4 in wide, RBS between the rear posts', () => {
  for (const [preset, overall, part] of [[PR5000, 95.7, REP_SELECTORIZED_LAT], [PR4000_80, 83.6, REP_SELECTORIZED_LAT], [PR5000, 95.7, REP_PLATE_LAT], [PR4000_80, 83.6, REP_PLATE_LAT]] as const) {
    const r = place(preset, part.id), rear = Math.max(...posts(r.doc).map(p => p.y)), tube = r.doc.rack.tube;
    assert.equal(r.units.length, 1, `${part.id} on ${preset}: ${r.reason}`);
    assert.equal(r.accessory!.target.face, r.accessory!.target.uprightId === 'rear-left' ? 'right' : 'left', 'on a rear post inner face');
    const b = bounds(r.units);
    near(b.max[2] / IN, overall, .1, `${part.id} overall height on ${preset}`);
    near(b.min[2], 0, .5, 'stands on the floor');
    near((b.max[1] - rear - tube / 2) / IN, 27.5, .4, 'added depth behind the rear uprights');
    // Published footprint width 28.4 in (band pegs); the RBS spans the 41–46 in between the rear posts.
    const across = b.max[0] - b.min[0];
    assert.ok(across >= r.doc.rack.width && across <= r.doc.rack.width + 2 * tube + inch(3), `RBS bolts into both rear posts: ${across.toFixed(0)} mm`);
    // Series follows the bore: 5/8 in hardware on the PR-4000, 1 in on the PR-5000.
    assert.equal(r.accessory!.params.series, r.doc.rack.holeDiameter < 20 ? 0 : 1);
  }
  // 28.4 in footprint width from the band pegs (built alone, nominal context).
  const solids = definitions.find(d => d.id === REP_SELECTORIZED_LAT.id)!.build(api, rackBuildParams(REP_SELECTORIZED_LAT));
  try {
    const peg = solids.find(s => s.name === 'REP metallic black steel')!.solid.boundingBox();
    assert.ok(peg.max[1] - peg.min[1] > inch(28.4) - 5, 'machine spans at least the published width');
  } finally { solids.forEach(s => s.solid.delete()); }
  // 300 lb upgrade: 28 plates, a taller stack than 200 lb.
  const heights = [0, 1].map(stack => { const s = definitions.find(d => d.id === REP_SELECTORIZED_LAT.id)!.build(api, rackBuildParams(REP_SELECTORIZED_LAT, { stack, pin: 0 }));
    try { return s.find(x => x.name === 'Black cast-iron stack plates')!.solid.boundingBox().max[2]; } finally { s.forEach(x => x.solid.delete()); } });
  near(heights[1] - heights[0], 10 * (REP_LAT.plate.t + 1.2), 1, '10 extra plates');
});

test('REP lat pulldown fits REP 80 / 93 in racks behind the rear posts and explains the rest', () => {
  // Six-post: the tower mounts on the main bay's rear posts and stands in the storage bay (REP: adds 8.5 in).
  const six = place(PR5000_6, REP_SELECTORIZED_LAT.id);
  assert.equal(six.units[0]?.params.rowSide, 0, 'middle posts of a six-post rack');
  const ys = posts(six.doc).map(p => p.y).sort((a, b) => a - b), b = bounds(six.units);
  near((b.max[1] - ys.at(-1)! - six.doc.rack.tube / 2) / IN, 27.5 - 16 - 3, .6, 'added depth past the storage posts');
  // Front posts are refused; a 90 in Rogue rack has neither REP height; Monster Lite's 5/8 in bore refuses 1 in bolts but takes the 4000 series.
  const doc = applyPreset(PR5000);
  assert.throws(() => addAccessory(doc, REP_SELECTORIZED_LAT.id, { uprightId: 'front-left', face: 'right', hole: 2 }, false), /behind the rack/);
  assert.throws(() => addAccessory(applyPreset(RM4), REP_SELECTORIZED_LAT.id, { uprightId: 'rear-left', face: 'right', hole: 1 }, false), /80 and 93 in/);
  assert.match(place('titan-t3-four-2311.4-609.6', REP_PLATE_LAT.id).reason, /fit|3 x 3/);
});

test('Rogue Monster Rhino + INDY: 92 in tall, 53 in wide, rack length + 26 in on the RM-4 and RM-6, stacks in the rear bay', () => {
  for (const preset of [RM4, RM6]) {
    const r = place(preset, ROGUE_RHINO_INDY.id), ys = posts(r.doc).map(p => p.y), front = Math.min(...ys), rear = Math.max(...ys), tube = r.doc.rack.tube;
    assert.equal(r.units.length, 1, `${preset}: ${r.reason}`);
    assert.equal(r.units[0].params.rowSide, 1, 'rearmost posts');
    const b = bounds(r.units);
    near(b.max[2] / IN, 92, .75, 'overall height');
    near((b.max[0] - b.min[0]) / IN, 53, 1.5, 'overall width across the shrouds and trolleys');
    near((b.max[1] - rear - tube / 2) / IN, 26, .75, 'Rhino plate posts behind the rear uprights');
    assert.ok(b.min[1] <= front + tube, 'trolleys reach the front uprights');
  }
  // One stack: narrower on that side only.
  const dual = bounds(place(RM4, ROGUE_RHINO_INDY.id).units), left = applyPreset(RM4);
  const single = bounds(place(left, ROGUE_RHINO_INDY.id).units.length ? resolveAssembly(validateAssembly({ ...left, accessories: [...left.accessories, { ...place(left, ROGUE_RHINO_INDY.id).accessory!, params: { sides: 1, trolley: 2 } }] })).filter(e => e.part === ROGUE_RHINO_INDY.id) : []);
  assert.ok(single.max[0] < dual.max[0] - 50, 'left-only drops the right stack and trolley');
  // Monster racks only: the PR-5000 is too wide, Monster Lite's 5/8 in holes refuse the 1 in hardware, a six-post's middle posts are refused.
  assert.match(place(PR5000, ROGUE_RHINO_INDY.id).reason, /fit|bore/);
  assert.match(place(RML390, ROGUE_RHINO_INDY.id).reason, /bore/);
  const six = applyPreset(RM6), middle = Object.entries(six.uprights).find(([id, n]) => n.x < 0 && n.y > Math.min(...posts(six).map(p => p.y)) + 1 && n.y < Math.max(...posts(six).map(p => p.y)) - 1)![0];
  assert.throws(() => addAccessory(six, ROGUE_RHINO_INDY.id, { uprightId: middle, face: 'right', hole: 1 }, false), /rearmost/);
});

test('Fringe Sport The Dane 2.0: starter ships both stacks; 60 x 47 x 92 in overall with the extension feet', () => {
  const doc = applyPreset(DANE), stacks = doc.accessories.filter(a => a.part === FRINGE_DANE_STACKS.id);
  assert.equal(stacks.length, 1); assert.equal(stacks[0].paired, true);
  assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(doc))), doc);
  const all = resolveAssembly(doc), units = all.filter(e => e.part === FRINGE_DANE_STACKS.id);
  assert.equal(units.length, 2, 'one stack in each side frame');
  const frame = bounds(all.filter(r => r.kind === 'structure')), b = bounds(units);
  const min = [0, 1, 2].map(i => Math.min(frame.min[i], b.min[i])), max = [0, 1, 2].map(i => Math.max(frame.max[i], b.max[i]));
  near((max[1] - min[1]) / IN, 60, 1.5, 'overall depth with the extension feet');
  near((max[0] - min[0]) / IN, 47, 1.6, 'overall width with the trolley pulleys');
  near(max[2] / IN, 92, 1, 'overall height over the pulley housings');
  near(doc.rack.height / IN, 89, .01, '89 in uprights');
  // Stacks sit between the rear and front uprights; trolleys ride the front posts.
  const ys = posts(doc).map(p => p.y);
  assert.ok(b.min[1] < Math.max(...ys) && b.max[1] > Math.min(...ys));
  // Front posts' front faces have no upright ahead to span to; 2x2 racks are refused.
  assert.throws(() => addAccessory(applyPreset(DANE), FRINGE_DANE_STACKS.id, { uprightId: 'front-left', face: 'front', hole: 0 }, false), /fit/);
  assert.match(place('titan-t2-four-1803.4-660.4', FRINGE_DANE_STACKS.id).reason, /fit|3 x 3|station|hole/);
  // The stock BOS rack takes a pair too (75 mm stand-in for the Dane's metric 3x3).
  assert.equal(place(createAssembly(), FRINGE_DANE_STACKS.id).units.length, 2);
});

test('leftover rack profiles: published outside footprints and heights', () => {
  const PUBLISHED: Record<string, { w: number; d: number; h: number; tol: number }> = {
    [FR810]: { w: 46, d: 50, h: 74.5, tol: 1.1 },
    [FRAY]: { w: 48, d: 37, h: 94, tol: 1 },
    [FRAY_DEEP]: { w: 48, d: 49, h: 94, tol: 1 },
    'fray-savage-f1-four-2019.3-787.4': { w: 48, d: 37, h: 79.5, tol: 1 },
  };
  for (const [id, want] of Object.entries(PUBLISHED)) {
    assert.ok(RACK_PRESETS.some(p => p.id === id), id);
    const doc = applyPreset(id), b = bounds(resolveAssembly(doc).filter(r => r.kind === 'structure'));
    near((b.max[0] - b.min[0]) / IN, want.w, want.tol, `${id} width`); near((b.max[1] - b.min[1]) / IN, want.d, want.tol, `${id} depth`); near((b.max[2] - b.min[2]) / IN, want.h, .05, `${id} height`);
  }
  // 810XLT: 2x2 posts, 1 in holes on 3 in centres from 12 in (19 bar heights), charcoal feet under silver posts, low rear brace only.
  const fr = applyPreset(FR810);
  assert.equal(fr.rack.tube, inch(2)); assert.equal(fr.rack.pitch, inch(3)); assert.equal(fr.rack.firstHole, inch(12));
  assert.equal(Math.floor((fr.rack.height - fr.rack.firstHole) / fr.rack.pitch) + 1, 19, '19 bar heights');
  const live = fr.connections.filter(e => !fr.removed.includes(e.id)).map(e => e.id).sort();
  assert.deepEqual(live, ['left-upper-crossmember', 'rear-crossmember', 'rear-lower-crossmember', 'right-upper-crossmember']);
  const post = resolveAssembly(fr).find(r => r.part === 'upright')!, parts = structure.find(d => d.id === 'upright')!.build(api, post.params);
  try {
    const feet = parts.filter(p => p.name.includes('factory colour'));
    assert.ok(feet.length && feet.every(p => p.color === '#3c3e42' && p.role === 'source'), 'charcoal feet');
    assert.ok(parts.some(p => p.role === 'frame' && p.name.includes('upright')), 'posts take the frame paint');
  } finally { parts.forEach(p => p.solid.delete()); }
  // Fray: 3x3, 1 in hardware on 2 in, numbered; grey arched logo plate on the rear crossmember.
  const fray = applyPreset(FRAY);
  assert.equal(fray.rack.tube, inch(3)); assert.equal(fray.rack.pitch, inch(2)); assert.equal(fray.structure['rear-crossmember']?.part, 'profile-nameplate');
});
