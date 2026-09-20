/** Rogue Monster Mini Feet builder (#178). Frame (rack-part.ts): origin on the upright centreline at the lower bolt,
 * +Y out of the mounting face, Z up; the floor is z = -holeHeight. Sizes: rack-parts/rack-jcups-safeties-feet.ts. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { buildWith, FINISH } from './rack-jcups-safeties-kit.ts';
import { MINI_FEET, ROGUE_MONSTER_MINI_FEET, miniFeetLayout } from '../rack-parts/rack-jcups-safeties-feet.ts';

export function buildMiniFeet(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_MINI_FEET.defaults, ...params }, l = miniFeetLayout(p), f = MINI_FEET, h = f.tube / 2, w = f.wall;
  return buildWith(api, k => {
    const { box, rod, minus, union, put, hexHead } = k;
    const at = (x: number, y: number, z: number): Vec3 => [x, y, z];
    // Mounting plate on the upright face with the two bolt holes.
    const bolts = [0, l.upper];
    const plate = minus(box([-f.plate.w / 2, l.face, l.plateBottom], [f.plate.w / 2, l.y0, l.plateTop]), ...bolts.map(z => rod(at(0, l.face - 1, z), at(0, l.y0 + 1, z), f.bolt / 2 + .8, 32)));
    // Foot tube out from the plate, mitred into the vertical leg (one hollow 3x3 section), and the floor tab.
    const outer = union([box([-h, l.y0 - .5, l.tubeZ - h], [h, l.legOut, l.top]), box([-h, l.legIn, l.floor + f.tab.t - .5], [h, l.legOut, l.top])]);
    const inner = union([box([-h + w, l.y0 + .5, l.tubeZ - h + w], [h - w, l.legOut - w, l.top - w]), box([-h + w, l.legIn + w, l.floor + f.tab.t + w], [h - w, l.legOut - w, l.top - w])]);
    // 1 in accessory holes: four through the top and bottom, three through the sides (staggered), one in the leg end.
    const holes = [
      ...[1.25, 3.25, 5.25, 7.25, 9.5].map(y => rod(at(0, l.face + y * 25.4, l.tubeZ - h - 1), at(0, l.face + y * 25.4, l.top + 1), f.hole / 2, 28)),
      ...[2.25, 4.25, 6.25, 9.5].map(y => rod(at(-h - 1, l.face + y * 25.4, l.tubeZ), at(h + 1, l.face + y * 25.4, l.tubeZ), f.hole / 2, 28)),
      rod(at(0, l.legOut - w - 1, l.tubeZ), at(0, l.legOut + 1, l.tubeZ), f.hole / 2, 28),
    ];
    const tube = minus(outer, inner, ...holes);
    const tab = minus(box([-h, l.legIn, l.floor], [h, l.face + f.tab.to, l.floor + f.tab.t]), rod(at(0, l.face + f.tab.to - 20, l.floor - 1), at(0, l.face + f.tab.to - 20, l.floor + f.tab.t + 1), f.tab.hole / 2, 20));
    put('MG Black foot plate, 3x3 in 11-gauge tube and floor tab', union([plate, tube, tab]), FINISH.gloss, 'source');
    // Mitre weld seam across the tube-to-leg corner (a thin darker band on both sides).
    put('Mitre weld seam', union([-1, 1].map(s => k.prism([[l.legOut - 3, l.top - 1], [l.legOut + .01, l.top - 4], [l.legIn + 4, l.tubeZ - h + .5], [l.legIn + 1, l.tubeZ - h + 3]], s > 0 ? h : -h - .4, s > 0 ? h + .4 : -h, 'x'))), { color: '#0c0d0e', metalness: .4, roughness: .5 });
    // Two 1 x 5 in black-zinc hex bolts: heads on the plate, lock washer and nut behind the far face.
    const back = -l.face;
    const hardware = bolts.flatMap(z => [
      hexHead(at(0, l.y0, z), 'y', f.head[0], f.head[1]),
      rod(at(0, back - f.washer - f.nut[1] - 4, z), at(0, l.y0 + 1, z), f.bolt / 2, 28),
      k.rod(at(0, back - f.washer, z), at(0, back, z), f.bolt * .95, 28),
      hexHead(at(0, back - f.washer, z), '-y', f.nut[0], f.nut[1]),
    ]);
    put('1 x 5 in black-zinc bolts, washers and nuts', union(hardware), { color: '#1e1f21', metalness: .45, roughness: .45 }, 'fastener');
  });
}
