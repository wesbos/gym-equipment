import type { Manifold } from 'manifold-3d';
export interface PrintMesh { vertices: number[]; indices: number[]; volume: number }
/** Honor Manifold's explicit topology welds, not coincident-position guessing. */
export function printableMesh(solid: Manifold, name: string): PrintMesh {
  if (solid.status() !== 'NoError' || solid.isEmpty() || !(solid.volume() > 0))
    throw Error(`${name}: not a nonempty positive-volume Manifold solid.`);
  const mesh = solid.getMesh(), count = mesh.vertProperties.length / mesh.numProp;
  const parent = Array.from({ length: count }, (_, i) => i);
  const root = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  for (let i = 0; i < mesh.mergeFromVert.length; i++) parent[root(mesh.mergeFromVert[i])] = root(mesh.mergeToVert[i]);
  const remap = new Map<number, number>(), vertices: number[] = [], indices: number[] = [];
  for (const index of mesh.triVerts) {
    if (index >= count) throw Error(`${name}: invalid vertex index.`);
    const canonical = root(index);
    let target = remap.get(canonical);
    if (target === undefined) {
      target = remap.size; remap.set(canonical, target);
      for (let k = 0; k < 3; k++) {
        const value = mesh.vertProperties[canonical * mesh.numProp + k];
        if (!Number.isFinite(value)) throw Error(`${name}: nonfinite vertex.`);
        vertices.push(value);
      }
    }
    indices.push(target);
  }
  const edges = new Map<string, { count: number; direction: number }>();
  for (let i = 0; i < indices.length; i += 3) {
    const tri = indices.slice(i, i + 3);
    if (new Set(tri).size !== 3) throw Error(`${name}: degenerate triangle.`);
    const [a,b,c] = tri.map(v => vertices.slice(v*3,v*3+3));
    const u = b.map((v,k)=>v-a[k]), v = c.map((n,k)=>n-a[k]);
    if (Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]) === 0)
      throw Error(`${name}: zero-area triangle.`);
    for (let k = 0; k < 3; k++) {
      const a = tri[k], b = tri[(k+1)%3], key = `${Math.min(a,b)}:${Math.max(a,b)}`;
      const edge = edges.get(key) ?? { count: 0, direction: 0 };
      edge.count++; edge.direction += a < b ? 1 : -1; edges.set(key, edge);
    }
  }
  if ([...edges.values()].some(e => e.count !== 2 || e.direction !== 0))
    throw Error(`${name}: exported triangle topology is not closed and consistently wound.`);
  return { vertices, indices, volume: solid.volume() };
}
