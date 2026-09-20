import type { NumericParams, Vec3 } from './types.ts';
import { PLATE_LINES, type PlateFinish, type PlateLine, type PlateWeight } from './plates-lines.ts';
export { PLATE_LINES } from './plates-lines.ts';
export type { PlateFace, PlateFinish, PlateLine, PlateMarking, PlateWeight } from './plates-lines.ts';
/** Olympic plates, millimetres. Pure data and validation; geometry lives in parts/plates.ts.
 * Plates are grouped in brand/product lines (plates-lines.ts, #129). The eight original ids below are the
 * two default lines and keep their exact geometry and param codes:
 * Bumpers: Rogue HG 2.0 KG widths (IWF 450 mm, 50.4 mm collar opening), 25 kg 3.5", 20 kg 3.25",
 * 15 kg 2.625", 10 kg 1.75". Iron: Rogue machined Olympic plates, 45/35/25 lb 1.5" wide at
 * 448/360/300 mm, 10 lb 1.22" at 228 mm. Colors are fixed factory colours, never frame appearance.
 * Every other plate id is `<line>:<weight key>` with an optional `@<finish>` (e.g. `rogue-echo-v2:45`,
 * `wio-machined:25@red`).
 */
export type LegacyPlateId = 'kg25' | 'kg20' | 'kg15' | 'kg10' | 'lb45' | 'lb35' | 'lb25' | 'lb10';
export type PlateId = LegacyPlateId | `${string}:${string}`;
export interface PlateSpec {
  label: string; weight: number; unit: 'kg' | 'lb'; style: 'bumper' | 'iron'; diameter: number; width: number; color: string;
  /** Stable numeric code for geometry params. */ code: number;
  /** Line, weight entry and finish this plate belongs to (all plates, including the eight defaults). */
  line?: string; key?: string; finish?: string; ink?: string; accent?: string;
}
export const PLATE_BORE = 50.4;
/** Visual clearance between neighbouring plates; counted in stack length. */
export const PLATE_GAP = 0.5;
const LEGACY_SPECS: Readonly<Record<LegacyPlateId, Readonly<PlateSpec>>> = Object.freeze({
  kg25: { label: '25 kg', weight: 25, unit: 'kg', style: 'bumper', diameter: 450, width: 88.9, color: '#c8202f', code: 1, line: 'standard-kg', key: '25' },
  kg20: { label: '20 kg', weight: 20, unit: 'kg', style: 'bumper', diameter: 450, width: 82.55, color: '#1f58b5', code: 2, line: 'standard-kg', key: '20' },
  kg15: { label: '15 kg', weight: 15, unit: 'kg', style: 'bumper', diameter: 450, width: 66.675, color: '#f2c318', code: 3, line: 'standard-kg', key: '15' },
  kg10: { label: '10 kg', weight: 10, unit: 'kg', style: 'bumper', diameter: 450, width: 44.45, color: '#23894a', code: 4, line: 'standard-kg', key: '10' },
  lb45: { label: '45 lb', weight: 45, unit: 'lb', style: 'iron', diameter: 448, width: 38.1, color: '#1d1f21', code: 5, line: 'standard-lb', key: '45' },
  lb35: { label: '35 lb', weight: 35, unit: 'lb', style: 'iron', diameter: 360, width: 38.1, color: '#1d1f21', code: 6, line: 'standard-lb', key: '35' },
  lb25: { label: '25 lb', weight: 25, unit: 'lb', style: 'iron', diameter: 300, width: 38.1, color: '#1d1f21', code: 7, line: 'standard-lb', key: '25' },
  lb10: { label: '10 lb', weight: 10, unit: 'lb', style: 'iron', diameter: 228, width: 30.988, color: '#1d1f21', code: 8, line: 'standard-lb', key: '10' },
});
/** The eight original ids (the default lines). */
export const PLATE_IDS = Object.freeze(Object.keys(LEGACY_SPECS) as LegacyPlateId[]);
const LEGACY = new Map(PLATE_IDS.map(id => [`${LEGACY_SPECS[id].line}:${LEGACY_SPECS[id].key}`, id]));
const LINES = new Map(PLATE_LINES.map(l => [l.id, l]));
export const plateLine = (id: string): PlateLine | undefined => LINES.get(id);
/** Canonical id for a line weight (and optional finish); the default lines resolve to their legacy ids. */
export function plateId(line: string, key: string, finish?: string): PlateId {
  const l = LINES.get(line), w = l?.weights.find(x => x.key === key);
  if (!l || !w) throw Error(`Unknown plate ${line}:${key}.`);
  if (finish !== undefined && finish !== l.finishes?.[0]?.id && !l.finishes?.some(f => f.id === finish)) throw Error(`Unknown ${l.name} finish ${finish}.`);
  const base = LEGACY.get(`${line}:${key}`) ?? `${line}:${key}` as PlateId;
  return finish && finish !== l.finishes?.[0]?.id ? `${line}:${key}@${finish}` as PlateId : base;
}
/** Parse any plate id to its line, weight entry and finish. */
export function plateParts(id: string): { line: PlateLine; weight: PlateWeight; finish?: PlateFinish } | undefined {
  if (Object.hasOwn(LEGACY_SPECS, id)) { const s = LEGACY_SPECS[id as LegacyPlateId]; const line = LINES.get(s.line!)!; return { line, weight: line.weights.find(w => w.key === s.key)! }; }
  const m = /^([a-z0-9-]+):([0-9a-z.]+)(?:@([a-z0-9-]+))?$/.exec(id);
  if (!m) return undefined;
  const line = LINES.get(m[1]);
  if (!line || line.legacy) return undefined;
  const weight = line.weights.find(w => w.key === m[2]);
  if (!weight) return undefined;
  if (m[3] === undefined) return { line, weight, finish: line.finishes?.[0] };
  const finish = line.finishes?.find(f => f.id === m[3]);
  return finish && finish !== line.finishes![0] ? { line, weight, finish } : undefined;
}
const weightLabel = (line: PlateLine, w: PlateWeight) => w.label ?? `${w.weight} ${line.unit}`;
/** Stable geometry code: legacy 1–8; lines 100 + line.code × 40 + weight index. Finish goes in `plateNc`. */
const lineCode = (line: PlateLine, w: PlateWeight) => 100 + line.code * 40 + line.weights.indexOf(w);
const SPECS = new Map<string, PlateSpec>();
/** Spec for any plate id, or undefined when the id is unknown. */
export function plateSpec(id: string): Readonly<PlateSpec> | undefined {
  if (Object.hasOwn(LEGACY_SPECS, id)) return LEGACY_SPECS[id as LegacyPlateId];
  const cached = SPECS.get(id);
  if (cached) return cached;
  const parts = plateParts(id);
  if (!parts) return undefined;
  const { line, weight: w, finish } = parts;
  const color = finish?.colors?.[w.key] ?? (finish && finish !== line.finishes?.[0] ? finish.color : undefined) ?? w.color ?? finish?.color ?? line.color;
  const spec: PlateSpec = Object.freeze({
    label: finish && finish !== line.finishes?.[0] ? `${weightLabel(line, w)} ${finish.label.toLowerCase()}` : weightLabel(line, w),
    weight: w.weight, unit: line.unit, style: line.material === 'rubber' ? 'bumper' : 'iron', diameter: w.diameter, width: w.width,
    color, code: lineCode(line, w), line: line.id, key: w.key, finish: finish?.id, ink: w.ink ?? finish?.ink ?? line.ink, accent: w.accent ?? line.accent,
  } as PlateSpec);
  SPECS.set(id, spec);
  return spec;
}
/** Spec table indexed by any plate id. Own keys are the eight default ids (so `Object.keys`/`Object.hasOwn` still
 * enumerate the defaults), while `PLATE_SPECS[id]` and `id in PLATE_SPECS` also resolve every brand-line id. Read-only. */
export const PLATE_SPECS: Readonly<Record<PlateId, Readonly<PlateSpec>>> = new Proxy({ ...LEGACY_SPECS } as Record<string, Readonly<PlateSpec>>, {
  get: (target, key) => typeof key === 'string' ? plateSpec(key) : Reflect.get(target, key),
  has: (target, key) => typeof key === 'string' ? !!plateSpec(key) : Reflect.has(target, key),
  set: () => false, defineProperty: () => false, deleteProperty: () => false,
}) as Readonly<Record<PlateId, Readonly<PlateSpec>>>;
const specOf = (id: string) => { const s = plateSpec(id); if (!s) throw Error(`Unknown plate ${id}.`); return s; };
export const isPlateId = (v: unknown): v is PlateId => typeof v === 'string' && v.length < 80 && !!plateSpec(v);
/** Every selectable plate id of a line (its default finish), heaviest first. */
export const linePlates = (line: string, finish?: string): PlateId[] => {
  const l = LINES.get(line);
  return l ? [...l.weights].sort((a, b) => b.weight - a.weight || a.width - b.width).map(w => plateId(line, w.key, finish)) : [];
};
/** Usable peg from the collar face (start) to the tip (end) along the part-local axis. */
export interface PlatePeg { origin: Vec3; axis: Vec3; length: number }
const PEGS: Record<string, PlatePeg> = {
  // Revolve profiles in parts/attachments.ts: shoulder collar to 3 mm tip chamfer, 48.5 mm peg.
  'storage-pin-short': { origin: [-65, 0, 39.88769], axis: [1, 0, 0], length: 235 },
  'storage-pin-long': { origin: [-122.5, 0, 39.881585], axis: [1, 0, 0], length: 350 },
};
export const platePeg = (part: string): PlatePeg | undefined => Object.hasOwn(PEGS, part) ? PEGS[part] : undefined;
export const holdsPlates = (part: string) => !!platePeg(part);
export const plateStackLength = (plates: readonly PlateId[], gap = PLATE_GAP) => plates.reduce((sum, p, i) => sum + specOf(p).width + (i ? gap : 0), 0);
export const plateStackRadius = (plates: readonly PlateId[]) => Math.max(0, ...plates.map(p => specOf(p).diameter / 2));
export function plateTotals(plates: readonly PlateId[]): { kg: number; lb: number } {
  const totals = { kg: 0, lb: 0 };
  for (const p of plates) totals[specOf(p).unit] += specOf(p).weight;
  totals.kg = Math.round(totals.kg * 1000) / 1000; totals.lb = Math.round(totals.lb * 1000) / 1000;
  return totals;
}
export const plateTotalLabel = (plates: readonly PlateId[]) => {
  const { kg, lb } = plateTotals(plates);
  return [kg && `${kg} kg`, lb && `${lb} lb`].filter(Boolean).join(' + ') || 'Empty';
};
/** Display name of a plate with its line, e.g. "45 lb · Rogue Echo Bumper Plates V2". */
export const plateTitle = (id: PlateId) => { const s = specOf(id), l = LINES.get(s.line!)!; return l.legacy ? s.label : `${s.label} · ${l.brand} ${l.name}`; };
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
/** How many more of `plate` fit on the peg (0 when none). */
export function plateFits(part: string, plates: readonly PlateId[], plate: PlateId) {
  const peg = platePeg(part), w = specOf(plate).width;
  if (!peg) return 0;
  const room = peg.length - plateStackLength(plates) + (plates.length ? 0 : PLATE_GAP);
  return Math.max(0, Math.floor((room + 1e-6) / (w + PLATE_GAP)));
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
/** A one-of-each set for a line, heaviest first (the editor's line preset). */
export const lineSet = (line: string, finish?: string): PlateId[] => {
  const l = LINES.get(line);
  if (!l) return [];
  const seen = new Set<number>();
  return linePlates(line, finish).filter(id => { const w = specOf(id).weight; return !seen.has(w) && (seen.add(w), true); });
};
/** Numeric geometry params: plate1..plateN are spec codes, root outward; plateNc is a non-default finish (1-based).
 * `prefix` names other stacks on one part (a barbell's sleeves use plateR / plateL, see bar-loads.ts). */
export function plateParams(plates: readonly PlateId[] | undefined, prefix: PlatePrefix = 'plate'): NumericParams {
  const params: NumericParams = {};
  for (const [i, p] of (plates ?? []).entries()) {
    const s = specOf(p);
    params[`${prefix}${i + 1}`] = s.code;
    if (s.finish) { const f = LINES.get(s.line!)!.finishes!.findIndex(x => x.id === s.finish); if (f > 0) params[`${prefix}${i + 1}c`] = f; }
  }
  return params;
}
export type PlatePrefix = 'plate' | 'plateR' | 'plateL';
const BY_CODE = new Map<number, { line: PlateLine; weight: PlateWeight } | LegacyPlateId>(PLATE_IDS.map(id => [LEGACY_SPECS[id].code, id]));
for (const line of PLATE_LINES) if (!line.legacy) for (const w of line.weights) BY_CODE.set(lineCode(line, w), { line, weight: w });
export function platesFromParams(params: NumericParams, prefix: PlatePrefix = 'plate'): PlateId[] {
  const plates: PlateId[] = [];
  for (let i = 1; params[`${prefix}${i}`] !== undefined; i++) {
    const hit = BY_CODE.get(params[`${prefix}${i}`]);
    if (!hit) throw Error(`Unknown plate code ${params[`${prefix}${i}`]}.`);
    if (typeof hit === 'string') { plates.push(hit); continue; }
    const f = params[`${prefix}${i}c`];
    const finish = f === undefined ? undefined : hit.line.finishes?.[f];
    if (f !== undefined && (!finish || f < 1)) throw Error(`Unknown plate finish ${f}.`);
    plates.push(plateId(hit.line.id, hit.weight.key, finish?.id));
  }
  return plates;
}
export const isPlateParam = (key: string) => /^plate[RL]?\d+c?$/.test(key);
export const withoutPlateParams = (params: NumericParams): NumericParams => Object.fromEntries(Object.entries(params).filter(([k]) => !isPlateParam(k)));
