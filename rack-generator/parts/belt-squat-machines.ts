/** Belt squat, calf and tib machines: Manifold builders for the entries in ../floor-parts/belt-squat-machines.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry.
 * Each builder works in its layout's design coordinates (inches converted with `inch`) and `finish` centres the result. */
import type { Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec2, Vec3 } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  APEX_BARRETT_BELT_SQUAT, BARRETT, BOS, BOS_BELT_SQUAT, DIY_BELT, DIY_BELT_SQUAT, DIY_SEAL, DIY_SEAL_ROW_BENCH, RHINO, ROGUE_RHINO_BELT_SQUAT, SLSR, SQUATMAX,
  TIBIA, TIB_BAR_PRO, TIB_PRO, TITAN_SINGLE_LEG_SQUAT_ROLLER, TITAN_SQUATMAX_MD, TITAN_TIBIA_DORSI,
  barrettLayout, bosLayout, diyBeltLayout, diySealLayout, inch, rhinoLayout, squatMaxLayout, tibProLayout, tibiaLayout,
} from '../floor-parts/belt-squat-machines.ts';
import { machineKit, rotX, type Mat, type MachineKit } from './belt-squat-machines-kit.ts';
const i = inch;
const mat = (name: string, role: SolidPart['role'], color: string, metalness: number, roughness: number): Mat => [name, role, color, metalness, roughness];
const ZINC = mat('Zinc-plated hardware', 'fastener', '#c9cdd1', .9, .28), CHAIN = mat('Zinc chain and carabiner', 'source', '#c4c8cc', .9, .3);
/** Chain of alternating oval links hanging from `top` straight down to `bottom` (X/Y of top). */
function chain(K: MachineKit, top: Vec3, bottom: number, link = 30) {
  const ring = K.cut(K.k(K.rrect(17, link, 8.5).extrude(5.5)), [K.k(K.k(K.rrect(8, link - 11, 4).extrude(12)).translate([0, 0, -3]))]);
  const out: Manifold[] = [], pitch = link - 9;
  for (let z = top[2] - link / 2, n = 0; z - link / 2 > bottom; z -= pitch, n++) {
    const upright = K.k(ring.rotate([90, 0, n % 2 ? 90 : 0]));
    out.push(K.move(upright, [top[0] + (n % 2 ? 0 : 2.75), top[1] + (n % 2 ? -2.75 : 0), z]));
  }
  return K.union(out);
}
/** Screw-gate carabiner: an oval ring standing in the Y/Z plane with its top at `top`. */
const carabiner = (K: MachineKit, top: Vec3, h = 90) =>
  K.move(K.k(K.cut(K.k(K.rrect(50, h, 22).extrude(9)), [K.k(K.k(K.rrect(36, h - 18, 15).extrude(20)).translate([0, 0, -5]))]).rotate([90, 0, 90])), [top[0] - 4.5, top[1], top[2] - h / 2]);

/* ---------------- Rogue Monster Rhino Belt Squat · Stand Alone ---------------- */
const ry = (y: number) => i(y) - RHINO.D / 2;
export function buildRhino(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = rhinoLayout(p), K = machineKit(api);
  const FRAME = mat('Frame · medium-gloss black powder coat', 'source', '#1b1c1e', .35, .38), TREAD = mat('Platform · diamond tread plate', 'source', '#34363a', .75, .42);
  const POSTS = mat('Weight posts · bright zinc', 'source', '#c3c7cb', .9, .28), HORN = mat('Rhino horn · 1 in UHMW', 'liner', '#131313', 0, .55);
  const RED = mat('Pop-pin knobs · red', 'source', '#c8202b', .3, .35), GRIPS = mat('Loop handles · textured black', 'handle', '#26272a', .25, .8);
  const CABLE = mat('Braided cable · black jacket', 'source', '#151515', .2, .5), BADGE = mat('Rhino badge · white', 'source', '#f1f1ee', 0, .5);
  const INK = mat('Badge ink · black', 'source', '#1b1c1e', 0, .5), LABEL = mat('Warning labels', 'source', '#e46a1c', 0, .6), CAPS = mat('Plastic caps', 'liner', '#161616', 0, .7);
  return K.finish('Rhino belt squat', L.shift, () => {
    const W = RHINO.W / 2, pw = RHINO.platW / 2, y0 = ry(11), y1 = ry(37), zt = RHINO.deck - i(.25), t3 = i(3);
    // Platform: 3×3 perimeter frame and mid crossmember under a 1/4 in diamond-tread plate with a roller slot.
    K.add(FRAME, K.box([-pw, y0, zt - t3], [-pw + t3, y1, zt]), K.box([pw - t3, y0, zt - t3], [pw, y1, zt]), K.box([-pw + t3, y0, zt - t3], [pw - t3, y0 + t3, zt]),
      K.box([-pw + t3, y1 - t3, zt - t3], [pw - t3, y1, zt]), K.box([-pw + t3, ry(22.5), zt - t3], [pw - t3, ry(25.5), zt]));
    const slot = K.box([-i(1.25), ry(28), zt - 5], [i(1.25), ry(35), RHINO.deck + 5]);
    K.add(TREAD, K.cut(K.box([-pw, y0, zt], [pw, y1, RHINO.deck]), [slot]), K.cut(K.tread([0, (y0 + y1) / 2, RHINO.deck], RHINO.platW - 40, RHINO.platD - 40, 34, 1.2), [slot]));
    for (const x of [-i(.55), i(.55)]) K.add(ZINC, K.rod([x, ry(28.3), zt - 12], [x, ry(34.7), zt - 12], 22, 16));
    for (let n = 0; n < 9; n++) K.add(ZINC, K.ball([-pw + i(1.5) + n * (RHINO.platW - t3) / 8, y0 + i(1.5), RHINO.deck], 13, 10), K.ball([-pw + i(1.5) + n * (RHINO.platW - t3) / 8, y1 - i(1.5), RHINO.deck], 13, 10));
    // Front angled 3×3 feet with bolt-down tabs.
    for (const s of [-1, 1]) {
      const x = s * (pw - i(1.5));
      K.add(FRAME, K.tube([x, y0 + i(2.5), zt - i(1.5)], [x, ry(3.2), i(1.5)], t3, t3, [0, 0, 1]), K.box([x - i(2), ry(0), 0], [x + i(2), ry(4.5), i(.25)]));
      K.add(ZINC, K.rod([x, ry(1.2), 0], [x, ry(1.2), i(.45)], 22, 12));
    }
    // Rear 3×3 floor crossmember carrying the fixed uprights, and the floor spine to the tower base.
    K.add(FRAME, K.box([-W, ry(37), 0], [W, ry(40), i(3.75)]), K.box([-i(1.5), ry(40), 0], [i(1.5), ry(49.5), t3]));
    const holeZ = Array.from({ length: 23 }, (_, n) => i(11 + 2 * n));
    for (const s of [-1, 1]) {
      const x = s * (W - i(1.5)), up = K.box([x - i(1.5), ry(37), i(3.75)], [x + i(1.5), ry(40), i(57)]);
      K.add(FRAME, K.cut(up, K.holes(holeZ.map(z => [x, ry(38.5), z] as Vec3), i(1.06), 'y', 120)));
      K.add(CAPS, K.box([x - i(1.5), ry(37), i(57)], [x + i(1.5), ry(40), i(57.3)]));
      // Pivot bracket plates on the upright's back face.
      const ax = s * i(24.5);
      K.add(FRAME, K.box([ax - i(1.9), ry(40), i(3.75)], [ax - i(1.65), ry(43.2), i(8)]), K.box([ax + i(1.65), ry(40), i(3.75)], [ax + i(1.9), ry(43.2), i(8)]));
    }
    // Swing handle arms: 3×3 holed tubes on a low pivot, a crossmember that pushes the trolley clear, loop handles on pop-pin sleeves.
    const pivot: Vec3 = [0, ry(41.6), i(6)], tilt = L.armTilt;
    const arm = (s: Manifold) => K.move(K.k(s.rotate([-tilt, 0, 0])), pivot);
    for (const s of [-1, 1]) {
      const x = s * i(24.5), len = i(51);
      K.add(FRAME, arm(K.cut(K.box([x - i(1.5), -i(1.5), -i(1.5)], [x + i(1.5), i(1.5), len]), K.holes(Array.from({ length: 22 }, (_, n) => [x, 0, i(8 + 2 * n)] as Vec3), i(1.06), 'y', 120))));
      K.add(CAPS, arm(K.box([x - i(1.5), -i(1.5), len], [x + i(1.5), i(1.5), len + i(.3)])));
      K.add(ZINC, K.rod([x - i(1.95), pivot[1], pivot[2]], [x + i(1.95), pivot[1], pivot[2]], 25, 16));
      const hz = i(38);
      K.add(FRAME, arm(K.box([x - i(1.9), -i(1.9), hz - i(4.5)], [x + i(1.9), i(1.9), hz + i(4.5)])));
      K.add(RED, arm(K.rod([x, -i(1.9), hz - i(2.8)], [x, -i(3.1), hz - i(2.8)], 24, 16)), arm(K.cube([x, -i(3.2), hz - i(2.8)], [i(1.8), i(.5), i(.6)])));
      K.add(GRIPS, arm(K.bent([[s * i(22.6), 0, hz + i(3.2)], [s * i(14.2), 0, hz + i(3.2)], [s * i(15.8), 0, hz - i(3.4)], [s * i(22.6), 0, hz - i(3.4)]], 32, 20)));
    }
    K.add(FRAME, arm(K.box([-i(23), -i(1.5), i(14.5)], [i(23), i(1.5), i(17.5)])));
    // 3×6 trolley tower on its floor base with band pegs, pulley bracket, pulley and the Rhino badge.
    const ty0 = ry(49.5), ty1 = ry(55.5);
    K.add(FRAME, K.box([-i(1.5), ty0, t3], [i(1.5), ty1, i(76.2)]), K.box([-i(13), ty0, 0], [i(13), ty1, t3]));
    for (const s of [-1, 1]) {
      K.add(FRAME, K.plate([[ty0, 0], [ty1, 0], [ty1, i(2.2)], [ty0, i(2.2)]], i(.25), 'x', s * i(13) - (s > 0 ? 0 : i(.25))));
      K.add(FRAME, K.box([s * i(13) - i(.5), ty0 - i(2), 0], [s * i(13) + i(.5), ty1 + i(2), i(.25)]));
      K.add(FRAME, K.rod([s * i(8), ty1, i(1.6)], [s * i(8), ry(60.5), i(1.6)], i(1.25), 20));
      // Pulley side plates: bolted to the tower, swept forward over the cable line.
      K.add(FRAME, K.plate([[ty0 + i(1), i(71)], [ty1, i(71)], [ty1, i(76.5)], [ry(52.3), RHINO.tower], [ry(48.6), RHINO.tower], [ry(46.4), i(76.6)], [ry(46.4), i(74.8)], [ty0, i(73.5)]], i(.25), 'x', s > 0 ? i(1.5) : -i(1.75)));
      for (const z of [i(72.2), i(74.8)]) K.add(ZINC, K.rod([s * i(1.75), ry(53.5), z], [s * i(2.05), ry(53.5), z], 24, 6));
    }
    K.add(LABEL, K.box([-i(13) - .8, ty0 + i(1.5), i(.4)], [-i(13) - .1, ty0 + i(4.5), i(2.6)]));
    const pulley: Vec3 = [0, ry(50), i(75.25)];
    K.add(ZINC, K.rod([-i(1.25), pulley[1], pulley[2]], [i(1.25), pulley[1], pulley[2]], i(6), 40), K.rod([-i(1.75), pulley[1], pulley[2]], [i(1.75), pulley[1], pulley[2]], i(.75), 16));
    const badgeAt: Vec3 = [0, ty0, i(68)];
    K.add(BADGE, K.rod(badgeAt, [0, ty0 - 1.2, badgeAt[2]], i(4.2), 40));
    K.add(INK, K.cut(K.rod([0, ty0 - 1, badgeAt[2]], [0, ty0 - 1.6, badgeAt[2]], i(3.7), 40), [K.rod([0, ty0, badgeAt[2]], [0, ty0 - 3, badgeAt[2]], i(3.4), 40)]),
      K.decal(K.fitText('ROGUE', i(2.2), i(.55)), .6, [0, ty0 - 1.1, badgeAt[2] - i(.8)], [1, 0, 0], [0, 0, 1]));
    // Weight trolley riding the tower: side plates, rollers, sleeve hub, flanges, 15.75 in zinc posts, catch pin and cable eye.
    const z = L.sleeveZ, sy = L.sleeveY;
    for (const s of [-1, 1]) K.add(FRAME, K.plate([[sy - i(2.4), z - i(4)], [ty0 + i(3.2), z - i(4)], [ty0 + i(3.2), z + i(5.2)], [sy - i(1), z + i(5.2)], [sy - i(2.4), z + i(3)]], i(.375), 'x', s > 0 ? i(1.75) : -i(2.125)));
    for (const dz of [-i(3), i(4.2)]) K.add(HORN, K.rod([-i(1.5), ty0 - i(.72), z + dz], [i(1.5), ty0 - i(.72), z + dz], i(1.4), 20));
    for (const s of [-1, 1]) K.add(HORN, K.box([s > 0 ? i(1.5) : -i(1.75), ty0 + i(.4), z - i(3.6)], [s > 0 ? i(1.75) : -i(1.5), ty0 + i(3), z + i(4.8)]));
    K.add(FRAME, K.rod([-L.flange, sy, z], [L.flange, sy, z], i(2.6), 32), K.box([-i(1.75), ty0 - i(1.5), z + i(4.4)], [i(1.75), ty0 - i(.2), z + i(5.2)]));
    K.add(ZINC, K.rod([-i(2.4), ry(48.25), z - i(4.4)], [i(2.4), ry(48.25), z - i(4.4)], i(1), 20));
    for (const s of [-1, 1]) {
      K.add(FRAME, K.rod([s * (L.flange - i(.5)), sy, z], [s * L.flange, sy, z], i(4.2), 40));
      K.add(POSTS, K.rod([s * L.flange, sy, z], [s * (L.flange + RHINO.post), sy, z], 50, 40), K.rod([s * (L.flange + RHINO.post), sy, z], [s * (L.flange + RHINO.post + i(.3)), sy, z], i(2.3), 40));
    }
    K.plates(L.plates, [-L.flange, sy, z], [-1, 0, 0]); K.plates(L.plates, [L.flange, sy, z], [1, 0, 0]);
    K.add(CABLE, K.rod([0, ry(47), z + i(5.2)], [0, ry(47), pulley[2]], 6.35, 10), K.rod([0, ty0 - i(.9), z + i(5.2)], [0, ry(47), z + i(5.2)], 6.35, 10));
    // Rhino horn: 2×2 post on the floor spine with a 1 in UHMW hook under the trolley catch pin.
    const hy = ry(48.25), pinZ = z - i(4.4);
    const hookTop = i(35.5 - 4.4 - .5);
    K.add(FRAME, K.box([-i(1), hy - i(1), t3], [i(1), hy + i(1), hookTop - i(2)]));
    K.add(HORN, K.plate([[hy - i(1.6), hookTop - i(2)], [hy + i(1.2), hookTop - i(2)], [hy + i(1.2), hookTop], [hy - i(.6), hookTop], [hy - i(.6), hookTop + i(.3)], [hy - i(1.6), hookTop + i(1.1)]], i(1), 'x', -i(.5)));
  });
}

/* ---------------- Titan SquatMax-MD ---------------- */
export function buildSquatMax(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = squatMaxLayout(p), K = machineKit(api);
  const FRAME = mat('Frame · matte black powder coat', 'source', '#1d1e20', .3, .72), PIN = mat('Loading pin · black', 'source', '#252629', .5, .5);
  const STEEL = mat('Seat post · bare steel', 'source', '#9a9ea3', .85, .35), RED = mat('Pop pins · red anodized', 'source', '#c21f2a', .6, .3);
  const VINYL = mat('Seat · black vinyl', 'liner', '#18191b', 0, .85), RUBBER = mat('Feet, wheels and guide rod', 'liner', '#161718', 0, .85);
  const GRIP = mat('Knurled grips', 'handle', '#2a2b2e', .6, .5), INK = mat('Etched deck lettering', 'source', '#0f1011', .2, .3), CHROME = mat('Eye bolt · chrome', 'source', '#dde0e3', 1, .15);
  return K.finish('SquatMax-MD', L.shift, () => {
    const dz = SQUATMAX.deck, dw = SQUATMAX.deckW / 2, dd = SQUATMAX.deckD / 2, skirt = i(3.5);
    const cut = K.move(K.k(K.rrect(SQUATMAX.cutX, SQUATMAX.cutY, i(6)).extrude(i(2))), [0, 0, dz - i(1)]);
    // Deck: top plate with cut-out, holed skirt, raised insert plate around the opening, etched lettering.
    const holesX = Array.from({ length: 14 }, (_, n) => -dw + i(3) + n * (SQUATMAX.deckW - i(6)) / 13), holesY = Array.from({ length: 11 }, (_, n) => -dd + i(3) + n * (SQUATMAX.deckD - i(6)) / 10);
    K.add(FRAME, K.cut(K.box([-dw, -dd, dz - 5], [dw, dd, dz]), [cut]));
    K.add(FRAME, K.cut(K.union([K.box([-dw, -dd, dz - skirt], [dw, -dd + 3, dz - 5]), K.box([-dw, dd - 3, dz - skirt], [dw, dd, dz - 5])]), K.holes(holesX.map(x => [x, 0, dz - skirt / 2] as Vec3), 25, 'y', SQUATMAX.deckD + 20)));
    K.add(FRAME, K.cut(K.union([K.box([-dw, -dd, dz - skirt], [-dw + 3, dd, dz - 5]), K.box([dw - 3, -dd, dz - skirt], [dw, dd, dz - 5])]), K.holes(holesY.map(y => [0, y, dz - skirt / 2] as Vec3), 25, 'x', SQUATMAX.deckW + 20)));
    K.add(FRAME, K.cut(K.slab([0, 0, dz], i(25), i(20.5), 3, i(1.5)), [cut]));
    K.add(INK, K.decal(K.fitText('SQUAT MAX MD', i(10), i(1.3)), .5, [-dw + i(7.5), -dd + i(3), dz], [1, 0, 0], [0, 1, 0]),
      K.decal(K.fitText('BY TITAN FITNESS', i(7), i(.6)), .5, [-dw + i(7.5), -dd + i(1.6), dz], [1, 0, 0], [0, 1, 0]),
      K.decal(K.fitText('SQUAT MAX MD', i(10), i(1.3)), .5, [dw - i(7.5), dd - i(3), dz], [-1, 0, 0], [0, -1, 0]));
    // Splayed 2×3 legs bolted outside the skirt corners, rubber feet.
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const top: Vec3 = [sx * (dw + i(1)), sy * (dd - i(2.2)), dz - i(1)], foot: Vec3 = [sx * (SQUATMAX.W / 2 - i(1.5)), sy * (SQUATMAX.D / 2 - i(1.75)), i(1)];
      K.add(FRAME, K.tube(top, foot, i(2), i(3), [0, 1, 0]));
      K.add(RUBBER, K.box([foot[0] - i(1.5), foot[1] - i(1.75), 0], [foot[0] + i(1.5), foot[1] + i(1.75), i(1.1)]));
      for (const zz of [dz - i(1.2), dz - i(2.6)]) K.add(ZINC, K.rod([sx * dw, sy * (dd - i(2.2)), zz], [sx * (dw + i(2.05)), sy * (dd - i(2.2)), zz], 16, 12));
    }
    // Rear wheels on the seat-side legs, front knurled carry handle.
    for (const sy of [-1, 1]) K.add(RUBBER, K.rod([-i(20.3), sy * i(16.6), i(2.1)], [-i(19.3), sy * i(16.6), i(2.1)], i(3), 28));
    K.add(GRIP, K.bent([[-i(7), -dd, dz - i(4.4)], [-i(7), -dd - i(2.4), dz - i(4.4)], [i(7), -dd - i(2.4), dz - i(4.4)], [i(7), -dd, dz - i(4.4)]], 32, 20));
    // Floor guide frame with band pegs and the guide rod.
    const fx = i(16), fy = i(12), t2 = i(2);
    K.add(FRAME, K.box([-fx, -fy, 0], [fx, -fy + t2, t2]), K.box([-fx, fy - t2, 0], [fx, fy, t2]), K.box([-fx, -fy + t2, 0], [-fx + t2, fy - t2, t2]), K.box([fx - t2, -fy + t2, 0], [fx, fy - t2, t2]), K.box([-fx + t2, -i(1), 0], [fx - t2, i(1), t2]));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const zz of [i(.8), i(1.6)]) K.add(FRAME, K.rod([sx * fx, sy * (fy - i(1)), zz], [sx * (fx + i(3)), sy * (fy - i(1)), zz], i(.75), 14));
    K.add(RUBBER, K.rod([0, 0, t2], [0, 0, L.carriage + SQUATMAX.pin], i(1.25), 24));
    // Cross carriage, 21 in loading pin with top eye bolt and transformer pin.
    const cz = L.carriage, carriage = K.union([0, 90].map(a => K.k(K.k(K.rrect(i(16), i(4.5), i(2)).extrude(6.35)).rotate([0, 0, 45 + a]))));
    K.add(PIN, K.move(carriage, [0, 0, cz]), K.rod([0, 0, cz - i(3)], [0, 0, L.plateBase + SQUATMAX.pin], SQUATMAX.pinD, 40));
    const top = L.plateBase + SQUATMAX.pin;
    K.add(CHROME, K.move(K.k(K.cut(K.k(K.rrect(38, 44, 19).extrude(8)), [K.k(K.k(K.rrect(22, 28, 11).extrude(20)).translate([0, 0, -5]))]).rotate([90, 0, 0])), [0, 4, top + 22]), K.rod([0, 0, top], [0, 0, top + 4], 30, 20));
    K.add(PIN, K.rod([-i(2.6), 0, top - i(1.2)], [i(2.6), 0, top - i(1.2)], i(.6), 16), K.cube([i(2.9), 0, top - i(1.2)], [3, i(1.4), i(1.4)]));
    K.plates(L.plates, [0, 0, L.plateBase], [0, 0, 1]);
    // Grab handles: 32 mm posts through deck sleeves, bent out to knurled grips at 59.5 in.
    for (const s of [-1, 1]) {
      const x = s * i(11.5), y = -i(10.5), gz = SQUATMAX.H - 16;
      K.add(FRAME, K.bent([[x, y, dz - i(2.5)], [x, y, gz], [x + s * i(1.5), y, gz]], 32, 24), K.box([x - i(1.2), y - i(1.2), dz - i(3)], [x + i(1.2), y + i(1.2), dz + i(.4)]));
      K.add(GRIP, K.rod([x + s * i(1.4), y, gz], [x + s * i(6.5), y, gz], 32.6, 24), K.ball([x + s * i(6.5), y, gz], 32.6, 16));
    }
    // Adjustable round seat: sleeve on the left skirt with red pop pin, bare-steel inner post, gusseted arm, round pad.
    const px = -dw - i(1.25), py = i(8), seatZ = i(30.5);
    K.add(FRAME, K.box([px - i(1.25), py - i(1.25), i(10)], [px + i(1.25), py + i(1.25), dz - i(.5)]));
    K.add(RED, K.rod([px, py - i(1.25), i(13)], [px, py - i(2.6), i(13)], i(.8), 16), K.rod([px, py - i(2.4), i(13)], [px, py - i(2.8), i(13)], i(1.1), 20));
    K.add(STEEL, K.box([px - i(1), py - i(1), i(11)], [px + i(1), py + i(1), seatZ - i(6)]));
    K.add(FRAME, K.box([px - i(1), py - i(1), seatZ - i(6)], [px + i(1), py + i(1), seatZ]), K.box([px - i(1), py - i(1), seatZ - i(.25)], [-i(10), py + i(1), seatZ]),
    );
    K.add(FRAME, K.tube([px, py, seatZ - i(5.5)], [-i(15.5), py, seatZ - i(.25)], i(1.5), i(.25), [0, 1, 0]));
    K.add(VINYL, K.hull([K.move(K.k(K.M.cylinder(i(3), i(6.5) - 8, i(6.5) - 8, 48)), [-i(14.25), py, seatZ]), K.move(K.k(K.M.cylinder(i(3) - 16, i(6.5), i(6.5), 48)), [-i(14.25), py, seatZ + 8])]));
  });
}

/* ---------------- Titan Tibia Dorsi Calf Machine ---------------- */
export function buildTibia(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = tibiaLayout(p), K = machineKit(api), P = TIBIA.pivot;
  const FRAME = mat('Frame · black powder coat', 'source', '#1c1d1f', .3, .6), TREAD = mat('Footplate · diamond plate', 'source', '#252628', .55, .45);
  const VINYL = mat('Shin pad · black vinyl', 'liner', '#141516', 0, .82), BEARING = mat('Pillow-block bearings', 'source', '#1f2022', .45, .55);
  const SLEEVE = mat('Olympic sleeves · black', 'source', '#1a1b1c', .45, .45), BADGE = mat('Titan badge · brushed stainless', 'source', '#b9bcbf', .9, .35), INK = mat('Badge ink', 'source', '#151515', 0, .5);
  return K.finish('Tibia Dorsi', L.shift, () => {
    const sx = i(9.4), t2 = i(2);
    // Side A-frames: floor channel, tall rear bearing post leaning forward, front brace; flat tie bars front and back.
    for (const s of [-1, 1]) {
      const x = s * sx;
      K.add(FRAME, K.box([x - i(1), -TIBIA.D / 2, 0], [x + i(1), TIBIA.D / 2, i(1)]));
      const foot: Vec3 = [x, i(6.2), i(.9)], top: Vec3 = [x, i(2.35), TIBIA.H - i(.25)], dir = top.map((v, n) => v - foot[n]) as Vec3;
      K.add(FRAME, K.tube(foot, top, t2, t2, [0, 1, 0]), K.box([x - i(1.05), top[1] - i(1.05), TIBIA.H - i(.25)], [x + i(1.05), top[1] + i(1.05), TIBIA.H]));
      K.add(FRAME, K.tube([x, -i(6.4), i(.9)], [x, foot[1] + dir[1] * .3, foot[2] + dir[2] * .3], t2, i(1.5), [0, 1, 0]));
      // Pillow block on the post's inner face, stub shaft into the cradle.
      const inner = x - s * i(1.05);
      K.add(BEARING, K.box([Math.min(inner, inner - s * i(.6)), P[1] - i(1.2), P[2] - i(2.1)], [Math.max(inner, inner - s * i(.6)), P[1] + i(1.2), P[2] + i(2.1)]),
        K.rod([inner, P[1], P[2]], [inner - s * i(1.1), P[1], P[2]], i(2.2), 32));
      for (const dz of [-i(1.6), i(1.6)]) K.add(ZINC, K.rod([inner - s * i(.6), P[1], P[2] + dz], [inner - s * i(1), P[1], P[2] + dz], i(.7), 6));
      K.add(ZINC, K.rod([inner - s * i(1.1), P[1], P[2]], [s * i(7.1), P[1], P[2]], i(1), 20));
    }
    for (const y of [-TIBIA.D / 2, TIBIA.D / 2 - i(2)]) K.add(FRAME, K.box([-sx - i(1), y, 0], [sx + i(1), y + i(2), i(.25)]));
    // Titan badge on the left post's outer face.
    const bx = -sx - i(1) - 1.2, b0: Vec3 = [bx, i(5.6), i(2.2)], b1: Vec3 = [bx, i(2.8), i(10.6)];
    K.add(BADGE, K.tube(b0, b1, i(1.5), 1.2, [1, 0, 0]));
    const along = (() => { const d = b1.map((v, n) => v - b0[n]); const l = Math.hypot(...d); return d.map(v => v / l) as Vec3; })();
    K.add(INK, K.decal(K.fitText('TITAN', i(5), i(.95)), .5, [bx - .6, (b0[1] + b1[1]) / 2, (b0[2] + b1[2]) / 2], [0, along[1], along[2]], [0, along[2], -along[1]]));
    // Pivoting cradle (built about the pivot, then rotated by the toe-raise angle).
    const cr = (m: Manifold) => K.move(K.k(m.rotate([L.tilt, 0, 0])), P);
    const side: Vec2[] = [[-i(1.2), i(1.6)], [i(1.7), i(1.6)], [i(2.5), i(.6)], [i(2.5), -i(.4)], [i(.1), -i(5)], [-i(1.6), -i(7.6)], [-i(4), -i(7.6)], [-i(5.4), -i(5.3)], [-i(5.4), -i(.8)]];
    for (const s of [-1, 1]) K.add(FRAME, cr(K.plate(side, i(.25), 'x', s > 0 ? i(7) : -i(7.25))));
    // Heel/footplate: diamond plate sloping up behind the foot to just under the pivot, meeting the pad in a V.
    const plateAt = (m: Manifold) => cr(K.move(K.k(m.rotate([55, 0, 0])), [0, -i(.2), -i(3.2)]));
    K.add(TREAD, plateAt(K.box([-i(7), 0, -i(.19)], [i(7), i(4.6), 0])), plateAt(K.tread([0, i(2.3), 0], i(13.4), i(4), 26, 1)));
    K.add(FRAME, cr(K.box([-i(7.25), -i(5.4), -i(2.8)], [i(7.25), -i(3.9), -i(.5)])));
    for (const x of [-i(4.5), 0, i(4.5)]) K.add(ZINC, cr(K.rod([x, -i(5.4), -i(1.65)], [x, -i(5.75), -i(1.65)], i(.8), 6)));
    K.add(VINYL, cr(K.k(K.pad([0, 0, 0], i(14), i(6.6), i(2.4), 18, 9).rotate([90, 0, 0])).translate([0, -i(1.5), -i(3.9)])));
    // Sleeve hub through the cradle, collars and 7 in Olympic sleeves (fixed to the cradle, so they swing with it).
    const S = L.sleeve;
    K.add(SLEEVE, K.rod([-L.collar, S[1], S[2]], [L.collar, S[1], S[2]], i(1.9), 32));
    for (const s of [-1, 1]) K.add(SLEEVE, K.rod([s * (L.collar - i(.55)), S[1], S[2]], [s * L.collar, S[1], S[2]], i(2.8), 40), K.rod([s * L.collar, S[1], S[2]], [s * TIBIA.W / 2, S[1], S[2]], TIBIA.sleeveD, 40));
    K.plates(L.plates, [-L.collar, S[1], S[2]], [-1, 0, 0]); K.plates(L.plates, [L.collar, S[1], S[2]], [1, 0, 0]);
  });
}

/* ---------------- DIY belt squat ---------------- */
export function buildDiyBelt(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = diyBeltLayout(p), K = machineKit(api), D = DIY_BELT;
  const PINE = mat('Framing lumber · pine', 'source', '#d7b687', 0, .85), PLY = mat('Plywood tops and base', 'source', '#c7a473', 0, .8);
  const MAT = mat('Rubber stall-mat tops', 'liner', '#1b1b1c', 0, .95), STEEL = mat('Steel hinge and leg · black paint', 'source', '#2b2c2e', .55, .45), PIPE = mat('Loading horn · galvanised pipe', 'source', '#9ca0a4', .85, .38);
  return K.finish('DIY belt squat', L.shift, () => {
    // Two platform boxes: stacked 2×6 walls, plywood top and rubber mat.
    for (const s of [-1, 1]) {
      const x0 = s > 0 ? D.gap / 2 : -D.gap / 2 - D.boxW, x1 = x0 + D.boxW, y0 = -D.boxD / 2, y1 = D.boxD / 2, t = i(1.5);
      for (const [z0, z1] of [[0, i(5.95)], [i(6.05), D.boxH]]) {
        K.add(PINE, K.box([x0, y0, z0], [x1, y0 + t, z1]), K.box([x0, y1 - t, z0], [x1, y1, z1]), K.box([x0, y0 + t + 1, z0], [x0 + t, y1 - t - 1, z1]), K.box([x1 - t, y0 + t + 1, z0], [x1, y1 - t - 1, z1]));
      }
      K.add(PINE, K.box([x0 + t + 1, -i(.75), 0], [x1 - t - 1, i(.75), D.boxH]));
      K.add(PLY, K.box([x0, y0, D.boxH], [x1, y1, D.boxH + i(.75) - i(.35)]));
      K.add(MAT, K.box([x0 + 6, y0 + 6, D.boxH + i(.75) - i(.35)], [x1 - 6, y1 - 6, D.boxH + i(.75)]));
      for (const [x, y] of [[x0 + i(2), y0 + i(2)], [x1 - i(2), y0 + i(2)], [x0 + i(2), y1 - i(2)], [x1 - i(2), y1 - i(2)]]) K.add(ZINC, K.rod([x, y, D.boxH + i(.4)], [x, y, D.boxH + i(.41)], 9, 8));
    }
    // Hinge: plywood base, steel base plate, twin ears and pin at the pivot.
    const P = D.pivot;
    K.add(PLY, K.box([-i(8), i(16), 0], [i(8), i(29), i(.75)]));
    K.add(STEEL, K.box([-i(3), P[1] - i(2.5), i(.75)], [i(3), P[1] + i(2.5), i(1)]));
    for (const s of [-1, 1]) K.add(STEEL, K.plate([[P[1] - i(2.5), i(1)], [P[1] + i(2.5), i(1)], [P[1] + i(1.2), P[2] + i(1.4)], [P[1] - i(1.2), P[2] + i(1.4)]], i(.25), 'x', s * (D.leverW / 2 + i(.05)) - (s < 0 ? i(.25) : 0)));
    K.add(ZINC, K.rod([-i(2.3), P[1], P[2]], [i(2.3), P[1], P[2]], i(.625), 16));
    for (const [x, y] of [[-i(2.4), P[1] - i(2)], [i(2.4), P[1] - i(2)], [-i(2.4), P[1] + i(2)], [i(2.4), P[1] + i(2)]]) K.add(ZINC, K.rod([x, y, i(1)], [x, y, i(1.2)], 14, 8));
    // Lever: doubled 2×6 on edge with through-bolts, 2 in pipe horn across its tip with washers.
    const a = L.at(-i(2)), b = L.at(D.arm + D.tail);
    for (const s of [-1, 1]) {
      const off = s * (D.leverW / 4 + .25);
      K.add(PINE, K.tube([off, a[1], a[2]], [off, b[1], b[2]], D.leverW / 2 - .5, D.leverH, L.up));
    }
    for (const t of [i(8), i(22), i(36)]) { const q = L.at(t); K.add(ZINC, K.rod([-D.leverW / 2 - 3, q[1], q[2]], [D.leverW / 2 + 3, q[1], q[2]], i(.5), 12)); }
    const H = L.horn;
    K.add(PIPE, K.rod([-D.horn, H[1], H[2]], [D.horn, H[1], H[2]], 48.3, 40));
    for (const s of [-1, 1]) K.add(ZINC, K.rod([s * D.leverW / 2, H[1], H[2]], [s * L.washer, H[1], H[2]], i(3.5), 32));
    K.plates(L.plates, [-L.washer, H[1], H[2]], [-1, 0, 0]); K.plates(L.plates, [L.washer, H[1], H[2]], [1, 0, 0]);
    // Rest leg under the horn (deployed at rest, folded along the lever when lifted).
    const under = (t: number): Vec3 => { const q = L.at(t); return [0, q[1] - L.up[1] * D.leverH / 2, q[2] - L.up[2] * D.leverH / 2]; };
    const hinge = under(D.arm - i(1.6));
    K.add(STEEL, K.box([-i(.9), hinge[1] - i(.8), hinge[2] - i(.6)], [i(.9), hinge[1] + i(.8), hinge[2] + 1]));
    if (!p.pose) { K.add(STEEL, K.rod(hinge, [0, H[1], i(.25)], i(1.5), 20), K.box([-i(1.5), H[1] - i(2.5), 0], [i(1.5), H[1] + i(2.5), i(.25)])); }
    else K.add(STEEL, K.rod([0, hinge[1], hinge[2] - i(.9)], [0, under(D.arm - i(12))[1], under(D.arm - i(12))[2] - i(.9)], i(1.5), 20));
    // Chain from an eye bolt on the lever up through the gap to a carabiner at hip height.
    const eye = L.at(i(22)), eyeTop: Vec3 = [0, eye[1] + L.up[1] * D.leverH / 2, eye[2] + L.up[2] * D.leverH / 2];
    K.add(ZINC, K.move(K.k(K.cut(K.k(K.rrect(34, 40, 17).extrude(7)), [K.k(K.k(K.rrect(18, 24, 9).extrude(20)).translate([0, 0, -5]))]).rotate([90, 0, 90])), [-3.5, eyeTop[1], eyeTop[2] + 14]));
    const hip = p.pose ? i(32) : i(17);
    K.add(CHAIN, chain(K, [0, eyeTop[1], hip], eyeTop[2] + 22), carabiner(K, [0, eyeTop[1], hip + i(3)]));
  });
}

/* ---------------- The Tib Bar Guy Tib Bar Pro ---------------- */
export function buildTibPro(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = tibProLayout(p), K = machineKit(api), T = TIB_PRO, r = T.padD / 2, h = T.bar / 2;
  const FRAME = mat('Frame · textured black', 'source', '#1b1c1e', .35, .6), FOAM = mat('Foam pads', 'liner', '#151617', 0, .95), CAPS = mat('Pad end caps', 'liner', '#48494c', 0, .6);
  const STEEL = mat('Loading bar · stainless', 'source', '#c9cdd0', .95, .22), CLAMP = mat('Weight clamp · black ABS', 'source', '#18191a', .1, .45);
  const DECAL = mat('Tib Bar Guy decal', 'source', '#0d0d0e', 0, .5), WHITE = mat('Decal lettering · white', 'source', '#f2f2f0', 0, .5);
  return K.finish('Tib Bar Pro', L.shift, () => {
    for (const y of [0, T.rear]) {
      K.add(FRAME, K.rod([-h, y, r], [h, y, r], T.barD, 32));
      for (const s of [-1, 1]) {
        K.add(FOAM, K.rod([s * i(.85), y, r], [s * h, y, r], T.padD, 40));
        K.add(CAPS, K.rod([s * h, y, r], [s * (h + 3), y, r], T.padD - 6, 40));
      }
    }
    // Stem with flange, connector to the rear bar, decal, stainless loading bar and clamp.
    K.add(FRAME, K.rod(L.at(-8), L.at(T.stem), 38, 32), K.rod(L.at(T.stem), L.at(L.loadStart), T.flangeD, 48), K.rod([0, T.rear, r], L.at(45), 32, 28), K.ball(L.at(0), 42, 20));
    const n: Vec3 = [0, -L.a[2], L.a[1]], mid = L.at(T.stem * .52);
    K.add(DECAL, K.tube(mid.map((v, k) => v - L.a[k] * 18 + n[k] * 17.4) as Vec3, mid.map((v, k) => v + L.a[k] * 18 + n[k] * 17.4) as Vec3, 28, 3.5, n));
    K.add(WHITE, K.decal(K.fitText('T', 16, 20), .6, mid.map((v, k) => v + n[k] * 19.1) as Vec3, [1, 0, 0], L.a));
    K.add(STEEL, K.rod(L.at(L.loadStart), L.at(L.loadStart + T.load), T.loadD, 48));
    K.plates(L.plates, L.at(L.loadStart), L.a);
    K.add(CLAMP, K.revolveAlong([[T.loadD / 2 + .3, 0], [T.clampD / 2, 0], [T.clampD / 2, T.clampW], [T.loadD / 2 + .3, T.clampW]], L.at(L.stackEnd), L.a, 40));
  });
}

/* ---------------- Titan Single Leg Squat Roller ---------------- */
export function buildSquatRoller(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!(SLSR.heights as readonly number[]).includes(p.height)) throw Error('Unsupported roller height.');
  const K = machineKit(api), t = SLSR.tube, h = i(p.height);
  const FRAME = mat('Frame · matte black powder coat', 'source', '#1c1d1f', .3, .7), CAPS = mat('Rubber feet and caps', 'liner', '#161718', 0, .8);
  const VINYL = mat('Roller pad · HeftyGrip vinyl', 'liner', '#1e1f21', 0, .88), BADGE = mat('Titan badge · brushed stainless', 'source', '#b9bcbf', .9, .35), INK = mat('Badge ink', 'source', '#151515', 0, .5);
  return K.finish('Single Leg Squat Roller', [0, 0], () => {
    const X = SLSR.W / 2 - i(1.25), fz0 = i(.3), fz1 = fz0 + t, Y = SLSR.D / 2;
    for (const s of [-1, 1]) {
      const x = s * X;
      K.add(FRAME, K.box([x - t / 2, -Y + i(2.5), fz0], [x + t / 2, Y - i(2.5), fz1]));
      for (const e of [-1, 1]) K.add(CAPS, K.hull([K.box([x - i(1.2), e > 0 ? Y - i(2.7) : -Y, 0], [x + i(1.2), e > 0 ? Y : -Y + i(2.7), i(.3)]), K.box([x - i(1.08), e > 0 ? Y - i(2.7) : -Y + i(.4), i(.3)], [x + i(1.08), e > 0 ? Y - i(.4) : -Y + i(2.7), fz1 + i(.12)])]));
      // Post with 12 station holes, cap and the sliding roller carriage with its pull knob.
      const post = K.box([x - t / 2, -t / 2, fz1], [x + t / 2, t / 2, SLSR.H - i(.3)]);
      K.add(FRAME, K.cut(post, K.holes(SLSR.heights.map(v => [x, 0, i(v - 1.2)] as Vec3), i(.45), 'y', 120)));
      K.add(CAPS, K.box([x - i(1.05), -i(1.05), SLSR.H - i(.3)], [x + i(1.05), i(1.05), SLSR.H]));
      K.add(FRAME, K.box([x - i(1.25), -i(1.25), h - i(2)], [x + i(1.25), i(1.25), h + i(2)]));
      K.add(CAPS, K.rod([x, -i(1.25), h - i(1.2)], [x, -i(2.3), h - i(1.2)], i(1.25), 24));
      K.add(FRAME, K.rod([x - s * i(1.25), 0, h], [s * i(7.7), 0, h], i(1), 20));
      // Gusset between post and crossbar, bolts through the foot.
      K.add(FRAME, K.plate([[x - s * t / 2, fz1], [x - s * i(4), fz1], [x - s * t / 2, fz1 + i(3.2)]].map(([u, v]) => [u, v] as Vec2), i(.2), 'y', i(1.1)));
      for (const z of [fz0 + i(.6), fz0 + i(1.4)]) K.add(ZINC, K.rod([x - s * t / 2, -i(.5), z], [x - s * (t / 2 + i(.18)), -i(.5), z], i(.6), 6));
    }
    K.add(FRAME, K.box([-X + t / 2, i(1.1), fz0], [X - t / 2, i(1.1) + t, fz1]));
    K.add(BADGE, K.box([-i(2.3), i(1.1) - 1, fz0 + i(.45)], [i(2.3), i(1.1), fz1 - i(.45)]));
    K.add(INK, K.decal(K.fitText('TITAN FITNESS', i(3.6), i(.55)), .4, [0, i(1.1) - 1, (fz0 + fz1) / 2], [1, 0, 0], [0, 0, 1]));
    for (const x of [-i(5), i(5)]) K.add(ZINC, K.rod([x, i(1.1), fz1], [x, i(1.1), fz1 + i(.2)], i(.6), 6));
    // Roller: 16 × 4 in foam with gathered vinyl ends.
    const R = SLSR.rollerD / 2, len = SLSR.roller;
    K.add(VINYL, K.revolveAlong([[13.5, 0], [R - 12, 0], [R - 4, 3], [R, 12], [R, len - 12], [R - 4, len - 3], [R - 12, len], [13.5, len]], [-len / 2, 0, h], [1, 0, 0], 48));
  });
}

/* ---------------- Bells of Steel Belt Squat Machine ---------------- */
export function buildBos(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = bosLayout(p), K = machineKit(api), P = BOS.pivot;
  const FRAME = mat('Frame · matte black powder coat', 'source', '#1c1d1f', .3, .7), BEARING = mat('Zerk pillow-block bearings · green', 'source', '#2f6b45', .3, .45);
  const PEGS = mat('Weight pegs · black', 'source', '#202124', .4, .5), GRIP = mat('Grab bar', 'handle', '#26272a', .5, .5), BADGE = mat('Bells of Steel badge', 'source', '#111213', .1, .5), WHITE = mat('Badge lettering · white', 'source', '#eeeeea', 0, .5);
  return K.finish('Bells of Steel belt squat', L.shift, () => {
    // Platform: 2×3 frame with a steel plate top and chain slot, four band pegs.
    const px = i(19), y0 = -BOS.D / 2, y1 = i(9.5), zt = i(3);
    const slot = K.box([-i(1.25), -i(8.5), 0], [i(1.25), -i(5), zt + 5]);
    K.add(FRAME, K.cut(K.box([-px, y0, zt - 5], [px, y1, zt]), [slot]), K.box([-px, y0, 0], [-px + i(2), y1, zt - 5]), K.box([px - i(2), y0, 0], [px, y1, zt - 5]), K.box([-px + i(2), y0, 0], [px - i(2), y0 + i(2), zt - 5]), K.box([-px + i(2), y1 - i(2), 0], [px - i(2), y1, zt - 5]));
    for (const s of [-1, 1]) for (const y of [-i(22), i(6.5)]) K.add(FRAME, K.rod([s * px, y, i(1.5)], [s * i(23.75), y, i(1.5)], i(1.25), 20), K.rod([s * i(23.75), y, i(1.5)], [s * i(24), y, i(1.5)], i(2), 24));
    // Rear tower: base rails, 3×3 posts, top crossbeam carrying the arm bearings, diagonal braces.
    for (const s of [-1, 1]) {
      const x = s * i(12);
      K.add(FRAME, K.box([x - i(1), y1, 0], [x + i(1), BOS.D / 2, i(3)]), K.box([x - i(1.5), i(22.5), i(3)], [x + i(1.5), BOS.D / 2, i(20.5)]), K.tube([x, i(10.5), i(2.5)], [x, i(22.5), i(16.5)], i(2), i(2), [0, -1, 1]));
    }
    K.add(FRAME, K.box([-i(13.5), i(22.5), i(17.5)], [i(13.5), BOS.D / 2, i(20.5)]), K.box([-i(11), y1, 0], [i(11), y1 + i(2), i(3)]), K.box([-i(10.5), i(23.5), 0], [i(10.5), i(25.5), i(2)]));
    for (const x of [-i(9.9), -i(6.1), i(6.1), i(9.9)]) {
      K.add(BEARING, K.box([x - i(.7), i(22.1), P[2] - i(2.4)], [x + i(.7), i(22.5), P[2] + i(2.4)]), K.rod([x - i(.7), P[1], P[2]], [x + i(.7), P[1], P[2]], i(2.4), 32));
      for (const dz of [-i(1.8), i(1.8)]) K.add(ZINC, K.rod([x, i(22.1), P[2] + dz], [x, i(21.8), P[2] + dz], i(.7), 6));
    }
    // Lever: twin 2×3 arms, 52.5 in horn crossbar with brackets, mid crossbar with badge, chain hook (rotated about the pivot).
    const lv = (m: Manifold) => K.move(K.k(m.rotate([-L.angle, 0, 0])), P), tipY = -BOS.reach;
    for (const s of [-1, 1]) K.add(FRAME, lv(K.box([s * i(8) - i(1), tipY, -i(1.5)], [s * i(8) + i(1), 0, i(1.5)])), lv(K.rod([s * i(8) - i(1), 0, 0], [s * i(8) + i(1), 0, 0], i(3), 24)));
    K.add(ZINC, K.rod([-i(10.8), P[1], P[2]], [i(10.8), P[1], P[2]], i(1), 16));
    const bx = L.bracketX;
    K.add(FRAME, lv(K.box([-bx + i(1.3), tipY - i(1), -i(1.5)], [bx - i(1.3), tipY + i(1), i(1.5)])));
    for (const s of [-1, 1]) {
      K.add(FRAME, lv(K.box([s * bx - i(1.3), tipY - i(1.75), -i(1.5)], [s * bx + i(1.3), tipY + i(1.75), i(1.5)])));
      K.add(PEGS, lv(K.rod([s * bx, tipY - i(1.75), 0], [s * bx, tipY - i(4.5), 0], i(1), 16)), lv(K.rod([s * bx, tipY - i(4.5), 0], [s * bx, tipY - i(4.75), 0], i(1.9), 20)));
      for (const dy of [-i(1), i(1)]) K.add(ZINC, lv(K.rod([s * bx, tipY + dy, i(1.5)], [s * bx, tipY + dy, i(1.7)], i(.6), 6)));
      // Weight peg: collar and 13.5 in loadable peg, horizontal off the bracket end or standing on its top.
      const base = L.hornBase(s), a = L.hornAxis(s), q = (t: number) => base.map((v, n) => v + a[n] * t) as Vec3;
      K.add(PEGS, K.rod(q(0), q(i(.5)), i(2.6), 32), K.rod(q(i(.5)), q(i(.5) + BOS.peg + i(.25)), BOS.pegD, 40));
      if (!L.vertical) K.add(PEGS, K.rod([s * (BOS.narrow / 2 - i(1.4)), L.tip[1], L.tip[2]], q(0), i(1.9), 24));
      K.plates(L.plates, q(i(.5)), a);
    }
    const midY = i(6) - P[1];
    K.add(FRAME, lv(K.box([-i(12), midY - i(1), -i(1.5)], [i(12), midY + i(1), i(1.5)])));
    K.add(BADGE, lv(K.box([-i(3.2), midY - i(1) - 1, -i(.55)], [i(3.2), midY - i(1), i(.55)])));
    K.add(WHITE, lv(K.decal(K.fitText('BELLS OF STEEL', i(5.6), i(.55)), .4, [0, midY - i(1) - 1, 0], [1, 0, 0], [0, 0, 1])));
    const hook = K.move(K.k(K.cut(K.k(K.rrect(30, 34, 15).extrude(8)), [K.k(K.k(K.rrect(14, 18, 7).extrude(20)).translate([0, 0, -5]))]).rotate([90, 0, 90])), [-4, 0, -i(1.5) - 12]);
    K.add(ZINC, lv(K.move(hook, [0, tipY + i(.2), 0])));
    const hookPt = rotX([0, P[1] + tipY + i(.2), P[2] - i(1.5) - 26], P, -L.angle);
    K.add(CHAIN, chain(K, [0, hookPt[1], hookPt[2]], zt + i(2)), carabiner(K, [0, hookPt[1], zt + i(4)], i(3)));
    // Pivoting uprights: base bearings on the platform, 13 height holes, top grab bar; sleeves ride the mid crossbar.
    const uy = i(6), midZ = rotX([0, uy, P[2]], P, -L.angle)[2];
    for (const s of [-1, 1]) {
      const x = s * i(13);
      K.add(FRAME, K.cut(K.box([x - i(1), uy - i(1), zt + i(.4)], [x + i(1), uy + i(1), BOS.H]), K.holes(Array.from({ length: 13 }, (_, n) => [x, uy, i(18 + n)] as Vec3), i(.55), 'y', 100)));
      K.add(FRAME, K.box([x - i(1.4), uy - i(1.4), midZ - i(2)], [x + i(1.4), uy + i(1.4), midZ + i(2)]));
      K.add(ZINC, K.rod([x, uy - i(1.5), midZ - i(2.4)], [x, uy + i(1.5), midZ - i(2.4)], i(.55), 12));
      for (const dx of [-i(1.8), i(1.8)]) K.add(BEARING, K.box([x + dx - i(.6), uy - i(1.2), zt], [x + dx + i(.6), uy + i(1.2), zt + i(.5)]), K.rod([x + dx - i(.6), uy, zt + i(1.4)], [x + dx + i(.6), uy, zt + i(1.4)], i(2.2), 28));
      K.add(ZINC, K.rod([x - i(2.6), uy, zt + i(1.4)], [x + i(2.6), uy, zt + i(1.4)], i(.8), 12));
    }
    K.add(GRIP, K.rod([-i(12), uy, i(38.4)], [i(12), uy, i(38.4)], i(1.25), 24));
  });
}

/* ---------------- APEX Barrett Belt Squat ---------------- */
export function buildBarrett(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!(BARRETT.levels as readonly number[]).includes(p.handle)) throw Error('Unsupported handle level.');
  const L = barrettLayout(p), K = machineKit(api), z = BARRETT.beamZ;
  const FRAME = mat('Frame · black powder coat', 'source', '#18191b', .35, .55), STAINLESS = mat('Stainless tongue, pins and inner post', 'source', '#c2c6c9', .95, .25);
  const CHROME = mat('Loading bar · chrome', 'source', '#e1e4e6', 1, .12), RUBBER = mat('Rubber bumper and foot', 'liner', '#141414', 0, .85);
  const KNOBS = mat('Knurled knobs and handle', 'handle', '#222325', .6, .42), PLATE = mat('Black stainless protection plates', 'source', '#2a2b2e', .8, .3), INK = mat('APEX lettering', 'source', '#8e9194', .6, .4);
  return K.finish('Barrett belt squat', L.shift, () => {
    // 2×3 beam, stainless mounting tongue and angled EZ-clip hook-up with its pin.
    K.add(FRAME, K.box([-i(1), -i(9.5), z - i(1.5)], [i(1), i(11), z + i(1.5)]), K.tube(BARRETT.ezA, BARRETT.ezB, BARRETT.ez, BARRETT.ez));
    K.add(STAINLESS, K.box([-i(.875), i(11), z - i(.875)], [i(.875), BARRETT.L / 2, z + i(.875)]), K.rod([-i(1.3), BARRETT.ezB[1] + i(1.2), BARRETT.ezB[2] + i(.9)], [i(1.3), BARRETT.ezB[1] + i(1.2), BARRETT.ezB[2] + i(.9)], i(.5), 16));
    K.add(PLATE, K.box([i(1), i(.5), z - i(1.3)], [i(1) + 1.2, i(8), z + i(1.3)]));
    K.add(INK, K.decal(K.fitText('APEX', i(3), i(.8)), .4, [i(1) + 1.2, i(4.25), z], [0, 1, 0], [0, 0, 1]));
    for (const y of [-i(8), i(9)]) K.add(ZINC, K.rod([i(1), y, z], [i(1.12), y, z], i(.55), 8), K.rod([-i(1), y, z], [-i(1.12), y, z], i(.55), 8));
    // Spring kickstand with rubber foot and knurled release knob.
    K.add(FRAME, K.box([-i(.625), -i(3.6), i(.6)], [i(.625), -i(2.35), z - i(1.5)]), K.box([-i(1.1), -i(3.9), z - i(2.1)], [i(1.1), -i(2.05), z - i(1.5)]));
    K.add(RUBBER, K.box([-i(1), -i(4.2), 0], [i(1), -i(1.75), i(.6)]));
    K.add(KNOBS, K.rod([-i(.625), -i(2.97), i(2.2)], [-i(3.2), -i(2.97), i(2.2)], i(.9), 20));
    K.add(ZINC, K.rod([i(.7), -i(3.3), i(1)], [i(.7), -i(6.2), z - i(1.6)], i(.35), 10));
    // Handle: angle-adjust side plates with mag pin, outer post, stainless inner post with 9 holes, knurled 19.5 in T-bar.
    for (const s of [-1, 1]) K.add(FRAME, K.plate([[-i(7.4), z - i(1.8)], [-i(1.6), z - i(1.8)], [-i(1.6), z + i(4)], [-i(3.2), z + i(5.6)], [-i(5.8), z + i(5.6)], [-i(7.4), z + i(4)]], i(.25), 'x', s > 0 ? i(1) : -i(1.25)));
    K.add(KNOBS, K.rod([i(1.25), -i(3.4), z + i(2.8)], [i(2.5), -i(3.4), z + i(2.8)], i(1.2), 24));
    const hx = -i(4.5), lift = i(p.handle - 5), barZ = BARRETT.H - i(.625) + lift;
    K.add(FRAME, K.box([-i(1), hx - i(1), z + i(1.5)], [i(1), hx + i(1), i(16)]));
    K.add(KNOBS, K.rod([0, hx - i(1), i(14.6)], [0, hx - i(2.2), i(14.6)], i(1.3), 24));
    K.add(STAINLESS, K.cut(K.box([-i(.875), hx - i(.875), i(14)], [i(.875), hx + i(.875), barZ - i(.5)]), K.holes(Array.from({ length: 9 }, (_, n) => [0, hx, i(17 + n * .9) + lift] as Vec3).filter(c => c[2] < barZ - i(1)), i(.4), 'y', 80)));
    K.add(FRAME, K.box([-i(1.1), hx - i(1.1), barZ - i(1)], [i(1.1), hx + i(1.1), barZ + i(.625)]));
    K.add(KNOBS, K.rod([-BARRETT.W / 2, hx, barZ], [BARRETT.W / 2, hx, barZ], i(1.25), 28));
    // Loading bar: pivot block with knob and protection plate, rubber bumper, 15.5 in chrome bar and plates.
    const by = BARRETT.barY;
    K.add(FRAME, K.box([-i(1.5), by - i(1.5), z + i(1.5)], [i(1.5), by + i(1.5), z + i(4.5)]));
    K.add(PLATE, K.box([i(1.5), by - i(1.3), z + i(1.7)], [i(1.5) + 1.2, by + i(1.3), z + i(4.3)]));
    K.add(KNOBS, K.rod([i(1.5) + 1.2, by, z + i(3)], [i(2.7), by, z + i(3)], i(1.1), 24));
    K.add(RUBBER, K.rod([0, by, z + i(4.5)], [0, by, L.barBase], i(4), 40));
    K.add(CHROME, K.rod([0, by, L.barBase], [0, by, L.barBase + BARRETT.bar], BARRETT.barD, 48));
    K.plates(L.plates, [0, by, L.barBase], [0, 0, 1]);
  });
}

/* ---------------- DIY seal row bench ---------------- */
export function buildDiySeal(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const L = diySealLayout(p), K = machineKit(api), S = DIY_SEAL;
  const MATW = mat('Mat-wrapped 2×10 plank', 'liner', '#1f2022', 0, .95), TAPE = mat('Electrical tape bands', 'source', '#0b0b0c', 0, .28);
  const PLASTIC = mat('Folding sawhorses · black plastic', 'source', '#1e1f21', 0, .6), LABEL = mat('Sawhorse load labels', 'source', '#e8c51c', 0, .6);
  return K.finish('DIY seal row bench', L.shift, () => {
    const w = S.plankW / 2 + S.wrap, th = S.plankT + 2 * S.wrap, z0 = L.top - th;
    K.add(MATW, K.pad([0, 0, z0], L.L + 2 * S.wrap, 2 * w, th, 8, 5));
    for (let x = -L.L / 2 + i(5); x <= L.L / 2 - i(5) + 1; x += (L.L - i(10)) / Math.round((L.L - i(10)) / i(9))) K.add(TAPE, K.box([x - 9.5, -w - .5, z0 - .5], [x + 9.5, w + .5, L.top + .5]));
    for (const s of [-1, 1]) {
      const hx = s * L.horseX, top = L.horseTop, beamH = i(3.2);
      K.add(PLASTIC, K.pad([hx, 0, top - beamH], i(3.6), S.horseL, beamH, 14, 6));
      for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
        const a: Vec3 = [hx + sx * i(1), sy * i(11.2), top - beamH + i(.5)], b: Vec3 = [hx + sx * S.splay, sy * i(11.6), i(.6)];
        K.add(PLASTIC, K.tube(a, b, i(2.2), i(1.3), [0, 1, 0]), K.box([b[0] - i(1.25), b[1] - i(1), 0], [b[0] + i(1.25), b[1] + i(1), i(.6)]));
      }
      const tz = top * .36, spread = i(1) + (S.splay - i(1)) * (1 - (tz - i(.6)) / (top - beamH + i(.5) - i(.6)));
      K.add(PLASTIC, K.box([hx - spread + i(.6), -i(10.3), tz - i(.45)], [hx + spread - i(.6), i(10.3), tz]));
      K.add(LABEL, K.box([hx - i(1.2), -i(2), tz], [hx + i(1.2), i(2), tz + .8]));
    }
  });
}

type Build = (api: ManifoldAPI, p: NumericParams) => SolidPart[];
const BUILDERS: [typeof ROGUE_RHINO_BELT_SQUAT | typeof TITAN_SQUATMAX_MD | typeof TITAN_TIBIA_DORSI | typeof DIY_BELT_SQUAT | typeof TIB_BAR_PRO | typeof TITAN_SINGLE_LEG_SQUAT_ROLLER | typeof BOS_BELT_SQUAT | typeof APEX_BARRETT_BELT_SQUAT | typeof DIY_SEAL_ROW_BENCH, Build][] = [
  [ROGUE_RHINO_BELT_SQUAT, buildRhino], [TITAN_SQUATMAX_MD, buildSquatMax], [TITAN_TIBIA_DORSI, buildTibia], [DIY_BELT_SQUAT, buildDiyBelt], [TIB_BAR_PRO, buildTibPro],
  [TITAN_SINGLE_LEG_SQUAT_ROLLER, buildSquatRoller], [BOS_BELT_SQUAT, buildBos], [APEX_BARRETT_BELT_SQUAT, buildBarrett], [DIY_SEAL_ROW_BENCH, buildDiySeal],
];
/** Builder for a family part id (tests). */
export const buildMachinePart = (id: string): Build => { const b = BUILDERS.find(([part]) => part.id === id); if (!b) throw Error(`Unknown machine ${id}`); return b[1]; };
export const definitions: PartDefinition[] = BUILDERS.map(([part, build]) => floorDefinition(part, build));
