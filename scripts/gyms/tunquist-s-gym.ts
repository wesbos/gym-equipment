/** Tunquist's Gym — Brandon Tunquist's 775 sq ft basement powerlifting gym in Easton, MA (https://gymradar.com/gym/tunquist-s-gym).
 * Gym Radar's top-ranked member: an EliteFTS 3×3 power rack in the back corner, a monolift, a deadlift platform in front
 * of the flag wall, a Hansu combo rack under the window, GHDs and plate trees, a long row of chrome calibrated dumbbells,
 * and a cable corner with a functional trainer and lat pulldown by the garage door. Rebuild with
 * `npx tsx scripts/gyms/tunquist-s-gym.ts`. */
import { attach, floor, hang, lastWall, p, rack, rackBar, room, times, wall, writeGym } from './build.ts';

const ft = (f: number) => Math.round(f * 304.8);
// EliteFTS 3X3 Power Rack → Rogue RM-3 Monster Rack 2.0 (3×3 uprights, 30″ deep, 90″ tall).
let doc = rack('rogue-rm-monster-2-four-2295.525-762');
// About 30' × 24' of finished basement; the rack sits in the back-right corner.
doc = room(doc, { back: 700, front: ft(24) - 700, left: ft(30) - 1800, right: 1800, height: 2450 });

// Rack: Ghost roller J-cups, strap safeties, Monster Landmine 2.0, Velocidor, Pritchett pad, SP3358 plate storage, band pegs, and monolift arms standing in for the EliteFTS monolift.
doc = attach(doc, 'ghost-strong-ghost-roller-j-cup', { uprightId: 'front-left', face: 'front', hole: 23 });
doc = attach(doc, 'rogue-monster-strap-safety-2', { uprightId: 'front-left', face: 'right', hole: 12 });
doc = attach(doc, 'rogue-monster-landmine-2');
doc = attach(doc, 'rogue-velocidor');
doc = attach(doc, 'rogue-monster-pritchett-pad');
doc = attach(doc, 'rogue-sp3358-plate-storage', undefined, true, { load: 2 });
doc = attach(doc, 'rogue-monster-band-peg-2');
doc = attach(doc, 'rogue-am-2-monolift');
doc = rackBar(doc, 'texas-power-bar-pro', /J-Cup/);

// Back wall: deadlift platform with a loaded Texas Deadlift Bar in front of the flags, plate tree beside it.
doc = floor(doc, 'diy-lifting-platform', [-2900, 700], 0, { finish: 2 });
doc = floor(doc, 'texas-deadlift-bar', [-2900, 900], 0, {}, { both: [...times(4, p('rogue-calibrated-kg', '25')), p('rogue-calibrated-kg', '20')] });
doc = floor(doc, 'rogue-vertical-plate-tree-2', [-1250, -300], 0, { loaded: 2, plates: 1 });
doc = floor(doc, 'rogue-abram-ghd-2', [-1150, 2600], 0);
doc = floor(doc, 'freak-athlete-nordic-mini-pro', [-2600, 2900], 0);
// Under the window: the Hansu combo rack, facing into the room.
doc = floor(doc, 'tss-combo-rack', [-6450, 1300], 90);
// Right wall: two long racks of chrome calibrated dumbbells, benches facing them.
doc = floor(doc, 'rogue-3-tier-dumbbell-rack', [1400, 1000], -90, { loaded: 2 });
doc = floor(doc, 'rogue-3-tier-dumbbell-rack', [1400, 3500], -90, { loaded: 2 });
doc = floor(doc, 'rogue-adjustable-bench-3', [150, 2350], 90, { backAngle: 30 });
doc = floor(doc, 'titan-elite-adjustable-fid-bench', [150, 3800], 90);
doc = floor(doc, 'rogue-flat-utility-bench-2', [0, 1250], 0);
doc = floor(doc, 'rep-kettlebell-rack-2', [700, 6100], 180, { loaded: 1 });
doc = floor(doc, 'titan-squat-wedge', [-2200, 4300], 0);
doc = floor(doc, 'rogue-medicine-ball', [-1300, 4400], 0, { weight: 20 });
// Cable corner by the garage door: functional trainer and lat pulldown / low row.
doc = floor(doc, 'inspire-ftx-functional-trainer', [-5600, 5850], 180);
doc = floor(doc, 'bells-of-steel-lat-pulldown-low-row', [-3500, 5550], 180);

// Walls: bar storage and hangers, a Wall Control panel of attachments in the cable corner.
doc = wall(doc, 'rogue-v2-gun-rack', 'left', [3000, 1250], { loaded: 3 });
doc = wall(doc, 'rogue-3-bar-gun-rack', 'back', [-4900, 1350], { loaded: 3 });
doc = wall(doc, 'rogue-belt-band-hanger', 'back', [-6300, 1600]);
doc = wall(doc, 'rogue-multi-use-hanger', 'back', [-6900, 1600]);
doc = wall(doc, 'wall-control-pegboard', 'left', [5000, 1450], { size: 2, panels: 2 });
doc = hang(doc, lastWall(doc), ['bluslm-wave-lat-bar-84', 'bluslm-v-lat-bar-62', 'bluslm-close-grip-26', 'rep-tricep-rope', 'rep-d-handles',
  'rep-curl-bar', 'rogue-ankle-cuff', 'spud-long-ab-strap']);

writeGym({
  slug: 'tunquist-s-gym',
  title: "Tunquist's Gym",
  owner: 'Brandon Tunquist',
  sourceUrl: 'https://gymradar.com/gym/tunquist-s-gym',
  summary: "Brandon Tunquist's 775 sq ft basement in Easton, Massachusetts, from Gym Radar's top-ranked member: \"A full powerlifting gym with everything you'll ever need.\" An EliteFTS 3×3 rack, a monolift that fits a basement, calibrated kilo plates, chrome calibrated dumbbells, a Hansu combo rack, competition and specialty bars and a functional trainer. Recreated from its Gym Radar page with our catalog parts.",
  highlights: [
    "Gym Radar's #1 leaderboard member and a Massenomics Certified Training Facility",
    'EliteFTS 3×3 power rack with Ghost roller J-cups, Monster Landmine and Velocidor',
    'Deadlift platform with a Texas Deadlift Bar on calibrated kilo plates',
    'Hansu combo rack, Abram GHD and a long row of chrome calibrated dumbbells',
    'Cable corner with a functional trainer and TSS lat pulldown / low row',
  ],
  equipment: [
    'EliteFTS 3X3 Power Rack (shown as a Rogue RM-3 Monster Rack 2.0)',
    'Ghost Strong Ghost Roller J-Cups',
    'Spud Inc. suspension / safety straps (shown as Rogue Monster strap safeties)',
    'Rogue Monster Landmine 2.0',
    'Rogue Velocidor',
    'Rogue Monster Pritchett Pad',
    'Rogue SP3358 Plate Storage',
    'Rogue Monster band pegs',
    'EliteFTS Deluxe Monolift (shown as Rogue AM-2 monolift arms on the power rack)',
    'Hansu Power Ultimate Combo Rack (shown as the TSS Combo Rack)',
    'Texas Strength Systems 4×8 platform with band pegs (shown as a DIY lifting platform)',
    'Rogue Calibrated KG Steel Plates 2.0',
    'Texas Power Bar Pro 29 mm and Texas Deadlift Bar',
    'Rogue Vertical Plate Tree 2.0',
    'Rogue Abram GHD 2.0',
    'SHOGUN NORD-EX (shown as the Freak Athlete Nordic Mini Pro)',
    'Kensui calibrated chrome dumbbells (shown on Rogue 3-tier dumbbell racks)',
    'Rogue Adjustable Bench 3.0 and Flat Utility Bench 2.0',
    'Valor Fitness adjustable decline bench (shown as the Titan Elite FID bench)',
    'Gronk Fitness TKO kettlebell rack (shown as the REP Kettlebell Rack 2.0)',
    'Titan Fitness Functional Trainer (shown as the Inspire FTX)',
    'Texas Strength Systems Lat Pulldown-Low Row (shown as the Bells of Steel lat pulldown)',
    'Rogue V2 Gun Rack and 3 Bar Gun Rack',
    'Rogue Belt & Band Hanger and Multi-Use Hanger',
    'Wall Control panels with BLUSLM lat bars, ropes, handles and ankle cuffs',
    'Titan squat wedge and ProsourceFit medicine ball',
  ],
  doc,
});
