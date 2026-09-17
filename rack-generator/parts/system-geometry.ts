import type { CrossSection, Manifold } from "manifold-3d";
import type { ManifoldAPI, SolidPart, Vec2, Vec3 } from "../types.ts";
/** Scoped Manifold ownership: outputs transfer to worker; every temporary is deleted. */
export function mechanical(
  api: ManifoldAPI,
  build: (g: Mechanical) => void,
): SolidPart[] {
  const g = new Mechanical(api);
  try {
    build(g);
    for (const p of g.parts)
      if (p.solid.isEmpty() || p.solid.status() !== "NoError")
        throw Error(`Invalid mechanical solid: ${p.name}`);
    g.parts.forEach((p) => g.owned.delete(p.solid));
    return g.parts;
  } finally {
    for (const s of [...g.owned].reverse()) s.delete();
  }
}
export class Mechanical {
  owned = new Set<Manifold | CrossSection>();
  parts: SolidPart[] = [];
  constructor(readonly api: ManifoldAPI) {}
  keep<T extends Manifold | CrossSection>(s: T): T {
    this.owned.add(s);
    return s;
  }
  move(s: Manifold, p: Vec3) {
    return this.keep(s.translate(p));
  }
  rotate(s: Manifold, p: Vec3) {
    return this.keep(s.rotate(p));
  }
  box(size: Vec3, p: Vec3 = [0, 0, 0]) {
    return this.move(this.keep(this.api.Manifold.cube(size, true)), p);
  }
  cylinder(length: number, r: number, axis: "x" | "y" | "z", p: Vec3, n = 32) {
    let s = this.keep(this.api.Manifold.cylinder(length, r, r, n, true));
    if (axis === "x") s = this.rotate(s, [0, 90, 0]);
    if (axis === "y") s = this.rotate(s, [90, 0, 0]);
    return this.move(s, p);
  }
  union(ss: Manifold[]) {
    return this.keep(this.api.Manifold.union(ss));
  }
  cut(s: Manifold, holes: Manifold[]) {
    return this.keep(this.api.Manifold.difference([s, ...holes]));
  }
  profile(loop: Vec2[], depth: number, p: Vec3, axis: "x" | "y" | "z" = "z") {
    let s = this.keep(
      this.keep(new this.api.CrossSection([loop])).extrude(depth),
    );
    if (axis === "x") s = this.rotate(this.rotate(s, [90, 0, 0]), [0, 0, 90]);
    if (axis === "y") s = this.rotate(s, [90, 0, 0]);
    return this.move(s, p);
  }
  rounded(w: number, d: number, h: number, p: Vec3, r = 8) {
    const c = this.keep(
      this.api.CrossSection.square([w - 2 * r, d - 2 * r], true),
    );
    const outer = this.keep(c.offset(r, "Round", 2, 24));
    return this.move(this.keep(outer.extrude(h)), [p[0], p[1], p[2] - h / 2]);
  }
  ring(
    length: number,
    r: number,
    bore: number,
    axis: "x" | "y" | "z",
    p: Vec3,
  ) {
    return this.cut(this.cylinder(length, r, axis, p), [
      this.cylinder(length + 2, bore, axis, p),
    ]);
  }
  rod(a: Vec3, b: Vec3, r: number) {
    const d = b.map((v, i) => v - a[i]) as Vec3,
      len = Math.hypot(...d);
    const s = this.keep(this.api.Manifold.cylinder(len, r, r, 16));
    const ry = (Math.acos(d[2] / len) * 180) / Math.PI,
      rz = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
    return this.move(this.rotate(s, [0, ry, rz]), a);
  }
  path(points: Vec3[], r = 2.5) {
    points = points.filter(
      (p, i) =>
        i === 0 || Math.hypot(...p.map((v, k) => v - points[i - 1][k])) > 1e-6,
    );
    const solids = points.slice(1).map((b, i) => this.rod(points[i], b, r));
    for (const p of points.slice(1, -1))
      solids.push(this.move(this.keep(this.api.Manifold.sphere(r, 12)), p));
    return this.union(solids);
  }
  add(name: string, solid: Manifold, role: SolidPart["role"] = "frame") {
    const polished = ["rod", "sleeve", "handle"].includes(role);
    this.parts.push({
      name,
      solid,
      role,
      color:
        role === "liner"
          ? "#17191b"
          : polished
            ? "#d6dce0"
            : role === "source"
              ? "#34363a"
              : "#26342c",
      metalness: polished ? 1 : role === "liner" ? 0 : 0.5,
      roughness: polished ? 0.19 : 0.55,
    });
  }
  bolt(
    name: string,
    p: Vec3,
    diameter: number,
    length = 100,
    axis: "x" | "y" | "z" = "x",
  ) {
    const k = axis === "x" ? 0 : axis === "y" ? 1 : 2,
      at = (n: number) => p.map((v, i) => v + (i === k ? n : 0)) as Vec3;
    this.add(
      name,
      this.union([
        this.cylinder(length, diameter / 2, axis, p),
        this.cylinder(9, diameter * 0.85, axis, at(-length / 2), 6),
        this.ring(
          10,
          diameter * 0.85,
          diameter / 2 + 0.2,
          axis,
          at(length / 2 - 4),
        ),
        this.ring(3, diameter, diameter / 2 + 0.3, axis, at(length / 2 - 11)),
        this.ring(3, diameter, diameter / 2 + 0.3, axis, at(-length / 2 + 6)),
      ]),
      "fastener",
    );
  }
  pulley(name: string, p: Vec3, r = 45, axis: "x" | "y" = "x") {
    const k = axis === "x" ? 0 : 1,
      at = (n: number) => p.map((v, i) => v + (i === k ? n : 0)) as Vec3;
    const wheel = this.union([
      this.cylinder(12, r - 3, axis, p),
      this.cylinder(2, r, axis, at(-7)),
      this.cylinder(2, r, axis, at(7)),
      this.cylinder(24, 12, axis, p),
    ]);
    const cuts = [this.cylinder(30, 5.1, axis, p)];
    for (let j = 0; j < 6; j++) {
      const t = (j * Math.PI) / 3;
      const q = [...p] as Vec3;
      q[axis === "x" ? 1 : 0] += Math.cos(t) * r * 0.59;
      q[2] += Math.sin(t) * r * 0.59;
      cuts.push(this.cylinder(20, 7, axis, q));
    }
    this.add(
      `${name} grooved six-spoke wheel`,
      this.cut(wheel, cuts),
      "source",
    );
    for (const d of [-1, 1]) {
      const center = at(d * 17),
        shell = this.ring(4, r + 7, r - 1, axis, center);
      const tie =
        axis === "x"
          ? this.box([4, 22, 2 * r + 8], center)
          : this.box([22, 4, 2 * r + 8], center);
      this.add(
        `${name} cheek ${d}`,
        this.cut(this.union([shell, tie]), [
          this.cylinder(8, 5.5, axis, center),
        ]),
      );
    }
    this.bolt(`${name} axle`, p, 10, 46, axis);
  }
  handle(name: string, p: Vec3) {
    const [x, y, z] = p;
    this.add(
      `${name} D frame`,
      this.path(
        [
          [x - 65, y, z - 85],
          [x - 70, y, z - 30],
          [x, y, z],
          [x + 70, y, z - 30],
          [x + 65, y, z - 85],
        ],
        6,
      ),
      "handle",
    );
    this.add(
      `${name} grip`,
      this.cylinder(130, 15, "x", [x, y, z - 85]),
      "liner",
    );
    this.add(
      `${name} connector`,
      this.ring(8, 12, 7, "y", [x, y, z + 8]),
      "handle",
    );
  }
}
