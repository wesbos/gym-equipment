import { defineFloorPart } from '../floor-part.ts';
import type { ResolvedInstance, Vec3 } from '../types.ts';
/** Men's Olympic bar (IWF): 2200 mm, 28.5 mm shaft, 415 mm loadable 50 mm sleeves. Local X along the bar,
 * origin on the floor under its centre; the bar axis sits at `axisZ` so the shoulder collars rest on the floor. */
export const BAR = { length: 2200, shaft: 28.5, shaftHalf: 655, collar: 30, collarDiameter: 56, sleeve: 415, sleeveDiameter: 50, axisZ: 28, rings: [405, 455], centerKnurl: 60, knurl: [215, 640] } as const;
export const BAR_FINISHES = ['Hard chrome', 'Black oxide'] as const;
export const BARBELL = defineFloorPart({
  id: 'olympic-barbell', name: 'Olympic barbell', title: 'Olympic barbell · 20 kg', noun: 'barbell', section: 'Barbells',
  description: "Men's 20 kg Olympic bar: 2200 mm, 28.5 mm shaft, 415 mm sleeves, IWF/IPF knurl marks. Parks in J-cups, monolift arms and Darko cradles, or lies on the floor.",
  params: [{ key: 'finish', label: 'Shaft finish', default: 0, options: [0, 1], format: v => BAR_FINISHES[v] }],
  footprint: { width: BAR.length, depth: BAR.collarDiameter },
  placement: { side: 'front', gap: 300 }, parks: true,
});
/** Loadable sleeve segments in world space (inner collar face → outward), for plate stacks (#96). */
export function barSleeves(bar: Pick<ResolvedInstance, 'position' | 'rotation'>): { origin: Vec3; axis: Vec3; length: number }[] {
  const yaw = bar.rotation[2], x: Vec3 = [Math.cos(yaw), Math.sin(yaw), 0], start = BAR.shaftHalf + BAR.collar;
  return [1, -1].map(side => ({ origin: [bar.position[0] + side * start * x[0], bar.position[1] + side * start * x[1], bar.position[2] + BAR.axisZ], axis: x.map(v => side * v) as Vec3, length: BAR.sleeve }));
}
