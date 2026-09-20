/** Landmine builders (#134). Layouts, bodies and extents live in ../rack-parts/rack-dips-landmines-landmines.ts; the
 * static parts are built in the source frame, the joint group in the joint frame and then posed with the same math
 * as `jointToSource` (rotate about local Y for 'face' landmines, about local X at the hinge for 'out' landmines). */
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { rackDefinition } from '../rack-part.ts';
import { vendorSolid } from './vendor-solid.ts';
import { kit, pose, type Scope } from './rack-dips-landmines-kit.ts';
import {
  ADROIT, BOS_LANDMINE, BOS_LM, KLEVA_ADROIT_2, landmineLayout, MONSTER_LM, REP_KLEVA_ADROIT, REP_LANDMINE, REP_LM, ROGUE_LANDMINE, ROGUE_LM, ROGUE_MONSTER_LANDMINE,
  adroitPuckHole, type LandmineLayout,
} from '../rack-parts/rack-dips-landmines-landmines.ts';
const inch = (v: number) => v * 25.4;
type Finish = readonly [string, number, number];
const ZINC: Finish = ['#c5c9cc', .85, .28], CHROME: Finish = ['#d8dcdf', .95, .12], BRONZE: Finish = ['#b17a42', .85, .32];
/** Pose the joint group (solids added since `from`) for the entry's kinematics, angle and side. */
function poseJoint(s: Scope, l: LandmineLayout, p: NumericParams, from: number) {
  const a = p.angle ?? 30, k = s.keep;
  if (l.kin === 'out') pose(s, from, m => k(k(m.rotate([a, 0, 0])).translate(l.pivot)));
  else pose(s, from, m => { const r = k(k(m.rotate([0, -a, 0])).translate(l.pivot)); return p.side === 1 ? r : k(r.mirror([1, 0, 0])); });
}
/** Sleeve tube along joint +X ('face') or +Y ('out'), with an optional liner and a chamfered mouth ring. */
function sleeve(s: Scope, l: LandmineLayout, name: string, f: Finish, liner?: { id: number; finish: Finish; name: string }) {
  const K = kit(s), { start, length, od, id, axis } = l.sleeve, a1 = start + length;
  const along = l.kin === 'out' ? 'y' : 'x', at: [number, number] = l.kin === 'out' ? [axis[0], axis[1]] : [axis[0], axis[1]];
  s.add(name, K.tube(along, at, start, a1, od / 2, liner ? liner.id / 2 + (id - liner.id) / 2 : id / 2, 64), 'source', ...f);
  if (liner) s.add(liner.name, K.tube(along, at, start + 4, a1 - .5, id / 2, liner.id / 2, 64), 'liner', ...liner.finish);
  return a1;
}
// ---------------- Rogue Landmine (Infinity / Monster Lite) ----------------
export function buildRogueLandmine(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_LANDMINE.defaults, ...params }, fc = (p.upright ?? 75) / 2, l = landmineLayout(ROGUE_LANDMINE.id, p), L = ROGUE_LM;
  const BLACK: Finish = ['#1f2023', .3, .68];
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, [l0, l0b, l1a, l1] = L.legs, r = L.tongueR, y = (v: number) => fc + v;
    // Static hardware: 5/8 x 6 in hex bolt + nut (2x3 Infinity) or T-handle band peg + shaft collar (3x3 Monster Lite).
    if (p.hardware) {
      add('5/8 in band peg', s.keep(s.M.union([K.alongY(0, 0, -fc - 25, y(l1 + 8 + L.bolt / 2), L.bolt / 2, 1, 0, 32), K.alongX(y(l1 + 8 + L.bolt / 2), 0, -L.pegHandle / 2, L.pegHandle / 2, L.bolt / 2 + 1, 1.5, 1.5, 32)])), 'fastener', ...ZINC);
      add('11/16 in shaft collar', K.tube('y', [0, 0], -fc - L.collar[1], -fc, L.collar[0] / 2, 8.8, 40), 'fastener', '#2a2b2e', .5, .5);
    } else {
      add('5/8 x 6 in hex bolt', s.keep(s.M.union([K.hexY(0, 0, y(l1), y(l1 + 11), 24), K.alongY(0, 0, y(l1) - L.hexBolt, y(l1), L.bolt / 2, 1, 0, 32)])), 'fastener', ...ZINC);
      add('5/8 in hex nut', K.hexY(0, 0, -fc - 14, -fc, 24), 'fastener', ...ZINC);
    }
    const from = s.parts.length;
    // Clevis: two rounded tongues on the pin joined by a base plate, a tab out to the hinge barrel.
    const leg = K.tongue(0, 0, r, L.base);
    const pinHole = K.circle(0, 0, 8.4, 24);
    const legCut = s.keep(leg.subtract(pinHole));
    add('Landmine clevis', s.keep(s.M.union([
      K.plateXZ(legCut, y(l0), y(l0b)), K.plateXZ(legCut, y(l1a), y(l1)),
      box([6, l1 - l0, 2 * r], [L.base + 3, y((l0 + l1) / 2), 0]),
      box([L.barrelX - L.base, 12, 32], [(L.base + L.barrelX) / 2 + 3, y(L.axisY), 0]),
      K.alongZ(L.barrelX, y(L.axisY), -26, 26, L.barrelOD / 2, 1, 1, 32),
    ])), 'source', ...BLACK);
    // Square yoke welded to the sleeve end: top and bottom bars carry the vertical 5/8 in hinge bolt.
    const [x0, x1] = L.yoke, t = L.bar, yz = L.yokeZ, depth = 48;
    add('Sleeve yoke', s.keep(s.M.union([
      box([x1 - x0, depth, t], [(x0 + x1) / 2, y(L.axisY), yz - t / 2]), box([x1 - x0, depth, t], [(x0 + x1) / 2, y(L.axisY), -yz + t / 2]),
      box([t, depth, 2 * yz], [x1 - t / 2, y(L.axisY), 0]),
    ])), 'source', ...BLACK);
    add('5/8 in hinge bolt', s.keep(s.M.union([K.alongZ(L.barrelX, y(L.axisY), -58, 42, L.bolt / 2, 1, 0, 32), K.hexZ(L.barrelX, y(L.axisY), 42, 52, 24), K.alongZ(L.barrelX, y(L.axisY), yz, 42, 17, 0, 0, 32)])), 'fastener', ...ZINC);
    add('5/8 in hinge nut', K.hexZ(L.barrelX, y(L.axisY), -55, -yz, 24), 'fastener', ...ZINC);
    const end = sleeve(s, l, '7-gauge steel landmine sleeve', BLACK);
    // White ROGUE print and the small flag badge on the outward side of the sleeve (flat colour, no logo artwork).
    const R = L.od / 2;
    const band = (a0: number, a1: number, w: number) => s.keep(K.tube('x', [y(L.axisY), 0], a0, a1, R + .35, R - .5, 64).intersect(box([a1 - a0, R, w], [(a0 + a1) / 2, y(L.axisY) + R, 0])));
    add('ROGUE print', band(x1 + 40, x1 + 175, 26), 'source', '#e9e9e6', .05, .6);
    add('Made in USA badge', band(x1 + 182, x1 + 200, 12), 'source', '#b8bcc4', .2, .5);
    void end;
    poseJoint(s, l, p, from);
  });
}
// ---------------- Rogue Monster Landmine 2.0 ----------------
export function buildMonsterLandmine(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_MONSTER_LANDMINE.defaults, ...params }, fc = (p.upright ?? 75) / 2, l = landmineLayout(ROGUE_MONSTER_LANDMINE.id, p), L = MONSTER_LM;
  const MATTE: Finish = ['#1b1c1e', .35, .7], MG: Finish = ['#131416', .55, .32], CERAKOTE: Finish = ['#3b3e41', .45, .5], GREY: Finish = ['#8b8e91', .6, .42];
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, y0 = fc + L.spacer[1] + L.washer, y1 = y0 + L.block[0], yc = fc + L.axisY, collarEnd = y1 + L.washer + L.collar[1];
    add('1 in threaded axle', K.alongY(0, 0, -fc - L.knob[1] + 3, collarEnd + 1.5, L.axle / 2, 1, 1.5, 40), 'source', ...MATTE);
    add('Monster knurled knob', K.alongY(0, 0, -fc - L.knob[1], -fc, L.knob[0] / 2, 2, 1, 48), 'handle', '#1d1e20', .45, .8);
    add('Knurled spacer', K.alongY(0, 0, fc, fc + L.spacer[1], L.spacer[0] / 2, 1, 1, 48), 'handle', '#222325', .45, .78);
    add('Bronze bushing washers', s.keep(s.M.union([K.tube('y', [0, 0], y0 - L.washer, y0, 20, 13, 40), K.tube('y', [0, 0], y1, y1 + L.washer, 20, 13, 40)])), 'fastener', ...BRONZE);
    add('Set-screw shaft collar', K.tube('y', [0, 0], y1 + L.washer, collarEnd, L.collar[0] / 2, L.axle / 2, 40), 'source', ...MATTE);
    const from = s.parts.length;
    // Machined octagonal aluminium joint block along the sleeve axis, the axle through its rear end.
    const oct = s.keep(s.keep(s.C.circle(L.block[0] / 2 / Math.cos(Math.PI / 8), 8)).rotate(22.5));
    const block = s.keep(s.keep(s.keep(oct.extrude(L.block[2] - L.block[1])).rotate([0, 90, 0])).translate([L.block[1], yc, 0]));
    add('Machined aluminium joint', s.keep(block.subtract(K.alongY(0, 0, y0 - 1, y1 + 1, L.axle / 2 + .3, 0, 0, 32))), 'source', ...CERAKOTE);
    add('Engraved ROGUE', box([50, .6, 18], [30, y1 + .2, 0]), 'source', '#a9adb1', .7, .35);
    // Clevis cheeks with the cross bolt; the sleeve tongue sits between them.
    const [cx0, cx1, cz0, cz1] = L.cheek, cheek = K.hull2([K.rect(cx0, yc - 24, L.boltX, yc + 24), K.circle(L.boltX, yc, 24, 40)]);
    add('Clevis', s.keep(s.M.union([K.plateXY(cheek, cz0, cz1), K.plateXY(cheek, -cz1, -cz0), box([8, 48, 2 * cz1], [cx0 + 4, yc, 0])])), 'source', ...GREY);
    const [tx0, tx1, tz, ty] = L.tongue;
    add('Sleeve tongue', s.keep(s.M.union([box([tx1 - tx0, 2 * ty, 2 * tz], [(tx0 + tx1) / 2, yc, 0]), K.alongZ(L.boltX, yc, -tz, tz, ty, 0, 0, 32)])), 'source', ...MG);
    add('Clevis socket bolt', s.keep(s.M.union([K.alongZ(L.boltX, yc, -cz1 - 5, cz1 + 5, 6.35, 0, 0, 24), K.alongZ(L.boltX, yc, cz1, cz1 + 6, 9.5, 0, 1, 24), K.alongZ(L.boltX, yc, -cz1 - 6, -cz1, 9.5, 1, 0, 24)])), 'fastener', '#2b2c2f', .7, .35);
    sleeve(s, l, 'DOM steel pivot sleeve', MG);
    add('Sleeve weld collar', K.tube('x', [yc, 0], L.tongue[1], L.tongue[1] + 6, L.od / 2 + 1.5, L.id / 2, 64), 'source', ...MG);
    poseJoint(s, l, p, from);
  });
}
// ---------------- Bells of Steel Landmine ----------------
export function buildBosLandmine(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BOS_LANDMINE.defaults, ...params }, fc = (p.upright ?? 75) / 2, l = landmineLayout(BOS_LANDMINE.id, p), B = BOS_LM;
  const BLACK: Finish = ['#242528', .3, .72], KNOB: Finish = ['#141415', 0, .55], NYLOCK: Finish = ['#2f6fd1', .1, .5];
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s;
    const starKnob = (a: number, along: 'x' | 'y', ax: [number, number]) => {
      // Locking star knob on a threaded stem through the sleeve wall (top of the sleeve, near the mouth).
      const r = B.od / 2;
      if (along === 'x') {
        add('Bar-lock star knob', K.starZ(a, ax[0], r + 10, r + 24, 22, 6), 'handle', ...KNOB);
        add('Bar-lock screw', s.keep(s.M.union([K.alongZ(a, ax[0], r - 3, r + 11, 5, 0, 0, 20), K.alongZ(a, ax[0], r - 1, r + 4, 10, 0, 0, 24)])), 'fastener', ...ZINC);
      } else {
        add('Bar-lock star knob', K.starZ(ax[0], a, r + 10, r + 24, 22, 6), 'handle', ...KNOB);
        add('Bar-lock screw', s.keep(s.M.union([K.alongZ(ax[0], a, r - 3, r + 11, 5, 0, 0, 20), K.alongZ(ax[0], a, r - 1, r + 4, 10, 0, 0, 24)])), 'fastener', ...ZINC);
      }
    };
    if (!p.variant) {
      const [l0, l0b, l1a, l1] = B.legs, y = (v: number) => fc + v, r = B.tongueR;
      add('5/8 in T-handle pin', s.keep(s.M.union([K.alongY(0, 0, -fc - 20, y(94), 7.9, 1, 0, 32), K.alongZ(0, y(94), -B.tHandle / 2, B.tHandle / 2, 8.9, 1.5, 1.5, 32)])), 'source', '#1e1f21', .4, .6);
      add('Pin collar', K.tube('y', [0, 0], fc, y(B.collar[1]), B.collar[0] / 2, 8.2, 40), 'fastener', ...ZINC);
      const from = s.parts.length;
      const leg = s.keep(K.tongue(0, 0, r, B.flange[0] + 6).subtract(K.circle(0, 0, 8.4, 24)));
      const [fx0, fx1, fz0, fz1] = B.flange;
      const flange = K.hull2([K.rect(fx0, y(l0), B.boltX, y(l1)), K.circle(B.boltX, y((l0 + l1) / 2), (l1 - l0) / 2, 40)]);
      add('U bracket', s.keep(s.M.union([K.plateXZ(leg, y(l0), y(l0b)), K.plateXZ(leg, y(l1a), y(l1)), box([6, l1 - l0, 2 * r], [fx0 + 3, y((l0 + l1) / 2), 0]), K.plateXY(flange, fz0, fz1)])), 'source', ...BLACK);
      const [tx0, tx1, tz0, tz1] = B.tab, ty = y(B.axisY);
      add('Sleeve hinge tab', K.plateXY(K.hull2([K.rect(tx0, ty - 24, tx1, ty + 24), K.circle(B.boltX, ty, 24, 40)]), tz0, tz1), 'source', ...BLACK);
      add('Hinge bolt', s.keep(s.M.union([K.alongZ(B.boltX, ty, fz0 - 14, tz1 + 12, 7.9, 0, 1, 24), K.hexZ(B.boltX, ty, fz0 - 10, fz0, 24)])), 'fastener', ...ZINC);
      add('Nylock nut', K.hexZ(B.boltX, ty, tz1, tz1 + 9, 24), 'fastener', ...ZINC);
      add('Nylock insert', K.alongZ(B.boltX, ty, tz1 + 9, tz1 + 13, 10.5, 0, .5, 24), 'fastener', ...NYLOCK);
      const end = sleeve(s, l, 'Landmine sleeve', BLACK, { id: B.id - 2 * B.liner, finish: ['#2c2d2f', 0, .8], name: 'UHMW sleeve liner' });
      starKnob(end - B.knobX, 'x', [ty, 0]);
      poseJoint(s, l, p, from);
      return;
    }
    // Manticore 2.0: a channel bracket wraps the upright; a 1 in mag pin crosses it through the side holes.
    const m = B.mtc, w = fc + m.plate, hinge = fc + m.plate + m.hingeY, z = m.bracketZ;
    const cheek = K.hull2([K.rect(-m.cheekBack + 12, -z, w - .6, z), K.circle(-m.cheekBack + 12, z - 12, 12, 24), K.circle(-m.cheekBack + 12, -z + 12, 12, 24)]);
    const cheekCut = s.keep(cheek.subtract(K.circle(0, 0, 13.2, 32)));
    add('Channel bracket', s.keep(s.M.union([box([2 * w - 1.2, m.plate, 2 * z - 1.2], [0, fc + m.plate / 2, 0]), K.plateYZ(cheekCut, fc + .5, w), K.plateYZ(cheekCut, -w, -fc - .5)])), 'source', ...BLACK);
    add('UHMW rack pad', box([2 * fc - 6, .8, 2 * z - 8], [0, fc + .45, 0]), 'liner', '#2d2e30', 0, .85);
    add('1 in mag pin', s.keep(s.M.union([K.alongX(0, 0, -w - 4, w, 12.7, 0, 0, 40), K.alongX(0, 0, w, w + m.magHead[1], m.magHead[0] / 2, 0, 5, 40)])), 'fastener', ...CHROME);
    add('BOS mag pin knob', K.alongX(0, 0, -w - m.knob[1], -w, m.knob[0] / 2, 1.5, 1, 40), 'handle', '#b7bbbf', .8, .4);
    const ear = K.hull2([K.rect(w, -22, hinge, 22), K.circle(hinge, 0, 22, 40)]);
    add('Hinge ears', s.keep(s.M.union([K.plateYZ(ear, m.ear[0], m.ear[1]), K.plateYZ(ear, -m.ear[1], -m.ear[0])])), 'source', ...BLACK);
    add('Hinge axle bolt', K.alongX(hinge, 0, -m.ear[1] - 4, m.ear[1] + 6, 7.9, 0, 0, 24), 'fastener', ...ZINC);
    const from = s.parts.length;
    // Joint frame: origin on the hinge axis, the sleeve along +Y. Barrel on the hinge, U bracket, vertical bolt, tongue.
    add('Hinge barrel', K.alongX(0, 0, -m.barrelHalf, m.barrelHalf, m.barrel / 2, 1, 1, 40), 'source', ...BLACK);
    const uLeg = K.hull2([K.rect(-26, m.uBase[0], 26, m.boltY), K.circle(0, m.boltY, 26, 40)]);
    add('Swivel U bracket', s.keep(s.M.union([K.plateXY(uLeg, m.uLegs[0], m.uLegs[1]), K.plateXY(uLeg, -m.uLegs[1], -m.uLegs[0]), box([52, m.uBase[1] - m.uBase[0], 2 * m.uLegs[1]], [0, (m.uBase[0] + m.uBase[1]) / 2, 0]), box([24, m.uBase[0] + 2, 22], [0, m.uBase[0] / 2, 0])])), 'source', ...BLACK);
    add('Swivel tongue', s.keep(s.M.union([box([40, m.tongue[1] - m.tongue[0], 2 * m.uLegs[0] - 1], [0, (m.tongue[0] + m.tongue[1]) / 2, 0]), K.alongZ(0, m.boltY, -m.uLegs[0] + .5, m.uLegs[0] - .5, 20, 0, 0, 32)])), 'source', ...BLACK);
    add('Swivel bolt', s.keep(s.M.union([K.alongZ(0, m.boltY, -m.uLegs[1] - 10, m.uLegs[1] + 12, 7.9, 0, 1, 24), K.hexZ(0, m.boltY, -m.uLegs[1] - 10, -m.uLegs[1], 24)])), 'fastener', ...ZINC);
    add('Nylock nut', K.hexZ(0, m.boltY, m.uLegs[1], m.uLegs[1] + 9, 24), 'fastener', ...ZINC);
    add('Nylock insert', K.alongZ(0, m.boltY, m.uLegs[1] + 9, m.uLegs[1] + 13, 10.5, 0, .5, 24), 'fastener', ...NYLOCK);
    const end = sleeve(s, l, 'Landmine sleeve', BLACK, { id: B.id - 2 * B.liner, finish: ['#2c2d2f', 0, .8], name: 'UHMW sleeve liner' });
    starKnob(end - B.knobX, 'y', [0, 0]);
    poseJoint(s, l, p, from);
  });
}
// ---------------- REP Fitness Landmine ----------------
export function buildRepLandmine(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_LANDMINE.defaults, ...params }, fc = (p.upright ?? 75) / 2, l = landmineLayout(REP_LANDMINE.id, p), R = REP_LM;
  const BLACK: Finish = ['#1e1f22', .3, .74];
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, d = p.series ? inch(1) : inch(5 / 8), [l0, l0b, l1a, l1] = R.legs, y = (v: number) => fc + v;
    const tY = y(l1 + R.washer[1]) + d / 2;
    add(`${p.series ? '1' : '5/8'} in chrome T-handle pin`, s.keep(s.M.union([K.alongY(0, 0, -fc - 40, tY, d / 2, 2, 0, 40), K.alongZ(0, tY, -R.tHandle / 2, R.tHandle / 2, d / 2 + 1, 2, 2, 40)])), 'fastener', ...CHROME);
    add('Pin spacer washer', K.tube('y', [0, 0], y(l1), y(l1 + R.washer[1]), R.washer[0] / 2, d / 2 + .4, 40), 'fastener', ...ZINC);
    // Bent-strap bracket: two legs on the pin, the strap across the top, hinge ears rising from it.
    const [z0, z1] = R.legZ, top = z1 + R.strap;
    const legShape = s.keep(K.union2([K.rect(-R.width, z0 + 12, R.width, top), K.rect(-R.width + 12, z0, R.width - 12, z0 + 12), K.circle(-R.width + 12, z0 + 12, 12, 24), K.circle(R.width - 12, z0 + 12, 12, 24)]).subtract(K.circle(0, 0, d / 2 + .6, 32)));
    const ear = K.hull2([K.rect(y(R.hinge[0] - R.earR), top - 1, y(R.hinge[0] + R.earR), R.hinge[1]), K.circle(y(R.hinge[0]), R.hinge[1], R.earR, 40)]);
    add('Strap bracket', s.keep(s.M.union([K.plateXZ(legShape, y(l0), y(l0b)), K.plateXZ(legShape, y(l1a), y(l1)), box([2 * R.width, l1 - l0, R.strap], [0, y((l0 + l1) / 2), z1 + R.strap / 2]), K.plateYZ(ear, R.ear[0], R.ear[1]), K.plateYZ(ear, -R.ear[1], -R.ear[0])])), 'source', ...BLACK);
    const from = s.parts.length;
    // Joint frame: origin on the hinge bolt, the sleeve along +Y; the closed sleeve end wraps the bolt.
    add('Hinge bolt', K.alongX(0, 0, -R.ear[1] - 6, R.ear[1] + 12, 7.9, 0, 1, 24), 'fastener', ...ZINC);
    add('Hinge bolt head', s.keep(s.keep(K.hexY(0, 0, 0, 10, 24).rotate([0, 0, 90])).translate([-R.ear[1] + 0, 0, 0])), 'fastener', ...ZINC);
    add('Hinge nut', s.keep(s.keep(K.hexY(0, 0, 0, 10, 24).rotate([0, 0, -90])).translate([R.ear[1], 0, 0])), 'fastener', ...ZINC);
    const end = sleeve(s, l, 'Landmine sleeve', BLACK);
    add('Sleeve end cap', K.alongY(0, 0, -R.rear - 6, -R.rear, R.od / 2, 2, 0, 64), 'source', ...BLACK);
    add('Sleeve seam', K.tube('y', [0, 0], end - R.sleeve * .38, end - R.sleeve * .38 + 3, R.od / 2 + .8, R.od / 2 - 1, 64), 'source', '#18191b', .35, .6);
    poseJoint(s, l, p, from);
  });
}
// ---------------- Adroit (REP x Kleva Built rack-mounted, Kleva Built 2.0) ----------------
function buildAdroit(api: ManifoldAPI, p: NumericParams, id: string, rep: boolean): SolidPart[] {
  const fc = (p.upright ?? 75) / 2, l = landmineLayout(id, p), A = ADROIT, pitch = p.mountSpacing ?? 50;
  const ANOD: Finish = ['#17181a', .6, .38], ACETAL: Finish = ['#151516', 0, .62], SLEEVE: Finish = rep ? ['#26272a', .3, .72] : ['#1f2022', .3, .66];
  const magnet = rep || p.magnet !== 0;
  return vendorSolid(api, s => {
    const K = kit(s), { add, box } = s, yc = fc + A.axisY;
    const nut = (z: number, name: string) => add(name, K.starY(0, z, -fc - A.nut[1], -fc, A.nut[0] / 2, 5), 'handle', ...ACETAL);
    add('5/8 in threaded stud', K.alongY(0, 0, -fc - A.nut[1] - 6, fc + A.boss[1] - 2, A.stud / 2, 1, 0, 32), 'fastener', ...ZINC);
    if (p.hardware) add('1 in adapter sleeve', K.tube('y', [0, 0], -fc - .2, fc, A.adapter / 2, A.stud / 2 + .2, 40), 'fastener', '#1d1e20', .6, .4);
    nut(0, 'Acetal hand nut');
    add('Pivot boss', K.alongY(0, 0, fc, fc + A.boss[1], A.boss[0] / 2, 1, 1.5, 48), 'source', ...ANOD);
    if (magnet) {
      const z = adroitPuckHole(p) * pitch;
      add('Magnet mount puck', K.alongY(0, z, fc, fc + A.puck[1] - 1, A.puck[0] / 2, 0, 1.5, 48), 'source', ...ANOD);
      add('Magnet face', K.alongY(0, z, fc + A.puck[1] - 1.2, fc + A.puck[1], 11, 0, .3, 32), 'fastener', '#c9ccce', .85, .3);
      add('Magnet stud', K.alongY(0, z, -fc - A.nut[1] - 6, fc + 2, A.stud / 2, 1, 0, 24), 'fastener', ...ZINC);
      nut(z, 'Magnet hand nut');
    }
    const from = s.parts.length;
    // Joint frame (sleeve along +X): clevis cheeks from the boss around the chrome ball, clevis bolt along joint Z.
    const [cw, cz0, ] = A.cheek, cz1 = cz0 + 6;
    const cheek = K.hull2([K.rect(-cw, fc + 24, cw, yc), K.circle(0, yc, cw, 40)]);
    add('Clevis yoke', s.keep(s.M.union([K.plateXY(cheek, cz0, cz1), K.plateXY(cheek, -cz1, -cz0), box([2 * cw, 8, 2 * cz1], [0, fc + 28, 0])])), 'source', ...ANOD);
    add('Spherical bearing ball', K.sphere([0, yc, 0], A.ball, 32), 'fastener', ...CHROME);
    add('Clevis bolt', K.alongZ(0, yc, -cz1 - 4, cz1 + 4, 6, 0, 0, 24), 'fastener', ...ZINC);
    if (rep) add('Clevis star knob', K.starZ(0, yc, cz1, cz1 + A.knob[1], A.knob[0] / 2, 5), 'handle', ...ACETAL);
    else {
      add('Clevis bolt head', K.hexZ(0, yc, cz1, cz1 + 7, 19), 'fastener', ...ZINC);
      add('Thrust spring', s.keep(s.M.union([0, 1, 2, 3].map(i => K.tube('z', [0, yc], -cz1 - 3 - i * 2.2, -cz1 - 1.6 - i * 2.2, 8, 6.2, 24)))), 'fastener', '#b9bcbe', .85, .3);
      add('Clevis bolt nut', K.hexZ(0, yc, -cz1 - 11, -cz1 - 9.4 + 0, 19), 'fastener', ...ZINC);
    }
    const [sq, s0, s1] = A.stem;
    add('Stem', box([s1 - s0, sq, sq], [(s0 + s1) / 2, yc, 0]), 'source', ...ANOD);
    add('Sleeve base cap', K.alongX(yc, 0, s1, s1 + A.cap, A.od / 2, 1.5, 0, 64), 'source', ...ANOD);
    // Slotted steel sleeve: six long, narrow windows show the clear polycarbonate liner.
    const x0 = s1 + A.cap, x1 = x0 + A.sleeve, R = A.od / 2;
    const shell = K.tube('x', [yc, 0], x0, x1, R, A.id / 2, 64);
    const windows = s.keep(s.M.union([0, 1, 2, 3, 4, 5].map(i => s.keep(s.keep(box([x1 - x0 - 54, 11, 2 * R], [(x0 + x1) / 2 + 2, 0, R]).rotate([i * 60 + 30, 0, 0])).translate([0, yc, 0])))));
    add('Slotted sleeve', s.keep(shell.subtract(windows)), 'source', ...SLEEVE);
    add('Polycarbonate liner', K.tube('x', [yc, 0], x0 + 1, x1 - 2, A.liner[0] / 2 - .2, A.liner[1] / 2, 64), 'liner', '#9aabb2', 0, .06);
    // Two button-head screws hold the sleeve on its base cap.
    add('Base screws', s.keep(s.M.union([150, -30].map(a => s.keep(s.keep(K.alongY(0, 0, R - .6, R + 1.6, 3.2, 0, .6, 16).rotate([a, 0, 0])).translate([x0 + 9, yc, 0]))))), 'fastener', ...ZINC);
    poseJoint(s, l, p, from);
  });
}
export const buildRepKlevaAdroit = (api: ManifoldAPI, params: NumericParams) => buildAdroit(api, { ...REP_KLEVA_ADROIT.defaults, ...params }, REP_KLEVA_ADROIT.id, true);
export const buildKlevaAdroit2 = (api: ManifoldAPI, params: NumericParams) => buildAdroit(api, { ...KLEVA_ADROIT_2.defaults, ...params }, KLEVA_ADROIT_2.id, false);
export const definitions: PartDefinition[] = [
  rackDefinition(ROGUE_MONSTER_LANDMINE, buildMonsterLandmine),
  rackDefinition(REP_KLEVA_ADROIT, buildRepKlevaAdroit),
  rackDefinition(KLEVA_ADROIT_2, buildKlevaAdroit2),
  rackDefinition(ROGUE_LANDMINE, buildRogueLandmine),
  rackDefinition(BOS_LANDMINE, buildBosLandmine),
  rackDefinition(REP_LANDMINE, buildRepLandmine),
];
