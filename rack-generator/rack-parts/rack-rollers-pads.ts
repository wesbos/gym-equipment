/** Leg rollers, seats and pads that mount on the rack (#132). Metadata only (main bundle): never import Manifold builders here.
 * Builders: parts/rack-rollers-pads.ts. Research, sources and every estimate: research/rack-rollers-pads.md.
 * Frame (rack-part.ts): origin on the upright centreline at the target hole axis, +Y out of the mounting face
 * (face at y = upright / 2), X across the face, Z up. Layout helpers below are shared by the builders, the collision
 * bodies and the extents so the three always agree. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type RackPart } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions, Vec3 } from '../types.ts';
export const inch = (v: number) => v * 25.4;
const faceOf = (p: NumericParams) => (p.upright ?? 75) / 2;
const pitchOf = (p: NumericParams) => p.mountSpacing ?? 50;
const box = (min: Vec3, max: Vec3): LocalBox => ({ min, max });
const DESCRIPTION_END = (brand: string) => `Independent reconstruction; ${brand} trademarks belong to ${brand}.`;
/** Every product here is sold for square 3 x 3 in uprights (the 75 mm BOS tube is the nearest stand-in); 2x2 and 2x3 posts are refused. */
const threeByThree = (noun: string) => (rack: RackDimensions) => {
  if (rack.tube < 74 || rack.tube > 77.5 || Math.abs((rack.tubeDepth ?? rack.tube) - rack.tube) > .01) throw Error(`The ${noun} only fits 3 x 3 in uprights.`);
};

// ───────────────────────────── Single-pin leg rollers ─────────────────────────────

/** REP Leg Roller 2.0 (PRA-5713), repfitness.com/products/leg-roller-2-0. Published: 21.74 in un-installed, 18.04 in
 * extension from the upright, 15.08 in x 5.65 in pad, 1 in holes. The stack along +Y from the face is estimated from photos. */
export const REP_LR2 = {
  total: inch(21.74), extension: inch(18.04), pad: inch(15.08), padDiameter: inch(5.65), shaft: 25.4,
  /** Nickel shoulder collar against the face, then the pad hub. */ shoulder: [38, 26] as const, hub: [58, 14] as const,
  /** Knurled black e-coat securing knob on the far face; the threaded stud ends flush with it on a 3 in tube. */ knob: [52, inch(21.74) - inch(18.04) - inch(3)] as const,
} as const;
export function repLr2(p: NumericParams) {
  const face = faceOf(p), pad0 = face + REP_LR2.shoulder[1] + REP_LR2.hub[1], pad1 = pad0 + REP_LR2.pad, tip = face + REP_LR2.extension;
  return { face, pad0, pad1, tip, knob0: -face - REP_LR2.knob[1] };
}
/** Rogue Monster Single Leg Roller 2.0 (RA1670). Published: 22 in total, 16 in x 4.25 in pad, 1 in steel threaded rod,
 * two machined set-screw collars and a knurled screw-on nut. Collar and nut sizes estimated. */
export const ROGUE_SLR2 = { total: inch(22), pad: inch(16), padDiameter: inch(4.25), rod: 25.4, collar: [50.8, 20] as const, nut: [63.5, 25.4] as const, tipPastCollar: 6 } as const;
export function rogueSlr2(p: NumericParams) {
  const face = faceOf(p), pad0 = face + ROGUE_SLR2.collar[1], pad1 = pad0 + ROGUE_SLR2.pad, tip = pad1 + ROGUE_SLR2.collar[1] + ROGUE_SLR2.tipPastCollar;
  return { face, pad0, pad1, tip, nut0: -face - ROGUE_SLR2.nut[1] };
}
/** Rogue Monster Lite Rack Mount Leg Roller (RA0725). Published: 17.75 in overall, 13 in x 5 in pad, 0.625 in detent
 * pin. Hanger plate, top pin and lower wrap channel estimated from the five studio photos. */
export const ROGUE_ML_ROLLER = {
  overall: inch(17.75), pad: inch(13), padDiameter: inch(5), rod: 22, plate: [76.2, 6.35] as const, plateTop: 30, shaftZ: -78,
  /** Exposed shaft, then a bright collar, the pad, an outer collar and the rod end, from the plate front. */ standoff: 40, collar: [50, 20] as const,
  pin: inch(0.625), channelDepth: 42, detentDrop: 150,
} as const;
export function rogueMlRoller(p: NumericParams) {
  const face = faceOf(p), pitch = pitchOf(p), plate1 = face + ROGUE_ML_ROLLER.plate[1];
  const pad0 = plate1 + ROGUE_ML_ROLLER.standoff + ROGUE_ML_ROLLER.collar[1], pad1 = pad0 + ROGUE_ML_ROLLER.pad, tip = face + ROGUE_ML_ROLLER.overall;
  // The orange detent pin runs across through the channel and the upright's side holes, whole stations below the top pin.
  const detentZ = -Math.max(1, Math.round(ROGUE_ML_ROLLER.detentDrop / pitch)) * pitch;
  return { face, plate1, pad0, pad1, tip, detentZ, bottom: detentZ - 32 };
}
/** Bells of Steel Split Squat Leg Roller rack attachment (BSS2-RA-HDR Hydra, SSQ2-RA-MTC Manticore). Published: 4 in pad
 * diameter, 16 in pad, 22-3/4 in total. Open bracket, zinc bushings and the chrome star knob estimated from photos. */
export const BOS_ROLLER = { total: inch(22.75), pad: inch(16), padDiameter: inch(4), bracket: [90, 5, 34] as const, bushing: [44, 22] as const, standoff: 14, knob: [72, 24] as const, stub: 10 } as const;
export const BOS_HARDWARE = ['Hydra · 3 x 3 in, 5/8 in holes', 'Manticore · 3 x 3 in, 1 in holes'] as const;
export function bosRoller(p: NumericParams) {
  const face = faceOf(p), plate1 = face + BOS_ROLLER.bracket[1], pad0 = plate1 + BOS_ROLLER.standoff + BOS_ROLLER.bushing[1], pad1 = pad0 + BOS_ROLLER.pad;
  const tip = pad1 + BOS_ROLLER.bushing[1] - 4, knob0 = -face - BOS_ROLLER.knob[1];
  return { face, plate1, pad0, pad1, tip, knob0, back: knob0 - BOS_ROLLER.stub };
}
/** Titan Rack Mounted Leg Roller (402100, fits T-3 and X-3). Published: 17.75 in x 4.75 in pad, 22.5 in overall, 16 mm
 * threaded pin, powder coat and black zinc, HeftyGrip vinyl, rubber bumper and nylon washers. Bumper, hub and knob sizes
 * estimated; the knob thickness follows from the overall length on a 3 in tube. */
export const TITAN_ROLLER = { overall: inch(22.5), pad: inch(17.75), padDiameter: inch(4.75), pin: 16, bumper: [62, 6] as const, hub: [44, 20] as const, end: 6, knob: [50, 12] as const } as const;
export function titanRoller(p: NumericParams) {
  const face = faceOf(p), pad0 = face + TITAN_ROLLER.bumper[1] + TITAN_ROLLER.hub[1], pad1 = pad0 + TITAN_ROLLER.pad;
  return { face, pad0, pad1, tip: pad1 + TITAN_ROLLER.end, knob0: -face - TITAN_ROLLER.knob[1] };
}
const rollerBody = (r: number, y0: number, y1: number): LocalBox => box([-r, y0, -r], [r, y1, r]);

export const REP_LEG_ROLLER_2 = defineRackPart({
  id: 'rep-leg-roller-2', name: 'REP Leg Roller 2.0', title: 'REP Fitness Leg Roller 2.0', noun: 'leg roller', section: 'Rollers & pads',
  description: 'PR-5000 single leg roller with a molded CleanGrip pad on a nickel shaft, locked by a knurled knob behind the upright · 15.08 x 5.65 in pad · 18.04 in from the upright. ' + DESCRIPTION_END('REP Fitness'),
  params: [],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/leg-roller-2-0', credit: 'REP Fitness — Leg Roller 2.0 (PRA-5713)', trademark: 'REP Fitness and CleanGrip are trademarks of REP Fitness.',
    reconstruction: 'Published 21.74 in un-installed length, 18.04 in extension, 15.08 in x 5.65 in pad and 1 in hardware. Shoulder collar, pad hub, end caps and the securing knob are estimated from the 11 REP photos; physical fit unverified.',
  },
  mount: { pin: PIN_1IN, extent: { below: REP_LR2.padDiameter / 2, above: REP_LR2.padDiameter / 2 }, validate: threeByThree('REP Leg Roller 2.0') },
  bodies: p => { const g = repLr2(p); return [rollerBody(REP_LR2.padDiameter / 2, g.pad0, g.pad1)]; },
  pair: { default: false },
  // Knee height on the front face for Bulgarian split squats; Nordics use a low hole.
  placement: { height: 515, face: 'front' },
});
export const ROGUE_MONSTER_SINGLE_LEG_ROLLER_2 = defineRackPart({
  id: 'rogue-monster-single-leg-roller-2', name: 'Rogue Monster Single Leg Roller 2.0', title: 'Rogue Monster Single Leg Roller 2.0', noun: 'leg roller', section: 'Rollers & pads',
  description: 'Monster 1 in threaded-rod leg roller with machined collars and a knurled screw-on nut · 16 x 4.25 in EPDM foam pad · 22 in total. ' + DESCRIPTION_END('Rogue Fitness'),
  params: [],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-single-leg-roller-2-0', credit: 'Rogue Fitness — Monster Single Leg Roller 2.0 (RA1670) · Assembled in Columbus, Ohio', trademark: 'Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 22 in total, 16 in x 4.25 in pad and 1 in threaded rod. Collar and nut sizes and the pad gathers are estimated from the five Rogue photos; physical fit unverified.',
  },
  mount: { pin: PIN_1IN, extent: { below: ROGUE_SLR2.padDiameter / 2, above: ROGUE_SLR2.padDiameter / 2 }, validate: threeByThree('Monster Single Leg Roller') },
  bodies: p => { const g = rogueSlr2(p); return [rollerBody(ROGUE_SLR2.padDiameter / 2, g.pad0, g.pad1)]; },
  pair: { default: false },
  placement: { height: 515, face: 'front' },
});
export const ROGUE_MONSTER_LITE_LEG_ROLLER = defineRackPart({
  id: 'rogue-monster-lite-leg-roller', name: 'Rogue Monster Lite Leg Roller', title: 'Rogue Monster Lite Rack Mount Leg Roller', noun: 'leg roller', section: 'Rollers & pads',
  description: 'Monster Lite hanger-plate leg roller locked with a 0.625 in orange detent pin · 13 x 5 in vinyl pad · 17.75 in overall. ' + DESCRIPTION_END('Rogue Fitness'),
  params: [],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-lite-rack-mount-leg-roller', credit: 'Rogue Fitness — Monster Lite Rack Mount Leg Roller (RA0725)', trademark: 'Rogue and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published 17.75 in overall, 13 in x 5 in pad and 0.625 in detent pin. Hanger plate, top pin, lower wrap channel and collars are estimated from the six Rogue photos; physical fit unverified.',
  },
  mount: {
    pin: PIN_5_8IN,
    extent: p => ({ below: -rogueMlRoller(p).bottom, above: ROGUE_ML_ROLLER.plateTop }),
    // The detent pin needs a side hole whole stations below the top pin, so bench half holes are refused.
    mainStations: true,
    validate: threeByThree('Monster Lite leg roller'),
  },
  bodies: p => { const g = rogueMlRoller(p), r = ROGUE_ML_ROLLER.padDiameter / 2, z = ROGUE_ML_ROLLER.shaftZ; return [box([-r, g.pad0, z - r], [r, g.pad1, z + r])]; },
  pair: { default: false },
  placement: { height: 590, face: 'front' },
});
export const BELLS_OF_STEEL_SPLIT_SQUAT_LEG_ROLLER = defineRackPart({
  id: 'bells-of-steel-split-squat-leg-roller', name: 'Bells of Steel Split Squat Leg Roller', title: 'Bells of Steel Split Squat Leg Roller', noun: 'leg roller', section: 'Rollers & pads',
  description: 'Open-bracket split squat roller with a threaded pin and chrome star knob · 16 x 4 in vinyl pad · 22-3/4 in total · Hydra (5/8 in) or Manticore (1 in). ' + DESCRIPTION_END('Bells of Steel'),
  params: [{ key: 'hardware', label: 'Rack', default: 1, options: [0, 1], format: v => BOS_HARDWARE[v] ?? String(v) }],
  vendor: {
    vendor: 'Bells of Steel', url: 'https://bellsofsteel.us/products/split-squat-leg-roller-attachment', credit: 'Bells of Steel — Split Squat Leg Roller Rack Attachment (BSS2-RA-HDR / SSQ2-RA-MTC)', trademark: 'Bells of Steel, Hydra and Manticore are trademarks of Bells of Steel.',
    reconstruction: 'Published 4 in pad diameter, 16 in pad and 22-3/4 in total. The open bracket, zinc bushings and chrome star knob are estimated from the 11 Bells of Steel photos and the BSS3-RA manual cover; the 2.3 in version does not fit a 3 in tube and is not modelled; physical fit unverified.',
  },
  mount: { pin: p => p.hardware ? PIN_1IN : PIN_5_8IN, extent: { below: BOS_ROLLER.padDiameter / 2, above: BOS_ROLLER.padDiameter / 2 }, validate: threeByThree('split squat leg roller') },
  bodies: p => { const g = bosRoller(p); return [rollerBody(BOS_ROLLER.padDiameter / 2, g.pad0, g.pad1)]; },
  pair: { default: false },
  placement: { height: 515, face: 'front' },
  autoFit: rack => ({ hardware: rack.holeDiameter < 20 ? 0 : 1 }),
});

export const TITAN_RACK_MOUNTED_LEG_ROLLER = defineRackPart({
  id: 'titan-rack-mounted-leg-roller', name: 'Titan Rack Mounted Leg Roller', title: 'Titan Rack Mounted Leg Roller', noun: 'leg roller', section: 'Rollers & pads',
  description: 'X-3 leg roller on a 16 mm threaded pin with a knurled knob behind the upright · 17.75 x 4.75 in HeftyGrip pad · 22.5 in overall. ' + DESCRIPTION_END('Titan Fitness'),
  params: [],
  vendor: {
    vendor: 'Titan Fitness', url: 'https://titan.fitness/products/rack-mounted-leg-roller-fits-t-3-and-x-3-series', credit: 'Titan Fitness — Rack Mounted Leg Roller, fits T-3 & X-3 Series (402100)', trademark: 'Titan Fitness and HeftyGrip are trademarks of Titan Fitness.',
    reconstruction: 'Published 22.5 in overall, 17.75 in x 4.75 in pad and 16 mm threaded pin. The rubber bumper, hub, end disc and knob are estimated from the 10 Titan photos and dimension drawing; modelled for 3x3 X-3 uprights (the T-3 short-side spacer is not modelled); physical fit unverified.',
  },
  mount: { pin: PIN_5_8IN, extent: { below: TITAN_ROLLER.padDiameter / 2, above: TITAN_ROLLER.padDiameter / 2 }, validate: threeByThree('Titan leg roller') },
  bodies: p => { const g = titanRoller(p); return [rollerBody(TITAN_ROLLER.padDiameter / 2 - 2, g.pad0, g.pad1)]; },
  pair: { default: false },
  placement: { height: 515, face: 'front' },
});

// ───────────────────────────── Rogue Monster Pritchett Pad ─────────────────────────────

/** Published (RA2849 / RA2850): pad extends 33 in from the face of the upright; pad 12 in long, 8 in wide at the top,
 * 11 in at the bottom, 2.25 in thick; 3x3 in 11-gauge arm with two gussets; UHMW-lined channel. The arm path is
 * estimated from the side-on Monster Lite photo and the studio shot. Points are [y from the face, z]. */
export const PRITCHETT = {
  extension: inch(33), pad: [inch(12), inch(8), inch(11), inch(2.25)] as const, arm: inch(3), wall: 3.05,
  channel: { top: 28, bottom: -178, depth: 44, plate: 6.35 }, pinReach: 44,
  /** Centreline: low horizontal run the lifter straddles, 40° riser, then an upper riser leaning back toward the rack
   * (102°); the pad plate sits square to it, so the pad faces up and back toward the rack for the lifter bent over it. */
  path: [[8, -140], [361, -140], [361 + 520 * Math.cos(40 * Math.PI / 180), -140 + 520 * Math.sin(40 * Math.PI / 180)]] as [number, number][],
  upper: { length: 330, angle: 102 }, padPlate: 6.35,
} as const;
export const PRITCHETT_SERIES = ['Monster · 1 in welded pin', 'Monster Lite · 5/8 in hitch pin'] as const;
export function pritchettLayout(p: NumericParams) {
  const face = faceOf(p), [a, b, c] = PRITCHETT.path.map(([y, z]) => [face + y, z] as [number, number]);
  const t = PRITCHETT.upper.angle * Math.PI / 180, d: [number, number] = [Math.cos(t), Math.sin(t)];
  const end: [number, number] = [c[0] + PRITCHETT.upper.length * d[0], c[1] + PRITCHETT.upper.length * d[1]];
  // Pad centre above the plate along the riser direction; its length runs out and up (square to the riser).
  const lift = PRITCHETT.padPlate + PRITCHETT.pad[3] / 2, centre: [number, number] = [end[0] + lift * d[0], end[1] + lift * d[1]];
  const along: [number, number] = [d[1], -d[0]];
  const half = PRITCHETT.pad[0] / 2, h = PRITCHETT.pad[3] / 2;
  const corners = [-1, 1].flatMap(s => [-1, 1].map(k => [centre[0] + s * half * along[0] + k * h * d[0], centre[1] + s * half * along[1] + k * h * d[1]] as [number, number]));
  return { face, points: [a, b, c, end], dir: d, along, centre, corners };
}

export const ROGUE_MONSTER_PRITCHETT_PAD = defineRackPart({
  id: 'rogue-monster-pritchett-pad', name: 'Rogue Monster Pritchett Pad', title: 'Rogue Monster Pritchett Pad', noun: 'pritchett pad', section: 'Rollers & pads',
  description: 'Jerry Pritchett chest-supported row pad on a gusseted 3x3 in arm that clasps the upright · 12 in tapered pad · 33 in from the upright · Monster (1 in pin) or Monster Lite (5/8 in hitch pin). ' + DESCRIPTION_END('Rogue Fitness'),
  params: [{ key: 'series', label: 'Series', default: 0, options: [0, 1], format: v => PRITCHETT_SERIES[v] ?? String(v) }],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-pritchett-pad', credit: 'Rogue Fitness — Monster Pritchett Pad (RA2849) / Monster Lite Pritchett Pad (RA2850) · Made in USA', trademark: 'Rogue, Monster and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published 33 in extension, 12 in pad tapering 11 in to 8 in, 2.25 in thick, 3x3 in 11-gauge arm. The arm bends, channel and gusset are estimated from 12 Rogue photos and 7 Garage Gym Reviews photos; physical fit unverified.',
  },
  mount: {
    pin: p => p.series ? PIN_5_8IN : PIN_1IN,
    extent: p => { const g = pritchettLayout(p); return { below: -PRITCHETT.channel.bottom + 2, above: Math.max(...g.corners.map(c => c[1])) + 2 }; },
    validate: threeByThree('Pritchett pad'),
  },
  bodies: p => {
    const g = pritchettLayout(p), a = PRITCHETT.arm / 2, [p0, p1, p2, p3] = g.points, w = PRITCHETT.pad[2] / 2;
    const ys = g.corners.map(c => c[0]), zs = g.corners.map(c => c[1]);
    return [
      box([-a, p0[0], p0[1] - a], [a, p1[0] + a, p1[1] + a]),
      box([-a, p1[0], p1[1] - a], [a, p2[0] + a * .6, p2[1] + a * .6]),
      box([-a, Math.min(p2[0], p3[0]) - a * .6, p2[1]], [a, Math.max(p2[0], p3[0]) + a * .4, p3[1]]),
      // Inset past the pad's rounded corners so the box stays inside the solids.
      box([-w + 20, Math.min(...ys) + 16, Math.min(...zs) + 16], [w - 20, Math.max(...ys) - 16, Math.max(...zs) - 16]),
    ];
  },
  // Low on the front face so the pad sits at chest height for landmine and dumbbell rows.
  placement: { height: 265, face: 'front' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 1 : 0 }),
});

// ───────────────────────────── Bells of Steel Seal Row Pad ─────────────────────────────

/** Published (SEAL-PAD-RA family): pad 16 x 12 x 2.25 in, selector wheel depth 7.1 in, 7 angles, bracket 11.5 in,
 * 11-gauge steel. Angle values, plate outline, arm dog-leg and the clamp station are estimated from 18 BoS photos. */
export const SEAL_ROW = {
  pad: [inch(12), inch(16), inch(2.25)] as const, bracket: inch(11.5), wheelDepth: inch(7.1), wall: 4.8,
  angles: [-15, 0, 15, 30, 45, 60, 75] as const, pivot: [118, -52] as [number, number],
  /** Arm in its own frame (from the pivot, before rotation): dog-leg down then out; the pad sits on the second leg. */
  arm: [[0, 0], [120, -58], [300, -58]] as [number, number][], armSize: [inch(2), inch(3)] as const, padStart: 70, board: 12,
  clampStations: 4, /** Selector wheel plate reach above / below the pivot. */ wheel: [98, -112] as const,
} as const;
export const SEAL_ROW_HARDWARE = ['Hydra · 3 x 3 in, 5/8 in holes', 'Manticore · 3 x 3 in, 1 in holes'] as const;
const rot2 = ([y, z]: [number, number], deg: number): [number, number] => { const t = deg * Math.PI / 180; return [y * Math.cos(t) - z * Math.sin(t), y * Math.sin(t) + z * Math.cos(t)]; };
export function sealRowLayout(p: NumericParams) {
  const face = faceOf(p), pitch = pitchOf(p), angle = SEAL_ROW.angles[p.angle ?? 1];
  if (angle === undefined) throw Error('Unsupported seal row pad angle.');
  const clampZ = -SEAL_ROW.clampStations * pitch, top = 40, bottom = clampZ - 49, pivot: [number, number] = [face + SEAL_ROW.pivot[0], SEAL_ROW.pivot[1]];
  const at = (pt: [number, number]): [number, number] => { const r = rot2(pt, angle); return [pivot[0] + r[0], pivot[1] + r[1]]; };
  const legZ = SEAL_ROW.arm[2][1], a = SEAL_ROW.armSize[1] / 2, [, L, W] = [0, SEAL_ROW.pad[1], SEAL_ROW.pad[0]];
  const padLocal: [number, number][] = [[SEAL_ROW.padStart, legZ + a], [SEAL_ROW.padStart + L, legZ + a], [SEAL_ROW.padStart, legZ + a + SEAL_ROW.board + SEAL_ROW.pad[2]], [SEAL_ROW.padStart + L, legZ + a + SEAL_ROW.board + SEAL_ROW.pad[2]]];
  const pad = padLocal.map(at), arm = SEAL_ROW.arm.map(at);
  // Collision box inset past the rounded pad edges and the tombstone end.
  const padBody = [SEAL_ROW.padStart + 20, SEAL_ROW.padStart + L - 50].flatMap(u => [legZ + a, legZ + a + SEAL_ROW.board + SEAL_ROW.pad[2] - 14].map(w => at([u, w])));
  return { face, pitch, angle, clampZ, top, bottom, pivot, at, pad, padBody, arm, width: W };
}
export const BELLS_OF_STEEL_SEAL_ROW_PAD = defineRackPart({
  id: 'bells-of-steel-seal-row-pad', name: 'Bells of Steel Seal Row Pad', title: 'Bells of Steel Seal Row Pad Rack Attachment', noun: 'seal row pad', section: 'Rollers & pads',
  description: 'Rack-mounted chest pad on a 7-position selector wheel for seal rows, flyes, hip thrusts and incline curls · 16 x 12 x 2.25 in pad · 11.5 in bracket · Hydra (5/8 in) or Manticore (1 in). ' + DESCRIPTION_END('Bells of Steel'),
  params: [
    { key: 'hardware', label: 'Rack', default: 1, options: [0, 1], format: v => SEAL_ROW_HARDWARE[v] ?? String(v) },
    { key: 'angle', label: 'Pad angle', default: 1, options: SEAL_ROW.angles.map((_, i) => i), format: v => `${SEAL_ROW.angles[v] ?? v}°` },
  ],
  vendor: {
    vendor: 'Bells of Steel', url: 'https://bellsofsteel.us/products/seal-row-pad', credit: 'Bells of Steel — Seal Row Pad Rack Attachment (SRP-RA-HDR / RPAD-RA-MTC)', trademark: 'Bells of Steel, Hydra and Manticore are trademarks of Bells of Steel.',
    reconstruction: 'Published 16 x 12 x 2.25 in pad, 7.1 in selector wheel, 7 angles, 11.5 in bracket and 11-gauge steel. The angle values, arm dog-leg, wheel outline and lower clamp station are estimated from 18 Bells of Steel photos; the 2.3 in version is not modelled; physical fit unverified.',
  },
  mount: {
    pin: p => p.hardware ? PIN_1IN : PIN_5_8IN,
    holes: [0, -SEAL_ROW.clampStations],
    validate: threeByThree('seal row pad'),
    extent: p => { const g = sealRowLayout(p), zs = [...g.pad, ...g.arm].map(q => q[1]); return { below: Math.max(-g.bottom, -(g.pivot[1] + SEAL_ROW.wheel[1]), -Math.min(...zs) + SEAL_ROW.armSize[1] / 2 + 6), above: Math.max(g.top, g.pivot[1] + SEAL_ROW.wheel[0], Math.max(...zs) + 6) + 1 }; },
  },
  bodies: p => {
    const g = sealRowLayout(p), ys = g.padBody.map(q => q[0]), zs = g.padBody.map(q => q[1]), w = g.width / 2 - 30;
    return [box([-w, Math.max(g.face + 2, Math.min(...ys)), Math.min(...zs)], [w, Math.max(...ys), Math.max(...zs)]), box([-SEAL_ROW.armSize[0] / 2, g.face + 60, Math.min(...g.arm.map(q => q[1])) - 20], [SEAL_ROW.armSize[0] / 2, Math.max(...g.arm.map(q => q[0])), g.pivot[1] + 20])];
  },
  placement: { height: 815, face: 'front' },
  autoFit: rack => ({ hardware: rack.holeDiameter < 20 ? 0 : 1 }),
});

// ───────────────────────────── REP Pegasus ─────────────────────────────

/** Published (repfitness.com/products/pegasus-seat): 16.3 in total height, height on upright 9.8 in (4000) / 8.9 in
 * (5000), 27.8 in long, 24.6 in wide, 24.8 in from the rack, seat pad 13.6 in long, 11 in tapering to 7.5 in, 2.5 in
 * thick, seat angles 0/12.5/25/40/55/70/90, main arm angles 0/12.5/25/40, 5.8 in leg rollers 3-8 in above the seat,
 * metallic black powder coat, CleanGrip pads, magnetic mountain-logo pin. Sleeve, arm and post positions are estimated. */
export const PEGASUS = {
  sleeve: [inch(8.9), inch(9.8)] as const, sleeveTop: 108, extension: inch(24.8), width: inch(24.6), wall: 6.35,
  seat: [inch(13.6), inch(11), inch(7.5), inch(2.5)] as const, seatAngles: [0, 12.5, 25, 40, 55, 70, 90] as const, armAngles: [0, 12.5, 25, 40] as const,
  rollerHeights: [3, 4, 5, 6, 7, 8] as const, rollerDiameter: inch(5.8), post: inch(2),
  /** Arm pivot under the sleeve box front, [y from the face, z]; the seat pivots `seatPivot` mm in from its rack end. */ armPivot: [128, -120] as [number, number], seatPivot: 100,
  /** The sleeve is a box: side walls run from behind the upright to `boxFront` in front of the face, housing the roller post. */ boxFront: 122,
  frame: 6.35, seatLift: 30, arcRadius: 88, postY: 88,
} as const;
/** Carry-handle loop top above the roller axle. */
export const PEGASUS_HANDLE = 80;
export const PEGASUS_SERIES = ['5000 Series · 1 in holes', '4000 Series · 5/8 in holes'] as const;
export function pegasusLayout(p: NumericParams) {
  const face = faceOf(p), alpha = PEGASUS.armAngles[p.arm ?? 0], beta = PEGASUS.seatAngles[p.seat ?? 0], rise = PEGASUS.rollerHeights[p.roller ?? 2];
  if (alpha === undefined || beta === undefined || rise === undefined) throw Error('Unsupported Pegasus adjustment.');
  const [L] = PEGASUS.seat, A: [number, number] = [face + PEGASUS.armPivot[0], PEGASUS.armPivot[1]];
  const seatPivot0: [number, number] = [face + PEGASUS.extension - L + PEGASUS.seatPivot, PEGASUS.armPivot[1]], u0 = -PEGASUS.seatPivot, u1 = L - PEGASUS.seatPivot;
  const S = ((r): [number, number] => [A[0] + r[0], A[1] + r[1]])(rot2([seatPivot0[0] - A[0], 0], alpha));
  const seatAngle = alpha - beta, seatTop0 = PEGASUS.armPivot[1] + PEGASUS.seatLift + PEGASUS.frame + PEGASUS.seat[3];
  /** Seat-frame point (u along the seat from its pivot, w up from the pivot) → [y, z]. */
  const seatAt = (u: number, w: number): [number, number] => { const r = rot2([u, w], seatAngle); return [S[0] + r[0], S[1] + r[1]]; };
  const armAt = (u: number, w: number): [number, number] => { const r = rot2([u, w], alpha); return [A[0] + r[0], A[1] + r[1]]; };
  const axleZ = seatTop0 + inch(rise) + PEGASUS.rollerDiameter / 2, sleeveH = PEGASUS.sleeve[p.series ?? 0];
  const seatCorners = [u0, u1].flatMap(u => [PEGASUS.seatLift, PEGASUS.seatLift + PEGASUS.frame + PEGASUS.seat[3]].map(w => seatAt(u, w)));
  const arc = [-1, 1].flatMap(s => [0, -PEGASUS.arcRadius].map(w => armAt(seatPivot0[0] - A[0] + s * PEGASUS.arcRadius, w)));
  // Main arm tube (2x3 in, centreline 20 mm below the pivot) and the fixed pivot plates under the sleeve.
  const armEnds = [-30, seatPivot0[0] - A[0] + 70].flatMap(u => [-20 - inch(1.5), -20 + inch(1.5)].map(w => armAt(u, w)));
  /** Seat box for collisions, inset past the pad's rounded edges so it stays inside the solids. */
  const seatBody = [u0 + 16, u1 - 16].flatMap(u => [PEGASUS.seatLift, PEGASUS.seatLift + PEGASUS.frame + PEGASUS.seat[3] - 16].map(w => seatAt(u, w)));
  const zs = [...seatCorners, ...arc, ...armEnds].map(c => c[1]);
  return { face, alpha, beta, A, S, seatAngle, seatAt, armAt, axleZ, sleeveTop: PEGASUS.sleeveTop, sleeveBottom: PEGASUS.sleeveTop - sleeveH, seatCorners, seatBody, arc, seatMid: (u0 + u1) / 2,
    armLength: seatPivot0[0] - A[0], low: Math.min(...zs, PEGASUS.sleeveTop - sleeveH, PEGASUS.armPivot[1] - 56), high: Math.max(...zs, axleZ + PEGASUS.rollerDiameter / 2, axleZ + PEGASUS_HANDLE) };
}
export const REP_PEGASUS = defineRackPart({
  id: 'rep-pegasus', name: 'REP Pegasus', title: 'REP Fitness Pegasus Attachment', noun: 'pegasus seat', section: 'Rollers & pads',
  description: 'Sleeve-mounted seat with twin 5.8 in leg rollers for lat pulldowns, rows and leg extensions · 13.6 in CleanGrip seat · 7 seat and 4 arm angles · 24.8 in from the rack. ' + DESCRIPTION_END('REP Fitness'),
  params: [
    { key: 'series', label: 'Series', default: 0, options: [0, 1], format: v => PEGASUS_SERIES[v] ?? String(v) },
    { key: 'seat', label: 'Seat angle', default: 0, options: PEGASUS.seatAngles.map((_, i) => i), format: v => `${PEGASUS.seatAngles[v] ?? v}°` },
    { key: 'arm', label: 'Main arm angle', default: 0, options: PEGASUS.armAngles.map((_, i) => i), format: v => `${PEGASUS.armAngles[v] ?? v}°` },
    { key: 'roller', label: 'Leg rollers above seat', default: 2, options: PEGASUS.rollerHeights.map((_, i) => i), format: v => `${PEGASUS.rollerHeights[v] ?? v} in` },
  ],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/pegasus-seat', credit: 'REP Fitness — Pegasus Attachment (PRA-5750 / PRA-4750)', trademark: 'REP Fitness, Pegasus and CleanGrip are trademarks of REP Fitness.',
    reconstruction: 'Published total height, height on the upright, length, width, extension, seat pad size, seat and arm angles, roller diameter and roller heights. The sleeve, pivot positions, arc plates and roller post are estimated from 29 REP photos; the 19.3 in lowest seat height depends on the rack and is not checked; physical fit unverified.',
  },
  mount: {
    pin: p => p.series ? PIN_5_8IN : PIN_1IN,
    // The magnetic pin crosses the sleeve side plates and the upright's side holes.
    pinAxis: 'across', mainStations: true,
    validate: threeByThree('Pegasus'),
    extent: p => { const g = pegasusLayout(p); return { below: -g.low + 2, above: g.high + 2 }; },
  },
  bodies: p => {
    const g = pegasusLayout(p), ys = g.seatBody.map(c => c[0]), zs = g.seatBody.map(c => c[1]), w = PEGASUS.seat[2] / 2, r = PEGASUS.rollerDiameter / 2 - 4;
    return [
      box([-w, Math.max(g.face + 4, Math.min(...ys)), Math.min(...zs)], [w, Math.max(...ys), Math.max(...zs)]),
      box([-PEGASUS.width / 2, g.face + PEGASUS.postY - r, g.axleZ - r], [PEGASUS.width / 2, g.face + PEGASUS.postY + r, g.axleZ + r]),
    ];
  },
  placement: { height: 515, face: 'front' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 1 : 0 }),
});

// ───────────────────────────── Prime Fitness Prodigy Adjustable Stability Pad ─────────────────────────────

/** Published (primefitnessusa.com, item 1207642): 3x3 in upright with 1 in holes on 2 in centres, 38 in long at the
 * shortest and 49 in fully extended, 13-3/4 in half-moon pad, 9 pad angles, 12 lengths, 11 width (swing) adjustments,
 * vertical or horizontal pad. Angle values, arm tubes, mount and pad section estimated from three Prime renders. */
export const PRODIGY = {
  lengths: Array.from({ length: 12 }, (_, i) => inch(38 + i)), swings: [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75] as const, padAngles: [-60, -45, -30, -15, 0, 15, 30, 45, 60] as const,
  pad: [inch(13.75), inch(7), inch(4.25)] as const, arm: [inch(2), inch(3)] as const, inner: [inch(1.5), inch(2.5)] as const, armZ: -70, pivotY: 62, pivotZ: [-150, 34] as const,
  mountPlate: [inch(3.5), 160, 6.35] as const, outer: inch(22),
} as const;
export const PRODIGY_ORIENTATION = ['Vertical pad', 'Horizontal pad'] as const;
export function prodigyLayout(p: NumericParams) {
  const face = faceOf(p), length = PRODIGY.lengths[p.length ?? 0], swing = PRODIGY.swings[p.swing ?? 5], padAngle = PRODIGY.padAngles[p.padAngle ?? 4];
  if (length === undefined || swing === undefined || padAngle === undefined || ![0, 1].includes(p.orientation ?? 0)) throw Error('Unsupported Prodigy adjustment.');
  const t = swing * Math.PI / 180, dir: [number, number] = [Math.sin(t), Math.cos(t)], pivot: [number, number] = [0, face + PRODIGY.pivotY];
  // Length runs from the mounting face to the pad face; the pad bracket and pad depth sit at the end of the arm.
  const reach = length - PRODIGY.pivotY - PRODIGY.pad[2] - 30, end: [number, number] = [pivot[0] + dir[0] * reach, pivot[1] + dir[1] * reach];
  const halfH = (p.orientation ?? 0) ? PRODIGY.pad[1] / 2 : PRODIGY.pad[0] / 2, halfW = (p.orientation ?? 0) ? PRODIGY.pad[0] / 2 : PRODIGY.pad[1] / 2;
  const pt = (swing + padAngle) * Math.PI / 180, padDir: [number, number] = [Math.sin(pt), Math.cos(pt)], across: [number, number] = [Math.cos(pt), -Math.sin(pt)];
  // Pad footprint corners (flat back 30 mm off the bracket; stops short of the rounded face so the box stays inside the pad).
  const padCorners = [-1, 1].flatMap(s => [32, 30 + PRODIGY.pad[2] * .5].map(d => [end[0] + s * halfW * .7 * across[0] + d * padDir[0], end[1] + s * halfW * .7 * across[1] + d * padDir[1]] as [number, number]));
  return { face, length, swing, padAngle, dir, pivot, reach, end, halfH, halfW, padDir, across, padCorners };
}
export const PRIME_PRODIGY_STABILITY_PAD = defineRackPart({
  id: 'prime-prodigy-stability-pad', name: 'Prime Prodigy Stability Pad', title: 'Prime Fitness Prodigy Adjustable Stability Pad', noun: 'stability pad', section: 'Rollers & pads',
  description: 'Swing-arm half-moon pad for supported rows, split squats and single-arm work · 38-49 in telescoping arm · 9 pad angles, 12 lengths and 11 swing positions · vertical or horizontal pad. ' + DESCRIPTION_END('Prime Fitness'),
  params: [
    { key: 'length', label: 'Length', default: 0, options: PRODIGY.lengths.map((_, i) => i), format: v => `${38 + v} in` },
    { key: 'swing', label: 'Swing', default: 5, options: PRODIGY.swings.map((_, i) => i), format: v => `${PRODIGY.swings[v] ?? v}°` },
    { key: 'padAngle', label: 'Pad angle', default: 4, options: PRODIGY.padAngles.map((_, i) => i), format: v => `${PRODIGY.padAngles[v] ?? v}°` },
    { key: 'orientation', label: 'Pad', default: 0, options: [0, 1], format: v => PRODIGY_ORIENTATION[v] ?? String(v) },
  ],
  vendor: {
    vendor: 'Prime Fitness', url: 'https://www.primefitnessusa.com/products/prodigy-adjustable-stability-pad-attachment', credit: 'Prime Fitness — PRODIGY Adjustable Stability Pad Attachment (1207642)', trademark: 'Prime Fitness and PRODIGY are trademarks of Prime Fitness USA.',
    reconstruction: 'Published 38-49 in length, 13-3/4 in half-moon pad, 9 angles, 12 lengths, 11 widths and 1 in hardware on 2 in centres. Prime publishes only three renders, so the mount, arm tubes, pad section and angle values are estimates; physical fit unverified.',
  },
  mount: {
    pin: PIN_1IN,
    extent: p => { const g = prodigyLayout(p); return { below: Math.max(-PRODIGY.pivotZ[0], -PRODIGY.armZ + g.halfH) + 2, above: Math.max(PRODIGY.pivotZ[1], PRODIGY.armZ + g.halfH) + 2 }; },
    validate: rack => { threeByThree('stability pad')(rack); if (Math.abs(rack.pitch - 50.8) > 1.5) throw Error('The stability pad needs 2 in hole spacing.'); },
  },
  bodies: p => {
    const g = prodigyLayout(p), a = PRODIGY.arm[0] / 2, xs = g.padCorners.map(c => c[0]), ys = g.padCorners.map(c => c[1]);
    const ax = [g.pivot[0] + g.dir[0] * 60, g.end[0]], ay = [g.pivot[1] + g.dir[1] * 60, g.end[1]];
    return [
      box([Math.min(...ax) - a, Math.max(g.face + 2, Math.min(...ay) - a), PRODIGY.armZ - PRODIGY.arm[1] / 2], [Math.max(...ax) + a, Math.max(...ay) + a, PRODIGY.armZ + PRODIGY.arm[1] / 2]),
      box([Math.min(...xs), Math.max(g.face + 2, Math.min(...ys)), PRODIGY.armZ - g.halfH + 12], [Math.max(...xs), Math.max(...ys), PRODIGY.armZ + g.halfH - 12]),
    ];
  },
  placement: { height: 1015, face: 'front' },
});

export const PARTS = [
  REP_PEGASUS, REP_LEG_ROLLER_2, ROGUE_MONSTER_SINGLE_LEG_ROLLER_2, ROGUE_MONSTER_PRITCHETT_PAD, BELLS_OF_STEEL_SEAL_ROW_PAD,
  PRIME_PRODIGY_STABILITY_PAD, ROGUE_MONSTER_LITE_LEG_ROLLER, BELLS_OF_STEEL_SPLIT_SQUAT_LEG_ROLLER, TITAN_RACK_MOUNTED_LEG_ROLLER,
] as const satisfies readonly RackPart[];
