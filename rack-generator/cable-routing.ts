import type { Vec3 } from "./types.ts";
export type RoutePoint = { point: Vec3; pulley?: string; radius?: number };
export interface CableRoute {
  name: string;
  start: string;
  end: string;
  points: RoutePoint[];
}
export interface RoutedPulley {
  id: string;
  center: Vec3;
  normal: Vec3;
  radius: number;
}
export interface RoutedCable {
  name: string;
  start: string;
  end: string;
  points: Vec3[];
  pulleys: string[];
}
const add = (a: Vec3, b: Vec3, n = 1): Vec3 =>
  a.map((v, i) => v + n * b[i]) as Vec3;
const dot = (a: Vec3, b: Vec3) => a.reduce((v, x, i) => v + x * b[i], 0);
const unit = (a: Vec3): Vec3 => a.map((x) => x / Math.hypot(...a)) as Vec3;
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Tangent fillets: the cable and pulley share one derived centre and plane.
 * Paired quarter-turns with the same ID form a single 180-degree moving sheave.
 * Small angular steps keep cable tubes outside the R-3 mm wheel core. */
export function routeCables(routes: CableRoute[]) {
  const pulleys = new Map<string, RoutedPulley>();
  const cables: RoutedCable[] = routes.map((route) => {
    if (!route.start || !route.end)
      throw Error("Cable termination is required.");
    const points: Vec3[] = [route.points[0].point];
    const ids: string[] = [];
    for (let i = 1; i < route.points.length - 1; i++) {
      const node = route.points[i],
        v = node.point;
      const before = add(v, route.points[i - 1].point, -1),
        after = add(route.points[i + 1].point, v, -1);
      const a = unit(before),
        b = unit(after),
        c = Math.max(-1, Math.min(1, dot(a, b)));
      const theta = Math.acos(c),
        radius = node.radius ?? 40;
      if (!node.pulley || theta < 1e-7 || theta > Math.PI - 1e-7)
        throw Error(`Invalid cable turn ${route.name}/${node.pulley}`);
      const trim = radius * Math.tan(theta / 2);
      if (trim > Math.min(Math.hypot(...before), Math.hypot(...after)) + 1e-5)
        throw Error(`Cable turn has no tangent clearance: ${node.pulley}`);
      const entry = add(v, a, -trim),
        normal = unit(cross(a, b));
      const center = add(entry, unit(add(b, a, -c)), radius);
      const start = add(entry, center, -1),
        perp = cross(normal, start);
      const steps = Math.ceil(theta / (Math.PI / 36));
      for (let j = 0; j <= steps; j++) {
        const t = (theta * j) / steps;
        points.push(add(add(center, start, Math.cos(t)), perp, Math.sin(t)));
      }
      const old = pulleys.get(node.pulley);
      if (
        old &&
        (Math.hypot(...add(old.center, center, -1)) > 0.01 ||
          Math.abs(dot(old.normal, normal)) < 0.999 ||
          old.radius !== radius)
      )
        throw Error(`Inconsistent shared sheave ${node.pulley}`);
      if (!old)
        pulleys.set(node.pulley, { id: node.pulley, center, normal, radius });
      ids.push(node.pulley);
    }
    points.push(route.points.at(-1)!.point);
    // Adjacent fillets may consume a complete short segment, but never reverse it.
    for (let i = 1; i < route.points.length - 2; i++) {
      const v = route.points[i].point,
        next = route.points[i + 1].point,
        dir = unit(add(next, v, -1));
      const trimAt = (j: number) => {
        const x = route.points[j];
        const a = unit(add(x.point, route.points[j - 1].point, -1)),
          b = unit(add(route.points[j + 1].point, x.point, -1));
        return (
          (x.radius ?? 40) *
          Math.tan(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / 2)
        );
      };
      if (trimAt(i) + trimAt(i + 1) > dot(add(next, v, -1), dir) + 0.01)
        throw Error(`Overlapping cable turns ${route.name}`);
    }
    return {
      name: route.name,
      start: route.start,
      end: route.end,
      points,
      pulleys: ids,
    };
  });
  return { cables, pulleys: [...pulleys.values()] };
}
