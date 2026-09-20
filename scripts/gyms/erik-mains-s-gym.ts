/** Erik Mains's Gym (https://gymradar.com/gym/erik-mains-s-gym), recreated for the gym gallery (#184).
 *
 *   npx tsx scripts/gyms/erik-mains-s-gym.ts && npx tsx scripts/render-gym-previews.ts erik-mains-s-gym
 *
 * The January 2026 building: a long, narrow 13 × 42 ft steel building (about 3960 × 12800 mm, ~2400 mm ceiling).
 * Here the rack's wall is the room's back wall, so the long axis runs left → right: the entry end with the painted
 * platform is on the left, the graffiti "MUSIC" mural end on the right. The folding rack is bolted to the long wall
 * facing across the aisle, with plate-loaded machines and plate trees down both long walls. */
import { writeGym } from './lib.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { addAccessory, resolveAssembly, setPlateStack } from '../../rack-generator/assembly.ts';
import { addFloorItem } from '../../rack-generator/floor-items.ts';
import { addWallItem } from '../../rack-generator/wall-items.ts';
import { freeSlots, placeHang } from '../../rack-generator/hang-items.ts';
import { setBarLoad } from '../../rack-generator/bar-loads.ts';
import { barSpecOf, freeCradles, parkedPose } from '../../rack-generator/barbell-cradles.ts';
import { plateId, type PlateId } from '../../rack-generator/plates.ts';
import type { RackDoc, Vec2, NumericParams, BarLoad } from '../../rack-generator/types.ts';
import type { WallId } from '../../rack-generator/walls.ts';

// Room: rack wall = back wall. The fold-back rack's brackets sit ~533 mm behind the rack origin; the builder's
// closest allowed back wall is 600 mm.
const ROOM = { back: 600, front: 3360, left: 5400, right: 7400, height: 2400 };
const backWallZ = -ROOM.back, frontWallZ = ROOM.front;
const midX = (ROOM.right - ROOM.left) / 2, midZ = (ROOM.front - ROOM.back) / 2;

// Titan T-3 Series *folding* power rack → closest catalog match: Rogue RML-3W fold-back wall rack, 41.5″ deep
// (same fold-back wall-mount layout, ~90″ tall, black; T-3 folding is 2×3 tubing, the RML-3W 3×3).
let doc: RackDoc = applyPreset('rogue-rml-3w-wall-2295.525-1054.1');
doc.room = ROOM;

const last = <T>(items: T[] | undefined) => items![items!.length - 1];
const lastAccessory = () => last(doc.accessories).id;

// --- On the rack -------------------------------------------------------------------------------------------
// The preset already carries the front pull-up bar.
doc = addAccessory(doc, 'rogue-monster-lite-j-cups', { uprightId: 'front-left', face: 'front', hole: 22 }, true);
// Rogue Adjustable Monolift 1.0 → the builder's generic rack monolift (the AM-2 needs Monster 1″ holes).
doc = addAccessory(doc, 'monolift', { uprightId: 'front-left', face: 'front', hole: 30 }, true);
// Rogue SAML-24 Monster Lite spotter arms, set for benching.
doc = addAccessory(doc, 'rogue-saml-24-spotter-arms', { uprightId: 'front-left', face: 'front', hole: 8 }, true);
// Low weight horns on the outside of each post, stacked with old iron.
doc = addAccessory(doc, 'storage-pin-long', { uprightId: 'front-left', face: 'left', hole: 4 }, true);
const iron = (key: string): PlateId => plateId('cap-olympic-iron', key, 'black');
doc = setPlateStack(doc, lastAccessory(), [iron('45'), iron('45'), iron('45'), iron('35')]);
doc = addAccessory(doc, 'storage-pin-long', { uprightId: 'front-left', face: 'left', hole: 12 }, true);
doc = setPlateStack(doc, lastAccessory(), [iron('25'), iron('25'), iron('10'), iron('10')]);

// --- Floor ---------------------------------------------------------------------------------------------------
function place(part: string, [x, z]: Vec2, rotation = 0, params: NumericParams = {}, pair = false) {
  doc = addFloorItem(doc, part, [x, z], pair);
  const item = last(doc.floorItems);
  item.rotation = rotation;
  item.params = { ...item.params, ...params };
  return item.id;
}
function load(id: string, plates: BarLoad) { doc = setBarLoad(doc, id, plates); }
/** Racks a bar in the best free cradle (J-cups first), as the builder's placement does. */
function park(id: string) {
  const item = doc.floorItems!.find(i => i.id === id)!;
  const [cradle] = freeCradles(resolveAssembly(doc), doc.floorItems, id, barSpecOf(item)).sort((a, b) => b.center[2] - a.center[2]);
  if (!cradle) throw Error(`No free cradle for ${item.part}`);
  const { position } = parkedPose(cradle, barSpecOf(item));
  Object.assign(item, { cradle: cradle.key, position: [position[0], -position[1]], rotation: cradle.yaw });
}

// Black rubber mat zone around the rack (Tractor Supply stall mats, laid long-ways along the wall).
place('tractor-supply-horse-stall-mat', [-915, 300], Math.PI / 2);
place('tractor-supply-horse-stall-mat', [915, 300], Math.PI / 2);
// Rogue flat utility bench squared up to the rack, reaching into the aisle (kept just clear of the posts).
place('rogue-flat-utility-bench-2', [0, 1245]);
// Texas Power Bar racked in the J-cups.
park(place('texas-power-bar', [0, 900]));

// Entry end: DIY platform (wood centre with the painted 力 kanji), a Texas Deadlift Bar loaded with bumpers.
place('diy-lifting-platform', [-ROOM.left + 1250, midZ]);
const bumper = (key: string): PlateId => plateId('rep-black-bumper', key);
load(place('texas-deadlift-bar', [-ROOM.left + 1250, midZ]), { both: [bumper('45'), bumper('45'), iron('45')] });

// Back (rack) wall, entry side: plyo boxes beside the rack, an iron plate tree and the vertical bar holder.
place('titan-3-in-1-soft-foam-plyo-box', [-1200, -130]);
place('rogue-vertical-plate-tree-2', [-2150, -210], 0, { loaded: 2, plates: 1 });
place('titan-barbell-storage-holder', [-2800, -360], 0, { loaded: 3 });

// Back wall, mural side: leg extension/curl, single-leg squat roller, the T-3 yoke, kegs and old iron.
// EVERYMATE leg extension/curl → closest match: Titan Leg Extension & Hamstring Curl.
place('titan-leg-extension-curl', [1500, -40]);
place('titan-single-leg-squat-roller', [2600, -240]);
place('titan-t3-series-yoke', [3950, 160]);
place('diy-strongman-keg', [5150, -300], 0, {}, true);
place('titan-portable-plate-barbell-tree', [6400, -190], 0, { loaded: 2, plates: 1, bars: 2 });

// Opposite long wall (facing back across the aisle). Tall pieces stay off the default camera's line to the rack.
// GarveeLife all-in-one rack (second rack, lat/low-row pulleys) → closest match: Force USA Functional Trainer Rack.
place('force-usa-functional-trainer-rack', [-800, frontWallZ - 560], Math.PI);
place('titan-seated-stationary-bench', [-2400, frontWallZ - 560], Math.PI);
// Titan 45 lb wagon wheel pulling blocks on an Olympic bar, across from the rack.
load(place('olympic-barbell', [2600, frontWallZ - 500]), { both: [plateId('titan-wagon-wheel', '45'), plateId('titan-wagon-wheel', '45')] });
// Titan Vertical Leg Press → closest match: Titan Leg Press Hack Squat, turned to run along the wall.
place('titan-leg-press-hack-squat', [5500, frontWallZ - 540], -Math.PI / 2);
// A second plate tree of old iron in the mural-end corner.
place('rogue-vertical-plate-tree-2', [7030, frontWallZ - 330], Math.PI, { loaded: 1, plates: 1 });
// Titan SSB racked on the next free cradle; the multi-grip camber bar on the floor by the yoke.
park(place('titan-safety-squat-bar', [0, 2000]));
place('titan-multi-grip-barbell', [3900, 1500]);

// --- Walls -----------------------------------------------------------------------------------------------------
/** `x`/`z` are floor coordinates of the item's centre along its wall; `h` its face-centre height. */
function wall(part: string, wallId: WallId, along: number, h: number, params: NumericParams = {}) {
  const u = wallId === 'back' ? along - midX : wallId === 'front' ? midX - along : wallId === 'left' ? midZ - along : along - midZ;
  doc = addWallItem(doc, part, { wall: wallId, position: [u, h] });
  const item = last(doc.wallItems);
  item.params = { ...item.params, ...params };
  return item.id;
}
// Horizontal barbell gun rack over the leg extension (the "Hulk mural" bar rack).
wall('titan-wall-mounted-6-barbell-rack', 'back', 1900, 1750, { loaded: 6 });
// Second gun rack by the plate tree.
wall('rogue-v2-gun-rack', 'back', -2000, 1800, { loaded: 4 });
// Pegboard at the entry end with belts, straps and cable handles.
const peg = wall('pegboard-panel', 'back', -4300, 1500);
// Titan belt & band hanger (on the closet door at the entry end) → closest match: Rogue Belt & Band Hanger.
wall('rogue-belt-band-hanger', 'left', 3000, 1400);
void peg;

for (const part of ['inzer-forever-lever-belt-10mm', 'rogue-ohio-lifting-straps', 'rogue-wrist-wraps-2', 'rep-tricep-rope', 'rep-d-handles', 'rogue-monster-band-2', 'rogue-monster-band-3', 'rogue-monster-band-4', 'mark-bell-sling-shot-original']) {
  const [slot] = freeSlots(doc, part);
  if (slot) doc = placeHang(doc, part, slot);
  else console.warn(`no free hook for ${part}`);
}

writeGym({
  slug: 'erik-mains-s-gym',
  title: "Erik Mains's Gym",
  owner: 'Erik Mains',
  sourceUrl: 'https://gymradar.com/gym/erik-mains-s-gym',
  summary:
    'A long, dark 13 × 42 ft powerlifting building: a black folding rack bolted to one long wall faces a second cable rack and plate-loaded machines across the aisle, with a painted platform at the entry end and old iron everywhere. The Titan T-3 folding rack is shown as the closest catalog match, a Rogue RML-3W fold-back rack.',
  highlights: [
    '13 × 42 ft "bowling-lane" gym',
    'Folding rack bolted over a mirror wall',
    'Full Texas Power Bars set',
    'Two gun racks of specialty bars',
    'Painted 力 platform at the entry',
  ],
  equipment: [
    'Titan T-3 Series Folding Power Rack (closest match: Rogue RML-3W Fold Back Wall Mount Rack, 41.5″ deep)',
    'GarveeLife power rack with pulleys (closest match: Force USA Functional Trainer Rack)',
    'Rogue Adjustable Monolift 1.0 (closest match: generic rack monolift)',
    'Rogue SAML-24 Monster Lite Spotter Arms',
    'Rogue Monster Lite J-Cups',
    'Weight storage horns with old iron (closest match: CAP 2″ Olympic iron, black)',
    'Rogue Flat Utility Bench',
    'Titan Seated Stationary Bench',
    'Titan Performance adjustable bench and Tru Grit flat utility bench (not placed)',
    'Texas Power Bars: Deadlift Bar, Power Bar Original (Squat and Bench bars stored)',
    'Titan Safety Squat Bar',
    'Titan Multi-Grip Camber / multi-grip bars (closest match: Titan Multi-Grip Barbell)',
    'Titan 84″ and 60″ axles, rackable EZ curl, rackable camber, Yukon bow bar, cambered bench bar, 34″ triceps bar, Bandbell Earthquake Bar (stored on the gun racks)',
    'Titan Vertical Leg Press (closest match: Titan Leg Press Hack Squat)',
    'EVERYMATE leg extension / curl (closest match: Titan Leg Extension & Hamstring Curl)',
    'Titan Single Leg Squat Roller',
    'Titan plate-loaded seated dip, GMWD JX01 incline chest fly, Yukon seated calf (not in the catalog)',
    'Titan T-3 Series Yoke',
    'Titan 45 lb Wagon Wheel Pulling Blocks on an Olympic bar',
    'Steel kegs (DIY strongman kegs)',
    'Rogue Vertical Plate Trees and Titan portable plate tree with old iron',
    'Titan Barbell Storage Holder',
    'Titan wall-mounted barbell rack and Rogue V2 gun rack',
    'Titan belt & band hanger (closest match: Rogue Belt & Band Hanger)',
    'Pegboard with belt, straps, wraps, bands and cable handles (Fitvids, SYL; closest match: REP handles)',
    'Everyday Essentials bumpers (closest match: REP black bumper plates)',
    'Titan and BalanceFrom plyo boxes (closest match: Titan 3-in-1 soft foam plyo box)',
    'DIY platform at the entry end; stall-mat zone around the rack',
    'Green turf runner down the aisle, hex LED ceiling and wall mural (not modelled)',
  ],
  doc,
});
