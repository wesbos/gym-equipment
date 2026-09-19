/** Belt squat, calf and tib machines. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 *
 * Each machine has a pure layout function (millimetres, design coordinates, X across, Y floor depth, Z up) shared by
 * its footprint and its builder in ../parts/belt-squat-machines.ts. Loaded plates come from buildPlateStack, so the
 * footprint grows with the plate stack's exact rim (plateStackBox) and the builder shifts everything by `shift` so the
 * bounding box stays centred on the origin. Sources, dimension tables and estimates: ../research/belt-squat-machines.md. */
import { defineFloorPart, type FloorBox, type FloorParam, type FloorPart } from '../floor-part.ts';
import { PLATE_GAP, PLATE_IDS, PLATE_SPECS, plateStackLength, type PlateId } from '../plates.ts';
import type { NumericParams, Vec2, Vec3 } from '../types.ts';
export const inch = (v: number) => v * 25.4;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const named = (names: readonly string[]) => (v: number) => names[v] ?? String(v);
const deg = (v: number) => `${v}°`;
const inches = (v: number) => `${v} in`;

/* ---------------- Plate loading (shared) ---------------- */
const PLATE_BY_CODE = new Map(PLATE_IDS.map(id => [PLATE_SPECS[id].code, id]));
export const plateOf = (p: NumericParams): PlateId => { const id = PLATE_BY_CODE.get(p.plate); if (!id) throw Error('Unsupported plate.'); return id; };
/** Plates of one kind that fit a loadable length (mm). */
export const platesFit = (id: PlateId, capacity: number) => Math.floor((capacity + PLATE_GAP) / (PLATE_SPECS[id].width + PLATE_GAP) + 1e-9);
const plateLabel = (v: number) => { const id = PLATE_BY_CODE.get(v); return id ? `${PLATE_SPECS[id].label} ${PLATE_SPECS[id].style === 'bumper' ? 'bumper' : 'iron'}` : String(v); };
/** `plate` (spec code) and `loaded` (count per horn, limited by the horn's loadable length) params. */
export function plateParams(allowed: readonly PlateId[], plate: PlateId, loaded: number, capacity: number, perHorn = 'Plates per side'): FloorParam[] {
  return [
    { key: 'plate', label: 'Plate', default: PLATE_SPECS[plate].code, options: allowed.map(id => PLATE_SPECS[id].code), format: plateLabel },
    { key: 'loaded', label: perHorn, default: loaded, options: p => range(0, platesFit(plateOf(p), capacity)), format: v => v ? String(v) : 'Empty' },
  ];
}
export const loadedPlates = (p: NumericParams): PlateId[] => Array<PlateId>(p.loaded).fill(plateOf(p));
const IRON: PlateId[] = ['lb45', 'lb35', 'lb25', 'lb10'], BUMPER: PlateId[] = ['kg25', 'kg20', 'kg15', 'kg10'];

/* ---------------- Bounding boxes ---------------- */
export interface Box3 { min: Vec3; max: Vec3 }
export const box3 = (min: Vec3, max: Vec3): Box3 => ({ min: [...min], max: [...max] });
const grow = (b: Box3, p: Vec3, e: Vec3 = [0, 0, 0]) => { for (let i = 0; i < 3; i++) { b.min[i] = Math.min(b.min[i], p[i] - e[i]); b.max[i] = Math.max(b.max[i], p[i] + e[i]); } };
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const discExtent = (a: Vec3, r: number): Vec3 => a.map(v => r * Math.sqrt(Math.max(0, 1 - v * v))) as Vec3;
/** Grow `b` by an Olympic plate stack exactly as parts/plates.ts revolves it: chamfered rim corners and full-radius tread. */
export function plateStackBox(b: Box3, plates: readonly PlateId[], origin: Vec3, axis: Vec3) {
  const a = unit(axis); let off = 0;
  for (const id of plates) {
    const { diameter, width: w, style } = PLATE_SPECS[id], R = diameter / 2;
    const ring: Vec2[] = style === 'bumper' ? [[0, R - 3], [3, R], [w - 3, R], [w, R - 3]] : [[0, R - 2], [2, R], [w - 3, R], [w, R - 3]];
    for (const [t, r] of ring) grow(b, origin.map((v, i) => v + a[i] * (off + t)) as Vec3, discExtent(a, r));
    off += w + PLATE_GAP;
  }
}
/** Grow `b` by a round bar from p to q of diameter d. */
export function rodBox(b: Box3, p: Vec3, q: Vec3, d: number) { const e = discExtent(unit(q.map((v, i) => v - p[i]) as Vec3), d / 2); grow(b, p, e); grow(b, q, e); }
/** Grow `b` by a rectangular tube a→q (w across, h toward `up`), using the same frame as the builder kit's `tube`. */
export function tubeBox(b: Box3, a: Vec3, q: Vec3, w: number, h: number, up: Vec3 = [0, 0, 1]) {
  const cross = (u: Vec3, v: Vec3): Vec3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const z = unit(q.map((v, i) => v - a[i]) as Vec3); let x = cross(up, z);
  if (Math.hypot(...x) < 1e-6) x = cross([0, 1, 0], z);
  x = unit(x); const y = cross(z, x);
  for (const e of [a, q]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) grow(b, e.map((v, i) => v + sx * x[i] * w / 2 + sy * y[i] * h / 2) as Vec3);
}
/** Floor box and centring shift of a design-space bounding box. */
export const footprintOf = (b: Box3): FloorBox => ({ width: b.max[0] - b.min[0], depth: b.max[1] - b.min[1] });
export const shiftOf = (b: Box3): Vec2 => [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2];
const rotYZ = (p: Vec3, pivot: Vec3, degrees: number): Vec3 => {
  const a = degrees * Math.PI / 180, y = p[1] - pivot[1], z = p[2] - pivot[2];
  return [p[0], pivot[1] + y * Math.cos(a) - z * Math.sin(a), pivot[2] + y * Math.sin(a) + z * Math.cos(a)];
};
const dirYZ = (degrees: number, from: Vec3 = [0, 1, 0]): Vec3 => rotYZ(from, [0, 0, 0], degrees);

/* ---------------- Rogue Monster Rhino Belt Squat, Stand Alone ---------------- */
/** Published: 53 × 60.5 in footprint, 78.5 in tower, 7 in platform top, 48.5 × 26 in platform, 15.75 in weight posts,
 * 3×3 in arms/crossmembers, 3×6 in trolley tower. Y is measured from the front foot tips (inches) then centred. */
export const RHINO = { W: inch(53), D: inch(60.5), tower: inch(78.5), deck: inch(7), platW: inch(48.5), platD: inch(26), post: inch(15.75) } as const;
const ry = (y: number) => inch(y) - RHINO.D / 2;
export function rhinoLayout(p: NumericParams) {
  const racked = p.pose === 0;
  const sleeveZ = inch(35.5) + (racked ? 0 : inch(7)), sleeveY = ry(47), flange = inch(3.1);
  const armPivot: Vec3 = [0, ry(39.5), inch(4.5)], armTilt = racked ? 14 : 0;
  const plates = loadedPlates(p), b = box3([-RHINO.W / 2, -RHINO.D / 2, 0], [RHINO.W / 2, RHINO.D / 2, RHINO.tower]);
  for (const s of [-1, 1]) plateStackBox(b, plates, [s * flange, sleeveY, sleeveZ], [s, 0, 0]);
  return { racked, sleeveZ, sleeveY, flange, armPivot, armTilt, plates, box: b, shift: shiftOf(b) };
}
export const ROGUE_RHINO_BELT_SQUAT = defineFloorPart({
  id: 'rogue-monster-rhino-belt-squat', name: 'Rogue Monster Rhino Belt Squat', title: 'Rogue Monster Rhino Belt Squat · Stand Alone', noun: 'belt squat', section: 'Machines',
  description: 'Rogue Monster Rhino Belt Squat, stand-alone (RF0822): diamond-tread platform, fixed Monster uprights, swinging 3×3 handle arms with adjustable loop handles, 3×6 trolley tower with top pulley, loadable weight trolley and the UHMW "rhino horn" hook. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'pose', label: 'Pose', default: 0, options: [0, 1], format: named(['Racked on the rhino horn', 'Squatting · arms back, trolley up']) },
    ...plateParams([...BUMPER, ...IRON], 'kg25', 2, RHINO.post),
  ],
  footprint: p => footprintOf(rhinoLayout(p).box), placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/monster-rhino-belt-squat-stand-alone-mg-black', credit: 'Rogue Fitness — Monster Rhino Belt Squat, Stand Alone (RF0822)', trademark: 'Rogue, Rogue Fitness and Rhino are trademarks of Rogue Fitness.',
    reconstruction: 'Independent Manifold reconstruction from Rogue\'s published 53 × 60.5 in footprint, 78.5 in tower, 7 in platform height, 48.5 × 26 in platform, 15.75 in weight posts and 3×3 / 3×6 in tube sizes, checked against 16 Rogue gallery photos. Upright and arm heights, pivot, trolley, horn and pulley details are estimated from photo proportions; scenery only, excluded from print export.' },
});

/* ---------------- Titan SquatMax-MD ---------------- */
/** Published: 45 W × 41 D in footprint, 59.5 in overall (handle) height, 20 in base height, 33 in deck depth,
 * 16.25 × 21 in centre cut-out, 21 in × 48 mm loading pin, 39 in × 32 mm handles. */
export const SQUATMAX = { W: inch(45), D: inch(41), H: inch(59.5), deck: inch(20), deckW: inch(38), deckD: inch(33), pin: inch(21), pinD: 48, cutX: inch(21), cutY: inch(16.25) } as const;
export function squatMaxLayout(p: NumericParams) {
  const carriage = inch(4.5) + (p.pose ? inch(4) : 0), plateBase = carriage + 6.35;
  const plates = loadedPlates(p), b = box3([-SQUATMAX.W / 2, -SQUATMAX.D / 2, 0], [SQUATMAX.W / 2, SQUATMAX.D / 2, SQUATMAX.H]);
  plateStackBox(b, plates, [0, 0, plateBase], [0, 0, 1]);
  return { carriage, plateBase, plates, box: b, shift: shiftOf(b) };
}
export const TITAN_SQUATMAX_MD = defineFloorPart({
  id: 'titan-squatmax-md', name: 'Titan SquatMax-MD', title: 'Titan SquatMax-MD belt squat', noun: 'belt squat', section: 'Machines',
  description: 'Titan Fitness SquatMax-MD (401933): 20 in raised deck with centre cut-out, splayed legs, vertical 21 in loading pin on a cross carriage and guide rod, two 39 in knurled grab handles, adjustable round seat, front handle and rear wheels. Independent reconstruction; Titan trademarks belong to Titan Fitness.',
  params: [
    { key: 'pose', label: 'Pose', default: 0, options: [0, 1], format: named(['Carriage resting', 'Lifted · standing']) },
    ...plateParams([...IRON, ...BUMPER], 'lb45', 6, SQUATMAX.pin, 'Plates on pin'),
  ],
  footprint: p => footprintOf(squatMaxLayout(p).box), placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/squatmax-md', credit: 'Titan Fitness — SquatMax-MD (401933)', trademark: 'Titan, Titan Fitness and SquatMax are trademarks of Titan Fitness.',
    reconstruction: 'Independent Manifold reconstruction from Titan\'s published 45 × 41 in footprint, 59.5 in height, 20 in base height, 33 in deck, 16.25 × 21 in cut-out, 21 in × 48 mm pin and 39 in × 32 mm handles, checked against 14 Titan gallery photos. Deck width, leg splay, carriage, guide frame and seat post details are estimated; scenery only, excluded from print export.' },
});

/* ---------------- Titan Tibia Dorsi Calf Machine ---------------- */
/** Published: 35.5 W × 15 D × 12 H in, 6.25 in sleeve height, 7 in × 49 mm sleeves, 14 × 4 in footplate, 14 × 7 in pad. */
export const TIBIA = { W: inch(35.5), D: inch(15), H: inch(12), sleeveZ: inch(6.25), sleeve: inch(7), sleeveD: 49, pivot: [0, inch(2.75), inch(10)] as Vec3, sleeveOff: [0, -inch(3.9), -inch(3.75)] as Vec3 } as const;
export function tibiaLayout(p: NumericParams) {
  const tilt = -p.tilt, sleeve = rotYZ([0, TIBIA.pivot[1] + TIBIA.sleeveOff[1], TIBIA.pivot[2] + TIBIA.sleeveOff[2]], TIBIA.pivot, tilt);
  const collar = TIBIA.W / 2 - TIBIA.sleeve, plates = loadedPlates(p), b = box3([-TIBIA.W / 2, -TIBIA.D / 2, 0], [TIBIA.W / 2, TIBIA.D / 2, TIBIA.H]);
  for (const s of [-1, 1]) plateStackBox(b, plates, [s * collar, sleeve[1], sleeve[2]], [s, 0, 0]);
  return { tilt, sleeve, collar, plates, box: b, shift: shiftOf(b) };
}
export const TITAN_TIBIA_DORSI = defineFloorPart({
  id: 'titan-tibia-dorsi-calf-machine', name: 'Titan Tibia Dorsi Calf Machine', title: 'Titan Tibia Dorsi Calf Machine', noun: 'tib machine', section: 'Machines',
  description: 'Titan Fitness Tibia Dorsi Calf Machine (400843): pivoting foot cradle with diamond-plate footplate and thick shin pad on pillow-block bearings, A-frame side stands and 7 in Olympic sleeves for change plates. Independent reconstruction; Titan trademarks belong to Titan Fitness.',
  params: [
    { key: 'tilt', label: 'Toe raise', default: 0, options: [0, 10, 20], format: deg },
    ...plateParams(['lb25', 'lb10'], 'lb25', 1, TIBIA.sleeve),
  ],
  footprint: p => footprintOf(tibiaLayout(p).box), placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/titan-fitness-tibia-dorsi-calf-machine', credit: 'Titan Fitness — Tibia Dorsi Calf Machine (400843)', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.',
    reconstruction: 'Independent Manifold reconstruction from Titan\'s published 35.5 × 15 × 12 in size, 6.25 in sleeve height, 7 in × 49 mm sleeves, 14 × 4 in footplate and 14 × 7 in pad, checked against 10 Titan and 6 owner photos. Stand leg angles, pivot height and cradle plate shapes are estimated; scenery only, excluded from print export.' },
});

/* ---------------- DIY belt squat (typical home build) ---------------- */
/** Split lumber platform (two 18 × 30 in boxes, 12 in tall, 9 in gap) and a doubled-2×6 lever hinged behind it, chain
 * under the hips and a 2 in pipe loading horn beyond the front, resting on a fold-down leg. */
export const DIY_BELT = { boxW: inch(18), boxD: inch(30), boxH: inch(12), gap: inch(9), pivot: [0, inch(24), inch(4)] as Vec3, arm: inch(48), tail: inch(3), leverW: inch(3), leverH: inch(5.5), horn: inch(12), restZ: 232, lift: 12 } as const;
export function diyBeltLayout(p: NumericParams) {
  const { pivot, arm, tail, leverW, leverH } = DIY_BELT, rest = Math.asin((DIY_BELT.restZ - pivot[2]) / arm) * 180 / Math.PI;
  const angle = rest + (p.pose ? DIY_BELT.lift : 0), dir = rotYZ([0, -1, 0], [0, 0, 0], -angle);
  const at = (t: number): Vec3 => [0, pivot[1] + dir[1] * t, pivot[2] + dir[2] * t];
  const horn = at(arm), up: Vec3 = rotYZ([0, 0, 1], [0, 0, 0], -angle), washer = leverW / 2 + inch(.25), plates = loadedPlates(p);
  const b = box3([-DIY_BELT.gap / 2 - DIY_BELT.boxW, -DIY_BELT.boxD / 2, 0], [DIY_BELT.gap / 2 + DIY_BELT.boxW, inch(29), DIY_BELT.boxH + inch(.75)]);
  // Lever end faces (the box corners of the doubled 2×6), horn pipe and fold-down leg foot.
  tubeBox(b, at(-inch(2)), at(arm + tail), leverW, leverH, up);
  rodBox(b, [-DIY_BELT.horn, horn[1], horn[2]], [DIY_BELT.horn, horn[1], horn[2]], 48.3);
  if (!p.pose) grow(b, [0, horn[1] - inch(2.5), 0]);
  for (const s of [-1, 1]) plateStackBox(b, plates, [s * washer, horn[1], horn[2]], [s, 0, 0]);
  return { angle, dir, up, at, horn, washer, plates, box: b, shift: shiftOf(b) };
}
export const DIY_BELT_SQUAT = defineFloorPart({
  id: 'diy-belt-squat', name: 'DIY belt squat', title: 'Belt squat · DIY lever and split platform', noun: 'belt squat', section: 'Machines',
  description: 'Typical home-built belt squat: two lumber platform boxes with rubber-mat tops and a centre gap, a doubled 2×6 lever on a steel hinge behind them, chain and carabiner under the hips and a 2 in pipe loading horn out front on a fold-down rest leg. Independent reconstruction of a common DIY build; no brand.',
  params: [
    { key: 'pose', label: 'Pose', default: 0, options: [0, 1], format: named(['Resting on the leg', 'Lifted · standing']) },
    ...plateParams([...IRON, ...BUMPER], 'lb45', 2, DIY_BELT.horn - inch(1.75)),
  ],
  footprint: p => footprintOf(diyBeltLayout(p).box), placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'DIY (typical home build)', url: 'https://gymradar.com/equipment/belt-squat-custom-diy', credit: 'Gym Radar — Belt Squat, Custom/DIY (owner builds)', trademark: 'Generic DIY build; no trademarks apply.',
    reconstruction: 'Representative build synthesised from the Gym Radar Custom/DIY belt squat owner photos (split 2×-lumber platforms with a centre chain gap, wooden levers with a pipe loading pin): 18 × 30 × 12 in boxes, 9 in gap, 48 in lever to the horn and 12 in horn arms are chosen typical sizes, not a published design; scenery only, excluded from print export.' },
});

/* ---------------- The Tib Bar Guy · Tib Bar Pro ---------------- */
/** No published dimensions: 2 in Olympic loading bar, 150 lb rating. Sizes estimated from photos (see research). */
export const TIB_PRO = { bar: inch(14), padD: 57, barD: 32, rear: inch(4.5), elev: 62, stem: 95, flange: 6, flangeD: 89, load: inch(8), loadD: 50.8, clampD: 82, clampW: 40, capacity: 160 } as const;
export function tibProLayout(p: NumericParams) {
  const r = TIB_PRO.padD / 2, a = dirYZ(TIB_PRO.elev), base: Vec3 = [0, 0, r];
  const at = (t: number): Vec3 => [0, base[1] + a[1] * t, base[2] + a[2] * t];
  const loadStart = TIB_PRO.stem + TIB_PRO.flange, plates = loadedPlates(p), stackEnd = loadStart + (plates.length ? plateStackLength(plates) + PLATE_GAP : 0);
  const b = box3([-TIB_PRO.bar / 2 - 3, -r, 0], [TIB_PRO.bar / 2 + 3, TIB_PRO.rear + r, TIB_PRO.padD]);
  rodBox(b, at(0), at(TIB_PRO.stem), 38); rodBox(b, at(TIB_PRO.stem), at(loadStart), TIB_PRO.flangeD);
  rodBox(b, at(loadStart), at(loadStart + TIB_PRO.load), TIB_PRO.loadD); rodBox(b, at(stackEnd), at(stackEnd + TIB_PRO.clampW), TIB_PRO.clampD);
  plateStackBox(b, plates, at(loadStart), a);
  return { a, at, loadStart, stackEnd, plates, box: b, shift: shiftOf(b) };
}
export const TIB_BAR_PRO = defineFloorPart({
  id: 'tib-bar-guy-tib-bar-pro', name: 'Tib Bar Pro', title: 'The Tib Bar Guy Tib Bar Pro', noun: 'tib bar', section: 'Machines',
  description: 'The Tib Bar Guy (APEX Fitness) Tib Bar Pro: steel T-frame with two foam-padded foot bars, flanged stem with the screw-in stainless 2 in loading bar and the branded weight clamp, resting on its pads. Independent reconstruction; The Tib Bar Guy and APEX trademarks belong to APEX Fitness.',
  params: plateParams(['lb25', 'lb10'], 'lb25', 1, TIB_PRO.capacity, 'Plates loaded'),
  footprint: p => footprintOf(tibProLayout(p).box), placement: { side: 'front', gap: 300 },
  vendor: { vendor: 'APEX Fitness (The Tib Bar Guy)', url: 'https://www.apexfitness.com/products/the-tib-bar-pro', credit: 'The Tib Bar Guy / APEX Fitness — Tib Bar Pro', trademark: 'The Tib Bar Guy, Tib Bar Pro and APEX are trademarks of APEX Fitness.',
    reconstruction: 'Independent Manifold reconstruction from 10 manufacturer and 3 owner photos. Only the 2 in Olympic loading bar and 150 lb rating are published; the 14 in foot bars, 57 mm pads, 4.5 in bar spacing, stem angle and 8 in loading bar are estimated from photo proportions; scenery only, excluded from print export.' },
});

/* ---------------- Titan Single Leg Squat Roller ---------------- */
/** Published: 24 W × 22 D × 26 H in, 12–25 in roller height in 12 positions, 16 × 4 in roller, 2 in 11-gauge tube. */
export const SLSR = { W: inch(24), D: inch(22), H: inch(26), roller: inch(16), rollerD: inch(4), tube: inch(2), heights: range(12, 23) } as const;
export const TITAN_SINGLE_LEG_SQUAT_ROLLER = defineFloorPart({
  id: 'titan-single-leg-squat-roller', name: 'Titan Single Leg Squat Roller', title: 'Titan Single Leg Squat Roller', noun: 'squat roller', section: 'Machines',
  description: 'Titan Fitness Single Leg Squat Roller (401479): bolt-together 2 in steel stand with H feet, gusset, 12-position sliding roller carriages and a 16 × 4 in HeftyGrip vinyl roller pad for Bulgarian split squats. Independent reconstruction; Titan trademarks belong to Titan Fitness.',
  params: [{ key: 'height', label: 'Roller centre height', default: 18, options: SLSR.heights, format: v => `${v} in (top ${v + 2} in)` }],
  footprint: { width: SLSR.W, depth: SLSR.D }, placement: { side: 'front', gap: 300 },
  vendor: { vendor: 'Titan Fitness', url: 'https://titan.fitness/products/single-leg-squat-roller', credit: 'Titan Fitness — Single Leg Squat Roller (401479)', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.',
    reconstruction: 'Independent Manifold reconstruction from Titan\'s published 24 × 22 × 26 in size, 16 × 4 in roller, 2 in tube and 12 positions spanning 12–25 in (read here as 12–23 in roller centre, 14–25 in roller top), checked against 10 Titan photos. Gusset, carriage and cap shapes are estimated; scenery only, excluded from print export.' },
});

/* ---------------- Bells of Steel Belt Squat Machine ---------------- */
/** Published: 81 in widest (pegs horizontal) / 52.5 in narrowest (pegs vertical) × 51 in, 40 in tall, 13.5 in pegs. */
export const BOS = { D: inch(51), H: inch(40), wide: inch(81), narrow: inch(52.5), peg: inch(13.5), pegD: 50, pivot: [0, inch(21.2), inch(19)] as Vec3, reach: inch(33.5) } as const;
export function bosLayout(p: NumericParams) {
  const angle = p.pose ? -8 : 7, tip = rotYZ([0, BOS.pivot[1] - BOS.reach, BOS.pivot[2]], BOS.pivot, -angle);
  const rot = (q: Vec3) => rotYZ(q, BOS.pivot, -angle), vertical = p.horns === 1, up = dirYZ(-angle, [0, 0, 1]);
  const bracketX = BOS.narrow / 2 - inch(1.3), plates = loadedPlates(p);
  const b = box3([-BOS.narrow / 2, -BOS.D / 2, 0], [BOS.narrow / 2, BOS.D / 2, BOS.H]);
  /** Horn root: bracket outer face (horizontal pegs) or bracket top (vertical pegs), crossbar centre 1.5 in below. */
  const hornBase = (s: number): Vec3 => vertical ? rot([s * bracketX, BOS.pivot[1] - BOS.reach, BOS.pivot[2] + inch(1.5)]) : [s * BOS.narrow / 2, tip[1], tip[2]];
  const hornAxis = (s: number): Vec3 => vertical ? up : [s, 0, 0];
  for (const s of [-1, 1]) {
    const base = hornBase(s), a = hornAxis(s), end = base.map((v, i) => v + a[i] * (inch(.5) + BOS.peg + inch(.25))) as Vec3;
    rodBox(b, base, end, BOS.pegD); if (!vertical) rodBox(b, base, [s * (BOS.narrow / 2 + inch(.5)), tip[1], tip[2]], inch(2.6));
    plateStackBox(b, plates, base.map((v, i) => v + a[i] * inch(.5)) as Vec3, a);
  }
  return { angle, tip, rot, vertical, up, bracketX, hornBase, hornAxis, plates, box: b, shift: shiftOf(b) };
}
export const BOS_BELT_SQUAT = defineFloorPart({
  id: 'bells-of-steel-belt-squat-machine', name: 'Bells of Steel Belt Squat', title: 'Bells of Steel Belt Squat Machine', noun: 'belt squat', section: 'Machines',
  description: 'Bells of Steel Belt Squat Machine 2.0: steel platform and rear tower, twin lever arms on green Zerk pillow-block bearings with a 52.5 in horn crossbar, 13.5 in weight pegs mounted horizontal or vertical, pivoting uprights with 13 height holes and a top grab bar, chain and band pegs. Independent reconstruction; Bells of Steel trademarks belong to Bells of Steel.',
  params: [
    { key: 'horns', label: 'Weight pegs', default: 0, options: [0, 1], format: named(['Horizontal (81 in wide)', 'Vertical (52.5 in wide)']) },
    { key: 'pose', label: 'Lever', default: 0, options: [0, 1], format: named(['Resting on the stop', 'Bottom of the squat']) },
    ...plateParams([...IRON, ...BUMPER], 'lb45', 3, BOS.peg),
  ],
  footprint: p => footprintOf(bosLayout(p).box), placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'Bells of Steel', url: 'https://www.bellsofsteel.us/products/belt-squat-machine', credit: 'Bells of Steel — Belt Squat Machine 2.0 (BQT-MA)', trademark: 'Bells of Steel is a trademark of Bells of Steel.',
    reconstruction: 'Independent Manifold reconstruction from Bells of Steel\'s published 81 / 52.5 × 51 × 40 in size and 13.5 in pegs, checked against 10 Bells of Steel and 2 owner photos. Platform size, lever pivot height, arm spacing, upright positions and bearing details are estimated from photo proportions; scenery only, excluded from print export.' },
});

/* ---------------- APEX Barrett Belt Squat ---------------- */
/** Published: 31 L × 19.5 W × 26 H in, 15.5 in × 2 in loading bar, 19.5 in × 1.25 in handle, 9 handle heights, 16 in kickstand. */
export const BARRETT = { L: inch(31), W: inch(19.5), H: inch(26), bar: inch(15.5), barD: inch(2), beamZ: inch(5), barY: inch(6), levels: range(1, 9),
  ezA: [0, -inch(9), inch(5)] as Vec3, ezB: [0, -inch(14.95), inch(1.2)] as Vec3, ez: inch(2) } as const;
export function barrettLayout(p: NumericParams) {
  const barBase = BARRETT.beamZ + inch(5.5), plates = loadedPlates(p);
  const b = box3([-BARRETT.W / 2, -BARRETT.L / 2 + inch(1), 0], [BARRETT.W / 2, BARRETT.L / 2, BARRETT.H + inch(p.handle - 5)]);
  tubeBox(b, BARRETT.ezA, BARRETT.ezB, BARRETT.ez, BARRETT.ez);
  plateStackBox(b, plates, [0, BARRETT.barY, barBase], [0, 0, 1]);
  return { barBase, plates, box: b, shift: shiftOf(b) };
}
export const APEX_BARRETT_BELT_SQUAT = defineFloorPart({
  id: 'apex-barrett-belt-squat', name: 'APEX Barrett Belt Squat', title: 'APEX Barrett Belt Squat attachment', noun: 'belt squat', section: 'Machines',
  description: 'APEX Fitness (The Tib Bar Guy) Barrett Belt Squat: bench-spine attachment with stainless mounting tongue, chrome 15.5 in loading bar on a rubber bumper, adjustable knurled T-handle, spring kickstand and EZ-clip belt hook-up, standing on its kickstand as when mounted on an APEX Adjustable Bench. Independent reconstruction; APEX trademarks belong to APEX Fitness.',
  params: [
    { key: 'handle', label: 'Handle height', default: 5, options: BARRETT.levels, format: v => `Level ${v}` },
    ...plateParams([...BUMPER, ...IRON], 'kg20', 2, BARRETT.bar, 'Plates loaded'),
  ],
  footprint: p => footprintOf(barrettLayout(p).box), placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'APEX Fitness', url: 'https://www.apexfitness.com/products/apex-barrett-belt-squat-machine', credit: 'APEX Fitness (The Tib Bar Guy) — APEX Barrett Belt Squat', trademark: 'APEX, Barrett and The Tib Bar Guy are trademarks of APEX Fitness.',
    reconstruction: 'Independent Manifold reconstruction from APEX\'s published spec card (31 × 19.5 × 26 in, 15.5 × 2 in loading bar, 19.5 × 1.25 in handle, 9 heights, 16 in kickstand, 66 in lever with the bench), checked against 8 pre-production renders and 1 owner photo. Beam height, bracket plates and the handle height steps are estimated; the bench itself is the separate APEX Adjustable Bench entry; scenery only, excluded from print export.' },
});

/* ---------------- DIY seal row bench (typical home build) ---------------- */
/** A 2×10 plank wrapped in a black mat with tape bands, across two folding plastic sawhorses. */
export const DIY_SEAL = { plankW: inch(9.25), plankT: inch(1.5), wrap: 5, horseL: inch(27), splay: inch(10), heights: [30, 33, 36], lengths: [60, 72, 96] } as const;
export function diySealLayout(p: NumericParams) {
  const L = inch(p.length), top = inch(p.height), horseTop = top - DIY_SEAL.plankT - 2 * DIY_SEAL.wrap, horseX = L / 2 - inch(8);
  const halfX = Math.max(L / 2 + DIY_SEAL.wrap, horseX + DIY_SEAL.splay + inch(1.25));
  const b = box3([-halfX, -DIY_SEAL.horseL / 2, 0], [halfX, DIY_SEAL.horseL / 2, top]);
  return { L, top, horseTop, horseX, box: b, shift: shiftOf(b) };
}
export const DIY_SEAL_ROW_BENCH = defineFloorPart({
  id: 'diy-seal-row-bench', name: 'DIY seal row bench', title: 'Seal row bench · DIY plank on sawhorses', noun: 'bench', section: 'Machines',
  description: 'Typical home-built seal row bench: a 2×10 plank wrapped in a black exercise mat and electrical tape, laid across two folding plastic sawhorses at pulling height. Independent reconstruction of a common DIY build; no brand.',
  params: [
    { key: 'height', label: 'Pad height', default: 33, options: DIY_SEAL.heights, format: inches },
    { key: 'length', label: 'Plank length', default: 72, options: DIY_SEAL.lengths, format: inches },
  ],
  footprint: p => footprintOf(diySealLayout(p).box), placement: { side: 'right', gap: 300 },
  vendor: { vendor: 'DIY (typical home build)', url: 'https://gymradar.com/equipment/seal-row-bench-custom-diy', credit: 'Gym Radar — Seal Row Bench, Custom/DIY (owner builds)', trademark: 'Generic DIY build; no trademarks apply.',
    reconstruction: 'Representative build synthesised from the Gym Radar Custom/DIY seal row bench owner photos and review (a 6 ft 2×10 on two 500 lb folding sawhorses, yoga mat and electrical tape): plank, mat and sawhorse proportions are typical retail sizes, not a published design; scenery only, excluded from print export.' },
});

export const PARTS = [
  ROGUE_RHINO_BELT_SQUAT, TITAN_SQUATMAX_MD, TITAN_TIBIA_DORSI, DIY_BELT_SQUAT, TIB_BAR_PRO, TITAN_SINGLE_LEG_SQUAT_ROLLER, BOS_BELT_SQUAT, APEX_BARRETT_BELT_SQUAT, DIY_SEAL_ROW_BENCH,
] as const satisfies readonly FloorPart[];
