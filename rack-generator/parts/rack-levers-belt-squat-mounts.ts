/** Builders for the Rogue Velocidor and Get RXd RX3 Center Post (#135; metadata in ../rack-parts/rack-levers-belt-squat-mounts.ts).
 * Source frame (rack-part.ts): origin on the upright centreline at the target hole, +Y out of the mounting face, Z up. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { buildKit, CHROME, type Finish } from './rack-levers-belt-squat-kit.ts';
import { GETRXD_RX3_CENTER_POST, ROGUE_VELOCIDOR, RX3_POST, rx3Layout, VELOCIDOR, velocidorLayout, velocidorSeries } from '../rack-parts/rack-levers-belt-squat-mounts.ts';
const TEXTURE_BLACK: Finish = { color: '#1c1d1f', metalness: .3, roughness: .8 };
const CAP: Finish = { color: '#121213', metalness: 0, roughness: .6, role: 'liner' };

// ================================================================ Rogue Velocidor
export function buildVelocidor(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_VELOCIDOR.defaults, ...params }, V = VELOCIDOR, L = velocidorLayout(p), f = L.f, pr = velocidorSeries(p).pin / 2;
  if (![0, 1].includes(p.finish)) throw Error('Unsupported Velocidor finish.');
  return buildKit(api, g => {
    const t = V.plate, xi = f + 1.5, top = V.top, bottom = V.top - V.bracketDrop, back = L.barY(xi) - V.tube / 2;
    // Bracket: side plates wrap the post and run forward as the triangular knee gussets; front plate on the mounting face.
    const side: Vec2[] = [[-f - 2, bottom + 40], [-f - 2, top], [back + 2, top], [back + 2, L.zc - V.tube / 2], [f + 26, bottom], [f + 2, bottom]];
    for (const x0 of [xi, -xi - t]) g.add('Bracket side gusset', g.plateYZ([...side].reverse(), x0, t), TEXTURE_BLACK);
    g.add('Bracket front plate', g.box([-xi, f + .5, bottom], [xi, f + .5 + t, top]), TEXTURE_BLACK);
    g.add('UHMW bracket liner', g.box([-xi + 3, f - .5, bottom + 8], [xi - 3, f + .5, top - 8]), { color: '#151515', metalness: 0, roughness: .6, role: 'liner' });
    // Top plate from the bracket to the crossbar, flush with its top.
    g.add('Top plate', g.k(g.k(g.k(new g.C([[[-xi - t, f], [xi + t, f], [120, L.barY(120) - 10], [-120, L.barY(120) - 10]]])).extrude(t)).translate([0, 0, top - t])), TEXTURE_BLACK);
    // Chevron crossbar: two 3x3 7 ga halves swept back 7° from the centre seam, capped with moulded ROGUE end caps.
    const halves = [-1, 1].map(s => {
      const len = V.width / 2 / Math.cos(V.chevron * Math.PI / 180), bar = g.box([0, -V.tube / 2, -V.tube / 2], [len, V.tube / 2, V.tube / 2]);
      return g.k(g.k(bar.rotate([0, 0, s > 0 ? -V.chevron : 180 + V.chevron])).translate([0, L.apexY, L.zc]));
    });
    g.add('3x3 7 ga chevron crossbar', g.k(g.union(halves).intersect(g.box([-V.width / 2 + 6, L.barY(V.width / 2) - V.tube, L.zc - V.tube / 2], [V.width / 2 - 6, L.apexY + V.tube, L.zc + V.tube / 2]))), TEXTURE_BLACK);
    for (const s of [-1, 1]) g.add('ROGUE crossbar end cap', g.k(g.k(g.box([-6, -V.tube / 2 - 1.5, -V.tube / 2 - 1.5], [0, V.tube / 2 + 1.5, V.tube / 2 + 1.5]).rotate([0, 0, s > 0 ? -V.chevron : V.chevron])).translate([s * V.width / 2 + (s > 0 ? 0 : 6), L.barY(V.width / 2), L.zc])), CAP);
    // Stainless socket guard plates on the front faces, with the three bores and the clocking holes.
    for (const s of [-1, 1]) {
      const [gw, gh] = V.guard, cx = s * (V.sockets[0] + V.sockets[2]) / 4, guard = g.box([-gw / 2, 0, -gh / 2], [gw / 2, 1.6, gh / 2]);
      const bores = V.sockets.flatMap(d => { const x = s * d / 2 - cx; return [g.rod([x, -1, 0], [x, 3, 0], 16, 0, 0, 20), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => g.rod([x + a * 20, -1, b * 20], [x + a * 20, 3, b * 20], 5, 0, 0, 10))]; });
      const plate = g.cut(guard, bores);
      g.add('Stainless socket guard', g.k(g.k(plate.rotate([0, 0, -s * V.chevron])).translate([cx, L.barY(Math.abs(cx)) + V.tube / 2, L.zc])), { color: '#b9bdc0', metalness: .85, roughness: .35 });
    }
    // Detent pin through the side plates and the post (black ring pull), just below the top.
    g.add('Detent pin', g.rod([-xi - t - 14, 0, 0], [xi + t + 30, 0, 0], pr, 1, 1, 24), { color: '#202123', metalness: .5, roughness: .5 });
    g.add('Pin ring pull', g.ring([xi + t + 44, 0, 0], [0, 1, 0], 14, 3, 24), { color: '#141416', metalness: .4, roughness: .5 });
    // Handles: 2.25 in collar, 1.9 in texture-black tube (knurl break rings on the knurled version), ROGUE end cap, knurled knob behind.
    const grip: Finish = p.finish ? { color: '#26272a', metalness: .35, roughness: .9 } : TEXTURE_BLACK;
    for (const h of L.handles) {
      const at = (d: number): Vec3 => h.start.map((v, i) => v + h.dir[i] * d) as Vec3, len = V.collarLength + V.usable;
      g.add('Handle collar', g.rod(at(0), at(V.collarLength), V.collar / 2, 1, 1.5, 40), TEXTURE_BLACK);
      g.add(p.finish ? 'Knurled 1.9 in handle' : 'Smooth 1.9 in handle', g.rod(at(V.collarLength - 1), at(len - 4), V.handle / 2, 0, 0, 40), grip);
      if (p.finish) g.add('Knurl break rings', g.union([1, 2, 3].map(i => g.ring(at(V.collarLength + i * inch(4)), h.dir, V.handle / 2 - .6, 1.1, 40))), { color: '#101011', metalness: .2, roughness: .6 });
      g.add('ROGUE handle end cap', g.rod(at(len - 4), at(len), V.handle / 2 + .5, 0, 2, 40), CAP);
      const back2 = [h.start[0], L.barY(Math.abs(h.start[0])) - V.tube / 2, h.start[2]] as Vec3;
      g.add('Monster Knurled Knob', g.rod([back2[0], back2[1] - 20, back2[2]], [back2[0], back2[1], back2[2]], 27, 1, 1, 32), { color: '#232427', metalness: .6, roughness: .5 });
    }
  });
}
const inch = (v: number) => v * 25.4;

// ================================================================ Get RXd RX3 Center Post
export function buildRx3CenterPost(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...GETRXD_RX3_CENTER_POST.defaults, ...params }, R = RX3_POST, L = rx3Layout(p), f = L.f, pitch = p.mountSpacing ?? 50, h = R.tube / 2;
  return buildKit(api, g => {
    const paint: Finish = { color: '#18191b', metalness: .3, roughness: .75 }, hr = R.holeDiameter / 2;
    // Mount plate on the face with the two chrome pins and knurled nuts behind the post.
    g.add('Mount plate', g.plateXZ(g.roundRect(R.plateWidth, R.plateHeight, 8, 0, L.z), f, R.plate), paint);
    for (const z of [0, -2 * pitch]) {
      g.add('1 in chrome pin', g.rod([0, -f - R.knobThick - 8, z], [0, f + R.plate + 14, z], 12.4, 1, 3, 32), CHROME);
      g.add('Knurled nut', g.rod([0, -f - R.knobThick, z], [0, -f, z], R.knob / 2, 1.5, 1.5, 36), CHROME);
      g.add('Pin head', g.rod([0, f + R.plate, z], [0, f + R.plate + 10, z], 16, 0, 1.5, 32), CHROME);
    }
    // Trapezoid gussets flare from the arm to the full plate height, laser-cut logo plate on the outside.
    const y0 = L.y0, gy = y0 + R.gusset;
    for (const x0 of [h, -h - 6]) g.add('Flared gusset', g.plateYZ([[y0, L.z - R.plateHeight / 2], [gy, L.z - h], [gy, L.z + h], [y0, L.z + R.plateHeight / 2]], x0, 6), paint);
    g.add('Laser-cut logo plate', g.plateYZ([[y0 + 6, L.z - R.plateHeight / 2 + 14], [gy - 6, L.z - h + 4], [gy - 6, L.z + h - 4], [y0 + 6, L.z + R.plateHeight / 2 - 14]], h + 6, 1.2), { color: '#e6e7e8', metalness: .7, roughness: .3 });
    // L-shaped 3x3 11 ga post: arm out from the plate, mitred into the centre leg; offset 1 in holes on all sides.
    const armHoles = Array.from({ length: 7 }, (_, i) => gy + 40 + i * R.holeStep);
    const arm = g.cut(g.box([-h, y0, L.z - h], [h, L.legY + h, L.z + h]), [
      g.box([-h + R.wall, y0 - 1, L.z - h + R.wall], [h - R.wall, L.legY + h - R.wall, L.z + h - R.wall]),
      ...armHoles.map(y => g.rod([0, y, L.z - h - 1], [0, y, L.z + h + 1], hr, 0, 0, 20)),
      ...armHoles.map(y => g.rod([-h - 1, y + R.holeStep / 2, L.z], [h + 1, y + R.holeStep / 2, L.z], hr, 0, 0, 20)),
    ]);
    const legTop = L.z - h, legHoles = Array.from({ length: 6 }, (_, i) => legTop - 30 - i * R.holeStep);
    const leg = g.cut(g.box([-h, L.legY - h, L.bottom], [h, L.legY + h, legTop + 1]), [
      g.box([-h + R.wall, L.legY - h + R.wall, L.bottom + R.wall], [h - R.wall, L.legY + h - R.wall, legTop + 2]),
      ...legHoles.map(z => g.rod([-h - 1, L.legY, z], [h + 1, L.legY, z], hr, 0, 0, 20)),
      ...legHoles.map(z => g.rod([0, L.legY - h - 1, z - R.holeStep / 2], [0, L.legY + h + 1, z - R.holeStep / 2], hr, 0, 0, 20)),
    ]);
    g.add('3x3 11 ga center post', g.union([arm, leg]), paint);
    g.add('Post end cap', g.box([-h + 1, L.legY - h + 1, L.bottom - 2], [h - 1, L.legY + h - 1, L.bottom + 1]), CAP);
  });
}
