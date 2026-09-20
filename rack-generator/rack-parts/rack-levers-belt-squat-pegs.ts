/** Band pegs, plate storage pins, wrist roller and rack hoop (#135). Metadata only (main bundle): never import Manifold
 * builders here. Research: research/rack-levers-belt-squat.md. Builders: parts/rack-levers-belt-squat-pegs.ts. */
import { defineRackPart, PIN_1IN, PIN_5_8IN } from '../rack-part.ts';
import { PLATE_SPECS, plateStackLength, type PlateId } from '../plates.ts';
import type { LocalBox, NumericParams } from '../types.ts';
const inch = (v: number) => v * 25.4;
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
const pitch = (p: NumericParams) => p.mountSpacing ?? 50;
/** 3/4-inch rack hardware checks as this bore class (3/4" pins in 13/16" holes). */
export const PIN_3_4IN = 18.6;

// ---------------------------------------------------------------- plate loads shared by the storage pins
/** Plate presets for storage pins, root (upright side) outward. Offered only when they fit the loadable length. */
export const STORAGE_LOADS: readonly { label: string; plates: readonly PlateId[] }[] = [
  { label: 'Empty', plates: [] },
  { label: '2 × 45 lb iron', plates: ['lb45', 'lb45'] },
  { label: '4 × 45 lb iron', plates: ['lb45', 'lb45', 'lb45', 'lb45'] },
  { label: '45/35/25/10 lb iron', plates: ['lb45', 'lb35', 'lb25', 'lb10'] },
  { label: '2 × 25 kg bumpers', plates: ['kg25', 'kg25'] },
  { label: '3 × 25 kg bumpers', plates: ['kg25', 'kg25', 'kg25'] },
  { label: '25/20/15 kg bumpers', plates: ['kg25', 'kg20', 'kg15'] },
];
export const storageLoad = (i: number) => { const l = STORAGE_LOADS[i]; if (!l) throw Error('Unsupported plate load.'); return l; };
export const loadOptions = (loadable: number) => STORAGE_LOADS.flatMap((l, i) => plateStackLength(l.plates) <= loadable ? [i] : []);
export const loadRadius = (i: number) => Math.max(0, ...storageLoad(i).plates.map(p => PLATE_SPECS[p].diameter / 2));
const loadParam = (loadable: (p: NumericParams) => number) =>
  ({ key: 'load', label: 'Plates stored', default: 0, options: (p: NumericParams) => loadOptions(loadable(p)), format: (v: number) => STORAGE_LOADS[v]?.label ?? String(v) });

// ---------------------------------------------------------------- Rogue Monster Lite / Infinity band pegs
/** Published: 10" long, 5/8" diameter, zinc plated steel. Standard 5/8" hex head (15/16" AF, 27/64" tall) with the stamped R. */
export const ML_PEG = { length: inch(10), rod: inch(0.625), head: inch(27 / 64), hexAcrossFlats: inch(15 / 16) } as const;
export const ML_PEG_FINISHES = ['Bright zinc', 'Black'] as const;
export const mlPegProud = (p: NumericParams) => ML_PEG.length - 2 * face(p);
export const ROGUE_MONSTER_LITE_BAND_PEG = defineRackPart({
  id: 'rogue-monster-lite-band-peg', name: 'Rogue Monster Lite Band Peg', title: 'Rogue Monster Lite/Infinity Band Pegs', noun: 'band peg', section: 'Band pegs & grip',
  description: '5/8-inch hex-head band pegs for Monster Lite and Infinity uprights · 10 in long · bright zinc or black. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [{ key: 'finish', label: 'Finish', default: 0, options: [0, 1], format: v => ML_PEG_FINISHES[v] ?? String(v) }],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-lite-band-pegs-4-pack',
    credit: 'Rogue Fitness — Monster Lite/Infinity Band Pegs (RF0329) · Made in USA', trademark: 'Rogue, Monster Lite and Infinity are trademarks of Rogue Fitness.',
    reconstruction: 'Published 10 in length, 5/8 in diameter and zinc-plated steel. Hex head sized to a standard 5/8 in bolt head from product photos; physical fit unverified.',
  },
  mount: { pin: PIN_5_8IN, extent: { below: ML_PEG.hexAcrossFlats / Math.sqrt(3), above: ML_PEG.hexAcrossFlats / Math.sqrt(3) } },
  bodies: p => {
    const f = face(p), r = ML_PEG.rod / 2, h = ML_PEG.hexAcrossFlats / 2;
    return [{ min: [-r, f, -r], max: [r, f + mlPegProud(p), r] }, { min: [-h, -f - ML_PEG.head, -h], max: [h, -f, h] }];
  },
  pair: { default: true },
  placement: { height: 115, face: 'outside' },
});

// ---------------------------------------------------------------- REP Fitness Band Pegs 2.0
/** Published: 8.5" end to end, flat washer welded 3-3/8" from the bottom end, 4.5" usable, cotter pin, chrome. */
export const REP_PEG_SERIES = [
  { name: '5000 Series · 1 in', rod: inch(1), headDiameter: inch(2), washerDiameter: inch(1.75) },
  { name: '4000 Series · 5/8 in', rod: inch(0.625), headDiameter: inch(1.375), washerDiameter: inch(1.25) },
] as const;
export const REP_PEG = { length: inch(8.5), insert: inch(3.375), usable: inch(4.5), washer: inch(0.25), head: inch(0.375) } as const;
export const repPegSeries = (p: NumericParams) => { const s = REP_PEG_SERIES[p.series ?? 0]; if (!s) throw Error('Unsupported band peg series.'); return s; };
export const REP_BAND_PEGS_2 = defineRackPart({
  id: 'rep-band-pegs-2', name: 'REP Band Peg 2.0', title: 'REP Fitness Band Pegs 2.0', noun: 'band peg', section: 'Band pegs & grip',
  description: 'Chrome solid-steel band pegs with a welded stop washer and cotter pin · 8.5 in end to end · 4.5 in usable · 1 in (5000) or 5/8 in (4000). Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [{ key: 'series', label: 'Series', default: 0, options: [0, 1], format: v => REP_PEG_SERIES[v]?.name ?? String(v) }],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/band-pegs-2-0',
    credit: 'REP Fitness — Band Pegs 2.0 (PRA-5603 / PRA-4602)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published 8.5 in length, washer 3-3/8 in from the bottom end, 4.5 in usable length, bright chrome and cotter pin retention. Head and washer diameters and thicknesses estimated from the two product photos; physical fit unverified.',
  },
  mount: { pin: p => p.series ? PIN_5_8IN : PIN_1IN, extent: p => ({ below: repPegSeries(p).headDiameter / 2, above: repPegSeries(p).headDiameter / 2 }) },
  bodies: p => {
    const s = repPegSeries(p), f = face(p), r = s.rod / 2, w = s.washerDiameter / 2, h = s.headDiameter / 2, y1 = f + REP_PEG.washer + REP_PEG.usable;
    return [{ min: [-w, f, -w], max: [w, f + REP_PEG.washer, w] }, { min: [-r, f + REP_PEG.washer, -r], max: [r, y1, r] }, { min: [-h, y1, -h], max: [h, y1 + REP_PEG.head, h] }];
  },
  pair: { default: true },
  placement: { height: 115, face: 'outside' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 1 : 0 }),
});

// ---------------------------------------------------------------- Rogue Monster Plate Storage Pin
/** Published: 1.9" machined Acetal sheath on a 1" threaded pin, 6.75" or 12.75" loadable, Acetal washers both sides,
 * machined nut (or Monster Knurled Knob, 2.125" dia), keyhole or keyless. Collar and nut sizes estimated. */
export const MONSTER_PIN = { sheath: inch(1.9), rod: inch(1), lengths: [inch(12.75), inch(6.75)], washer: inch(0.125), washerDiameter: inch(2.5), collar: inch(0.625), collarDiameter: inch(2.25),
  nut: inch(0.875), nutAcrossFlats: inch(1.625), knob: inch(2.125), knobThick: inch(1), stub: inch(0.5) } as const;
export const MONSTER_PIN_LENGTHS = ['12.75 in loadable', '6.75 in loadable'] as const;
export const MONSTER_PIN_STYLES = ['Keyhole', 'Keyless'] as const;
export const MONSTER_PIN_REARS = ['Machined nut', 'Monster Knurled Knob'] as const;
export const monsterPinLoadable = (p: NumericParams) => { const l = MONSTER_PIN.lengths[p.length ?? 0]; if (l === undefined) throw Error('Unsupported storage pin length.'); return l; };
/** Sheath start (plate root) along +Y from the tube centre. */
export const monsterPinRoot = (p: NumericParams) => face(p) + MONSTER_PIN.washer + MONSTER_PIN.collar;
export const ROGUE_MONSTER_PLATE_STORAGE_PIN = defineRackPart({
  id: 'rogue-monster-plate-storage-pin', name: 'Rogue Monster Plate Storage Pin', title: 'Rogue Monster Plate Storage Pin', noun: 'storage pin', section: 'Band pegs & grip',
  description: '1 in threaded plate storage post with a 1.9 in machined Acetal sheath for Monster uprights · 6.75 in or 12.75 in loadable · keyhole or keyless. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'length', label: 'Loadable length', default: 0, options: [0, 1], format: v => MONSTER_PIN_LENGTHS[v] ?? String(v) },
    { key: 'style', label: 'Style', default: 0, options: [0, 1], format: v => MONSTER_PIN_STYLES[v] ?? String(v) },
    { key: 'rear', label: 'Rear fastener', default: 0, options: [0, 1], format: v => MONSTER_PIN_REARS[v] ?? String(v) },
    loadParam(monsterPinLoadable),
  ],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-monster-plate-storage-pin',
    credit: 'Rogue Fitness — Monster Plate Storage Pin (MSTOREPIN) · Made in USA', trademark: 'Rogue and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 1.9 in sheath, 1 in threaded pin, 6.75/12.75 in loadable lengths, Acetal washers, keyhole/keyless styles and the 2.125 in Knurled Knob. Collar, nut and keyhole nub sizes estimated from product photos; physical fit unverified.',
  },
  mount: {
    pin: PIN_1IN,
    extent: p => { const r = Math.max(MONSTER_PIN.washerDiameter / 2, MONSTER_PIN.knob / 2, loadRadius(p.load ?? 0)); return { below: r, above: r }; },
  },
  bodies: p => {
    const r = MONSTER_PIN.sheath / 2, root = monsterPinRoot(p), end = root + monsterPinLoadable(p), c = MONSTER_PIN.collarDiameter / 2, R = loadRadius(p.load ?? 0);
    const boxes: LocalBox[] = [{ min: [-c, face(p), -c], max: [c, root, c] }, { min: [-r, root, -r], max: [r, end, r] }];
    const plates = storageLoad(p.load ?? 0).plates;
    if (plates.length) boxes.push({ min: [-R, root, -R], max: [R, root + plateStackLength(plates), R] });
    return boxes;
  },
  pair: { default: true },
  placement: { height: 515, face: 'outside' },
});

// ---------------------------------------------------------------- Rogue SP3358 / SP33100 / SP2358 bolt-on plate storage
/** Published per version: loadable post length and bolt hardware; all bolt to the upright 6" on centre. */
export const SP_VERSIONS = [
  { name: 'SP3358 · Monster Lite · 5/8 in', sku: 'SP3358', loadable: inch(12.5), bolt: inch(0.625), pin: PIN_5_8IN },
  { name: 'SP33100 · Monster · 1 in', sku: 'SP33100', loadable: inch(11.75), bolt: inch(1), pin: PIN_1IN },
  { name: 'SP2358 · Infinity · 5/8 in', sku: 'SP2358', loadable: inch(12.25), bolt: inch(0.625), pin: PIN_5_8IN },
] as const;
/** Estimated from photos: 2.5" x 1/4" plate, 1.9" post, zinc spacer washer, flat rubber end cap. */
export const SP_POST = { spacing: inch(6), plateWidth: inch(2.5), plateThick: inch(0.25), plateMargin: inch(1.1), post: inch(1.9), washer: inch(2.4), washerThick: inch(0.25), cap: inch(0.375) } as const;
export const spVersion = (p: NumericParams) => { const v = SP_VERSIONS[p.version ?? 0]; if (!v) throw Error('Unsupported plate storage version.'); return v; };
/** Bolt stations 6" apart on this pitch, and the post centre below the top bolt. */
export const spStations = (p: NumericParams) => Math.max(1, Math.round(SP_POST.spacing / pitch(p)));
export const spPostZ = (p: NumericParams) => -spStations(p) * pitch(p) / 2;
export const spRoot = (p: NumericParams) => face(p) + SP_POST.plateThick + SP_POST.washerThick;
export const ROGUE_SP3358_PLATE_STORAGE = defineRackPart({
  id: 'rogue-sp3358-plate-storage', name: 'Rogue SP3358 Plate Storage', title: 'Rogue SP3358 Plate Storage Pair', noun: 'plate storage post', section: 'Band pegs & grip',
  description: 'Bolt-on plate storage posts with a two-bolt face plate, 6 in on centre · SP3358 Monster Lite 12.5 in · SP33100 Monster 11.75 in · SP2358 Infinity 12.25 in loadable. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'version', label: 'Version', default: 0, options: [0, 1, 2], format: v => SP_VERSIONS[v]?.name ?? String(v) },
    loadParam(p => spVersion(p).loadable),
  ],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/sp3358-plate-storage-long-for-monster-lite',
    credit: 'Rogue Fitness — SP3358 / SP33100 / SP2358 Plate Storage · Made in USA', trademark: 'Rogue, Monster, Monster Lite and Infinity are trademarks of Rogue Fitness.',
    reconstruction: 'Published loadable post lengths, 6 in bolt spacing and 5/8 or 1 in hardware per version. Face plate, post diameter, spacer washer and end cap estimated from product photos; physical fit unverified.',
  },
  mount: {
    pin: p => spVersion(p).pin, holes: p => [0, -spStations(p)], mainStations: true,
    extent: p => {
      const plate = spStations(p) * pitch(p) / 2 + SP_POST.plateMargin, r = Math.max(SP_POST.washer / 2, loadRadius(p.load ?? 0));
      return { below: Math.max(-spPostZ(p) + r, spStations(p) * pitch(p) + SP_POST.plateMargin), above: Math.max(plate + spPostZ(p), r + spPostZ(p), SP_POST.plateMargin) };
    },
  },
  bodies: p => {
    const z = spPostZ(p), r = SP_POST.post / 2, root = spRoot(p), end = root + spVersion(p).loadable, plates = storageLoad(p.load ?? 0).plates, R = loadRadius(p.load ?? 0);
    const boxes: LocalBox[] = [{ min: [-r, root, z - r], max: [r, end + SP_POST.cap, z + r] }];
    if (plates.length) boxes.push({ min: [-R, root, z - R], max: [R, root + plateStackLength(plates), z + R] });
    return boxes;
  },
  pair: { default: true },
  placement: { height: 615, face: 'outside' },
  autoFit: rack => ({ version: rack.holeDiameter < 20 ? 0 : 1 }),
});

// ---------------------------------------------------------------- JD Gym Equipped rack-mounted wrist roller
/** Published: 2" stainless thick grip, 16" long, paracord line with stainless carabiner, optional supination/pronation
 * crank handle (1.25" or 1.5" grip). Mount options for 3x3 with 1", 3/4" or 5/8" holes. Spool, collar, crank sizes estimated. */
export const WRIST_ROLLER = { diameter: inch(2), length: inch(16), spool: [inch(3.5), inch(6)] as const, spoolDiameter: inch(1.5), washer: inch(0.25), endCap: inch(0.5), stub: inch(0.6),
  crankDrop: inch(3.3), crankReach: inch(3.6), crankGrip: inch(7), bar: [inch(1), inch(0.25)] as const, cordDrop: inch(2.5) } as const;
export const WRIST_ROLLER_MOUNTS = [
  { name: '3x3 · 1 in hole', pin: PIN_1IN, axle: inch(1) },
  { name: '3x3 · 3/4 in hole', pin: PIN_3_4IN, axle: inch(0.75) },
  { name: '3x3 · 5/8 in hole', pin: PIN_5_8IN, axle: inch(0.625) },
] as const;
export const WRIST_ROLLER_FINISHES = ['Smooth polished', 'Knurled'] as const;
export const WRIST_ROLLER_CRANKS = ['None', '1.25 in crank grip', '1.5 in crank grip'] as const;
export const wristMount = (p: NumericParams) => { const m = WRIST_ROLLER_MOUNTS[p.hardware ?? 0]; if (!m) throw Error('Unsupported wrist roller mount.'); return m; };
export const crankGripDiameter = (p: NumericParams) => [0, inch(1.25), inch(1.5)][p.crank ?? 0] ?? 0;
export const wristRollerEnd = (p: NumericParams) => face(p) + WRIST_ROLLER.washer + WRIST_ROLLER.length;
export const JD_WRIST_ROLLER = defineRackPart({
  id: 'jd-gym-equipped-wrist-roller', name: 'JD Gym Equipped Wrist Roller', title: 'JD Gym Equipped Rack Mounted Wrist Roller', noun: 'wrist roller', section: 'Band pegs & grip',
  description: 'All-stainless 2 in thick-grip wrist roller that spins on a rack-hole axle · 16 in long · paracord and carabiner · optional supination/pronation crank. Independent reconstruction; JD Gym Equipped trademarks belong to JD Gym Equipped.',
  params: [
    { key: 'hardware', label: 'Rack mount', default: 0, options: [0, 1, 2], format: v => WRIST_ROLLER_MOUNTS[v]?.name ?? String(v) },
    { key: 'finish', label: 'Finish', default: 1, options: [0, 1], format: v => WRIST_ROLLER_FINISHES[v] ?? String(v) },
    { key: 'crank', label: 'Crank handle', default: 0, options: [0, 1, 2], format: v => WRIST_ROLLER_CRANKS[v] ?? String(v) },
  ],
  vendor: {
    vendor: 'JD Gym Equipped', url: 'https://jdgymequipped.com/products/rack-mounted-stainless-wrist-roller',
    credit: 'JD Gym Equipped — Rack Mounted Stainless Wrist Roller · Made in USA', trademark: 'JD Gym Equipped is a trademark of JD Gym Equipped.',
    reconstruction: 'Published 2 in stainless grip, 16 in length, paracord with carabiner, mount hole sizes and crank grip diameters. Axle, spool groove, end collar and crank geometry estimated from product photos; physical fit unverified.',
  },
  mount: {
    pin: p => wristMount(p).pin,
    extent: p => ({ below: WRIST_ROLLER.diameter / 2 + WRIST_ROLLER.cordDrop + inch(2.5), above: p.crank ? WRIST_ROLLER.crankGrip - WRIST_ROLLER.crankDrop : WRIST_ROLLER.diameter / 2 }),
  },
  bodies: p => {
    const r = WRIST_ROLLER.diameter / 2, y0 = face(p) + WRIST_ROLLER.washer, y1 = wristRollerEnd(p), boxes: LocalBox[] = [{ min: [-r, y0, -r], max: [r, y1 + WRIST_ROLLER.endCap, r] }];
    if (p.crank) {
      const g = crankGripDiameter(p) / 2, gy = y1 + WRIST_ROLLER.endCap + WRIST_ROLLER.bar[1] + WRIST_ROLLER.crankReach, bottom = -WRIST_ROLLER.crankDrop;
      boxes.push({ min: [-g, gy - g, bottom - inch(0.5)], max: [g, gy + g, bottom + WRIST_ROLLER.crankGrip - inch(0.5)] });
    }
    return boxes;
  },
  pair: { default: false },
  placement: { height: 1415, face: 'front' },
  autoFit: rack => ({ hardware: rack.holeDiameter < 18 ? 2 : rack.holeDiameter < 23 ? 1 : 0 }),
});

// ---------------------------------------------------------------- Oak Club Mfg The Iron 3 mini hoop
/** Published: 9" mini hoop, 16.75 x 10.75" steel backboard, fits 3x3 posts with 1" or 5/8" holes via a MagPin or
 * hitch pin (sold separately), Sandtex Black / Red Baron / Matte White. Plate thickness, bracket and standoff estimated. */
export const IRON3 = { board: [inch(16.75), inch(10.75)] as const, thick: inch(0.1875), corner: inch(0.9), standoff: inch(1.25), pinAboveBottom: inch(2.3),
  rim: inch(9), rimRod: inch(0.5), rimGap: inch(1), rimRise: inch(1), net: inch(8) } as const;
export const IRON3_COLOURS = [
  { name: 'Sandtex Black', color: '#1d1e20', roughness: .88 },
  { name: 'Red Baron', color: '#b3161d', roughness: .55 },
  { name: 'Matte White', color: '#e8e8e4', roughness: .7 },
] as const;
export const IRON3_PINS = ['1 in MagPin', '5/8 in MagPin'] as const;
export const iron3Colour = (p: NumericParams) => { const c = IRON3_COLOURS[p.colour ?? 0]; if (!c) throw Error('Unsupported hoop colour.'); return c; };
/** Backboard front plane and rim centre in the part frame (origin at the pin). */
export function iron3Layout(p: NumericParams) {
  const f = face(p), back = f + IRON3.standoff, front = back + IRON3.thick, bottom = -IRON3.pinAboveBottom, top = bottom + IRON3.board[1];
  const rimR = IRON3.rim / 2 + IRON3.rimRod / 2, rimY = front + IRON3.rimGap + rimR, rimZ = bottom + IRON3.rimRise;
  return { f, back, front, bottom, top, rimR, rimY, rimZ, netBottom: rimZ - IRON3.net };
}
export const OAK_CLUB_IRON_3 = defineRackPart({
  id: 'oak-club-iron-3', name: 'Oak Club Iron 3 Hoop', title: 'Oak Club Mfg The Iron 3 (Oak Club Iron)', noun: 'mini hoop', section: 'Band pegs & grip',
  description: 'Rack-mounted mini basketball hoop · 9 in rim · 16.75 x 10.75 in laser-cut steel playing-card backboard · pins to 3x3 posts. Independent reconstruction; Oak Club Mfg trademarks belong to Oak Club Mfg.',
  params: [
    { key: 'colour', label: 'Backboard colour', default: 0, options: [0, 1, 2], format: v => IRON3_COLOURS[v]?.name ?? String(v) },
    { key: 'hardware', label: 'Pin', default: 0, options: [0, 1], format: v => IRON3_PINS[v] ?? String(v) },
  ],
  vendor: {
    vendor: 'Oak Club Mfg', url: 'https://oakclubmfg.com/products/the-iron-3',
    credit: 'Oak Club Mfg — The Iron 3 · Made in Canada', trademark: 'Oak Club Mfg and The Iron 3 are trademarks of Oak Club Mfg.',
    reconstruction: 'Published 9 in hoop, 16.75 x 10.75 in backboard, 3x3 post fit with 1 or 5/8 in holes and colourways. Cut-out artwork simplified to the card border, shooter square, Q and club; plate thickness, wrap bracket, standoff and net estimated from product photos; physical fit unverified.',
  },
  mount: {
    pin: p => p.hardware ? PIN_5_8IN : PIN_1IN, faces: ['front', 'back', 'left', 'right'],
    extent: p => { const l = iron3Layout(p); return { below: -l.netBottom + 3, above: l.top }; },
  },
  bodies: p => {
    const l = iron3Layout(p), w = IRON3.board[0] / 2;
    return [
      { min: [-w, l.back, l.bottom], max: [w, l.front, l.top] },
      { min: [-l.rimR, l.front, l.netBottom], max: [l.rimR, l.rimY + l.rimR, l.rimZ + IRON3.rimRod] },
    ];
  },
  pair: { default: false },
  placement: { height: 1815, face: 'front' },
  autoFit: rack => ({ hardware: rack.holeDiameter < 20 ? 1 : 0 }),
});
