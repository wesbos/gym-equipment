/** Coop's new basement gym (#194): Coop (Cooper Mitchell) of Garage Gym Reviews, from his May 2026 build tour
 * "I'm Building The Home Gym Of My Dreams!" (https://www.youtube.com/watch?v=QCfulhfSSNo).
 *
 *   npx tsx scripts/gyms/coop-garage-gym-reviews.ts && npx tsx scripts/render-gym-previews.ts --port 5712 coop-garage-gym-reviews
 *
 * The video is a build tour (the full equipment reveal is promised for a later video), so the equipment and layout
 * come from the finished-room shots (timestamps below). The room is a long ~1,300 sq ft basement with a birch-clad
 * beam and steel posts down its length, white walls over a birch plywood wainscot and grey-fleck PLAE rubber (all
 * shown with the room finishes below; the beam and posts are not).
 *
 * Floor plan (builder floor mm; +x right, +z toward the default camera). The rig wall is the back wall, so the
 * default view looks down the room from the storage-cove end, as the video does at 5:27 and 6:12.
 *   back wall   the three-bay rig with silver uprights (3:28, 5:27, 6:12), plate pegs on the wall beside it (3:28).
 *   left side   the PLAE turf sprint lane under the kids' monkey-bar course (0:45, 4:47, 5:17), as a turf finish.
 *   left wall   the Prime dumbbell rack, door and wall-hung attachment storage (3:10); the storage cove's kettlebell
 *               shelving and OmniWall pegboard at the front-left corner (1:27, 2:25, 3:00).
 *   right wall  the window wall: trap bar, vertical bar holder, leg extension/curl and the plate-loaded Prime
 *               machines (4:27, 8:32); the treadmill under the "Stay Weird" flag at the front-right corner (10:52).
 * Room ~8.5 × 13 m (28 × 43 ft, about 1,190 sq ft; the cove makes up the rest of his ~1,300), ~2.75 m ceiling. */
import { gymWarnings, writeGym } from './lib.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { extendUpright, connectUprights } from '../../rack-generator/graph-edits.ts';
import { addAccessory, resolveAssembly, setPlateStack, validateAssembly } from '../../rack-generator/assembly.ts';
import { addFloorItem } from '../../rack-generator/floor-items.ts';
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

// ── Room ──────────────────────────────────────────────────────────────────────────────────────────────────────
const ROOM = { back: 600, left: 4200, right: 4300, front: 12400, height: 2750 };
/** Finishes (#200): white drywall over a 4 ft birch plywood wainscot on the rig, window and dumbbell walls (5:27, 9:42),
 * plain white drywall in the storage cove at the front (1:27, 3:00), PLAE grey-fleck rubber (4:40), the PLAE turf
 * sprint lane with its hash marks and PLAE lettering down the left side under the monkey bars (4:42, 4:47, 5:02, 5:17),
 * and a white ceiling with long linear lights running the length of the room (0:02, 5:27, 5:30). */
const FINISHES: Pick<Room, 'walls' | 'floor' | 'turf' | 'ceiling'> = {
  walls: { finish: 'wainscot', color: '#f2f1ec', wainscot: 1220, overrides: { front: { finish: 'drywall', color: '#f2f1ec' } } },
  floor: 'grey-fleck',
  turf: [{ position: [-2300, 6400], size: [1850, 10000], lines: true, text: 'PLAE' }],
  ceiling: { color: '#f4f4f1', lights: { count: 4, along: 'z' } },
};
const midX = (ROOM.right - ROOM.left) / 2, midZ = (ROOM.front - ROOM.back) / 2;

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

// ── Floor ─────────────────────────────────────────────────────────────────────────────────────────────────────
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
// Bars in the rig: a power bar in one bay, the safety squat bar he squats with at 3:28 in the other.
park('rogue-ohio-power-bar');
park('rep-safety-squat-bar');
// Flat utility bench squared up to the left bay.
floor('rogue-monster-utility-bench-2', 0, 1350);

// Right (window) wall, back to front (8:32): trap bar on the floor, vertical bar holder with EZ and straight bars,
// the leg extension/curl, then the plate-loaded Prime machines seen at 4:27.
const rightX = (depth: number) => ROOM.right - depth / 2 - 60;
floor('rep-open-trap-bar', rightX(700), 700, Q);
floor('titan-barbell-storage-holder', rightX(305), 2400, -Q, { loaded: 3 });
floor('tog-selectorized-leg-extension-seated-curl-v3', ROOM.right - 800, 4300, -Q);
// By the bay window: the treadmill under the "Stay Weird" flag (10:52).
floor('assaultrunner-pro', rightX(1770), 6300, Q);
floor('titan-plate-loaded-lat-pulldown', ROOM.right - 900, 8500, -Q);
floor('force-usa-compact-leg-press-hack-squat', ROOM.right - 1000, 10100, -Q);
floor('rep-arcadia-functional-trainer', rightX(910), 11600, -Q);

// Left wall, toward the storage cove (3:10): the Prime round urethane dumbbells on a three-tier rack.
const leftX = (depth: number) => -ROOM.left + depth / 2 + 60;
floor('rogue-3-tier-dumbbell-rack', leftX(762), 7800, Q, { loaded: 2 });
// Storage cove (front-left corner): the PLAE 3×3 storage shelving full of banded kettlebells (1:27, 3:00).
floor('rep-kettlebell-rack-2', leftX(590), 11200, Q, { tiers: 1, loaded: 2 });

// ── Walls ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** `along` is the floor coordinate (x on the back/front walls, z on the side walls) of the item's centre. */
function wall(part: string, wallId: WallId, along: number, h: number, params: NumericParams = {}) {
  const u = wallId === 'back' ? along - midX : wallId === 'front' ? midX - along : wallId === 'left' ? midZ - along : along - midZ;
  doc = addWallItem(doc, part, { wall: wallId, position: [u, h] });
  const item = last(doc.wallItems);
  item.params = { ...item.params, ...params };
  return item.id;
}
// Back wall beside the rig: bumper and change-plate pegs (3:28).
wall('rep-wall-mounted-plate-storage', 'back', -1500, 1100, { variant: 0, loaded: 2 });
wall('bells-of-steel-change-plate-pegs', 'back', -2300, 1300, { version: 1, loaded: 1 });
// Its upper shelves carry bars on horizontal pegs (1:27): closest, a Rogue 3 Bar Gun Rack above the shelving.
wall('rogue-3-bar-gun-rack', 'left', 11350, 1750, { loaded: 3 });
// Left wall past the door: wall-hung attachment storage (3:10).
wall('rogue-multi-use-hanger', 'left', 9300, 1900);
wall('rogue-multi-use-hanger', 'left', 9300, 1300);
// Storage cove: the OmniWall pegboard (closest: black Wall Control, three 48″ × 16″ panels) on the front wall.
wall('wall-control-pegboard', 'front', -3400, 1400, { size: 2, panels: 3, color: 0 });
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
    'Coop’s brand-new ~1,300 sq ft basement gym from his Garage Gym Reviews build tour: a long, bright room with white walls over birch plywood, grey-fleck PLAE rubber and a turf sprint lane, a long silver-upright rig on the end wall, plate-loaded and cable machines down the window wall, and a storage cove of kettlebells and cable attachments. The rig is shown as an extended Rogue Monster 2.0; the monkey bars and Lever Rack cabinets are not in the catalog.',
  highlights: [
    'About 1,300 sq ft of finished basement',
    'Three-bay rig across the end wall',
    'PLAE Achieve 18 mm rubber, turf sprint lane',
    'Storage cove: kettlebells and a pegboard of handles',
    'Six new windows and high-CRI linear lights',
  ],
  equipment: [
    'Two racks joined by a middle landmine bay across the end wall, silver uprights and black crossmembers (closest match: a Rogue RM-3 Monster Rack 2.0 extended to three 43″ bays) with J-cups, spotter arms, strap safeties, a landmine and plate horns',
    'Wall-mounted bumper and change-plate pegs beside the rig (closest match: REP Wall Mounted Plate Storage and Bells of Steel change plate pegs)',
    'Colour bumper plates (closest match: Rogue Color Echo)',
    'Power bar and safety squat bar (closest match: Rogue Ohio Power Bar and REP Safety Squat Bar), open trap bar, EZ and straight bars in a vertical bar holder (closest match: REP open trap bar, Titan vertical holder)',
    'Flat utility bench (closest match: Rogue Monster Utility Bench 2.0)',
    'Leg extension / curl on the window wall (closest match: Temple of Gainz selectorized leg extension + seated curl)',
    'PRIME plate-loaded and cam cable machines (closest match: Titan plate-loaded lat pulldown, REP Arcadia functional trainer, Force USA compact leg press / hack squat)',
    'Curved treadmill under the “Stay Weird” flag (closest match: AssaultRunner Pro)',
    'PRIME round urethane dumbbells on a three-tier rack (closest match: Rogue 3-Tier Dumbbell Rack with Rogue urethane 5–75 lb)',
    'PLAE 3×3 11-gauge storage rack full of colour-banded kettlebells (closest match: REP Kettlebell Rack 2.0 with REP kettlebells)',
    'OmniWall pegboard with cable attachments, bands, rings and straps (closest match: black Wall Control pegboard)',
    'Wall-hung rack attachment storage by the door (closest match: Rogue Multi-Use Hangers)',
    'PLAE Achieve 18 mm grey-fleck rolled rubber and a PLAE turf sprint lane with hash marks and lettering, white walls over a birch plywood wainscot and a white ceiling with long linear lights (shown as the builder’s room finishes)',
    'Not placed: Lever Rack (Levrack) storage cabinets and workbench, kids’ monkey-bar course and rings under the beam, Sorinex machine beside the kettlebells, hip thrust / plate-loaded machine and vertical knee raise on the window wall, Big Ass Fans, Sonos Five speakers, birch-clad beam and posts, and the desk in the bay-window cove',
  ],
  doc,
});
