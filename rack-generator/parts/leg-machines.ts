/** Leg extension/curl and leg press/hack squat machines: Manifold builders for the entries in ../floor-parts/leg-machines.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 * Every product is a pure description (floor-parts/leg-machines-models.ts) run through `ManifoldKit`, the Manifold
 * twin of the footprint's BoundsKit, so the solids and the floor box come from the same calls. */
import type { CrossSection, Manifold, Mat4 } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { buildPlateStack } from './plates.ts';
import { cableTube } from './cable-tube.ts';
import type { Mechanical } from './system-geometry.ts';
import { FrameKit, apply, beamCorners, cross, frameFor, norm, rotateVec, sub, type Finish, type Kit, type Rigid, type V3 } from '../floor-parts/leg-machines-kit.ts';
import { PARTS, legMachineModel } from '../floor-parts/leg-machines.ts';
import type { PlateId } from '../plates.ts';
const mat4 = (m: Rigid): Mat4 => [m.r[0], m.r[3], m.r[6], 0, m.r[1], m.r[4], m.r[7], 0, m.r[2], m.r[5], m.r[8], 0, m.t[0], m.t[1], m.t[2], 1];
/** Local frame (u, v, w, origin) as a column-major matrix. */
const frameMat = (u: V3, v: V3, w: V3, o: V3): Mat4 => [...u, 0, ...v, 0, ...w, 0, ...o, 1] as Mat4;
export class ManifoldKit extends FrameKit implements Kit {
  private owned: (Manifold | CrossSection)[] = [];
  private groups = new Map<string, { finish?: Finish; solids: Manifold[]; holes: Manifold[] }>();
  readonly parts: SolidPart[] = [];
  constructor(private api: ManifoldAPI) { super(); }
  keep<T extends Manifold | CrossSection>(s: T): T { this.owned.push(s); return s; }
  private group(g: string) { let e = this.groups.get(g); if (!e) this.groups.set(g, e = { solids: [], holes: [] }); return e; }
  private put(g: string, s: Manifold, local?: Mat4) { this.group(g).solids.push(this.world(s, local)); }
  private world(s: Manifold, local?: Mat4) { const l = local ? this.keep(s.transform(local)) : s; return this.keep(l.transform(mat4(this.m))); }
  finish(g: string, f: Finish) { this.group(g).finish = f; }
  box(g: string, min: V3, max: V3) {
    const size = sub(max, min); if (size.some(v => !(v > 0))) throw Error(`Degenerate box in ${g}.`);
    this.put(g, this.keep(this.keep(this.api.Manifold.cube(size)).translate(min)));
  }
  beam(g: string, a: V3, b: V3, w: number, h: number, up?: V3) {
    const len = Math.hypot(...sub(b, a)), { u, v, w: dir } = frameFor(sub(b, a), up);
    if (!(len > 0) || !(w > 0) || !(h > 0)) throw Error(`Degenerate beam in ${g}.`);
    this.put(g, this.keep(this.api.Manifold.cube([w, h, len], true)), frameMat(u, v, dir, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]));
  }
  private cylinder(a: V3, b: V3, d: number, segments: number) {
    const len = Math.hypot(...sub(b, a)); if (!(len > 0) || !(d > 0)) throw Error('Degenerate rod.');
    const { u, v, w } = frameFor(sub(b, a));
    return this.keep(this.keep(this.api.Manifold.cylinder(len, d / 2, d / 2, segments)).transform(frameMat(u, v, w, a)));
  }
  rod(g: string, a: V3, b: V3, d: number, segments = 32) { this.group(g).solids.push(this.world(this.cylinder(a, b, d, segments))); }
  hole(g: string, a: V3, b: V3, d: number, segments = 20) { this.group(g).holes.push(this.world(this.cylinder(a, b, d, segments))); }
  pad(g: string, c: V3, u: V3, v: V3, w: number, l: number, t: number, r: number, soft = 0) {
    const C = this.api.CrossSection, n = cross(u, v), rr = Math.min(r, w / 2 - .5, l / 2 - .5);
    const outline = (inset: number) => this.keep(this.keep(C.square([w - 2 * rr, l - 2 * rr], true)).offset(rr - inset, 'Round', 2, 32));
    const e = Math.min(soft, t / 3, rr - .5);
    const body = e > 0
      ? this.keep(this.api.Manifold.hull([this.keep(outline(0).extrude(t - e)), this.keep(this.keep(outline(e).extrude(e)).translate([0, 0, t - e]))]))
      : this.keep(outline(0).extrude(t));
    this.put(g, body, frameMat(u, v, n, c));
  }
  polygon(g: string, o: V3, u: V3, v: V3, pts: readonly (readonly [number, number])[], t: number) {
    const area = pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0);
    const ring = (area < 0 ? [...pts].reverse() : [...pts]).map(([x, y]) => [x, y] as [number, number]);
    if (Math.abs(area) < 1 || !(t > 0)) throw Error(`Degenerate polygon in ${g}.`);
    this.put(g, this.keep(this.keep(new this.api.CrossSection([ring])).extrude(t)), frameMat(u, v, cross(u, v), o));
  }
  plates(name: string, plates: readonly PlateId[], origin: V3, axis: V3) {
    if (!plates.length) return;
    for (const p of buildPlateStack(this.api, plates, { origin: apply(this.m, origin), axis: norm(rotateVec(this.m, axis)), name })) this.parts.push(p);
  }
  cable(g: string, points: V3[], d: number) {
    const shim = { api: this.api, keep: <T extends Manifold>(s: T) => this.keep(s) } as unknown as Mechanical;
    this.group(g).solids.push(cableTube(shim, points.map(p => apply(this.m, p)), d / 2));
  }
  /** Unions each material group (minus its holes) into one SolidPart; frees every intermediate. */
  build(label: string): SolidPart[] {
    let ok = false;
    try {
      for (const [name, e] of this.groups) {
        if (!e.solids.length) continue;
        if (!e.finish) throw Error(`${label}: group ${name} has no finish.`);
        let solid = e.solids.length === 1 ? e.solids[0] : this.keep(this.api.Manifold.union(e.solids));
        if (e.holes.length) solid = this.keep(solid.subtract(this.keep(this.api.Manifold.union(e.holes))));
        // Coplanar Boolean seams can leave sliver triangles; collapse anything under 10 µm (print export rejects them).
        solid = this.keep(solid.simplify(.01));
        this.parts.push({ name, solid, role: e.finish.role, color: e.finish.color, metalness: e.finish.metalness, roughness: e.finish.roughness });
      }
      for (const p of this.parts) if (p.solid.isEmpty() || p.solid.status() !== 'NoError') throw Error(`Invalid ${label} ${p.name}`);
      ok = true; return this.parts;
    } finally { if (!ok) this.dispose(); else this.release(); }
  }
  private release() { const keep = new Set(this.parts.map(p => p.solid)); for (const s of this.owned.reverse()) if (!keep.has(s as Manifold)) s.delete(); this.owned = []; }
  /** Frees everything, including plate solids already handed over. */
  dispose() { const owned = new Set<unknown>(this.owned); for (const p of this.parts) if (!owned.has(p.solid)) p.solid.delete(); for (const s of this.owned.reverse()) s.delete(); this.owned = []; this.parts.length = 0; }
}
export function buildLegMachine(api: ManifoldAPI, id: string, params: NumericParams): SolidPart[] {
  const model = legMachineModel(id), kit = new ManifoldKit(api);
  try { model.describe(kit, params); } catch (error) { kit.dispose(); throw error; }
  return kit.build(id);
}
export const definitions: PartDefinition[] = PARTS.map(part => floorDefinition(part, (api, p) => buildLegMachine(api, part.id, p)));
