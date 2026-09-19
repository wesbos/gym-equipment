import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { RACK_PRESETS, applyPreset } from './presets.ts';
import { GRID_PROFILES, gridProfile } from './profiles.ts';
import { addAccessory, createAssembly, getMounts, replaceStructurePart, resizeAssembly, resolveAssembly, validateAssembly } from './assembly.ts';
import { definitions } from './parts/structure.ts';
import type { ResolvedInstance } from './types.ts';

const api = await Module(); api.setup();
const IN = 25.4;
const STARTERS = RACK_PRESETS.filter(p => gridProfile(p.profileId).starters?.length);
const doc = (id: string) => applyPreset(id);
const close = (a: number | undefined, b: number, tol = 1e-6) => a !== undefined && Math.abs(a - b) < tol;
const build = (r: ResolvedInstance) => definitions.find(d => d.id === r.part)!.build(api, r.params);

/** Published outside footprints (inches, width × depth × height) from the vendor spec tables; see research/rack-profiles.md. */
const PUBLISHED: Record<string, { w?: number; d?: number; h: number; tol?: number }> = {
  'rogue-rm-monster-2-four-2295.525-1092.2': { w: 53, d: 53, h: 90.375 },
  'rogue-rm-monster-2-four-2295.525-762': { w: 53, d: 40, h: 90.375 },
  'rogue-rm-monster-2-six-2295.525-1092.2': { w: 53, d: 80, h: 90.375 },
  'rogue-rml-3-four-2295.525-762': { w: 53, d: 40, h: 90.375 },
  'rogue-rml-3-six-2295.525-1092.2': { w: 53, d: 80, h: 90.375 },
  'rogue-rml-390f-four-2343.15-762': { w: 49, d: 48, h: 92.25, tol: 1.1 },
  'rogue-r3-four-2295.525-762': { w: 53, d: 40, h: 90.375 },
  'rogue-hr2-four-2343.15-431.8-1835.15': { w: 49, d: 48, h: 92.25, tol: 1.1 },
  'rogue-hr2-four-2800.35-431.8-2343.15': { w: 49, d: 48, h: 110.25, tol: 1.1 },
  'rogue-sml-1-stand-1835.15-304.8': { w: 49, d: 48, h: 72.25, tol: 1.1 },
  'rogue-sml-2-stand-2343.15-304.8': { w: 49, d: 48, h: 92.25, tol: 1.1 },
  'rogue-sm-1-stand-1854.2-304.8': { d: 50, h: 73, tol: 0.8 },
  'rogue-s-2-stand-2336.8-304.8': { w: 48, d: 48, h: 92, tol: 1.1 },
  'rogue-rml-3w-wall-2295.525-546.1': { w: 59, d: 24.75, h: 90.375 },
  // Rogue lists 43.75 in from the wall but also a 41.5-inch inside depth (+3-inch post = 44.5); we honour the inside depth.
  'rogue-rml-3w-wall-2295.525-1054.1': { w: 59, d: 43.75, h: 90.375, tol: 1.1 },
  'titan-x3-four-2286-609.6': { w: 54, d: 33, h: 90 },
  'titan-x3-flat-foot-four-2311.4-762': { w: 50, d: 48, h: 91, tol: 1.1 },
  'titan-t3-four-2311.4-609.6': { w: 54, d: 32.75, h: 91 },
  'titan-t2-four-1803.4-660.4': { d: 50, h: 71 },
  'rep-pr-1100-four-2159-609.6': { d: 48.5, h: 85 },
  'rep-apollo-four-2362.2-406.4': { w: 52.4, d: 48, h: 93, tol: 1 },
};

function frameBounds(instances: ResolvedInstance[]) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const r of instances.filter(r => r.kind === 'structure')) {
    const parts = build(r);
    try {
      for (const p of parts) {
        assert.equal(p.solid.status(), 'NoError', `${r.part} ${p.name}`);
        assert.ok(!p.solid.isEmpty() && p.solid.volume() > 0, `${r.part} ${p.name} has volume`);
        const b = p.solid.boundingBox(), c = Math.cos(r.rotation[2]), s = Math.sin(r.rotation[2]);
        for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) {
          const X = r.position[0] + x * c - y * s, Y = r.position[1] + x * s + y * c;
          min[0] = Math.min(min[0], X); max[0] = Math.max(max[0], X); min[1] = Math.min(min[1], Y); max[1] = Math.max(max[1], Y);
        }
        min[2] = Math.min(min[2], r.position[2] + b.min[2]); max[2] = Math.max(max[2], r.position[2] + b.max[2]);
      }
    } finally { parts.forEach(p => p.solid.delete()); }
  }
  return { w: (max[0] - min[0]) / IN, d: (max[1] - min[1]) / IN, h: (max[2] - min[2]) / IN, floor: min[2] };
}

test('every curated starter matches its profile, validates, round-trips and names a vendor', () => {
  assert.ok(STARTERS.length >= 25);
  for (const profile of GRID_PROFILES.filter(p => p.starters)) assert.ok(profile.source && profile.reconstructionNote && profile.vendor, profile.id);
  for (const p of STARTERS) {
    const d = doc(p.id), profile = gridProfile(p.profileId);
    assert.equal(d.profileId, profile.id);
    assert.equal(d.rack.pitch, profile.pitch); assert.equal(d.rack.holeDiameter, profile.holeDiameter);
    assert.equal(d.rack.tube, profile.tube); assert.equal(d.rack.tubeDepth, profile.tubeDepth);
    assert.equal(d.rack.height, p.height); assert.equal(d.rack.depth, p.depth); assert.equal(d.rack.width, profile.widths.at(-1));
    assert.equal(Object.keys(d.uprights).length, { four: 4, six: 6, stand: 2, wall: 2, half: 2 }[p.kind], p.id);
    assert.equal(d.appearance?.frameColor, profile.color);
    assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(d))), d);
    assert.equal(d.accessories.filter(a => a.part === 'pullup-straight').length, p.pullups?.length ?? 0, p.id);
    if (profile.nameplate && d.connections.some(e => e.id === 'rear-crossmember') && !d.removed.includes('rear-crossmember')) assert.equal(d.structure['rear-crossmember']?.part, 'profile-nameplate');
    if (profile.lowerCrossmembers === false) assert.ok(!d.connections.some(e => e.level === 'lower' && !d.removed.includes(e.id)), `${p.id} has no lower crossmembers`);
    assert.ok(resolveAssembly(d).every(r => r.position.every(Number.isFinite)));
  }
});

test('published inside width and depth come straight from the upright centres', () => {
  for (const p of STARTERS.filter(p => p.kind === 'four' || p.kind === 'six')) {
    const d = doc(p.id), u = d.uprights, t = d.rack.tube, td = d.rack.tubeDepth ?? t;
    assert.ok(Math.abs(u['front-right'].x - u['front-left'].x - t - d.rack.width) < 1e-6, p.id);
    assert.ok(Math.abs(u['rear-left'].y - u['front-left'].y - td - d.rack.depth) < 1e-6, p.id);
  }
});

test('resolved frame params satisfy the build worker contract (positive, ≤ 4000, no stray zeros)', () => {
  const zeroOk = ['cornerRadius', 'benchStart', 'rise', 'offset', 'sag'];
  for (const p of STARTERS) for (const r of resolveAssembly(doc(p.id)).filter(r => r.kind === 'structure')) {
    const params = { ...definitions.find(d => d.id === r.part)!.defaults, ...r.params };
    for (const [key, value] of Object.entries(params)) assert.ok(Number.isFinite(value) && value >= 0 && value <= 4000 && (value !== 0 || zeroOk.includes(key)), `${p.id} ${r.part}.${key}=${value}`);
  }
});

test('starter frames build valid solids whose footprint matches the published outside dimensions', () => {
  for (const [id, spec] of Object.entries(PUBLISHED)) {
    assert.ok(RACK_PRESETS.some(p => p.id === id), id);
    const bounds = frameBounds(resolveAssembly(doc(id))), tol = spec.tol ?? 0.6;
    assert.ok(Math.abs(bounds.floor) < 1e-6, `${id} sits on the floor`);
    assert.ok(Math.abs(bounds.h - spec.h) < 0.05, `${id} height ${bounds.h}`);
    if (spec.w) assert.ok(Math.abs(bounds.w - spec.w) <= tol, `${id} width ${bounds.w} vs ${spec.w}`);
    if (spec.d) assert.ok(Math.abs(bounds.d - spec.d) <= tol, `${id} depth ${bounds.d} vs ${spec.d}`);
  }
});

test('2x3 uprights keep their narrow face forward and drill Westside holes only front-to-back', () => {
  const d = doc('rogue-r3-four-2295.525-762'), r = resolveAssembly(d).find(r => r.id === 'front-left')!;
  const parts = build(r);
  try {
    const tube = parts[0].solid.boundingBox();
    assert.ok(Math.abs(tube.max[0] - tube.min[0] - 2 * IN) < 0.01);
    assert.ok(Math.abs(tube.max[1] - tube.min[1] - 3 * IN) < 0.01);
    const cx = (tube.max[0] + tube.min[0]) / 2, half = d.rack.firstHole + 7.5 * d.rack.pitch, regular = d.rack.firstHole + 9 * d.rack.pitch;
    assert.equal(parts[0].solid.rayCast([cx, -200, half], [cx, 200, half]).length, 0, 'front-face Westside half station');
    assert.ok(parts[0].solid.rayCast([cx - 200, 0, half], [cx + 200, 0, half]).length > 0, 'no side hole at a half station');
    assert.equal(parts[0].solid.rayCast([cx - 200, 0, regular], [cx + 200, 0, regular]).length, 0);
  } finally { parts.forEach(p => p.solid.delete()); }
  assert.ok(getMounts(d).some(m => m.hole === 7.5 && m.face === 'front'));
  assert.ok(!getMounts(d).some(m => m.hole === 7.5 && m.face === 'left'));
  // Resizing keeps the 3-inch post depth in the lattice.
  const resized = resizeAssembly(d, { depth: 609.6 });
  assert.ok(Math.abs(resized.uprights['rear-left'].y - resized.uprights['front-left'].y - 609.6 - 3 * IN) < 1e-6);
});

test('Titan 6-inch side stride: side faces drilled every third station, beams and bars land on drilled stations', () => {
  const d = doc('titan-x3-four-2286-609.6'), res = resolveAssembly(d), r = res.find(r => r.id === 'front-left')!;
  const parts = build(r);
  try {
    const tube = parts[0].solid.boundingBox(), cx = (tube.max[0] + tube.min[0]) / 2;
    const at = (station: number) => parts[0].solid.rayCast([cx - 200, 0, d.rack.firstHole + station * d.rack.pitch], [cx + 200, 0, d.rack.firstHole + station * d.rack.pitch]).length;
    assert.equal(at(3), 0); assert.ok(at(1) > 0); assert.ok(at(2) > 0); assert.equal(at(30), 0);
  } finally { parts.forEach(p => p.solid.delete()); }
  const rear = res.find(r => r.id === 'rear-crossmember')!;
  assert.equal(rear.part, 'profile-nameplate');
  for (const m of rear.mounts) assert.equal(m.hole % 3, 0);
  assert.equal(rear.params.plateHeight, 50 + 3 * d.rack.pitch);
  for (const bar of res.filter(r => r.part === 'pullup-straight')) { assert.equal(bar.mount!.hole % 3, 0); assert.equal(bar.params.mountSpacing, 3 * d.rack.pitch); }
  assert.ok(!getMounts(d, 'j-hook-standard').some(m => (m.face === 'left' || m.face === 'right') && m.hole % 3));
});

test('flat feet run continuously under each column with capped outer ends and gussets', () => {
  const d = doc('rogue-rml-390f-four-2343.15-762'), res = resolveAssembly(d);
  const front = res.find(r => r.id === 'front-left')!, rear = res.find(r => r.id === 'rear-left')!;
  const span = d.uprights['rear-left'].y - d.uprights['front-left'].y;
  assert.equal(front.params.baseStyle, 2);
  assert.ok(Math.abs(front.params.footMinus + front.params.footPlus + rear.params.footMinus + rear.params.footPlus - 48 * IN) < 1e-6);
  assert.ok(Math.abs(front.params.footPlus - span / 2) < 1e-6);
  assert.equal(front.params.footOpenPlus, 1); assert.equal(front.params.footOpenMinus, undefined);
  const parts = build(front);
  try { assert.ok(parts.some(p => p.name === 'Bolted triangle gusset plates')); assert.ok(parts.some(p => p.name === 'Flat foot base tube')); }
  finally { parts.forEach(p => p.solid.delete()); }
  // Right-hand posts are turned, so their local foot extents swap while the world extents match.
  const right = res.find(r => r.id === 'front-right')!;
  assert.equal(right.params.footPlus, front.params.footMinus); assert.equal(right.params.footMinus, front.params.footPlus);
});

test('squat stands: two posts on feet with a rear floor bar; S-2 carries fat and skinny bars', () => {
  const d = doc('rogue-s-2-stand-2336.8-304.8'), res = resolveAssembly(d);
  assert.deepEqual(Object.keys(d.uprights).sort(), ['front-left', 'front-right']);
  assert.equal(d.connections.length, 0);
  const posts = res.filter(r => r.part === 'upright');
  for (const post of posts) assert.ok(Math.abs(post.params.crossIn - Math.abs(d.uprights[post.id].x)) < 1e-6);
  const bars = res.filter(r => r.part === 'pullup-straight').sort((a, b) => b.mount!.hole - a.mount!.hole);
  assert.deepEqual(bars.map(b => b.params.diameter), [31.75, 50.8]);
  assert.ok(Math.abs((bars[0].mount!.hole - bars[1].mount!.hole) * d.rack.pitch - 6 * IN) < 1);
  assert.equal(doc('rogue-sml-1-stand-1835.15-304.8').accessories.length, 0);
});

test('fold-back wall rack swings on arms reaching the published wall distance', () => {
  for (const [id, inside] of [['rogue-rml-3w-wall-2295.525-546.1', 21.5], ['rogue-rml-3w-wall-2295.525-1054.1', 41.5]] as const) {
    const d = doc(id), post = resolveAssembly(d).find(r => r.id === 'front-left')!;
    assert.equal(post.params.baseStyle, 3);
    assert.ok(Math.abs(post.params.wallDepth - (inside + 0.25) * IN) < 1e-6);
    const parts = build(post);
    try { assert.ok(parts.some(p => p.name === 'Wall-mount hinge brackets')); assert.ok(parts.some(p => p.role === 'source' && p.name === 'Detent locking pins')); }
    finally { parts.forEach(p => p.solid.delete()); }
  }
});

test('half-rack rear posts are shorter; beams, mounts and accessories respect the post top', () => {
  const d = doc('rogue-hr2-four-2343.15-431.8-1835.15'), res = resolveAssembly(d);
  assert.ok(close(d.uprights['rear-left'].height, 72.25 * IN));
  assert.ok(close(res.find(r => r.id === 'rear-left')!.params.height, 72.25 * IN));
  assert.ok(close(res.find(r => r.id === 'front-left')!.params.height, 92.25 * IN));
  assert.ok(d.removed.includes('rear-crossmember'));
  const side = res.find(r => r.id === 'left-upper-crossmember')!;
  assert.ok(side.position[2] + side.params.plateHeight < 72.25 * IN);
  const top = Math.max(...getMounts(d).filter(m => m.uprightId === 'rear-left').map(m => m.hole));
  assert.ok(d.rack.firstHole + top * d.rack.pitch < 72.25 * IN);
  assert.throws(() => addAccessory(d, 'pullup-straight', { uprightId: 'rear-left', face: 'right', hole: top + 5 }, false), /shorter upright/);
  // Growing the rack keeps the rear posts short; shrinking below them drops the override.
  assert.ok(close(resizeAssembly(d, { height: 110.25 * IN }).uprights['rear-left'].height, 72.25 * IN));
});

test('manufacturer nameplates: coloured plates without artwork, only on profiles that have one', () => {
  const rm4 = resolveAssembly(doc('rogue-rm-monster-2-four-2295.525-1092.2')).find(r => r.id === 'rear-crossmember')!;
  const parts = build(rm4);
  try {
    const plate = parts.find(p => p.name === 'Manufacturer nameplate plate')!;
    assert.equal(plate.color, '#c8102e'); assert.equal(plate.role, 'source');
    const b = plate.solid.boundingBox();
    assert.ok(Math.abs(b.max[2] - b.min[2] - 11 * IN) < 0.5);
  } finally { parts.forEach(p => p.solid.delete()); }
  assert.throws(() => replaceStructurePart(doc('rogue-rml-3-four-2295.525-762'), 'rear-crossmember', 'profile-nameplate'), /no manufacturer nameplate/);
  for (const style of [1, 2, 3]) {
    const d = definitions.find(d => d.id === 'profile-nameplate')!, out = d.build(api, { ...d.defaults, panelStyle: style });
    try { for (const p of out) { assert.equal(p.solid.status(), 'NoError'); assert.ok(p.solid.volume() > 0); } } finally { out.forEach(p => p.solid.delete()); }
  }
});

test('existing documents and presets keep their geometry contract', () => {
  const generic = createAssembly();
  assert.equal(generic.rack.tube, 75); assert.equal(generic.rack.tubeDepth, undefined);
  assert.throws(() => validateAssembly({ ...generic, rack: { ...generic.rack, tubeDepth: 80 } }), /Upright depth/);
  assert.throws(() => validateAssembly({ ...doc('rogue-r3-four-2295.525-762'), rack: { ...doc('rogue-r3-four-2295.525-762').rack, tubeDepth: 50.8 } }), /Upright depth/);
  // A stored v2 PR-4000 rack (no nameplate variant, 75 mm tube) still validates unchanged.
  const legacy = doc('rep-pr-4000-four-2032-609.6');
  const stored = { ...legacy, structure: {}, appearance: undefined };
  delete (stored as { appearance?: unknown }).appearance;
  assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(stored))).rack, legacy.rack);
  assert.equal(legacy.rack.tube, 75);
  // BOS plate uprights are unchanged: default style, square 75 mm tube.
  const post = resolveAssembly(generic).find(r => r.part === 'upright')!;
  assert.equal(post.params.baseStyle, undefined); assert.equal(post.params.depth, undefined);
  const parts = build(post);
  try { assert.deepEqual(parts.map(p => p.name), ['Numbered 75 mm upright', 'Asymmetric rounded three-hole floor plate']); } finally { parts.forEach(p => p.solid.delete()); }
});

test('featured brand starters cover every shipped profile', () => {
  for (const profile of GRID_PROFILES.filter(p => p.starters)) assert.ok(RACK_PRESETS.some(p => p.profileId === profile.id && p.featured), profile.id);
});
