/** Rack landmines (#134): Rogue Landmine and Monster Landmine 2.0, Bells of Steel, REP, REP x Kleva Built Adroit and
 * Kleva Built Adroit 2.0. Metadata only (main bundle): never import Manifold builders here. Research:
 * research/rack-dips-landmines.md.
 *
 * Every landmine is described by a pure layout (below) that the builder, the collision bodies and the vertical extent
 * all read, so the three never drift apart. Two kinematic families:
 *  - 'face': the rack pin/axle is normal to the face and the joint turns about it, so the sleeve swings in the plane of
 *    the face (Rogue, Monster 2.0, BOS 5/8 in, Adroit). The joint frame is the source frame rotated about local Y by the
 *    sleeve angle: joint +X runs along the sleeve, joint Y is the source Y. `side` picks which way along the face it
 *    points (0 = toward the viewer's right when facing the mounting face = local -X, 1 = local +X).
 *  - 'out': a horizontal hinge on the bracket lets the sleeve rise straight out of the face (REP, BOS Manticore). The
 *    joint frame has the sleeve along joint +Y from the hinge and is rotated about local X by the sleeve angle. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type FloorParam } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
export type LandmineKinematics = 'face' | 'out';
export interface LandmineLayout {
  kin: LandmineKinematics;
  /** Joint origin in the source frame (the rack pin axis for 'face', the hinge point for 'out'). */
  pivot: Vec3;
  /** Moving joint hardware (clevis, yoke, knobs) as stadiums inscribed in the solids: a segment a→b in the joint plane
   * (x, z for 'face'; y, z for 'out') swept by radius r, over the range w of the unrotated axis (y for 'face', x for
   * 'out'). Their posed bounds never exceed the real solids, whatever the sleeve angle. */
  joint: Capsule[];
  /** Sleeve tube along joint +X ('face') or +Y ('out') from the pivot; `axis` is its offset in the other two axes. */
  sleeve: { start: number; length: number; od: number; id: number; axis: [number, number] };
  /** Static working parts in the source frame (collision bodies): brackets, bosses, magnet puck, T-handles. */
  fixed: LocalBox[];
  /** Pins, knobs and collars in or behind the upright (vertical extent only, never collision bodies). */
  hardware: LocalBox[];
}
const box = (min: Vec3, max: Vec3): LocalBox => ({ min, max });
export interface Capsule { a: [number, number]; b: [number, number]; r: number; w: [number, number] }
const cap = (a: [number, number], b: [number, number], r: number, w: [number, number]): Capsule => ({ a, b, r, w });
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
export const LANDMINE_SIDES = ['Points right (facing the mount)', 'Points left (facing the mount)'] as const;
export const angleLabel = (v: number) => v === 90 ? '90° (upright)' : `${v}°`;
const angleParam = (options: readonly number[], def = 30, format = angleLabel): FloorParam => ({ key: 'angle', label: 'Sleeve angle', default: def, options, format });
const sideParam = (options: FloorParam['options'] = [0, 1]): FloorParam => ({ key: 'side', label: 'Sleeve direction', default: 0, options, format: v => LANDMINE_SIDES[v] ?? String(v) });
// ---- Rogue Landmine (Infinity / Monster Lite, RA0017) ----
/** Published: 10 in 7-gauge sleeve, 5/8 in hardware (5/8 x 6 in hex bolt + nut on 2x3 Infinity; T-handle band peg +
 * 11/16 in shaft collar on 3x3 Monster Lite). Clevis, yoke and sleeve OD estimated from RA0017 photos and the manual. */
export const ROGUE_LM = { sleeve: inch(10), od: 60.3, id: 51.9, axisY: 34, legs: [4, 10, 58, 64], tongueR: 28, base: 58, barrelX: 92, barrelOD: 32, yoke: [72, 130], yokeZ: 40, bar: 6, bolt: inch(5 / 8), hexBolt: inch(6), pegHandle: 100, collar: [inch(1.125), inch(0.5)] } as const;
export const ROGUE_LM_HARDWARE = ['2x3 Infinity · 5/8 x 6 in bolt', '3x3 Monster Lite · band peg + collar'] as const;
function rogueLandmineLayout(p: NumericParams): LandmineLayout {
  const f = face(p), L = ROGUE_LM, [, , , l1] = L.legs, r = L.tongueR;
  const hardware = p.hardware
    ? [box([-L.pegHandle / 2, f + l1 + 8, -L.bolt / 2], [L.pegHandle / 2, f + l1 + 8 + L.bolt, L.bolt / 2]), box([-L.bolt / 2, -f - 25, -L.bolt / 2], [L.bolt / 2, f + l1 + 8, L.bolt / 2]), box([-L.collar[0] / 2, -f - L.collar[1], -L.collar[0] / 2], [L.collar[0] / 2, -f, L.collar[0] / 2])]
    : [box([-14, f + l1, -14], [14, f + l1 + 11, 14]), box([-L.bolt / 2, f + l1 - L.hexBolt, -L.bolt / 2], [L.bolt / 2, f + l1, L.bolt / 2]), box([-14, -f - 14, -14], [14, -f, 14])];
  return {
    kin: 'face', pivot: [0, 0, 0],
    joint: [
      cap([0, 0], [L.base - r, 0], r, [f + L.legs[0], f + l1]),
      cap([(L.yoke[0] + L.yoke[1]) / 2, -L.yokeZ + 29], [(L.yoke[0] + L.yoke[1]) / 2, L.yokeZ - 29], 29, [f + 10, f + 58]),
      cap([L.barrelX, -50], [L.barrelX, 44], 8, [f + L.axisY - 8, f + L.axisY + 8]),
    ],
    sleeve: { start: L.yoke[1], length: L.sleeve, od: L.od, id: L.id, axis: [f + L.axisY, 0] },
    fixed: p.hardware ? [box([-L.pegHandle / 2, f + l1 + 8, -L.bolt / 2], [L.pegHandle / 2, f + l1 + 8 + L.bolt, L.bolt / 2])] : [box([-14, f + l1, -14], [14, f + l1 + 11, 14])],
    hardware,
  };
}
// ---- Rogue Monster Landmine 2.0 (RA1671) ----
/** Published: 2 in ID x 10 in DOM sleeve, 1 in holes on 3x3 Monster only, Monster knurled knob, machined aluminium
 * joint with bronze bushings. Joint block, clevis and spacer sizes estimated from the RA1671 gallery. */
export const MONSTER_LM = { sleeve: inch(10), od: inch(2.5), id: 51.4, axle: inch(1), knob: [inch(2), 32], spacer: [44, 38], washer: 3, block: [70, -32, 64], axisY: 76, collar: [38, 14], cheek: [56, 104, 20, 27], boltX: 92, tongue: [78, 120, 19.5, 18] } as const;
function monsterLandmineLayout(p: NumericParams): LandmineLayout {
  const f = face(p), M = MONSTER_LM, y0 = f + M.spacer[1] + M.washer, y1 = y0 + M.block[0], collarEnd = y1 + M.washer + M.collar[1];
  return {
    kin: 'face', pivot: [0, 0, 0],
    joint: [
      cap([M.block[1] + M.block[0] / 2, 0], [M.block[2] - M.block[0] / 2, 0], M.block[0] / 2, [y0, y1]),
      cap([M.cheek[0] + M.tongue[2], 0], [M.tongue[1] - M.tongue[2], 0], M.tongue[2], [f + M.axisY - M.tongue[3], f + M.axisY + M.tongue[3]]),
    ],
    sleeve: { start: M.tongue[1], length: M.sleeve, od: M.od, id: M.id, axis: [f + M.axisY, 0] },
    fixed: [box([-M.spacer[0] / 2, f, -M.spacer[0] / 2], [M.spacer[0] / 2, f + M.spacer[1], M.spacer[0] / 2]), box([-M.collar[0] / 2, y1, -M.collar[0] / 2], [M.collar[0] / 2, collarEnd, M.collar[0] / 2])],
    hardware: [box([-M.knob[0] / 2, -f - M.knob[1], -M.knob[0] / 2], [M.knob[0] / 2, -f, M.knob[0] / 2])],
  };
}
// ---- Bells of Steel Landmine Rack Attachment (LAN-SIN-RA 5/8 in; LM2-RA-MTC Manticore 1 in, version 2.0) ----
export const BOS_LM_VARIANTS = ['Standard · 5/8 in holes (Hydra, 60 mm)', 'Manticore 2.0 · 1 in holes'] as const;
/** Published: 315 lb, UHMW-lined sleeve, star-knob bar lock; Manticore 2.0 rotates on two axes and locks with a
 * UHMW-protected mag pin. Sleeve 11 in x 2.5 in OD, brackets and hinge sizes estimated from the gallery. */
export const BOS_LM = { sleeve: inch(11), od: inch(2.5), id: 51, liner: 3.2, axisY: 45, legs: [20, 26, 64, 70], tongueR: 24, flange: [40, 100, 24, 30], tab: [55, 150, 30.2, 36.2], boltX: 78, collar: [30, 18], tHandle: 110, knobX: 50,
  mtc: { plate: 7, cheekBack: 32, bracketZ: 42, hingeY: 30, barrel: 32, barrelHalf: 30, ear: [31.5, 37.5], uLegs: [24, 30], uBase: [10, 16], boltY: 45, tongue: [30, 72], magHead: [32, 14], knob: [32, 18] } } as const;
function bosLandmineLayout(p: NumericParams): LandmineLayout {
  const f = face(p), B = BOS_LM;
  if (!p.variant) {
    const [l0, , , l1] = B.legs, knob = B.flange[1] + B.sleeve - B.knobX;
    return {
      kin: 'face', pivot: [0, 0, 0],
      joint: [
        cap([0, 0], [B.flange[0] + 6 - B.tongueR, 0], B.tongueR, [f + l0, f + l1]),
        cap([B.tab[0] + 3, (B.tab[2] + B.tab[3]) / 2], [B.tab[1] - 3, (B.tab[2] + B.tab[3]) / 2], 3, [f + B.axisY - 24, f + B.axisY + 24]),
        cap([knob - 15, B.od / 2 + 17], [knob + 15, B.od / 2 + 17], 7, [f + B.axisY - 15, f + B.axisY + 15]),
      ],
      sleeve: { start: B.flange[1], length: B.sleeve, od: B.od, id: B.id, axis: [f + B.axisY, 0] },
      fixed: [box([-8, f + 86, -B.tHandle / 2], [8, f + 102, B.tHandle / 2]), box([-B.collar[0] / 2, f, -B.collar[0] / 2], [B.collar[0] / 2, f + B.collar[1], B.collar[0] / 2])],
      hardware: [box([-8, -f - 20, -8], [8, f + 102, 8])],
    };
  }
  const m = B.mtc, w = f + m.plate, hinge = f + m.plate + m.hingeY, knobMtc = m.tongue[1] + B.sleeve - B.knobX;
  return {
    kin: 'out', pivot: [0, hinge, 0],
    joint: [
      cap([0, 0], [0, 0], m.barrel / 2, [-m.barrelHalf, m.barrelHalf]),
      cap([m.tongue[0] + 19.5, 0], [m.tongue[1] - 19.5, 0], 19.5, [-20, 20]),
      cap([knobMtc - 15, B.od / 2 + 17], [knobMtc + 15, B.od / 2 + 17], 7, [-15, 15]),
    ],
    sleeve: { start: m.tongue[1], length: B.sleeve, od: B.od, id: B.id, axis: [0, 0] },
    fixed: [box([-w, f, -m.bracketZ], [w, w, m.bracketZ]), box([-w, -m.cheekBack, -m.bracketZ], [-f - 0.5, w, m.bracketZ]), box([f + 0.5, -m.cheekBack, -m.bracketZ], [w, w, m.bracketZ]), box([-m.ear[1], w, -22], [m.ear[1], hinge + 22, 22])],
    hardware: [box([-w - m.knob[1], -m.knob[0] / 2, -m.knob[0] / 2], [w + m.magHead[1], m.knob[0] / 2, m.knob[0] / 2])],
  };
}
// ---- REP Fitness Landmine (PRA-4300 / PRA-5300) ----
export const REP_LM_SERIES = ['4000 Series · 5/8 in pin', '5000/1000 Series · 1 in pin'] as const;
/** REP publishes no dimensions: a bent-strap bracket that turns on a long chrome T-handle pin, with hinge ears and a
 * bolt on top. Everything here is estimated from the four REP photos (the pin and sleeve scaled to the 3 in upright). */
export const REP_LM = { sleeve: inch(11), od: inch(2.5), id: 52, legs: [10, 16, 68, 74], width: 35, legZ: [-24, 50], strap: 6, ear: [33, 39], hinge: [52, 100], earR: 23, rear: 28, washer: [30, 10], tHandle: 110 } as const;
function repLandmineLayout(p: NumericParams): LandmineLayout {
  const f = face(p), R = REP_LM, d = p.series ? inch(1) : inch(5 / 8), top = R.legZ[1] + R.strap, tY = f + R.legs[3] + R.washer[1] + d / 2;
  return {
    kin: 'out', pivot: [0, f + R.hinge[0], R.hinge[1]],
    joint: [cap([0, 0], [0, 0], 7.9, [-R.ear[1] - 6, R.ear[1] + 12]), cap([-R.rear - 6 + R.od / 2, 0], [-R.rear - 6 + R.od / 2, 0], R.od / 2, [-R.od / 2, R.od / 2])],
    sleeve: { start: -R.rear, length: R.sleeve, od: R.od, id: R.id, axis: [0, 0] },
    fixed: [box([-R.width, f + R.legs[0], R.legZ[0]], [R.width, f + R.legs[3], top]), box([-R.ear[1], f + R.hinge[0] - R.earR, top], [R.ear[1], f + R.hinge[0] + R.earR, R.hinge[1] + R.earR]), box([-d / 2, tY - d / 2, -R.tHandle / 2], [d / 2, tY + d / 2, R.tHandle / 2])],
    hardware: [box([-d / 2, -f - 40, -d / 2], [d / 2, tY, d / 2]), box([-R.washer[0] / 2, f + R.legs[3], -R.washer[0] / 2], [R.washer[0] / 2, f + R.legs[3] + R.washer[1], R.washer[0] / 2])],
  };
}
// ---- REP x Kleva Built Adroit Landmine (LM-KB-2000) and Kleva Built Adroit Landmine 2.0 ----
/** REP tech specs (rack-mounted): 11.75 in attachment height, 6.9 in tube, 3.5 in extension from the upright, 2 in
 * tube, 3.56 lb; 5/8 in stud with a removable 1 in adapter sleeve, acetal hand nut, magnetic storage mount. Ball joint,
 * clevis, stem, window slots and magnet puck estimated from the REP and Kleva photos. */
export const ADROIT = { sleeve: inch(6.9), od: 66, id: 58, liner: [58, 51], axisY: 60, stud: inch(5 / 8), adapter: inch(1), nut: [64, 22], boss: [44, 28], cheek: [22, 16, 22], ball: 30, knob: [54, 16], stem: [22, 12, 90], cap: 10, puck: [38, 27], puckZ: 220, height: inch(11.75), extension: inch(3.5) } as const;
export const ADROIT_HARDWARE = ['5/8 in stud', '1 in adapter sleeve'] as const;
/** Magnet puck station above the pivot: the stowed sleeve rests on it just below its top. */
export const adroitPuckHole = (p: NumericParams) => Math.max(2, Math.round(ADROIT.puckZ / (p.mountSpacing ?? 50)));
function adroitLayout(p: NumericParams, magnet: boolean, knob: boolean): LandmineLayout {
  const f = face(p), A = ADROIT, zc = A.cheek[1] + (knob ? A.knob[1] + 6 : 10), puckZ = adroitPuckHole(p) * (p.mountSpacing ?? 50);
  const nut = (z: number) => box([-A.nut[0] / 2, -f - A.nut[1], z - A.nut[0] / 2], [A.nut[0] / 2, -f, z + A.nut[0] / 2]);
  return {
    kin: 'face', pivot: [0, 0, 0],
    joint: [
      cap([0, 0], [0, 0], A.cheek[0], [f + 24, f + A.axisY + A.cheek[2]]),
      cap([A.stem[1] + A.stem[0] / 2, 0], [A.stem[2] - A.stem[0] / 2, 0], A.stem[0] / 2, [f + A.axisY - A.stem[0] / 2, f + A.axisY + A.stem[0] / 2]),
      ...(knob ? [cap([-A.knob[0] / 2 + 8, zc - 8], [A.knob[0] / 2 - 8, zc - 8], 8, [f + A.axisY - A.knob[0] / 2 + 8, f + A.axisY + A.knob[0] / 2 - 8])] : []),
    ],
    sleeve: { start: A.stem[2] + A.cap, length: A.sleeve, od: A.od, id: A.id, axis: [f + A.axisY, 0] },
    fixed: [box([-A.boss[0] / 2, f, -A.boss[0] / 2], [A.boss[0] / 2, f + A.boss[1], A.boss[0] / 2]), ...(magnet ? [box([-A.puck[0] / 2, f, puckZ - A.puck[0] / 2], [A.puck[0] / 2, f + A.puck[1], puckZ + A.puck[0] / 2])] : [])],
    hardware: [nut(0), ...(magnet ? [nut(puckZ)] : [])],
  };
}
export function landmineLayout(id: string, p: NumericParams): LandmineLayout {
  if (id === 'rogue-landmine') return rogueLandmineLayout(p);
  if (id === 'rogue-monster-landmine-2') return monsterLandmineLayout(p);
  if (id === 'bells-of-steel-landmine-rack-attachment') return bosLandmineLayout(p);
  if (id === 'rep-landmine') return repLandmineLayout(p);
  if (id === 'rep-kleva-adroit-landmine') return adroitLayout(p, true, true);
  if (id === 'kleva-adroit-landmine-2') return adroitLayout(p, p.magnet !== 0, false);
  throw Error(`Unknown landmine ${id}.`);
}
// ---- Shared pose math (pure; the builder applies the same transforms to its solids) ----
/** Joint-frame point to the source frame for the entry's kinematics, sleeve angle and side. */
export function jointToSource(l: LandmineLayout, p: NumericParams, [x, y, z]: Vec3): Vec3 {
  const a = (p.angle ?? 30) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  if (l.kin === 'out') return [l.pivot[0] + x, l.pivot[1] + y * c - z * s, l.pivot[2] + y * s + z * c];
  const hand = l.kin === 'face' && p.side === 1 ? 1 : -1;
  return [l.pivot[0] + hand * (x * c - z * s), l.pivot[1] + y, l.pivot[2] + x * s + z * c];
}
/** Posed bounds of a joint stadium: its end points plus the radius in the joint plane, the flat range across it. */
function capsuleBody(l: LandmineLayout, p: NumericParams, c: Capsule): LocalBox {
  const at = (v: [number, number], w: number): Vec3 => jointToSource(l, p, l.kin === 'out' ? [w, v[0], v[1]] : [v[0], w, v[1]]);
  const b = bound([at(c.a, c.w[0]), at(c.b, c.w[1]), at(c.a, c.w[1]), at(c.b, c.w[0])]), plane = l.kin === 'out' ? [1, 2] : [0, 2];
  for (const i of plane) { b.min[i] -= c.r; b.max[i] += c.r; }
  return b;
}
const bound = (points: Vec3[]): LocalBox => ({ min: [0, 1, 2].map(i => Math.min(...points.map(v => v[i]))) as Vec3, max: [0, 1, 2].map(i => Math.max(...points.map(v => v[i]))) as Vec3 });
/** Sleeve split into `segments` boxes that follow the tilted tube (collision bodies). */
function sleeveBodies(l: LandmineLayout, p: NumericParams, segments = 3): LocalBox[] {
  const { start, length, od, axis } = l.sleeve, r = od / 2;
  return Array.from({ length: segments }, (_, i) => {
    const a0 = start + length * i / segments, a1 = start + length * (i + 1) / segments;
    const ring = (a: number): Vec3[] => l.kin === 'out'
      ? [[axis[0] - r, a, axis[1] - r], [axis[0] + r, a, axis[1] + r], [axis[0] - r, a, axis[1] + r], [axis[0] + r, a, axis[1] - r]]
      : [[a, axis[0] - r, axis[1] - r], [a, axis[0] + r, axis[1] + r], [a, axis[0] - r, axis[1] + r], [a, axis[0] + r, axis[1] - r]];
    return bound([...ring(a0), ...ring(a1)].map(v => jointToSource(l, p, v)));
  });
}
export function landmineBodies(id: string, p: NumericParams): LocalBox[] {
  const l = landmineLayout(id, p);
  return [...l.fixed, ...l.joint.map(c => capsuleBody(l, p, c)), ...sleeveBodies(l, p)];
}
/** Conservative posed bounds of a stadium's bounding rectangle (square corners), for the vertical extent. */
function capsuleEnvelope(l: LandmineLayout, p: NumericParams, c: Capsule): LocalBox {
  const u0 = Math.min(c.a[0], c.b[0]) - c.r, u1 = Math.max(c.a[0], c.b[0]) + c.r, v0 = Math.min(c.a[1], c.b[1]) - c.r, v1 = Math.max(c.a[1], c.b[1]) + c.r;
  const at = (u: number, v: number, w: number): Vec3 => jointToSource(l, p, l.kin === 'out' ? [w, u, v] : [u, w, v]);
  return bound([u0, u1].flatMap(u => [v0, v1].flatMap(v => c.w.map(w => at(u, v, w)))));
}
export function landmineExtent(id: string, p: NumericParams) {
  const l = landmineLayout(id, p), all = [...landmineBodies(id, p), ...l.hardware, ...l.joint.map(c => capsuleEnvelope(l, p, c))];
  return { below: Math.ceil(-Math.min(...all.map(b => b.min[2])) + 2), above: Math.ceil(Math.max(...all.map(b => b.max[2])) + 2) };
}
const landmineMount = (id: string, pin: (p: NumericParams) => number, holes?: (p: NumericParams) => number[]) => ({
  pin, ...(holes ? { holes } : {}), extent: (p: NumericParams) => landmineExtent(id, p),
});
const LOW = 115;
const post = (rack: RackDimensions) => [Math.min(rack.tube, rack.tubeDepth ?? rack.tube), Math.max(rack.tube, rack.tubeDepth ?? rack.tube)];
// ---- Entries ----
export const ROGUE_LANDMINE = defineRackPart({
  id: 'rogue-landmine', name: 'Rogue Landmine', title: 'Rogue Landmine (Infinity / Monster Lite)', noun: 'landmine', section: 'Dips & landmines',
  description: 'Rack landmine for Infinity 2x3 and Monster Lite 3x3 uprights · 10 in 7-gauge sleeve · 5/8 in hardware · 315 lb. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'hardware', label: 'Rack & hardware', default: 1, options: [0, 1], format: v => ROGUE_LM_HARDWARE[v] ?? String(v) },
    angleParam([0, 30, 45, 90]), sideParam(),
  ],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/landmines',
    credit: 'Rogue Fitness — Rogue Landmine (RA0017) · Made in USA', trademark: 'Rogue, Infinity and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published 10 in 7-gauge sleeve, 8 lb, 315 lb capacity and the 5/8 in hardware sets from the RA0017 manual (6 in hex bolt and nut for 2x3, band peg and 11/16 in shaft collar for 3x3). Clevis, yoke, hinge bolt and sleeve OD estimated from photos; physical fit unverified.',
  },
  mount: landmineMount('rogue-landmine', () => PIN_5_8IN),
  bodies: p => landmineBodies('rogue-landmine', p),
  pair: { default: false },
  // Rogue: install on the outside face of the upright, low, the sleeve along the side of the rack.
  placement: { height: LOW, face: 'outside' },
  // The 6 in bolt and nut set is for 2x3 Infinity posts; the band peg and collar for 3x3 Monster Lite.
  autoFit: rack => ({ hardware: post(rack)[0] < 74 ? 0 : 1 }),
});
export const ROGUE_MONSTER_LANDMINE = defineRackPart({
  id: 'rogue-monster-landmine-2', name: 'Rogue Monster Landmine 2.0', title: 'Rogue Monster Landmine 2.0', noun: 'landmine', section: 'Dips & landmines',
  description: 'Knob-mounted landmine for 3x3 Monster uprights · 2 in ID x 10 in DOM sleeve · machined aluminium joint with bronze bushings. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [angleParam([0, 30, 45, 90]), sideParam()],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-landmine-2-0',
    credit: 'Rogue Fitness — Monster Landmine 2.0 (RA1671) · Made in USA', trademark: 'Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 2 in ID x 10 in DOM sleeve, 11.56 lb, 1 in axle with the Monster knurled knob, machined aluminium joint, bronze bushings and the finishes (Cerakote joint, MG Black sleeve, matte black knob, spacer, collar and axle). Joint block, clevis and spacer sizes estimated from photos; physical fit unverified.',
  },
  mount: { ...landmineMount('rogue-monster-landmine-2', () => PIN_1IN), validate: rack => { if (post(rack)[0] < 74) throw Error('The Monster Landmine 2.0 fits 3x3 in Monster uprights only.'); } },
  bodies: p => landmineBodies('rogue-monster-landmine-2', p),
  pair: { default: false },
  placement: { height: LOW, face: 'outside' },
});
export const BOS_LANDMINE = defineRackPart({
  id: 'bells-of-steel-landmine-rack-attachment', name: 'Bells of Steel Landmine', title: 'Bells of Steel Landmine Rack Attachment', noun: 'landmine', section: 'Dips & landmines',
  description: 'Pin-on landmine with a UHMW-lined sleeve and star-knob bar lock · 5/8 in version for Hydra and 60 mm racks · Manticore 2.0 version with a 1 in mag pin and a two-axis hinge · 315 lb. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [
    { key: 'variant', label: 'Version', default: 0, options: [0, 1], format: v => BOS_LM_VARIANTS[v] ?? String(v) },
    angleParam([0, 30, 45]),
    sideParam(p => p.variant ? [0] : [0, 1]),
  ],
  vendor: {
    vendor: 'Bells of Steel', url: 'https://www.bellsofsteel.us/products/landmine-power-rack-attachment',
    credit: 'Bells of Steel — Landmine Rack Attachment (LAN-SIN-RA / LM2-RA-MTC)', trademark: 'Bells of Steel, Hydra and Manticore are trademarks of Bells of Steel.',
    reconstruction: 'Published 315 lb capacity, UHMW-lined sleeve, locking star knob, 5/8 in (tubes up to 3 in) and Manticore 1 in versions, the Manticore 2.0 mag pin and two-axis rotation. Sleeve length and OD, brackets, hinges and pins estimated from the gallery; physical fit unverified.',
  },
  mount: {
    ...landmineMount('bells-of-steel-landmine-rack-attachment', p => p.variant ? PIN_1IN : PIN_5_8IN),
    // BOS: the 5/8 in version fits tubes up to 3 in; the Manticore 2.0 bracket wraps a 3x3 post (its mag pin crosses
    // the post through the side holes, checked here against the same bore).
    validate: (rack, p) => {
      if (!p.variant && post(rack)[1] > 77) throw Error('The 5/8 in BOS landmine fits uprights up to 3 in.');
      if (p.variant && post(rack)[0] < 74) throw Error('The Manticore landmine fits 3x3 in uprights only.');
    },
  },
  bodies: p => landmineBodies('bells-of-steel-landmine-rack-attachment', p),
  pair: { default: false },
  placement: p => p.variant ? { height: LOW, face: 'front' } : { height: LOW, face: 'outside' },
  autoFit: rack => ({ variant: rack.holeDiameter < 20 ? 0 : 1 }),
});
export const REP_LANDMINE = defineRackPart({
  id: 'rep-landmine', name: 'REP Landmine', title: 'REP Fitness Landmine', noun: 'landmine', section: 'Dips & landmines',
  description: 'Steel rack landmine on a long T-handle pin · bent-strap bracket with a hinged sleeve · 4000 Series 5/8 in or 5000/1000 Series 1 in pin. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [{ key: 'series', label: 'Series', default: 1, options: [0, 1], format: v => REP_LM_SERIES[v] ?? String(v) }, angleParam([0, 30, 45])],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/power-rack-landmine-attachment',
    credit: 'REP Fitness — Landmine (PRA-4300 / PRA-5300)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'REP publishes the series pin sizes (5/8 in 4000, 1 in 5000/1000) and that it is steel, pin-mounted and not fully articulating. Bracket, hinge ears, pin and sleeve sizes are estimated from the four product photos; physical fit unverified.',
  },
  mount: landmineMount('rep-landmine', p => p.series ? PIN_1IN : PIN_5_8IN),
  bodies: p => landmineBodies('rep-landmine', p),
  pair: { default: false },
  placement: { height: LOW, face: 'front' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 0 : 1 }),
});
const adroitAngles = [0, 30, 45, 90] as const;
export const REP_KLEVA_ADROIT = defineRackPart({
  id: 'rep-kleva-adroit-landmine', name: 'REP x Kleva Built Adroit Landmine', title: 'REP x Kleva Built Adroit Landmine', noun: 'landmine', section: 'Dips & landmines',
  description: 'Rack-mounted articulating landmine · 6.9 in slotted sleeve with a polycarbonate liner on a ball joint · magnetic storage mount · 5/8 in stud with a 1 in adapter · 3.56 lb. Independent reconstruction; REP Fitness and Kleva Built trademarks belong to their owners.',
  params: [
    { key: 'hardware', label: 'Rack holes', default: 1, options: [0, 1], format: v => ADROIT_HARDWARE[v] ?? String(v) },
    angleParam(adroitAngles, 30, v => v === 90 ? '90° (stowed on the magnet)' : `${v}°`), sideParam(),
  ],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/rep-x-kleva-built-adroit-landmine',
    credit: 'REP Fitness x Kleva Built — Adroit Landmine, Rack-Mounted (LM-KB-2000)', trademark: 'REP Fitness is a trademark of REP Fitness; Kleva Built and Adroit are trademarks of Kleva Built Corp.',
    reconstruction: 'Published rack-mounted specs: 11.75 in attachment height, 6.9 in tube, 3.5 in extension from the upright, 2 in tube, 3.56 lb, 5/8 in and 1 in holes, magnetic storage and 360° articulation. Ball joint, clevis, stem, window slots and magnet puck estimated from photos; physical fit unverified.',
  },
  mount: landmineMount('rep-kleva-adroit-landmine', p => p.hardware ? PIN_1IN : PIN_5_8IN, p => [0, adroitPuckHole(p)]),
  bodies: p => landmineBodies('rep-kleva-adroit-landmine', p),
  pair: { default: false },
  placement: { height: LOW, face: 'outside' },
  autoFit: rack => ({ hardware: rack.holeDiameter < 20 ? 0 : 1 }),
});
export const KLEVA_ADROIT_2 = defineRackPart({
  id: 'kleva-adroit-landmine-2', name: 'Kleva Built Adroit Landmine 2.0', title: 'Kleva Built Adroit Landmine 2.0', noun: 'landmine', section: 'Dips & landmines',
  description: 'Hand-assembled articulating landmine · powder-coated sleeve with a polycarbonate liner · spherical and thrust bearings · optional magnet mount · 5/8 in and 1 in holes on 2x2, 2x3 and 3x3. Independent reconstruction; Kleva Built trademarks belong to Kleva Built Corp.',
  params: [
    { key: 'magnet', label: 'Package', default: 1, options: [0, 1], format: v => ['Landmine only', 'Landmine with magnet mount'][v] ?? String(v) },
    { key: 'hardware', label: 'Rack holes', default: 1, options: [0, 1], format: v => ADROIT_HARDWARE[v] ?? String(v) },
    angleParam(adroitAngles, 30, v => v === 90 ? '90° (upright)' : `${v}°`), sideParam(),
  ],
  vendor: {
    vendor: 'Kleva Built', url: 'https://klevabuilt.com/products/adroit-landmine-2-0',
    credit: 'Kleva Built Corp — Adroit Landmine 2.0 · Assembled in Arizona', trademark: 'Kleva Built and Adroit are trademarks of Kleva Built Corp.',
    reconstruction: 'Published: powder-coated steel tube with polycarbonate liner, anodized aluminium and acetal parts, spherical and thrust bearings, acetal hand nut, 1 in adapter sleeve and the optional vertical magnet mount. Sizes follow the REP x Kleva tech specs (6.9 in tube, 3.5 in extension); joint and puck details estimated from photos; physical fit unverified.',
  },
  mount: landmineMount('kleva-adroit-landmine-2', p => p.hardware ? PIN_1IN : PIN_5_8IN, p => p.magnet ? [0, adroitPuckHole(p)] : [0]),
  bodies: p => landmineBodies('kleva-adroit-landmine-2', p),
  pair: { default: false },
  placement: { height: LOW, face: 'outside' },
  autoFit: rack => ({ hardware: rack.holeDiameter < 20 ? 0 : 1 }),
});
