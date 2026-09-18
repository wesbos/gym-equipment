import { krakenBaseRise, lockedTrolley } from "../cable-stations.ts";
import {
  cableRoutePlan,
  buildCableRoutes,
  cableClearances,
} from "./cable-routes.ts";
import { cableMountTop } from "../system-mounts.ts";
import type {
  ManifoldAPI,
  NumericParams,
  PartDefinition,
  Vec3,
} from "../types.ts";
import {
  SYSTEM_DEFAULTS,
  SYSTEM_NAMES,
  SYSTEM_NOTE,
  type SystemPartId,
} from "../system-types.ts";
import { mechanical, type Mechanical } from "./system-geometry.ts";
import { validateSystemParams } from "../systems.ts";
const defaults = {
  height: 2032,
  rackWidth: 1215.32,
  depth: 1318.4,
  rearBay: 481.4,
  tube: 75,
  bore: 25.4,
  pitch: 50.8,
  firstHole: 65,
};
function cable(api: ManifoldAPI, p: NumericParams, id: SystemPartId) {
  const rise = id === "cable-kraken" ? krakenBaseRise(p.height) : 0;
  const trolley = lockedTrolley(p, id === "cable-kraken");
  p = { ...p, height: p.height - rise, trolley: trolley - rise };
  validateSystemParams(
    id,
    Object.fromEntries(Object.keys(SYSTEM_DEFAULTS[id]).map((k) => [k, p[k]])),
  );
  if (
    p.height < 1800 ||
    p.height > 2400 ||
    p.depth < 400 ||
    p.depth > 2200 ||
    p.rackWidth < 1000 ||
    p.rackWidth > 1400
  )
    throw Error("Unsupported cable assembly envelope.");
  const result = mechanical(api, (g) => {
    const kraken = id === "cable-kraken",
      ares = id.includes("ares"),
      v2 = id === "cable-ares2";
    const height = p.height,
      mountTop = cableMountTop(p);
    const addedHeight = kraken
      ? 0
      : v2
        ? height < 2200
          ? 53.34
          : 22.86
        : ares
          ? 55
          : 45.72;
    const top = height + addedHeight - 112;
    const sides = p.sides === 3 ? [-1, 1] : [p.sides === 1 ? -1 : 1];
    const lowerHeaderZ = p.firstHole + (v2 ? 120 : 45);
    const headerPlans: ReturnType<typeof cableRoutePlan>[] = [];
    for (const side of sides) {
      const postX = (side * p.rackWidth) / 2;
      // ARES 2 rotates stacks across the rear bay; original ARES stacks run lengthwise.
      const stackX = ares ? postX - side * 205 : postX;
      const stackY = ares
        ? p.depth - (p.rearBay || p.depth) / 2
        : p.depth - 210;
      const lengthwise = kraken || !v2,
        spacing = 180;
      const guide = (n: number, z: number): Vec3 => [
        stackX + (lengthwise ? 0 : (n * spacing) / 2),
        stackY + (lengthwise ? (n * spacing) / 2 : 0),
        z,
      ];
      const plateW = lengthwise ? 130 : 330,
        plateD = lengthwise ? 330 : 130;
      const guideTop = height + addedHeight - 20;
      for (const n of [-1, 1]) {
        g.add(
          "Polished stack guide rod",
          g.cylinder(guideTop - 125, 12.5, "z", guide(n, (guideTop + 125) / 2)),
          "rod",
        );
        for (const z of [125, guideTop])
          g.add(
            "Guide rod socket and rubber bumper",
            g.ring(35, 23, 12.7, "z", guide(n, z)),
            "liner",
          );
      }
      for (const z of [v2 ? 140 : 115, height + addedHeight - 12]) {
        const base = g.rounded(plateW + 45, plateD + 35, 10, [
          stackX,
          stackY,
          z,
        ]);
        g.add(
          "Drilled guide support plate",
          g.cut(
            base,
            [-1, 1].map((n) => g.cylinder(14, 13, "z", guide(n, z))),
          ),
        );
      }
      const count = kraken
        ? 20
        : id === "cable-athena"
          ? p.upgrade
            ? 20
            : 15
          : p.upgrade
            ? 30
            : 25;
      const plateThickness = ares ? 22 : 24,
        headZ = 165 + count * (plateThickness + 1.5),
        selectorZ = 165 + 4 * (plateThickness + 1.5);
      if (p.loading) {
        for (let i = 0; i < count; i++) {
          const z = 165 + i * (plateThickness + 1.5),
            solid = g.rounded(plateW, plateD, plateThickness, [
              stackX,
              stackY,
              z,
            ]);
          const holes = [
            ...[-1, 1].map((n) =>
              g.cylinder(plateThickness + 2, 13, "z", guide(n, z)),
            ),
            g.cylinder(plateThickness + 2, 12, "z", [stackX, stackY, z]),
            g.cylinder(plateD + 2, 4.5, "y", [stackX, stackY, z]),
          ];
          g.add(`Weight stack plate ${i + 1}`, g.cut(solid, holes), "source");
        }
        g.add(
          "Selector stem with pin stations",
          g.cut(
            g.cylinder(headZ - 120, 9, "z", [
              stackX,
              stackY,
              (headZ + 120) / 2,
            ]),
            Array.from({ length: count }, (_, i) =>
              g.cylinder(22, 4, "y", [
                stackX,
                stackY,
                165 + i * (plateThickness + 1.5),
              ]),
            ),
          ),
          "rod",
        );
        g.add(
          "Magnetic selector pin handle",
          g.cylinder(28, 12, "y", [
            stackX,
            stackY - plateD / 2 - 18,
            selectorZ,
          ]),
          "liner",
        );
        g.add(
          "Selector pin",
          g.cylinder(plateD / 2 + 35, 4, "y", [
            stackX,
            stackY - plateD / 4,
            selectorZ,
          ]),
          "fastener",
        );
        if (p.shroud) {
          for (const sideY of [-1, 1]) {
            const z = (headZ + 150) / 2,
              h = headZ + 100;
            const shell = g.box(
              [plateW + 30, 2, h],
              [stackX, stackY + sideY * (plateD / 2 + 18), z],
            );
            const slots = Array.from({ length: 8 }, (_, i) =>
              g.box(
                [plateW - 50, 6, 8],
                [
                  stackX,
                  stackY + sideY * (plateD / 2 + 18),
                  z - h / 2 + 45 + i * 35,
                ],
              ),
            );
            if (sideY === -1)
              slots.push(
                g.box(
                  [30, 6, headZ - 100],
                  [stackX, stackY - plateD / 2 - 18, (headZ + 165) / 2],
                ),
              );
            g.add(
              "Vented folded stack shroud",
              g.union([
                g.cut(shell, slots),
                g.box(
                  [2, plateD + 38, h],
                  [stackX + plateW / 2 + 16, stackY, z],
                ),
              ]),
            );
          }
        }
      } else {
        for (const n of [-1, 1])
          g.add(
            "Plate carriage linear bearing",
            g.ring(130, 23, 12.8, "z", guide(n, 250)),
            "sleeve",
          );
        g.add(
          "Plate loaded carriage web",
          g.cut(
            g.box([plateW, plateD - 45, 10], [stackX, stackY, 300]),
            [-1, 1].map((n) => g.cylinder(14, 13, "z", guide(n, 300))),
          ),
        );
        for (const n of [-1, 1]) {
          g.add(
            "Olympic loadable weight horn",
            g.ring(285, 25, 20, "x", [
              stackX + n * (plateW / 2 + 142.5),
              stackY,
              260,
            ]),
            "sleeve",
          );
          g.add(
            "Weight horn collar",
            g.ring(12, 38, 24, "x", [
              stackX + n * (plateW / 2 + 6),
              stackY,
              260,
            ]),
            "liner",
          );
        }
      }
      const movingZ = p.loading ? headZ + 70 : 370;
      const plan = cableRoutePlan(p, id, side, stackX, stackY, movingZ);
      if (v2) headerPlans.push(plan);
      if (v2)
        for (const plate of g.parts.filter((part) => part.name === "Drilled guide support plate"))
          // RevK pp66–68: return legs pass through fairlead openings beside
          // the guide sockets before turning beneath the lower stack frame.
          plate.solid = cableClearances(g, plate.solid, plan);
      const stackWheel = plan.pulleys.find(
        (w) => w.id === "Moving stack pulley",
      )!;
      g.add(
        "Stack headplate",
        g.cut(
          g.rounded(plateW + 8, plateD + 8, 22, [stackX, stackY, movingZ - 60]),
          [-1, 1].map((n) => g.cylinder(26, 13, "z", guide(n, movingZ - 60))),
        ),
      );
      g.add(
        "Stack sheave saddle base",
        g.box(
          [Math.abs(stackX - stackWheel.center[0]) + 44, 50, 8],
          [(stackX + stackWheel.center[0]) / 2, stackY, movingZ - 53],
        ),
      );
      // Raised axle clevis meets the headplate; the cable's lower tangent clears it.
      for (const n of [-1, 1]) {
        const x = stackWheel.center[0] + n * 17;
        g.add(
          "Raised stack sheave clevis",
          g.cut(g.box([4, 24, 65], [x, stackY, movingZ - 24]), [
            g.cylinder(8, 5.5, "x", [x, stackY, movingZ]),
          ]),
        );
      }
      g.add(
        "Selector stem headplate attachment",
        g.cylinder(24, 9, "z", [stackX, stackY, movingZ - 66]),
        "rod",
      );
      if (v2) {
        g.add(
          "Incremental weight support",
          g.box([70, 75, 8], [stackX + side * 120, stackY, movingZ]),
        );
        for (let i = 0; i < 2; i++)
          g.add(
            "Integrated incremental plate",
            g.box(
              [60, 65, 12],
              [stackX + side * 120, stackY, movingZ + 12 + i * 14],
            ),
            "source",
          );
      }
      // Folded side mounting rails and through-bolts share the actual profile lattice.
      for (const y of [0, p.depth])
        for (const z of [p.firstHole, mountTop]) {
          const rail = g.box(
            [6, p.tube + 80, 2 * p.pitch + 40],
            [postX + side * (p.tube / 2 + 3), y, z + p.pitch],
          );
          const holes = [0, 2].map((n) =>
            g.cylinder(10, p.bore / 2, "x", [
              postX + side * (p.tube / 2 + 3),
              y,
              z + n * p.pitch,
            ]),
          );
          g.add("Perforated upright mounting flange", g.cut(rail, holes));
          for (const n of [0, 2])
            g.bolt(
              "Rack mounting bolt",
              [postX, y, z + n * p.pitch],
              p.bore - 0.8,
              p.tube + 38,
            );
        }
      for (const z of [p.firstHole + 40, v2 ? height - 60 : height + addedHeight - 12]) {
        const beam = g.box([70, p.depth, 6], [postX, p.depth / 2, z]);
        const folded = g.union([
          beam,
          g.box(
            [6, p.depth, 45],
            [postX + side * 32, p.depth / 2, z + (z > 1000 ? -20 : 20)],
          ),
        ]);
        const holes = Array.from(
          { length: Math.floor((p.depth - 50) / p.pitch) },
          (_, i) => g.cylinder(80, 7, "z", [postX, 25 + i * p.pitch, z]),
        );
        g.add("Folded perforated pulley rail",
          v2 ? cableClearances(g, g.cut(folded, holes), plan) : g.cut(folded, holes));
      }
      const trolleyX = postX + (v2 ? side * 75 : ares ? -side * 10 : 0),
        ty = plan.ty,
        tz = p.trolley;
      const sleeveHeight = v2 ? 220 : 175;
      const housing = g.box([p.tube + 20, p.tube + 20, sleeveHeight], [postX, 0, tz]);
      g.add(
        "Sliding trolley steel sleeve",
        g.cut(housing, [
          g.box([p.tube + 9, p.tube + 9, sleeveHeight + 5], [postX, 0, tz]),
          g.cylinder(p.tube + 24, Math.min(14, p.bore - 0.8) / 2 + 0.5, "y", [
            postX,
            0,
            tz,
          ]),
        ]),
      );
      g.add(
        "Trolley UHMW lining",
        g.cut(g.box([p.tube + 9, p.tube + 9, sleeveHeight - 6], [postX, 0, tz]), [
          g.box([p.tube + 1, p.tube + 1, sleeveHeight], [postX, 0, tz]),
          g.cylinder(p.tube + 24, Math.min(14, p.bore - 0.8) / 2 + 0.5, "y", [
            postX,
            0,
            tz,
          ]),
        ]),
        "liner",
      );
      g.bolt(
        "Trolley locking pin",
        [postX, 0, tz],
        Math.min(14, p.bore - 0.8),
        p.tube + 35,
        "y",
      );
      g.add(
        "Trolley pop pin knob",
        g.cylinder(35, 19, "y", [postX, p.tube / 2 + 30, tz]),
        "liner",
      );
      g.add(
        "Trolley adjustment handle",
        g.path(
          [
            [postX + side * 60, 20, tz + 60],
            [postX + side * 110, 20, tz + 60],
            [postX + side * 110, 20, tz - 60],
            [postX + side * 60, 20, tz - 60],
          ],
          9,
        ),
        "handle",
      );
      g.add(
        "Trolley swivel clevis",
        g.box(
          [Math.abs(trolleyX - postX) + 30, 75, 8],
          [(trolleyX + postX) / 2, -p.tube / 2 - 25, tz - 50],
        ),
      );
      buildCableRoutes(g, plan);
      for (const wheel of plan.pulleys.filter(
        (w) => !/Moving|Floating|Swivel cable/.test(w.id) && !(v2 && w.id === "Low row swivel"),
      )) {
        const railZ =
          wheel.center[2] > height / 2
            ? v2 ? height - 60 : height + addedHeight - 12
            : p.firstHole + 40;
        const anchor: Vec3 = [
          postX,
          Math.max(
            0,
            Math.min(
              p.depth,
              wheel.center[1] + (wheel.center[1] > p.depth / 2 ? -120 : 120),
            ),
          ),
          railZ,
        ];
        const sign = /Low row swivel|Lat pulldown swivel/.test(wheel.id)
          ? -side * Math.sign(wheel.normal[0])
          : wheel.normal.reduce(
                (sum, n, i) => sum + n * (anchor[i] - wheel.center[i]),
                0,
              ) >= 0
            ? 1
            : -1;
        const n = wheel.normal.map((v) => v * sign) as Vec3;
        const at = wheel.center.map((v, i) => v + n[i] * 19) as Vec3;
        const angle = (Math.atan2(n[1], n[0]) * 180) / Math.PI;
        const h = Math.abs(railZ - at[2]) + 18;
        const horizontal = v2 && Math.abs(n[2]) > 0.99;
        const web = horizontal
          ? g.box([24, 24, h], [at[0], at[1], (railZ + at[2]) / 2])
          : g.move(g.rotate(g.box([6, 24, h]), [0, 0, angle]), [
            at[0], at[1], (railZ + at[2]) / 2,
          ]);
        const hole = horizontal
          ? g.cylinder(h + 2, 10.5, "z", [at[0], at[1], (railZ + at[2]) / 2])
          : g.move(
            g.rotate(g.cylinder(10, 5.5, "x", [0, 0, 0]), [0, 0, angle]), at,
          );
        g.add(wheel.id + " hanger web", g.cut(web, [hole]));
        const dx = anchor[0] - at[0],
          dy = anchor[1] - at[1];
        const deck = g.move(
          g.rotate(g.box([Math.hypot(dx, dy) + 12, 18, 6]), [
            0,
            0,
            (Math.atan2(dy, dx) * 180) / Math.PI,
          ]),
          [(anchor[0] + at[0]) / 2, (anchor[1] + at[1]) / 2, railZ],
        );
        const bounds = deck.boundingBox(),
          clearances = [];
        for (const cable of plan.cables)
          for (let i = 1; i < cable.points.length; i++) {
            const a = cable.points[i - 1],
              b = cable.points[i],
              delta = b.map((v, k) => v - a[k]) as Vec3;
            if (Math.abs(delta[2]) < 1e-6) continue;
            const t = (railZ - a[2]) / delta[2];
            if (t < 0 || t > 1) continue;
            const c = a.map((v, k) => v + t * delta[k]) as Vec3;
            if (
              c[0] < bounds.min[0] - 5 ||
              c[0] > bounds.max[0] + 5 ||
              c[1] < bounds.min[1] - 5 ||
              c[1] > bounds.max[1] + 5
            )
              continue;
            const scale = 15 / Math.hypot(...delta);
            clearances.push(
              g.rod(
                c.map((v, k) => v - delta[k] * scale) as Vec3,
                c.map((v, k) => v + delta[k] * scale) as Vec3,
                5,
              ),
            );
          }
        g.add(
          wheel.id + " cable-clearance mounting deck",
          clearances.length ? g.cut(deck, clearances) : deck,
        );
      }
      // Physical bridges support the swivels and cable eyes at the trolley sleeve.
      for (const wheel of plan.pulleys.filter((w) =>
        w.id.startsWith("Swivel cable output"),
      )) {
        g.add(
          "Trolley output clevis bridge",
          cableClearances(
            g,
            g.box(
              [
                Math.abs(wheel.center[0] - postX) + 35,
                Math.abs(wheel.center[1]) + 20,
                6,
              ],
              [
                (wheel.center[0] + postX) / 2,
                wheel.center[1] / 2,
                wheel.center[2] - (v2 ? 142 : 52),
              ],
            ),
            plan,
          ),
        );
        g.add(
          "Trolley output pivot",
          g.cylinder(v2 ? 200 : 100, 8, "z", [
            wheel.center[0],
            // Sheave rim + cable radius + pivot radius + 4.6 mm clearance.
            wheel.center[1] + wheel.radius + 2.4 + 8 + 4.6 + (v2 ? 12 : 0),
            wheel.center[2] - (v2 ? 45 : 0),
          ]),
          "rod",
        );
      }
      if (v2) {
        for (const wheel of plan.pulleys.filter((w) =>
          /^(Swivel cable output 1|Low row swivel)$/.test(w.id),
        )) {
          const [x, y, z] = wheel.center;
          g.pulley(wheel.id + " lower keeper", [x, y, z - 90], wheel.radius);
          for (const n of [-1, 1]) {
            // Shared cheek straps join both axle cheeks; the forward cable
            // remains tangent to the keeper rather than acquiring a fake turn.
            g.add(wheel.id + " paired swivel cheek strap",
              g.cut(g.box([4, 22, 90], [x + n * 17, y, z - 45]),
                [z, z - 90].map((level) =>
                  g.cylinder(8, 10.5, "x", [x + n * 17, y, level]))));
            for (const level of [z + 45, z - 135])
              g.add(wheel.id + " swivel pivot arm",
                g.box([4, 76, 6], [x + n * 17, y + 33, level]));
          }
          for (const level of [z + 45, z - 135])
            g.add(wheel.id + " swivel pivot bearing",
              g.ring(12, 19, 8.4, "z", [x, y + 67, level]));
          if (wheel.id === "Low row swivel") {
            g.add("Low row vertical swivel pivot",
              g.cylinder(200, 8, "z", [x, y + 67, z - 45]), "rod");
            // Two pivot bearings stand on a central pedestal connected to
            // the lower transverse stack rail, not a floating side hanger.
            g.add("Low row swivel pedestal",
              g.box([40, 8, z + 45 - lowerHeaderZ],
                [x, y + 85, (z + 45 + lowerHeaderZ) / 2]));
            g.add("Low row pedestal base",
              g.box([44, Math.abs(stackY - (y + 85)) + 20, 8],
                [x, (stackY + y + 85) / 2, lowerHeaderZ]));
          }
        }
      }
      const floating = plan.pulleys.filter((w) => w.id.startsWith("Floating"));
      if (v2 && floating.length) {
        const xs = floating.map((w) => w.center[0]),
          x0 = Math.min(...xs), x1 = Math.max(...xs),
          mid = (x0 + x1) / 2,
          y = floating[0].center[1],
          zs = [...new Set(floating.map((w) => w.center[2]))],
          lo = Math.min(...zs) - 47, hi = Math.max(...zs) + 47;
        for (const x of [x0 - 17, x1 + 17])
          g.add("ARES2 coaxial equalizer outer cheek",
            g.cut(g.box([4, 24, hi - lo], [x, y, (lo + hi) / 2]),
              zs.map((z) => g.cylinder(8, 5.5, "x", [x, y, z]))));
        for (const z of zs) {
          // One shared axle per coaxial pair. Washers seat outside the frame,
          // not between duplicated per-sheave cheek/bolt assemblies.
          g.add("ARES2 coaxial equalizer shared axle",
            g.cylinder(x1 - x0 + 60, 5, "x", [mid, y, z]), "fastener");
          for (const [x, sign] of [[x0 - 19, -1], [x1 + 19, 1]]) {
            g.add("ARES2 coaxial equalizer axle washer",
              g.ring(3, 10, 5.2, "x", [x + sign * 1.5, y, z]), "fastener");
            g.add("ARES2 coaxial equalizer axle nut",
              g.cut(g.cylinder(7, 8.5, "x", [x + sign * 6.5, y, z], 6),
                [g.cylinder(9, 5.2, "x", [x + sign * 6.5, y, z])]), "fastener");
          }
          g.add("ARES2 coaxial equalizer axle spacer",
            g.ring(x1 - x0 - 24, 8, 5.2, "x", [mid, y, z]), "rod");
        }
        for (const z of [lo + 4, hi - 4])
          g.add("ARES2 coaxial equalizer frame tie",
            g.box([x1 - x0 + 38, 24, 8], [mid, y, z]));
      } else if (floating.length) {
        const lo = Math.min(...floating.map((w) => w.center[2])) - 65,
          hi = Math.max(...floating.map((w) => w.center[2])) + 45;
        const xs = [...new Set(floating.map((w) => w.center[0]))];
        if (xs.length > 1)
          for (const z of [lo + 10, hi - 10])
            g.add(
              "Floating equalizer frame cross-tie",
              g.box(
                [Math.max(...xs) - Math.min(...xs) + 38, 14, 8],
                [
                  (Math.max(...xs) + Math.min(...xs)) / 2,
                  floating[0].center[1],
                  z,
                ],
              ),
            );
        for (const x of xs)
          for (const n of [-1, 1])
            g.add(
              "Floating equalizer support link",
              g.box(
                [4, 20, hi - lo],
                [x + n * 17, floating[0].center[1], (hi + lo) / 2],
              ),
            );
      }
      for (const c of plan.cables)
        for (const [name, q] of [
          [c.start, c.points[0]],
          [c.end, c.points.at(-1)!],
        ] as [string, Vec3][]) {
          if (name.startsWith("Trolley"))
            g.add(
              "Trolley cable anchor bridge",
              cableClearances(
                g,
                g.box(
                  [Math.abs(q[0] - postX) + 25, Math.abs(q[1]) + 20, 6],
                  [(q[0] + postX) / 2, q[1] / 2, q[2] - 18],
                ),
                plan,
              ),
            );
        }
      if (kraken && p.adapter) {
        const long = plan.cables[0],
          a = long.points[0],
          b = long.points.at(-1)!;
        g.add(
          "1:1 dual-output combiner",
          g.path(
            [
              [a[0], a[1], a[2] - 12],
              [postX, a[1] - 60, a[2] - 75],
              [b[0], b[1], b[2] - 12],
            ],
            6,
          ),
          "handle",
        );
      }
    }
    if (ares) {
      for (const z of [lowerHeaderZ, v2 ? height - (height < 2200 ? 110 : 140) : top + 50]) {
        const y = p.depth - (p.rearBay || p.depth) / 2;
        const rail = g.box([p.rackWidth, 75, 75], [0, y, z]);
        const hollow = g.box([p.rackWidth + 2, 69, 69], [0, y, z]);
        g.add("ARES transverse stack support", headerPlans.reduce(
          (body, plan) => cableClearances(g, body, plan), g.cut(rail, [hollow])));
      }
      if (v2) {
        // Reconstructed rise leaves complete underhung sheaves below the header.
        // End webs connect the raised header to the existing lower side rails.
        for (const side of [-1, 1])
          g.add("ARES2 lower header end bracket",
            g.box([6, 75, lowerHeaderZ - (p.firstHole + 40) + 6],
              [side * (p.rackWidth / 2 - 3), p.depth - (p.rearBay || p.depth) / 2,
                (lowerHeaderZ + p.firstHole + 40) / 2]));
        const headerZ = height - (height < 2200 ? 110 : 140),
          railZ = height - 60;
        for (const side of [-1, 1])
          g.add("ARES2 header end bracket",
            g.box([6, 75, railZ - headerZ + 6],
              [side * p.rackWidth / 2, p.depth - (p.rearBay || p.depth) / 2,
                (railZ + headerZ) / 2]));
      }
      const y = p.depth - (p.rearBay || p.depth) + 40,
        z = v2 ? 320 : 130;
      for (const side of [-1, 1]) {
        const plate = g.box([220, 10, 240], [side * 200, y, z]);
        const slots = Array.from({ length: 7 }, (_, i) =>
          g.box([190, 14, 7], [side * 200, y, z - 90 + i * 30]),
        );
        g.add(
          "Slotted low row footplate",
          g.rotate(g.cut(plate, slots), [0, 0, 0]),
        );
        g.add(
          "Footplate brace",
          g.profile(
            [
              [0, 0],
              [150, 0],
              [0, 210],
            ],
            8,
            [side * 200, y, z - 120],
            "x",
          ),
        );
      }
      if (p.handles) {
        const latZ = p.height - 330,
          rowZ = v2 ? 375 : 150;
        for (const side of [-1, 1])
          g.add(
            "Lat output bar connector",
            g.path(
              [
                [side * 90, y, v2 ? p.height - (height < 2200 ? 176 : 206) : latZ + 30],
                [side * 90, y, latZ],
              ],
              4,
            ),
            "rod",
          );
        g.add(
          "Low row twin-output connector",
          g.path(
            [
              [-90, v2 ? y + 40 : y - 100, v2 ? rowZ - 110 : rowZ],
              [0, y - 140, v2 ? rowZ - 110 : rowZ],
              [90, v2 ? y + 40 : y - 100, v2 ? rowZ - 110 : rowZ],
            ],
            5,
          ),
          "rod",
        );
        g.add(
          "Bent lat bar",
          g.path(
            [
              [-570, y, latZ - 80],
              [-440, y, latZ],
              [440, y, latZ],
              [570, y, latZ - 80],
            ],
            14,
          ),
          "handle",
        );
        g.handle("Low row handle", [0, y - 140, v2 ? rowZ - 110 : rowZ]);
      }
    }
  });
  if (rise)
    for (const part of result) {
      const original = part.solid;
      part.solid = original.translate([0, 0, rise]);
      original.delete();
    }
  return result;
}
export const definitions: PartDefinition[] = (
  ["cable-kraken", "cable-ares2", "cable-athena", "cable-ares1"] as const
).map((id) => ({
  id,
  name: SYSTEM_NAMES[id],
  category: "Cable systems",
  defaults: {
    ...defaults,
    ...SYSTEM_DEFAULTS[id],
    trolley: lockedTrolley(
      { ...defaults, ...SYSTEM_DEFAULTS[id] },
      id === "cable-kraken",
    ),
    ...(id === "cable-kraken"
      ? {
          height: 2133.6,
          tube: 76.2,
          rackWidth: 1168.4,
          depth: 838.2,
          rearBay: 0,
        }
      : {}),
  },
  description: SYSTEM_NOTE,
  build: (api, p) => cable(api, p, id),
}));
