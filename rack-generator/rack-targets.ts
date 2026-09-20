/** Mount target kinds (#178). Pure type guards shared by the assembly, the registry adapter, collisions and the UI.
 *  - upright (kind omitted or 'upright'): a hole on an upright face;
 *  - rail ('crossmember-top' | 'crossmember-under'): a side-hole station of an upper perforated crossmember;
 *  - hosted ('spotter-arm' | 'pull-up-bar'): a station on another accessory (rack-hosts.ts).
 * Plus the small rotation helpers the rail-under and hosted frames use (three.js XYZ Euler convention). */
import type { CrossmemberTopTarget, HostedTarget, Target, UprightTarget, Vec3 } from './types.ts';
export const RAIL_KINDS = ['crossmember-top', 'crossmember-under'] as const;
export const HOSTED_KINDS = ['spotter-arm', 'pull-up-bar'] as const;
export const TARGET_KINDS = ['upright', ...RAIL_KINDS, ...HOSTED_KINDS] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];
export const targetKind = (t: Pick<Target, 'kind'>): TargetKind => (t.kind ?? 'upright') as TargetKind;
export const isUprightTarget = (t: Pick<Target, 'kind'>): t is UprightTarget => targetKind(t) === 'upright';
export const isRailTarget = (t: Pick<Target, 'kind'> | undefined): t is CrossmemberTopTarget => !!t && (RAIL_KINDS as readonly string[]).includes(t.kind ?? '');
export const isHostedTarget = (t: Pick<Target, 'kind'> | undefined): t is HostedTarget => !!t && (HOSTED_KINDS as readonly string[]).includes(t.kind ?? '');

/** Rotation basis (local X, Y, Z axes in world) of an XYZ Euler rotation (three.js order: R = Rx · Ry · Rz). */
export function eulerBasis([a, b, c]: Vec3): [Vec3, Vec3, Vec3] {
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  const m = [
    [cb * cc, -cb * sc, sb],
    [ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb],
    [sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb],
  ];
  return [0, 1, 2].map(j => [m[0][j], m[1][j], m[2][j]] as Vec3) as [Vec3, Vec3, Vec3];
}
const clean = (v: number) => Math.abs(v) < 1e-12 ? 0 : v;
/** XYZ Euler angles of the rotation whose columns are the local axes X, Y, Z (three.js setFromRotationMatrix 'XYZ'). */
export function basisEuler(X: Vec3, Y: Vec3, Z: Vec3): Vec3 {
  const m13 = Math.max(-1, Math.min(1, Z[0])), b = Math.asin(m13);
  if (Math.abs(m13) < 0.9999999) return [clean(Math.atan2(-Z[1], Z[2])), clean(b), clean(Math.atan2(-Y[0], X[0]))];
  return [clean(Math.atan2(Y[2], Y[1])), clean(b), 0];
}
export const applyBasis = ([X, Y, Z]: [Vec3, Vec3, Vec3], p: Vec3): Vec3 => [0, 1, 2].map(i => clean(X[i] * p[0] + Y[i] * p[1] + Z[i] * p[2])) as Vec3;
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
