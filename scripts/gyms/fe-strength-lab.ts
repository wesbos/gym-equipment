/** FE Strength Lab (#184) — Big DeBo's 2000 sq ft pole barn in Princeton, Indiana.
 * https://gymradar.com/gym/fe-strength-lab
 *
 *   npx tsx scripts/gyms/fe-strength-lab.ts && npx tsx scripts/render-gym-previews.ts fe-strength-lab
 *
 * Floor coordinates are [x, z] mm from the rack origin: +x to the right when facing the rack's front, +z toward the
 * front (the camera side). The black BoS Manticore 6-post stands in the middle of the stall mats with its Kraken
 * stacks on the rear storage posts; the turf sled lane runs down the right wall, the painted platform sits front
 * left, cardio front right, strongman back right and the dumbbell/kettlebell shelving along the left wall. */
import { writeGym } from './lib.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { withSystem } from '../../rack-generator/systems.ts';
import { addAccessory, setPlateStack, validateAssembly, resolveAssembly } from '../../rack-generator/assembly.ts';
import { addFloorItem } from '../../rack-generator/floor-items.ts';
import { addWallItem } from '../../rack-generator/wall-items.ts';
import { freeSlots, placeHang } from '../../rack-generator/hang-items.ts';
import { setBarLoad } from '../../rack-generator/bar-loads.ts';
import { barSpecOf, freeCradles, parkedPose } from '../../rack-generator/barbell-cradles.ts';
import type { RackDoc, Target, NumericParams, BarLoad } from '../../rack-generator/types.ts';
import type { WallId } from '../../rack-generator/walls.ts';

const Q = Math.PI / 2;
let doc: RackDoc = applyPreset('bos-manticore-six-2286-1092.2');
// Big DeBo's Manticore is black, not the BoS default green.
doc.appearance = { ...doc.appearance, frameColor: '#1d1f21' };
// BoS Kraken pulley attachment: both weight stacks ride the rear storage posts.
doc = validateAssembly(withSystem(doc, 'cable-kraken'));

// --- Rack attachments -------------------------------------------------------------------------------------------
const last = () => doc.accessories.at(-1)!.id;
const attach = (part: string, target: Partial<Target>, paired = true, params: NumericParams = {}) => {
  doc = addAccessory(doc, part, target, paired, params);
  return last();
};
attach('j-hook-sandwich', { uprightId: 'front-left', face: 'front', hole: 24 }); // BoS sandwich J-cups
attach('bells-of-steel-safety-straps', { uprightId: 'front-left', face: 'right', hole: 13 }); // light-blue straps
attach('pullup-straight', { uprightId: 'front-left', face: 'right', hole: 39 }, false); // front pull-up bar
// Low weight horns on the outside of the front posts with black iron 45s and 25s.
const horns = attach('storage-pin-long', { uprightId: 'front-left', face: 'left', hole: 4 });
doc = setPlateStack(doc, horns, ['lb45', 'lb45', 'lb25']);
attach('mutant-metals-ultimate-dip-attachment', { uprightId: 'upright-4', face: 'back', hole: 18 }, false); // Mutant UDA on a rear storage post
attach('bells-of-steel-landmine-rack-attachment', { uprightId: 'front-left', face: 'front', hole: 1 }, false); // Titan rack landmine (closest: BoS)

// --- Floor ------------------------------------------------------------------------------------------------------
const floor = (part: string, x: number, z: number, rotation = 0, params: NumericParams = {}, pair = false) => {
  doc = addFloorItem(doc, part, [x, z], pair);
  const items = doc.floorItems!.slice(pair ? -2 : -1);
  for (const item of items) { item.rotation += rotation; Object.assign(item.params, params); }
  return items[0].id;
};
/** Bars rest in the rack's cradles (J-cups first), the way the builder parks them. */
const park = (part: string, load?: BarLoad) => {
  const id = floor(part, 0, 0);
  const item = doc.floorItems!.find(i => i.id === id)!;
  const cradle = freeCradles(resolveAssembly(doc), doc.floorItems, id, barSpecOf(item))[0];
  if (cradle) {
    const { position } = parkedPose(cradle, barSpecOf(item));
    Object.assign(item, { cradle: cradle.key, position: [position[0], -position[1]], rotation: cradle.yaw });
  }
  if (load) doc = setBarLoad(doc, id, load);
  return id;
};
// The barn is ~12.2 × 15.2 m; the recreation keeps its zones but pulls them in around the rack (~10.6 × 11 m) so
// the whole gym frames in one view.
// Black stall mats across the lifting area, under the rack.
floor('tractor-supply-horse-stall-mat', 0, -300, 0, { across: 4, deep: 3 });
park('rogue-ohio-bar', { both: ['lb45', 'lb45'] }); // Ohio Bar racked in the J-cups
floor('titan-elite-adjustable-fid-bench', 0, 1500); // Titan Elite FID bench in front of the rack
floor('rep-open-trap-bar', -1800, 2000); // REP open trap bar on the mats

// Front left: the painted DIY 8x8 platform with a loaded deadlift bar, the plate tree beside it.
floor('diy-lifting-platform', -2900, 3600, 0, { logo: 1 });
const dl = floor('rogue-ohio-deadlift-bar', -2900, 3600);
doc = setBarLoad(doc, dl, { both: ['rogue-lb-competition:55', 'rogue-lb-competition:45', 'rogue-lb-competition:25'] });
floor('rogue-vertical-plate-tree-2', -1200, 4700, 0, { loaded: 1 });
floor('rogue-games-box', -700, 3300); // DIY wood plyo boxes (closest: Rogue Games Box)

// Left wall: DIY shelving of hex dumbbells and kettlebells, PowerBlocks on the column stand, the DIY belt squat.
floor('rogue-3-tier-dumbbell-rack', -4000, -1400, Q, { loaded: 1 });
floor('rep-kettlebell-rack-2', -4050, 900, Q, { loaded: 1 });
floor('powerblock-column-stand', -4100, 2000, Q);
floor('diy-belt-squat', -2000, -1700); // DIY belt squat

// Back wall: the lat pulldown in front of the slatwall, the GMWD leg extension by the window, bar storage,
// reverse hyper and GHD.
floor('titan-plate-loaded-lat-pulldown', -3700, -4300, Q);
floor('gmwd-le08-leg-extension-curl', -1900, -4400);
floor('titan-barbell-storage-holder', -400, -4800, 0, { loaded: 1 });
floor('rogue-rh-2-reverse-hyper', 900, -4300, Q); // DIY reverse hyper (closest: Rogue RH-2)
floor('rogue-abram-ghd-2', 2700, -4200); // NEXO GHD (closest: Rogue Abram GHD 2.0)

// Right: the strongman corner — stones on their platform, kegs, log, sandbags and circus dumbbell.
floor('diy-atlas-stone-platform', 3200, -2200);
floor('diy-atlas-stone', 2200, -1000, 0, { diameter: 16 }, true);
floor('diy-strongman-keg', 2200, 0, 0, {}, true);
floor('titan-rackable-strongman-log', 2800, 800); // Rogue 10" log (closest: Titan rackable log)
floor('rogue-cyclone-strongman-sandbag', 3700, -1000);
floor('freedom-strength-strongman-sandbag', 3700, -300);
floor('titan-circus-dumbbell', 4200, 250);
// The turf sled lane along the right wall (the turf itself isn't in the catalog): yoke, farmers handles and sled.
floor('titan-t3-series-yoke', 4600, -4000, Q);
floor('titan-farmers-walk-handles', 5000, -1800, 0, {}, true);
floor('rogue-dog-sled', 5200, 1300);

// Front right: the cardio corner.
floor('assaultrunner-pro', 1400, 4100);
floor('assault-airbike-classic', 2900, 4300);
floor('concept2-rowerg', 4300, 3700);

// --- Walls: the Rogue 9-bar holder, and the white slatwall of belts and straps (closest: Wall Control) -----------------
doc.room = { back: 5200, front: 5800, left: 4600, right: 6000, height: 3500 };
const wall = (part: string, id: WallId, u: number, h: number, params: NumericParams = {}) => {
  doc = addWallItem(doc, part, { wall: id, position: [u, h] });
  Object.assign(doc.wallItems!.at(-1)!.params, params);
  return doc.wallItems!.at(-1)!.id;
};
wall('rogue-9-bar-holder', 'back', -1100, 700, { loaded: 3 }); // back wall u is from its centre (x = 700 here)
const slatwall = wall('wall-control-pegboard', 'left', 3300, 1500, { size: 1, panels: 4, color: 2 }); // white panels
for (const part of ['inzer-forever-lever-belt-10mm', 'rogue-ohio-lifting-straps', 'rogue-wrist-wraps-2', 'mark-bell-sling-shot-original', 'rogue-monster-band-2', 'rogue-monster-band-3', 'rogue-monster-band-4', 'rep-wood-gymnastic-rings', 'fat-gripz'])
  doc = placeHang(doc, part, freeSlots(doc, part).find(s => s.panel === slatwall)!);

writeGym({
  slug: 'fe-strength-lab',
  title: 'FE Strength Lab',
  owner: 'Big DeBo',
  sourceUrl: 'https://gymradar.com/gym/fe-strength-lab',
  summary: 'A 2000 sq ft Indiana pole barn built to coach strongman and strength athletes: a black Bells of Steel Manticore 6-post with Kraken cable stacks in the middle of the stall mats, a painted DIY platform, a cardio corner and a full strongman arsenal of kegs, stones, logs and a yoke. The turf sled lane is left out, and a few DIY pieces stand in as their closest catalog match.',
  highlights: ['2000 sq ft pole barn', 'Manticore 6-post + Kraken stacks', 'Kegs, atlas stones, log and yoke', 'Painted DIY 8×8 platform', 'Coaches competitive athletes'],
  equipment: [
    'Bells of Steel Manticore 6-post power rack',
    'Bells of Steel Kraken pulley system',
    'Bells of Steel sandwich J-cups, safety straps and pull-up bar',
    'Mutant Metals Ultimate Dip Attachment',
    'Titan rack landmine (closest match: Bells of Steel landmine)',
    'Weight horns with black iron plates (closest match: long storage pins)',
    'Rogue Ohio Bar and Ohio Deadlift Bar',
    'REP open trap bar',
    'Rogue LB competition plates and black iron plates',
    'Titan Elite adjustable FID bench',
    'DIY 8×8 lifting platform and Tractor Supply stall mats',
    'CAP hex dumbbells on DIY shelving (closest match: Rogue 3-tier dumbbell rack)',
    'Rogue and CAP kettlebells (closest match: REP kettlebell rack 2.0)',
    'PowerBlock Elite USA 90 on column stand',
    'Titan plate-loaded lat pulldown / row',
    'GMWD LE11 leg extension / prone curl (closest match: GMWD LE08 2.0)',
    'NEXO GHD (closest match: Rogue Abram GHD 2.0)',
    'DIY reverse hyper (closest match: Rogue RH-2)',
    'DIY belt squat',
    'AssaultRunner Pro, AssaultBike Classic and Concept2 RowErg',
    'Rogue 10″ log (closest match: Titan rackable strongman log)',
    'Titan T-3 short yoke',
    'Farmers walk handles (closest match: Titan farmers walk handles)',
    'DIY circus dumbbell (closest match: Titan circus dumbbell)',
    'DIY steel kegs, atlas stones and stone platform',
    'Rogue Cyclone and Freedom Strength sandbags',
    'Sled (closest match: Rogue dog sled)',
    'DIY plyo boxes (closest match: Rogue Games Box)',
    'Rogue 9-bar holder, Titan barbell storage holder and plate tree',
    'Menards slatwall with belts, straps and bands (closest match: white Wall Control pegboard)',
    'Not placed: turf sled lane, Rogue Echo/Bella/Boneyard bars, specialty bars, grip tools, jerk blocks, Rogue peg board',
  ],
  doc,
});
