/** Coop's new basement gym (#194, v2 #201): Coop (Cooper Mitchell) of Garage Gym Reviews, from his May 2026 build tour
 * "I'm Building The Home Gym Of My Dreams!" (https://www.youtube.com/watch?v=QCfulhfSSNo).
 *
 *   npx tsx scripts/gyms/coop-garage-gym-reviews.ts && npx tsx scripts/render-gym-previews.ts --port 5712 coop-garage-gym-reviews
 *
 * v2 rebuilds the whole room wall by wall from the tour, with the room decor family (#201) and the finishes (#200).
 *
 * Floor plan (builder floor mm; +x right, +z toward the default camera). The rig wall is the back wall; the camera looks
 * down the room from the storage-cove end, as the video does at 5:27 and 6:12. Everything is laid out from the beam line
 * (`XB`, the birch-clad beam and its lally posts that run the room's length) and the back wall (`ZB`):
 *   room        main room 8.45 × 13 m (XB − 3.9 m … XB + 4.55 m), 2.75 m ceiling (5:27, 9:42). The builder room is a
 *               rectangle, so it also takes in the storage cove: a solid wall section fills the rest of that strip.
 *   back wall   the three-bay rig with silver uprights, centred a little right of the beam (5:27, 6:12); a door and wall
 *               plate storage behind the turf end (10:10, 3:28).
 *   left side   the PLAE turf lane 30 cm off the left wall with the kids' ring and monkey-bar rig over it (0:45, 4:47,
 *               5:22); the beam, two lights and two Big Ass Fans over the turf bay (0:42, 7:00).
 *   storage cove (front-left, 3.6 × 4.8 m, behind the left wall line): the PLAE storage rack of kettlebells under the
 *               "American Made" banner on its back wall, the OmniWall pegboard beside it, attachment hangers on the front
 *               wall, and the Levrack cabinets and workbench on its rig-side return (1:16–3:20).
 *   front wall  the entrance door at the end of the turf, the PRIME dumbbells and a TV beside it (0:40, 0:55), the treadmill
 *               under the "Stay Weird" banner at the right corner (10:45–11:15).
 *   right wall  three clerestory hoppers over the birch wainscot (8:30–8:32) above the trap bar, bar holder, ladder, VKR and
 *               leg machines, a Sonos Five at each end, and the bay-window desk nook near the front (8:35–8:45).
 */
import { gymWarnings, writeGym } from './lib.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { extendUpright, connectUprights } from '../../rack-generator/graph-edits.ts';
import { addAccessory, resolveAssembly, setPlateStack, validateAssembly } from '../../rack-generator/assembly.ts';
import { addFloorItem, rackBounds } from '../../rack-generator/floor-items.ts';
import { addWallItem } from '../../rack-generator/wall-items.ts';
import { freeSlots, placeHang } from '../../rack-generator/hang-items.ts';
import { setBarLoad } from '../../rack-generator/bar-loads.ts';
import { barSpecOf, freeCradles, parkedPose } from '../../rack-generator/barbell-cradles.ts';
import { plateId, type PlateId } from '../../rack-generator/plates.ts';
import type { RackDoc, Target, NumericParams, BarLoad } from '../../rack-generator/types.ts';
import type { Room, WallId } from '../../rack-generator/walls.ts';

const Q = Math.PI / 2;
const BLACK = '#17191a';
const IN = 25.4;
const last = <T>(items: T[] | undefined) => items![items!.length - 1];

// ── Rig: one long rig across the end wall (5:27, 6:12): a rack bay each side of a middle landmine bay, silver
// (zinc-look) front uprights, black rear posts and crossmembers. Closest catalog match: a Rogue RM-3 Monster Rack 2.0
// (3×3 11 ga, 90″ tall, 30″ deep) extended to three 43″ bays.
let doc: RackDoc = applyPreset('rogue-rm-monster-2-four-2295.525-762');
const fronts = ['front-left', 'front-right'], rears = ['rear-left', 'rear-right'];
for (let bay = 1; bay < 3; bay++) {
  doc = extendUpright(doc, fronts.at(-1)!, 'right', 43 * IN);
  fronts.push(Object.keys(doc.uprights).at(-1)!);
  doc = extendUpright(doc, rears.at(-1)!, 'right', 43 * IN);
  rears.push(Object.keys(doc.uprights).at(-1)!);
  for (const level of ['upper', 'lower'] as const) doc = connectUprights(doc, fronts.at(-1)!, rears.at(-1)!, level);
}
const [, , midRight, frontRight] = fronts, rearRight = rears.at(-1)!;
doc = validateAssembly(doc);

// ── Room ──────────────────────────────────────────────────────────────────────────────────────────────────────
const rig = rackBounds(doc)!;
/** Beam line (x) and back wall (z): the rig's left upright stands 0.6 m right of the beam, its rear posts 150 mm off the wall. */
const XB = rig.min[0] + 600, ZB = rig.min[1] - 150;
const X0 = XB - 3900, X1 = XB + 4550, LENGTH = 13000, ZF = ZB + LENGTH, HEIGHT = 2750;
const COVE = { depth: 3600, width: 4800 }, XC = X0 - COVE.depth, ZC = ZF - COVE.width;
const ROOM = { back: -ZB, left: -XC, right: X1, front: ZF, height: HEIGHT };
/** The birch wainscot covers the foundation stem wall: about 1.5 m, with the clerestory windows right above it (8:32). */
const WAINSCOT = 1500;
const TURF = { x: X0 + 300 + 925, z0: ZB + 1500, z1: ZF - 500 };
/** Finishes (#200): white drywall over a 1.5 m birch plywood wainscot on the rig and window walls (5:27, 9:42), plain
 * white drywall on the front wall and in the storage cove (0:55, 1:27, 3:00), PLAE grey-fleck rubber (4:40), the PLAE
 * turf sprint lane with hash marks and PLAE lettering running along the lane (4:42–5:17), and a white ceiling. The
 * ceiling's light rows are replaced by the decor family's linear LEDs at their real positions. */
const FINISHES: Pick<Room, 'walls' | 'floor' | 'turf' | 'ceiling'> = {
  walls: { finish: 'wainscot', color: '#f2f1ec', wainscot: WAINSCOT, overrides: { front: { finish: 'drywall', color: '#f2f1ec' }, left: { finish: 'drywall', color: '#f2f1ec' } } },
  floor: 'grey-fleck',
  turf: [{ position: [TURF.x, (TURF.z0 + TURF.z1) / 2], size: [1850, TURF.z1 - TURF.z0], lines: true, text: 'PLAE', textRotation: 90 }],
  ceiling: { color: '#f4f4f1' },
};
doc.room = { ...ROOM, ...FINISHES };
doc.appearance = {
  ...doc.appearance, frameColor: BLACK,
  finishOverrides: Object.fromEntries(fronts.map(id => [id, 'clear-grind' as const])),
};

const attach = (part: string, target: Partial<Target>, paired = true, params: NumericParams = {}) => {
  const before = new Set(doc.accessories.map(a => a.id));
  doc = addAccessory(doc, part, target, paired, params);
  return doc.accessories.find(a => !before.has(a.id))!.id;
};
/** Keeps an attachment only where it validates and adds no builder warning. */
const tryAttach = (part: string, targets: Partial<Target>[], paired = true, quiet = false) => {
  for (const target of targets) {
    const saved = doc, warnings = gymWarnings(doc).length;
    try { const id = attach(part, target, paired); if (gymWarnings(doc).length === warnings) return id; } catch { /* try the next target */ }
    doc = saved;
  }
  if (!quiet) console.warn(`  could not place ${part}`);
  return undefined;
};
// Left bay: J-cups at squat height with spotter arms. Middle bay: a landmine low down. Right bay: J-cups and strap
// safeties (the paired placement mirrors across the first bay, so the other bays' cups go on one at a time).
tryAttach('rogue-monster-sandwich-j-cup', [{ uprightId: 'front-left', face: 'front', hole: 24 }, { uprightId: 'front-left', face: 'front', hole: 22 }]);
tryAttach('rogue-monster-spotter-arms-2', [{ uprightId: 'front-left', face: 'front', hole: 12 }, { uprightId: 'front-left', face: 'front', hole: 10 }]);
for (const hole of [22, 20, 18]) {
  const saved = doc;
  if ([midRight, frontRight].every(uprightId => tryAttach('rogue-monster-sandwich-j-cup', [{ uprightId, face: 'front', hole }], false, true))) break;
  doc = saved;
}
{ // Strap safeties down both sides of the right bay; off the corner posts the pair needs an explicit matching upright.
  const saved = doc, warnings = gymWarnings(doc).length;
  try {
    const next = structuredClone(doc);
    next.accessories.push({ id: `accessory-${next.nextId++}`, part: 'rogue-monster-strap-safety-2', target: { uprightId: midRight, face: 'right', hole: 14 }, paired: true, pairTo: frontRight, params: {} });
    doc = validateAssembly(next);
    if (gymWarnings(doc).length !== warnings) throw Error(gymWarnings(doc).slice(warnings).join('; '));
  } catch (e) { doc = saved; console.warn(`  could not place the strap safeties: ${e}`); }
}
tryAttach('rogue-monster-landmine-2', [{ uprightId: 'front-right', face: 'front', hole: 1 }, { uprightId: midRight, face: 'front', hole: 1 }], false);
// Plate horns on the outside of the end posts, stacked with colour bumpers.
const color = (w: number): PlateId => plateId('rogue-color-echo', String(w));
for (const [uprightId, face, hole, plates] of [
  ['rear-left', 'left', 6, [color(45), color(45), color(35)]],
  ['rear-left', 'left', 16, [color(25), color(25), color(10)]],
  [rearRight, 'right', 6, [color(55), color(45), color(45)]],
  [rearRight, 'right', 16, [color(35), color(25), color(15)]],
] as const) {
  const pin = tryAttach('storage-pin-long', [{ uprightId, face, hole }, { uprightId, face, hole: hole + 2 }], false);
  if (pin) doc = setPlateStack(doc, pin, plates);
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────────────────────
/** A floor item at floor [x, z]; rotation 0 faces +z (the front), −Q faces −x (off the right wall), Q faces +x. */
const floor = (part: string, x: number, z: number, rotation = 0, params: NumericParams = {}, pair = false) => {
  doc = addFloorItem(doc, part, [x, z], pair);
  const items = doc.floorItems!.slice(pair ? -2 : -1);
  for (const item of items) { item.rotation = rotation; Object.assign(item.params, params); }
  return items[0].id;
};
/** Racks a bar in the best free cradle (working J-cups first), as the builder's placement does. */
const park = (part: string, load?: BarLoad) => {
  const id = floor(part, 0, 3000);
  const item = doc.floorItems!.find(i => i.id === id)!;
  const [cradle] = freeCradles(resolveAssembly(doc), doc.floorItems, id, barSpecOf(item)).sort((a, b) => +(a.kind === 'storage') - +(b.kind === 'storage') || b.center[2] - a.center[2]);
  if (!cradle) throw Error(`No free cradle for ${part}`);
  const { position } = parkedPose(cradle, barSpecOf(item));
  Object.assign(item, { cradle: cradle.key, position: [position[0], -position[1]], rotation: cradle.yaw });
  if (load) doc = setBarLoad(doc, id, load);
  return id;
};
const midX = (ROOM.right - ROOM.left) / 2, midZ = (ROOM.front - ROOM.back) / 2;
/** `along` is the floor coordinate (x on the back/front walls, z on the side walls) of the item's centre. */
function wall(part: string, wallId: WallId, along: number, h: number, params: NumericParams = {}) {
  const u = wallId === 'back' ? along - midX : wallId === 'front' ? midX - along : wallId === 'left' ? midZ - along : along - midZ;
  doc = addWallItem(doc, part, { wall: wallId, position: [u, h] });
  const item = last(doc.wallItems);
  item.params = { ...item.params, ...params };
  return item.id;
}
const DOOR_H = (80 * IN + 64) / 2;
const ceiling = { ceiling: HEIGHT };

// ── Structure and ceiling (0:42, 5:22–6:15, 7:00–7:20, 10:05–10:35) ─────────────────────────────────────────────
// The birch-clad beam down the whole room on three black lally posts.
floor('decor-birch-beam', XB, ZB + LENGTH / 2, Q, { length: LENGTH, width: 400, drop: 350, ...ceiling });
for (const z of [ZB + 2700, ZB + 6600, ZB + 10500]) floor('decor-lally-post', XB, z, 0, { height: HEIGHT - 350, diameter: 0 });
// Linear LEDs: two runs in the turf bay either side of the fans, two in the main bay, one in the cove.
for (const x of [XB - 2050, XB - 550, XB + 950, X1 - 1300]) floor('he-williams-linear-led', x, ZB + 6600, Q, { sections: 9, ...ceiling });
floor('he-williams-linear-led', XC + 1500, ZF - 2400, Q, { sections: 2, ...ceiling });
// Two black 72″ Big Ass Fans i6 between the turf-bay lights.
for (const z of [ZB + 3800, ZB + 8600]) floor('big-ass-fans-i6', XB - 1300, z, 0, { diameter: 1, blades: 1, downrod: 0, ...ceiling });
// The kids' monkey-bar course: a birch board over the turf with rings on blue straps, green bars on lime straps and a rope.
floor('decor-ceiling-rig', TURF.x, ZB + 5300, Q, { stations: 10, spacing: 700, layout: 2, hang: 1950, rope: 1, ...ceiling });
// The storage cove is outside the main room's left wall line: a solid wall section (plain drywall, as at 4:53 and 4:48)
// fills the builder room behind it.
floor('decor-wall-section', X0 - COVE.depth / 2, (ZB + ZC) / 2, Q, { length: ZC - ZB, thickness: COVE.depth, height: HEIGHT, finish: 0, wainscot: 1220 });

// ── Back wall: the rig, a door behind the turf end, plate storage beside it (3:28, 6:12, 10:10) ─────────────────
park('rogue-ohio-power-bar');
park('rep-safety-squat-bar');
floor('rogue-monster-utility-bench-2', rig.min[0] + 560, rig.max[1] + 700);
wall('decor-interior-door', 'back', X0 + 950, DOOR_H, { width: 32, open: 0 });
wall('rep-wall-mounted-plate-storage', 'back', XB - 1250, 1100, { variant: 0, loaded: 2 });
wall('bells-of-steel-change-plate-pegs', 'back', XB - 1250, 1750, { version: 1, loaded: 1 });

// ── Right wall: clerestory hoppers, Sonos Fives, the bay-window nook; bars and machines below (8:30–8:45) ───────
const BAY = { z0: ZF - 500 - 4200, width: 4200, depth: 1100 };
for (const z of [ZB + 2750, ZB + 4750, ZB + 6650]) wall('decor-window', 'right', z, 2040, { style: 0, width: 48, height: 22 });
wall('sonos-five-wall-mount', 'right', ZB + 900, 2150);
wall('sonos-five-wall-mount', 'right', BAY.z0 - 180, 2150);
wall('decor-bay-window', 'right', BAY.z0 + BAY.width / 2, 2450 / 2, { width: BAY.width, depth: BAY.depth, mouth: 2450, sill: 900, head: 2200 });
floor('decor-birch-desk', X1 + 650, BAY.z0 + BAY.width / 2, -Q, { width: 2, monitor: 1 });
const rightX = (depth: number) => X1 - depth / 2 - 60;
floor('rep-open-trap-bar', rightX(700), ZB + 1250, Q);
floor('titan-barbell-storage-holder', rightX(305), ZB + 2650, -Q, { loaded: 3 });
floor('decor-step-ladder', rightX(700), ZB + 3900, -Q, { height: 1 });
floor('tog-selectorized-leg-extension-seated-curl-v3', X1 - 850, ZB + 5000, -Q);
floor('force-usa-compact-leg-press-hack-squat', X1 - 1300, BAY.z0 - 1600, -Q);

// ── Front wall: entrance door, dumbbells and TV, treadmill under "Stay Weird" (0:40, 0:55, 10:45–11:15) ─────────
wall('decor-interior-door', 'front', X0 + 900, DOOR_H, { width: 32, open: 0 });
floor('rogue-3-tier-dumbbell-rack', X0 + 2600, ZF - 450, Math.PI, { loaded: 2 });
wall('decor-wall-tv', 'front', X0 + 2600, 2000, { size: 2 });
floor('rep-arcadia-functional-trainer', XB + 1300, ZF - 800, Math.PI);
floor('titan-plate-loaded-lat-pulldown', XB + 2300, ZB + 8000, -Q);
wall('decor-banner-stay-weird', 'front', X1 - 1250, 1750);
wall('sonos-five-wall-mount', 'front', X1 - 250, 2150);
floor('assaultrunner-pro', X1 - 1250, ZF - 1100, 0);

// ── Storage cove (1:16–3:20) ────────────────────────────────────────────────────────────────────────────────────
// Back wall: the PLAE 3×3 rack of colour-banded kettlebells under the "American Made" banner, the OmniWall pegboard.
floor('plae-3x3-storage-rack', XC + 330, ZF - 1450, Q, { loaded: 1, pegs: 1 });
wall('decor-banner-american-made', 'left', ZF - 1450, 2400);
wall('wall-control-pegboard', 'left', ZC + 1300, 1450, { size: 2, panels: 3, color: 0 });
// Front wall inside the cove: the wall-hung rack attachment holders and the kids' step stool.
wall('rogue-multi-use-hanger', 'front', XC + 1150, 1800);
wall('rogue-multi-use-hanger', 'front', XC + 1150, 1150);
floor('decor-step-stool', XC + 1150, ZF - 250, Math.PI, { steps: 2 });
// Rig-side return: the Levrack cabinets deep in the cove, the workstation and its overhead frame at the cove mouth.
floor('levrack-mobile-storage', XC + 1143, ZC + 400, 0, { length: 0, depth: 0, height: 0 });
floor('levrack-workstation', X0 - 660, ZC + 400, 0, { length: 0, drawers: 2, slatwall: 2 });
floor('levrack-overhead-frame', X0 - 660, ZC + 400, 0, { length: 0, depth: 0, height: 0, light: 1 });
for (const part of [
  'rep-lat-bar-48', 'rogue-stainless-straight-lat-bar-20', 'mag-wide-grip', 'mag-medium-grip-neutral', 'mag-close-grip-neutral',
  'rep-tricep-rope', 'rogue-rotating-v-grip', 'rep-d-handles', 'rogue-ankle-cuff', 'spud-long-ab-strap', 'generic-daisy-chains',
  'rogue-monster-band-1', 'rogue-monster-band-2', 'rogue-monster-band-3', 'rep-wood-gymnastic-rings', 'rogue-ohio-lifting-straps',
]) {
  const [slot] = freeSlots(doc, part);
  if (slot) doc = placeHang(doc, part, slot);
  else console.warn(`  no free hook for ${part}`);
}

writeGym({
  slug: 'coop-garage-gym-reviews',
  title: 'Coop’s Basement Gym',
  owner: 'Coop · Garage Gym Reviews',
  sourceUrl: 'https://www.youtube.com/watch?v=QCfulhfSSNo',
  summary:
    'Coop’s brand-new ~1,300 sq ft basement gym from his Garage Gym Reviews build tour, rebuilt wall by wall: a long, bright room with white walls over birch plywood, grey-fleck PLAE rubber and a turf sprint lane under a kids’ monkey-bar course, a birch-clad beam on steel posts, linear lights and Big Ass Fans, a long silver-upright rig on the end wall, clerestory windows over the machines, a bay-window desk nook, and a storage cove of kettlebells, cable attachments and Levrack cabinets.',
  highlights: [
    'About 1,300 sq ft of finished basement',
    'Three-bay rig across the end wall',
    'PLAE turf lane under a ring and monkey-bar rig',
    'Storage cove: PLAE rack, pegboard, Levrack',
    'Six new windows and high-CRI linear lights',
  ],
  equipment: [
    'Two racks joined by a middle landmine bay across the end wall, silver uprights and black crossmembers (closest match: a Rogue RM-3 Monster Rack 2.0 extended to three 43″ bays) with J-cups, spotter arms, strap safeties, a landmine and plate horns',
    'Wall-mounted bumper and change-plate pegs beside the rig (closest match: REP Wall Mounted Plate Storage and Bells of Steel change plate pegs)',
    'Colour bumper plates (closest match: Rogue Color Echo)',
    'Power bar and safety squat bar (closest match: Rogue Ohio Power Bar and REP Safety Squat Bar), open trap bar, EZ and straight bars in a vertical bar holder (closest match: REP open trap bar, Titan vertical holder)',
    'Flat utility bench (closest match: Rogue Monster Utility Bench 2.0)',
    'Leg extension / curl, vertical knee raise and a leg press on the window wall (closest match: Temple of Gainz leg extension + seated curl, REP dip station, Force USA compact leg press / hack squat)',
    'PRIME plate-loaded and cable machines (closest match: Titan plate-loaded lat pulldown and REP Arcadia functional trainer)',
    'Curved treadmill under the “Stay Weird” banner (closest match: AssaultRunner Pro)',
    'PRIME round urethane dumbbells on a rack by the door, with a wall TV (closest match: Rogue 3-Tier Dumbbell Rack with Rogue urethane 5–75 lb)',
    'PLAE 3×3 11-gauge storage rack of colour-banded kettlebells under an “American Made” banner',
    'OmniWall pegboard with cable attachments, bands, rings and straps (closest match: black Wall Control pegboard), and wall-hung rack attachment storage (closest match: Rogue Multi-Use Hangers)',
    'Levrack mobile cabinets, a Levrack Workstation with drawers and slatwall, and an overhead frame',
    'Kids’ monkey-bar course: wooden rings and green bars on straps from a birch board, and a climbing rope',
    'Birch-clad beam on steel lally posts, H.E. Williams linear LED lights, two Big Ass Fans i6, Sonos Five speakers',
    'Three clerestory windows and a bay-window desk nook with a picture window',
    'PLAE Achieve 18 mm grey-fleck rolled rubber, a PLAE turf sprint lane with hash marks and lettering, white walls over a birch plywood wainscot and a white ceiling (room finishes)',
  ],
  doc,
});
