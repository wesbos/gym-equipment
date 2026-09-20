/** Basement Barbell — Basement Brandon's 750 sq ft basement in South Kingstown, RI (https://gymradar.com/gym/basement-barbell).
 * One of the best-known equipment-review gyms: a white six-post rack stacked with attachments and black plates on its
 * storage posts, weight trees and a vertical bar holder by the door, a Rhino belt squat, a combo rack on a platform in
 * the middle, a wall of REP urethane dumbbells and a row of machines and cardio. Rebuild with
 * `npx tsx scripts/gyms/basement-barbell.ts`. */
import { attach, floor, hang, lastAccessory, lastWall, loadPin, p, rack, rackBar, room, times, wall, writeGym } from './build.ts';

const ft = (f: number) => Math.round(f * 304.8);
// Irwin Fitness Pro Series 6-post rack (white) → Rogue RM-6 Monster Rack 2.0: 3×3 uprights, 43″ deep + 24″ storage.
let doc = rack('rogue-rm-monster-2-six-2295.525-1092.2', '#e9e9e6');
// About 30' × 25' of basement; the rack's storage posts back onto the wall beside the door.
// Finishes (#200): bare poured-concrete foundation walls (a light grey-beige paint) over grey-fleck rubber; open joists.
doc = room(doc, { back: 1500, front: ft(25) - 1500, left: 1600, right: ft(30) - 1600, height: 2450, walls: { finish: 'drywall', color: '#c8c2b6' }, floor: 'grey-fleck' });

// Rack: Irwin return roller J-cups, strap safeties, UDA, band pegs, landmine, a Voltra on its strap mount, Oak Club Iron,
// and plate pins on the storage posts loaded with black urethane plates.
doc = attach(doc, 'irwin-return-roller-j-cups', { uprightId: 'front-left', face: 'front', hole: 22 });
doc = attach(doc, 'rogue-monster-strap-safety-2', { uprightId: 'front-left', face: 'right', hole: 12 });
doc = attach(doc, 'mutant-metals-ultimate-dip-attachment', { uprightId: 'rear-left', face: 'back', hole: 24 });
doc = attach(doc, 'rogue-monster-band-peg-2');
doc = attach(doc, 'rep-kleva-adroit-landmine');
doc = attach(doc, 'beyond-power-voltra-strap-mount');
doc = attach(doc, 'oak-club-iron-3');
for (const [uprightId, face] of [['upright-1', 'left'], ['upright-4', 'right']] as const) {
  doc = attach(doc, 'storage-pin-long', { uprightId, face, hole: 5 }, false);
  doc = loadPin(doc, lastAccessory(doc), times(4, p('rep-black-bumper', '45')));
  doc = attach(doc, 'storage-pin-long', { uprightId, face, hole: 16 }, false);
  doc = loadPin(doc, lastAccessory(doc), [...times(2, p('rep-black-bumper', '35')), ...times(3, p('rep-black-bumper', '25'))]);
}
doc = rackBar(doc, 'rogue-ohio-power-bar-20kg', /J-Cup/);

// Floor, back wall: vertical bar holder and weight trees beside the door, then the Rhino belt squat and multi-flight.
doc = floor(doc, 'titan-barbell-storage-holder', [950, -1240], 0, { size: 1, loaded: 2 });
doc = floor(doc, 'rogue-vertical-plate-tree-2', [1800, -1150], 0, { loaded: 2, plates: 1 });
doc = floor(doc, 'rogue-vertical-plate-tree-2', [2550, -1150], 0, { loaded: 1 });
doc = floor(doc, 'rogue-monster-rhino-belt-squat', [3950, -700], 0);
doc = floor(doc, 'temple-of-gainz-multi-flight-v3', [6750, -1100], 0, { headPad: 1 });
// Right wall: the Prodigy cable tower and the REP urethane dumbbell wall with a flat bench in front.
doc = floor(doc, 'bells-of-steel-cable-tower', [7050, 400], -90);
doc = floor(doc, 'rogue-3-tier-dumbbell-rack', [7110, 2350], -90, { loaded: 2 });
doc = floor(doc, 'rogue-flat-utility-bench-2', [6100, 2350], -90);
doc = floor(doc, 'kettlebell-kings-competition-kettlebell', [6700, 4000], 0, { weight: 16 });
doc = floor(doc, 'kettlebell-kings-competition-kettlebell', [6950, 4000], 0, { weight: 24 });
doc = floor(doc, 'kettlebell-kings-competition-kettlebell', [7200, 4000], 0, { weight: 32 });
// Middle: the combo rack on its platform, a deadlift bar on 26'ER wagon wheels, an adjustable bench.
doc = floor(doc, 'rogue-8x8-oly-platform', [3400, 2500], 0);
doc = floor(doc, 'tss-combo-rack', [3400, 2500], 0, { color: 2 });
doc = floor(doc, 'rogue-ohio-bar', [0, 2600], 0, {}, { both: [p('rogue-26er', '70')] });
doc = floor(doc, 'rogue-adjustable-bench-3', [5200, 3500], 0);
doc = floor(doc, 'rep-safety-squat-bar', [0, 3050], 0);
doc = floor(doc, 'rep-open-trap-bar', [100, 4800], 90);
// Front wall: Peloton Bike+, Assault Elite Runner, leg extension/curl and the GHD.
doc = floor(doc, 'peloton-bike-plus', [1400, 5100], 180);
doc = floor(doc, 'assaultrunner-elite', [3500, 5050], 180);
doc = floor(doc, 'titan-selectorized-leg-extension-curl', [5100, 5250], 180);
doc = floor(doc, 'rep-glute-ham-developer', [6600, 5500], 90);
// Strongman corner by the left wall.
doc = floor(doc, 'abmat-log-crash-cushions', [-800, 4700], 90);
doc = floor(doc, 'freedom-strength-strongman-sandbag', [-1250, 2000], 0);

// Walls: gun racks full of bars, belt and band hanger by the door, Wall Control panels of handles by the cable tower.
doc = wall(doc, 'rogue-v2-gun-rack', 'left', [2300, 1300], { loaded: 3 });
doc = wall(doc, 'rogue-3-bar-gun-rack', 'left', [5000, 1300], { loaded: 3 });
doc = wall(doc, 'rogue-belt-band-hanger', 'back', [2200, 1700]);
doc = wall(doc, 'rogue-vertical-bar-hanger', 'right', [4700, 1300], { loaded: 2 });
doc = wall(doc, 'wall-control-pegboard', 'back', [5400, 1450], { size: 2, panels: 3 });
doc = hang(doc, lastWall(doc), ['porter-physed-eclipse-grip', 'prime-fitness-kaz-handles', 'trakfitness-trakhandle-sport', 'darko-lifting-shorty-bar',
  'darko-lifting-longy-bar', 'rep-kleva-atlas-multi-grip', 'rogue-single-handle', 'rep-ankle-cuff', 'rep-tricep-rope']);

writeGym({
  slug: 'basement-barbell',
  title: 'Basement Barbell',
  owner: 'Basement Brandon',
  sourceUrl: 'https://gymradar.com/gym/basement-barbell',
  summary: "Basement Brandon's 750 sq ft basement in South Kingstown, Rhode Island, home of years of honest equipment reviews on YouTube and \"one of the most recognizable gyms in the world.\" A white six-post rack loaded with attachments, over 40 barbells, a combo rack, a full wall of fixed dumbbells and thousands of pounds of plates. Recreated from its Gym Radar page with our catalog parts.",
  highlights: [
    'White six-post rack with return-roller J-cups, UDA, landmine, Voltra and plate storage',
    'Rhino belt squat, Temple of Gainz multi-flight and a cable tower along the walls',
    'Combo rack on a platform in the middle of the room',
    'A full wall of REP urethane dumbbells',
    'Gun racks and a vertical bar holder for a 40-bar collection',
  ],
  equipment: [
    'Irwin Fitness Pro Series Rack (shown as a white Rogue RM-6 Monster Rack 2.0)',
    'Irwin Fitness Return Roller J-Cups 2.0',
    'Spud Inc. safety rack straps (shown as Rogue Monster strap safeties)',
    'Mutant Metals Ultimate Dip Attachment',
    'Rogue Monster Band Peg 2.0',
    'REP x Kleva Built Adroit Landmine',
    'Beyond Power Voltra on its strap mount',
    'Oak Club Mfg Oak Club Iron',
    'Rogue Monster Plate Storage Pins (shown as long plate-storage pins, which carry the plate stacks)',
    'Xmaster black urethane plates (shown as REP black bumpers)',
    'Bishop Barbell Combo Rack (shown as the TSS Combo Rack)',
    'Bishop Barbell Lifting Platform (shown as the Rogue 8′×8′ platform)',
    'Rogue Monster Rhino Belt Squat',
    'Temple of Gainz Selectorized Standing Multi-Flight V3',
    'Prime Fitness Prodigy HLP single-stack cable tower (shown as the Bells of Steel cable tower)',
    'REP Urethane Dumbbells (shown on a Rogue 3-tier dumbbell rack)',
    'Hansu Power kettlebells (shown as Kettlebell Kings competition kettlebells)',
    'Williams Strength Signature Leg Extension/Curl (shown as the Titan selectorized leg extension/curl)',
    'Sorinex Collegiate GHD (shown as the REP GHD)',
    'Williams Strength Signature Bench (shown as the Rogue Adjustable Bench 3.0)',
    'Bridge Built Young Buck Bench (shown as the Rogue Flat Utility Bench 2.0)',
    'Peloton Cross Training Bike Plus',
    'Assault Elite Runner',
    'Oak Club Club Collector (shown as a Titan barbell storage holder)',
    'Ghost Strong and TechnoGym weight trees (shown as Rogue Vertical Plate Trees 2.0)',
    'Rogue V2 Gun Rack, 3 Bar Gun Rack and Vertical Bar Hanger',
    'Rogue Belt & Band Hanger',
    'Wall Control panels with Eclipse Grip, Kaz handles, TrakHandle, Darko Shorty and Longy bars, Kleva Atlas grip',
    'Rogue 26′ER wagon wheels',
    'REP Safety Squat Bar and REP Open Trap Bar',
    'AbMat Log Crash Cushions and Freedom Strength strongman sandbag',
    'Rogue 20 kg Ohio Power Bar (one of 40+ bars)',
  ],
  doc,
});
