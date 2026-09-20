/** Guns Powerlifting Club — Big Joe's 200 sq ft shed gym in Mint Hill, NC (https://gymradar.com/gym/guns-powerlifting-club).
 * A 10' × 20' shed: the gun-metal-grey RML-390 sits against one long wall with the calibrated plates on wall horns behind
 * it, the BOS cable tower and BikeErg at the far end, and the Titan combo rack at the door end. Rebuild with
 * `npx tsx scripts/gyms/guns-powerlifting-club.ts`. */
import { removeInstance } from '../../rack-generator/assembly.ts';
import { attach, floor, hang, lastWall, p, rack, rackBar, room, times, wall, writeGym } from './build.ts';

const ft = (f: number) => Math.round(f * 304.8);
let doc = rack('rogue-rml-3-four-2295.525-762', '#5b5f63'); // "RML-390 C in Gun Metal Gray"
doc = removeInstance(doc, doc.accessories[0].id); // the 43" fat/skinny bar replaces the stock pull-up bar
// 10' × 20' shed: the rack backs onto a long wall; its far end (cable tower) is 1.9 m to the left.
// Finishes (#200): plywood sheathing over the studs (closest: birch plywood) and black rubber; open rafters.
doc = room(doc, { back: 750, front: ft(10) - 750, left: 1900, right: ft(20) - 1900, height: 2600, walls: { finish: 'birch' } });

// Rack: Monster Lite J-cups, pin-and-pipe safeties, fat/skinny bar, Matador dip, Mammoth belt squat, single bar holder.
doc = attach(doc, 'rogue-fat-skinny-pull-up-bar');
doc = attach(doc, 'rogue-monster-lite-j-cups', { uprightId: 'front-left', face: 'front', hole: 21 });
doc = attach(doc, 'safety-pin-pipe', { uprightId: 'front-left', face: 'right', hole: 11 });
doc = attach(doc, 'rogue-monster-lite-matador', { uprightId: 'front-right', face: 'front', hole: 16 }, false);
doc = attach(doc, 'fringe-sport-mammoth-belt-squat');
doc = attach(doc, 'single-bar-holder', { uprightId: 'rear-left', face: 'left', hole: 10 }, false);

// Bars: the 45 lb Ohio Power Bar in the J-cups, the Ohio Deadlift Bar loaded with iron on the floor out front.
doc = rackBar(doc, 'rogue-ohio-power-bar', /J-Cup/);

// Floor: stall mats wall to wall, bench out front of the rack, deadlift bar beyond it.
// Stall mats: a row of five 4' × 6' mats along the rack wall, then three turned sideways to fill the last 4'.
doc = floor(doc, 'tractor-supply-horse-stall-mat', [-1900 + ft(10), -750 + ft(3)], 0, { across: 5, deep: 1 });
doc = floor(doc, 'tractor-supply-horse-stall-mat', [-1900 + ft(9), -750 + ft(8)], 90, { across: 1, deep: 3 });
doc = floor(doc, 'rep-fb-5000', [0, 1130]);
doc = floor(doc, 'rogue-ohio-deadlift-bar', [100, 2010], 0, {}, { both: times(3, p('strength-co-iron', '45')) });
// Far end: BOS cable tower in the corner beside the rack, BikeErg along the opposite wall.
doc = floor(doc, 'bells-of-steel-cable-tower', [-1360, -250], 0, { carriage: 26 });
doc = floor(doc, 'concept2-bikeerg', [-1540, 1000], 0);
// Door end: Titan comp combo rack against the end wall, bar tree and dumbbell stand along the rack wall.
doc = floor(doc, 'tss-combo-rack', [3330, 770], -90);
doc = floor(doc, 'titan-dumbbell-stand-plate-tree', [1080, -410], 0, { dumbbells: 1 });
doc = floor(doc, 'rep-pepin-dumbbell', [1000, 150], 0);
doc = floor(doc, 'rep-pepin-dumbbell', [1200, 150], 0);
doc = floor(doc, 'rep-bar-weight-plate-tree', [1850, -430], 0, { loaded: 1, bars: 1 });
doc = floor(doc, 'rep-ab-4100', [1500, 700], 90);
doc = floor(doc, 'titan-farmers-walk-handles', [2230, 1000], 0);
doc = floor(doc, 'titan-rackable-strongman-log', [2300, 2000], 0);
doc = floor(doc, 'titan-barbell-storage-holder', [3950, 2130], 0, { loaded: 1 });
doc = floor(doc, 'cerberus-dual-ply-sandbag', [3560, 2080], 0);
doc = floor(doc, 'abmat', [1000, 1300], 0);

// Walls: calibrated plates on horns behind the rack, Titan bar holder across the room, cable attachments by the tower.
doc = wall(doc, 'rep-wall-mounted-plate-storage', 'back', [0, 900], { loaded: 1 });
doc = wall(doc, 'titan-wall-mounted-6-barbell-rack', 'front', [1500, 1350], { loaded: 2 });
doc = wall(doc, 'pegboard-panel', 'left', [1000, 1500]);
doc = hang(doc, lastWall(doc), ['rep-lat-bar-48', 'rep-tricep-rope', 'rep-d-handles', 'bells-of-steel-swivel-shackles']);

writeGym({
  slug: 'guns-powerlifting-club',
  title: 'Guns Powerlifting Club',
  owner: 'Big Joe',
  sourceUrl: 'https://gymradar.com/gym/guns-powerlifting-club',
  summary: "Big Joe's 200 sq ft shed gym in Mint Hill, North Carolina: \"No heat, no AC, no problem.\" A gun-metal-grey Rogue RML-390 covered in stickers, calibrated plates on the wall behind it, a cable tower in the corner and a comp combo rack by the door. Recreated from its Gym Radar page with our catalog parts.",
  highlights: [
    'Massenomics Certified Training Facility in a 10′ × 20′ shed',
    'Rogue RML-390 with fat/skinny bar, Matador dip and Mammoth belt squat',
    'Titan competition bench/squat combo rack at the door end',
    'Bells of Steel cable tower and Concept2 BikeErg at the far end',
    'Calibrated plates stored on wall horns behind the rack',
  ],
  equipment: [
    'Rogue RML-390 Monster Lite Rack 3.0 (Gun Metal Gray)',
    'Rogue 43″ Fat/Skinny Pull-up Bar',
    'Rogue Monster Lite J-cups',
    'Rogue Infinity / Monster Lite Pin and Pipe Safeties (shown as generic pin-and-pipe safeties)',
    'Rogue Monster Lite Matador',
    'Fringe Sport Mammoth Belt Squat',
    'Rogue Monster Lite Single Bar Holder',
    'Titan Competition Bench and Squat Rack Combo (shown as the TSS Combo Rack, the closest catalog combo rack)',
    'Bells of Steel Cable Tower',
    'Concept2 BikeErg',
    'REP FB-5000 Competition Flat Bench',
    'REP AB-4100 Adjustable Bench',
    'REP x PEPIN FAST Series Adjustable Dumbbells',
    'Titan Dumbbell Stand and Plate Tree',
    'REP Bar and Weight Plate Tree',
    'Titan Barbell Storage Holder',
    'Titan wall-mounted barbell holder (shown as the Titan wall-mounted 6 barbell rack)',
    'Rogue 45 lb Ohio Power Bar',
    'Rogue Ohio Deadlift Bar',
    'Titan 12″ Rackable Strongman Log',
    'DIY farmer\'s handles (shown as Titan farmers walk handles)',
    'Cerberus Dual-Ply Sandbag',
    'Vulcan Absolute calibrated KG plates (shown as REP wall-mounted plate storage, loaded)',
    'The Strength Co. Olympic iron plates',
    'AbMat',
    'Horse stall mat flooring',
  ],
  doc,
});
