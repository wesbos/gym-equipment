/** B3 (Brian's Barbells and Brewskis) — https://gymradar.com/gym/b3-brian-s-barbells-and-brewskis
 *
 *   npx tsx scripts/gyms/b3-brian-s-barbells-and-brewskis.ts && npx tsx scripts/render-gym-previews.ts b3-brian-s-barbells-and-brewskis
 *
 * A 150 sq ft powerlifting corner in the back-left of a two-car garage in Grand Prairie, TX: a black Bells of
 * Steel Manticore folding rack on an OSB back wall, a column of plate horns and a white Wall Control pegboard on
 * the left wall, bars hanging vertically beside the rack, and a DIY platform in front that a car parks over.
 *
 * Floor coordinates are [x, z] in mm from the rack centre: +x to the right (towards the other car stall), +z
 * towards the garage door. Room distances are from the rack centre to each wall (walls.ts). */
import { writeGym } from './lib.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { addAccessory, resolveAssembly, setPlateStack } from '../../rack-generator/assembly.ts';
import { addFloorItem } from '../../rack-generator/floor-items.ts';
import { addWallItem } from '../../rack-generator/wall-items.ts';
import { freeSlots, placeHang } from '../../rack-generator/hang-items.ts';
import { setBarLoad } from '../../rack-generator/bar-loads.ts';
import { barSpecOf, freeCradles, suggestCradle } from '../../rack-generator/barbell-cradles.ts';
import { plateId } from '../../rack-generator/plates.ts';
import type { RackDoc, Target, Vec2 } from '../../rack-generator/types.ts';

const last = <T>(items: T[] | undefined) => items![items!.length - 1];
const accessory = (doc: RackDoc, part: string, target: Partial<Target>, paired = true) => {
  const next = addAccessory(doc, part, target, paired);
  return { doc: next, id: last(next.accessories).id };
};
const floor = (doc: RackDoc, part: string, position: Vec2, rotation = 0, params: Record<string, number> = {}, pair = false) => {
  const next = addFloorItem(doc, part, position, pair);
  const item = last(next.floorItems);
  if (rotation) item.rotation = rotation;
  for (const unit of next.floorItems!.slice(pair ? -2 : -1)) Object.assign(unit.params, params);
  return { doc: next, id: item.id };
};

// Rack: BoS Manticore folding power rack, 90" tall and about 41" deep. The catalog's Manticore 4-post
// (90" × 43" deep) stands in; the fold-back hinges aren't modelled. Rear posts sit against the back wall.
let doc = applyPreset('bos-manticore-four-2286-1092.2');
doc.appearance = { ...doc.appearance, frameColor: '#1c1d1f' };

// Two-car garage (about 20' × 20', 8' ceiling); the gym is its back-left third.
doc.room = { back: 650, left: 1500, right: 4600, front: 5450, height: 2440 };

// Bells of Steel standard J-cups and light-blue safety straps, pull-up bar across the front top.
let r = accessory(doc, 'j-hook-standard', { uprightId: 'front-left', face: 'front', hole: 25 });
doc = r.doc;
doc = accessory(doc, 'bells-of-steel-safety-straps', { uprightId: 'front-left', face: 'right', hole: 12 }).doc;
doc = accessory(doc, 'pullup-straight', { uprightId: 'front-left', face: 'right', hole: 39 }, false).doc;

// GymPala 3×3 weight horns low on the outside of both front uprights, holding speckled Nike Grind bumpers
// (closest catalog plates: Rogue Fleck bumpers).
r = accessory(doc, 'storage-pin-long', { uprightId: 'front-left', face: 'left', hole: 4 });
doc = setPlateStack(r.doc, r.id, [plateId('rogue-fleck', '45'), plateId('rogue-fleck', '45'), plateId('rogue-fleck', '25')]);

// Bells of Steel flat utility bench, parked beside the left upright when not in use so the car fits
// (closest: Rogue Flat Utility Bench 2.0).
doc = floor(doc, 'rogue-flat-utility-bench-2', [-1025, 0]).doc;

// Texas Power Bar PRO racked in the J-cups.
r = floor(doc, 'texas-power-bar-pro', [0, 900]);
doc = r.doc;
{
  const bar = doc.floorItems!.find(i => i.id === r.id)!;
  const cradle = suggestCradle(freeCradles(resolveAssembly(doc), doc.floorItems, r.id, barSpecOf(bar)).filter(c => c.kind !== 'storage'));
  if (!cradle) throw Error('No J-cup cradle for the bar.');
  bar.cradle = cradle.key;
}

// DIY platform in front of the rack: plywood centre, stall-mat sides. The real one is cut about 6" narrow so a
// car parks over it; the catalog's DIY 8'×8' platform stands in.
doc = floor(doc, 'diy-lifting-platform', [0, 622 + 1219 + 25], 0, { finish: 0 }).doc;

// Texas Deadlift Bar on the platform, loaded with Bells of Steel calibrated LB plates (red 55, blue 45)
// — closest catalog plates: Rogue LB Competition.
r = floor(doc, 'texas-deadlift-bar', [0, 1900]);
doc = setBarLoad(r.doc, r.id, { both: [plateId('rogue-lb-competition', '55'), plateId('rogue-lb-competition', '45')] });

// Bells of Steel deadlift jack beside the platform (closest: RitFit Deadlift Jack).
doc = floor(doc, 'ritfit-deadlift-jack', [1650, 2400], Math.PI / 2).doc;

// A pair of CAP cast-iron hex dumbbells on the floor right of the rack.
doc = floor(doc, 'cap-cast-iron-hex-dumbbell', [900, 250], 0, { weight: 50 }, true).doc;

// Bells of Steel hanging barbell holder: bars hang vertically on the back wall next to the rack
// (closest: Rogue Vertical Bar Hanger, triple, holding the Big Tex, SSB and Everyday bars).
const midX = (doc.room.right - doc.room.left) / 2, midZ = (doc.room.front - doc.room.back) / 2;
const backU = (x: number) => x - midX, leftU = (z: number) => midZ - z;
doc = addWallItem(doc, 'rogue-vertical-bar-hanger', { wall: 'back', position: [backU(900), 1180] });
Object.assign(last(doc.wallItems).params, { size: 1, loaded: 3 });

// Left wall, back corner: the vertical plate tree (BoS wall-mounted plate storage + Yes4All holders) —
// closest: stacked REP single wall horns, iron on top and bumpers below.
for (const [h, loaded] of [[1850, 2], [1300, 1], [750, 1]] as const) {
  doc = addWallItem(doc, 'rep-wall-mounted-plate-storage', { wall: 'left', position: [leftU(-350), h] });
  Object.assign(last(doc.wallItems).params, { variant: 0, loaded });
}
// Micro Gainz / EVERYMATE change plates on BoS change-plate pegs.
doc = addWallItem(doc, 'bells-of-steel-change-plate-pegs', { wall: 'left', position: [leftU(250), 1750] });
Object.assign(last(doc.wallItems).params, { version: 1, loaded: 1 });

// White Wall Control pegboard with belts, wraps, straps, collars and bands.
doc = addWallItem(doc, 'wall-control-pegboard', { wall: 'left', position: [leftU(950), 1350] });
Object.assign(last(doc.wallItems).params, { size: 0, panels: 2, color: 2 });
for (const part of ['inzer-forever-lever-belt-10mm', 'rogue-wrist-wraps-2', 'rogue-ohio-lifting-straps', 'fat-gripz-extreme', 'titan-twistlock-pro-collars', 'bells-of-steel-magnetic-clamp-collars', 'elitefts-pro-resistance-band-pack']) {
  const [slot] = freeSlots(doc, part);
  if (!slot) throw Error(`No free hook for ${part}`);
  doc = placeHang(doc, part, slot);
}

writeGym({
  slug: 'b3-brian-s-barbells-and-brewskis',
  title: "B3 (Brian's Barbells and Brewskis)",
  owner: '𝖇𝖎𝖌 𝖇𝖗𝖎𝖆𝖓 (𝖓𝖔 𝖗𝖊𝖑𝖆𝖙𝖎𝖔𝖓) 🌿 🐌',
  sourceUrl: 'https://gymradar.com/gym/b3-brian-s-barbells-and-brewskis',
  summary: "A 150 sq ft powerlifting corner of a two-car garage in Grand Prairie, Texas: a black Bells of Steel Manticore folding rack on an OSB wall, plate horns and a Wall Control pegboard beside it, and a DIY platform a car parks over. The Manticore 4-post stands in for the folding rack, and the closest catalog matches stand in for the bench, plates and wall storage.",
  highlights: ['Both cars still park', 'Car parks over the platform', 'Folding Manticore rack', 'Three Texas Power Bars', 'Massenomics certified'],
  equipment: [
    'Bells of Steel Manticore Folding Power Rack (closest match: Manticore 4-post, 90″ × 43″)',
    'Bells of Steel standard J-cups, safety straps and adjustable pull-up bar',
    'Bells of Steel magnetic rack attachment pins',
    'GymPala 3×3 weight horns (closest match: long storage pins) with Nike Grind bumpers (closest match: Rogue Fleck)',
    'Bells of Steel hanging barbell holders (closest match: Rogue Vertical Bar Hanger)',
    'Massenomics Drink Spotter XL and Drink Spotter Chill (not modelled)',
    'Amazon band hooks (not modelled)',
    'Bells of Steel flat utility bench (closest match: Rogue Flat Utility Bench 2.0)',
    'Amazon bench block and EliteFTS Manta Ray (not modelled)',
    'Texas Power Bar PRO 29 mm, Texas Deadlift Bar and Big Tex Deadlift Bar',
    'Titan Safety Squat Bar with Spud SSB strap, XMark Lumberjack curl bar, Living.Fit Everyday bar, Fringe Stubby Axle (on the bar hanger)',
    'Bells of Steel calibrated LB plates (closest match: Rogue LB Competition plates)',
    'CAP 2″ grip, Fitness Gear and The Strength Co. iron plates; Micro Gainz and EVERYMATE change plates',
    'CAP cast-iron hex and neoprene dumbbells',
    'Bells of Steel wall-mounted plate storage and Yes4All wall plate holders (closest match: REP wall horns)',
    'Bells of Steel change plate pegs',
    'Wall Control pegboard (white) with belt, wraps, straps, collars and bands',
    'Titan TwistLock and Bells of Steel magnetic clamp collars',
    'DIY lifting platform on Tractor Supply stall mats (closest match: DIY 8′×8′ platform; the real one is cut 6″ narrow)',
    'Bells of Steel deadlift jack (closest match: RitFit Deadlift Jack)',
    'Fat Gripz Extreme, Massenomics stall-mat gripper, DIY chains, ab wheel, loading pin',
  ],
  doc,
});
