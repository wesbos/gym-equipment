/** Catalog leftovers (#176): Manifold builders for the wall entries in ../wall-parts/leftovers.ts.
 * Wall axes: X along the wall, -Y out of it, Z up; origin at the face centre on the wall surface. */
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { wallDefinition } from '../wall-part.ts';
import { STRIP, stripStations, pinReach, ROGUE_MONSTER_STRIP, ROGUE_3X3_STRIP_2, type StripSpec } from '../wall-parts/leftovers.ts';
import { kit, finish, alongZ, roundRect, torus, BADGE, ZINC } from './leftovers-kit.ts';

const CHROME_BALL = finish('Chrome detent balls', 'fastener', '#d7dbde', .95, .2);
export const buildStrip = (spec: StripSpec) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => {
  if (p.pin !== 0 && p.pin !== 1) throw Error('Unsupported strip detent pin.');
  const st = stripStations(p), L = st.L, T = STRIP.tube, w = STRIP.wall, yc = -T / 2;
  const steel = finish(`Rogue ${spec.finish.name} 11 ga tube`, 'source', spec.finish.color, .3, spec.finish.roughness);
  const shank = finish('Black oxide detent pin', 'source', spec.pin.shank, .7, .4), head = finish('Detent pin collar and pull ring', 'handle', spec.pin.head, .3, .5);
  return kit(api, k => {
    const z = (fromTop: number) => L / 2 - fromTop;
    const outer = roundRect(k, [0, yc], T, T, STRIP.corner), inner = roundRect(k, [0, yc], T - 2 * w, T - 2 * w, 2);
    const tube = alongZ(k, k.csCut(outer, [inner]), L, -L / 2);
    const cuts = [
      ...st.side.map(d => k.cyl(T + 2, spec.hole / 2, 'x', [0, yc, z(d)], 28)),
      ...st.front.map(d => k.cyl(w + 4, (st.lags.includes(d) ? spec.lagHole : spec.hole) / 2, 'y', [0, -T + w / 2, z(d)], 32)),
      ...st.lags.map(d => k.cyl(w + 4, STRIP.lagBore / 2, 'y', [0, -w / 2, z(d)], 16)),
      // Lettering pocket on the front face, filled with a plain badge below.
      k.span([-12, -T - 1, z(st.band[1])], [12, -T + 1, z(st.band[0])]),
    ];
    k.add(steel, k.cut(tube, cuts));
    k.add(BADGE, k.span([-11.5, -T + .5, z(st.band[1]) + .5], [11.5, -T + 1, z(st.band[0]) - .5]));
    // 3/8" × 2-1/2" lags: washer and hex head on the inside of the back wall, seen through the oversized front holes.
    for (const d of st.lags) k.add(ZINC, k.cyl(2, 12, 'y', [0, -w - 1, z(d)], 24), k.cyl(6.5, 8.3, 'y', [0, -w - 2 - 3.25, z(d)], 6));
    if (!p.pin) return;
    // Detent pin through the top side hole: shank out the −X side, collar and pull ring on +X.
    const r = spec.pin.d / 2 - .4, zt = z(st.side[0]), R = pinReach(spec), X: Vec3 = [1, 0, 0];
    k.add(shank, k.rod([R.tip + 4, yc, zt], X, R.collarX - R.tip - 4, r, 28), k.rod([R.tip, yc, zt], X, 4, r - 2, 28));
    k.add(CHROME_BALL, ...[-1, 1].map(s => k.k(k.k(k.api.Manifold.sphere(2.6, 12)).translate([R.tip + 12, yc + s * (r - 1), zt]))));
    const ring = k.k(k.k(k.k(torus(k, spec.pin.ring.R, spec.pin.ring.r, 40, 14).scale([spec.pin.ring.sx, 1, 1])).rotate([90, 0, 0])).translate([R.ringCentre, yc, zt]));
    k.add(head, k.rod([R.collarX, yc, zt], X, R.collar, spec.pin.collar, 32), ring);
  });
};
export const definitions: PartDefinition[] = [
  wallDefinition(ROGUE_MONSTER_STRIP, buildStrip(ROGUE_MONSTER_STRIP.spec)),
  wallDefinition(ROGUE_3X3_STRIP_2, buildStrip(ROGUE_3X3_STRIP_2.spec)),
];
