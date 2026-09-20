/** Cable Compound (#184) — Chris's single-bay, almost-all-cable garage gym in Fishhawk, FL.
 * Source: https://gymradar.com/gym/cable-compound (owner "Chris’s Cable Compound").
 *
 *   npx tsx scripts/gyms/cable-compound.ts && npx tsx scripts/render-gym-previews.ts cable-compound
 *
 * Floor plan (mm, builder floor coords): x runs across the bay (left = the open edge toward the other bays,
 * right = the exterior wall), +z runs from the back wall toward the garage door. The rig stands near the back
 * wall with its rear storage posts toward it; cable machines line the right wall front-to-back as in the photos. */
import { gymWarnings, writeGym } from './lib.ts';
import { applyPreset } from '../../rack-generator/presets.ts';
import { withSystem } from '../../rack-generator/systems.ts';
import { addAccessory, getMounts, resolveAssembly, setPlateStack, validateAssembly } from '../../rack-generator/assembly.ts';
import { addFloorItem } from '../../rack-generator/floor-items.ts';
import { addWallItem } from '../../rack-generator/wall-items.ts';
import { freeSlots, placeHang } from '../../rack-generator/hang-items.ts';
import { barSpecOf, freeCradles, parkedPose } from '../../rack-generator/barbell-cradles.ts';
import { PLATE_SPECS, plateId } from '../../rack-generator/plates.ts';
import type { RackDoc, Target, NumericParams } from '../../rack-generator/types.ts';

const BLACK = '#17191a';
const last = <T>(items: T[] | undefined) => items![items!.length - 1];

// ── Rig: REP Athena selectorized side-mount crossover. The owner hangs his Athena towers on Rogue Monster
// uprights joined by a 70" crossmember with a flush rear extension; our Athena requires its named REP rack, so a
// 93" REP PR-5000 six-post (30" deep, 16" rear storage bay) in black stands in for the Monster structure.
let doc: RackDoc = applyPreset('rep-pr-5000-six-2362.2-762');
doc = validateAssembly(withSystem(doc, 'cable-athena'));
doc.appearance = { ...doc.appearance, frameColor: BLACK };

const attach = (part: string, target: Partial<Target>, paired = true, params: NumericParams = {}) => {
  const before = new Set(doc.accessories.map(a => a.id));
  doc = addAccessory(doc, part, target, paired, params);
  return doc.accessories.find(a => !before.has(a.id))!.id;
};
// Working attachments on the front posts.
attach('irwin-return-roller-j-cups', { uprightId: 'front-left', face: 'front', hole: 26 });
attach('mutant-metals-snap-back-monolift', { uprightId: 'rear-left', face: 'front', hole: 22 });
attach('rep-pull-up-bar', { uprightId: 'front-left', face: 'right', hole: 42 }, false);
attach('mutant-metals-ultimate-dip-attachment', { uprightId: 'upright-4', face: 'back', hole: 20 }, false);
// Rear storage bay: landmines low on the storage posts, plate horns holding grey grip plates.
attach('rogue-monster-landmine-2', { uprightId: 'upright-1', face: 'back', hole: 1 }, false);
attach('rep-kleva-adroit-landmine', { uprightId: 'upright-4', face: 'back', hole: 1 }, false);
// Accessory pile-up: each one is kept only where it validates and clears everything else (no new warnings).
const tryAttach = (part: string, targets: Partial<Target>[], paired = false) => {
  for (const target of targets) {
    const saved = doc, warnings = gymWarnings(doc).length;
    try { attach(part, target, paired); } catch { doc = saved; continue; }
    if (gymWarnings(doc).length === warnings) return true;
    doc = saved;
  }
  console.warn(`  could not place ${part}`);
  return false;
};
// Black Widow low-profile spotters → closest: REP spotter arms, low on the front posts.
tryAttach('rep-spotter-arms', [{ uprightId: 'front-left', face: 'front', hole: 8 }, { uprightId: 'front-left', face: 'front', hole: 6 }], true);
// REP Utility Seat and Darko Thresher pad ride on the spotter arms.
for (const part of ['rep-utility-seat', 'darko-thresher-pad']) {
  const [mount] = getMounts(doc, part);
  if (mount) tryAttach(part, [mount]); else console.warn(`  no spotter-arm mount for ${part}`);
}
tryAttach('rep-pegasus', [{ uprightId: 'front-right', face: 'front', hole: 12 }, { uprightId: 'front-right', face: 'front', hole: 16 }]);
tryAttach('bulletproof-vts', [{ uprightId: 'upright-4', face: 'left', hole: 30 }, { uprightId: 'upright-1', face: 'right', hole: 30 }]);
tryAttach('voltra-fixed', [{ uprightId: 'front-right', face: 'front', hole: 30 }, { uprightId: 'rear-right', face: 'back', hole: 24 }]);
tryAttach('rogue-monster-pritchett-pad', [{ uprightId: 'upright-1', face: 'back', hole: 14 }, { uprightId: 'upright-1', face: 'left', hole: 28 }]);
tryAttach('jd-gym-equipped-wrist-roller', [{ uprightId: 'front-left', face: 'front', hole: 38 }, { uprightId: 'front-right', face: 'front', hole: 38 }]);

// Rogue 6-Shooter grey grip plates → closest: CAP grey hammertone Olympic iron.
const grey = (w: number) => plateId('cap-olympic-iron', String(w), 'gray');
for (const [uprightId, face, hole, plates] of [
  ['upright-1', 'left', 6, [grey(45), grey(45), grey(45)]],
  ['upright-1', 'left', 16, [grey(25), grey(25), grey(10)]],
  ['upright-4', 'right', 6, [grey(45), grey(45), grey(35)]],
  ['upright-4', 'right', 16, [grey(25), grey(10), grey(10)]],
] as const) {
  const pin = attach('storage-pin-long', { uprightId, face, hole }, false);
  doc = setPlateStack(doc, pin, plates);
}

// ── Bars parked in the rig's cradles (highest working cradle first, then storage).
const park = (part: string) => {
  doc = addFloorItem(doc, part, [0, 3000]);
  const item = last(doc.floorItems); // addFloorItem appends
  const cradle = freeCradles(resolveAssembly(doc), doc.floorItems, item.id, barSpecOf(item)).sort((a, b) => +(a.kind === 'storage') - +(b.kind === 'storage') || b.center[2] - a.center[2])[0];
  if (!cradle) throw Error(`No free cradle for ${part}`);
  const { position } = parkedPose(cradle, barSpecOf(item));
  Object.assign(item, { cradle: cradle.key, position: [position[0], -position[1]], rotation: cradle.yaw });
  console.log(`  parked ${part} on ${cradle.label}`);
};
park('rogue-ohio-power-bar');
park('texas-power-bar');

// ── Floor: position [x, z] and rotation (radians) for each piece.
const floor = (part: string, x: number, z: number, rotation = 0, params: NumericParams = {}) => {
  doc = addFloorItem(doc, part, [x, z]);
  const item = last(doc.floorItems);
  item.rotation = rotation;
  Object.assign(item.params, params);
  return item.id;
};
// Rogue Thompson Fat Pad pulled out in front of the rig, as in the main photo.
floor('rogue-thompson-fat-pad', 100, 1200);
// Back wall, right corner: REP Adonis cable tower.
floor('rep-adonis-cable-tower', 1550, -900);
// Right wall, middle: REP ARES 2.0 dual-stack trainer → closest floor piece: REP Arcadia functional trainer
// (the builder allows one cable family per rack, and the rig already carries the Athena).
floor('rep-arcadia-functional-trainer', 1800, 650, -Math.PI / 2);
// Right wall, front by the garage door: Rogue Monster Rhino belt squat, iron on its horns.
floor('rogue-monster-rhino-belt-squat', 1580, 2270, 0, { plate: PLATE_SPECS.lb45.code, loaded: 3 });
// Black Widow dumbbell cart → closest: REP dumbbell storage cart, against the right wall by the door.
floor('rep-dumbbell-storage-cart', 1950, 3600, -Math.PI / 2);
// Ironmaster Quick-Lock dumbbells on their stand by the door opening.
floor('ironmaster-quick-lock-stand', 1400, 4300);
// Left/front: Temple of Gainz selectorized standing multi-flight.
floor('temple-of-gainz-multi-flight-v3', -725, 1200, Math.PI / 2);
// Bolt Fitness Storm Hydra leg extension/curl → closest: Temple of Gainz selectorized leg extension + seated curl.
floor('tog-selectorized-leg-extension-seated-curl-v3', -550, 2500);
// Benches out in the bay.
floor('rep-fb-5000', 300, 2600);
floor('prime-shorty-adjustable-bench', -450, 3700, Math.PI / 2);
// REP x Pépin FAST adjustables on the REP stand (the stand carries the pair).
floor('rep-pepin-stand', 600, 3900);
// Kensui AdaptaBELL pair on the floor.
floor('kensui-adaptabell', -700, 4450);
doc = addFloorItem(doc, 'kensui-adaptabell', [-400, 4450]);
// Medicine balls (they sit on the Black Widow upright in the photos) and an Elitefts plyo box → closest: Rogue Games Box.
floor('rogue-medicine-ball', -900, -600);
floor('dynamax-medicine-ball', -900, -150);
floor('rogue-games-box', -600, -1300);

// ── Room: one bay of a three-car garage, ~3.4 m wide × 6.3 m deep, ~3 m ceiling.
doc.room = { back: 1650, left: 1100, right: 2300, front: 4650, height: 3000 };

// ── Walls: black pegboards loaded with the handle collection.
doc = addWallItem(doc, 'pegboard-panel', { wall: 'back', position: [-600, 1400] });
doc = addWallItem(doc, 'pegboard-panel', { wall: 'left', position: [1900, 1300] });
const handles = [
  'mag-wide-grip', 'mag-medium-grip-neutral', 'mag-close-grip-neutral', 'mag-medium-grip-pronate', 'darko-lifting-shorty-bar',
  'porter-physed-eclipse-grip', 'prime-fitness-kaz-handles', 'prime-fitness-ro-t8-handles', 'mutant-metals-arc-cable-attachment',
  'rep-tricep-rope', 'rogue-rotating-v-grip', 'rep-straight-bar-25', 'spud-long-ab-strap',
];
for (const part of handles) {
  const [slot] = freeSlots(doc, part);
  if (!slot) { console.warn(`  no free hook for ${part}`); continue; }
  doc = placeHang(doc, part, slot);
}

writeGym({
  slug: 'cable-compound',
  title: 'Cable Compound',
  owner: 'Chris’s Cable Compound',
  sourceUrl: 'https://gymradar.com/gym/cable-compound',
  summary:
    'A single garage bay packed with cable stacks: an Athena crossover rig in the middle, a second dual-stack trainer and an Adonis tower on the walls, and a Rhino belt squat by the door, all on black rubber. The owner’s Rogue Monster uprights are shown as a REP PR-5000 (the Athena’s supported rack) and his ARES 2.0 as a REP Arcadia.',
  highlights: [
    'Almost all cable: just move a pin',
    'Athena crossover built into the rig',
    'Four weight stacks in one bay',
    'Pegboards full of cable handles',
    'The owner’s fourth garage gym',
  ],
  equipment: [
    'REP Athena selectorized side-mount functional trainer, dual stacks',
    'Rogue Monster uprights, 70″ crossmember and Black Widow flush extension (closest match: REP PR-5000 6-post, 93″ × 30″)',
    'REP Adonis cable tower',
    'REP ARES 2.0 dual-stack functional trainer (closest match: REP Arcadia functional trainer)',
    'Rogue Monster Rhino belt squat',
    'Temple of Gainz selectorized standing multi-flight V3',
    'Bolt Fitness Storm Hydra leg extension / curl (closest match: Temple of Gainz selectorized leg extension + seated curl)',
    'Irwin Fitness return roller J-cups 2.0',
    'Mutant Metals Snap-Back monolift rollers',
    'Mutant Metals Ultimate Dip Attachment (UDA)',
    'Rogue Monster Landmine 2.0 and REP × Kleva Adroit landmine',
    'REP 1.25″ pull-up bar (closest match for the Rogue Monster Solo pull-up bar)',
    'Black Widow low-profile spotters (closest match: REP spotter arms) carrying the REP Utility Seat',
    'REP Pegasus, Rogue Monster Pritchett Pad, Bullet Proof VTS and JD Gym Equipped wrist roller on the rig',
    'Beyond Power VOLTRA I (fixed mount; the owner uses a Darko QuickMount)',
    'Rogue Thompson Fat Pad, REP FB-5000 flat bench, PRIME Shorty adjustable bench',
    'REP × PÉPIN FAST adjustable dumbbells on the REP stand',
    'IronMaster Quick-Lock dumbbells and stand, Kensui AdaptaBELL pair',
    'Black Widow dumbbell cart (closest match: REP dumbbell storage cart)',
    'Rogue 45 lb Ohio Power Bar and Texas Power Bar, racked',
    'Rogue 6-Shooter grip plates (closest match: CAP gray Olympic iron) on plate horns',
    'Medicine balls and an Elitefts plyo box (closest match: Rogue Games Box)',
    'Black pegboards with MAG grips, Darko Shorty, Porter Eclipse, PRIME Kaz and RO-T8, Mutant ARC, rope, V-grip, straight bar and Spud ab strap',
    'Not placed: Darko Thresher pad, Exponent Edge GHD 2.0 and Infinity Arm, Rogue Shrimp Trawler and Multi-Use Roller, Prodigy RO-T8 station, Torque Relentless Ripper, Rogue MG-4CN, American Barbell California Bar, Bridge Built plate dock and much of the handle collection',
  ],
  doc,
});
