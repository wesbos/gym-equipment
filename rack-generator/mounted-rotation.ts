import { Euler, Matrix4, Vector3 } from 'three';
import type { Accessory, Target, Vec3 } from './types.ts';
import { rackPart } from './rack-registry.ts';

export interface MountedRotationMode { kind: 'stepped' | 'continuous' | 'fixed'; supported: boolean; step: number; angles?: readonly number[]; label: string; reason: string }
/** UI steps are degrees; persisted rotations and candidate orientations are radians. */
export function mountedRotationMode(a: Pick<Accessory, 'part' | 'target'>): MountedRotationMode {
  if ((a.part === 'darko-anchor' || a.part === 'darko-double-decker' || rackPart(a.part)) && a.target.kind === 'crossmember-top') return { kind:'stepped', supported:true, step:180, angles:[0,Math.PI], label:'Flip rail side', reason:'The top bearing tab and transverse bolt allow only opposite rail sides (0° / 180°). Quarter turns lose hole alignment.' };
  if (a.part === 'storage-pin-short' || a.part === 'storage-pin-long') return { kind:'continuous', supported:true, step:15, label:'Spin about mounting shaft', reason:'Rotation is about the horizontal shaft, not vertical yaw; a round storage peg may look unchanged.' };
  return { kind:'fixed', supported:false, step:0, label:'Fixed mounting orientation', reason:a.part === 'landmine' ? 'The landmine base has two rack studs. Its sleeve swivel is not whole-assembly rotation.' : 'The bolt pattern or bearing surfaces fix this attachment orientation. Move it to another compatible mount.' };
}
export function normalizeMountedRotation(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('Mounted rotation must be a finite angle in radians.');
  const n = ((value % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
  return Object.is(n,-0) ? 0 : n;
}
export function accessoryRotation(a: Accessory): number { return normalizeMountedRotation(a.rotation !== undefined ? a.rotation : a.target.orientation !== undefined ? a.target.orientation : 0); }
export function validateMountedRotation(a: Accessory): void {
  const angle = accessoryRotation(a), mode = mountedRotationMode(a);
  for (const target of [a.target, a.pairTarget]) if (target?.orientation !== undefined) {
    const orientation = normalizeMountedRotation(target.orientation);
    if (Math.abs(orientation-angle)>1e-10) throw Error('Mount orientation must agree with the accessory rotation, including its pair.');
  }
  if (mode.kind === 'stepped' && !mode.angles!.includes(angle)) throw Error(mode.reason);
  if (mode.kind === 'fixed' && angle !== 0) throw Error(mode.reason);
}
export function nextMountedRotation(a: Accessory, direction = 1): number { return normalizeMountedRotation(accessoryRotation(a)+direction*mountedRotationMode(a).step*Math.PI/180); }
/** A half turn is a remount on the opposite side, never a spin around a floating bolt. */
export function orientedMountTarget(target: Target, rotation: number): Target {
  if (target.kind !== 'crossmember-top') return target;
  return {...target, side: (rotation === 0 ? target.side : -target.side) as 1|-1};
}
export function mountedOrientationCandidates(a: Accessory): Target[] {
  const mode=mountedRotationMode(a);
  return (mode.angles ?? [accessoryRotation(a)]).map(orientation=>({...a.target,orientation}));
}
/** Rz(face) Rx(shaft); Euler XYZ matches renderer and export transforms. */
export function shaftRotation(yaw: number, spin: number): Vec3 {
  const matrix=new Matrix4().makeRotationZ(yaw).multiply(new Matrix4().makeRotationX(spin));
  const e=new Euler().setFromRotationMatrix(matrix,'XYZ');
  return [e.x,e.y,e.z];
}
export function rotateMountedPoint(point: Vec3, rotation: Vec3): Vec3 {
  return new Vector3(...point).applyEuler(new Euler(...rotation)).toArray() as Vec3;
}
