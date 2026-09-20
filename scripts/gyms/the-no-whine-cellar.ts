/** The No Whine Cellar — Keith Honeycutt's 750 sq ft basement-and-garage gym in Rochester, NY
 * (https://gymradar.com/gym/the-no-whine-cellar). A long powerlifting basement in orange and black that "recently
 * expanded to strongman": an orange Monster rack at the end wall, orange dumbbell racks and plate trees down the sides,
 * a row of benches, machines by the stairs, and a strongman bay with a yoke, log, stones, keg, circus dumbbell and
 * sandbags. Rebuild with `npx tsx scripts/gyms/the-no-whine-cellar.ts`. */
import { attach, floor, rack, rackBar, room, wall, writeGym } from './build.ts';

const ft = (f: number) => Math.round(f * 304.8);
// Rogue RM Monster Rack 2.0 in orange, at the end of a long 40' × 19' room (the strongman bay is at the camera end).
let doc = rack('rogue-rm-monster-2-four-2295.525-762', '#e0661d');
doc = room(doc, { back: 700, front: ft(40) - 700, left: ft(9.5), right: ft(9.5), height: 2300 });

// Rack: Monster sandwich J-cups, Monster spotter arms 2.0 plus the strap safety system, Monster band pegs.
doc = attach(doc, 'rogue-monster-sandwich-j-cup', { uprightId: 'front-left', face: 'front', hole: 22 });
doc = attach(doc, 'rogue-monster-spotter-arms-2', { uprightId: 'front-left', face: 'front', hole: 13 });
doc = attach(doc, 'rogue-monster-strap-safety-2', { uprightId: 'rear-left', face: 'right', hole: 10 });
doc = attach(doc, 'rogue-monster-band-peg-2');
doc = rackBar(doc, 'texas-squat-bar', /J-Cup/);

// Lifting end: comp bench out front, orange dumbbell racks down the left wall, plate trees down the right.
doc = floor(doc, 'rep-fb-5000', [0, 1250]);
doc = floor(doc, 'rep-dumbbell-rack', [-2530, 1400], 90, { loaded: 2, color: 3 });
doc = floor(doc, 'rep-dumbbell-rack', [-2530, 2800], 90, { loaded: 1, color: 3 });
doc = floor(doc, 'rogue-vertical-plate-tree-2', [2480, -250], 0, { loaded: 2 });
doc = floor(doc, 'rogue-vertical-plate-tree-2', [2480, 800], 0, { loaded: 1 });
doc = floor(doc, 'titan-portable-plate-barbell-tree', [2480, 1900], 0, { loaded: 2, bars: 1 });
// Middle: the bench row and the SOTA competition bench (shown as an orange TSS combo rack).
doc = floor(doc, 'rogue-flat-utility-bench-2', [-900, 3000]);
doc = floor(doc, 'rep-ab-3000', [600, 3100], 0, { backrestAngle: 20 });
doc = floor(doc, 'tss-combo-rack', [-1850, 5300], 90, { color: 8 });
doc = floor(doc, 'kabuki-duffalo-bar', [-200, 3930], 0);
// Machines by the stairs: lat pulldown / row, leg curl / extension, reverse hyper, treadmill and rower.
doc = floor(doc, 'titan-lat-tower-300', [2150, 4400], -90);
doc = floor(doc, 'titan-leg-extension-curl', [2350, 6000], -90);
doc = floor(doc, 'rogue-rh-2-reverse-hyper', [550, 6700], 0);
doc = floor(doc, 'horizon-7-0-at', [-1915, 7600], 90);
doc = floor(doc, 'concept2-rowerg', [2500, 8300], 0);
// Strongman bay: yoke, log on crash cushions, stones, keg, circus dumbbell, farmers handles, sandbags.
doc = floor(doc, 'rogue-y2-yoke', [0, 9300], 0, { load: 2 });
doc = floor(doc, 'abmat-log-crash-cushions', [-1850, 10600], 90);
doc = floor(doc, 'titan-rackable-strongman-log', [-100, 10950], 0, { load: 1 });
doc = floor(doc, 'diy-atlas-stone', [-600, 8200], 0, { diameter: 16 });
doc = floor(doc, 'diy-atlas-stone', [-100, 8200], 0, { diameter: 14 });
doc = floor(doc, 'diy-strongman-keg', [1600, 10200], 0, { size: 1 });
doc = floor(doc, 'mike-bartos-training-circus-dumbbell', [2550, 10950], 0);
doc = floor(doc, 'titan-upright-farmers-walk-handles', [1600, 11250], 90);
doc = floor(doc, 'titan-husafell-stone-carry', [-300, 7600], 0);
doc = floor(doc, 'cerberus-replica-dinnie-stone-handles', [1300, 7700], 0);
doc = floor(doc, 'rogue-strongman-sandbag', [2550, 9950], 0, { size: 5 });
doc = floor(doc, 'freedom-strength-strongman-sandbag', [2550, 10450], 0);
doc = floor(doc, 'cerberus-dual-ply-sandbag', [-2550, 9300], 0);
doc = floor(doc, 'bells-of-steel-fitness-sandbag', [-2000, 9300], 0);

// Walls: orange-lined V2 gun racks full of specialty bars and a 3 bar gun rack on the right wall.
doc = wall(doc, 'rogue-v2-gun-rack', 'right', [1400, 1300], { loaded: 3 });
doc = wall(doc, 'rogue-v2-gun-rack', 'right', [3700, 1300], { loaded: 3 });
doc = wall(doc, 'rogue-3-bar-gun-rack', 'left', [4300, 1350], { loaded: 3 });
doc = wall(doc, 'rogue-belt-band-hanger', 'back', [-1400, 1500]);

writeGym({
  slug: 'the-no-whine-cellar',
  title: 'The No Whine Cellar',
  owner: 'Keith Honeycutt',
  sourceUrl: 'https://gymradar.com/gym/the-no-whine-cellar',
  summary: "Keith Honeycutt's 750 sq ft basement-and-garage gym in Rochester, New York: \"a basement gym established in 2015 that has a rich history of powerlifting and has recently expanded to strongman. Visitors welcome and encouraged.\" An orange Monster rack, orange dumbbell racks and plate trees, a wall of specialty bars and a strongman bay. Recreated from its Gym Radar page with our catalog parts; the garage strongman corner is folded into one long room.",
  highlights: [
    'Orange-and-black Rogue Monster Rack 2.0 with spotter arms and strap safeties',
    'Strongman bay: Rogue Y-2 yoke, log on crash cushions, atlas stones, keg, circus dumbbell',
    'Upright farmers handles, Húsafell carry, Dinnie handles and a pile of sandbags',
    'Orange dumbbell racks and plate trees full of York and CAP iron',
    'Open gym every Sunday at 9:30 — no whining allowed',
  ],
  equipment: [
    'Rogue RM Monster Rack 2.0 (orange)',
    'Rogue Monster J-Cups (1″ sandwich)',
    'Rogue Monster Safety Spotter Arms 2.0 and Safety Strap System 2.0',
    'Rogue Monster Band Peg 2.0',
    'State of the Arc SOTA Competition Bench (shown as an orange TSS Combo Rack)',
    'REP FB-5000 Competition Flat Bench and AB-3000 FID Bench',
    'Rogue flat bench',
    'Body-Solid GDR363 dumbbell racks with CAP hex and York roundhead dumbbells (shown as loaded REP dumbbell racks)',
    'Rogue Vertical Plate Tree 2.0',
    'CAP A-frame and Cybex plate trees (shown as a Titan portable plate & barbell tree)',
    'Parabody 827 dual cable lat pulldown / row (shown as the Titan lat tower)',
    'Body-Solid GLCE365 leg curl / extension (shown as the Titan leg extension & curl)',
    'Rogue RH-2 Reverse Hyper',
    'Horizon T82 treadmill (shown as the Horizon 7.0 AT)',
    'Concept2 RowErg',
    'Rogue Y-2 Yoke',
    'Titan 12″ Rackable Strongman Log',
    'AbMat Log Crash Cushions',
    'DIY atlas stones and keg',
    'Mike Bartos PowerCenter Training Circus Dumbbell',
    'Titan Upright Farmers Walk Handles',
    'Titan Húsafell Stone Carry',
    'Cerberus Replica Dinnie Stone Handles',
    'Rogue, Freedom Strength, Cerberus and Bells of Steel sandbags',
    'Texas Squat Bar and Kabuki Duffalo Bar',
    'Rogue V2 Gun Racks and 3 Bar Gun Rack',
    'Rogue Belt & Band Hanger',
  ],
  doc,
});
