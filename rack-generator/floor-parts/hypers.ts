/** Reverse hypers, GHDs and back extensions. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 * Layout functions here are pure maths shared by the builders (parts/hypers*.ts) and the footprints, so the
 * built bounding box always equals the declared footprint. Design axes: X across the machine, +Y toward the
 * handles / head end, Z up; each builder shifts its design frame so the footprint centre lands on the origin. */
import { defineFloorPart, type FloorBox, type FloorPart } from '../floor-part.ts';
import { PLATE_GAP, PLATE_SPECS, plateStackLength, type PlateId } from '../plates.ts';
import type { NumericParams, Vec3 } from '../types.ts';
export const inch = (v: number) => v * 25.4;
const deg = (v: number) => `${v}°`;
/** Plate loads per horn (each side of a pendulum or swing arm gets the same stack). */
export const HYPER_LOADS: readonly { label: string; plates: readonly PlateId[] }[] = [
  { label: 'Unloaded', plates: [] },
  { label: '10 lb per side', plates: ['lb10'] },
  { label: '25 lb per side', plates: ['lb25'] },
  { label: '45 lb per side', plates: ['lb45'] },
  { label: '2 × 45 lb per side', plates: ['lb45', 'lb45'] },
  { label: '10 kg bumper per side', plates: ['kg10'] },
  { label: '20 kg bumper per side', plates: ['kg20'] },
  { label: '25 kg bumper per side', plates: ['kg25'] },
  { label: '2 × 20 kg bumpers per side', plates: ['kg20', 'kg20'] },
];
const lbOf = (plates: readonly PlateId[]) => plates.reduce((s, p) => s + PLATE_SPECS[p].weight * (PLATE_SPECS[p].unit === 'kg' ? 2.20462 : 1), 0);
/** Load options that fit a horn's loadable length (with room for a spring collar) and the arm's rated capacity. */
export function hyperLoadOptions(hornLength: number, capacityLb: number, collar = 12, horns = 2) {
  return HYPER_LOADS.map((l, i) => ({ l, i })).filter(({ l }) => !l.plates.length || (plateStackLength(l.plates) + PLATE_GAP + collar <= hornLength && horns * lbOf(l.plates) <= capacityLb + 1e-9)).map(({ i }) => i);
}
export const hyperLoad = (i: number) => { const l = HYPER_LOADS[i]; if (!l) throw Error('Unsupported hyper load.'); return l; };
const loadParam = (hornLength: number, capacityLb: number, horns = 2) => ({ key: 'load', label: 'Plates on the horns', default: 0, options: hyperLoadOptions(hornLength, capacityLb, 12, horns), format: (v: number) => HYPER_LOADS[v]?.label ?? String(v) });
const plateRadius = (plates: readonly PlateId[]) => Math.max(0, ...plates.map(p => PLATE_SPECS[p].diameter / 2));
/** Extents helper: accumulates Y/Z bounds from circles (in the YZ plane) and points. */
class Extent {
  y0 = Infinity; y1 = -Infinity; z1 = -Infinity;
  circle(c: Vec3, r: number) { this.y0 = Math.min(this.y0, c[1] - r); this.y1 = Math.max(this.y1, c[1] + r); this.z1 = Math.max(this.z1, c[2] + r); return this; }
  point(p: Vec3) { return this.circle(p, 0); }
}
export const rotYZ = (p: Vec3, pivot: Vec3, degrees: number): Vec3 => {
  const a = degrees * Math.PI / 180, y = p[1] - pivot[1], z = p[2] - pivot[2];
  return [p[0], pivot[1] + y * Math.cos(a) - z * Math.sin(a), pivot[2] + y * Math.sin(a) + z * Math.cos(a)];
};

// ─── Westside Barbell Scout Hyper (Rogue) ────────────────────────────────────────────────
/** Published: pad 27.5 × 21.5 × 2 in, pad top 46.5 in, width 32 in over the pop pins, 38 in long including the
 * handles, 5.25 in loadable weight posts, 176 lb swing-arm capacity. Leg geometry scaled from Rogue/GGR side photos. */
export const SCOUT = {
  padW: inch(27.5), padD: inch(21.5), padT: inch(2), padTop: inch(46.5), pinWidth: inch(32), horn: inch(5.25), capacity: 176,
  tube: inch(2), plateGap: 165, plateY: [-255, 285] as const,
  /** Scissor legs: top (Y, Z) and foot Y. The rear-foot pair is outboard; the front-foot pair inboard. */
  rearLeg: { top: [225, 975], foot: -488 } as const, frontLeg: { top: [-96, 965], foot: 599 } as const,
  bootL: 110, bootW: 64, bootH: 55,
  pivot: [0, -139, 960] as Vec3, arm: 38, post: 471, collar: 12, sleeve: 49,
  /** Strap loop (stadium in YZ): centres of its end arcs and arc radius, in the resting pendulum frame. */
  strap: { top: 172, bottom: 86, r: 72 },
  handle: { x: 230, start: [285, 1075] as const, elbow: [481, 889] as const, angle: 30, length: 200, grip: 40 },
  knobX: inch(32) / 2,
} as const;
export const SCOUT_SWINGS = [-15, 0, 15, 30, 45, 60] as const;
export function scoutLayout(p: NumericParams) {
  if (!(SCOUT_SWINGS as readonly number[]).includes(p.swing)) throw Error('Unsupported reverse hyper swing angle.');
  const S = SCOUT, load = hyperLoad(p.load).plates, swing = p.swing, P = S.pivot, sw = (v: Vec3) => rotYZ(v, P, -swing);
  const e = new Extent();
  for (const y of [S.rearLeg.foot, S.frontLeg.foot]) e.point([0, y - S.bootL / 2, 0]).point([0, y + S.bootL / 2, 0]);
  e.point([0, -S.padD / 2, S.padTop]).point([0, S.padD / 2, S.padTop]);
  const h = S.handle, a = h.angle * Math.PI / 180, tip: Vec3 = [h.x, h.elbow[0] + h.length * Math.cos(a), h.elbow[1] + h.length * Math.sin(a)];
  e.point([0, tip[1] + (h.grip / 2) * Math.sin(a), 0]);
  // Pendulum: arm end corners, strap arcs and the loaded plates all swing about the pivot.
  const postC = sw([0, P[1], S.post]);
  if (load.length) e.circle(postC, plateRadius(load));
  e.circle(sw([0, P[1], S.strap.top]), S.strap.r).circle(sw([0, P[1], S.strap.bottom]), S.strap.r);
  const shift: Vec3 = [0, -(e.y0 + e.y1) / 2, 0];
  return { S, load, swing, postC, tip, shift, footprint: { width: S.pinWidth, depth: e.y1 - e.y0 } satisfies FloorBox };
}
export const SCOUT_HYPER = defineFloorPart({
  id: 'rogue-westside-scout-hyper', name: 'Westside Scout Hyper', title: 'Westside Barbell Scout Hyper · folding reverse hyper', noun: 'reverse hyper', section: 'Machines',
  description: 'Rogue × Westside Barbell Scout Hyper: folding scissor-leg reverse hyper with round-edge 27.5 × 21.5 in pad, pendulum swing arm with two 5.25 in weight posts and nylon hyper strap. Independent reconstruction from published dimensions and photos; Rogue and Westside Barbell trademarks belong to Rogue Fitness and Westside Barbell.',
  params: [
    { key: 'swing', label: 'Pendulum swing', default: 0, options: SCOUT_SWINGS, format: v => v === 0 ? 'Hanging (0°)' : v > 0 ? `${v}° back` : `${-v}° forward` },
    loadParam(SCOUT.horn, SCOUT.capacity),
  ],
  footprint: p => scoutLayout(p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/westside-scout-hyper', credit: 'Rogue Fitness × Westside Barbell — Scout Hyper', trademark: 'Rogue is a trademark of Rogue Fitness; Westside Barbell and Scout Hyper are trademarks of Westside Barbell.', reconstruction: 'Independent Manifold reconstruction from the published pad size, pad height, 32 in pop-pin width, 38 in length and 5.25 in weight posts, with scissor-leg geometry, pendulum pivot and handle angles scaled from Rogue and Garage Gym Reviews side photos. Tube gauges, hidden cross tubes and the strap drape are estimated; scenery only, excluded from print export.' },
});

// ─── Pendulum reverse hypers (Rogue RH-2, Titan H-PND and Economy H-PND, Rogue Donkey, Bells of Steel Reverse Hammer) ──
/** Pendulum swing arm: pivot (Y, Z), arm tube section [X, Y], arm bottom Z, horn centre Z, loadable horn length per side,
 * sleeve diameter, root collar length; strap loop arcs (centre Z of top/bottom arcs, radius, webbing width). */
export interface Pendulum { pivot: readonly [number, number]; arm: readonly [number, number]; bottom: number; post: number; horn: number; sleeve: number; collar: number; capacity: number; strap: { top: number; bottom: number; r: number; w: number } }
export const RH_SWINGS = [-15, 0, 15, 30, 45, 60] as const;
/** Y extents of everything that swings with a pendulum (plates, strap), so footprints follow the pose. */
function pendulumExtent(e: Extent, P: Pendulum, swing: number, load: readonly PlateId[]) {
  const pv: Vec3 = [0, P.pivot[0], P.pivot[1]], sw = (z: number) => rotYZ([0, P.pivot[0], z], pv, -swing);
  if (load.length) e.circle(sw(P.post), plateRadius(load));
  e.circle(sw(P.strap.top), P.strap.r).circle(sw(P.strap.bottom), P.strap.r);
  return e;
}
const swingParam = { key: 'swing', label: 'Pendulum swing', default: 0, options: RH_SWINGS, format: (v: number) => v === 0 ? 'Hanging (0°)' : v > 0 ? `${v}° back` : `${-v}° forward` } as const;
/** A-frame / tapered-leg reverse hyper: base side rails on rubber feet, two legs per side leaning in to lettered top
 * plates, pad, cross tubes, pendulum, handles (Rogue U-bars with twin uprights, or a Titan telescoping T-beam) and steps. */
export interface RhSpec {
  base: { half: number; railX: number; rail: readonly [number, number]; feet: readonly [number, number]; cross: readonly number[] };
  legs: { section: readonly [number, number]; front: readonly [number, number]; rear: readonly [number, number]; topX: number; topZ: number };
  plate: { y: readonly [number, number]; z: readonly [number, number]; letters: number; cut: boolean; badge?: boolean };
  pad: { w: number; l: number; t: number; y: number; top: number; r: number; e: number; insert?: number };
  pend: Pendulum; holes: boolean; collars: 'spring' | 'axle'; crossBrace?: number;
  handles: { kind: 'rogue'; x: number; z: number; y0: number; uprights: readonly (readonly [number, number, number, number])[]; d: number; grip: number } | { kind: 'titan'; x: number; y0: number; y1: number; z: number; beam: number; gripLen: number; d: number };
  steps: { y: number; z: number; len: number; section: readonly [number, number] };
}
export function rhLayout(spec: RhSpec, p: NumericParams) {
  if (!(RH_SWINGS as readonly number[]).includes(p.swing)) throw Error('Unsupported reverse hyper swing angle.');
  const load = hyperLoad(p.load).plates, e = new Extent(), B = spec.base, h = spec.handles;
  e.point([0, -B.half, 0]).point([0, B.half, 0]);
  if (h.kind === 'rogue') for (const [y0, z0, y1, z1] of h.uprights) { const len = Math.hypot(y1 - y0, z1 - z0), r = (h.d + 6) / 2; e.point([0, y1 + r * Math.abs(z1 - z0) / len, 0]); }
  else e.point([0, h.y1, 0]);
  pendulumExtent(e, spec.pend, p.swing, load);
  return { spec, load, swing: p.swing, shift: [0, -(e.y0 + e.y1) / 2, 0] as Vec3, footprint: { width: 2 * (B.railX + B.rail[0] / 2), depth: e.y1 - e.y0 } satisfies FloorBox };
}
/** Rogue RH-2: published 52.5 × 40 in base, 44.5 in pad height, 3 in pad, 2×3 legs and swing arm, 2×2 base,
 * 1 in handles with 6 in grips, 10.5 in horns. Side-view geometry scaled from Rogue's orthographic product photo. */
export const RH2: RhSpec = {
  base: { half: inch(52.5) / 2, railX: inch(40) / 2 - inch(1), rail: [inch(2), inch(2)], feet: [90, 38], cross: [] },
  legs: { section: [inch(2), inch(3)], front: [426, 202], rear: [-353, -167], topX: inch(24) / 2 - inch(1) - 6, topZ: 960 },
  plate: { y: [-205, 228], z: [943, 1054], letters: 5, cut: true },
  pad: { w: inch(24), l: 585, t: inch(3), y: 72, top: inch(44.5), r: 18, e: 16 },
  pend: { pivot: [-56, 932], arm: [inch(2), inch(3)], bottom: 222, post: 352, horn: inch(10.5), sleeve: 50, collar: 14, capacity: 700, strap: { top: 168, bottom: 92, r: 72, w: 50 } },
  holes: false, collars: 'axle',
  handles: { kind: 'rogue', x: 200, z: 1019, y0: 120, d: inch(1), grip: inch(6), uprights: [[662, 1019, 753, 1217], [517, 1019, 593, 1209]] },
  steps: { y: -330, z: 290, len: 170, section: [110, inch(3)] },
};
export const ROGUE_RH2 = defineFloorPart({
  id: 'rogue-rh-2-reverse-hyper', name: 'Rogue RH-2 Reverse Hyper', title: 'Rogue RH-2 Reverse Hyper', noun: 'reverse hyper', section: 'Machines',
  description: 'Rogue RH-2 freestanding reverse hyper: 2×3 A-frame legs leaning in to ROGUE plates, 3 in cornered pad at 44.5 in, 2×3 swing arm with 10.5 in horns, Spud strap, axle collars, welded rear steps and 1 in multi-grip handles. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [swingParam, loadParam(RH2.pend.horn, RH2.pend.capacity)],
  footprint: p => rhLayout(RH2, p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-reverse-hyper-2', credit: 'Rogue Fitness — RH-2 Rogue Reverse Hyper', trademark: 'Rogue and RH-2 are trademarks of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 52.5 × 40 in footprint, 44.5 in pad height, 3 in pad, 2×3/2×2 tube sizes, 1 in handles with 6 in grips and 10.5 in horns; A-frame, pivot, step and handle positions scaled from Rogue product photos. Pad width and hidden cross tubes estimated; scenery only, excluded from print export.' },
});

/** Titan H-PND: published 44.5 in high, 41 × 52.25 in, 10 in × 49 mm sleeve, 8 × 2 × 2 in steps, 700 lb plate capacity;
 * leg lean, pad size, pivot and handle beams estimated from Titan product photos. */
export const HPND: RhSpec = {
  base: { half: inch(52.25) / 2, railX: inch(41) / 2 - inch(1.5), rail: [inch(3), inch(2)], feet: [70, 8], cross: [-inch(52.25) / 2 + 90, inch(52.25) / 2 - 90] },
  legs: { section: [inch(2), inch(3)], front: [430, 250], rear: [-430, -250], topX: inch(34) / 2 - inch(1) - 6, topZ: 990 },
  plate: { y: [-330, 330], z: [965, 1054], letters: 5, cut: true },
  pad: { w: inch(34), l: 580, t: inch(3), y: 0, top: inch(44.5), r: 20, e: 16 },
  pend: { pivot: [-40, 950], arm: [inch(2), inch(2)], bottom: 205, post: 330, horn: inch(10), sleeve: 49, collar: 14, capacity: 700, strap: { top: 160, bottom: 92, r: 70, w: 50 } },
  holes: true, collars: 'spring', crossBrace: -250,
  handles: { kind: 'titan', x: 150, y0: -60, y1: 720, z: 1005, beam: inch(2), gripLen: 210, d: 32 },
  steps: { y: -330, z: 330, len: inch(8), section: [inch(2), inch(2)] },
};
export const TITAN_HPND = defineFloorPart({
  id: 'titan-h-pnd-reverse-hyper', name: 'Titan H-PND', title: 'Titan H-PND Reverse Hyper', noun: 'reverse hyper', section: 'Machines',
  description: 'Titan Fitness H-PND: bolt-together reverse hyper with tapered side frames under TITAN plates, 44.5 in pad, adjustable-length pendulum with a 10 in × 49 mm plate sleeve, hyper strap, spring collars, rear steps, cross brace and twin telescoping handle beams. Independent reconstruction from published dimensions and photos; Titan trademarks belong to Titan Fitness.',
  params: [swingParam, loadParam(HPND.pend.horn, HPND.pend.capacity)],
  footprint: p => rhLayout(HPND, p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/h-pnd', credit: 'Titan Fitness — H-PND', trademark: 'Titan Fitness and H-PND are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 44.5 in height, 41 × 52.25 in footprint, 10 in × 49 mm sleeve and 8 × 2 × 2 in steps; frame lean, pad size, pivot height and handle beams scaled from Titan product photos and estimated; scenery only, excluded from print export.' },
});
/** Titan Economy H-PND: published 44.5 in high, 55 × 39 in base, 2×2 in tubing, 10 in × 49 mm sleeve, 550 lb rating,
 * eight handle positions. */
export const ECON_HPND: RhSpec = {
  base: { half: inch(55) / 2, railX: inch(39) / 2 - inch(1), rail: [inch(2), inch(2)], feet: [60, 8], cross: [-inch(55) / 2 + 60, inch(55) / 2 - 60] },
  legs: { section: [inch(2), inch(2)], front: [470, 300], rear: [-470, -300], topX: inch(31) / 2 - inch(1), topZ: 1000 },
  plate: { y: [-330, 330], z: [975, 1054], letters: 0, cut: false, badge: true },
  pad: { w: inch(31), l: 560, t: inch(3), y: 0, top: inch(44.5), r: 20, e: 16 },
  pend: { pivot: [-40, 955], arm: [inch(2), inch(2)], bottom: 215, post: 335, horn: inch(10), sleeve: 49, collar: 12, capacity: 550, strap: { top: 165, bottom: 95, r: 70, w: 45 } },
  holes: true, collars: 'spring', crossBrace: -250,
  handles: { kind: 'titan', x: 130, y0: -60, y1: 760, z: 1010, beam: inch(2), gripLen: 200, d: 32 },
  steps: { y: -330, z: 320, len: inch(8), section: [inch(2), inch(2)] },
};
export const TITAN_ECON_HPND = defineFloorPart({
  id: 'titan-economy-h-pnd', name: 'Titan Economy H-PND', title: 'Titan Economy H-PND Reverse Hyper', noun: 'reverse hyper', section: 'Machines',
  description: 'Titan Fitness Economy H-PND: 2×2 in tube reverse hyper with a boxed pad frame, 44.5 in pad, adjustable-length pendulum with a 10 in × 49 mm sleeve, strap, spring collars, rear steps, cross brace and eight-position telescoping handles. Independent reconstruction from published dimensions and photos; Titan trademarks belong to Titan Fitness.',
  params: [swingParam, loadParam(ECON_HPND.pend.horn, ECON_HPND.pend.capacity)],
  footprint: p => rhLayout(ECON_HPND, p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/economy-h-pnd', credit: 'Titan Fitness — Economy H-PND', trademark: 'Titan Fitness and H-PND are trademarks of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 44.5 in height, 55 × 39 in base, 2×2 in tubing and 10 in × 49 mm sleeve; leg lean, pad size, pivot height and handle beams scaled from Titan product photos and estimated; scenery only, excluded from print export.' },
});

// ─── Glute-ham developers (Rogue Abram GHD 2.0, Rogue GH-1, REP GHD) ─────────────────────────
/** GHD layout, +Y toward the footplate. Base: V ("triangular") rails from narrow front to wide rear, or an H of a spine and
 * two cross feet. A front upright carries the chassis beam back to the pad post; the roller post rides the chassis at
 * `stations` (roller axis Y per hole). Humped split hip pad (D-profile along Y, split along X), handle bars along Y. */
export interface GhdSpec {
  base: { kind: 'v'; y0: number; y1: number; front: number; rear: number; rail: readonly [number, number]; cross: readonly number[]; wheels: boolean }
    | { kind: 'h'; y0: number; y1: number; half: number; rail: readonly [number, number]; wheels: boolean };
  front: { y: number; z: number }; chassis: number; post: number;
  pad: { l: number; w: number; h: number; y: number; apex: number; gap: number };
  rollers: { d: number; len: number; z: readonly [number, number]; x0: number };
  footplate: { w: number; h: number; t: number; top: number; dy: number; tread: boolean };
  stations: { y: number; pitch: number; n: number };
  handles: { x: number; y: readonly [number, number]; z: number; d: number };
  quadrant: boolean; step?: { y: number; z: number; w: number; l: number };
}
export const ghdStations = (spec: GhdSpec) => Array.from({ length: spec.stations.n }, (_, i) => i + 1);
export function ghdLayout(spec: GhdSpec, p: NumericParams) {
  if (!ghdStations(spec).includes(p.station)) throw Error('Unsupported GHD roller station.');
  const B = spec.base, rollerY = spec.stations.y + (p.station - 1) * spec.stations.pitch, e = new Extent();
  e.point([0, B.y0, 0]).point([0, B.y1, 0]).point([0, rollerY + spec.footplate.dy + spec.footplate.t, 0]).point([0, spec.handles.y[0], 0]).point([0, spec.handles.y[1], 0]);
  const wheel = B.wheels ? { d: 72, y: B.kind === 'v' ? B.y1 + 20 : B.y0 - 20 } : undefined;
  if (wheel) e.point([0, wheel.y + wheel.d / 2, 0]).point([0, wheel.y - wheel.d / 2, 0]);
  const half = B.kind === 'v' ? B.rear : B.half;
  return { spec, rollerY, wheel, shift: [0, -(e.y0 + e.y1) / 2, 0] as Vec3, footprint: { width: 2 * half, depth: e.y1 - e.y0 } satisfies FloorBox };
}
const stationParam = (spec: GhdSpec, label: string) => ({ key: 'station', label, default: Math.ceil(spec.stations.n / 2), options: ghdStations(spec), format: (v: number) => `Hole ${v} of ${spec.stations.n}` });
/** Rogue GH-1: published 68.5 × 45 in, 43 in pad, 49 in to the footplate top, 2×2 and 2×3 11-gauge, 1 in roller increments. */
export const GH1: GhdSpec = {
  base: { kind: 'v', y0: -inch(68.5) / 2, y1: inch(68.5) / 2, front: 270, rear: inch(45) / 2, rail: [inch(3), inch(2)], cross: [600, -250], wheels: false },
  front: { y: 600, z: 700 }, chassis: 700, post: -250,
  pad: { l: inch(16), w: inch(10.5), h: inch(9), y: -250, apex: inch(43), gap: 22 },
  rollers: { d: inch(5), len: inch(8.5), z: [inch(49) - 115 - inch(8), inch(49) - 115], x0: 32 },
  footplate: { w: 356, h: 440, t: 4.8, top: inch(49), dy: 78, tread: false },
  stations: { y: 250, pitch: inch(1), n: 11 },
  handles: { x: 300, y: [-620, -20], z: 845, d: 32 }, quadrant: false,
};
export const ROGUE_GH1 = defineFloorPart({
  id: 'rogue-gh-1-ghd', name: 'Rogue GH-1 GHD', title: 'Rogue GH-1 Glute Ham Developer', noun: 'glute ham developer', section: 'Machines',
  description: 'Rogue GH-1 GHD: bolt-together triangular base, 2×3 front upright and pad post with gussets, 2×3 chassis with 1 in roller adjustments, split humped hip pad at 43 in, 5 in foam rollers and oversized 3/16 in footplate at 49 in. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [stationParam(GH1, 'Roller position')],
  footprint: p => ghdLayout(GH1, p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-gh-1-ghd', credit: 'Rogue Fitness — GH-1 GHD', trademark: 'Rogue and GH-1 are trademarks of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 68.5 × 45 in footprint, 43 in pad and 49 in footplate heights, 2×2/2×3 tubing and 1 in roller adjustments (Rogue dimension graphic), with post positions, rail splay and pad size scaled from Rogue photos and the Abram GHD 2.0 hip-pad spec; scenery only, excluded from print export.' },
});
/** Rogue Abram GHD 2.0: published 73 × 44.5 in, 2×3 11-gauge, 3/16 in 20 × 14 in footplate, 8 5/8 × 5 in rollers 8 in on
 * centre, 10-slot swing-arm roller assembly, hip pad 16 × 10.5 × 9 in, wheels and handles. */
export const ABRAM: GhdSpec = {
  base: { kind: 'v', y0: -inch(73) / 2, y1: inch(73) / 2 - 20, front: 300, rear: inch(44.5) / 2, rail: [inch(3), inch(2)], cross: [640, -180], wheels: true },
  front: { y: 640, z: 800 }, chassis: 440, post: -180,
  pad: { l: inch(16), w: inch(10.5), h: inch(9), y: -210, apex: 1105, gap: 22 },
  rollers: { d: inch(5), len: inch(8.625), z: [950, 950 + inch(8)], x0: 32 },
  footplate: { w: inch(14), h: inch(20), t: 4.8, top: 1300, dy: 80, tread: false },
  stations: { y: 220, pitch: 20, n: 10 },
  handles: { x: 300, y: [-640, -20], z: 866, d: 32 }, quadrant: true,
};
export const ROGUE_ABRAM_GHD = defineFloorPart({
  id: 'rogue-abram-ghd-2', name: 'Rogue Abram GHD 2.0', title: 'Rogue Abram GHD 2.0', noun: 'glute ham developer', section: 'Machines',
  description: 'Rogue Abram GHD 2.0: 2×3 11-gauge single-piece chassis on a bolt-together triangular base with front wheels, 10-slot swing-arm roller assembly, 20 × 14 in 3/16 in footplate, 8 5/8 × 5 in rollers 8 in on centre and a 16 × 10.5 × 9 in split hip pad. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [stationParam(ABRAM, 'Swing-arm slot')],
  footprint: p => ghdLayout(ABRAM, p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-abram-glute-ham-developer-2-0', credit: 'Rogue Fitness — Abram GHD 2.0', trademark: 'Rogue and Abram are trademarks of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 73 × 44.5 in footprint, 2×3 tubing, 20 × 14 in footplate, 8 5/8 × 5 in rollers on 8 in centres, 10 swing-arm slots and 16 × 10.5 × 9 in hip pad; post positions, chassis height and pad height scaled from Rogue and Garage Gym Reviews photos; scenery only, excluded from print export.' },
});
/** REP GHD: published 70 in long, 36 in wide, 42 in to the top of the pads, 20 × 13 in footplate, 13 adjustment points,
 * bearing carriage on chrome rails, diamond-plate mounting step, rear wheels and band pegs. */
export const REP_GHD_SPEC: GhdSpec = {
  base: { kind: 'h', y0: -inch(70) / 2 + 40, y1: inch(70) / 2, half: inch(36) / 2, rail: [inch(3), inch(2)], wheels: true },
  front: { y: 620, z: 680 }, chassis: 680, post: -470,
  pad: { l: 400, w: 190, h: 205, y: -470, apex: inch(42), gap: 20 },
  rollers: { d: 102, len: 190, z: [880, 1045], x0: 30 },
  footplate: { w: inch(20), h: inch(13), t: 4.8, top: 1135, dy: 70, tread: true },
  stations: { y: 250, pitch: 25, n: 13 },
  handles: { x: 250, y: [-860, -300], z: 850, d: 32 }, quadrant: false,
  step: { y: 60, z: 430, w: 330, l: 240 },
};
export const REP_GHD = defineFloorPart({
  id: 'rep-glute-ham-developer', name: 'REP GHD', title: 'REP Fitness Glute Ham Developer (GHD)', noun: 'glute ham developer', section: 'Machines',
  description: 'REP Fitness GHD: H-base with angled sled feet, rear wheels and band pegs, bearing roller carriage on chrome rails with 13 positions, diamond-plate footplate and mounting step, pleated vinyl rollers with steel end caps and a split humped pad at 42 in. Independent reconstruction from published dimensions and photos; REP trademarks belong to REP Fitness.',
  params: [stationParam(REP_GHD_SPEC, 'Carriage position')],
  footprint: p => ghdLayout(REP_GHD_SPEC, p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'REP Fitness', url: 'https://repfitness.com/products/ghd-glute-ham-developer', credit: 'REP Fitness — Glute Ham Developer', trademark: 'REP and REP Fitness are trademarks of REP Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 70 × 36 in footprint, 42 in pad height, 20 × 13 in footplate and 13 adjustment points; rail heights, post positions, roller size and pad shape scaled from REP product photos and estimated; scenery only, excluded from print export.' },
});

// ─── 45° back hyperextensions (Titan Roman Chair, Body-Solid GHYP345) ─────────────────────
/** 45° hyperextension, +Y toward the pad end. The footplate sits on the −Y cross foot; the telescoping post rises at 45°
 * from the spine so the pad top travels along a line from the footplate centre (the published "footplate to pad" range). */
export interface Hyper45Spec {
  half: number; foot: { y: number; half: number; rail: number }; spine: readonly [number, number]; rail: readonly [number, number];
  rear: { kind: 'arc' | 'fork'; y: number; half: number; r: number };
  footplate: { w: number; l: number; y: number; z: number; lip: number };
  post: { outer: readonly [number, number]; inner: readonly [number, number]; outerLen: number };
  pads: { kind: 'flat' | 'bolster'; w: number; l: number; t: number; gap: number };
  settings: readonly number[]; handles: { x: number; drop: number; reach: number; d: number };
}
export const HYPER45_ANGLE = 45;
/** Footplate (lower edge at y, z; rising away from the pads at 45°): centre, post direction and the pad-top centre for a setting (inches from footplate to pad top). */
export function hyper45Pose(spec: Hyper45Spec, setting: number) {
  const a = HYPER45_ANGLE * Math.PI / 180, fp = spec.footplate, u: Vec3 = [0, Math.cos(a), Math.sin(a)], n: Vec3 = [0, -Math.sin(a), Math.cos(a)];
  const F: Vec3 = [0, fp.y - fp.l / 2 * Math.sin(a), fp.z + fp.l / 2 * Math.cos(a)], D = inch(setting), top: Vec3 = [0, F[1] + D * u[1], F[2] + D * u[2]];
  const drop = spec.pads.t + 16 + spec.post.inner[1] / 2, axis: Vec3 = [0, top[1] + drop * -n[1], top[2] + drop * -n[2]];
  const baseZ = spec.rail[1] + 40, t0 = (baseZ - axis[2]) / u[2], base: Vec3 = [0, axis[1] + t0 * u[1], baseZ];
  return { u, n, F, top, axis, base };
}
export function hyper45Layout(spec: Hyper45Spec, p: NumericParams) {
  if (!spec.settings.includes(p.setting)) throw Error('Unsupported hyperextension pad setting.');
  const width = 2 * Math.max(spec.foot.half, spec.rear.half);
  return { spec, pose: hyper45Pose(spec, p.setting), shift: [0, 0, 0] as Vec3, footprint: { width, depth: 2 * spec.half } satisfies FloorBox };
}
const settingParam = (spec: Hyper45Spec) => ({ key: 'setting', label: 'Footplate to pad', default: spec.settings[Math.floor(spec.settings.length / 2)], options: spec.settings, format: (v: number) => `${v} in` });
/** Titan Roman Chair Back Hyperextension: published 52 × 32 in, 2 in 11-gauge frame, 34–43 in adjustable torso length,
 * two 11.5 × 9 × 2 in pads, 20 × 12.5 in diamond footplate, Y-frame base. */
export const TITAN_RC_SPEC: Hyper45Spec = {
  half: inch(52) / 2, foot: { y: -inch(52) / 2 + inch(1), half: inch(32) / 2, rail: inch(2) }, spine: [-inch(52) / 2 + 30, 330], rail: [inch(2), inch(2)],
  rear: { kind: 'arc', y: 330, half: 330, r: 330 },
  footplate: { w: inch(20), l: inch(12.5), y: -420, z: 60, lip: 30 },
  post: { outer: [inch(2.5), inch(2.5)], inner: [inch(2), inch(2)], outerLen: 520 },
  pads: { kind: 'flat', w: inch(9), l: inch(11.5), t: inch(2), gap: 30 },
  settings: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43], handles: { x: 290, drop: 150, reach: 110, d: 28 },
};
export const TITAN_ROMAN_CHAIR = defineFloorPart({
  id: 'titan-roman-chair-back-hyperextension', name: 'Titan Roman Chair', title: 'Titan Roman Chair Back Hyperextension', noun: 'hyperextension', section: 'Machines',
  description: 'Titan Fitness Roman Chair back hyperextension: Y-frame base with a curved rear arc, 45° telescoping post with screw-knob pop pin (34–43 in torso length), twin 11.5 × 9 in pads, curved grip handles and a 20 × 12.5 in diamond-tread footplate. Independent reconstruction from published dimensions and photos; Titan trademarks belong to Titan Fitness.',
  params: [settingParam(TITAN_RC_SPEC)],
  footprint: p => hyper45Layout(TITAN_RC_SPEC, p).footprint,
  placement: { side: 'right', gap: 500 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/back-hyperextension', credit: 'Titan Fitness — Roman Chair Back Hyperextension', trademark: 'Titan Fitness is a trademark of Titan Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 52 × 32 in footprint, 34–43 in torso adjustment, 11.5 × 9 × 2 in pads, 20 × 12.5 in footplate and 2 in 11-gauge frame; base arc radius, post position and handle bends scaled from Titan photos and estimated; scenery only, excluded from print export.' },
});
/** Body-Solid GHYP345B: published 53 × 29 × 36 in, 2×3 in steel, 3 in DuraFirm pads, 35–44 in footplate to thigh pad. */
export const BODY_SOLID_SPEC: Hyper45Spec = {
  half: inch(53) / 2, foot: { y: -inch(53) / 2 + inch(1.5), half: 250, rail: inch(3) }, spine: [-inch(53) / 2 + 40, 380], rail: [inch(3), inch(2)],
  rear: { kind: 'fork', y: 330, half: inch(29) / 2, r: 200 },
  footplate: { w: 380, l: 300, y: -440, z: 64, lip: 45 },
  post: { outer: [inch(2), inch(3)], inner: [inch(1.75), inch(2.5)], outerLen: 560 },
  pads: { kind: 'bolster', w: 250, l: 150, t: inch(3), gap: 20 },
  settings: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44], handles: { x: 300, drop: 120, reach: 150, d: 30 },
};
export const BODY_SOLID_GHYP345 = defineFloorPart({
  id: 'body-solid-ghyp345-back-hyperextension', name: 'Body-Solid GHYP345B', title: 'Body-Solid 45° Back Hyperextension GHYP345B', noun: 'hyperextension', section: 'Machines',
  description: 'Body-Solid GHYP345B 45° back hyperextension: 2×3 in steel spine with a rear U-fork, 45° telescoping post with pop pin (35–44 in footplate to pad), twin 3 in DuraFirm bolster pads with side grips and an angled diamond-tread footplate with heel lip. Independent reconstruction from published dimensions and photos; Body-Solid trademarks belong to Body-Solid.',
  params: [settingParam(BODY_SOLID_SPEC)],
  footprint: p => hyper45Layout(BODY_SOLID_SPEC, p).footprint,
  placement: { side: 'right', gap: 500 },
  vendor: { vendor: 'Body-Solid', url: 'https://bodysolid.com/body-solid-back-hyperextension', credit: 'Body-Solid — GHYP345B 45° Back Hyperextension', trademark: 'Body-Solid and DuraFirm are trademarks of Body-Solid.', reconstruction: 'Independent Manifold reconstruction from the published 53 × 29 × 36 in size, 2×3 in tubing, 3 in pads and 35–44 in footplate-to-pad range; fork, post position, pad bolster shape and handles scaled from Body-Solid photos and estimated; scenery only, excluded from print export.' },
});

// ─── Reverse hyper + GHD combos (Rogue Donkey, Bells of Steel Reverse Hammer) ─────────────────
/** A reverse-hyper A-frame (RhSpec) with a GHD roller carriage on a base extension toward +Y. */
export interface ComboSpec {
  rh: RhSpec;
  ghd: { front: { y: number; z: number }; chassis: number; from: number; rollers: GhdSpec['rollers']; footplate: GhdSpec['footplate']; stations: GhdSpec['stations']; quadrant: boolean; rails: boolean; sideHandles: boolean };
  wheels: boolean; pad: 'split3' | 'split2'; chain: boolean; rearHandles?: { x: number; y: readonly [number, number]; z: number; d: number };
}
export function comboLayout(spec: ComboSpec, p: NumericParams) {
  const g = spec.ghd;
  if (!Array.from({ length: g.stations.n }, (_, i) => i + 1).includes(p.station)) throw Error('Unsupported roller station.');
  if (!(RH_SWINGS as readonly number[]).includes(p.swing)) throw Error('Unsupported reverse hyper swing angle.');
  const load = hyperLoad(p.load).plates, e = new Extent(), B = spec.rh.base, rollerY = g.stations.y + (p.station - 1) * g.stations.pitch;
  e.point([0, -B.half, 0]).point([0, B.half, 0]).point([0, rollerY + g.footplate.dy + g.footplate.t, 0]);
  if (spec.rearHandles) e.point([0, spec.rearHandles.y[0], 0]);
  const wheel = spec.wheels ? { d: 64, y: B.half + 18 } : undefined;
  if (wheel) e.point([0, wheel.y + wheel.d / 2, 0]);
  pendulumExtent(e, spec.rh.pend, p.swing, load);
  return { spec, load, swing: p.swing, rollerY, wheel, shift: [0, -(e.y0 + e.y1) / 2, 0] as Vec3, footprint: { width: 2 * (B.railX + B.rail[0] / 2), depth: e.y1 - e.y0 } satisfies FloorBox };
}
const comboStation = (spec: ComboSpec, label: string) => ({ key: 'station', label, default: Math.ceil(spec.ghd.stations.n / 2), options: Array.from({ length: spec.ghd.stations.n }, (_, i) => i + 1), format: (v: number) => `Hole ${v} of ${spec.ghd.stations.n}` });
/** Rogue Donkey: published 73 × 44 in, 45 in pad height, 54.5 in at the footplate, 3×3 11-gauge base, 3.5 in pads 34 in
 * across with a removable middle insert, 10 swing-arm settings, 10.5 in horns, diamond footplate with side handles. */
export const DONKEY_SPEC: ComboSpec = {
  rh: {
    base: { half: inch(73) / 2, railX: inch(44) / 2 - inch(1.5), rail: [inch(3), inch(3)], feet: [100, 20], cross: [-inch(73) / 2 + 60, -80, 620] },
    legs: { section: [inch(3), inch(3)], front: [180, 60], rear: [-640, -470], topX: inch(34) / 2 - inch(1.5) - 6, topZ: 1000 },
    plate: { y: [-520, 110], z: [960, 1054], letters: 5, cut: true },
    pad: { w: inch(34), l: 600, t: inch(3.5), y: -200, top: inch(45), r: 30, e: 28, insert: 130 },
    pend: { pivot: [-230, 990], arm: [inch(2), inch(3)], bottom: 250, post: 395, horn: inch(10.5), sleeve: 50, collar: 14, capacity: 700, strap: { top: 185, bottom: 110, r: 72, w: 50 } },
    holes: false, collars: 'axle',
    handles: { kind: 'rogue', x: 0, z: 0, y0: 0, d: 0, grip: 0, uprights: [] },
    steps: { y: -740, z: 300, len: 150, section: [130, inch(3)] },
  },
  ghd: { front: { y: 700, z: 820 }, chassis: 700, from: 150, rollers: { d: inch(5), len: inch(8.625), z: [inch(54.5) - 110 - inch(8), inch(54.5) - 110], x0: 34 }, footplate: { w: inch(20), h: 560, t: 4.8, top: inch(54.5), dy: 85, tread: true }, stations: { y: 360, pitch: 22, n: 10 }, quadrant: true, rails: false, sideHandles: true },
  wheels: false, pad: 'split3', chain: false,
};
export const ROGUE_DONKEY = defineFloorPart({
  id: 'rogue-donkey', name: 'Rogue Donkey', title: 'Rogue Donkey · reverse hyper & GHD', noun: 'hyper', section: 'Machines',
  description: 'Rogue Donkey: Z Hyper-style 3×3 A-frames under ROGUE plates with a 34 in split 3.5 in pad at 45 in, pendulum with 10.5 in horns and Spud strap, plus an extended base carrying a 10-slot swing-arm GHD roller assembly and diamond-tread footplate with built-in side handles; front and rear steps. Independent reconstruction from published dimensions and photos; Rogue trademarks belong to Rogue Fitness.',
  params: [swingParam, loadParam(DONKEY_SPEC.rh.pend.horn, DONKEY_SPEC.rh.pend.capacity), comboStation(DONKEY_SPEC, 'Swing-arm slot')],
  footprint: p => comboLayout(DONKEY_SPEC, p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-donkey', credit: 'Rogue Fitness — Rogue Donkey', trademark: 'Rogue, Donkey and Z Hyper are trademarks of Rogue Fitness.', reconstruction: 'Independent Manifold reconstruction from the published 73 × 44 in footprint, 45 in pad and 54.5 in footplate heights, 3×3 base tubing, 3.5 in × 34 in pads, 10 swing-arm settings and 10.5 in horns; A-frame, pivot, swing-arm and step positions scaled from Rogue product photos; scenery only, excluded from print export.' },
});
/** Bells of Steel Reverse Hammer: no published assembled dimensions; sized from the orthographic side photo (pad top taken
 * as 42 in) and the 69 in base-rail shipping box. Chain-and-belt pendulum, sliding GHD carriage on chrome rods. */
export const REVERSE_HAMMER_SPEC: ComboSpec = {
  rh: {
    base: { half: 875, railX: inch(34) / 2 - inch(1), rail: [inch(2), inch(3)], feet: [80, 8], cross: [-800, -250, 760] },
    legs: { section: [inch(2), inch(3)], front: [178, -110], rear: [-395, -135], topX: inch(26) / 2 - inch(1) - 6, topZ: 990 },
    plate: { y: [-230, -20], z: [930, 985], letters: 0, cut: false },
    pad: { w: inch(26), l: 420, t: 90, y: -198, top: inch(42), r: 26, e: 30, insert: 110 },
    pend: { pivot: [-250, 880], arm: [inch(2), inch(2)], bottom: 400, post: 480, horn: 230, sleeve: 50, collar: 14, capacity: 400, strap: { top: 110, bottom: 60, r: 50, w: 80 } },
    holes: true, collars: 'spring',
    handles: { kind: 'rogue', x: 0, z: 0, y0: 0, d: 0, grip: 0, uprights: [] },
    steps: { y: -430, z: 300, len: 140, section: [90, 40] },
  },
  ghd: { front: { y: 760, z: 390 }, chassis: 390, from: 100, rollers: { d: 108, len: 190, z: [741, 919], x0: 30 }, footplate: { w: 400, h: 400, t: 4.8, top: 1146, dy: 110, tread: true }, stations: { y: 240, pitch: 30, n: 10 }, quadrant: false, rails: true, sideHandles: true },
  wheels: true, pad: 'split3', chain: true, rearHandles: { x: 360, y: [-575, -150], z: 903, d: 32 },
};
export const BOS_REVERSE_HAMMER = defineFloorPart({
  id: 'bells-of-steel-reverse-hammer', name: 'Bells of Steel Reverse Hammer', title: 'Bells of Steel Reverse Hammer · GHD & reverse back extension', noun: 'hyper', section: 'Machines',
  description: 'Bells of Steel Reverse Hammer 2-in-1: A-frame reverse back extension with a three-piece pad (removable crotch pad), chain-and-belt pendulum with a plate horn, diamond-plate steps and side handles, plus a GHD roller carriage sliding on chrome rods over a base extension with front wheels. Independent reconstruction from product photos; Bells of Steel trademarks belong to Bells of Steel.',
  params: [swingParam, loadParam(REVERSE_HAMMER_SPEC.rh.pend.horn, REVERSE_HAMMER_SPEC.rh.pend.capacity), comboStation(REVERSE_HAMMER_SPEC, 'Carriage position')],
  footprint: p => comboLayout(REVERSE_HAMMER_SPEC, p).footprint,
  placement: { side: 'right', gap: 600 },
  vendor: { vendor: 'Bells of Steel', url: 'https://bellsofsteel.us/products/reverse-hammer', credit: 'Bells of Steel — Reverse Hammer 2-in-1 GHD and Reverse Back Extension', trademark: 'Bells of Steel and Reverse Hammer are trademarks of Bells of Steel.', reconstruction: 'Independent Manifold reconstruction scaled from Bells of Steel product photos: assembled dimensions are not published, so the pad top is taken as 42 in and the base rail as the 69 in shipping-box length; tube sizes, pad sections, carriage stations and horn length estimated; scenery only, excluded from print export.' },
});

// ─── Freak Athlete Hyper Pro ─────────────────────────────────────────────────────────────
/** Published: 60 × 22 × 23 in in the flat Nordic setup, 14-gauge base and tubing, 8-gauge footplate, 12 height
 * (shin-length) adjustments, incline in 5° steps, 108 lb. Carriage pivot, strut and roller stations scaled from
 * Gray Matter Lifting side photos at 0°, 20° and 45° and the GHD setup. */
export const HYPER_PRO = {
  width: inch(22), length: inch(60), footplateTop: inch(23),
  base: { h: 76, w: 51, tipY: -680, apexY: -380, spineEnd: 317, rearTipY: 567, rearEnd: 745, capL: 22, wheel: 70, wheelY: -722 },
  pivot: [0, -380, 155] as Vec3,
  /** Carriage (local y along the beam from the pivot, z up) */
  beam: { y0: 175, y1: 1090, z: 150, w: 51, h: 76 }, slide: { y0: -115, y1: 560, z: 40, w: 51 },
  footplate: { y: 20, t: 5, w: 380, z0: -43 },
  rollers: { y: 143, z: [152, 350] as const, d: 128, len: 185, x0: 30 },
  pad: { w: 305, t: 76, main: [238, 798] as const, end: [810, 1110] as const, split: 14 },
  ghd: { lift: 500, dy: 90, beamEnd: 790, pad: [390, 730] as const, h: 150, halfW: 150, gap: 20 },
  strut: { a: [0, 320, 150] as Vec3, b: [0, 430, 30] as Vec3, outer: 280 },
  pitch: 20, positions: 12,
} as const;
export const HYPER_PRO_INCLINES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45] as const;
/** Carriage pose: local (y, z) → design coordinates, for a setup (0 bench, 1 GHD) and incline. */
export function hyperProPose(setup: number, incline: number) {
  const H = HYPER_PRO, F = H.pivot, lift = setup ? H.ghd.lift : 0, dy = setup ? H.ghd.dy : 0, a = (setup ? 0 : incline) * Math.PI / 180;
  const pivot: Vec3 = [0, F[1] + dy, F[2] + lift];
  return { pivot, angle: setup ? 0 : incline, map: (x: number, y: number, z: number): Vec3 => [x, pivot[1] + y * Math.cos(a) - z * Math.sin(a), pivot[2] + y * Math.sin(a) + z * Math.cos(a)] };
}
/** Lowest carriage point for a footplate station, so steep inclines never push the footplate through the floor. */
function hyperProLowest(setup: number, incline: number, station: number) {
  const H = HYPER_PRO, { map } = hyperProPose(setup, incline), s = (station - 1) * H.pitch, fy = H.footplate.y - s;
  return Math.min(...[fy, fy + H.footplate.t].map(y => map(0, y, H.footplate.z0)[2]), ...H.rollers.z.map(z => map(0, H.rollers.y - s, z)[2] - H.rollers.d / 2));
}
export function hyperProStations(p: NumericParams) { return Array.from({ length: HYPER_PRO.positions }, (_, i) => i + 1).filter(n => n === 1 || hyperProLowest(p.setup, p.incline, n) >= 5); }
export function hyperProLayout(p: NumericParams) {
  const H = HYPER_PRO;
  if (![0, 1].includes(p.setup) || !(HYPER_PRO_INCLINES as readonly number[]).includes(p.incline) || (p.setup && p.incline) || !hyperProStations(p).includes(p.station)) throw Error('Unsupported Hyper Pro setting.');
  const pose = hyperProPose(p.setup, p.incline), s = (p.station - 1) * H.pitch, e = new Extent(), B = H.base;
  e.point([0, B.wheelY - B.wheel / 2, 0]).point([0, B.rearEnd + B.capL, 0]);
  const fy = H.footplate.y - s;
  for (const y of [fy, fy + H.footplate.t]) for (const z of [H.footplate.z0, H.footplateTop - H.pivot[2]]) e.point(pose.map(0, y, z));
  for (const z of H.rollers.z) e.circle(pose.map(0, H.rollers.y - s, z), H.rollers.d / 2);
  const strutB = pose.map(0, H.strut.b[1], H.strut.b[2]);
  return { H, pose, s, strutB, shift: [0, -(e.y0 + e.y1) / 2, 0] as Vec3, footprint: { width: H.width, depth: e.y1 - e.y0 } satisfies FloorBox };
}
export const FREAK_HYPER_PRO = defineFloorPart({
  id: 'freak-athlete-hyper-pro', name: 'Freak Athlete Hyper Pro', title: 'Freak Athlete Hyper Pro · Nordic, GHD & back extension', noun: 'hyper', section: 'Machines',
  description: 'Freak Athlete Hyper Pro (formerly Nordic Hyper GHD): tilting carriage on a wheeled arc-and-U base, 8-gauge footplate, XL ankle rollers, split end pad and colour-coded pop pins; flat Nordic bench through 45° back-extension, or raised GHD setup. Independent reconstruction from published dimensions and photos; Freak Athlete trademarks belong to Freak Athlete.',
  params: [
    { key: 'setup', label: 'Setup', default: 0, options: [0, 1], format: v => ['Nordic / back-extension bench', 'GHD (raised, split GHD pad)'][v] ?? String(v) },
    { key: 'incline', label: 'Incline angle', default: 0, options: p => p.setup ? [0] : HYPER_PRO_INCLINES, format: deg },
    { key: 'station', label: 'Roller station', default: 1, options: hyperProStations, format: v => `Hole ${v} of 12` },
  ],
  footprint: p => hyperProLayout(p).footprint,
  placement: { side: 'right', gap: 500 },
  vendor: { vendor: 'Freak Athlete', url: 'https://freakathlete.com/products/hyper-pro', credit: 'Freak Athlete — Hyper Pro', trademark: 'Freak Athlete and Hyper Pro are trademarks of Freak Athlete.', reconstruction: 'Independent Manifold reconstruction from the published 60 × 22 × 23 in flat envelope, 12 roller stations and 5° incline steps. Base arcs, carriage pivot, strut, roller and pad sizes are scaled from review photos (Gray Matter Lifting, Garage Gym Reviews); the GHD lift height and pad shapes are estimated; scenery only, excluded from print export.' },
});

/** Highest-owned first (Gym Radar, Sep 2026): Scout 142, Hyper Pro 128, Abram 34, REP 33, Titan Roman Chair 25, H-PND 24,
 * RH-2 23, Economy H-PND 18, Body-Solid 15, Donkey 15, GH-1 14, Reverse Hammer 14. */
export const PARTS = [SCOUT_HYPER, FREAK_HYPER_PRO, ROGUE_ABRAM_GHD, REP_GHD, TITAN_ROMAN_CHAIR, TITAN_HPND, ROGUE_RH2, TITAN_ECON_HPND, BODY_SOLID_GHYP345, ROGUE_DONKEY, ROGUE_GH1, BOS_REVERSE_HAMMER] as const satisfies readonly FloorPart[];
