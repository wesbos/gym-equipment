import type { NumericParams, Vec2 } from "../types.ts";
import type { Mechanical } from "./system-geometry.ts";
import { smithLayout } from "../system-mounts.ts";

/** Chamfered rectangle in the adapter's (x, z) plane. */
const octagon = (w: number, h: number, c: number): Vec2[] => [
  [-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c], [w / 2, h / 2 - c],
  [w / 2 - c, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c],
];
/** FFE 2.0 side outline (y, z): drilled level run, 45° drop and floor run (reference/photos/smith-rep/ffe2-*). */
export function ffeOutline(face: number, beamZ: number, tube = 75): Vec2[] {
  const top = beamZ + tube / 2, bottom = beamZ - tube / 2, drop = top - tube - 6;
  const rise = bottom - 6, run = tube * Math.SQRT2 - tube; // parallel 45° walls, 75 mm normal section
  return [[face, top], [face - 420, top], [face - 420 - drop, 6 + tube], [face - 590, 6 + tube],
    [face - 590, 6], [face - 420 + run - rise, 6], [face - 420 + run, bottom], [face, bottom]];
}

/** REP Rev B steps 7–12, FFE 2.0. Unpublished plate/gusset details reconstructed. */
export function smithFrontAdapters(g: Mechanical, p: NumericParams) {
  const { stations } = smithLayout(p);
  const along = (loop: Vec2[], w: number, x: number) => g.profile(loop, w, [x - w / 2, 0, 0], "x");
  for (const side of [-1, 1]) {
    const x = (side * p.rackWidth) / 2;
    for (const { index, beamZ, stationY } of stations) {
      const length = index ? 176.5 : 658.35;
      const face = -p.tube / 2;
      const centerY = face - length / 2;
      const holes = [];
      if (index)
        // Upper bracket: only the paired lateral holes for the Smith L-bracket bolts.
        for (const n of [-1, 1])
          holes.push(g.cylinder(80, p.bore / 2, "x", [x, stationY + (n * p.pitch) / 2, beamZ]));
      else
        for (let y = face - 75.2; y > face - 380; y -= p.pitch) {
          holes.push(g.cylinder(80, p.bore / 2, "x", [x, y, beamZ]));
          holes.push(g.cylinder(80, p.bore / 2, "z", [x, y, beamZ]));
        }
      const body = index
        ? g.cut(g.box([75, length, 75], [x, centerY, beamZ]), [
            g.box([69, length + 2, 69], [x, centerY, beamZ]),
          ])
        : (() => {
            const loop = ffeOutline(face, beamZ, p.tube);
            const cs = g.keep(new g.api.CrossSection([loop]));
            const inset = g.keep(cs.offset(-3, "Miter")).toPolygons()[0] as Vec2[];
            return g.cut(along(loop, 75, x), [along(inset, 69, x)]);
          })();
      g.add(
        index
          ? "Smith front extension drilled tube"
          : "FFE 2.0 drilled extension tube",
        g.cut(body, holes)
      );
      // Tall chamfered mounting plate; vertical slots take the upright bolts (and level the foot).
      const plateY = face - 4;
      const slots = [-1, 1].map((n) =>
        g.union([
          ...[-7, 7].map((dz) => g.cylinder(12, 13, "y", [x, plateY, beamZ + n * p.pitch + dz])),
          g.box([26, 12, 14], [x, plateY, beamZ + n * p.pitch]),
        ])
      );
      g.add(
        "Front adapter upright mounting plate",
        g.cut(g.profile(octagon(75, 2 * p.pitch + 70, 12), 8, [x, plateY + 4, beamZ], "y"), slots)
      );
      for (const n of [-1, 1])
        g.bolt(
          "Front adapter upright through-bolt",
          [x, 0, beamZ + n * p.pitch],
          p.bore - 0.8,
          p.tube + 40,
          "y"
        );
      if (index) {
        // Chamfered REP composite end cap with a recessed logo panel.
        const endY = face - length;
        g.add(
          "Front adapter tube end plug",
          g.union([
            g.cut(g.profile(octagon(79, 79, 9), 12, [x, endY, beamZ], "y"), [
              g.box([60, 4, 60], [x, endY - 12, beamZ]),
            ]),
            g.box([69, 10, 69], [x, endY + 5, beamZ]),
          ]),
          "liner"
        );
      } else {
        // Welded sole from under the drop to a rounded, anchor-drilled toe at the published 658.35 mm.
        const toe = face - length + 37.5, run = 460 + 37.5 - length;
        g.add(
          "FFE 2.0 floor foot plate",
          g.cut(
            g.union([
              g.box([75, -run, 6], [x, face - 460 + run / 2, 3]),
              g.cylinder(6, 37.5, "z", [x, toe, 3]),
            ]),
            [g.cylinder(10, 7, "z", [x, face - length + 30, 3])]
          )
        );
        g.bolt("FFE floor anchor bolt", [x, face - length + 30, 10], 12, 20, "z");
      }
    }
  }
}
