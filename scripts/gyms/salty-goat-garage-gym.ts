/** Salty Goat Garage Gym — Dr_TattyWaffles (Dan)'s 400 sq ft garage in Strongsville, OH
 * (https://gymradar.com/gym/salty-goat-garage-gym). A conditioning-and-strength garage: a half rack on a platform with
 * a Voltra, Rogue Echo bumpers on the rear horns, a BikeErg and PCD on the left, a ski erg, dumbbells and a busy accessory
 * wall on the right. Rebuild with `npx tsx scripts/gyms/salty-goat-garage-gym.ts`. */
import { attach, floor, hang, lastAccessory, lastWall, loadPin, p, rack, rackBar, room, times, wall, writeGym } from './build.ts';

const ft = (f: number) => Math.round(f * 304.8);
// Eleiko Prestera half rack → Rogue HR-2 half rack (90″ front posts, 70″ storage posts).
let doc = rack('rogue-hr2-four-2343.15-431.8-1835.15');
// Roughly 20' × 20': the rack is centred on the back wall.
// Finishes (#200): light grey painted walls, charcoal rubber mats, a white ceiling with linear LEDs running left to right.
doc = room(doc, { back: 900, front: ft(20) - 900, left: ft(10), right: ft(10), height: 2750, walls: { finish: 'drywall', color: '#c5c8ca' }, ceiling: { color: '#e8e8e4', lights: { count: 4, along: 'x' } } });

// Rack: J-cups, strap safeties, bumper horns on the storage posts, Darko QuickMount with the Voltra, Pegasus seat.
doc = attach(doc, 'rogue-monster-lite-j-cups', { uprightId: 'front-left', face: 'front', hole: 20 });
doc = attach(doc, 'rogue-monster-lite-strap-safety-2', { uprightId: 'front-left', face: 'right', hole: 11 });
doc = attach(doc, 'storage-pin-long', { uprightId: 'rear-left', face: 'left', hole: 12 });
doc = loadPin(doc, lastAccessory(doc), [...times(2, p('rogue-echo-v2', '45')), p('rogue-echo-v2', '25')]);
doc = attach(doc, 'storage-pin-long', { uprightId: 'rear-left', face: 'left', hole: 4 });
doc = loadPin(doc, lastAccessory(doc), [...times(2, p('rogue-echo-v2', '35')), ...times(2, p('rogue-echo-v2', '10'))]);
doc = attach(doc, 'darko-quickmount-voltra');
doc = attach(doc, 'rep-pegasus');

// Bars: the American Barbell Chewy Bar racked; the open trap bar on the floor beside the rack.
doc = rackBar(doc, 'american-barbell-chewy-bar', /J-Cup/);

// Floor: platform under the rack, bench out front.
doc = floor(doc, 'diy-lifting-platform', [0, 700], 0, { finish: 1 });
doc = floor(doc, 'rep-nighthawk', [0, 1500], 180);
// Left wall: BikeErg and the EliteFTS PCD (shown as a Rogue RH-2 reverse hyper).
doc = floor(doc, 'concept2-bikeerg', [-2410, -250], 90);
doc = floor(doc, 'rogue-rh-2-reverse-hyper', [-2300, 1700], 90);
doc = floor(doc, 'rep-open-trap-bar', [-1500, 3200], 90);
// Right side: cable tower on the wall, dumbbells, PowerBlocks, the ski erg and the conditioning corner.
doc = floor(doc, 'titan-wall-pulley-tower', [1450, -550], 0);
doc = floor(doc, 'rep-dumbbell-rack', [2380, -540], 0, { loaded: 1 });
doc = floor(doc, 'powerblock-column-stand', [2700, 450], -90, { load: 1 });
doc = floor(doc, 'ironmaster-super-bench-pro-v2', [1600, 1100], -90);
doc = floor(doc, 'concept2-skierg', [2380, 2450], -90);
doc = floor(doc, 'rogue-games-box', [2500, 4850], 0);
doc = floor(doc, 'cerberus-dual-ply-sandbag', [1600, 4750], 0);
doc = floor(doc, 'rogue-kettlebell', [2200, 4150], 0, { weight: 16 });
doc = floor(doc, 'rogue-kettlebell', [2450, 4150], 0, { weight: 24 });
doc = floor(doc, 'rogue-kettlebell', [2700, 4150], 0, { weight: 32 });
doc = floor(doc, 'rogue-medicine-ball', [1000, 4750], 0, { weight: 20 });

// Walls: the accessory wall of Darko, JD Gym Equipped, Savage and BLUSLM handles; TRX by the rack.
doc = wall(doc, 'wall-control-pegboard', 'right', [1300, 1500], { size: 2, panels: 3 });
doc = hang(doc, lastWall(doc), ['darko-lifting-danglers', 'bluslm-wave-lat-bar-84', 'bluslm-v-lat-bar-60', 'bluslm-close-grip-24',
  'rep-tricep-rope', 'rep-d-handles', 'rogue-lat-bar', 'trx-home2-suspension-trainer']);
doc = wall(doc, 'rogue-wall-mount-swiss-brackets', 'back', [-1500, 1300]);

writeGym({
  slug: 'salty-goat-garage-gym',
  title: 'Salty Goat Garage Gym',
  owner: 'Dr_TattyWaffles (Dan)',
  sourceUrl: 'https://gymradar.com/gym/salty-goat-garage-gym',
  summary: "Dan's 400 sq ft garage in Strongsville, Ohio: \"When the neon is lit be prepared to be wowed by a 40-something dad squatting to pop punk.\" A half rack on a platform with a Voltra, bumpers on the rear horns, a BikeErg, PCD and ski erg for conditioning, and an accessory wall full of handles. Recreated from its Gym Radar page with our catalog parts.",
  highlights: [
    'Half rack on a platform with a Beyond Power Voltra on a Darko QuickMount',
    'Rogue Echo V2 bumpers stored on the rack\'s rear horns',
    'Conditioning corner: Concept2 BikeErg, ski erg, plyo box, kettlebells, sandbag',
    'Accessory wall of Darko, JD Gym Equipped, Savage and BLUSLM handles',
    'EliteFTS PCD reverse hyper / GHD / dip station on the left wall',
  ],
  equipment: [
    'Eleiko Prestera Half Rack (shown as a Rogue HR-2 half rack)',
    'Beyond Power Voltra with Darko QuickMount bracket',
    'REP Pegasus Seat',
    'Rogue Echo Bumper Plates V2',
    'American Barbell Stainless Steel IPF Chewy Bar',
    'Fringe Sport Midas Open Trap Bar (shown as the REP Open Trap Bar)',
    'REP Nighthawk Adjustable Bench',
    'Ironmaster Super Bench PRO V2',
    'EliteFTS Signature Posterior Chain Developer (shown as a Rogue RH-2 reverse hyper)',
    'Concept2 BikeErg',
    'Torque Relentless Ripper (shown as a Concept2 SkiErg)',
    'Rogue CTM-1 Functional Cable Tower (shown as the Titan wall pulley tower)',
    'Eleiko Evo Dumbbells (shown as a loaded REP dumbbell rack)',
    'PowerBlock Pro 100 EXP (shown on a PowerBlock column stand)',
    'Rogue Kettlebells (E-coat)',
    'Rogue Resin Plyo Box (shown as the Rogue Games Box)',
    'Cerberus Dual-Ply Sandbag',
    'AbMat medicine balls (shown as a Rogue medicine ball)',
    'Darko Danglers, BLUSLM lat bars and handles, TRX suspension trainer',
    'PRx specialty bar storage (shown as Rogue wall mount Swiss brackets)',
    'Wall Control pegboard accessory wall',
  ],
  doc,
});
