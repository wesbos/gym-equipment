/** Scottsdale Garage Gym — a 660 sq ft three-car garage in Scottsdale, AZ (https://gymradar.com/gym/scottsdale-garage-gym).
 * The machine-heavy one: a long red REP PR-4000 rig down the back wall ("a 13 post rack"), commercial selectorized
 * machines (Life Fitness, Precor, Hoist, Bodymasters) in front of it, a SquatMax-MD belt squat, a functional trainer, a
 * reverse hyper and over 20 barbells. Rebuild with `npx tsx scripts/gyms/scottsdale-garage-gym.ts`. */
import { extendUpright, connectUprights } from '../../rack-generator/graph-edits.ts';
import { attach, floor, hang, lastWall, p, rack, rackBar, room, wall, writeGym } from './build.ts';

const ft = (f: number) => Math.round(f * 304.8);
// REP PR-4000 in red: the 93″ six-post rack with its 16″ rear storage bay, plus two more 41″ bays to the right,
// making a ten-post rig (the real one has 13 posts across the garage).
let doc = rack('rep-pr-4000-six-2362.2-762', '#b3202a');
const bay = (from: [string, string]) => {
  const before = new Set(Object.keys(doc.uprights));
  doc = extendUpright(doc, from[0], 'right', 1041.4);
  doc = extendUpright(doc, from[1], 'right', 1041.4);
  const added = Object.keys(doc.uprights).filter(id => !before.has(id)) as [string, string];
  doc = connectUprights(doc, added[0], added[1], 'upper');
  doc = connectUprights(doc, added[0], added[1], 'lower');
  return added;
};
const bay1 = bay(['front-right', 'rear-right']);
const bay2 = bay(bay1);
// Three-car garage, about 30' × 22'; the rig runs along the back wall from the left third of the room.
doc = room(doc, { back: 1000, front: ft(22) - 1000, left: 2500, right: ft(30) - 2500, height: 2900 });

// Main bay: Griffin flat sandwich J-cups (REP flat sandwich), X-3 spotter arms (REP spotter arms), REP pull-up bar,
// AML-2 monolift, Kleva Adroit landmine, REP leg roller, band pegs and loaded plate storage.
doc = attach(doc, 'rep-flat-sandwich-j-cups');
doc = attach(doc, 'rep-spotter-arms');
doc = attach(doc, 'kleva-adroit-landmine-2');
doc = attach(doc, 'rep-leg-roller');
doc = attach(doc, 'rogue-monster-lite-band-peg');
doc = attach(doc, 'rogue-sp3358-plate-storage', { uprightId: 'upright-1', face: 'left', hole: 8 }, false, { load: 2 });
// Second bay: the AML-2 monolift; third bay: strap safeties and a second pull-up bar.
doc = attach(doc, 'rogue-am-2-monolift', { uprightId: bay2[0], face: 'front', hole: 27 });
doc = attach(doc, 'rogue-monster-lite-strap-safety-2', { uprightId: bay2[0], face: 'left', hole: 12 });
doc = rackBar(doc, 'rogue-ohio-power-bar', /J-Cup/);
doc = rackBar(doc, 'texas-power-bar-pro', /monolift/i);

// Floor in front of the rig: bench, then the row of commercial machines and the belt squat.
doc = floor(doc, 'rep-ab-5200-2', [0, 1250]);
doc = floor(doc, 'titan-squatmax-md', [4000, -350], 0);
doc = floor(doc, 'rep-arcadia-functional-trainer', [5800, -450], 0);
doc = floor(doc, 'titan-selectorized-leg-extension-curl', [-1600, 3400], 90);
doc = floor(doc, 'force-usa-compact-leg-press-hack-squat', [300, 4600], 180);
doc = floor(doc, 'temple-of-gainz-multi-flight-v3', [2200, 5200], 180);
doc = floor(doc, 'rogue-rh-2-reverse-hyper', [3800, 4800], 180);
doc = floor(doc, 'peloton-bike', [5800, 3200], -90);
// Dumbbells, plate trees, bar storage and strongman odds and ends.
doc = floor(doc, 'rep-dumbbell-rack', [-1900, 1150], 90, { loaded: 2, color: 1 });
doc = floor(doc, 'rogue-vertical-plate-tree-2', [4200, 1800], 0, { loaded: 2, plates: 1 });
doc = floor(doc, 'rogue-vertical-plate-tree-2', [5000, 1800], 0, { loaded: 1 });
doc = floor(doc, 'titan-barbell-storage-holder', [6300, 1500], 0, { size: 1, loaded: 2 });
doc = floor(doc, 'rogue-ohio-deadlift-bar', [2000, 2400], 0, {}, { both: [p('rogue-26er', '70')] });
doc = floor(doc, 'kabuki-trap-bar-hd', [2000, 3300], 0);
doc = floor(doc, 'titan-rackable-strongman-log', [-1400, 5400], 0);
doc = floor(doc, 'titan-farmers-walk-handles', [5200, 5350], 90);
doc = floor(doc, 'rogue-thompson-fatbell', [6300, 5200], 0);

// Walls: Wall Control accessory panels, a wall-mounted bar holder, change-plate storage and the multi-use hanger.
doc = wall(doc, 'wall-control-pegboard', 'left', [2500, 1450], { size: 2, panels: 3, color: 1 });
doc = hang(doc, lastWall(doc), ['rep-lat-bar-48', 'rogue-lat-bar', 'rep-straight-bar-25', 'rep-tricep-rope', 'rep-d-handles', 'rep-triangle-row',
  'porter-physed-eclipse-grip', 'kensui-swissies', 'rep-ankle-cuff']);
doc = wall(doc, 'rep-9-bar-storage', 'back', [-1700, 1400], { loaded: 8 });
doc = wall(doc, 'stray-dog-change-plate-storage', 'back', [3900, 1300], { loaded: 1 });
doc = wall(doc, 'rogue-multi-use-hanger', 'back', [4700, 1600]);
doc = wall(doc, 'rogue-3x3-strip-2', 'right', [1500, 1400]);

writeGym({
  slug: 'scottsdale-garage-gym',
  title: 'Scottsdale Garage Gym',
  owner: 'Scottsdale Garage Gym',
  sourceUrl: 'https://gymradar.com/gym/scottsdale-garage-gym',
  summary: "A 660 sq ft three-car garage in Scottsdale, Arizona: \"a 13 post rack, commercial grade machines (Bodymasters, Precor, Life Fitness, Hoist) covering different upper and lower body exercises… over 20 barbells, a reverse hyper, functional trainer, and some strongman implements.\" Built for several lifters training at once. Recreated from its Gym Radar page with our catalog parts.",
  highlights: [
    'Long red REP PR-4000 rig down the back wall with monolift, landmine and loaded plate storage',
    'Commercial selectorized machines: leg extension/curl, seated leg press, multi-flight',
    'SquatMax-MD belt squat, functional trainer and a reverse hyper',
    'Over 20 barbells, Rogue 26′ER wagon wheels and a log',
    'Room for multiple lifters to train at the same time',
  ],
  equipment: [
    'REP PR-4000 Rack in red (13 posts; shown as a ten-post PR-4000 rig)',
    'Griffin Flat Sandwich J-Cups 2.0 (shown as REP flat sandwich J-cups)',
    'Titan X-3 Series Spotter Arms (shown as REP spotter arms)',
    'Rogue Monster Lite Strap Safety System 2.0',
    'Rogue AML-2 Adjustable Monolift 2.0 (shown as the Rogue AM-2 monolift)',
    'Kleva Built Adroit Landmine 2.0',
    'REP Leg Roller',
    'Rogue Monster Lite / Infinity Band Pegs',
    'REP 1.25″ and 2″ pull-up bars',
    'Rogue LB Competition Plates and Fringe Sport Savage Bumper Plates',
    'Black Widow and Bremmy weight horns (shown as Rogue SP3358 plate storage)',
    'SquatMax-MD Pro belt squat (shown as the Titan SquatMax-MD)',
    'Paramount PFT-200 two-stack functional trainer (shown as the REP Arcadia)',
    'Life Fitness Optima Leg Extension / Prone Leg Curl (shown as the Titan selectorized leg extension/curl)',
    'Life Fitness Insignia Seated Leg Press (shown as the Force USA compact leg press)',
    'Temple of Gainz Selectorized Standing Multi-Flight V3',
    'Rogue Z Hyper (shown as the Rogue RH-2 reverse hyper)',
    'REP AB-5200 2.0 Adjustable Bench',
    'Peloton Cross Training Bike',
    'REP hex dumbbells (shown on a loaded REP dumbbell rack)',
    'Irwin Fitness Vertical Weight Tree (shown as Rogue Vertical Plate Trees 2.0)',
    'Titan Barbell Storage Holder',
    'Vulcan wall-mounted 8 Olympic bar holder (shown as REP 9-bar storage)',
    'Stray Dog Strength Change Plate Storage',
    'Rogue Multi-Use Hanger and 3x3 Strip 2.0',
    'Wall Control panels of cable attachments',
    'Rogue 26′ER wagon wheels on a Rogue Ohio Deadlift Bar',
    'Kabuki Strength Trap Bar HD',
    'Rogue LB-1 10″ log (shown as the Titan rackable strongman log)',
    'REP farmer\'s walk handles (shown as Titan farmers walk handles)',
    'Rogue Thompson Fatbells',
    'Rogue 45 lb Ohio Power Bar and Texas Power Bar Pro',
  ],
  doc,
});
