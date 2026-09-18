import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { ROWERG, ROWERG_SPECS } from '../floor-parts/rowerg.ts';
import { floorDefinition, validateFloorParams } from '../floor-part.ts';
type Mat = readonly [SolidPart['role'], string, number, number];
const M_ = {
  frame: ['source', '#1c1d1f', .2, .5], steel: ['source', '#18191b', .1, .62], alu: ['source', '#2a2c2f', .6, .34],
  stainless: ['source', '#c7cacd', .9, .22], carriage: ['source', '#9ca1a6', .8, .3], plastic: ['liner', '#141517', 0, .72],
  mesh: ['source', '#4b4f54', .35, .55], seat: ['liner', '#4a4e53', 0, .8], foot: ['liner', '#3b3f44', 0, .75],
  strap: ['liner', '#202123', 0, .9], grip: ['handle', '#2c3d56', 0, .7], chain: ['source', '#b9bdc1', .9, .3],
  lime: ['source', '#c5d52b', 0, .5], screen: ['source', '#8b9b8f', 0, .35], rubber: ['liner', '#111213', 0, .92],
  hw: ['fastener', '#3a3c3f', .85, .25],
} as const satisfies Record<string, Mat>;
/** In-use layout (mm, lift 0): flywheel centre, monitor-arm pivot, beam rise and the monorail/front-frame seam. */
export const ROWERG_LAYOUT = { flywheel: [145, 968, 658] as Vec3, radius: 200, pivot: [0, 721, 790] as Vec3, seam: 150, rise: 28, seatY: [-470, -1010] };
/** Separated storage (per legs): front section tipped onto its wheels about X (degrees) and the monorail's X beside the frame. */
const STORAGE = [{ front: -82, railX: -95 }, { front: -74, railX: -95 }] as const;
/** Source axes: X across (+X rower's right, the flywheel side), +Y toward the flywheel, Z up; origin at footprint centre. */
export function buildRowErg(api: ManifoldAPI, input: NumericParams): SolidPart[] {
  const p = validateFloorParams(ROWERG, input), tall = p.legs === 1, storage = p.pose === 1, L = tall ? ROWERG_SPECS.seatHeight[1] - ROWERG_SPECS.seatHeight[0] : 0;
  const { Manifold: M, CrossSection: C } = api, owned: (Manifold | CrossSection)[] = [], out: SolidPart[] = [];
  const k = <T extends Manifold | CrossSection>(s: T): T => (owned.push(s), s);
  const box = (size: Vec3, at: Vec3) => k(k(M.cube(size, true)).translate(at));
  const span = (min: Vec3, max: Vec3) => box([max[0] - min[0], max[1] - min[1], max[2] - min[2]], [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]);
  const cut = (s: Manifold, holes: Manifold[]) => k(M.difference([s, ...holes]));
  const union = (s: Manifold[]) => k(M.union(s));
  const cylX = (x0: number, x1: number, y: number, z: number, d: number, n = 48) => k(k(k(M.cylinder(x1 - x0, d / 2, d / 2, n)).rotate([0, 90, 0])).translate([x0, y, z]));
  const cylY = (x: number, y0: number, y1: number, z: number, d: number, n = 24) => k(k(k(M.cylinder(y1 - y0, d / 2, d / 2, n)).rotate([-90, 0, 0])).translate([x, y0, z]));
  /** Straight member in a Y–Z plane: `wx` across X, `t` thick in-plane. */
  const bar = (a: [number, number], b: [number, number], wx: number, t: number, x = 0) => {
    const dy = b[0] - a[0], dz = b[1] - a[1];
    return k(k(box([wx, Math.hypot(dy, dz), t], [0, 0, 0]).rotate([Math.atan2(dz, dy) * 180 / Math.PI, 0, 0])).translate([x, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2]));
  };
  const rod = (a: Vec3, b: Vec3, d: number, n = 20) => {
    const v = b.map((x, i) => x - a[i]), len = Math.hypot(...v);
    return k(k(k(M.cylinder(len, d / 2, d / 2, n)).rotate([0, Math.acos(v[2] / len) * 180 / Math.PI, Math.atan2(v[1], v[0]) * 180 / Math.PI])).translate(a));
  };
  const rounded = (w: number, l: number, h: number, r: number, at: Vec3) => k(k(k(k(C.square([w - 2 * r, l - 2 * r], true)).offset(r, 'Round', 2, 24)).extrude(h)).translate(at));
  /** Y–Z outline extruded `t` across X, centred on `x`. */
  const profile = (pts: [number, number][], t: number, x = 0) => k(k(k(k(new C([pts])).extrude(t)).rotate([90, 0, 90])).translate([x - t / 2, 0, 0]));
  const parts = new Map<string, { group: 'rail' | 'front'; mat: Mat; pieces: Manifold[] }>();
  const add = (group: 'rail' | 'front', name: string, mat: Mat, ...pieces: Manifold[]) => { const e = parts.get(name) ?? { group, mat, pieces: [] }; e.pieces.push(...pieces); parts.set(name, e); };
  let success = false;
  try {
    const { seam, rise } = ROWERG_LAYOUT, tan = Math.tan(rise * Math.PI / 180), [hx, hy, hz0] = ROWERG_LAYOUT.flywheel, hz = hz0 + L, R = ROWERG_LAYOUT.radius;
    const railBottom = 190 + L, railTop = 290 + L, rear = -ROWERG_SPECS.length / 2;
    // ── Monorail section: black aluminium beam, stainless seat track, rear legs and the seat on its roller carriage.
    add('rail', 'Monorail · aluminium beam', M_.frame, span([-38, rear + 6, railBottom], [38, seam - 2, railTop - 4]));
    add('rail', 'Monorail stainless seat track', M_.stainless, span([-31, rear + 14, railTop - 4], [31, seam - 10, railTop]));
    add('rail', 'Rear feet, end cap and seat stop', M_.rubber, span([-40, rear, railBottom - 2], [40, rear + 6, railTop + 2]), span([-25, rear + 14, railTop], [25, rear + 34, railTop + 18]));
    const seatY = ROWERG_LAYOUT.seatY[storage ? 1 : 0], deck = railTop + 32;
    add('rail', 'Seat carriage and rollers', M_.carriage, span([-50, seatY - 115, deck], [50, seatY + 115, deck + 8]),
      ...[-1, 1].flatMap(s => [span([s * 42 - 2, seatY - 100, railBottom + 70], [s * 42 + 2, seatY + 100, deck]), ...[-80, 80].map(dy => cylX(s > 0 ? 8 : -28, s > 0 ? 28 : -8, seatY + dy, railTop + 16, 32, 24))]));
    add('rail', 'Seat · molded', M_.seat, cut(rounded(350, 280, 48, 60, [0, seatY, deck + 8]), [k(k(k(M.sphere(1, 64)).scale([150, 112, 30])).translate([0, seatY - 8, 356 + L + 30]))]),
      cut(rounded(120, 40, 70, 18, [0, seatY + 125, deck + 8]), [k(k(k(M.sphere(1, 32)).scale([90, 80, 30])).translate([0, seatY + 100, 356 + L + 50]))]));
    if (!tall) {
      add('rail', 'Rear legs · steel', M_.steel, bar([rear + 30, railBottom + 4], [rear + 36, 44], 60, 40), bar([rear + 130, railBottom + 4], [rear + 60, 44], 50, 20), span([-210, rear + 4, 8], [210, rear + 64, 48]));
    } else {
      const outer: [number, number][] = [[rear + 4, 44], [rear + 170, 44], [rear + 120, railBottom + 2], [rear + 8, railBottom + 2]];
      const hole: [number, number][] = [[rear + 44, 90], [rear + 128, 90], [rear + 98, railBottom - 40], [rear + 44, railBottom - 40]];
      add('rail', 'Rear legs · steel', M_.steel, cut(profile(outer, 60), [profile(hole, 70)]), span([-210, rear + 4, 8], [210, rear + 70, 48]));
    }
    add('rail', 'Rear feet, end cap and seat stop', M_.rubber, ...[-1, 1].map(s => span([s * 180 - 32, rear + 2, 0], [s * 180 + 32, rear + 66, 8])));
    // ── Front section: angled front frame from the frame-lock seam up to the flywheel axle, monitor tower, footrests.
    const zc = (y: number) => 250 + L + (y - 200) * tan, beamTop = (y: number) => zc(y) + 55 / Math.cos(rise * Math.PI / 180);
    const stub = span([-38, seam + 2, railBottom], [38, seam + 110, railTop]);
    add('front', 'Front frame', M_.frame, k(M.hull([stub, bar([200, zc(200)], [930, zc(930)], 76, 110)])), span([-38, 880, hz - 80], [38, 1040, hz + 80]),
      cut(span([-35, 690, beamTop(690) - 30], [35, 752, 800 + L]), [span([-22, 680, beamTop(752) + 10], [22, 762, 775 + L])]),
      span([-28, seam - 40, railBottom - 28], [28, seam + 60, railBottom]), span([-6, 318, beamTop(330) - 8], [6, 342, 442 + L]), span([-6, 312, 430 + L], [6, 322, 452 + L]));
    add('front', 'Handle peg', M_.plastic, cylY(0, 660, 690, 700 + L, 18));
    // Footrests: 52° flexfoot plates either side of the frame with heel cups, straps and the pivot tube.
    const foot = (x: number) => {
      const plate = union([rounded(140, 300, 14, 18, [0, 150, 0]), span([-70, 0, 0], [70, 18, 62]), ...[-1, 1].map(s => span([s * 70 - 5, 0, 0], [s * 70 + 5, 220, 46]))]);
      return k(k(plate.rotate([52, 0, 0])).translate([x, 30, 150 + L]));
    };
    const strap = (x: number) => k(k(union([span([-76, 190, 38], [76, 235, 44]), ...[-1, 1].map(s => span([s * 76 - 4, 190, 0], [s * 76 + 4, 235, 44]))]).rotate([52, 0, 0])).translate([x, 30, 150 + L]));
    add('front', 'Footrests', M_.foot, foot(-118), foot(118));
    add('front', 'Foot straps', M_.strap, strap(-118), strap(118));
    add('front', 'Front frame', M_.frame, cylX(-190, 190, 170, 236 + L, 25), ...[-1, 1].map(s => bar([170, 236 + L], [143, 272 + L], 26, 12, s * 118)));
    // Flywheel housing offset to the rower's right: inner shell, intake mesh band, outer spiral-vent cover, rim latches, damper.
    const rings = [45, 70, 95, 120, 145].map(r => cut(cylX(hx + 88, hx + 94, hy, hz, 2 * r + 7, 64), [cylX(hx + 87, hx + 95, hy, hz, 2 * r, 64)]));
    const spokes = [45, 135].map(a => k(k(box([6, 290, 6], [0, 0, 0]).rotate([a, 0, 0])).translate([hx + 91, hy, hz])));
    const latches = [60, 150, 240, 330].map(a => k(k(box([196, 38, 16], [0, 0, R - 4]).rotate([a, 0, 0])).translate([0, hy, hz]))).map(s => k(s.translate([hx, 0, 0])));
    const lever = k(k(box([22, 16, 56], [hx + 106, 0, 172]).rotate([40, 0, 0])).translate([0, hy, hz]));
    const track = [22, 32, 42, 52, 62].map(a => k(k(box([6, 30, 8], [hx + 97, 0, 172]).rotate([a, 0, 0])).translate([0, hy, hz])));
    add('front', 'Flywheel housing', M_.plastic, cylX(hx - 95, hx - 83, hy, hz, 2 * R, 96), cut(cylX(hx + 83, hx + 95, hy, hz, 2 * R, 96), [cylX(hx + 88, hx + 96, hy, hz, 320, 96)]), ...rings, ...spokes, ...latches, cylX(hx + 83, hx + 90, hy, hz, 60));
    add('front', 'Flywheel housing intake mesh', M_.mesh, cylX(hx - 84, hx + 84, hy, hz, 2 * R - 16, 96));
    add('front', 'Damper lever', M_.plastic, lever, ...track);
    add('front', 'Concept2 accents', M_.lime, cylX(hx + 93, hx + 97, hy, hz, 34, 32));
    // Front legs: V under the axle box to a 24 in cross foot with transport wheels (aluminium on standard legs, steel on tall).
    const [lw, lt] = tall ? [80, 36] : [70, 30];
    const legs = [bar([800, beamTop(800) - 124], [1082, 44], lw, lt), bar([1010, hz - 80], [1118, 44], lw, lt)];
    if (tall) legs.push(profile([[1046, 44], [1154, 44], [1104, 190]], 14));
    add('front', tall ? 'Front legs · steel' : 'Front legs · aluminium', tall ? M_.steel : M_.alu, ...legs);
    add('front', 'Front foot', M_.steel, span([-ROWERG_SPECS.width / 2, 1070, 10], [ROWERG_SPECS.width / 2, 1130, 50]), ...[-1, 1].flatMap(s => [span([s * 266 - 3, 1100, 14], [s * 266 + 3, 1176, 50]), span([s * 298 - 3, 1100, 14], [s * 298 + 3, 1176, 50])]));
    add('front', 'Front feet and wheels', M_.rubber, ...[-1, 1].flatMap(s => [span([s * 250 - 40, 1066, 0], [s * 250 + 40, 1134, 10]), cylX(s * 282 - 12, s * 282 + 12, 1162, 32, 54)]));
    // Handle rests on its hook in use, stowed on the peg behind the tower in storage; chain runs to the exit at the tower foot.
    const [handleY, handleZ] = storage ? [668, 700 + L + 23] : [330, 452 + L], exit: Vec3 = [0, 700, beamTop(700) + 6];
    add('front', 'Handle and chain', M_.chain, cylX(-120, 120, handleY, handleZ, 28), span([-14, handleY, handleZ - 14], [14, handleY + 22, handleZ + 14]), rod([0, handleY + 20, handleZ], exit, 8, 12));
    add('front', 'Handle grips', M_.grip, ...[-1, 1].map(s => rod([s * 118, handleY, handleZ], [s * 282, handleY - 28, handleZ], 34, 24)));
    // Monitor arm pivots on the tower: up and back toward the rower in use, folded down along the frame for storage.
    const pivot: Vec3 = [0, ROWERG_LAYOUT.pivot[1], ROWERG_LAYOUT.pivot[2] + L], fold = storage ? 75 : 0;
    const arm = (s: Manifold) => k(k(s.rotate([fold, 0, 0])).translate(pivot));
    const [ey, ez] = [190 * Math.cos(125 * Math.PI / 180), 190 * Math.sin(125 * Math.PI / 180)], pm5 = (s: Manifold) => arm(k(k(s.rotate([-12, 0, 0])).translate([0, ey - 26, ez + 94])));
    add('front', 'Monitor arm', M_.frame, arm(cylX(-30, 30, 0, 0, 50)), arm(bar([0, 0], [ey, ez], 44, 36)), arm(bar([ey, ez], [ey - 16, ez + 60], 40, 30)));
    add('front', 'PM5 monitor', M_.plastic, pm5(cut(rounded(165, 48, 200, 10, [0, 0, -100]), [box([124, 10, 98], [0, -26, 28])])),
      pm5(span([-40, 20, -40], [40, 40, 40])), ...[-54, -18, 18, 54].map(x => pm5(cylY(x, -30, -22, -52, 12))));
    add('front', 'PM5 display', M_.screen, pm5(box([118, 4, 92], [0, -22, 28])));
    add('front', 'Fasteners', M_.hw, ...[-1, 1].flatMap(s => [cylX(s > 0 ? 38 : -44, s > 0 ? 44 : -38, 721, 700 + L, 12, 16), cylX(s > 0 ? 38 : -44, s > 0 ? 44 : -38, 960, hz, 16, 16), cylX(s > 0 ? 190 : -196, s > 0 ? 196 : -190, 170, 236 + L, 18, 16), cylX(s > 0 ? 294 : -300, s > 0 ? 300 : -294, 1162, 32, 14, 16)]));
    // Storage: the front section stands on its transport wheels and leans on the monorail, stood on its rear end beside the frame.
    const solids = [...parts].map(([name, e]) => ({ ...e, name, solid: union(e.pieces) }));
    if (storage) {
      const { front: angle, railX: rx } = STORAGE[p.legs];
      const bounds = (group?: string) => { const b = solids.filter(s => !group || s.group === group).map(s => s.solid.boundingBox()); return [0, 1, 2].map(i => [Math.min(...b.map(x => x.min[i])), Math.max(...b.map(x => x.max[i]))]); };
      // Rail: rear end down, seat toward -X, rear legs reaching under the front frame; body centred on x = rx.
      for (const s of solids) s.solid = s.group === 'front' ? k(s.solid.rotate([angle, 0, 0])) : k(k(s.solid.rotate([90, 0, -90])).translate([rx + 238 + L, 0, -rear]));
      const [, [fy0], [fz]] = bounds('front');
      // The front section tips until its left footrest rests against the monorail's side.
      const footrest = solids.find(s => s.name === 'Footrests')!.solid.boundingBox().max[1] - fy0;
      for (const s of solids) s.solid = k(s.solid.translate(s.group === 'front' ? [0, -fy0, -fz] : [0, footrest + 40, 0]));
      const [[x0, x1], [y0, y1]] = bounds();
      for (const s of solids) s.solid = k(s.solid.translate([-(x0 + x1) / 2, -(y0 + y1) / 2, 0]));
    }
    for (const { name, solid, mat: [role, color, metalness, roughness] } of solids) out.push({ name, solid, role, color, metalness, roughness });
    out.find(p => p.role === 'fastener')!.authoredFastenerFinish = true;
    for (const part of out) if (part.solid.isEmpty() || part.solid.status() !== 'NoError') throw Error(`Invalid RowErg ${part.name}`);
    success = true; return out;
  } finally { const keep = new Set(success ? out.map(p => p.solid) : []); for (const s of new Set(owned)) if (!keep.has(s as Manifold)) s.delete(); }
}
export const definitions: PartDefinition[] = [floorDefinition(ROWERG, buildRowErg)];
