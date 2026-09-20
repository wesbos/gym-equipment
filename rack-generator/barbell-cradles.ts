/** Bar-receiving points (#83). Each resolved cradle accessory exposes local shaft-axis rest points; two coaxial
 * supports on the shaft span form a cradle. Parked bars persist the cradle key (support ids), so they follow
 * their cradle through moves and fall back to their floor drop spot when it is gone. Pure over resolved instances. */
import { BAR, DEFAULT_BAR_SPEC } from './floor-parts/barbell.ts';
import { floorPart, resolveBy, type BarSpec } from './floor-registry.ts';
import { rackPart } from './rack-registry.ts';
import { rotateMountedPoint } from './mounted-rotation.ts';
import type { FloorItem, NumericParams, RackDoc, ResolvedInstance, Vec3 } from './types.ts';
export type CradleKind = 'working' | 'storage';
interface Slot { point: Vec3; axis: Vec3 }
export interface BarSupport { id: string; instanceId: string; ownerId: string; part: string; point: Vec3; axis: Vec3; kind: CradleKind }
export interface BarCradle { key: string; supports: [BarSupport, BarSupport]; center: Vec3; yaw: number; kind: CradleKind; label: string }
const r = BAR.shaft / 2, X: Vec3 = [1, 0, 0], Y: Vec3 = [0, 1, 0];
/** Shaft-axis rest points in each builder's local frame, measured from its generated solids (see
 * barbell-cradles.test.ts): the 28.5 mm shaft settles on the cradle floor/roller or in the laser-cut notch. */
const SLOTS: Record<string, (p: ResolvedInstance['params']) => Slot[]> = {
  'j-hook-standard': () => [{ point: [0, 56, 70 + r], axis: X }],
  'j-hook-roller': () => [{ point: [3, 60, 82.75 + r], axis: X }],
  'j-hook-sandwich': () => [{ point: [0, 35, 50 + r], axis: X }],
  monolift: () => [{ point: [8.75, -124, 42 + r], axis: X }],
  // Darko plates hang in the local XZ plane; bars cross them along local Y (docs/vendor/darko.md).
  'darko-anchor': p => [-1, 1].map(s => ({ point: [s * 47, (p.upright ?? 75) / 2 + 5, -96.75], axis: Y })),
  'darko-double-decker': p => [-96.75, -229.75].flatMap(z => [-1, 1].map(s => ({ point: [s * 47.25, (p.upright ?? 75) / 2 + 5, z] as Vec3, axis: Y }))),
  // J-Anchor notch, bar against the upright face; `mirror` flips the second of a side-face pair.
  'darko-j': p => [{ point: [-52.5 * (p.mirror === 1 ? -1 : 1), (p.upright ?? 75) / 2 + 12, -77.75], axis: Y }],
  'darko-double-j': p => [-22.75, -114.75].map(z => ({ point: [-52.5 * (p.mirror === 1 ? -1 : 1), (p.upright ?? 75) / 2 + 12, z] as Vec3, axis: Y })),
};
const LABELS: Record<string, string> = { 'j-hook-standard': 'J-cups', 'j-hook-roller': 'Roller J-cups', 'j-hook-sandwich': 'Sandwich J-cups', monolift: 'Monolift arms', 'darko-anchor': 'Darko Barbell Anchors', 'darko-double-decker': 'Darko Double Deckers', 'darko-j': 'Darko Dock J-Anchors', 'darko-double-j': 'Darko Dock Double J-Anchors' };
/** Built-in cradle parts; registry rack parts add theirs through `cradles` in their defineRackPart entry. */
export const CRADLE_PARTS = Object.keys(SLOTS);
/** A parking part's bar geometry (its `bar` spec at these params), else the 20 kg Olympic bar's. Rest points above
 * seat a 28.5 mm shaft; other shafts rise or drop by their radius difference (parkedPose). */
export function barSpec(part?: string | null, params: NumericParams = {}): BarSpec {
  const entry = floorPart(part ?? '');
  return entry?.bar ? resolveBy(entry.bar, { ...entry.defaults, ...params }) : DEFAULT_BAR_SPEC;
}
export const barSpecOf = (item?: Pick<FloorItem, 'part' | 'params'> | null) => barSpec(item?.part, item?.params);
const slotsOf = (e: ResolvedInstance): Slot[] => SLOTS[e.part]?.(e.params) ?? rackPart(e.part)?.cradles?.slots(e.params) ?? [];
const kindOf = (part: string): CradleKind => part.startsWith('darko-') ? 'storage' : rackPart(part)?.cradles?.kind ?? 'working';
const labelOf = (part: string) => LABELS[part] ?? rackPart(part)?.cradles?.label ?? part;
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export function barSupports(resolved: readonly ResolvedInstance[]): BarSupport[] {
  return resolved.flatMap(e => (e.kind === 'accessory' ? slotsOf(e) : []).map((slot, i) => ({
    id: `${e.id}#${i}`, instanceId: e.id, ownerId: e.ownerId, part: e.part, kind: kindOf(e.part),
    point: add(e.position, rotateMountedPoint(slot.point, e.rotation)), axis: rotateMountedPoint(slot.axis, e.rotation),
  })));
}
/** Coaxial, level support pairs whose span sits inside the shaft (between the collars) and holds the bar stably.
 * `bar` sets the shaft span that must fit between the collars (default: the Olympic bar). */
export function barCradles(resolved: readonly ResolvedInstance[], bar: BarSpec = DEFAULT_BAR_SPEC): BarCradle[] {
  const supports = barSupports(resolved), cradles: BarCradle[] = [];
  for (const [i, a] of supports.entries()) for (const b of supports.slice(i + 1)) {
    if (a.instanceId === b.instanceId || Math.abs(dot(a.axis, b.axis)) < .9995 || Math.abs(a.axis[2]) > 1e-6) continue;
    const d = sub(b.point, a.point), along = dot(d, a.axis), lateral = sub(d, a.axis.map(v => v * along) as Vec3);
    if (Math.hypot(...lateral) > 2 || Math.abs(along) < 300 || Math.abs(along) > 2 * bar.shaftHalf - 40) continue;
    const pair = [a, b].sort((x, y) => x.id.localeCompare(y.id)) as [BarSupport, BarSupport];
    let yaw = Math.atan2(a.axis[1], a.axis[0]); if (yaw <= -Math.PI / 2 || yaw > Math.PI / 2 + 1e-9) yaw += yaw > 0 ? -Math.PI : Math.PI;
    const center = a.point.map((v, k) => (v + b.point[k]) / 2) as Vec3, kind = a.kind === 'storage' || b.kind === 'storage' ? 'storage' : 'working';
    cradles.push({ key: pair.map(s => s.id).join('+'), supports: pair, center, yaw, kind, label: `${a.part === b.part ? labelOf(a.part) : `${labelOf(a.part)} + ${labelOf(b.part)}`} · ${Math.round(center[2])} mm` });
  }
  return cradles;
}
export const cradleSupportIds = (key: string) => key.split('+');
/** Cradles with no parked bar on any of their supports (the moving bar's own cradle stays free). `bar` defaults to
 * the moving item's own spec when it is in `items`, else the Olympic bar. */
export function freeCradles(resolved: readonly ResolvedInstance[], items: readonly FloorItem[] = [], movingId?: string | null, bar?: BarSpec) {
  const taken = new Set(items.filter(i => i.cradle && i.id !== movingId).flatMap(i => cradleSupportIds(i.cradle!)));
  return barCradles(resolved, bar ?? barSpecOf(items.find(i => i.id === movingId))).filter(c => c.supports.every(s => !taken.has(s.id)));
}
/** Suggested park: the highest working cradle (J-cups, monolift), else the highest storage cradle. */
export const suggestCradle = (cradles: readonly BarCradle[]) => [...cradles].sort((a, b) => +(a.kind === 'storage') - +(b.kind === 'storage') || b.center[2] - a.center[2])[0] ?? null;
/** Floor-item pose that seats `bar` in the cradle: rest points carry a 28.5 mm shaft axis, so a thicker shaft sits higher. */
export const parkedPose = (cradle: BarCradle, bar: BarSpec = DEFAULT_BAR_SPEC) => ({ position: [cradle.center[0], cradle.center[1], cradle.center[2] + (bar.shaft - BAR.shaft) / 2 - bar.axisZ] as Vec3, rotation: [0, 0, cradle.yaw] as Vec3 });
/** Build params of a parked bar: `rackedRoll` bars (the CB-1) gain `racked: 1` and hang in their worn roll. */
export const parkedParams = (part: string, params: NumericParams): NumericParams => floorPart(part)?.rackedRoll ? { ...params, racked: 1 } : params;
/** barCradles keyed by cradle key for each distinct bar spec among `items` (most docs hold one bar type). */
function cradlesFor(resolved: readonly ResolvedInstance[]) {
  const cache = new Map<string, Map<string, BarCradle>>();
  return (bar: BarSpec) => { const key = JSON.stringify(bar); let hit = cache.get(key); if (!hit) cache.set(key, hit = new Map(barCradles(resolved, bar).map(c => [c.key, c]))); return hit; };
}
/** resolveAssembly hook: moves parked floor entries onto their cradle; unresolved ones stay at their floor spot. */
export function parkBarbells(result: ResolvedInstance[], items: readonly FloorItem[] = []) {
  if (!items.some(i => i.cradle)) return;
  const cradles = cradlesFor(result);
  for (const item of items) {
    const bar = item.cradle ? barSpecOf(item) : DEFAULT_BAR_SPEC, cradle = item.cradle && cradles(bar).get(item.cradle), entry = cradle && result.find(e => e.id === item.id);
    if (entry) Object.assign(entry, parkedPose(cradle, bar), { params: parkedParams(item.part, entry.params), connectedTo: [...new Set(cradle.supports.map(s => s.ownerId))] });
  }
}
/** After an edit: bars whose cradle is gone (removed, moved apart, unpaired) drop to the floor beneath where they
 * were parked in `before`, and lose their cradle key. Returns the settled document and the dropped ids. */
export function settleBarbells(doc: RackDoc, resolved: readonly ResolvedInstance[], before: readonly ResolvedInstance[] = []) {
  const cradles = cradlesFor(resolved), dropped = (doc.floorItems ?? []).filter(i => i.cradle && !cradles(barSpecOf(i)).has(i.cradle)).map(i => i.id);
  if (!dropped.length) return { doc, dropped };
  const next = structuredClone(doc);
  for (const item of next.floorItems!) if (dropped.includes(item.id)) {
    const last = before.find(e => e.id === item.id);
    delete item.cradle;
    if (last) { item.position = [last.position[0], -last.position[1]]; item.rotation = last.rotation[2]; }
  }
  return { doc: next, dropped };
}
export const parksInCradles = (part: string | null | undefined) => !!floorPart(part ?? '')?.parks;
