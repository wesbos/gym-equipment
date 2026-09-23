import type { ManifoldAPI, NumericParams, SolidPart } from '../types.ts';
import { CAMPBELL as C, OAK_CLUB_CAMPBELL, campbellLayout } from '../rack-parts/oak-club-campbell.ts';
import { buildKit, POWDER_BLACK, STAINLESS, UHMW, type Finish } from './rack-levers-belt-squat-kit.ts';

export function buildCampbell(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...OAK_CLUB_CAMPBELL.defaults, ...params }, L = campbellLayout(p);
  if (![0, 1].includes(p.hand) || ![0, 1].includes(p.color)) throw Error('Unsupported Campbell handle option.');
  const paint: Finish = p.color ? { color: '#b73572', metalness: .25, roughness: .6 } : POWDER_BLACK;
  return buildKit(api, g => {
    const { f, w, outer, r, elbow, tip, hand } = L, h = C.height / 2, web = w + C.liner;
    // U bracket: two parallel cheeks, open at -X, with the club web at +X.
    // The pin enters the far cheek and seats in the handle's hollow root.
    const outline = g.roundRect(web + C.plate + w, C.height, C.corner, (web + C.plate - w) / 2);
    const pinBore = g.rod([0, -outer - 1, 0], [0, outer + 1, 0], 13, 0, 0, 48);
    const screws = [-1, 1].flatMap(side => [-36, 36].map(z => g.rod([0, side * (f + C.liner - 1), z], [0, side * (outer + 1), z], 4, 0, 0, 20)));
    const cheeks = [g.plateXZ(outline, f + C.liner, C.plate), g.plateXZ(outline, -outer, C.plate)];
    const webPlate = g.plateYZ(g.roundRect(outer * 2, C.height, 2), web, C.plate);
    // Laser-cut capsule around a bridged club, backed by a cream insert.
    const capsule = g.plateYZ(g.roundRect(38, 57, 19), web - 1, C.plate + 2);
    const club = g.union([
      ...[[0, 10], [-9, -1], [9, -1]].map(([y, z]) => g.rod([web - 2, y, z], [web + C.plate + 2, y, z], 9, 0, 0, 32)),
      g.plateYZ([[-3, -14], [-7, -21], [7, -21], [3, -14], [2, -4], [-2, -4]], web - 2, C.plate + 4),
      g.box([web - 2, -1.8, -h], [web + C.plate + 2, 1.8, h]),
    ]);
    const webScrews = [-36, 36].map(z => g.rod([web - 1, 0, z], [web + C.plate + 1, 0, z], 4, 0, 0, 20));
    g.add('Quarter-inch welded U bracket with club cutout', g.union([
      g.cut(g.union(cheeks), [pinBore, ...screws]), g.cut(webPlate, [g.cut(capsule, [club]), ...webScrews]),
    ]), paint);
    g.add('Cream club backing', g.plateYZ(g.roundRect(43, 62, 20), web - 1, 1), { color: '#eee7d7', metalness: .15, roughness: .6 });
    g.add('Quarter-inch UHMW cheek liners', g.cut(g.union([
      g.plateXZ(outline, f, C.liner), g.plateXZ(outline, -f - C.liner, C.liner),
    ]), [pinBore, ...screws, g.box([w, -outer - 1, -h - 1], [web + C.plate + 1, outer + 1, h + 1])]), UHMW);
    g.add('Quarter-inch UHMW web liner', g.cut(g.box([w, -f - C.liner, -h], [web, f + C.liner, h]),
      [g.plateYZ(g.roundRect(43, 62, 20), web - 1, 1.1)]), UHMW);
    // Shared miter rings form one hollow L tube. Tangent cylinder/sphere unions
    // leave seam slivers that collapse in Float32 meshes and print exports.
    const sides = 48, vertices: number[] = [], triangles: number[] = [];
    for (const radius of [r, 13]) for (let ring = 0; ring < 3; ring++) for (let j = 0; j < sides; j++) {
      const angle = 2 * Math.PI * j / sides, x = radius * Math.cos(angle), q = radius * Math.sin(angle);
      vertices.push(x, ring === 0 ? outer : elbow + q, ring === 2 ? tip - 7 : -q);
    }
    for (let ring = 0; ring < 2; ring++) for (let j = 0; j < sides; j++) {
      const a = ring * sides + j, b = ring * sides + (j + 1) % sides, c = a + sides, d = b + sides, inner = 3 * sides;
      triangles.push(a, b, d, a, d, c, a + inner, d + inner, b + inner, a + inner, c + inner, d + inner);
    }
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides, inner = 3 * sides, end = 2 * sides;
      triangles.push(j, j + inner, k + inner, j, k + inner, k,
        end + j, end + k, end + k + inner, end + j, end + k + inner, end + j + inner);
    }
    const grip = g.k(new api.Manifold(new api.Mesh({ numProp: 3,
      vertProperties: new Float32Array(vertices), triVerts: new Uint32Array(triangles) })));
    g.add('32 mm welded L grip', grip, paint);
    g.add('Machined steel grip end cap', g.rod([0, elbow, tip - 7], [0, elbow, tip], r, 0, 2.5, 48), paint);
    g.add('Handle root weld', g.ring([0, outer + 1.2, 0], [0, 1, 0], r, 2.2, 48), paint);
    // Model the separately sold magnetic pin in its installed position. It passes
    // through the rack and the opposite cheek into the hollow grip, not through the logo.
    g.add('One-inch stainless mounting pin', g.rod([0, -outer - 1, 0], [0, outer + 18, 0], 12.4, 0, 2, 48), STAINLESS);
    g.add('MagPin magnetic head', g.rod([0, -outer - 19, 0], [0, -outer, 0], 19, 1.5, .8, 64), STAINLESS);
    const fasteners = [-36, 36].flatMap(z => [
      g.rod([0, outer - 2, z], [0, outer + .1, z], 4, 0, .8, 24),
      g.rod([0, -outer - .1, z], [0, -outer + 2, z], 4, .8, 0, 24),
      g.rod([web + C.plate - 2, 0, z], [web + C.plate + .1, 0, z], 4, 0, .8, 24),
    ]);
    g.add('Black flat-head liner screws', g.union(fasteners), POWDER_BLACK);
    if (hand < 0) g.transformAll(s => g.k(s.mirror([1, 0, 0])));
  });
}
