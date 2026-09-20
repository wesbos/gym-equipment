/** Bullet Proof Fitness VTS trolley and ISOLATOR 3x3 (#136). Frame (rack-part.ts): origin on the upright centreline at
 * the target hole, +Y out of the mounting face, Z up. Sizes and estimates: rack-parts/rack-digital-cable.ts and
 * research/rack-digital-cable.md. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { vendorSolid } from './vendor-solid.ts';
import { BULLETPROOF_ISOLATOR, BULLETPROOF_VTS, ISOLATOR, VTS, VTS_HORN_SOCKET, isolatorLayout, vtsHornLength, vtsLayout } from '../rack-parts/rack-digital-cable.ts';
type Scope = Parameters<Parameters<typeof vendorSolid>[1]>[0];
const BLACK = ['#151618', .35, .6] as const, CHROME = ['#d2d6d9', .95, .14] as const, ALU = ['#c3c7ca', .85, .32] as const;
const alongY = (v: Scope, x: number, z: number, y0: number, y1: number, r: number, segments = 48) => v.cylinder(r, y1 - y0, [x, (y0 + y1) / 2, z], [90, 0, 0], segments);
const alongX = (v: Scope, y: number, z: number, x0: number, x1: number, r: number, segments = 48) => v.cylinder(r, x1 - x0, [(x0 + x1) / 2, y, z], [0, 90, 0], segments);
/** Polygon in the X–Z plane extruded along +Y from y0 by t. */
const plateXZ = (v: Scope, points: Vec2[], y0: number, t: number) => v.keep(v.keep(v.keep(v.keep(new v.C([points])).extrude(t)).rotate([90, 0, 0])).translate([0, y0 + t, 0]));
/** Rectangle [x0, x1] × [z0, z1] with corner chamfer c, as an X–Z outline. */
const chamfered = (x0: number, x1: number, z0: number, z1: number, c: number): Vec2[] =>
  [[x0 + c, z0], [x1 - c, z0], [x1, z0 + c], [x1, z1 - c], [x1 - c, z1], [x0 + c, z1], [x0, z1 - c], [x0, z0 + c]];
/** Round bar from a to b. */
function rod(v: Scope, a: Vec3, b: Vec3, r: number, segments = 24): Manifold {
  const d = b.map((n, i) => n - a[i]) as Vec3, len = Math.hypot(...d);
  const tilt = Math.acos(d[2] / len) * 180 / Math.PI, turn = Math.atan2(d[1], d[0]) * 180 / Math.PI;
  return v.keep(v.keep(v.keep(v.M.cylinder(len, r, r, segments)).rotate([0, tilt, turn])).translate(a));
}
/** Hexagonal port or shaft (across flats `af`) along an axis-aligned direction. */
const hexAlongY = (v: Scope, x: number, z: number, y0: number, y1: number, af: number) => v.keep(v.keep(alongY(v, 0, 0, y0, y1, af / Math.sqrt(3), 6).rotate([0, 30, 0])).translate([x, 0, z]));

// ─── VTS ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function buildVts(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BULLETPROOF_VTS.defaults, ...params }, l = vtsLayout(p), t = VTS.plate;
  return vendorSolid(api, v => {
    const { M, keep: k, add, box } = v, coat = (name: string, m: Manifold) => add(name, m, 'source', ...BLACK);
    const zc = l.zc, H = l.top - l.bottom, g = l.face + 1;
    // Side plates on ±Y with chamfered corners and a plain logo panel, joined by front and back plates.
    for (const s of [-1, 1]) {
      coat('VTS side plate', plateXZ(v, chamfered(l.front, l.back, l.bottom, l.top, 24), s > 0 ? l.half - t : -l.half, t));
      add('Logo panel', plateXZ(v, chamfered(l.front + 40, l.back - 40, zc - 26, zc + 26, 8), s > 0 ? l.half : -l.half - 1, 1), 'source', '#26282b', .5, .35);
      // Button-head bolts through the plate corners and roller axles.
      for (const [x, z] of [[l.front + 16, zc - 40], [l.front + 16, zc + 40], [l.back - 16, zc - 40], [l.back - 16, zc + 40], [-l.face - 17, zc - 70], [-l.face - 17, zc + 70], [l.face + 17, zc - 70], [l.face + 17, zc + 70]] as const)
        add('Plate bolt', alongY(v, x, z, s > 0 ? l.half : -l.half - 3, s > 0 ? l.half + 3 : -l.half, 5, 16), 'fastener', '#9da2a6', .8, .35);
    }
    coat('VTS front plate', box([t, 2 * l.half - 2 * t, H - 30], [l.front + t / 2, 0, zc]));
    coat('VTS back plate', box([t, 2 * l.half - 2 * t, H - 30], [l.back - t / 2, 0, zc]));
    // Top and bottom plates open around the post.
    for (const z of [l.top - t / 2, l.bottom + t / 2]) coat('VTS end plate', k(box([l.back - l.front - 2 * t, 2 * l.half - 2 * t, t], [(l.back + l.front) / 2, 0, z]).subtract(box([2 * g + 20, 2 * g + 20, t + 2], [0, 0, z]))));
    // Eight UHMW rollers riding the four post faces, above and below the trolley centre.
    const [rr, rl] = VTS.roller;
    for (const z of [zc - 70, zc + 70]) {
      for (const sx of [-1, 1]) add('UHMW roller', alongY(v, sx * (g + rr), z, -rl / 2, rl / 2, rr, 32), 'liner', '#2b2c2e', 0, .7);
      for (const sy of [-1, 1]) add('UHMW roller', alongX(v, sy * (g + rr), z, -rl / 2, rl / 2, rr, 32), 'liner', '#2b2c2e', 0, .7);
    }
    // Two hex ports on the inner (-Y) side plate reach the published 9.13 in; the +Y plate carries the horn socket.
    const reach = VTS.portReach;
    for (const z of [zc - 72, zc + 72]) {
      coat('Hex port', k(hexAlongY(v, -80, z, -l.half - reach, -l.half, VTS.hex + 12).subtract(hexAlongY(v, -80, z, -l.half - reach - 1, -l.half + 1, VTS.hex))));
      coat('Hex port gusset', box([12, reach - 10, 30], [-80, -l.half - (reach - 10) / 2, z + (z > zc ? -30 : 30)]));
    }
    const eyeX = l.front + 34, eyeR = 17;
    coat('Cable eye', k(M.union([box([16, 10, VTS.eye - eyeR], [eyeX, 0, l.top + (VTS.eye - eyeR) / 2]),
      k(alongY(v, eyeX, l.top + VTS.eye - eyeR, -5, 5, eyeR, 32).subtract(alongY(v, eyeX, l.top + VTS.eye - eyeR, -6, 6, 9, 24)))])));
    // Barbell clamp: twin jaws ahead of the trolley with open U seats, a bored sleeve and two silver toggle clamps.
    for (const s of [-1, 1]) {
      const jaw = plateXZ(v, chamfered(l.jawEnd, l.front + 2, l.barZ - 50, l.barZ + 36, 14), s > 0 ? 25 : -33, t);
      coat('Barbell clamp jaw', k(jaw.subtract(k(M.union([alongY(v, l.barX, l.barZ, -40, 40, VTS.bar / 2 + 1, 32), box([VTS.bar + 2, 80, 40], [l.barX, 0, l.barZ + 20])])))));
      add('Toggle clamp', box([14, 12, 44], [l.barX + 26, s * 39, l.barZ - 8]), 'source', ...ALU);
      add('Toggle clamp lever', rod(v, [l.barX + 26, s * 44, l.barZ - 26], [l.barX + 62, s * 44, l.barZ - 60], 3.5, 12), 'handle', ...ALU);
    }
    coat('Clamp sleeve', k(alongY(v, l.barX, l.barZ, -25, 25, 30, 40).subtract(k(M.union([alongY(v, l.barX, l.barZ, -26, 26, VTS.bar / 2 + 1, 32), box([VTS.bar + 2, 54, 40], [l.barX, 0, l.barZ + 20])])))));
    coat('Clamp bridge', box([l.front - l.jawEnd - 60, 50, 10], [(l.front + l.jawEnd + 60) / 2, 0, l.barZ - 45]));
    // Aluminium latch hook from the clamp up past the trolley to the hole in the mounting face.
    const ly0 = l.half + 3, a: Vec2 = [l.barX + 10, l.barZ + 30], b: Vec2 = [-4, 16], w = 13;
    const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz), ox = -dz / n * w, oz = dx / n * w;
    const latch = plateXZ(v, [[a[0] - ox, a[1] - oz], [b[0] - ox, b[1] - oz], [b[0] + ox, b[1] + oz], [a[0] + ox, a[1] + oz]], ly0, t);
    const slot = plateXZ(v, [[a[0] + dx * .2 - ox * .35, a[1] + dz * .2 - oz * .35], [a[0] + dx * .8 - ox * .35, a[1] + dz * .8 - oz * .35], [a[0] + dx * .8 + ox * .35, a[1] + dz * .8 + oz * .35], [a[0] + dx * .2 + ox * .35, a[1] + dz * .2 + oz * .35]], ly0 - 1, t + 2);
    add('Aluminium latch hook', k(M.union([k(latch.subtract(slot)), alongY(v, a[0], a[1], 30, ly0 + t, 9, 24)])), 'source', ...ALU);
    add('Latch hook tip', k(M.union([alongY(v, 0, 0, l.face - 14, ly0 + t, 7.6, 24), box([12, t, 22], [-2, ly0 + t / 2, 8])])), 'source', ...ALU);
    const horn = vtsHornLength(p), y0 = l.half, sock = VTS_HORN_SOCKET;
    coat('Horn hex socket', k(hexAlongY(v, -80, zc, y0, y0 + sock * .45, VTS.hex + 12).subtract(hexAlongY(v, -80, zc, y0 - 1, y0 + sock * .45 + 1, VTS.hex))));
    if (horn) {
      add('Weight horn hex stub', hexAlongY(v, -80, zc, y0 + 2, y0 + sock * .45, VTS.hex - .6), 'source', ...BLACK);
      add('Weight horn collar', alongY(v, -80, zc, y0 + sock * .45, y0 + sock, 36, 40), 'source', ...BLACK);
      add('VTS weight horn', alongY(v, -80, zc, y0 + sock, y0 + sock + horn, VTS.hornDiameter / 2, 40), 'source', '#1e1f21', .4, .5);
    }
    if (p.mirror === 1) for (const part of v.parts) part.solid = k(part.solid.mirror([1, 0, 0]));
  });
}

// ─── ISOLATOR 3x3 ────────────────────────────────────────────────────────────────────────────────────────────────────
export function buildIsolator(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...BULLETPROOF_ISOLATOR.defaults, ...params }, l = isolatorLayout(p), i = ISOLATOR;
  return vendorSolid(api, v => {
    const { M, keep: k, add, box } = v;
    const frame: [string, number, number] = p.frame ? ['#e6e7e6', .2, .5] : [...BLACK], pad: [string, number, number] = p.pads ? ['#b3151d', 0, .75] : ['#1d1e20', 0, .8];
    const coat = (name: string, m: Manifold) => add(name, m, 'source', ...frame), steel = (name: string, m: Manifold) => add(name, m, 'source', ...ALU);
    const y = l.y, sz = i.shaftZ, [s0, s1] = i.sleeve, o = l.face + i.wall + 1;
    // Carriage: square sleeve around the post (removable rear half) and the front bearing block with the two pins.
    coat('Carriage sleeve', k(box([2 * o, 2 * o, s1 - s0], [0, 0, (s0 + s1) / 2]).subtract(box([2 * l.face + 2, 2 * l.face + 2, s1 - s0 + 2], [0, 0, (s0 + s1) / 2]))));
    const [bw, bd, bz0, bz1] = i.block;
    coat('Carriage bearing block', box([bw, bd - i.wall - 1, bz1 - bz0], [0, (o + l.face + bd) / 2, (bz0 + bz1) / 2]));
    for (const z of [0, -2 * (p.mountSpacing ?? 50)]) {
      add('Universal pin', alongY(v, 0, z, -l.face - 14, l.face + bd + 6, (p.pin ? 15.9 : 25.4) / 2, 24), 'fastener', '#c6c9cc', .85, .3);
      add('Pin knob', alongY(v, 0, z, l.face + bd + 6, l.face + bd + 22, 17, 10), 'handle', '#101113', .1, .7);
    }
    // Hex shaft through the block, the 360° pull-pin dial and hubs.
    add('Hex internal shaft', alongX(v, y, sz, i.shaftSpan[0], i.shaftSpan[1], i.shaft / 2, 6), 'source', ...CHROME);
    const [dr, dt] = i.dial;
    const holes = Array.from({ length: 12 }, (_, n) => { const a = n * Math.PI / 6; return alongX(v, y + Math.cos(a) * (dr - 11), sz + Math.sin(a) * (dr - 11), i.dialX - dt, i.dialX + dt, 4.5, 12); });
    steel('Degree dial', k(M.difference([alongX(v, y, sz, i.dialX - dt / 2, i.dialX + dt / 2, dr, 64), ...holes])));
    coat('Dial hub and pull-pin housing', k(M.union([box([44, 64, 64], [i.hubX, y, sz]), box([22, 22, 26], [i.hubX + 6, y, sz + 44])])));
    add('Pull-pin knob', alongX(v, y, sz + 58, i.hubX - 5, i.hubX + 17, 11, 10), 'handle', '#101113', .1, .7);
    // Pad arm: 2x2 stainless-look tube hanging from the hub, adjustment holes on its face.
    const a = i.padArm, len = i.padArmLength, mid: Vec3 = [(i.hubX + l.foot[0]) / 2, y, (sz + l.foot[1]) / 2];
    const arm = k(k(k(box([a, a, len + a], [0, 0, 0]).subtract(k(M.union(Array.from({ length: 8 }, (_, n) => alongY(v, 0, -len / 2 + 40 + n * 40, -a, a, 7, 16)))))).rotate([0, l.tilt * 180 / Math.PI, 0])).translate(mid));
    steel('Pad arm', arm);
    // Seat / preacher pad on its bracket above the hub.
    const [sw, sd, sh] = i.seat;
    coat('Seat bracket', k(M.union([box([40, 50, i.seatGap + 6], [i.hubX, y, sz + (i.seatGap + 6) / 2 + 12]), box([sw * .6, 60, 8], [l.seatX + 40, y, l.seatZ + 4])])));
    add('Seat plywood base', box([sw - 10, sd - 10, 12], [l.seatX, y, l.seatZ + 8 + 6]), 'source', '#2a2622', 0, .9);
    add('Seat / preacher pad', v.round(sw, sd, sh - 20, 18, [l.seatX, y, l.seatZ + 20 + (sh - 20) / 2]), 'source', ...pad);
    // Long leg pad on the arm foot, pointing away from the post.
    const [rr, rl] = i.roller, [fx, fz] = l.foot;
    coat('Roller sleeve block', box([56, 62, 62], [fx, y, fz]));
    add('Long leg pad', alongX(v, y, fz, fx - rl - 5, fx - 30, rr, 48), 'source', ...pad);
    steel('Roller end cap', alongX(v, y, fz, fx - rl - 12, fx - rl - 5, 14, 24));
    // Curl arm with two upturned handles and three eye loops, clamped mid-arm.
    const cz = i.curlZ, cx = i.hubX - Math.tan(l.tilt) * (sz - cz);
    coat('Curl arm sleeve block', box([60, 60, 56], [cx, y, cz]));
    coat('Curl arm', alongX(v, y, cz, cx - i.curlLength, cx - 30, 16, 24));
    for (const s of [-1, 1]) coat('Curl handle', k(M.union([rod(v, [cx - i.curlLength + 40, y + s * 16, cz], [cx - i.curlLength - 10, y + s * 70, cz + 55], 14), rod(v, [cx - i.curlLength - 10, y + s * 70, cz + 55], [cx - i.curlLength - 60, y + s * 72, cz + 70], 14)])));
    for (const n of [0, 1, 2]) steel('Eye loop', k(alongY(v, cx - 90 - n * 45, cz - 26, -5 + y, 5 + y, 11, 24).subtract(alongY(v, cx - 90 - n * 45, cz - 26, y - 6, y + 6, 6, 16))));
    // Weight arm: 2x2 tube down from the shaft hub, a sleeve block with a star knob and the loading horn.
    coat('Weight arm hub', box([48, 64, 64], [i.weightArmX, y, sz]));
    coat('Weight arm', k(box([a, a, i.weightArmLength], [i.weightArmX, y, sz - i.weightArmLength / 2]).subtract(k(M.union(Array.from({ length: 5 }, (_, n) => alongY(v, i.weightArmX, sz - 70 - n * 45, y - a, y + a, 7, 16)))))));
    coat('Horn sleeve block', box([62, 62, 62], [i.weightArmX, y, i.hornZ]));
    add('Star knob', alongY(v, i.weightArmX, i.hornZ, y + 31, y + 45, 16, 10), 'handle', '#101113', .1, .7);
    add('Weight horn', alongX(v, y, i.hornZ, i.weightArmX + 31, i.weightArmX + 26 + i.horn[1], i.horn[0], 40), 'source', ...CHROME);
    if (l.s < 0) for (const part of v.parts) part.solid = k(part.solid.mirror([1, 0, 0]));
  });
}
