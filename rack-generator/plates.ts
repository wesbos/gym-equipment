import type { NumericParams, Vec3 } from './types.ts';
/** Olympic plates, millimetres. Pure data and validation; geometry lives in parts/plates.ts.
 * Bumpers: Rogue HG 2.0 KG (IWF 450 mm, 50.4 mm collar opening), published widths
 * 25 kg 3.5", 20 kg 3.25", 15 kg 2.625", 10 kg 1.75". Iron: Rogue machined Olympic plates,
 * 45/35/25 lb 1.5" wide at 448/360/300 mm, 10 lb 1.22" at 228 mm.
 * Colors are fixed IWF semantics, never frame appearance.
 */
export type PlateId = 'kg25' | 'kg20' | 'kg15' | 'kg10' | 'lb45' | 'lb35' | 'lb25' | 'lb10';
export interface PlateSpec { label: string; weight: number; unit: 'kg' | 'lb'; style: 'bumper' | 'iron'; diameter: number; width: number; color: string; /** Stable numeric code for geometry params. */ code: number }
export const PLATE_BORE = 50.4;
/** Visual clearance between neighbouring plates; counted in stack length. */
export const PLATE_GAP = 0.5;
export const PLATE_SPECS: Readonly<Record<PlateId, Readonly<PlateSpec>>> = Object.freeze({
  kg25: { label: '25 kg', weight: 25, unit: 'kg', style: 'bumper', diameter: 450, width: 88.9, color: '#c8202f', code: 1 },
  kg20: { label: '20 kg', weight: 20, unit: 'kg', style: 'bumper', diameter: 450, width: 82.55, color: '#1f58b5', code: 2 },
  kg15: { label: '15 kg', weight: 15, unit: 'kg', style: 'bumper', diameter: 450, width: 66.675, color: '#f2c318', code: 3 },
  kg10: { label: '10 kg', weight: 10, unit: 'kg', style: 'bumper', diameter: 450, width: 44.45, color: '#23894a', code: 4 },
  lb45: { label: '45 lb', weight: 45, unit: 'lb', style: 'iron', diameter: 448, width: 38.1, color: '#1d1f21', code: 5 },
  lb35: { label: '35 lb', weight: 35, unit: 'lb', style: 'iron', diameter: 360, width: 38.1, color: '#1d1f21', code: 6 },
  lb25: { label: '25 lb', weight: 25, unit: 'lb', style: 'iron', diameter: 300, width: 38.1, color: '#1d1f21', code: 7 },
  lb10: { label: '10 lb', weight: 10, unit: 'lb', style: 'iron', diameter: 228, width: 30.988, color: '#1d1f21', code: 8 },
});
export const PLATE_IDS = Object.freeze(Object.keys(PLATE_SPECS) as PlateId[]);
export const isPlateId = (v: unknown): v is PlateId => typeof v === 'string' && Object.hasOwn(PLATE_SPECS, v);
/** Usable peg from the collar face (start) to the tip (end) along the part-local axis. */
export interface PlatePeg { origin: Vec3; axis: Vec3; length: number }
const PEGS: Record<string, PlatePeg> = {
  // Revolve profiles in parts/attachments.ts: shoulder collar to 3 mm tip chamfer, 48.5 mm peg.
  'storage-pin-short': { origin: [-65, 0, 39.88769], axis: [1, 0, 0], length: 235 },
  'storage-pin-long': { origin: [-122.5, 0, 39.881585], axis: [1, 0, 0], length: 350 },
};
export const platePeg = (part: string): PlatePeg | undefined => Object.hasOwn(PEGS, part) ? PEGS[part] : undefined;
export const holdsPlates = (part: string) => !!platePeg(part);
export const plateStackLength = (plates: readonly PlateId[]) => plates.reduce((sum, p, i) => sum + PLATE_SPECS[p].width + (i ? PLATE_GAP : 0), 0);
export const plateStackRadius = (plates: readonly PlateId[]) => Math.max(0, ...plates.map(p => PLATE_SPECS[p].diameter / 2));
export function plateTotals(plates: readonly PlateId[]): { kg: number; lb: number } {
  const totals = { kg: 0, lb: 0 };
  for (const p of plates) totals[PLATE_SPECS[p].unit] += PLATE_SPECS[p].weight;
  return totals;
}
export const plateTotalLabel = (plates: readonly PlateId[]) => {
  const { kg, lb } = plateTotals(plates);
  return [kg && `${kg} kg`, lb && `${lb} lb`].filter(Boolean).join(' + ') || 'Empty';
};
export const MAX_PLATES = 16;
const label = (part: string) => part === 'storage-pin-long' ? 'long storage pin' : 'short storage pin';
/** Returns a detached stack or throws a user-facing capacity error. */
export function validatePlateStack(part: string, input: unknown): PlateId[] {
  if (!Array.isArray(input) || input.length > MAX_PLATES) throw Error(`A plate stack holds at most ${MAX_PLATES} plates.`);
  if (!input.every(isPlateId)) throw Error('Unknown weight plate.');
  const peg = platePeg(part);
  if (!peg) { if (input.length) throw Error('Only weight storage pins hold plates.'); return []; }
  const used = plateStackLength(input);
  if (used > peg.length + 1e-6) throw Error(`Over capacity: these plates need ${round(used)} mm but the ${label(part)} holds ${peg.length} mm.`);
  return [...input];
}
/** Lowest plate edge above the floor for a peg axis at `axisZ`. */
export function validatePlateFloor(plates: readonly PlateId[], axisZ: number) {
  const radius = plateStackRadius(plates);
  if (plates.length && axisZ - radius < 0) throw Error(`Loaded ${round(radius * 2)} mm plates would reach through the floor at this hole; raise the pin at least ${Math.ceil(radius - axisZ)} mm or unload it.`);
}
/** Room left for one more plate of this kind; negative means it does not fit. */
export function plateRoom(part: string, plates: readonly PlateId[]) {
  const peg = platePeg(part);
  return peg ? peg.length - plateStackLength(plates) - (plates.length ? PLATE_GAP : 0) : 0;
}
const round = (v: number) => Math.round(v * 10) / 10;
/** Consecutive runs, the inspector's weight × count rows (root outward). */
export function plateRuns(plates: readonly PlateId[]): { plate: PlateId; count: number }[] {
  const runs: { plate: PlateId; count: number }[] = [];
  for (const plate of plates) runs.at(-1)?.plate === plate ? runs.at(-1)!.count++ : runs.push({ plate, count: 1 });
  return runs;
}
export const expandRuns = (runs: readonly { plate: PlateId; count: number }[]) => runs.flatMap(r => Array<PlateId>(Math.max(0, Math.floor(r.count))).fill(r.plate));
export const PLATE_PRESETS: readonly { id: string; label: string; plates: readonly PlateId[] }[] = Object.freeze([
  { id: 'fifteens-ten', label: '2×15 + 10 kg', plates: ['kg15', 'kg15', 'kg10'] },
  { id: 'pair-25', label: 'Pair of 25s', plates: ['kg25', 'kg25'] },
  { id: 'pair-25-15', label: 'Pair of 25s + pair of 15s', plates: ['kg25', 'kg25', 'kg15', 'kg15'] },
  { id: 'kg-set', label: 'KG set 25/20/15/10', plates: ['kg25', 'kg20', 'kg15', 'kg10'] },
  { id: 'lb-set', label: 'LB set 2×45/35/25/10', plates: ['lb45', 'lb45', 'lb35', 'lb25', 'lb10'] },
]);
/** Numeric geometry params: plate1..plateN are spec codes, root outward. */
export function plateParams(plates: readonly PlateId[] | undefined): NumericParams {
  return Object.fromEntries((plates ?? []).map((p, i) => [`plate${i + 1}`, PLATE_SPECS[p].code]));
}
const BY_CODE = new Map(PLATE_IDS.map(id => [PLATE_SPECS[id].code, id]));
export function platesFromParams(params: NumericParams): PlateId[] {
  const plates: PlateId[] = [];
  for (let i = 1; params[`plate${i}`] !== undefined; i++) {
    const plate = BY_CODE.get(params[`plate${i}`]);
    if (!plate) throw Error(`Unknown plate code ${params[`plate${i}`]}.`);
    plates.push(plate);
  }
  return plates;
}
export const isPlateParam = (key: string) => /^plate\d+$/.test(key);
export const withoutPlateParams = (params: NumericParams): NumericParams => Object.fromEntries(Object.entries(params).filter(([k]) => !isPlateParam(k)));
