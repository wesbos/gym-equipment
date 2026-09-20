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
/** Refuse front-row posts: these machines stand behind the rack (or use the rear bay). */
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

export const PARTS = [REP_SELECTORIZED_LAT, REP_PLATE_LAT] as const satisfies readonly RackPart[];
