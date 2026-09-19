import { defineFloorPart, type BarSpec } from '../floor-part.ts';
import type { ResolvedInstance, Vec3 } from '../types.ts';
/** Men's Olympic bar (IWF): 2200 mm, 28.5 mm shaft, 415 mm loadable 50 mm sleeves. Local X along the bar,
 * origin on the floor under its centre; the bar axis sits at `axisZ` so the shoulder collars rest on the floor. */
export const BAR = { length: 2200, shaft: 28.5, shaftHalf: 655, collar: 30, collarDiameter: 56, sleeve: 415, sleeveDiameter: 50, axisZ: 28, rings: [405, 455], centerKnurl: 60, knurl: [215, 640] } as const;
/** The bar geometry every parking part without its own `bar` spec uses. */
export const DEFAULT_BAR_SPEC: BarSpec = { shaft: BAR.shaft, shaftHalf: BAR.shaftHalf, sleeveStart: BAR.shaftHalf + BAR.collar, sleeveLength: BAR.sleeve, sleeveDiameter: BAR.sleeveDiameter, axisZ: BAR.axisZ };
export const BAR_FINISHES = ['Hard chrome', 'Black oxide'] as const;
export const BARBELL = defineFloorPart({
  id: 'olympic-barbell', name: 'Olympic barbell', title: 'Olympic barbell · 20 kg', noun: 'barbell', section: 'Barbells',
  description: "Men's 20 kg Olympic bar: 2200 mm, 28.5 mm shaft, 415 mm sleeves, IWF/IPF knurl marks. Parks in J-cups, monolift arms and Darko cradles, or lies on the floor.",
  params: [{ key: 'finish', label: 'Shaft finish', default: 0, options: [0, 1], format: v => BAR_FINISHES[v] }],
  footprint: { width: BAR.length, depth: BAR.collarDiameter },
  placement: { side: 'front', gap: 300 }, parks: true,
});
/** Loadable sleeve segments in world space (inner collar face → outward), for plate stacks (#96). Pass the bar's
 * own spec (barSpec in barbell-cradles.ts resolves it from a part id + params); the default is the Olympic bar. */
export function barSleeves(bar: Pick<ResolvedInstance, 'position' | 'rotation'>, spec: BarSpec = DEFAULT_BAR_SPEC): { origin: Vec3; axis: Vec3; length: number; diameter: number }[] {
  const yaw = bar.rotation[2], x: Vec3 = [Math.cos(yaw), Math.sin(yaw), 0], start = spec.sleeveStart, o = spec.sleeveOffset;
  // Dropped sleeves (sleeveOffset): shift by local Y (turned with the bar's yaw) and Z. Coaxial bars skip it untouched.
  const centre: Vec3 = o ? [bar.position[0] - o.y * x[1], bar.position[1] + o.y * x[0], bar.position[2] + spec.axisZ + o.z] : [bar.position[0], bar.position[1], bar.position[2] + spec.axisZ];
  return [1, -1].map(side => ({ origin: [centre[0] + side * start * x[0], centre[1] + side * start * x[1], centre[2]], axis: x.map(v => side * v) as Vec3, length: spec.sleeveLength, diameter: spec.sleeveDiameter }));
}
