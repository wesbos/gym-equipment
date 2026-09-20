/** Plates on barbell sleeves (#160). Any floor part with a `bar` spec (the Olympic bar, power, specialty, curl, axle,
 * multi-grip and trap bars) takes an optional per-sleeve stack in `FloorItem.plates`, symmetric (`both`) by default or
 * uneven (`right` = the +X sleeve, `left` = −X). Stacks run from the inner collar face outward along `barSleeves`, and
 * can't overflow the loadable sleeve. Resolved instances carry them as plateR…/plateL… build params, so the bar's
 * catalog build (parts/bar-loads.ts) draws them in the scene and GLB; 3MF skips floor items, plates included.
 * Metadata only (main bundle): never import Manifold builders here. */
import { floorPart, resolveBy, type BarSpec, type FloorBox, type FloorPart } from './floor-registry.ts';
import { MAX_PLATES, PLATE_GAP, isPlateId, plateParams, plateSpec, plateStackLength, plateStackRadius, platesFromParams, type PlateId } from './plates.ts';
import type { BarLoad, NumericParams, RackDoc } from './types.ts';

/** Build param a parked `rackedRoll` bar gains (barbell-cradles.ts parkedParams). */
export const RACKED = 'racked';
const round = (v: number) => Math.round(v * 10) / 10;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** The floor entry when it has loadable sleeves. */
export const loadablePart = (part: string | null | undefined): FloorPart | undefined => { const entry = floorPart(part ?? ''); return entry?.bar ? entry : undefined; };
export const loadsPlates = (part: string | null | undefined) => !!loadablePart(part);
/** Sleeve geometry of a loadable part at these params (plus `racked` for a parked rackedRoll bar). */
export const sleeveSpec = (part: FloorPart, params: NumericParams = {}): BarSpec => resolveBy(part.bar!, { ...part.defaults, ...params });
/** [+X sleeve, −X sleeve] stacks, root outward (barSleeves order). */
export function barStacks(load?: BarLoad | null): [PlateId[], PlateId[]] {
  if (!load) return [[], []];
  return 'both' in load ? [load.both, load.both] : [load.right, load.left];
}
export const isUneven = (load?: BarLoad | null) => !!load && !('both' in load);
/** Strict: saved documents with unknown keys, unknown plates or stacks longer than the sleeve are rejected. Empty loads
 * normalise to undefined (the field is omitted). */
export function validateBarLoad(partId: string, params: NumericParams, input: unknown): BarLoad | undefined {
  if (input === undefined) return undefined;
  const part = loadablePart(partId);
  if (!part) throw Error(`Only bars with loadable sleeves hold plates.`);
  const keys = record(input) ? Object.keys(input).sort().join(',') : '';
  if (!record(input) || (keys !== 'both' && keys !== 'left,right')) throw Error(`Invalid ${part.noun} plates.`);
  const spec = sleeveSpec(part, params);
  const stack = (v: unknown, side: string): PlateId[] => {
    if (!Array.isArray(v) || v.length > MAX_PLATES) throw Error(`A sleeve holds at most ${MAX_PLATES} plates.`);
    if (!v.every(isPlateId)) throw Error('Unknown weight plate.');
    const used = plateStackLength(v);
    if (used > spec.sleeveLength + 1e-6) throw Error(`Over capacity: these plates need ${round(used)} mm but the ${side}sleeve holds ${round(spec.sleeveLength)} mm.`);
    return [...v];
  };
  if ('both' in input) { const both = stack(input.both, ''); return both.length ? { both } : undefined; }
  const right = stack(input.right, 'right '), left = stack(input.left, 'left ');
  return right.length || left.length ? { right, left } : undefined;
}
/** Replace a floor bar's plates (throws a user-facing capacity error). `undefined` or empty stacks unload it. */
export function setBarLoad(input: RackDoc, id: string, load: BarLoad | undefined): RackDoc {
  const doc = structuredClone(input), item = doc.floorItems?.find(i => i.id === id);
  if (!item || !loadsPlates(item.part)) throw Error('Select a bar with loadable sleeves to load plates.');
  const clean = validateBarLoad(item.part, item.params, load);
  if (clean) item.plates = clean; else delete item.plates;
  return doc;
}
/** Build params for the resolved instance: plateR… (+X sleeve) and plateL… (−X sleeve) spec codes. */
export function barLoadParams(load?: BarLoad | null): NumericParams {
  const [right, left] = barStacks(load);
  return { ...plateParams(right, 'plateR'), ...plateParams(left, 'plateL') };
}
export const barLoadFromParams = (params: NumericParams): [PlateId[], PlateId[]] => [platesFromParams(params, 'plateR'), platesFromParams(params, 'plateL')];
const isLoadParam = (key: string) => /^plate[RL]\d+c?$/.test(key) || key === RACKED;
export const withoutBarLoadParams = (params: NumericParams): NumericParams => Object.fromEntries(Object.entries(params).filter(([k]) => !/^plate[RL]\d+c?$/.test(k)));
/** Worker guard: splits a floor part's build params into its catalog params (returned, for validateFloorParams) and the
 * sleeve plate codes and `racked` flag, which must be exactly what resolveAssembly emits for a valid load. */
export function floorBuildParams(part: FloorPart, input: NumericParams): NumericParams {
  if (!record(input) || !Object.keys(input).some(isLoadParam)) return input;
  const rest: NumericParams = {}, extra: NumericParams = {};
  for (const [k, v] of Object.entries(input)) (isLoadParam(k) ? extra : rest)[k] = v;
  const fail = () => { throw Error(`Invalid ${part.noun} parameters.`); };
  if (RACKED in extra && (!part.rackedRoll || extra[RACKED] !== 1)) fail();
  const plateKeys = Object.keys(extra).filter(k => k !== RACKED);
  if (!plateKeys.length) return rest;
  if (!part.bar) fail();
  const [right, left] = barLoadFromParams(extra);
  if (Object.keys({ ...plateParams(right, 'plateR'), ...plateParams(left, 'plateL') }).length !== plateKeys.length) fail();
  validateBarLoad(part.id, { ...rest, ...(RACKED in extra ? { [RACKED]: 1 } : {}) }, { right, left });
  return rest;
}
/** How far a bar lying on the floor rises so its biggest plate, not its collars, meets the floor (level: an uneven
 * pair sits on the larger plate). 0 when the plates clear the floor at the bar's own sleeve height (e.g. a trap bar
 * on its jack). */
export function barLift(spec: BarSpec, load?: BarLoad | null): number {
  const [right, left] = barStacks(load), radius = plateStackRadius([...right, ...left]);
  return radius ? Math.max(0, radius - spec.axisZ - (spec.sleeveOffset?.z ?? 0)) : 0;
}
/** Local floor box of the loaded plates (width along X, depth along floor Z = −local Y), for floor bounds. */
export function barLoadBox(spec: BarSpec, load?: BarLoad | null): FloorBox | undefined {
  const [right, left] = barStacks(load), radius = plateStackRadius([...right, ...left]);
  if (!radius) return undefined;
  const xs = [...(right.length ? [spec.sleeveStart, spec.sleeveStart + plateStackLength(right)] : []), ...(left.length ? [-spec.sleeveStart, -spec.sleeveStart - plateStackLength(left)] : [])];
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  return { width: x1 - x0, depth: 2 * radius, offset: [(x0 + x1) / 2, -(spec.sleeveOffset?.y ?? 0)] };
}
/** How many more of `plate` fit on a sleeve already holding `plates` (0 when none). */
export function sleeveFits(spec: BarSpec, plates: readonly PlateId[], plate: PlateId) {
  const w = plateSpec(plate)?.width;
  if (!w) return 0;
  const room = spec.sleeveLength - plateStackLength(plates) + (plates.length ? 0 : PLATE_GAP);
  return Math.max(0, Math.floor((room + 1e-6) / (w + PLATE_GAP)));
}
/** Sleeve length left after `plates` (and the gap before one more plate). */
export const sleeveRoom = (spec: BarSpec, plates: readonly PlateId[]) => spec.sleeveLength - plateStackLength(plates) - (plates.length ? PLATE_GAP : 0);
