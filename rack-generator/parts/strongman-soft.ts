/** Strongman implements: soft-goods geometry (filled Cordura shells). A bag is an (r, z) profile revolved about Z,
 * then warped with low-frequency noise so it slumps and wrinkles like a packed bag instead of a lathe-turned cylinder.
 * The same profile offset by t gives a conformal shell, so straps, flaps and prints follow the surface. */
import type { Manifold } from 'manifold-3d';
import type { Vec2, Vec3 } from '../types.ts';
import { noise3, type Kit } from './strongman-kit.ts';

/** Offset an open (r, z) polyline that runs from the bottom axis point out, up and back to the top axis point. */
export function offsetProfile(pts: readonly Vec2[], t: number): Vec2[] {
  if (!t) return pts.map(p => [p[0], p[1]] as Vec2);
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    const n: Vec2 = [dz / l, -dx / l];
    return [p[0] < 1e-9 ? 0 : Math.max(0, p[0] + n[0] * t), p[1] + n[1] * t] as Vec2;
  });
}
/** Rounded, bellied cylinder profile: bottom radius rb, top radius rt, height h, corner radii cb/ct, belly bulge, top dome. */
export function bagProfile(o: { rb: number; rt: number; h: number; cb: number; ct: number; belly?: number; dome?: number; steps?: number }): Vec2[] {
  const { rb, rt, h, cb, ct } = o, belly = o.belly ?? 0, dome = o.dome ?? 0, n = o.steps ?? 18;
  const side = (z: number) => { const s = Math.min(1, Math.max(0, z / h)); return rb + (rt - rb) * s + belly * Math.sin(Math.PI * s); };
  const top = h - dome, pts: Vec2[] = [[0, 0]];
  const cr0 = side(cb) - cb; for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI / 2; pts.push([cr0 + cb * Math.cos(a), cb + cb * Math.sin(a)]); }
  for (let i = 1; i < n; i++) { const z = cb + (top - ct - cb) * i / n; pts.push([side(z), z]); }
  const cr1 = side(top - ct) - ct; for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push([cr1 + ct * Math.cos(a), top - ct + ct * Math.sin(a)]); }
  for (let i = 1; i <= 4; i++) { const r = cr1 * (1 - i / 4); pts.push([r, top + dome * (1 - (r / Math.max(cr1, 1)) ** 2)]); }
  pts[0] = [0, 0]; if (pts.at(-1)![0] !== 0) pts.push([0, top + dome]);
  return pts;
}
export interface Sag { amp: number; scale: number; seed: number; wrinkle?: number; lean?: number }
/** Radial noise warp about the Z axis (and a small lean) so shells read as filled fabric. */
export function sagWarp(s: Sag, h: number) {
  const n1 = noise3(s.seed), n2 = noise3(s.seed + 7);
  return (v: Vec3) => {
    const r = Math.hypot(v[0], v[1]); if (r < 1e-6) return;
    const f = 1 + s.amp * n1(v[0] / s.scale, v[1] / s.scale, v[2] / s.scale) + (s.wrinkle ?? 0) * n2(v[0] / s.scale * 4, v[1] / s.scale * 4, v[2] / s.scale * 4);
    v[0] *= f; v[1] *= f; v[0] += (s.lean ?? 0) * v[2] / h * r;
  };
}
/** A revolved soft shell at offset t, warped. */
export function softRevolve(K: Kit, profile: readonly Vec2[], t: number, warp: (v: Vec3) => void, seg = 72): Manifold {
  const ring = offsetProfile(profile, t);
  return K.k(K.revolve(ring, seg).warp(warp));
}
/** Conformal layer of thickness t on `shell(t)` limited to `region` (and sunk 1 mm into the body so no gap shows). */
export function layer(K: Kit, shell: (t: number) => Manifold, t: number, region: Manifold): Manifold {
  return K.cut(K.inter(shell(t), region), [shell(-1.5)]);
}
/** Region prism facing -Y: outline in (x, z), extruded from y = +depth to y = -depth (cuts through the front half). */
export function frontRegion(K: Kit, outline: Vec2[], depth: number): Manifold {
  return K.move(K.rot(K.prism(outline, depth), [90, 0, 0]), [0, 0, 0]);
}
/** Rotated (about Z) front region, so patches can go on any side. */
export function sideRegion(K: Kit, outline: Vec2[], depth: number, angle: number): Manifold {
  return K.rot(frontRegion(K, outline, depth), [0, 0, angle]);
}
export const rectOutline = (cx: number, cz: number, w: number, h: number, r = 0, n = 4): Vec2[] => {
  if (r <= 0) return [[cx - w / 2, cz - h / 2], [cx + w / 2, cz - h / 2], [cx + w / 2, cz + h / 2], [cx - w / 2, cz + h / 2]];
  const out: Vec2[] = [], rr = Math.min(r, w / 2, h / 2);
  for (const [sx, sz, a0] of [[1, -1, -90], [1, 1, 0], [-1, 1, 90], [-1, -1, 180]] as const)
    for (let i = 0; i <= n; i++) { const a = (a0 + i * 90 / n) * Math.PI / 180; out.push([cx + sx * (w / 2 - rr) + rr * Math.cos(a), cz + sz * (h / 2 - rr) + rr * Math.sin(a)]); }
  return out;
};
/** Flat webbing loop: a half-ellipse strap (span along `u`, rise along `v`), width w across, thickness th. */
export function webLoop(K: Kit, span: number, rise: number, w: number, th: number, seg = 24): Manifold {
  const R = span / 2, ring = K.revolve([[R - th, -w / 2], [R, -w / 2], [R, w / 2], [R - th, w / 2]], seg, 180);
  return K.k(ring.scale([1, rise / R, 1]));
}
