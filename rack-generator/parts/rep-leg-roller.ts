/** REP Fitness Leg Roller (1.0) builder (#131 proof entry). Source frame (rack-part.ts): origin on the upright centreline
 * at the hole axis, +Y out of the mounting face, Z up.
 *  - 5000 Series: chrome 1 in shaft through the upright along +Y, steel collar disc, vinyl roller pad against the face,
 *    lynch pin behind the far face.
 *  - 4000 Series: hanger plate on the face (top pin + red pop-pin one station down), 1-1/4 in arm that U-bends out
 *    and runs along +X to the pad. `mirror: 1` (second unit of a pair) mirrors it across local X. */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { rackDefinition } from '../rack-part.ts';
import { vendorSolid } from './vendor-solid.ts';
import { revolveProfile } from './rogue-band-pegs.ts';
import { LEG_ROLLER, legRoller4000, legRoller5000, legRollerSeries, REP_LEG_ROLLER } from '../rack-parts/rep-leg-roller.ts';
const VINYL = '#2b2d30', STEEL = '#1b1c1e', CHROME = '#d5d9dc';
export function buildLegRoller(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_LEG_ROLLER.defaults, ...params }, s = legRollerSeries(p), face = (p.upright ?? 75) / 2, pitch = p.mountSpacing ?? 50;
  return vendorSolid(api, v => {
    const { M, C, keep: k, add, box, cylinder } = v;
    /** Revolved solid along +Y (axis at x, z) from y0 to y1, chamfered c0/c1 at its ends. */
    const alongY = (x: number, z: number, y0: number, y1: number, radius: number, c0 = 0, c1 = 0, segments = 48) =>
      k(k(k(M.revolve([revolveProfile(radius, y1 - y0, c0, c1)], segments)).rotate([-90, 0, 0])).translate([x, y0, z]));
    /** Same along +X (axis at y, z) from x0 to x1. */
    const alongX = (y: number, z: number, x0: number, x1: number, radius: number, c0 = 0, c1 = 0, segments = 48) =>
      k(k(k(M.revolve([revolveProfile(radius, x1 - x0, c0, c1)], segments)).rotate([0, 90, 0])).translate([x0, y, z]));
    const vinyl = (solid: Manifold, name = 'Vinyl-covered foam roller pad') => add(name, solid, 'source', VINYL, 0, .82);
    const padR = s.padDiameter / 2;
    if (!p.series) {
      // Pad, collar and shaft stack from the mounting face; the overall length is the published 20.1 in.
      const { pad0, pad1, back } = legRoller5000(p);
      add('Chrome-plated solid 1 in shaft', alongY(0, 0, back, pad1 - 12, LEG_ROLLER.shaft / 2, 1.5, 0), 'source', CHROME, .95, .12);
      add('Steel collar disc', alongY(0, 0, face, pad0, LEG_ROLLER.collar / 2, .8, .8, 64), 'source', '#a3a8ac', .85, .3);
      vinyl(alongY(0, 0, pad0, pad1, padR, 3, 12, 64));
      // Gathered vinyl at the far end with the centre retaining bolt.
      vinyl(alongY(0, 0, pad1 - 1, pad1 + 2.5, padR - 16, 0, 2, 48), 'Gathered pad end');
      add('Pad end washer', alongY(0, 0, pad1 + 2, pad1 + 3, 17, 0, .3, 32), 'fastener', '#3a3c3f', .7, .35);
      add('Pad end bolt head', k(k(k(M.cylinder(LEG_ROLLER.endBolt - 3, 11, 11, 6)).rotate([-90, 0, 0])).translate([0, pad1 + 3, 0])), 'fastener', '#2a2b2d', .7, .35);
      // Lynch pin behind the far upright face: cross pin through the shaft and its spring hoop around it.
      const pinY = back + 13;
      add('Lynch pin', cylinder(2.6, 34, [0, pinY, 0], [0, 90, 0], 16), 'fastener', '#c9ccce', .85, .25);
      const hoop = k(k(k(k(C.circle(17, 40)).subtract(k(C.circle(14.5, 40)))).extrude(3)).rotate([90, 0, 0]));
      add('Lynch pin hoop', k(hoop.translate([0, pinY + 1.5, 0])), 'fastener', '#c9ccce', .85, .25);
    } else {
      const g = legRoller4000(p), [pw, ph, pt] = LEG_ROLLER.plate, z = LEG_ROLLER.armZ, ar = LEG_ROLLER.arm / 2;
      // Hanger plate on the face with the top mounting pin into the upright hole.
      const coat = (name: string, solid: Manifold) => add(name, solid, 'source', STEEL, .35, .7);
      coat('Hanger plate', box([pw, pt, ph], [0, face + pt / 2, LEG_ROLLER.plateTop - ph / 2]));
      coat('Top mounting pin', alongY(0, 0, face - 42, face + pt + 10, 15.9 / 2, 1.2, 1.2, 32));
      // Pop-pin sleeve box one station down, open on top, the red pull ring above it.
      const boxZ = -pitch, cup = k(box([46, 44, 38], [0, face + pt + 22, boxZ]).subtract(box([40, 38, 40], [0, face + pt + 22, boxZ + 4])));
      coat('Pop-pin sleeve', cup);
      add('Pop-pin plunger', alongY(0, boxZ, face - 30, face + pt + 34, LEG_ROLLER.popPin / 2, 1, 1, 32), 'fastener', '#b9bcbf', .8, .3);
      const ring = k(k(k(k(C.circle(13, 32)).subtract(k(C.circle(8.5, 32)))).extrude(5)).rotate([0, 90, 0]));
      add('Red pop-pin pull ring', k(ring.translate([-2.5, face + pt + 36, boxZ + 26])), 'source', '#d3222a', .1, .45);
      // Arm: welded under the plate, runs -X, U-bends outward, then +X along the face to the pad.
      const plateX = 18;
      coat('Arm root weld plate', box([40, 26, 10], [0, face + pt + 13, z + ar + 3]));
      coat('Arm tube', k(M.union([
        alongX(g.nearY, z, g.bendX, plateX, ar),
        k(k(k(k(C.circle(ar, 32)).translate([LEG_ROLLER.bendRadius, 0])).revolve(48, 180)).rotate([0, 0, 90])).translate([g.bendX, (g.nearY + g.farY) / 2, z]),
        alongX(g.farY, z, g.bendX, g.padStart + 20, ar),
      ])));
      const tip = g.tip;
      vinyl(alongX(g.farY, z, g.padStart, tip - 2, s.padDiameter / 2, 10, 4, 64));
      vinyl(alongX(g.farY, z, tip - 4, tip, padR - 18, 0, 2, 48), 'Gathered pad end');
      add('Pad end bolt head', k(k(k(M.cylinder(LEG_ROLLER.endBolt, 12, 12, 6)).rotate([0, 90, 0])).translate([tip, g.farY, z])), 'fastener', '#2a2b2d', .7, .35);
      if (p.mirror === 1) for (const part of v.parts) part.solid = k(part.solid.mirror([1, 0, 0]));
    }
  });
}
export const definitions: PartDefinition[] = [rackDefinition(REP_LEG_ROLLER, buildLegRoller)];
