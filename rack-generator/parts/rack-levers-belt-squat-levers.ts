/** Builders for the #135 levers (metadata in ../rack-parts/rack-levers-belt-squat-levers.ts). Source frame (rack-part.ts):
 * origin on the upright centreline at the target hole, +Y out of the mounting face, X across it, Z up. Each lever is
 * built in its rest frame and posed about its pivot with the same rotation the metadata uses for extents and bodies. */
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { buildPlateStack } from './plates.ts';
import { buildKit, BLACK_ZINC, CHROME, POWDER_BLACK, RUBBER, UHMW, ZINC, type Finish, type Kit } from './rack-levers-belt-squat-kit.ts';
import {
  BOS_SHOULDER_BOULDER, BOULDER, boulderHandle, boulderLayout, boulderPoint, boulderSwing, FRINGE_MAMMOTH_BELT_SQUAT, hornLoad, MAMMOTH, mammothLayout, mammothPoint, mammothPose,
  ML_LEVER, mlLeverLayout, mlLeverPivot, mlLeverPoint, mlLeverSeries, mlLeverSwing, ROGUE_MONSTER_LITE_LEVER_ARMS, VENDETTA, VENDETTA_180_LEVER_ARM_ADAPTERS, vendettaAngle, vendettaPivot,
} from '../rack-parts/rack-levers-belt-squat-levers.ts';
const TEXTURE_BLACK: Finish = { color: '#1c1d1f', metalness: .3, roughness: .78 };
const PIN_RED: Finish = { color: '#c8202a', metalness: .15, roughness: .45 };
/** Plates loaded on a horn or post: added last (they are returned solids, not scope-owned). */
function loadPlates(api: ManifoldAPI, g: Kit, load: number, origin: Vec3, axis: Vec3, name: string) {
  const plates = hornLoad(load).plates;
  if (plates.length) g.parts.push(...buildPlateStack(api, plates, { origin, axis, name, segments: 72, detail: 'simple' }));
}
/** Hex bolt along `axis` from `a` (head) to `b` (nut end) with shank radius r. */
function hexBolt(g: Kit, name: string, a: Vec3, b: Vec3, r: number, f: Finish, head = true) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as Vec3, L = Math.hypot(...d), u = d.map(v => v / L) as Vec3;
  const at = (t: number): Vec3 => [a[0] + u[0] * t, a[1] + u[1] * t, a[2] + u[2] * t];
  const solids = [g.rod(at(0), at(L), r, 0, .8, 20), g.prism(at(-r * 1.2), u, r * 1.2, r * 1.75, 6)];
  if (head) solids.push(g.prism(at(L - r * 1.8), u, r * 1.6, r * 1.75, 6));
  g.add(name, g.union(solids), f);
}
/** Rectangular hollow tube between two points (square section `w` x `h`, wall t), the section's h side along `up`. */
function boxTube(g: Kit, a: Vec3, b: Vec3, w: number, h: number, t: number, holes: { at: number; r: number; across: 'w' | 'h' }[] = [], capped = false) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as Vec3, L = Math.hypot(...d);
  const outer = g.box([-w / 2, -h / 2, 0], [w / 2, h / 2, L]), inner = g.box([-w / 2 + t, -h / 2 + t, capped ? t : -1], [w / 2 - t, h / 2 - t, capped ? L - t : L + 1]);
  const cuts = [inner, ...holes.map(q => q.across === 'w' ? g.rod([-w, 0, q.at], [w, 0, q.at], q.r, 0, 0, 20) : g.rod([0, -h, q.at], [0, h, q.at], q.r, 0, 0, 20))];
  return g.cut(outer, cuts);
}

// ================================================================ Fringe Sport Mammoth Belt Squat
export function buildMammoth(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...FRINGE_MAMMOTH_BELT_SQUAT.defaults, ...params }, M = MAMMOTH, f = (p.upright ?? 75) / 2, deg = mammothPose(p), s = p.side ? 1 : -1;
  if (![0, 1].includes(p.hardware)) throw Error('Unsupported Mammoth pin.');
  const { L, tube0, horn, hornBase, eye, h } = mammothLayout(p), w2 = M.tubeWidth / 2;
  return buildKit(api, g => {
    // Arm frame: u along +X from the pivot, w up (+Z), y across the upright.
    const inner = Math.max(f + M.uhmw, w2), t = M.forkThick;
    const outline = g.k(g.C.union([
      g.k(g.C.circle(M.forkNose, 40)),
      g.k(new g.C([[[0, M.forkTop], [0, -M.forkBottom], [M.joggle - 70, -M.forkBottom], [M.joggle, -h], [M.fork, -h], [M.fork, M.forkTop]]])),
    ]));
    const plateHoles = Array.from({ length: 11 }, (_, i) => g.k(g.k(g.C.circle(9.5, 16)).translate([M.joggle + 40 + i * 31, 0])));
    const plate2d = g.k(outline.subtract(g.k(g.C.union(plateHoles))));
    // Fork plates on both faces of the upright (profile in X/Z, extruded along Y).
    for (const y0 of [inner, -inner - t]) g.add('Fork plate', g.k(g.k(plate2d.extrude(t)).transform([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, y0 + t, 0, 1])), POWDER_BLACK);
    for (const [y0, y1] of [[f, inner], [-inner, -f]]) if (y1 - y0 > .2) g.add('UHMW pivot pad', g.rod([0, y0, 0], [0, y1, 0], 34, 0, 0, 32), UHMW);
    // Spacer tube and bolt clear of the upright, and the three M16 adjustment bolts through fork and tube.
    g.add('Fork spacer tube', g.rod([M.spacer, -inner, 0], [M.spacer, inner, 0], 16, 0, 0, 24), POWDER_BLACK);
    hexBolt(g, 'Spacer bolt', [M.spacer, inner + t + 1, 0], [M.spacer, -inner - t - 12, 0], 8, BLACK_ZINC);
    for (const u of M.bolts) if (u > tube0 + 20 && u < L - 20) hexBolt(g, 'M16 adjustment bolt', [u, inner + t + 1, 0], [u, -inner - t - 14, 0], 8, BLACK_ZINC);
    // 30 in 2x3 main tube laid flat, holes along the sides and top, capped at the tip.
    const n = Math.floor((M.tube - 40) / 63.5);
    const holes = Array.from({ length: n }, (_, i) => 32 + i * 63.5);
    const side = holes.map(at => ({ at, r: 12.7, across: 'h' as const })), top = holes.filter(at => Math.abs(tube0 + at - horn) > 40).map(at => ({ at, r: 12.7, across: 'w' as const }));
    const tube = boxTube(g, [tube0, 0, 0], [L, 0, 0], M.tubeHeight, M.tubeWidth, M.wall, [...side, ...top]);
    // boxTube builds along +Z with w across X and h across Y: turn it onto the arm axis (w → Z height, h → Y width).
    g.add('2x3 11 ga main tube', g.k(g.k(tube.rotate([0, 90, 0])).translate([tube0, 0, 0])), POWDER_BLACK);
    g.add('Tip end plate', g.box([L - 4, -w2, -h], [L, w2, h]), POWDER_BLACK);
    // 14 in loading horn on its collar, with the retaining bolt under the tube.
    g.add('Horn collar', g.rod([horn, 0, h], [horn, 0, hornBase], M.collar / 2, 0, .8, 48), POWDER_BLACK);
    g.add('14 in loading horn', g.rod([horn, 0, hornBase], [horn, 0, hornBase + M.horn], M.hornDiameter / 2, 0, 2, 48), POWDER_BLACK);
    g.add('Horn bolt head', g.prism([horn, 0, -h - 8], [0, 0, 1], 8, 13, 6), BLACK_ZINC);
    // Eye bolt at the tip for the belt chain, rubber foot underneath.
    g.add('Lifting eye bolt', g.union([g.rod([eye, 0, h], [eye, 0, h + 14], 8, 0, 0, 20), g.ring([eye, 0, h + 14 + 24], [0, 1, 0], 19, 5.5, 32)]), ZINC);
    g.add('Rubber tip foot', g.rod([eye, 0, -h - M.footHeight], [eye, 0, -h], M.foot / 2, 3, 0, 32), RUBBER);
    // Magpin through the fork and the upright: black 1 in or red 5/8 in pull handle on the +Y side.
    const pr = p.hardware ? 7.8 : 12.3, handle = p.hardware ? PIN_RED : { color: '#141416', metalness: .2, roughness: .5 };
    g.add('Magpin', g.rod([0, -inner - t - 10, 0], [0, inner + t + 14, 0], pr, 1, 0, 32), ZINC);
    g.add('Magpin handle', g.union([g.rod([0, inner + t + 12, 0], [0, inner + t + 26, 0], 15, 1, 1, 32), g.ring([0, inner + t + 44, 0], [0, 0, 1], 15, 4.5, 32)]), handle);
    // Pose: raise by the arm angle about the pivot axis, then point it to the chosen side.
    g.transformAll(m => s > 0 ? m.rotate([0, -deg, 0]) : g.k(m.rotate([0, -deg, 0])).mirror([1, 0, 0]));
    const t0 = deg * Math.PI / 180;
    loadPlates(api, g, p.load, mammothPoint(p, horn, hornBase + 1), [-s * Math.sin(t0), 0, Math.cos(t0)], 'Horn plate');
  });
}

// ================================================================ Rogue Monster Lite / Monster lever arms
export function buildMlLeverArm(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_LITE_LEVER_ARMS.defaults, ...params }, L = ML_LEVER, series = mlLeverSeries(p), f = (p.upright ?? 75) / 2, pitch = p.mountSpacing ?? 50;
  if (![0, 1].includes(p.handle)) throw Error('Unsupported lever handle.');
  const [, py, pz] = mlLeverPivot(p), swing = mlLeverSwing(p), hand = p.mirror === 1 ? -1 : 1, h = L.tube / 2;
  const { end, gLow, gHigh, post } = mlLeverLayout();
  const finish: Finish = series.pin > 20 ? { color: '#1d1e20', metalness: .4, roughness: .55 } : TEXTURE_BLACK;
  return buildKit(api, g => {
    // Bent 3/8 in bracket: side plates straddle the upright and reach past the face to the hinge, joined behind the post.
    const inner = Math.max(f, h) + 1.5, t = L.plate, zTop = L.bracketUp, zBot = -2 * pitch - L.bracketDown;
    const profile: Vec2[] = [[-f - 1, zBot], [f + 20, zBot], [py + h + 8, pz - 45], [py + h + 8, zTop], [-f - 1, zTop]];
    for (const x0 of [inner, -inner - t]) g.add('Hinge bracket plate', g.cut(g.plateYZ(profile, x0, t), [g.rod([x0 - 1, py, pz], [x0 + t + 1, py, pz], 13, 0, 0, 24)]), finish);
    g.add('Bracket web', g.box([-inner - t, -f - 1 - t, zBot], [inner + t, -f - 1, zTop]), finish);
    for (const z of [0, -2 * pitch]) hexBolt(g, 'Bracket bolt', [inner + t + 1, 0, z], [-inner - t - 16, 0, z], series.bolt / 2, ZINC);
    hexBolt(g, 'Hinge pin bolt', [inner + t + 1, py, pz], [-inner - t - 18, py, pz], series.bolt / 2, ZINC);
    const posed = g.parts.length;
    // Arm hanging from the hinge (along -Z), holes through its front and back faces every 2 in.
    const n = Math.floor((L.arm - 60) / 50.8), holes = Array.from({ length: n }, (_, i) => ({ at: 40 + i * 50.8, r: series.pin > 20 ? 13 : 8.7, across: 'h' as const }));
    const arm = boxTube(g, [0, 0, 0], [0, 0, L.arm], L.tube, L.tube, 3.05, holes, true);
    g.add('3x3 11 ga lever arm', g.k(g.k(arm.rotate([180, 0, 0])).translate([0, py, pz + L.stub])), finish);
    g.add('Hinge bushing', g.rod([-inner, py, pz], [inner, py, pz], 14, 0, 0, 24), { color: '#b08d57', metalness: .8, roughness: .35 });
    // Handle plate on the inboard side and the post plate outboard, clamped across the arm by two bolts.
    const [pw, ph] = L.mountPlate, x1 = -h - t;
    g.add('Handle mount plate', g.box([x1, py - pw / 2, pz - end], [-h, py + pw / 2, pz - end + ph]), finish);
    g.add('Post mount plate', g.box([h, py - pw / 2, pz - post - 90], [h + t, py + pw / 2, pz - post + 90]), finish);
    for (const a of [post - 62, post + 62]) hexBolt(g, 'Clamp bolt', [h + t + 1, py, pz - a], [x1 - 14, py, pz - a], 8, ZINC);
    // Bent 1.31 in handle loop (grips 10 in apart), optional neutral bar.
    const od = L.handleOD / 2, xo = -h - L.handleReach, bend = 55, zl = pz - gLow, zh = pz - gHigh;
    g.add('Bent 1 in pipe handle', g.path([[x1, py, zh], [xo + bend, py, zh], [xo, py, zh - bend], [xo, py, zl + bend], [xo + bend, py, zl], [x1, py, zl]], od, 24), finish);
    if (p.handle) g.add('Neutral grip bar', g.rod([xo + (x1 - xo) * .42, py, zh], [xo + (x1 - xo) * .42, py, zl], od, 0, 0, 24), finish);
    // Weight post with its zinc collar ring.
    const x2 = h + t;
    g.add('Post collar', g.rod([x2, py, pz - post], [x2 + L.collar, py, pz - post], L.collarDiameter / 2, 0, .8, 40), ZINC);
    g.add('Weight post', g.rod([x2 + L.collar, py, pz - post], [x2 + L.collar + L.post, py, pz - post], L.postDiameter / 2, 0, 2, 40), finish);
    // Swing forward about the hinge, then mirror the whole unit for the second arm of the pair.
    g.transformAll(m => g.rotate(m, [swing, 0, 0], [0, py, pz]), posed);
    if (hand < 0) g.transformAll(m => m.mirror([1, 0, 0]));
    loadPlates(api, g, p.load, mlLeverPoint(p, x2 + L.collar + 2, post), [hand, 0, 0], 'Post plate');
  });
}

// ================================================================ Vendetta 180° lever arm trolley
export function buildVendetta(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...VENDETTA_180_LEVER_ARM_ADAPTERS.defaults, ...params }, V = VENDETTA, f = (p.upright ?? 75) / 2, angle = vendettaAngle(p), [, py] = vendettaPivot(p), h = V.tube / 2;
  if (![0, 1].includes(p.hardware)) throw Error('Unsupported trolley pin.');
  const plateFinish: Finish = { color: '#4a4c4f', metalness: .6, roughness: .55 };
  return buildKit(api, g => {
    const inner = Math.max(f, h) + V.gap, t = V.plate, [rw, rh] = V.rect, back = -f - 34;
    // Side plates: trolley section over the upright, index disc around the hinge, slot ring, bolt holes and the V.
    const outline = g.k(g.C.union([g.k(g.k(g.C.circle(V.disc / 2, 64)).translate([py, 0])), g.k(new g.C([[[back, -rh / 2], [f + 30, -rh / 2], [f + 30, rh / 2], [back, rh / 2]]]))]));
    const slots = Array.from({ length: 25 }, (_, i) => {
      const a = (-30 + i * 10) * Math.PI / 180, cx = py + V.slotRadius * Math.sin(a), cz = -V.slotRadius * Math.cos(a);
      return g.k(g.k(g.k(g.C.square([V.slot[0], V.slot[1]], true)).rotate(-(-30 + i * 10))).translate([cx, cz]));
    });
    const bolts = [[back + 14, rh / 2 - 16], [back + 14, -rh / 2 + 16], [f + 14, rh / 2 - 16], [f + 14, -rh / 2 + 16]] as Vec2[];
    const holes = [...bolts.map(([y, z]) => g.k(g.k(g.C.circle(6.5, 16)).translate([y, z]))), g.k(g.k(g.C.circle(8, 16)).translate([py, 0])),
      ...Array.from({ length: 6 }, (_, i) => g.k(g.k(g.C.circle(8.7, 16)).translate([back + 44, -62 + i * 24.8]))),
      g.k(g.k(g.k(g.C.square([4, 34], true)).rotate(18)).translate([py - 42, 4])), g.k(g.k(g.k(g.C.square([4, 34], true)).rotate(-18)).translate([py - 32, 4]))];
    const plate2d = g.k(outline.subtract(g.k(g.C.union([...slots, ...holes]))));
    for (const x0 of [inner, -inner - t]) g.add('Vendetta 1/4 in index plate', g.k(g.k(plate2d.extrude(t)).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, x0, 0, 0, 1])), plateFinish);
    // Eight rollers (four each side of the post, front and rear) on zinc bolts.
    for (const [y, z] of bolts) {
      const ry = y < 0 ? -f - V.roller / 2 - 1 : f + V.roller / 2 + 1;
      g.add('Zinc roller bolt', g.union([g.rod([-inner - t - 6, y, z], [inner + t + 6, y, z], 6.35, 0, 0, 16), g.prism([inner + t, y, z], [1, 0, 0], 6, 11, 6), g.prism([-inner - t, y, z], [-1, 0, 0], 7, 11, 6)]), ZINC);
      if (Math.abs(ry - y) < 30) for (const sx of [-1, 1]) g.add('Acetal roller', g.rod([sx * (inner - V.rollerLength), y, z], [sx * (inner - 1), y, z], V.roller / 2, 1.5, 1.5, 32), { color: '#141414', metalness: 0, roughness: .5, role: 'liner' });
    }
    // Rear bridge and the spring-loaded rack pin with its knurled knob.
    const pr = p.hardware ? 7.8 : 12.3;
    g.add('Rear bridge plate', g.box([-inner, back - 2, -40], [inner, back + 4, 40]), plateFinish);
    g.add('Spring rack pin', g.rod([0, back - 30, 0], [0, -f + 14, 0], pr, 0, 1, 24), ZINC);
    g.add('Knurled pin knob', g.rod([0, back - 52, 0], [0, back - 30, 0], 17, 1, 1, 32), { color: '#18191a', metalness: .5, roughness: .6 });
    // 3x3 lever arm on the hinge bolt, resting on the hitch pin in the index hole below it.
    const posed = g.parts.length;
    const n = Math.floor((V.arm - 80) / 50.8), armHoles = Array.from({ length: n }, (_, i) => ({ at: 60 + i * 50.8, r: 13, across: 'h' as const }));
    const arm = boxTube(g, [0, 0, 0], [0, 0, V.arm], V.tube, V.tube, 3.05, armHoles, true);
    g.add('3x3 lever arm', g.k(g.k(arm.rotate([180, 0, 0])).translate([0, py, 50.8])), { color: '#1a1b1d', metalness: .35, roughness: .6 });
    g.transformAll(m => g.rotate(m, [angle, 0, 0], [0, py, 0]), posed);
    hexBolt(g, 'Hinge bolt', [inner + t + 1, py, 0], [-inner - t - 18, py, 0], 12.7, ZINC);
    if (angle > 0) {
      // Hitch pin through the index ring just below the arm; the arm's striker rests on it.
      const a = (angle - 26) * Math.PI / 180, y = py + V.slotRadius * Math.sin(a), z = -V.slotRadius * Math.cos(a);
      g.add('5/8 in hitch pin', g.union([g.rod([-inner - t - 14, y, z], [inner + t + 22, y, z], V.hitch / 2, 0, 1.5, 20), g.ring([-inner - t - 22, y, z], [0, 1, 0], 9, 3, 20)]), ZINC);
      g.add('Hitch pin clip', g.ring([inner + t + 16, y, z - 8], [0, 1, 0], 10, 1.6, 20, 270), PIN_RED);
    }
  });
}

// ================================================================ Bells of Steel Shoulder Boulder
export function buildShoulderBoulder(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BOS_SHOULDER_BOULDER.defaults, ...params }, B = BOULDER, L = boulderLayout(p), swing = boulderSwing(p), f = L.f, pz = B.pivotZ;
  const chromeDisc: Finish = { color: '#dfe2e4', metalness: .95, roughness: .15 };
  return buildKit(api, g => {
    // Sleeve over the upright (UHMW lined) closed at the front by the crossbar and the stainless BOS plate.
    const si = B.sleeve / 2, w = B.wall, z0 = B.sleeveTop - B.sleeveHeight, z1 = B.sleeveTop, yb = -f - B.uhmw;
    for (const sx of [-1, 1]) {
      g.add('Mount sleeve side plate', g.box([sx > 0 ? si : -si - w, yb - w, z0], [sx > 0 ? si + w : -si, L.bar0, z1]), TEXTURE_BLACK);
      g.add('UHMW sleeve liner', g.box([sx > 0 ? si - B.uhmw : -si, yb, z0 + 6], [sx > 0 ? si : -si + B.uhmw, L.bar0, z1 - 6]), UHMW);
    }
    g.add('Mount sleeve back plate', g.box([-si - w, yb - w, z0], [si + w, yb, z1]), TEXTURE_BLACK);
    g.add('BOS nameplate', g.box([-si - w, L.bar0, pz + B.crossbar[0] / 2], [si + w, L.bar0 + 3, z1]), { color: '#c9ccce', metalness: .85, roughness: .3 });
    // Red pull pin through the sleeve flanges and the upright, spin-lock knob on the back.
    g.add('Pull pin', g.rod([-si - w - 16, 0, 0], [si + w + 14, 0, 0], 7.8, 1, 1, 24), ZINC);
    g.add('Red pull ring', g.ring([-si - w - 30, 0, 0], [0, 1, 0], 13, 3.5, 24), PIN_RED);
    g.add('Spin-lock knob', g.union([g.rod([0, yb - w - 26, -45], [0, yb - w, -45], 25, 1.5, 1.5, 32), g.rod([0, yb - w + 1, -45], [0, -f - 1, -45], 8, 0, 0, 16)]), { color: '#1a1a1c', metalness: .5, roughness: .55 });
    // Crossbar, carry handle and the two bearing housings.
    const [ch] = B.crossbar;
    g.add('Crossbar', g.box([-B.pivotX, L.bar0, pz - ch / 2], [B.pivotX, L.bar1, pz + ch / 2]), TEXTURE_BLACK);
    g.add('Carry handle', g.path([[-55, L.bar1 - 12, pz + ch / 2], [-55, L.bar1 - 12, pz + ch / 2 + 28], [55, L.bar1 - 12, pz + ch / 2 + 28], [55, L.bar1 - 12, pz + ch / 2]], 8, 16), TEXTURE_BLACK);

    for (const s of [-1, 1]) g.add('Bearing housing', g.rod([s * B.pivotX, L.crank1, pz], [s * B.pivotX, L.disc0, pz], B.housing, 1, 1, 40), TEXTURE_BLACK);
    // One side of the swing: crank + horn behind, index disc, bronze washer, handle arm + handle in front (built for +X).
    const side = (s: number) => {
      const from = g.parts.length, px = B.pivotX, ct = B.crankRest, ht = B.handleIn;
      const crank = g.box([-B.crankTube / 2, L.crank0, -B.crank - B.crankTube / 2], [B.crankTube / 2, L.crank1, B.crankAbove]);
      g.add('Load crank', g.rotate(crank, [0, -ct, 0]), TEXTURE_BLACK);
      const hornAt = (y: number): Vec3 => [B.crank * Math.sin(ct * Math.PI / 180), y, -B.crank * Math.cos(ct * Math.PI / 180)];
      g.add('Crank end cap', g.rod(hornAt(L.crank1 - 1), hornAt(L.crank1 + 4), B.horn / 2 + 2, 0, 2, 32), RUBBER);
      g.add('50 mm weight horn', g.rod(hornAt(L.crank0), hornAt(L.horn1), B.horn / 2, 0, 2, 40), ZINC);
      const disc = g.cut(g.rod([0, L.disc0, 0], [0, L.disc0 + B.discThick, 0], B.disc / 2, .6, .6, 64), Array.from({ length: 22 }, (_, i) => {
        const a = 2 * Math.PI * i / 22; return g.rod([50 * Math.cos(a), L.disc0 - 1, 50 * Math.sin(a)], [50 * Math.cos(a), L.disc0 + B.discThick + 1, 50 * Math.sin(a)], 6, 0, 0, 14);
      }));
      g.add('Chrome index disc', disc, chromeDisc);
      g.add('Bronze bearing washer', g.rod([0, L.disc0 + B.discThick, 0], [0, L.arm0, 0], 28, 0, 0, 32), { color: '#b08d57', metalness: .8, roughness: .35 });
      const arm = g.box([-B.handleTube / 2, L.arm0, -B.handleArm], [B.handleTube / 2, L.arm1, B.handleAbove]);
      g.add('Handle arm', g.rotate(arm, [0, ht, 0]), TEXTURE_BLACK);
      g.add('Pop-pin knob', g.rotate(g.union([g.sphere([0, L.arm1 + 12, B.handleAbove - 14], B.knob / 2, 24), g.rod([0, L.arm1 - 1, B.handleAbove - 14], [0, L.arm1 + 8, B.handleAbove - 14], 7, 0, 0, 16)]), [0, ht, 0]), CHROME);
      g.add('Pinch point label', g.rotate(g.box([-15, L.arm1, -110], [15, L.arm1 + .8, -70]), [0, ht, 0]), { color: '#f2c318', metalness: 0, roughness: .6 });
      // Handle: clevis at the arm's end, tube in line then bent toward the lifter, rubber grip on the bent end.
      const hp = boulderHandle(p).map(([o, d, y]) => [o, y, -d] as Vec3);
      g.add('Handle clevis', g.rotate(g.box([-B.handleTube / 2 - 3, L.arm0 - 3, -B.handleArm - 12], [B.handleTube / 2 + 3, L.arm1 + 3, -B.handleArm + 30]), [0, ht, 0]), TEXTURE_BLACK);
      g.add('Handle tube', g.path(hp, B.handleOD / 2, 24), TEXTURE_BLACK);
      const [, a, b] = hp, grip = (t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      g.add('Rubber grip', g.rod(grip(.3), grip(1.02), B.handleOD / 2 + 4, 2, 5, 28), RUBBER);
      // Swing both arms together about the pivot, place at the crossbar end, mirror for the left side.
      g.transformAll(m => g.k(g.k(m.rotate([0, -swing, 0])).translate([px, 0, pz])), from);
      if (s < 0) g.transformAll(m => m.mirror([1, 0, 0]), from);
    };
    side(1); side(-1);
    const ct = B.crankRest * Math.PI / 180;
    for (const s of [-1, 1]) loadPlates(api, g, p.load, boulderPoint(p, s, B.crank * Math.sin(ct), B.crank * Math.cos(ct), L.crank0 - 2), [0, -1, 0], 'Horn plate');
  });
}

