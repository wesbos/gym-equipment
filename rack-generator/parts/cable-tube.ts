import type { Vec3 } from "../types.ts";
import type { Mechanical } from "./system-geometry.ts";
const unit = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length) as Vec3;
};
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** One indexed, capped sweep avoids tiny Boolean seam triangles in Float32 exports. */
export function cableTube(g: Mechanical, input: Vec3[], radius = 2.4) {
  const points = input.filter(
    (p, i) => !i || Math.hypot(...p.map((v, k) => v - input[i - 1][k])) > 1e-4,
  );
  const sides = 16,
    vertices: number[] = [],
    triangles: number[] = [];
  let previous: Vec3 | undefined;
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      a = points[Math.max(0, i - 1)],
      b = points[Math.min(points.length - 1, i + 1)];
    const incoming = i ? unit(p.map((v, k) => v - a[k]) as Vec3) : undefined;
    const outgoing =
      i < points.length - 1
        ? unit(b.map((v, k) => v - p[k]) as Vec3)
        : undefined;
    const tangent =
      incoming && outgoing
        ? unit(incoming.map((v, k) => v + outgoing[k]) as Vec3)
        : (incoming ?? outgoing)!;
    const basis =
      previous ??
      ((Math.abs(tangent[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]) as Vec3);
    const projection = dot(basis, tangent);
    const u = unit(basis.map((v, k) => v - projection * tangent[k]) as Vec3),
      v = cross(tangent, u);
    previous = u;
    for (let j = 0; j < sides; j++) {
      const angle = (2 * Math.PI * j) / sides;
      vertices.push(
        ...p.map(
          (n, k) =>
            n + radius * (u[k] * Math.cos(angle) + v[k] * Math.sin(angle)),
        ),
      );
      if (i < points.length - 1) {
        const a = i * sides + j,
          b = i * sides + ((j + 1) % sides);
        triangles.push(a, b, b + sides, a, b + sides, a + sides);
      }
    }
  }
  const start = vertices.length / 3;
  vertices.push(...points[0], ...points.at(-1)!);
  const last = (points.length - 1) * sides;
  for (let j = 0; j < sides; j++)
    triangles.push(
      start,
      (j + 1) % sides,
      j,
      start + 1,
      last + j,
      last + ((j + 1) % sides),
    );
  return g.keep(
    new g.api.Manifold(
      new g.api.Mesh({
        numProp: 3,
        vertProperties: new Float32Array(vertices),
        triVerts: new Uint32Array(triangles),
      }),
    ),
  );
}
