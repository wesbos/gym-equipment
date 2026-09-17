import type { NumericParams } from "../types.ts";
import type { Mechanical } from "./system-geometry.ts";
import { smithLayout } from "../system-mounts.ts";

/** REP Rev B steps 7–12, FFE 2.0. Unpublished plate/gusset details reconstructed. */
export function smithFrontAdapters(g: Mechanical, p: NumericParams) {
  const { stations } = smithLayout(p);
  for (const side of [-1, 1]) {
    const x = (side * p.rackWidth) / 2;
    for (const { index, beamZ } of stations) {
      const length = index ? 176.5 : 658.35;
      const face = -p.tube / 2;
      const centerY = face - length / 2;
      const tube = g.cut(g.box([75, length, 75], [x, centerY, beamZ]), [
        g.box([69, length + 2, 69], [x, centerY, beamZ]),
      ]);
      const holes = [];
      for (let y = face - 75.2; y > face - length + 18; y -= p.pitch) {
        holes.push(g.cylinder(80, p.bore / 2, "x", [x, y, beamZ]));
        holes.push(g.cylinder(80, p.bore / 2, "z", [x, y, beamZ]));
      }
      g.add(
        index
          ? "Smith front extension drilled tube"
          : "FFE 2.0 drilled extension tube",
        g.cut(tube, holes)
      );
      const plateY = face - 4;
      const plate = g.box([75, 8, 2 * p.pitch + 40], [x, plateY, beamZ]);
      g.add(
        "Front adapter upright mounting plate",
        g.cut(
          plate,
          [-1, 1].map((n) =>
            g.cylinder(12, p.bore / 2, "y", [x, plateY, beamZ + n * p.pitch])
          )
        )
      );
      for (const n of [-1, 1])
        g.bolt(
          "Front adapter upright through-bolt",
          [x, 0, beamZ + n * p.pitch],
          p.bore - 0.8,
          p.tube + 40,
          "y"
        );
      g.add(
        "Front adapter tube end plug",
        g.box([69, 5, 69], [x, face - length + 2.5, beamZ]),
        "liner"
      );
      if (!index) {
        const y = face - length + 45;
        g.add(
          "FFE leveling foot rubber pad",
          g.cylinder(10, 42, "z", [x, y, 5]),
          "liner"
        );
        g.add(
          "FFE leveling foot steel sole",
          g.cylinder(6, 38, "z", [x, y, 13])
        );
        g.bolt("FFE leveling screw", [x, y, 47], 16, 62, "z");
        g.add(
          "FFE leveling screw receiver",
          g.ring(22, 20, 8.1, "z", [x, y, beamZ - 43])
        );
        for (const sign of [-1, 1])
          g.add(
            "FFE welded mounting gusset",
            g.profile(
              [
                [face - 8, beamZ + 37.5],
                [face - 8, beamZ + p.pitch + 15],
                [face - 100, beamZ + 37.5],
              ],
              5,
              [x + sign * 30, 0, 0],
              "x"
            )
          );
      }
    }
  }
}
