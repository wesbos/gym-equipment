import type { ManifoldAPI, UprightParams, UprightMesh, Manifold } from './types.ts';
export const defaults = { height: 80, width: 75, wall: 3, radius: 6, diameter: 25, spacing: 50, offset: 50 };

// All geometry is in millimetres; the height control is in inches.
export function buildUpright(api: ManifoldAPI, params: Partial<UprightParams>): UprightMesh {
  const p = { ...defaults, ...params };
  if (Object.values(p).some(v => !Number.isFinite(v))) throw new Error('Enter a number in every dimension field.');
  const h = p.height * 25.4;
  if (h < 100 || h > 4000 || p.width < 30 || p.width > 150) throw new Error('Height must be 4–157 inches and tubing 30–150 mm.');
  if (p.wall < 1 || p.wall >= p.width / 2) throw new Error('Wall thickness must be at least 1 mm and less than half the tubing width.');
  if (p.radius < 0 || p.radius >= p.width / 2) throw new Error('Corner radius must be nonnegative and less than half the tubing width.');
  if (p.diameter < 2 || p.diameter >= p.width - 2 * Math.max(p.radius, p.wall)) throw new Error('Holes must fit within the flat face of the tubing.');
  if (p.spacing <= p.diameter || p.offset <= p.diameter / 2 || p.offset > h - p.diameter / 2) throw new Error('Hole spacing must exceed diameter; the first hole must fit inside the upright.');
  const { CrossSection, Manifold } = api;
  const allocated: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(obj: T): T => (allocated.push(obj), obj);
  const roundedSquare = (width: number, radius: number) => {
    const square = keep(CrossSection.square(width - radius * 2, true));
    return radius ? keep(square.offset(radius, 'Round', 2, 32)) : square;
  };
  try {
    const outside = roundedSquare(p.width, p.radius);
    const inside = roundedSquare(p.width - 2 * p.wall, Math.max(0, p.radius - p.wall));
    const profile = keep(outside.subtract(inside));
    const tube = keep(profile.extrude(h));
    const cutter = keep(Manifold.cylinder(p.width + 4, p.diameter / 2, p.diameter / 2, 48, true));
    const x = keep(cutter.rotate([0, 90, 0]));
    const y = keep(cutter.rotate([90, 0, 0]));
    const holes: Manifold[] = [];
    const centers: number[] = [];
    for (let z = p.offset; z < h - p.diameter / 2; z += p.spacing) {
      centers.push(z);
      holes.push(keep(x.translate([0, 0, z])), keep(y.translate([0, 0, z])));
    }
    const solid = keep(Manifold.difference([tube, ...holes]));
    if (solid.status() !== 'NoError') throw new Error(`Geometry error: ${solid.status()}`);
    const mesh = solid.getMesh();
    return { positions: new Float32Array(mesh.vertProperties), indices: new Uint32Array(mesh.triVerts), stride: mesh.numProp, height: h, centers, volume: solid.volume(), params: p };
  } finally { allocated.reverse().forEach(obj => obj.delete()); }
}
