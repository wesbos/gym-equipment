/** Rogue Monster Rhino Belt Squat Drop-In builder (#135; metadata in ../rack-parts/rack-levers-belt-squat-rhino.ts).
 * Source frame (rack-part.ts): origin on the near upright's centreline at its lowest hole, +Y out of the face toward the
 * tower, the bay toward `dir` along X, floor at z0. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import { buildPlateStack } from './plates.ts';
import { buildKit, RUBBER, UHMW, ZINC, type Finish } from './rack-levers-belt-squat-kit.ts';
import { RHINO, rhinoLayout, rhinoLean, rhinoLoad, ROGUE_RHINO_BELT_SQUAT_DROP_IN } from '../rack-parts/rack-levers-belt-squat-rhino.ts';
const MG_BLACK: Finish = { color: '#161719', metalness: .4, roughness: .45 };
const TREAD: Finish = { color: '#2e3033', metalness: .35, roughness: .75 };
const STAINLESS: Finish = { color: '#cfd2d4', metalness: .92, roughness: .2 };
export function buildRhinoDropIn(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_RHINO_BELT_SQUAT_DROP_IN.defaults, ...params }, R = RHINO, L = rhinoLayout(p), lean = rhinoLean(p), d = L.dir;
  const X = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];
  return buildKit(api, g => {
    const bx = ([x0, x1]: [number, number], y0: number, y1: number, z0: number, z1: number) => g.box([x0, y0, z0], [x1, y1, z1]);
    const [pw, pd] = R.platform, [rw, rh] = R.rail, f = L.f, T = L.T, h = T / 2 + 3, back = f - pd, top = L.deckTop;
    // ---------------------------------------------------------------- pulley deck platform
    const xs0 = L.xc - pw / 2, xs1 = L.xc + pw / 2, far = 2 * L.xc;
    const notch = (x: number) => bx(X(x - h, x + h), f - T - 3, f + 1, L.z0, top + 1);
    const frame = g.union([
      bx(X(xs0, xs1), f - rw, f, top - R.tread - rh, top - R.tread), bx(X(xs0, xs1), back, back + rw, top - R.tread - rh, top - R.tread),
      ...[xs0, xs1 - rw, L.xc - 70, L.xc + 70 - rw].map(x => bx([x, x + rw], back, f, top - R.tread - rh, top - R.tread)),
      bx(X(xs0, xs1), f - pd / 2 - rw / 2, f - pd / 2 + rw / 2, top - R.tread - rh, top - R.tread),
    ]);
    g.add('1x3 deck frame', g.cut(frame, [notch(0), notch(far)]), MG_BLACK);
    g.add('Deck bearers', g.cut(g.union([xs0 + 40, xs1 - 90].map(x => bx([x, x + 50.8], back, f - T - 8, L.z0, top - R.tread - rh))), [notch(0), notch(far)]), MG_BLACK);
    for (const [a, b] of [[xs0, L.xc - 70], [L.xc + 70, xs1]]) g.add('Diamond tread plate', g.cut(bx([a, b], back, f, top - R.tread, top), [notch(0), notch(far)]), TREAD);
    // Centre exit: roller plate between the tread halves, two rollers and the cable ball stop.
    const ey = f - R.exitBack;
    g.add('Roller mount plate', bx([L.xc - 70, L.xc + 70], back + 60, f - 60, top - 6, top - 2), MG_BLACK);
    for (const dy of [-12, 12]) g.add('Exit roller', g.rod([L.xc - 108, ey + dy, top - 4], [L.xc + 108, ey + dy, top - 4], 9.5, 1, 1, 20), { color: '#e3e3e0', metalness: 0, roughness: .5, role: 'liner' });
    g.add('Cable ball stop', g.sphere([L.xc, ey, top + 14], 16, 20), { color: '#0f0f10', metalness: .3, roughness: .5 });
    g.add('Belt chain', g.union(Array.from({ length: 5 }, (_, i) => g.ring([L.xc, ey, top + 40 + i * 26], i % 2 ? [1, 0, 0] : [0, 1, 0], 11, 3.2, 16))), ZINC);
    // ---------------------------------------------------------------- tower, foot, tie bar, sheave
    const [tw, td] = R.tower, yT = L.yT, tz1 = L.top - 140;
    g.add('3x6 trolley tower', bx(X(L.xc - tw / 2, L.xc + tw / 2), yT - td / 2, yT + td / 2, L.z0 + 9, tz1), MG_BLACK);
    const [fw, fd] = R.footPlate;
    g.add('Tower foot plate', g.cut(bx(X(L.xc - fw / 2, L.xc + fw / 2), yT - td / 2 - 30, yT - td / 2 - 30 + fd, L.z0, L.z0 + 9.5), [-1, 1].map(s => g.rod([L.xc + s * (fw / 2 - 25), yT + td / 2 + 50, L.z0 - 1], [L.xc + s * (fw / 2 - 25), yT + td / 2 + 50, L.z0 + 11], 9, 0, 0, 16))), MG_BLACK);
    g.add('Foot gussets', g.union([-1, 1].map(s => g.plateYZ([[yT - td / 2 - 20, L.z0 + 9], [yT + td / 2 + 90, L.z0 + 9], [yT + td / 2, L.z0 + 160]], L.xc + s * tw / 2 + (s > 0 ? 0 : -6), 6))), MG_BLACK);
    g.add('Tower band pegs', g.union([-1, 1].map(s => g.rod([L.xc + s * 22, yT + td / 2, L.z0 + 70], [L.xc + s * 22, yT + td / 2 + 127, L.z0 + 70], 12.7, 0, 1.5, 24))), MG_BLACK);
    g.add('Warning label', bx(X(L.xc - 30, L.xc + 30), yT + td / 2, yT + td / 2 + .8, L.z0 + 200, L.z0 + 290), { color: '#f07a1a', metalness: 0, roughness: .6 });
    g.add('Tower tie bar', bx(X(L.xc - 25.4, L.xc + 25.4), f, yT - td / 2, L.z0, L.z0 + 76.2), MG_BLACK);
    for (const s of [-1, 1]) {
      g.add('Rhino sticker', g.rod([L.xc + s * tw / 2, yT, L.z0 + 1400], [L.xc + s * (tw / 2 + .8), yT, L.z0 + 1400], 70, 0, 0, 48), { color: '#f2f2ef', metalness: 0, roughness: .6 });
      g.add('Rhino sticker centre', g.rod([L.xc + s * (tw / 2 + .8), yT, L.z0 + 1400], [L.xc + s * (tw / 2 + 1.2), yT, L.z0 + 1400], 58, 0, 0, 48), { color: '#141415', metalness: 0, roughness: .6 });
      g.add('Sheave housing plate', g.plateYZ([[yT - 120, tz1 - 20], [yT + 110, tz1 - 20], [yT + 110, L.top - 70], [yT + 40, L.top], [yT - 50, L.top], [yT - 120, L.top - 70]], L.xc + s * (tw / 2 + 2) + (s > 0 ? 0 : -8), 8), MG_BLACK);
    }
    g.add('Tower sheave', g.rod([L.xc - tw / 2 + 4, yT - 20, L.top - 95], [L.xc + tw / 2 - 4, yT - 20, L.top - 95], 80, 2, 2, 48), { color: '#2a2b2e', metalness: .6, roughness: .4 });
    g.add('Sheave axle', g.rod([L.xc - tw / 2 - 22, yT - 20, L.top - 95], [L.xc + tw / 2 + 22, yT - 20, L.top - 95], 10, 0, 0, 20), ZINC);
    // ---------------------------------------------------------------- weight trolley on the tower
    const [th, tdp] = R.trolley, zT = L.zTrolley, pz = zT + th / 2;
    g.add('Trolley side plates (laser-cut ROGUE)', g.union([-1, 1].map(s => bx(X(L.xc + s * (tw / 2 + 8), L.xc + s * (tw / 2 + 16)), yT - tdp / 2, yT + tdp / 2, zT, zT + th))), MG_BLACK);
    g.add('Trolley end plates', g.union([-1, 1].map(s => bx(X(L.xc - tw / 2 - 16, L.xc + tw / 2 + 16), yT + s * (td / 2 + 14) - 5, yT + s * (td / 2 + 14) + 5, zT + 20, zT + th - 20))), MG_BLACK);
    for (const s of [-1, 1]) for (const z of [zT + 30, zT + th - 30]) g.add('Acetal trolley roller', g.rod([L.xc - tw / 2 + 2, yT + s * (td / 2 + 5), z], [L.xc + tw / 2 - 2, yT + s * (td / 2 + 5), z], 8, 1, 1, 20), { color: '#e8e6df', metalness: 0, roughness: .5, role: 'liner' });
    g.add('Hoist plate', bx(X(L.xc - tw / 2 - 16, L.xc + tw / 2 + 16), yT - 30, yT + 30, zT + th, zT + th + 8), MG_BLACK);
    for (const s of [-1, 1]) {
      g.add('Weight post collar', g.rod([L.xc + s * (tw / 2 + 16), yT, pz], [L.xc + s * (tw / 2 + 34), yT, pz], 36, 0, 1, 40), MG_BLACK);
      g.add('Stainless weight post', g.rod([L.xc + s * (tw / 2 + 34), yT, pz], [L.xc + s * (tw / 2 + 34 + R.post), yT, pz], R.postDiameter / 2, 0, 2, 40), STAINLESS);
    }
    // ---------------------------------------------------------------- 1/4 in cable: trolley → sheave → deck pulley → exit
    const cable: Finish = { color: '#0d0d0e', metalness: .3, roughness: .6 }, cz = L.z0 + 60;
    g.add('Deck pulley', g.rod([L.xc - 12, f - 60, cz + 76], [L.xc + 12, f - 60, cz + 76], 76, 2, 2, 40), { color: '#2a2b2e', metalness: .6, roughness: .4 });
    g.add('1/4 in cable', g.path([[L.xc, yT - 20 + 80, zT + th + 8], [L.xc, yT - 20 + 80, L.top - 95], [L.xc, yT - 20 - 80, L.top - 95], [L.xc, yT - td / 2 - 12, cz + 152], [L.xc, f - 60, cz], [L.xc, ey, cz], [L.xc, ey, top]], 3.2, 10), cable);
    // ---------------------------------------------------------------- lever arms, hinges, crossmember, horn, handles
    const t = R.armTube / 2, armStart = g.parts.length;
    for (const xa of [0, far]) {
      const inward = xa === 0 ? d : -d;
      // Arm in its hinge frame (along +Z from the pivot at the origin), posed below.
      g.add('3x3 Rhino lever arm', g.cut(bx([xa - t, xa + t], -t, t, -40, R.arm), [
        bx([xa - t + 3, xa + t - 3], -t + 3, t - 3, -41, R.arm - 3), ...Array.from({ length: 22 }, (_, i) => g.rod([xa, -t - 1, 100 + i * 50.8], [xa, t + 1, 100 + i * 50.8], 13, 0, 0, 16)),
      ]), MG_BLACK);
      g.add('Arm rubber bumper', g.rod([xa, -t, R.arm - 180], [xa, -t - 25, R.arm - 180], 32, 0, 3, 24), RUBBER);
      g.add('Offset plates', bx([xa - t - 6, xa + t + 6], -t, R.crossN + t, R.crossA - 90, R.crossA + 60), MG_BLACK);
      // Handle carriage with the looped 1.25 in multi-grip handle over the platform.
      const [a0, a1] = R.handleA, hx = xa + inward * (t + 8), hr = R.handleOD / 2, rch = R.handleReach;
      g.add('Handle carriage', bx(X(xa - t - 8, xa + t + 8), -t - 8, t + 8, a0 - 40, a1 + 40), MG_BLACK);
      g.add('Multi-grip handle', g.path([[hx, 0, a1], [hx + inward * (rch - 50), 0, a1], [hx + inward * rch, 0, a1 - 50], [hx + inward * rch, 0, a0 + 50], [hx + inward * (rch - 50), 0, a0], [hx, 0, a0]], hr, 20), { color: '#1f2022', metalness: .35, roughness: .8 });
      g.add('Red hitch pin', g.union([g.rod([xa - t - 20, 0, (a0 + a1) / 2], [xa + t + 20, 0, (a0 + a1) / 2], 12.4, 1, 1, 20), g.ring([xa - inward * (t + 32), 0, (a0 + a1) / 2], [0, 1, 0], 12, 3, 16)]), { color: '#c8202a', metalness: .15, roughness: .45 });
    }
    g.add('Lever arm crossmember', bx(X(-t - 6, far + (far > 0 ? t + 6 : -t - 6)), R.crossN - t, R.crossN + t, R.crossA - t, R.crossA + t), MG_BLACK);
    // Horn post leaning toward the tower, UHMW Rhino horn and its orange detent pin.
    const hl = R.hornLean, hb: Vec3 = [L.xc, R.crossN, R.crossA + t];
    const post = g.rotate(bx([L.xc - 25.4, L.xc + 25.4], R.crossN - 25.4, R.crossN + 25.4, R.crossA, R.crossA + R.hornPost), [-hl, 0, 0], hb);
    g.add('Horn post', post, MG_BLACK);
    const hornTop: Vec3 = [L.xc, R.crossN + R.hornPost * Math.sin(hl * Math.PI / 180), R.crossA + R.hornPost * Math.cos(hl * Math.PI / 180)];
    g.add('UHMW Rhino horn', g.rotate(bx([L.xc - 30, L.xc + 30], hornTop[1] - 45, hornTop[1] + 45, hornTop[2] - 10, hornTop[2] + R.hornBlock), [lean, 0, 0], hornTop), UHMW);
    g.add('Orange detent pin', g.union([g.rod([L.xc - 44, hornTop[1], hornTop[2] - 30], [L.xc + 38, hornTop[1], hornTop[2] - 30], 7.8, 1, 1, 16), g.ring([L.xc - 58, hornTop[1], hornTop[2] - 30], [0, 1, 0], 14, 3.5, 20)]), { color: '#f0641e', metalness: .1, roughness: .45 });
    // Pose the arm assembly about the hinge (lean toward the tower), then place it on the hinge axis.
    g.transformAll((m: Manifold) => g.k(g.k(m.rotate([-lean, 0, 0])).translate([0, L.yH, L.zH])), armStart);
    for (const xa of [0, far]) {
      g.add('Lever hinge bracket', g.union([-1, 1].map(s => bx([xa + s * (t + 3) - 4, xa + s * (t + 3) + 4], f, L.yH + 30, L.z0 + 8, L.zH + 40))), MG_BLACK);
      g.add('1 in hinge shaft', g.rod([xa - t - 14, L.yH, L.zH], [xa + t + 14, L.yH, L.zH], 12.7, 1, 1, 24), ZINC);
      g.add('Hinge bolt', g.rod([xa, -f - 25, 0], [xa, f + 12, 0], 12.4, 1, 1, 20), ZINC);
    }
    // Plates on both trolley posts (returned solids, added last).
    const plates = rhinoLoad(p.load).plates;
    if (plates.length) for (const s of [-1, 1]) g.parts.push(...buildPlateStack(api, plates, { origin: [L.xc + s * (tw / 2 + 36), yT, pz], axis: [s, 0, 0], name: 'Trolley plate', segments: 72, detail: 'simple' }));
  });
}
