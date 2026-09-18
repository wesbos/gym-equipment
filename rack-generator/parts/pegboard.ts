import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { PEGBOARD, PEGBOARD_DEPTH, PEGBOARD_HEIGHT, PEGBOARD_PITCH, PEGBOARD_WIDTHS } from '../wall-parts/pegboard.ts';
import { wallDefinition } from '../wall-part.ts';
/** 1″ hole grid, symmetric about the face centre: columns on whole inches (a centre column), rows on half inches. */
export function pegboardHoles(width: number, height = PEGBOARD_HEIGHT, pitch = PEGBOARD_PITCH, margin = 12.7) {
  const columns: number[] = [], rows: number[] = [];
  for (let i = -Math.floor((width / 2 - margin) / pitch); i * pitch <= width / 2 - margin; i++) columns.push(i * pitch);
  for (let k = -Math.floor((height / 2 - margin) / pitch + .5); (k + .5) * pitch <= height / 2 - margin; k++) rows.push((k + .5) * pitch);
  return { columns, rows };
}
/** Source axes: X along the wall, -Y out of the wall, Z up; origin at the face centre on the wall surface. */
export function buildPegboard(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!(PEGBOARD_WIDTHS as readonly number[]).includes(p.width)) throw Error('Unsupported panel size.');
  const { Manifold: M } = api, owned: Manifold[] = [], k = (s: Manifold) => (owned.push(s), s);
  const w = p.width, h = PEGBOARD_HEIGHT, d = PEGBOARD_DEPTH, t = 1.5;
  const box = (x: number, y: number, z: number, at: [number, number, number]) => k(k(M.cube([x, y, z], true)).translate(at));
  let success = false; const out: SolidPart[] = [];
  try {
    const { columns, rows } = pegboardHoles(w, h);
    const hole = k(k(M.cylinder(t + 2, 3.175, 3.175, 12, true)).rotate([90, 0, 0]));
    const holes = k(M.compose(columns.flatMap(x => rows.map(z => k(hole.translate([x, -d + t / 2, z]))))));
    const face = k(box(w, t, h, [0, -d + t / 2, 0]).subtract(holes));
    // Folded 3/4″ returns on all four edges, with rear mounting lips against the wall.
    const returns = [box(t, d, h, [-w / 2 + t / 2, -d / 2, 0]), box(t, d, h, [w / 2 - t / 2, -d / 2, 0]), box(w, d, t, [0, -d / 2, h / 2 - t / 2]), box(w, d, t, [0, -d / 2, -h / 2 + t / 2])];
    const lips = [box(w - 2 * t, t, 12, [0, -t / 2, h / 2 - t - 6]), box(w - 2 * t, t, 12, [0, -t / 2, -h / 2 + t + 6])];
    out.push({ name: 'Powder-coated steel pegboard', solid: k(M.union([face, ...returns, ...lips])), role: 'source', color: '#2b2d2f', metalness: .35, roughness: .5 });
    for (const part of out) if (part.solid.isEmpty() || part.solid.status() !== 'NoError') throw Error(`Invalid pegboard ${part.name}`);
    success = true; return out;
  } finally { const keep = new Set(success ? out.map(p => p.solid) : []); for (const s of owned.reverse()) if (!keep.has(s)) s.delete(); }
}
export const definitions: PartDefinition[] = [wallDefinition(PEGBOARD, buildPegboard)];
