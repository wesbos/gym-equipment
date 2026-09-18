import { cableTube } from "./cable-tube.ts";
import {
  routeCables,
  type CableRoute,
  type RoutePoint,
} from "../cable-routing.ts";
import type { NumericParams, Vec3 } from "../types.ts";
import type { SystemPartId } from "../system-types.ts";
import type { Manifold } from "manifold-3d";
import type { Mechanical } from "./system-geometry.ts";
const point = (
  x: number,
  y: number,
  z: number,
  pulley?: string,
  radius?: number,
): RoutePoint => ({ point: [x, y, z], pulley, radius });
export function cableRoutePlan(
  p: NumericParams,
  id: SystemPartId,
  side: number,
  stackX: number,
  stackY: number,
  movingZ: number,
) {
  const post = (side * p.rackWidth) / 2,
    ty = -p.tube / 2 - 150,
    tz = p.trolley;
  const kraken = id === "cable-kraken",
    ares = id.includes("ares"),
    v2 = id === "cable-ares2";
  // Athena routes beside its lengthwise guides; its raised saddle spans this offset.
  const x = kraken
    ? post - side * 70
    : id === "cable-athena"
      ? stackX - side * 45
      : stackX;
  const out = kraken
    ? x
    : post + (v2 ? side * 75 : ares ? -side * 10 : -side * 70);
  // ARES2 upper hardware sits over the stack header (REP RevK pp57–60).
  // Centers remain reconstructed, not manufacturer dimensions.
  const H = p.height - (v2 ? (p.height < 2200 ? 56 : 86) : ares ? 180 : 120),
    F = v2 ? movingZ + 250 : Math.max(430, Math.min(1000, movingZ + 180));
  const fy = v2 ? stackY + 60 : ares ? stackY - 260 : ty + 130;
  const low = v2 ? 18 : 95,
    routes: CableRoute[] = [];
  const start = (name: string, pts: RoutePoint[], a: string, b: string) =>
    routes.push({ name, points: pts, start: a, end: b });
  const stackLoop = [
    point(x, stackY - 40, movingZ - 40, "Moving stack pulley"),
    point(x, stackY + 40, movingZ - 40, "Moving stack pulley"),
  ];
  if (kraken) {
    // Manual pp12–13: one long cable, output1 → stack → floating → output2.
    start(
      "Kraken continuous long cable",
      [
        point(out, ty - 100, tz - 40),
        point(out, ty + 40, tz - 40, "Swivel cable output 1"),
        point(out, ty + 40, H, "Upper front redirect 1"),
        point(x, stackY - 40, H, "Upper rear redirect 1"),
        ...stackLoop,
        point(x, stackY + 40, H + 80, "Upper rear redirect 2"),
        point(x, fy + 40, H + 80, "Upper floating entry"),
        point(x, fy + 40, F - 40, "Floating equalizer"),
        point(x, fy - 40, F - 40, "Floating equalizer"),
        point(x, fy - 40, H - 100, "Upper floating exit"),
        point(post + side * 70, ty + 40, H - 100, "Upper front redirect 2"),
        point(post + side * 70, ty + 40, tz - 40, "Swivel cable output 2"),
        point(post + side * 70, ty - 100, tz - 40),
      ],
      "Output handle 1",
      "Output handle 2",
    );
    start(
      "Kraken floating-to-trolley short cable",
      [
        point(x, fy, F - 75),
        point(x, fy, low, "Lower front return"),
        point(x, fy - 80, low, "Lower front return"),
        point(x, fy - 80, tz - 55),
      ],
      "Floating block short-cable eye",
      "Trolley short-cable anchor",
    );
  } else if (!ares) {
    // Athena manual step8 A–I: output → upper/rear → stack → upper/rear →
    // lower rear/front → trolley anchor. No invented floating equalizer.
    start(
      "Athena continuous cable",
      [
        point(out, ty - 100, tz - 40),
        point(out, ty + 40, tz - 40, "Swivel cable output 1"),
        point(out, ty + 40, H, "Upper front redirect 1"),
        point(x, stackY - 40, H, "Upper rear redirect 1"),
        ...stackLoop,
        point(x, stackY + 40, H + 80, "Upper rear redirect 2"),
        point(x + side * 180, stackY + 40, H + 80, "Upper return lane"),
        point(x + side * 180, stackY + 40, low, "Lower stack return"),
        point(out, ty + 110, low, "Lower front return"),
        point(out, ty + 110, tz - 55),
      ],
      "Output handle 1",
      "Trolley return anchor",
    );
  } else {
    // ARES RevK upper A–J and lower A–I. Two sheaves at each level share
    // a floating frame; upper terminates at lat output, lower at trolley.
    const lane = v2 ? post - side * 70 : x - side * 30,
      second = lane - side * (v2 ? 44 : 180),
      latX = side * 90;
    const latY = p.depth - (p.rearBay || p.depth) + 40,
      rowZ = v2 ? 375 : 150;
    // RevK p59 E / p63: one fixed reversal transfers the inside groove
    // to the outside groove of a compact coaxial floating pair. Both
    // floating wraps have the same handedness. Opposite tangent legs
    // keep the two lanes separate without invented horizontal crossovers.
    const secondEntryY = fy + (v2 ? -40 : 40),
      secondExitY = fy + (v2 ? 40 : -40),
      transferRadius = v2 ? Math.hypot(44, 80) / 2 : undefined;
    start(
      `${v2 ? "ARES2" : "ARES1"} upper functional/lat cable`,
      [
        point(out, ty + 60, tz + 55),
        point(out, ty + 60, v2 ? H + 80 : H, "Upper front redirect 1"),
        ...(v2 ? [point(out, fy - 40, H + 80, "Upper rear horizontal redirect")] : []),
        point(lane, fy - 40, v2 ? H + 80 : H, "Upper rear redirect 1"),
        point(lane, fy - 40, F - 40, "Floating equalizer upper 1"),
        point(lane, fy + 40, F - 40, "Floating equalizer upper 1"),
        point(lane, fy + 40, v2 ? H - 120 : H + 80, v2 ? "Upper equalizer transfer" : "Upper equalizer transfer 1", transferRadius),
        point(second, secondEntryY, v2 ? H - 120 : H + 80, v2 ? "Upper equalizer transfer" : "Upper equalizer transfer 2", transferRadius),
        point(second, secondEntryY, F - 40, "Floating equalizer upper 2"),
        point(second, secondExitY, F - 40, "Floating equalizer upper 2"),
        point(second, secondExitY, v2 ? H + 80 : H - 100, "Upper stack approach"),
        point(x, stackY - 40, v2 ? H + 80 : H - 100, "Upper stack redirect"),
        ...stackLoop,
        point(x, stackY + 40, H + 80, "Upper rear redirect 2"),
        point(latX, latY, H + 80, "Lat pulldown swivel"),
        point(latX, latY, H - 120),
      ],
      "Trolley upper cable anchor",
      "Lat output eye",
    );
    const bottom = F - 140;
    start(
      `${v2 ? "ARES2" : "ARES1"} lower functional/row cable`,
      [
        // RevK p66 A/B: working cable rises from the upright foot, wraps
        // the upper swivel sheave and hangs past its lower keeper sheave.
        // The separate upper cable still terminates at the trolley adjuster.
        ...(v2 ? [
          point(out, -80, tz - 110),
          point(out, -80, tz + 80, "Swivel cable output 1"),
          point(out, 0, tz + 80, "Swivel cable output 1"),
          point(out, 0, low, "Lower front return"),
        ] : [
          point(out, ty - 100, tz + 40),
          point(out, ty + 40, tz + 40, "Swivel cable output 1"),
          point(out, ty + 40, low, "Lower front return"),
        ]),
        ...(v2 ? [point(out, fy - 40, low, "Lower rear horizontal redirect")] : []),
        point(lane, fy - 40, low, "Lower rear redirect 1"),
        point(lane, fy - 40, bottom + 40, "Floating equalizer lower 1"),
        point(lane, fy + 40, bottom + 40, "Floating equalizer lower 1"),
        point(lane, fy + 40, v2 ? 260 : low - 65, v2 ? "Lower equalizer transfer" : "Lower equalizer transfer 1", transferRadius),
        point(second, secondEntryY, v2 ? 260 : low - 65, v2 ? "Lower equalizer transfer" : "Lower equalizer transfer 2", transferRadius),
        point(second, secondEntryY, bottom + 40, "Floating equalizer lower 2"),
        point(second, secondExitY, bottom + 40, "Floating equalizer lower 2"),
        point(second, secondExitY, v2 ? 30 : low, "Lower row approach"),
        ...(v2 ? [point(second, latY + 120, 30, "Lower row horizontal redirect")] : []),
        point(latX, latY + 120, v2 ? 30 : 50, "Lower row redirect"),
        ...(v2 ? [
          point(latX, latY + 120, rowZ + 80, "Low row swivel"),
          point(latX, latY + 40, rowZ + 80, "Low row swivel"),
          point(latX, latY + 40, rowZ - 110),
        ] : [
          point(latX, latY + 120, rowZ, "Low row swivel"),
          point(latX, latY - 100, rowZ),
        ]),
      ],
      "Output handle 1",
      "Low row output eye",
    );
  }
  return { ...routeCables(routes), routes, ty, coaxialEqualizer: v2 };
}
export function buildCableRoutes(
  g: Mechanical,
  plan: ReturnType<typeof cableRoutePlan>,
) {
  for (const pulley of plan.pulleys) {
    const from = g.parts.length,
      n = pulley.normal;
    g.pulley(pulley.id, [0, 0, 0], pulley.radius);
    if (plan.coaxialEqualizer && pulley.id.startsWith("Floating"))
      // Paired grooves share one axle and outer frame, built by cable-systems.
      // Keep the detailed wheel; do not duplicate overlapping axle/cheek kits.
      g.parts.splice(from + 1);
    const rotation: Vec3 = [
      0,
      (-Math.asin(Math.max(-1, Math.min(1, n[2]))) * 180) / Math.PI,
      (Math.atan2(n[1], n[0]) * 180) / Math.PI,
    ];
    for (const part of g.parts.slice(from))
      part.solid = g.move(g.rotate(part.solid, rotation), pulley.center);
  }
  for (const cable of plan.cables) {
    g.add(cable.name, cableTube(g, cable.points), "liner");
    for (const [name, p] of [
      [cable.start, cable.points[0]],
      [cable.end, cable.points.at(-1)!],
    ] as [string, Vec3][]) {
      g.add(name + " termination eye", g.ring(6, 9, 4.5, "x", p), "rod");
      g.bolt(name + " clevis pin", p, 8, 18);
      if (name.startsWith("Output handle"))
        g.handle(name, [p[0], p[1], p[2] - 12]);
      else if (!name.includes("output"))
        g.add(
          name + " mounting tab",
          g.cut(g.box([5, 26, 44], [p[0] - 12, p[1], p[2]]), [
            g.cylinder(8, 4.5, "x", [p[0] - 12, p[1], p[2]]),
          ]),
        );
    }
  }
}

/** Reconstructed fairlead windows: keep structural webs out of the actual cable lanes. */
export function cableClearances(
  g: Mechanical,
  body: Manifold,
  plan: ReturnType<typeof cableRoutePlan>,
) {
  const bounds = body.boundingBox(),
    holes = [];
  for (const cable of plan.cables)
    for (let i = 1; i < cable.points.length; i++) {
      const a = cable.points[i - 1],
        b = cable.points[i];
      if (
        a.some(
          (v, k) =>
            Math.min(v, b[k]) > bounds.max[k] + 5 ||
            Math.max(v, b[k]) < bounds.min[k] - 5,
        )
      )
        continue;
      const d = b.map((v, k) => v - a[k]) as Vec3,
        len = Math.hypot(...d);
      if (len < 1e-6) continue;
      holes.push(
        g.rod(
          a.map((v, k) => v - (d[k] * 5) / len) as Vec3,
          b.map((v, k) => v + (d[k] * 5) / len) as Vec3,
          5,
        ),
      );
    }
  return holes.length ? g.cut(body, holes) : body;
}
