/** Hosted rack-part targets (#178): registry parts that mount on another accessory rather than on the rack itself —
 * the Darko Thresher Pad pinned through a spotter arm (or the built-in perforated box safety), a Beyond Power bar
 * mount clamped on a pull-up bar. Pure; no geometry.
 *
 * A host offers frames (RackHost, in the host part's local coordinates): built-ins here, registry entries through
 * RackPartSpec.hosts. A hosted accessory stores `{ kind, host, unit, frame, station }`; it is resolved after its host,
 * from the host instance's world transform, so it follows the host through moves, pairing and rack edits, and is
 * removed with it (assembly.ts prunes orphans). Hosted frame: origin on the host's hole (or bar) axis at the station,
 * local +Y along the host, Z up, X across it along the hole axis. */
import { resolveBy } from './floor-part.ts';
import { rackPart, rackHosts, rackTargets, type RackHost, type RackPart } from './rack-registry.ts';
import { rackContextParams, rackSpan } from './rack-mounts.ts';
import { applyBasis, basisEuler, cross, eulerBasis, isHostedTarget } from './rack-targets.ts';
import type { Accessory, Face, HostedTarget, Mount, NumericParams, RackDimensions, RackDoc, ResolvedInstance, Target, Vec3 } from './types.ts';
export type HostDoc = Pick<RackDoc, 'rack' | 'uprights' | 'removed' | 'accessories'>;
const pairFace = (face: Face): Face => face === 'left' ? 'right' : face === 'right' ? 'left' : face;
const tubeAlong = (rack: RackDimensions, dx: number, dy: number) => Math.abs(dx) >= Math.abs(dy) ? rack.tube : rack.tubeDepth ?? rack.tube;

/** Built-in hosts, measured from their builders (parts/bars-safeties.ts). */
function builtinHosts(doc: HostDoc, host: Accessory): RackHost[] {
  const r = doc.rack;
  if (host.part === 'safety-box') {
    // Perforated 75 × 75 box beam along local X, 25 mm holes on a 50 mm pitch through both walls from x = -L/2 + 40,
    // 5 mm UHMW strip on top; the end cradles sit over the uprights, so the whole beam length is usable.
    const L = r.depth - 6, w = host.params.width ?? 75, h = host.params.height ?? 75, first = -L / 2 + 40;
    return [{ kind: 'spotter-arm', label: 'Box safety', origin: [first, 0, h / 2], axis: [1, 0, 0], stations: Math.floor((L / 2 - 15 - first) / 50) + 1, pitch: 50,
      span: [-L / 2 + 5 - first, L / 2 - 5 - first], width: w, height: h, top: h / 2 + 5, hole: 25 }];
  }
  if (host.part === 'pullup-straight' && host.spanTo) {
    // Round bar along local X at z = 175 between the end plates; the curved gussets take the last 80 mm at each end.
    const p = doc.uprights[host.target.uprightId], q = doc.uprights[host.spanTo];
    if (!p || !q) return [];
    const clear = Math.hypot(q.x - p.x, q.y - p.y) - tubeAlong(r, q.x - p.x, q.y - p.y), d = host.params.diameter ?? 32, pitch = 25;
    return [{ kind: 'pull-up-bar', label: 'Pull-up bar', origin: [-clear / 2, 0, 175], axis: [1, 0, 0], stations: Math.floor(clear / pitch) + 1, pitch,
      span: [85, clear - 85], width: d, height: d, top: d / 2, hole: 0 }];
  }
  return [];
}
/** The target of a host accessory's pair unit (unit 1 = the matching upright across the rack). */
function unitTarget(host: Accessory, unit: number): Target | undefined {
  if (unit === 0) return host.target;
  if (unit !== 1 || !host.paired || !host.pairTo || isHostedTarget(host.target) || host.target.kind === 'crossmember-top' || host.target.kind === 'crossmember-under') return undefined;
  return { ...host.target, uprightId: host.pairTo, face: pairFace(host.target.face) };
}
/** Host frames of one unit of a host accessory, in the host instance's local frame. */
export function hostFrames(doc: HostDoc, host: Accessory, unit: number): RackHost[] {
  if (isHostedTarget(host.target)) return [];
  const t = unitTarget(host, unit);
  if (!t) return [];
  if (host.part === 'safety-box' || host.part === 'pullup-straight') return builtinHosts(doc, host);
  const p = rackPart(host.part);
  if (!p?.hosts) return [];
  return rackHosts(p, rackContextParams(p, host.params, doc.rack, !!p.handed && unit > 0, t.kind === undefined || t.kind === 'upright' ? t.face : undefined, rackSpan(doc, p, t)));
}
/** Host section context the hosted builder receives. */
export const hostContext = (h: RackHost): NumericParams => ({ hostWidth: h.width, hostHeight: h.height, hostTop: h.top, hostHole: h.hole, hostPitch: h.pitch });
const entry = (part: string): RackPart => { const found = rackPart(part); if (!found) throw Error(`Unknown rack attachment ${part}.`); return found; };
const Title = (part: RackPart) => part.noun[0].toUpperCase() + part.noun.slice(1);
/** Params the hosted builder, bodies and fit rules see. */
export function hostedParams(doc: HostDoc, a: Accessory, h: RackHost): NumericParams {
  return rackContextParams(entry(a.part), a.params, doc.rack, false, undefined, undefined, hostContext(h));
}
/** Validates a hosted accessory against its host and returns the target normalised to the host's upright and face.
 * Throws user-facing messages. */
export function validateHostedMount(doc: HostDoc, a: Accessory): HostedTarget {
  const p = entry(a.part), t = a.target as HostedTarget, name = Title(p);
  if (typeof t.host !== 'string' || !Number.isInteger(t.unit) || !Number.isInteger(t.frame) || !Number.isInteger(t.station)) throw Error(`${name} needs a host accessory, unit, frame and station.`);
  if (a.paired) throw Error(`${name} mounts singly on its ${t.kind === 'pull-up-bar' ? 'bar' : 'arm'}.`);
  const host = doc.accessories.find(x => x.id === t.host);
  if (!host || host.id === a.id) throw Error(`${name} needs a ${t.kind === 'pull-up-bar' ? 'pull-up bar' : 'spotter arm or box safety'} to mount on; ${t.host} is not on this rack.`);
  const frames = hostFrames(doc, host, t.unit), h = frames[t.frame];
  if (!h || h.kind !== t.kind) throw Error(`${name} does not mount on that ${host.part.replaceAll('-', ' ')}.`);
  if (t.station < 0 || t.station >= h.stations) throw Error(`${name} station ${t.station + 1} is off the ${h.label.toLowerCase()}.`);
  const params = hostedParams(doc, a, h), reach = resolveBy(p.mount.hostReach ?? { back: 0, front: 0 }, params), at = t.station * h.pitch;
  if (at - reach.back < h.span[0] - 1e-6 || at + reach.front > h.span[1] + 1e-6) throw Error(`${name} does not fit at station ${t.station + 1}: it would run past the end of the ${h.label.toLowerCase()}.`);
  const pin = resolveBy(p.mount.pin, params);
  if (h.hole > 0 && pin > h.hole) throw Error(`${name} pin ${pin} mm exceeds the ${h.label.toLowerCase()} hole ${h.hole} mm.`);
  p.mount.validate?.(doc.rack, params);
  const ut = unitTarget(host, t.unit)!;
  return { ...t, uprightId: ut.uprightId, face: ut.face, hole: 0 };
}
/** World frame of a host station: origin, basis (local X across, Y along the host, Z up). */
function stationFrame(hostInstance: ResolvedInstance, h: RackHost, station: number) {
  const B = eulerBasis(hostInstance.rotation), local: Vec3 = h.origin.map((v, i) => v + h.axis[i] * station * h.pitch) as Vec3;
  const w = applyBasis(B, local), origin = w.map((v, i) => v + hostInstance.position[i]) as Vec3;
  const Y = applyBasis(B, h.axis), Z = applyBasis(B, [0, 0, 1]), X = cross(Y, Z);
  return { origin, X, Y, Z };
}
const hostUnit = (resolved: readonly ResolvedInstance[], host: string, unit: number) => resolved.filter(r => r.ownerId === host && r.kind === 'accessory')[unit];
/** Mount marker for a hosted target (world). */
export function hostedMount(t: HostedTarget, hostInstance: ResolvedInstance, h: RackHost): Mount {
  const f = stationFrame(hostInstance, h, t.station);
  return { ...t, position: f.origin, center: f.origin, pinAxis: h.hole > 0 ? f.X : f.Y, hostId: hostInstance.id, label: `${hostInstance.name ?? h.label} · ${h.label.toLowerCase()} ${h.kind === 'pull-up-bar' ? 'clamp station' : 'hole'} ${t.station + 1}` };
}
/** Resolves a hosted accessory on its (already resolved) host. */
export function resolveHosted(doc: HostDoc, a: Accessory, resolved: readonly ResolvedInstance[]): ResolvedInstance {
  const p = entry(a.part), t = a.target as HostedTarget, host = doc.accessories.find(x => x.id === t.host)!, h = hostFrames(doc, host, t.unit)[t.frame];
  const hi = hostUnit(resolved, t.host, t.unit);
  if (!hi || !h) throw Error(`${Title(p)} lost its host ${t.host}.`);
  const f = stationFrame(hi, h, t.station), params = hostedParams(doc, a, h), m = hostedMount(t, hi, h);
  return { id: a.id, part: a.part, params, position: f.origin, rotation: basisEuler(f.X, f.Y, f.Z), mount: m, mounts: [m], ownerId: a.id, kind: 'accessory', paired: false,
    connectedTo: [t.host, ...hi.connectedTo], localOutward: [0, 0, 1], collisionBoxes: resolveBy(p.bodies, params).map(b => ({ min: [...b.min] as Vec3, max: [...b.max] as Vec3 })), name: p.name };
}
/** Every host station of the kinds this entry accepts (before full validation). */
export function hostedCandidates(doc: HostDoc, resolved: readonly ResolvedInstance[], part: string): Mount[] {
  const p = rackPart(part);
  if (!p) return [];
  const kinds = rackTargets(p).filter(k => k === 'spotter-arm' || k === 'pull-up-bar');
  if (!kinds.length) return [];
  const out: Mount[] = [];
  for (const host of doc.accessories) for (const unit of [0, 1]) {
    const frames = hostFrames(doc, host, unit), hi = frames.length ? hostUnit(resolved, host.id, unit) : undefined;
    if (!hi) continue;
    frames.forEach((h, frame) => {
      if (!kinds.includes(h.kind)) return;
      const base = unitTarget(host, unit)!;
      for (let station = 0; station < h.stations; station++)
        out.push(hostedMount({ kind: h.kind, host: host.id, unit, frame, station, uprightId: base.uprightId, face: base.face, hole: 0 }, hi, h));
    });
  }
  return out;
}
/** Accessories that stand on `host` (directly). */
export const hostedOn = (accessories: readonly Accessory[], host: string) => accessories.filter(a => isHostedTarget(a.target) && a.target.host === host);
