/** Safety squat, cambered and specialty squat bars: Manifold builders for the entries in ../floor-parts/specialty-bars.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 *
 * Every entry is a list of ideal prims (floor-parts/specialty-bars-geometry.ts). Sweeps are extruded straight and
 * warped along their path (exact tube sweeps for S-cambers, bows, bent handles and chain links); hull prims are
 * convex hulls. The warp also applies the floor rest pose, so the output sits on the floor with the shaft axis at
 * local Y = 0, and its bounds match the footprint computed from the same prims. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { PARTS, specialtyBarModel, specialtyBarPose } from '../floor-parts/specialty-bars.ts';
import { add, mul, norm, posePoint, sweepFrames, type Prim, type RestPose, type SweepPrim, type V3 } from '../floor-parts/specialty-bars-geometry.ts';

function sweepSolid(api: ManifoldAPI, keep: <T extends Manifold | CrossSection>(s: T) => T, p: SweepPrim, pose: RestPose): Manifold {
  const { CrossSection: C, Manifold: M } = api, frames = sweepFrames(p), s = p.section, n = frames.length - 1;
  const acc = [0]; for (let i = 1; i <= n; i++) acc.push(acc[i - 1] + Math.hypot(...frames[i].P.map((v, k) => v - frames[i - 1].P[k])));
  const L = acc[n], section = (grow = 0) => 'circle' in s ? keep(C.circle(s.circle + grow, s.seg ?? 40))
    : (s.round ?? 0) + grow > 0 ? keep(keep(new C([s.poly])).offset((s.round ?? 0) + grow, 'Round', 2, s.seg ?? 32)) : keep(new C([s.poly]));
  let local: Manifold;
  if (p.bevel) {
    const b = p.bevel;
    local = keep(M.hull([keep(keep(section().extrude(L - 2 * b)).translate([0, 0, b])), keep(section(-b).extrude(L))]));
  } else local = keep(section().extrude(L, Math.max(0, n - 1)));
  let k = 0;
  return keep(local.warp(v => {
    const z = Math.min(L, Math.max(0, v[2]));
    while (k > 0 && acc[k] > z) k--;
    while (k < n - 1 && acc[k + 1] < z) k++;
    const t = acc[k + 1] > acc[k] ? (z - acc[k]) / (acc[k + 1] - acc[k]) : 0, a = frames[k], b = frames[k + 1];
    const P = add(a.P, mul(add(b.P, mul(a.P, -1)), t)), N = norm(add(mul(a.N, 1 - t), mul(b.N, t)));
    const q = posePoint(pose, add(P, add(mul(N, v[0]), mul(p.B, v[1]))));
    v[0] = q[0]; v[1] = q[1]; v[2] = q[2];
  }));
}
/** Builds every prim in its floor pose, unions them per (name, material) and paints them from the entry palette. */
export function buildSpecialtyBar(api: ManifoldAPI, id: string, params: NumericParams): SolidPart[] {
  const model = specialtyBarModel(id), prims: Prim[] = model.prims(params), palette = model.palette(params), pose = specialtyBarPose(id, params);
  const owned: (Manifold | CrossSection)[] = [], keep = <T extends Manifold | CrossSection>(s: T) => (owned.push(s), s), out: SolidPart[] = [];
  const groups = new Map<string, { name: string; mat: string; solids: Manifold[] }>();
  let success = false;
  try {
    for (const p of prims) {
      if (!palette[p.mat]) throw Error(`No finish for ${id} material ${p.mat}.`);
      const solid = p.kind === 'hull' ? keep(api.Manifold.hull(p.points.map(q => posePoint(pose, q)) as V3[])) : sweepSolid(api, keep, p, pose);
      const key = `${p.name}|${p.mat}`, g = groups.get(key) ?? { name: p.name, mat: p.mat, solids: [] };
      g.solids.push(solid); groups.set(key, g);
    }
    const names = [...groups.values()].map(g => g.name);
    for (const g of groups.values()) {
      const solid = g.solids.length === 1 ? g.solids[0] : keep(api.Manifold.union(g.solids)), finish = palette[g.mat];
      out.push({ name: names.filter(n => n === g.name).length > 1 ? `${g.name} · ${g.mat}` : g.name, solid, ...finish });
    }
    for (const part of out) if (part.solid.isEmpty() || part.solid.status() !== 'NoError') throw Error(`Invalid ${id} ${part.name}`);
    success = true; return out;
  } finally { const kept = new Set(success ? out.map(p => p.solid) : []); for (const s of owned.reverse()) if (!kept.has(s as Manifold)) s.delete(); }
}
export const definitions: PartDefinition[] = PARTS.map(part => floorDefinition(part, (api, params) => buildSpecialtyBar(api, part.id, params)));
