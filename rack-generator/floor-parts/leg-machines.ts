/** Leg extension/curl and leg press/hack squat machines. Metadata only (main bundle): never import Manifold builders here.
 * Family slot: list this file's entries in PARTS; floor-registry.ts already spreads it.
 * Each machine is one pure description (leg-machines-models.ts); its floor footprint is the exact bounds of that
 * description for the chosen pose, pads and plates, so swinging a lever or loading a horn moves the footprint too. */
import { defineFloorPart, type FloorParam, type FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';
import { centred, footprintOf, type Describe } from './leg-machines-kit.ts';
import { MIKOLO_TAWERET, TAWERET_REPS, describeMikoloTaweret } from './leg-machines-mikolo.ts';
import { FORCE_CLP, GMWD_LE08, RITFIT_PLC01, TITAN_LPHS, TOG_QUADSEND, describeForceClp, describeTitanLphs, describeTogQuadsend, TITAN_LEC_REPS, describeGmwdLe08, describeLionscoolV4, describeRitfitPlc01, describeTitanLec, describeTitanSelector, describeTogV3, range, titanSelectorWeights, togV3Weights } from './leg-machines-models.ts';
const deg = (v: number) => `${v}°`, plates45 = (v: number) => v ? `${v} × 45 lb` : 'Unloaded';
const mode = (labels: readonly string[]): FloorParam => ({ key: 'mode', label: 'Exercise', default: 0, options: labels.map((_, i) => i), format: v => labels[v] ?? String(v) });
const rep = (labels: readonly string[] = TITAN_LEC_REPS): FloorParam => ({ key: 'rep', label: 'Lever position', default: 0, options: labels.map((_, i) => i), format: v => labels[v] ?? String(v) });
const position = (key: string, label: string, n: number, def: number): FloorParam => ({ key, label, default: def, options: range(n), format: v => `Position ${v}` });
const plates = (max: number, label = 'Plates per horn'): FloorParam => ({ key: 'plates', label, default: 0, options: range(max + 1, 0), format: plates45 });
interface Model { describe: Describe }
const MODELS = new Map<string, Model>();
function machine<const Id extends string>(spec: Omit<Parameters<typeof defineFloorPart<Id>>[0], 'footprint' | 'section' | 'noun'> & { describe: Describe }): FloorPart<Id> {
  const defaults = Object.fromEntries(spec.params.map(p => [p.key, p.default])) as NumericParams, describe = centred(spec.describe, defaults);
  MODELS.set(spec.id, { describe });
  const cache = new Map<string, ReturnType<typeof footprintOf>>();
  return defineFloorPart({ ...spec, section: 'Machines', noun: 'machine', placement: spec.placement ?? { side: 'right', gap: 400 },
    footprint: (p: NumericParams) => { const key = JSON.stringify(p); let box = cache.get(key); if (!box) { box = footprintOf(describe, { ...defaults, ...p }); if (cache.size > 200) cache.clear(); cache.set(key, box); } return box; } });
}
export const legMachineModel = (id: string) => { const m = MODELS.get(id); if (!m) throw Error(`Unknown leg machine ${id}.`); return m; };
export const TITAN_LEG_EXTENSION_CURL = machine({
  id: 'titan-leg-extension-curl', name: 'Titan leg extension & curl', title: 'Titan Leg Extension & Hamstring Curl Machine',
  description: 'Titan Fitness plate-loaded Leg Extension & Hamstring Curl Machine (401556, V2): rotary dial lever, 10" weight post, 7-position seat depth and knee pad. Independent reconstruction from published dimensions; Titan Fitness trademarks belong to Titan Fitness.',
  params: [mode(['Leg extension', 'Seated leg curl']), rep(), position('thighPad', 'Knee pad', 7, 4), position('backPad', 'Seat depth', 7, 4),
    { key: 'seatAngle', label: 'Seat angle', default: 10.5, options: [7, 10.5, 14], format: deg }, plates(6)],
  describe: describeTitanLec,
  vendor: { vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/leg-extension-curl-machine', credit: 'Titan Fitness — Leg Extension & Hamstring Curl Machine (401556)', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.',
    reconstruction: 'Independent Manifold reconstruction. Published: 39" × 42" × 36" envelope, seat 22" × 17" × 2", back pad 15" × 10" × 2", 17" × 5" rollers, 10" × 49 mm weight post, 7 seat-depth and knee-pad positions, 7/10.5/14° seat, 11-gauge 2" × 3" and 2" × 2" tube (operator manual parts list). Estimated: pivot height, lever and weight-arm lengths, dial diameter, arc bracket, handle and storage-post details, from product photos; scenery only, excluded from print export.' },
});
export const MIKOLO_TAWERET_MACHINE = machine({
  id: 'mikolo-taweret-leg-extension-curl', name: 'Mikolo TAWERET', title: 'Mikolo TAWERET 1:1 Leg Extension & Curl',
  description: 'Mikolo × GMWD TAWERET 1:1 Cable Ratio Leg Extension and Prone Leg Curl (LE09): knee lever on a 25-position cam disc with a 7-position Ø6" roller arm, cable over a red aluminium tower pulley to a plate-loaded lever under the seat with its chrome 2" horn on the right, 5-position backrest that folds flat behind the seat, and a seat that tilts 13° into a thigh pad for curls; black or red frame. Independent reconstruction from published dimensions; Mikolo and GMWD trademarks belong to their owners.',
  params: [mode(['Leg extension', 'Prone leg curl']), rep(TAWERET_REPS), position('roller', 'Roller arm', 7, 4), position('backPad', 'Backrest', 5, 3),
    { key: 'color', label: 'Frame colour', default: 0, options: [0, 1], format: v => MIKOLO_TAWERET.colors[v]?.[0] ?? String(v) }, plates(6)],
  describe: describeMikoloTaweret,
  vendor: { vendor: 'Mikolo', url: 'https://gym-mikolo.com/products/taweret%E2%84%A2-leg-extension-and-prone-leg-curl-machine', credit: 'Mikolo × GMWD — TAWERET 1:1 Cable Ratio Leg Extension and Curl Machine (LE09)', trademark: 'Mikolo and TAWERET are trademarks of Mikolo; GMWD is a trademark of GMWD Fitness.',
    reconstruction: 'Independent Manifold reconstruction. Published (archived gym-mikolo.com spec table and dimension drawing, Feb 2026): 49.6" L × 30.6" W × 43.5" H, 14.2" × 25.6" backrest, 20.5" seat, 17.8" leg roller (5.5" in the table, 6" in the launch video), 2" × 2" 14-ga and 2" × 3" 12-ga steel, 1:1 cable, 2" plates, 400 lb, 25 cam / 7 roller / 5 backrest positions, black or red. Estimated from the right-side video frame scaled to the 43.5" height: pivot, seat and tower heights, cam and pulley sizes, lever and horn positions, A-frame and handle layout. Scenery only, excluded from print export.' },
});
const colour = (list: readonly (readonly [string, string])[], label: string): FloorParam => ({ key: 'color', label, default: 0, options: list.map((_, i) => i), format: v => list[v]?.[0] ?? String(v) });
export const GMWD_LE08_MACHINE = machine({
  id: 'gmwd-le08-leg-extension-curl', name: 'GMWD LE08 2.0', title: 'GMWD LE08 2.0 Leg Extension & Prone Leg Curl',
  description: 'GMWD LE08 2.0 commercial plate-loaded leg extension and prone leg curl: perforated 3" × 3" frame, coloured movement arms, link-driven load lever with the 1.1/1.2 ratio block, 7-position back pad. Independent reconstruction from published dimensions; GMWD trademarks belong to GMWD.',
  params: [mode(['Leg extension', 'Prone leg curl']), rep(), position('backPad', 'Back pad', 7, 4), colour(GMWD_LE08.colors, 'Arm colour'), plates(6)],
  describe: describeGmwdLe08,
  vendor: { vendor: 'GMWD', url: 'https://www.gmwdfitness.com/products/commercial-leg-extension-prone-leg-curl-machine-le08', credit: 'GMWD — Commercial Leg Extension and Prone Leg Curl Machine LE08 2.0', trademark: 'GMWD is a trademark of GMWD Fitness.',
    reconstruction: 'Independent Manifold reconstruction. Published: 54.6" L × 55.4" W × 38.8" H (62.6" as a prone curl), 21.7" shin roller, 10.6" load horn, 10" storage posts, 2.4" pads, 7.3" grips, 7 back-pad positions, 12-gauge steel, four arm colourways. Estimated from product photos: tube layout, pivot height, arm and crank lengths, link geometry, dial and tibia-pad sizes; the published 25.6" backrest length did not reconcile with the 38.8" height, so the pad is sized from the photos. Scenery only, excluded from print export.' },
});
export const LIONSCOOL_V4_MACHINE = machine({
  id: 'lionscool-leg-extension-curl-v4', name: 'Lionscool V4.0', title: 'Lionscool Leg Extension & Curl Machine V4.0',
  description: 'Lionscool Leg Extension and Curl Machine V4.0: A-frame knee pivot with a cable drum and aluminium idler lifting a V-shaped load arm with dual 7.1" horns; back pad folds flat for prone curls. Independent reconstruction from published dimensions; Lionscool trademarks belong to Lionscool.',
  params: [mode(['Leg extension', 'Prone leg curl']), rep(), position('thighPad', 'Thigh roller', 5, 3), position('backPad', 'Back pad', 5, 3), plates(4)],
  describe: describeLionscoolV4,
  vendor: { vendor: 'Lionscool', url: 'https://lionscool.com/products/lionscool-leg-extension-machine', credit: 'Lionscool — Leg Extension and Curl Machine V4.0', trademark: 'Lionscool is a trademark of Lionscool.',
    reconstruction: 'Independent Manifold reconstruction. Published: 40.8" L × 33" W × 38.3" H, backrest 12.4" × 21.6", seat 16" × 16.7", 19.7" leg roller, 16" thigh roller, dual 7.1" horns, 2.2" pads, 1:1 cable. Estimated from product photos and the V4 manual: A-frame geometry, pivot and seat heights, drum and idler sizes, load-arm shape and length. Scenery only, excluded from print export.' },
});
export const RITFIT_PLC01_MACHINE = machine({
  id: 'ritfit-plc01-leg-extension-curl', name: 'RitFit PLC01', title: 'RitFit PLC01 Leg Extension Curl Machine',
  description: 'RitFit PLC01 plate-loaded leg extension and prone curl: 12-position steel dial and drum at the knee, cable over a tower pulley to a lever-mounted 13" chrome weight holder under the seat, 4-angle back pad, rear storage post. Independent reconstruction from published dimensions; RitFit trademarks belong to RitFit.',
  params: [mode(['Leg extension', 'Prone leg curl']), rep(), { key: 'back', label: 'Backrest', default: 2, options: [1, 2, 3, 4], format: v => ['80°', '70°', '60°', 'Flat'][v - 1] ?? String(v) }, colour(RITFIT_PLC01.colors, 'Upholstery'), plates(8)],
  describe: describeRitfitPlc01,
  vendor: { vendor: 'RitFit', url: 'https://www.ritfit.com/products/ritfit-plc01-leg-extension-curl-machine', credit: 'RitFit — PLC01 Leg Extension Curl Machine', trademark: 'RitFit is a trademark of RitFit.',
    reconstruction: 'Independent Manifold reconstruction. Published: 50.9" L × 43.5" W × 42.7" H, 13.01" weight holder, 16.54" leg stop, 4 backrest angles, 12 range positions, 3:2 cable ratio, 375 lb plates, black or pink upholstery. Estimated from product photos and the owner\'s manual drawing: tube layout, pivot height, dial, drum and pulley sizes, lever length and backrest angles. Scenery only, excluded from print export.' },
});
const pin = (weights: readonly number[], def: number, unit = 'lb'): FloorParam => ({ key: 'pin', label: 'Selector pin', default: def, options: weights, format: v => `${v} ${unit}` });
export const TITAN_SELECTORIZED_MACHINE = machine({
  id: 'titan-selectorized-leg-extension-curl', name: 'Titan selectorized leg ext/curl', title: 'Titan Selectorized Leg Extension and Curl Machine',
  description: 'Titan Fitness Selectorized Leg Extension and Curl Machine (401926): 250 lb stack in 10 lb steps with a magnetised pin, spiral cam and red anodised pulleys, 7-position backrest and thigh pad. Independent reconstruction from published dimensions; Titan Fitness trademarks belong to Titan Fitness.',
  params: [mode(['Leg extension', 'Seated leg curl']), rep(), position('thighPad', 'Thigh pad', 7, 4), position('backPad', 'Backrest', 7, 4), pin(titanSelectorWeights(), 50)],
  describe: describeTitanSelector,
  vendor: { vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/selectorized-leg-extension-and-curl-machine', credit: 'Titan Fitness — Selectorized Leg Extension and Curl Machine (401926)', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.',
    reconstruction: 'Independent Manifold reconstruction. Published: 63" H × 36" W × 60" D, 10 lb start and 250 lb stack in 10 lb steps (24 plates + top in the operator manual), 1:1 spiral cam, 5 mm nylon cable, red anodised pulleys (Φ115 × 3, Φ95 × 1), 7 backrest and 7 thigh-pad positions. Estimated from product photos and the exploded view: tower and header proportions, plate size, pivot height, lever, cam and sheave-arm lengths, pad sizes. Scenery only, excluded from print export.' },
});
export const TOG_V3_MACHINE = machine({
  id: 'tog-selectorized-leg-extension-seated-curl-v3', name: 'Temple of Gainz leg ext/curl V3', title: 'Temple of Gainz Selectorized Leg Extension + Seated Leg Curl V3',
  description: 'Temple of Gainz Selectorized Leg Extension + Seated Leg Curl Version 3: 120 kg stack at 1:1 behind a laser-cut logo shroud, cam-driven movement arm with 9 start and 5 roller positions, 8-stop thigh pad, sliding back pad. Independent reconstruction from published dimensions; Temple of Gainz trademarks belong to Temple of Gainz.',
  params: [mode(['Leg extension', 'Seated leg curl']), rep(), position('roller', 'Roller position', 5, 3), position('thighPad', 'Thigh pad', 8, 4), position('backPad', 'Back pad', 7, 4), pin(togV3Weights(), 30, 'kg')],
  describe: describeTogV3,
  vendor: { vendor: 'Temple of Gainz', url: 'https://templeofgainz.com/products/selectorized-leg-extension-seated-leg-curl-version-3', credit: 'Temple of Gainz — Selectorized Leg Extension + Seated Leg Curl Version 3', trademark: 'Temple of Gainz and The Quadrilogy are trademarks of Temple of Gainz.',
    reconstruction: 'Independent Manifold reconstruction. Published (dimensions panel): 61" H, 38.8" overall and 29.8" frame width, 46.5" long at rest and 64.9" with the arm extended, 28.3" frame footprint; 120 kg / 264 lb stack at 1:1; 9 arm, 5 roller and 8 thigh-pad positions. Estimated from the product renders: tower, shroud and header proportions, plate size, cam, pivot height and pad sizes. Scenery only, excluded from print export.' },
});
const sled = (travel: readonly number[]): FloorParam => ({ key: 'sled', label: 'Sled position', default: 0, options: travel.map((_, i) => i), format: v => v ? `${travel[v]} mm up the rails` : 'Racked on the safeties' });
const pressMode: FloorParam = { key: 'mode', label: 'Setup', default: 0, options: [0, 1], format: v => ['Leg press', 'Hack squat'][v] ?? String(v) };
export const FORCE_COMPACT_LEG_PRESS = machine({
  id: 'force-usa-compact-leg-press-hack-squat', name: 'Force USA Compact Leg Press', title: 'Force USA Compact Leg Press & Hack Squat',
  description: 'Force USA Compact Leg Press & Hack Squat (2027 model, F-CLP-V4): 30° sled on twin chrome guide rods, 35" × 29.5" notched footplate, seat and back pad that recline into a hack squat with shoulder pads, J handles on the plate sleeves. Independent reconstruction from published dimensions; Force USA trademarks belong to Force USA.',
  params: [pressMode, sled(FORCE_CLP.travel), { key: 'footplate', label: 'Footplate angle', default: 2, options: [1, 2, 3, 4], format: v => `Notch ${v}` }, plates(7, 'Plates per sleeve')],
  describe: describeForceClp,
  vendor: { vendor: 'Force USA', url: 'https://www.forceusa.com/products/compact-leg-press-hack-squat', credit: 'Force USA — Compact Leg Press & Hack Squat (2027 model)', trademark: 'Force USA is a trademark of Force USA.',
    reconstruction: 'Independent Manifold reconstruction of the current (2027, F-CLP-V4) model. Published: 52" W × 65" D × 57" H, 35" × 29.5" footplate, 30° incline, 38 lb sled, 700 lb plate rating, lockout safety positions, 4-notch footplate bracket and the parts list of the F-CLP-V4 manual. Estimated from product photos and manual drawings: rod length and spacing, sled length, pad sizes, sleeve length, J-handle shape, base tube layout. Scenery only, excluded from print export.' },
});
export const TOG_QUADSEND_MACHINE = machine({
  id: 'tog-quadsend-leg-press-hack-squat', name: 'Temple of Gainz Quadsend', title: 'Temple of Gainz Quadsend 37.5° Leg Press + Hack Squat',
  description: 'Temple of Gainz THE QUADSEND 37.5° Leg Press + Hack Squat: laser-cut triangular side panels, 37.5° sled on linear bearings with the notched leg-press footplate or hack-squat back and shoulder pads, reclining leg-press seat, standard 66.2" or Shorty 50.2" horn, five storage horns a side. Independent reconstruction from published dimensions; Temple of Gainz trademarks belong to Temple of Gainz.',
  params: [pressMode, sled(TOG_QUADSEND.travel), { key: 'horn', label: 'Weight horn', default: 0, options: [0, 1], format: v => ['Standard 66.2"', 'Shorty 50.2"'][v] ?? String(v) }, plates(8, 'Plates per horn')],
  describe: describeTogQuadsend,
  vendor: { vendor: 'Temple of Gainz', url: 'https://templeofgainz.com/products/plate-loaded-the-quadsend-37-5-degree-leg-press-plus-hack-squat-machine-combo', credit: 'Temple of Gainz — THE QUADSEND 37.5° Leg Press + Hack Squat Machine', trademark: 'Temple of Gainz and The Quadsend are trademarks of Temple of Gainz.',
    reconstruction: 'Independent Manifold reconstruction. Published (dimension renders): 99.3" L × 56.2" H, 32.5" frame footprint, 42.3" disengagement handles, 57.3" storage horns, 66.2" standard / 50.2" Shorty weight horn, 50.8" band pegs, 30.5" × 22" LP footplate, 36" × 24" HS footplate, 37.5° sled. Estimated from the product renders: rail length and spacing, sled length, seat and pad sizes and angles, side-panel outline. Scenery only, excluded from print export.' },
});
export const TITAN_LEG_PRESS_HACK_SQUAT = machine({
  id: 'titan-leg-press-hack-squat', name: 'Titan leg press / hack squat', title: 'Titan Leg Press Hack Squat Machine',
  description: 'Titan Fitness plate-loaded Leg Press Hack Squat Machine (401486): 45° carriage on steel rails with back and shoulder pads and a fold-up leg-press footplate, front flip unit with the hack-squat footplate and leg-press back pad, three-stop side handles, 11.25" weight sleeves and storage posts. Independent reconstruction from published dimensions; Titan Fitness trademarks belong to Titan Fitness.',
  params: [pressMode, sled(TITAN_LPHS.travel), { key: 'footplate', label: 'Hack footplate', default: 2, options: [1, 2, 3, 4], format: v => `Position ${v}` }, plates(7, 'Plates per sleeve')],
  describe: describeTitanLphs,
  vendor: { vendor: 'Titan Fitness', url: 'https://www.titan.fitness/products/leg-press-hack-squat-machine', credit: 'Titan Fitness — Leg Press Hack Squat Machine (401486)', trademark: 'Titan and Titan Fitness are trademarks of Titan Fitness.',
    reconstruction: 'Independent Manifold reconstruction. Published: 84" L × 40" W × 53" H, 45° carriage (80 lb), LP footplate 21" × 15", LP back pad 10.5" × 31", HS footplate 26" × 22" with 4 positions, HS back pad 20" × 15", shoulder pads 4.5" × 8" at 7.5" spread, 11.25" weight sleeves, 11.75" storage posts, 49 mm, 1,000 lb; frame layout from the operator manual exploded views. Estimated from product photos: rail length and spacing, carriage length, flip-unit hinge and angles, handle frames. Scenery only, excluded from print export.' },
});
export const PARTS = [TITAN_LEG_EXTENSION_CURL, MIKOLO_TAWERET_MACHINE, GMWD_LE08_MACHINE, LIONSCOOL_V4_MACHINE, RITFIT_PLC01_MACHINE, TOG_V3_MACHINE, TITAN_SELECTORIZED_MACHINE, FORCE_COMPACT_LEG_PRESS, TOG_QUADSEND_MACHINE, TITAN_LEG_PRESS_HACK_SQUAT] as const satisfies readonly FloorPart[];
