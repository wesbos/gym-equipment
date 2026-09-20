/** Rack-system cable machines (#178, #136, #122, #130): the REP lat pulldown & low row towers, the Rogue Monster Rhino +
 * INDY functional trainer and the Fringe Sport Dane 2.0 dual stacks. They stand on the floor and span the rack, so they use
 * the registry v2 context (hole height, rack height, the facing post, which row) instead of the ARES/Athena system layer:
 * each bolts to real upright holes, and pairing, moves, undo, save, collisions, GLB and 3MF come from the registry.
 * Metadata only (main bundle): never import Manifold builders here. Builders: parts/rack-digital-cable-*.ts.
 * Research, sources and every estimate: research/rack-digital-cable-trainers.md.
 *
 * Frame (rack-part.ts): origin on the mounting upright's centreline at the target hole, +Y out of the mounting face, X
 * across it, Z up. The machines are laid out in a "machine frame" (u, v, z) and mapped into it by `machineToLocal`. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type RackPart } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions, Vec3 } from '../types.ts';
export const inch = (v: number) => v * 25.4;
const DESCRIPTION_END = (brand: string) => `Independent reconstruction; ${brand} trademarks belong to ${brand}.`;
const squarePost = (rack: RackDimensions, name: string) => {
  if (rack.tube < 74 || rack.tube > 77.5 || Math.abs((rack.tubeDepth ?? rack.tube) - rack.tube) > .01) throw Error(`The ${name} only fits 3 x 3 in uprights.`);
  if (Math.abs(rack.pitch - 50.4) > 1.2) throw Error(`The ${name} needs 2 in (50.8 mm) hole spacing to fit.`);
};
/** Machine frame shared by the builders and the collision bodies: u runs out of the rack from the mounting post's outer
 * face (behind the rack for a rear post), v across the rack from its centreline (toward the facing post is +v), z up
 * from the floor. `o` = acrossOut (sign of local +X out of the rack), W = post face width along local X, S = centre
 * distance to the facing post, hh = target hole height. */
export interface MachineFrame { o: number; W: number; T: number; S: number; hh: number; rackHeight: number }
export function machineFrame(p: NumericParams, nominal: { span: number; hole: number; height: number }): MachineFrame {
  const T = p.upright ?? 75;
  return { o: p.acrossOut === -1 ? -1 : 1, W: p.uprightWidth ?? T, T, S: p.uprightSpan ?? nominal.span, hh: p.holeHeight ?? nominal.hole, rackHeight: p.rackHeight ?? nominal.height };
}
export const machineToLocal = (f: MachineFrame, [u, v, z]: Vec3): Vec3 => [f.o * (f.W / 2 + u), f.S / 2 + v, z - f.hh];
/** Axis-aligned machine box (u0..u1, v0..v1, z0..z1) as a local collision body. */
export function machineBox(f: MachineFrame, min: Vec3, max: Vec3): LocalBox {
  const a = machineToLocal(f, min), b = machineToLocal(f, max);
  return { min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), a[2]], max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), b[2]] };
}
/** Refuse front-row (and lone) posts: these machines stand behind the rack or in its rear bay. */
const rearRow = (p: NumericParams, name: string) => { if (p.rowSide === -1) throw Error(`The ${name} stands behind the rack: mount it on a rear upright's inner face.`); };

// ─── REP Fitness Lat Pulldown & Low Row (selectorized PRA-4700-S / PRA-5702-S, plate-loaded PRA-4700 / PRA-5702) ─────────
/** Published: 95.7 / 83.6 in overall for 93 / 80 in racks (adds 3.3 in), 39.0 x 28.4 in footprint, adds 27.5 in behind a
 * 4-post (19.5 in past an existing Rear Base Stabilizer, 8.5 in on a 6-post), 200 lb stack (20 lb head + 18 x 10 lb)
 * upgradeable to 300 lb (28 plates), 1:1, 60 / 48 in travel, Rear Base Stabilizer (RBS) 41.3 in wide, 3x3 11 ga, 9.8 in
 * bolt tabs, adds 9.5 in depth. Everything else (tube and plate sizes, pulley positions, the base) is estimated from REP's
 * photos, dimension drawing and the PRA-5702 / PR-5002-RBS parts sheets (research notes). */
export const REP_LAT = {
  overall: [inch(83.6), inch(95.7)] as const, rack: [inch(80), inch(93)] as const,
  /** Top member: 3x3 tube on the rack centreline, from 11.5 in inside the rear face to the T-head 22.5 in behind it. */
  tube: inch(3), memberFront: -inch(11.5), memberBack: inch(22.5),
  head: { u0: inch(19), u1: inch(22.5), half: inch(4) },
  /** Guide rods behind the rack, and the rear base under them (published 27.5 in total added depth to the foot tabs). */
  rods: { u: inch(21), half: inch(3), d: inch(1) }, base: { u0: inch(19.5), u1: inch(22.5), half: inch(11), h: inch(3), back: inch(27.5), pegs: inch(14.2) },
  /** Rear Base Stabilizer: tabs on the posts' inner faces, 45 degree legs, straight centre ending 9.5 in behind the posts. */
  rbs: { back: inch(9.5), tab: [inch(3), inch(9.8)] as const, tabBelow: inch(2.4), rise: inch(2.5), leg: inch(6.5), depth: inch(41.3) },
  /** Stack (selectorized): 10 x 4.5 in plates, 1 in thick, C-channel shroud to 31 in (200 lb). */
  plate: { w: inch(4.5), d: inch(10), t: inch(1) }, head20: inch(2), stackBase: inch(3.6), shroud: { face: inch(4), web: inch(6.6), depth: inch(7.5) },
  /** Plate-loaded carriage: 2 in sleeves on the rods, horns 18 in tip to tip at 22 in. */
  carriage: { z: inch(22), horn: inch(9), sleeve: inch(2) },
  /** Low row: post under the RBS centre, pulley at 5 in, diamond-plate footplate 16 x 8.5 x 8 in. */
  footplate: { u0: -inch(1), u1: inch(7), half: inch(8), h: inch(8.5) }, lowPulley: inch(5), pulley: 104,
  latPulley: -inch(9.5), latBar: inch(42),
} as const;
export const REP_LAT_HEIGHTS = ['80 in rack · 83.6 in overall', '93 in rack · 95.7 in overall'] as const;
export const REP_LAT_SERIES = ['4000 series · 5/8 in hardware', '5000 series · 1 in hardware'] as const;
/** REP builds one attachment per rack height (80 or 93 in): the version follows the rack (93 in when none is given). */
export const repLatVersion = (rackHeight?: number) => rackHeight === undefined || rackHeight > inch(86.5) ? 1 : 0;
export function repLatLayout(p: NumericParams) {
  const version = repLatVersion(p.rackHeight), f = machineFrame(p, { span: 1150, hole: inch(6), height: REP_LAT.rack[version] }), L = REP_LAT;
  // The top member rides on the rear top crossmember: it keeps the published rise over the rack top (83.6 − 80, 95.7 − 93 in).
  const top = f.rackHeight + (L.overall[version] - L.rack[version]);
  const rbsZ = f.hh + L.rbs.rise, plates = p.stack ? 28 : 18;
  return { f, version, top, beam0: top - L.tube, rbsZ, plates, stackTop: L.stackBase + plates * (L.plate.t + 1.2) + L.head20 };
}
function repLatBodies(p: NumericParams, selectorized: boolean): LocalBox[] {
  const l = repLatLayout(p), f = l.f, L = REP_LAT, b = (min: Vec3, max: Vec3) => machineBox(f, min, max);
  const stackTop = selectorized ? l.stackTop + inch(4) : L.carriage.z + inch(6);
  return [
    // Stack (or carriage), guide rods and rear base behind the rack.
    b([L.rods.u - inch(4), -inch(selectorized ? 7 : 9.5), inch(1)], [L.rods.u + inch(4), inch(selectorized ? 7 : 9.5), stackTop]),
    // T-head and the rear half of the top member behind the posts.
    b([inch(4), -L.head.half, l.beam0], [L.head.u1, L.head.half, l.top]),
    // Footplate around the low-row post.
    b([L.footplate.u0 + 4, -L.footplate.half, 5], [L.footplate.u1, L.footplate.half, L.footplate.h]),
    // Lat bar hanging under the front end of the top member, inside the rack.
    b([L.latPulley - L.pulley / 2 - 14, -inch(16), l.beam0 - inch(13)], [L.latPulley - L.pulley / 2 + 14, inch(16), l.beam0 - inch(4)]),
  ];
}
const repLatVendor = (handle: string, product: string, reconstruction: string) => ({
  vendor: 'REP Fitness', url: `https://repfitness.com/products/${handle}`, credit: `REP Fitness — ${product}`,
  trademark: 'REP Fitness and REP are trademarks of REP Fitness.', reconstruction,
});
const repLatMount = (selectorized: boolean) => ({
  holes: [0, 2], mainStations: true, pin: (p: NumericParams) => p.series ? PIN_1IN : PIN_5_8IN, pinAxis: 'normal' as const,
  faces: ['left', 'right'] as const, span: 'normal' as const, floor: { min: inch(3.5), max: inch(10) }, overTop: true,
  extent: { below: inch(10) + 1, above: REP_LAT.overall[1] - inch(3) },
  validate: (rack: RackDimensions, p: NumericParams) => {
    const name = selectorized ? 'REP selectorized lat pulldown' : 'REP plate-loaded lat pulldown';
    squarePost(rack, name); rearRow(p, name);
    if (p.uprightSpan === undefined) throw Error(`The ${name} Rear Base Stabilizer bolts between two rear uprights: mount it on an inner face with an upright across.`);
    if (p.uprightSpan < 1000 || p.uprightSpan > 1230) throw Error(`The ${name} Rear Base Stabilizer spans 5000/4000-series rear uprights (39–46 in apart); these are ${(p.uprightSpan / 25.4).toFixed(1)} in apart, so it does not fit.`);
    if (p.rackHeight !== undefined && Math.abs(p.rackHeight - REP_LAT.rack[repLatVersion(p.rackHeight)]) > inch(2.5)) throw Error(`The ${name} comes in 80 and 93 in versions to match the rack; a ${(p.rackHeight / 25.4).toFixed(1)} in rack does not fit either.`);
  },
});
const repLatParams = [
  { key: 'series', label: 'Rack series', default: 1, options: [0, 1], format: (v: number) => REP_LAT_SERIES[v] ?? String(v) },
] as const;
const repLatAutoFit = (rack: RackDimensions) => ({ series: rack.holeDiameter < 20 ? 0 : 1 });
export const REP_SELECTORIZED_LAT = defineRackPart({
  id: 'rep-selectorized-lat-pulldown-low-row', name: 'REP Selectorized Lat Pulldown & Low Row', title: 'REP Selectorized Lat Pulldown & Low Row (4000/5000)', noun: 'lat pulldown', section: 'Digital & cable',
  description: 'Weight-stack lat tower behind a PR-4000 / PR-5000: top member on the rear top crossmember, 200 or 300 lb stack on chrome guide rods, 1:1 lat and low-row cables, diamond-plate footplate and the required Rear Base Stabilizer · 95.7 / 83.6 in tall, 39.0 x 28.4 in. ' + DESCRIPTION_END('REP Fitness'),
  params: [...repLatParams,
    { key: 'stack', label: 'Weight stack', default: 0, options: [0, 1], format: v => ['200 lb (18 plates)', '300 lb (28 plates, upgrade kit)'][v] ?? String(v) },
    { key: 'pin', label: 'Pinned weight', default: 8, options: p => Array.from({ length: (p.stack ? 28 : 18) + 1 }, (_, i) => i), format: v => `${20 + 10 * v} lb` }],
  vendor: repLatVendor('4000-5000-series-lat-pulldown', 'Selectorized Lat Pulldown & Low Row, 4000/5000 Series (PRA-4700-S / PRA-5702-S)',
    'Published 95.7 / 83.6 in height, 39.0 x 28.4 in footprint, 27.5 in added depth, 200 lb (upgradeable to 300 lb) 1:1 stack and the 41.3 in Rear Base Stabilizer. Tube, plate, pulley and base sizes are estimated from REP photos, the dimension drawing and the PRA-5702 parts sheet; cable routes are simplified. The machine follows the actual rack height and rear-upright spacing; physical fit unverified.'),
  mount: repLatMount(true),
  bodies: p => repLatBodies(p, true),
  placement: { height: inch(6), face: 'inside' },
  autoFit: repLatAutoFit,
  context: ['holeHeight', 'rackHeight', 'acrossOut', 'rowSide'],
});
export const REP_PLATE_LAT = defineRackPart({
  id: 'rep-lat-pulldown-low-row-plate-loaded', name: 'REP Lat Pulldown & Low Row (plate-loaded)', title: 'REP Lat Pulldown & Low Row, plate-loaded (4000/5000)', noun: 'lat pulldown', section: 'Digital & cable',
  description: 'Plate-loaded lat tower behind a PR-4000 / PR-5000: the same top member, guide rods and footplate as the selectorized version with a sleeved carriage and two Olympic horns, plus the Rear Base Stabilizer · adds 3.3 in height, 27 in depth. ' + DESCRIPTION_END('REP Fitness'),
  params: repLatParams,
  vendor: repLatVendor('lat-and-low-attachment-4000-5000', 'Lat Pulldown & Low Row Attachment, 4000/5000 Series (PRA-4700 / PRA-5702)',
    'Published 3.3 in added height, 27 in added depth, 1:1 ratio, 66.9 / 52.1 in travel and the 41.3 in Rear Base Stabilizer. Carriage, horn, tube and pulley sizes are estimated from REP photos and the PRA-5702 manual; cable routes are simplified. The machine follows the actual rack height and rear-upright spacing; physical fit unverified.'),
  mount: repLatMount(false),
  bodies: p => repLatBodies(p, false),
  placement: { height: inch(6), face: 'inside' },
  autoFit: repLatAutoFit,
  context: ['holeHeight', 'rackHeight', 'acrossOut', 'rowSide'],
});

// ─── Rogue Monster Rhino + INDY Functional Trainer ────────────────────────────────────────────────────────────────────
/** Rogue sells it as a bundle on a Monster RM-3/RM-4/RM-6 (IS0637): the Rhino belt-squat unit in the rear bay (7 in pulley
 * deck, 3x6 11 ga upright behind the rear crossmember, two 15.75 in plate posts, top angle crossmembers, lever handles),
 * one 300 lb INDY stack (28 x 10 lb, 2:1) in each side plane of the rear bay behind shrouds, top pulley plates on the side
 * top crossmembers and a swivel trolley on each front upright. Published: 92 / 102 in overall on 90 / 100 in uprights,
 * 53 in wide, rack length + 26 in, 3x3 11 ga, 1 in hardware, 3.5–6 in pulleys, 3/16 in cable. Estimated: plate, shroud,
 * deck, trolley and pulley-plate sizes (research notes). */
export const RHINO_INDY = {
  deck: { depth: inch(23.5), h: inch(7) }, rhino: { u0: inch(4), u1: inch(10), half: inch(1.5), trolley: inch(20), post: inch(15.75) },
  plate: { along: inch(10.5), across: inch(4.5), t: inch(1), n: 28 }, head: inch(2),
  /** Stack centre forward of the rear post centre; shroud length along the side and its reach past the post centre. */
  stack: { centre: inch(13), shroud: inch(19), out: inch(3.25), in: inch(3.25), bottom: inch(4), topGap: inch(6) },
  topPlate: { length: inch(20), h: inch(4.5), pulley: inch(6) }, trolley: { h: inch(8), pulley: inch(7) },
  lever: { hinge: inch(16), tip: inch(40), reach: inch(16) },
} as const;
export const RHINO_SIDES = ['Dual INDY stacks', 'Left INDY stack only', 'Right INDY stack only'] as const;
export const RHINO_TROLLEY = [18, 30, 36, 42, 54, 66] as const;
export function rhinoLayout(p: NumericParams) {
  const f = machineFrame(p, { span: inch(46), hole: inch(4.5), height: inch(90.375) }), R = RHINO_INDY;
  const reach = p.columnReach || inch(46), front = -f.W / 2 - reach, top = f.rackHeight;
  // Left in the rack is the mounting post's side when it is a left post (acrossOut -1), the facing post's side otherwise.
  const left = f.o < 0 ? -1 : 1, sides = [[-1, 1], [left], [-left]][p.sides ?? 0] as readonly number[];
  const trolleyZ = Math.min(inch(RHINO_TROLLEY[p.trolley ?? 2] ?? 36), top - inch(14));
  return { f, reach, front, top, sides, trolleyZ, stackU: -f.W / 2 - R.stack.centre };
}
function rhinoBodies(p: NumericParams): LocalBox[] {
  const l = rhinoLayout(p), f = l.f, R = RHINO_INDY, b = (min: Vec3, max: Vec3) => machineBox(f, min, max), half = f.S / 2;
  return [
    // Pulley deck inside the rear bay, clear of the low side crossmembers.
    b([-f.W - R.deck.depth, -(half - f.T / 2 - 12), 20], [-f.W - 12, half - f.T / 2 - 12, R.deck.h]),
    // Rhino 3x6 upright and its plate posts behind the rear crossmember.
    b([R.rhino.u0, -R.rhino.half, inch(2)], [R.rhino.u1 + R.rhino.post, R.rhino.half + inch(3), l.top - inch(10)]),
    ...l.sides.flatMap(s => [
      // INDY shroud: the part outboard of the posts' outer faces (inside, it shares the side plane with the crossmembers
      // and the rack's own safeties), between the low and top side crossmembers.
      b([l.stackU - R.stack.shroud / 2, Math.min(s * (half + f.T / 2 + 2), s * (half + R.stack.out)), inch(8)], [l.stackU + R.stack.shroud / 2, Math.max(s * (half + f.T / 2 + 2), s * (half + R.stack.out)), l.top - inch(12)]),
      // Swivel trolley pulley outboard of the front upright.
      b([l.front - inch(3), Math.min(s * (half + f.T / 2 + 20), s * (half + f.T / 2 + inch(7))), l.trolleyZ - inch(5)], [l.front + inch(3), Math.max(s * (half + f.T / 2 + 20), s * (half + f.T / 2 + inch(7))), l.trolleyZ + inch(3)]),
    ]),
  ];
}
export const ROGUE_RHINO_INDY = defineRackPart({
  id: 'rogue-monster-rhino-indy-trainer', name: 'Rogue Monster Rhino + INDY Functional Trainer', title: 'Rogue Monster Rhino + INDY Functional Trainer', noun: 'functional trainer', section: 'Digital & cable',
  description: 'Monster rack bundle: Rhino belt-squat unit in the rear bay (7 in pulley deck, 3x6 upright with plate posts, top angle crossmembers, lever handles), a 300 lb 2:1 INDY stack behind shrouds in each side of the rear bay, top pulley plates and swivel trolleys on the front uprights · 92 / 102 in, 53 in wide. ' + DESCRIPTION_END('Rogue Fitness'),
  params: [
    { key: 'sides', label: 'INDY stacks', default: 0, options: [0, 1, 2], format: v => RHINO_SIDES[v] ?? String(v) },
    { key: 'trolley', label: 'Trolley height', default: 2, options: RHINO_TROLLEY.map((_, i) => i), format: v => `${RHINO_TROLLEY[v] ?? v} in` },
  ],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-rhino-trainer', credit: 'Rogue Fitness — Monster Rhino + INDY Functional Trainer (IS0637)',
    trademark: 'Rogue, Monster, Rhino and INDY are trademarks of Rogue Fitness.',
    reconstruction: 'Published 92 / 102 in overall, 53 in width, rack length + 26 in, 300 lb 2:1 INDY stacks, 7 in platform, 3x6 Rhino upright, 15.75 in plate posts and 1 in hardware; layout from the IS0637 manual and configurator renders. Plate, shroud, deck, trolley and pulley-plate sizes are estimated and cable routes are simplified. The trainer follows the actual rack height and depth; physical fit unverified.',
  },
  mount: {
    holes: [0], pin: PIN_1IN, faces: ['left', 'right'], span: 'normal', floor: { min: inch(2), max: inch(8.5) }, overTop: true,
    extent: { below: inch(8.5) + 1, above: inch(90.375) + RHINO_INDY.topPlate.h },
    validate: (rack, p) => {
      squarePost(rack, 'Rhino + INDY trainer'); rearRow(p, 'Rhino + INDY trainer');
      if (p.rowSide === 0) throw Error('The Rhino + INDY trainer fills the rearmost bay: mount it on the rearmost uprights so the Rhino stands behind the rack.');
      if (p.uprightSpan === undefined || p.uprightSpan < 1120 || p.uprightSpan > 1190) throw Error('The Rhino + INDY trainer fits Monster racks with 43 in between the uprights: mount it on a rear upright facing its partner across a 43 in rack.');
      if ((p.columnReach ?? inch(46)) < inch(26)) throw Error('The Rhino + INDY trainer needs front uprights ahead of the rear bay for its trolleys, so it does not fit a two-post stand.');
    },
  },
  bodies: rhinoBodies,
  placement: { height: inch(4.5), face: 'inside' },
  context: ['holeHeight', 'rackHeight', 'acrossOut', 'rowSide', 'columnReach'],
});

// ─── Fringe Sport The Dane 2.0 dual stacks ───────────────────────────────────────────────────────────────────────────
/** The Dane 2.0 is a 4-post half rack whose two 160 lb 1:1 stacks sit inside the side frames, between each rear and front
 * upright; the cable runs up to a pulley housing on the side top crossmember, forward to the front upright and down to a
 * swivel trolley. Published: 60 x 47 x 92 in overall (33 in without the extension feet), 89 in 3x3 11 ga uprights, 1 in
 * holes on 2 in, 2 x 160 lb stacks in 10 lb steps with a 5 lb top plate, 1:1, 5.8 ft travel, aluminium pulleys, red
 * accents. Estimated from Fringe's side-on render (19.5 px/in) and photos: plate 15.5 x 4 x 0.7 in, stack centre 12.5 in
 * ahead of the rear upright, housing 24 x 6 in, extension feet 22 in (research notes). */
export const DANE = {
  stack: { centre: inch(12.5), along: inch(15.5), across: inch(4), t: inch(0.7), n: 16, head: inch(1.4), z0: inch(8.5), rodSep: inch(17) },
  housing: { from: inch(8), below: inch(2.5), above: inch(3.5), pulley: inch(4.5) }, trolley: { h: inch(7.5), pulley: inch(4.5) },
  feet: { reach: inch(22), level: inch(12), rise: inch(7), w: inch(2), h: inch(3) }, float: { z: inch(42), dia: inch(3.5) },
} as const;
export const DANE_TROLLEY = [16, 28, 36, 44, 56, 68] as const;
export function daneLayout(p: NumericParams) {
  const T = p.upright ?? 75, W = p.uprightWidth ?? T, o = p.acrossOut === -1 ? -1 : 1, hh = p.holeHeight ?? inch(6.5);
  const span = p.uprightSpan ?? inch(33), top = (p.rackHeight ?? inch(89)) - hh, floor = -hh;
  const trolleyZ = Math.min(inch(DANE_TROLLEY[p.trolley ?? 2] ?? 36), (p.rackHeight ?? inch(89)) - inch(12)) - hh;
  return { T, W, o, hh, span, top, floor, trolleyZ, stackY: DANE.stack.centre, stackTop: floor + DANE.stack.z0 + DANE.stack.n * (DANE.stack.t + 1.2) + DANE.stack.head };
}
function daneBodies(p: NumericParams): LocalBox[] {
  const l = daneLayout(p), D = DANE, box = (min: Vec3, max: Vec3): LocalBox => ({ min, max }), sx = (a: number, b: number) => [Math.min(l.o * a, l.o * b), Math.max(l.o * a, l.o * b)];
  const [x0, x1] = sx(-D.stack.across / 2, D.stack.across / 2), [px0, px1] = sx(l.W / 2 + 20, l.W / 2 + inch(6));
  return [
    // Lower weight stack (to 18.5 in): the plates reach about 22 in, so a box safety pinned low in the same side plane
    // would really touch the top plates; the body stops short so the rack's default safeties can stay (research notes).
    box([x0, l.stackY - D.stack.along / 2, l.floor + D.stack.z0], [x1, l.stackY + D.stack.along / 2, Math.min(l.stackTop, l.floor + inch(18.5))]),
    // Swivel trolley pulley outboard of the front upright.
    box([px0, l.span - inch(3), l.trolleyZ - inch(5)], [px1, l.span + inch(3), l.trolleyZ + inch(3)]),
    // Extension foot ahead of the front upright.
    box([-D.feet.w / 2, l.span + l.T / 2 + 10, l.floor + 5], [D.feet.w / 2, l.span + D.feet.reach - 10, l.floor + D.feet.rise + D.feet.h / 2]),
  ];
}
export const FRINGE_DANE_STACKS = defineRackPart({
  id: 'fringe-sport-dane-2-cable-stacks', name: 'Fringe Sport The Dane 2.0 cable stacks', title: 'Fringe Sport The Dane 2.0 dual 160 lb stacks', noun: 'cable stack', section: 'Digital & cable',
  description: 'The functional-trainer half of The Dane 2.0: a 160 lb 1:1 stack inside each side frame on chrome guide rods, FRINGE SPORT pulley housing on the side top crossmember, figure-8 floating pulley, low pulley, swivel trolley with a red aluminium pulley on the front upright and the extension feet · sold with The Dane 2.0 rack (60 x 47 x 92 in). ' + DESCRIPTION_END('Fringe Sport'),
  params: [
    { key: 'trolley', label: 'Trolley height', default: 2, options: DANE_TROLLEY.map((_, i) => i), format: v => `${DANE_TROLLEY[v] ?? v} in` },
    { key: 'pin', label: 'Pinned weight', default: 5, options: Array.from({ length: 16 }, (_, i) => i), format: v => `${10 + 10 * v} lb` },
  ],
  vendor: {
    vendor: 'Fringe Sport', url: 'https://www.fringesport.com/products/the-dane-2-0', credit: 'Fringe Sport — The Dane 2.0 (Rack-FS-3x3-30-HRack-V2)',
    trademark: 'Fringe Sport and The Dane are trademarks of Fringe Sport.',
    reconstruction: 'Published 60 x 47 x 92 in overall, 89 in uprights, 2 x 160 lb 1:1 stacks in 10 lb steps with a 5 lb top plate and 5.8 ft of cable travel. Plate, housing, trolley, floating-pulley and extension-foot sizes are estimated from Fringe renders scaled to the published dimensions; cable routes are simplified. Follows the actual rack height and depth; physical fit unverified.',
  },
  mount: {
    holes: [0], pin: PIN_1IN, faces: ['front'], span: 'normal', floor: { min: inch(4), max: inch(12) }, overTop: true,
    extent: { below: inch(12) + 1, above: inch(89) + DANE.housing.above },
    validate: (rack, p) => {
      squarePost(rack, 'Dane 2.0 cable stack');
      if (p.uprightSpan === undefined || p.uprightSpan < inch(24) || p.uprightSpan > inch(40)) throw Error('The Dane 2.0 stack stands between a rear upright and the front upright 30 in ahead of it: mount it on a rear upright\'s front face with a front upright 24–40 in away, or it does not fit.');
    },
  },
  bodies: daneBodies,
  pair: { default: true },
  placement: { height: inch(6.5), face: 'front' },
  context: ['holeHeight', 'rackHeight', 'acrossOut'],
});

export const PARTS = [REP_SELECTORIZED_LAT, REP_PLATE_LAT, ROGUE_RHINO_INDY, FRINGE_DANE_STACKS] as const satisfies readonly RackPart[];
