/** Motorised treadmills: one parametric builder for the TreadmillSpec entries in ../floor-parts/cardio.ts.
 * Static base (incline frame, motor hood, uprights, console, display) plus a folding deck assembly (side rails, belt, rear end
 * caps, rear feet) that rotates about the published hinge for the "Folded up" pose, using the same profile and angle as the footprint. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { treadDeckProfile, treadFoldAngle, treadRearFeet, type TreadmillSpec } from '../floor-parts/cardio.ts';
import { F, finish, withCardioKit, type CardioKit, type Finish } from './cardio-kit.ts';
import { sideWord } from './cardio-bikes.ts';

const DECK_GROUPS = ['Deck frame', 'Foot rails', 'Running belt', 'Rear end caps', 'Rear feet', 'Deck lettering', 'Deck accents', 'Deck stripe'];
/** Rounded side-profile slab: points [s, h] extruded across x0..x0+t. */
const profile = (K: CardioKit, pts: Vec2[], x0: number, t: number, round = 0) => K.plate(pts.map(([s, h]) => [s - K.L / 2, h] as Vec2), x0, t, round);
function display(K: CardioKit, t: TreadmillSpec, housing: Finish = F.bezel, offset = 0) {
  const d = t.display, r = d.tilt * Math.PI / 180, z = d.top - d.h / 2 * Math.cos(r);
  const at = K.P(d.s, z), face: Vec3 = [0, Math.cos(r), Math.sin(r)], up: Vec3 = [0, -Math.sin(r), Math.cos(r)];
  K.screen(d.w, d.h, d.t, at, face, up, d.glass, housing, offset);
  /** Flat strip on the housing face, `v` mm above the centre (negative = below), w × h. */
  const strip = (v: number, w: number, h: number, fin: Finish, name: string) => K.add(name, fin, K.place(K.k(K.M.cube([w, h, 1.2], true)),
    [0, at[1] + up[1] * v + face[1] * .6, at[2] + up[2] * v + face[2] * .6], [-1, 0, 0], up));
  return { z, back: d.s - d.t * Math.cos(r), r, strip };
}

export function buildTreadmill(api: ManifoldAPI, t: TreadmillSpec, p: NumericParams, label: string): SolidPart[] {
  const folded = !!p.pose && !!t.fold;
  return withCardioKit(api, label, t.L, K => {
    const P = K.P, W = t.W, frame = finish('source', t.colors.frame, .3, .5), trim = finish('source', t.colors.trim, .1, .6);
    const accent = finish('source', t.colors.accent, .1, .45), plastic = F.plastic;
    const deckFrame = t.console === 'peloton' ? finish('source', '#232427', .2, .55) : trim;
    // ---- Folding deck assembly: frame + foot rails from the side profile, belt channel, rear end caps, rear feet.
    const prof = treadDeckProfile(t), half = t.deck.w / 2, bw = t.belt[0] / 2 + 12, beltS0 = t.deck.front + 35, beltS1 = t.L - 30;
    const body = profile(K, prof, -half, t.deck.w, 0);
    const channel = K.span(P(beltS0, t.stepUp - 14, -bw), P(beltS1, t.deck.rail + 20, bw));
    const deck = K.cut(body, [channel]);
    const capZone = K.span(P(t.L - 115, -10, -half - 5), P(t.L + 5, t.deck.rail + 10, half + 5));
    const rails = K.span(P(t.deck.front - 5, t.stepUp - 30, -half - 5), P(t.L + 5, t.deck.rail + 10, half + 5));
    K.add('Deck frame', deckFrame, K.cut(deck, [capZone, rails]));
    K.add('Foot rails', t.console === 'nt65' ? finish('source', '#3a3c3f', .1, .6) : plastic, K.cut(K.inter(deck, rails), [capZone]));
    K.add('Rear end caps', t.console === 'sole' || t.console === 'nt65' ? plastic : trim, K.inter(deck, capZone));
    K.add('Running belt', F.belt, K.span(P(beltS0, t.stepUp - 14, -t.belt[0] / 2), P(beltS1 - 5, t.stepUp, t.belt[0] / 2)));
    K.add('Running belt', finish('liner', '#2a2b2d', .3, .5), K.disc(P(beltS1 - 45, t.stepUp - 44), 'x', 60, t.belt[0], 24));
    const feet = treadRearFeet(t);
    if (t.console === 'peloton') for (const s of [320, t.L - 230]) for (const x of [-1, 1]) K.add('Rear feet', F.rubber, K.disc(P(s, 8, x * (half - 60)), 'z', 56, 16, 20), K.rod(P(s, 10, x * (half - 60)), P(s, t.deck.bottom + 5, x * (half - 60)), 20, 12));
    else for (const x of [-1, 1]) K.add('Rear feet', F.rubber, profile(K, feet, x * (half - 30) - 25, 50, 0));
    // Accent strips and lettering on the deck.
    if (t.console === 'sole') for (const x of [-1, 1]) {
      K.add('Deck accents', accent, K.span(P(t.L - 95, t.deck.rail, x * (half - 55) - 22), P(t.L - 50, t.deck.rail + 1.2, x * (half - 55) + 22)));
      const m = K.word('SOLE', 30, P(t.L - 560, t.deck.rail + .1, x * (half - 48)), [0, x, 0], [-x, 0, 0], 1, 140);
      if (m) K.add('Deck lettering', finish('source', '#d9dadb', 0, .5), m);
    }
    if (t.console === 'horizon') for (const x of [-1, 1]) K.add('Deck accents', accent, K.span(P(t.deck.front + 80, t.deck.rail - 40, x * (half + .1) - (x > 0 ? 0 : 1.2)), P(t.L - 140, t.deck.rail - 32, x * (half + .1) + (x > 0 ? 1.2 : 0))));
    if (t.console === 'nt65') for (const x of [-1, 1]) K.add('Deck accents', accent, K.span(P(t.deck.front + 520, t.deck.bottom - 12, x * (half - 90) - 30), P(t.deck.front + 600, t.deck.bottom, x * (half - 90) + 30)));
    if (t.console !== 'sole' && t.console !== 'horizon') for (const x of [-1, 1] as const) {
      const y = P(t.L - 330, 0)[1], z = (t.deck.bottom + t.stepUp) / 2;
      sideWord(K, t.brand, (t.stepUp - t.deck.bottom) * .32, [0, y - 1, z], [0, y + 1, z], .5, x, half, ['Deck lettering', finish('source', '#c9cbcd', .2, .5)], 360);
    }
    // ---- Fold: rotate the deck assembly about the hinge (and gas strut between base and deck).
    const hinge: Vec3 = t.fold ? P(t.fold.s, t.fold.h) : P(0, 0), angle = folded ? treadFoldAngle(t) : 0;
    const rot = (pt: Vec3): Vec3 => { const a = angle * Math.PI / 180, vy = pt[1] - hinge[1], vz = pt[2] - hinge[2]; return [pt[0], hinge[1] + vy * Math.cos(a) - vz * Math.sin(a), hinge[2] + vy * Math.sin(a) + vz * Math.cos(a)]; };
    if (angle) K.transformGroups(DECK_GROUPS, (s: Manifold) => K.move(K.rotate(K.move(s, [0, -hinge[1], -hinge[2]]), [angle, 0, 0]), hinge));
    // ---- Base / incline frame (static), front transport wheels, hinge brackets, gas strut.
    if (t.base.rear > 0) {
      const bh = t.base.h, bx = t.base.w / 2;
      for (const x of [-1, 1]) {
        K.add('Base frame', frame, K.bar(P(40, bh / 2, x * (bx - 25)), P(t.base.rear - 25, bh / 2, x * (bx - 25)), 44, bh - 6, 6, [1, 0, 0]));
        K.add('Base frame', F.plastic, K.move(K.pad(52, 50, bh, 10, [0, 0, 0]), P(t.base.rear - 25, 0, x * (bx - 25))));
        const w = K.wheel(P(34, 34, x * (bx - 20)), 68, 30);
        K.add('Transport wheels', F.rubber, w.tyre); K.add('Transport wheels', F.plasticGrey, w.hub);
      }
      K.add('Base frame', frame, K.bar(P(40, bh / 2, -bx + 45), P(40, bh / 2, bx - 45), 60, bh - 6, 8, [0, 1, 0]));
      K.add('Base frame', frame, K.span(P(0, 8, -bx + 60), P(20, bh - 4, bx - 60)));
      if (t.fold) {
        const a = P(t.fold.s + 420, bh), b = rot(P(t.fold.s + 330, t.deck.bottom));
        K.add('Hydraulic fold strut', F.steel, K.rod(a, b, 24, 14));
        for (const x of [-1, 1]) K.add('Base frame', frame, K.span(P(t.fold.s - 60, bh - 6, x * (half - 5) - 12), P(t.fold.s + 30, t.fold.h + 25, x * (half - 5) + 12)));
      }
    } else {
      // Peloton Tread: the deck is the base; levellers under the nose and a grey rail stripe along each side.
      for (const x of [-1, 1]) {
        K.add('Rear feet', F.rubber, K.disc(P(120, 8, x * (half - 60)), 'z', 56, 16, 20), K.rod(P(120, 10, x * (half - 60)), P(120, t.deck.bottom + 5, x * (half - 60)), 20, 12));
        K.add('Deck stripe', finish('source', '#4a4c50', .2, .5), K.span(P(90, t.deck.rail - 30, x * (half + .6) - .6), P(t.L - 90, t.deck.rail - 22, x * (half + .6) + .6)));
      }
    }
    // ---- Motor hood.
    if (t.hood.w > 0) {
      // Low wedge: nose drops toward the front, flat top, square to the deck at the rear.
      const hd = t.hood, hb = t.base.h + 10, nose = Math.min(hd.h - 40, hb + (hd.h - hb) * .45);
      const outline: Vec2[] = [[hd.s0, hb], [hd.s1, hb], [hd.s1, hd.h - 18], [hd.s1 - 30, hd.h], [hd.s0 + (hd.s1 - hd.s0) * .35, hd.h], [hd.s0, nose]];
      K.add('Motor hood', plastic, profile(K, outline, -hd.w / 2, hd.w, 22));
      if (t.console === 'sole') K.add('Hood accent', accent, K.span(P(hd.s1 - 150, hd.h - 60, hd.w / 2 - 170), P(hd.s1 - 60, hd.h - 8, hd.w / 2 - 70)));
    }
    // ---- Uprights.
    const u = t.upright, ux = t.frame === 'z' || t.console === 'peloton' ? W / 2 - u.thick / 2 : u.x;
    const armTop: Vec2 = u.arm ?? [u.s1, u.h1];
    for (const x of [-1, 1]) {
      const a = P(u.s0, u.h0, x * ux), b = P(u.s1, u.h1, x * ux);
      if (t.console === 'peloton') {
        K.add('Uprights', frame, K.aboveFloor(K.rod(a, b, u.depth, 28)), K.sphere(b, u.depth, 20));
        K.add('Uprights', frame, K.rod(b, P(armTop[0] + 40, armTop[1], x * (ux - 10)), u.depth * .8, 24));
      } else if (t.frame === 'z') {
        K.add('Uprights', frame, K.aboveFloor(K.bar(a, b, u.thick, u.depth, 20)));
        K.add('Uprights', frame, K.hull([K.bar(P(u.s1 + 20, u.h1 - 10, x * ux), P(u.s1 - 60, u.h1 + 18, x * ux), u.thick, u.depth, 20)]));
        K.add('Uprights', frame, K.bar(P(u.s1, u.h1 + 12, x * ux), P(armTop[0] + 60, armTop[1], x * ux), u.thick, 70, 22));
        K.add('Handrail grips', F.foam, K.bar(P(u.s1 - 60, u.h1 + 14, x * ux), P(u.s1 - 300, (u.h1 + armTop[1]) / 2 + 14, x * ux), u.thick, 76, 24));
      } else {
        K.add('Uprights', frame, K.aboveFloor(K.bar(a, b, u.thick, u.depth, t.console === 'horizon' ? 22 : 12)));
      }
      if (t.base.rear > 0) K.add('Base frame', frame, K.span(P(Math.max(0, u.s0 - u.depth), 0, Math.max(-W / 2, x * ux - u.thick / 2 - 6)), P(u.s0 + u.depth, u.h0 + 60, Math.min(W / 2, x * ux + u.thick / 2 + 6))));
    }
    if (t.console === 'horizon') for (const x of [-1, 1]) sideWord(K, 'HORIZON', u.thick * .9, P(u.s0, u.h0), P(u.s1, u.h1), .42, x as 1 | -1, u.x + u.thick / 2, ['Upright lettering', finish('source', '#8d9094', .1, .4)], 420);
    if (t.console === 'proform') for (const x of [-1, 1]) sideWord(K, 'PRO-FORM', u.thick * .8, P(u.s0, u.h0, 0), P(u.s1, u.h1, 0), .55, x as 1 | -1, u.x + u.thick / 2, ['Upright lettering', finish('source', '#1b1c1e', .1, .4)], 400);
    // ---- Console, handrails, display per model.
    consoles[t.console](K, t, { frame, trim, accent, ux, armTop });
  });
}

type Ctx = { frame: Finish; trim: Finish; accent: Finish; ux: number; armTop: Vec2 };
const consoles: Record<TreadmillSpec['console'], (K: CardioKit, t: TreadmillSpec, c: Ctx) => void> = {
  /** Sole F63 2026: one flat console-and-handlebar slab, white LED strip, speed dial, tablet cradle on top. */
  sole(K, t, c) {
    const P = K.P, W = t.W, u = t.upright, h0 = u.h1 - 8, h1 = u.h1 + 100, s0 = 150, s1 = 891;
    const top: Vec2[] = [[s0, -300], [s0 + 120, -W / 2 + 60], [s1 - 90, -W / 2], [s1, -W / 2 + 40], [s1, -W / 2 + 120], [s0 + 330, -250], [s0 + 330, 250], [s1, W / 2 - 120], [s1, W / 2 - 40], [s1 - 90, W / 2], [s0 + 120, W / 2 - 60], [s0, 300]];
    const slab = K.slab(top.map(([s, x]) => [x, s - K.L / 2] as Vec2), h1 - 60, 60, 14);
    const body = K.slab([[-300, s0 - K.L / 2], [300, s0 - K.L / 2], [300, s0 + 330 - K.L / 2], [-300, s0 + 330 - K.L / 2]], h0, h1 - h0, 20);
    K.add('Console', F.plastic, slab, body);
    K.add('Console panel', finish('source', '#101113', .2, .3), K.span(P(s0 + 40, h1, -230), P(s0 + 250, h1 + 1.2, 230)));
    K.add('LED display', finish('source', '#e9eef2', .1, .3), K.span(P(s0 + 60, h1 + 1.2, -180), P(s0 + 80, h1 + 2, 180)));
    K.add('Console panel', c.accent, K.span(P(s0 + 260, h1, -230), P(s0 + 275, h1 + 1.4, 230)));
    K.add('Speed dial', F.chrome, K.disc(P(s1 - 130, h1 + 14, W / 2 - 90), 'z', 70, 28, 32));
    K.add('Handrail grips', F.foam, K.span(P(s1 - 200, h1 - 58, W / 2 - 70), P(s1 - 40, h1 + 2, W / 2)), K.span(P(s1 - 200, h1 - 58, -W / 2), P(s1 - 40, h1 + 2, -W / 2 + 70)));
    K.add('Cup holders', finish('source', '#232427', 0, .6), K.disc(P(s0 + 200, h1, W / 2 - 170), 'z', 80, 8, 24), K.disc(P(s0 + 200, h1, -W / 2 + 170), 'z', 80, 8, 24));
    const d = display(K, t, finish('source', '#141517', .1, .5));
    K.add('Tablet cradle', F.plastic, K.bar(P(d.back + 10, h1), P(d.back + 5, d.z - 40), 90, 30, 8));
  },
  /** Horizon 7.0 AT: slanted console with twin speaker / storage wings, handrails wrapping back, tablet holder. */
  horizon(K, t, c) {
    const P = K.P, W = t.W, u = t.upright;
    const face = (x0: number, w: number, s0: number, s1: number, lo: number, hi: number, fin: Finish, name: string) =>
      K.add(name, fin, K.plate([[s1 - K.L / 2, lo], [s1 - K.L / 2, lo + 90], [s0 + 40 - K.L / 2, hi], [s0 - K.L / 2, hi - 70], [s0 + 60 - K.L / 2, lo]], x0, w, 18));
    face(-310, 620, 85, 530, 1110, 1395, F.plastic, 'Console');
    for (const x of [-1, 1]) face(x > 0 ? 250 : -W / 2 + 60, W / 2 - 310, 150, 520, 1120, 1335, finish('source', '#26282b', .1, .55), 'Console wings');
    K.add('Console panel', finish('source', '#0f1012', .2, .3), K.plate([[480 - K.L / 2, 1210], [150 - K.L / 2, 1392], [140 - K.L / 2, 1380], [470 - K.L / 2, 1196]].map(([y, z]) => [y + 12, z + 8] as Vec2), -230, 460, 4));
    K.add('LCD', F.screen, K.plate([[400 - K.L / 2, 1270], [250 - K.L / 2, 1352], [244 - K.L / 2, 1340], [394 - K.L / 2, 1258]].map(([y, z]) => [y + 20, z + 14] as Vec2), -110, 220, 0));
    for (const x of [-1, 1]) {
      K.add('Handrails', finish('source', '#1d1e20', .2, .5), K.pipe([P(430, 1150, x * (W / 2 - 110)), P(560, u.h1 + 10, x * (W / 2 - 23)), P(910, u.h1 - 5, x * (W / 2 - 23))], 46, 18));
      K.add('QuickDial controls', F.chrome, K.disc(P(640, u.h1 + 30, x * (W / 2 - 28)), 'z', 56, 20, 28));
      K.add('Handrail grips', F.foam, K.rod(P(700, u.h1 + 2, x * (W / 2 - 25)), P(905, u.h1 - 5, x * (W / 2 - 25)), 50, 18));
      K.add('Console panel', c.accent, K.disc(P(640, u.h1 + 41, x * (W / 2 - 28)), 'z', 30, 3, 20));
    }
    const d = display(K, t, F.plastic);
    K.add('Tablet cradle', F.plastic, K.bar(P(d.back + 20, 1330), P(d.back + 10, d.z - 30), 70, 26, 8));
  },
  /** NordicTrack Z frame: curved crossbar console with control strip and fan grille, display housing over a fabric speaker bar. */
  nt(K, t, c) {
    const P = K.P, [as, ah] = c.armTop, x = c.ux + t.upright.thick / 2 - 10;
    K.add('Console', finish('source', '#34363a', .2, .5), K.hull([K.move(K.pad(2 * x, 110, 72, 36, [0, 0, 0]), P(as + 30, ah - 36)), K.move(K.pad(2 * x - 120, 90, 60, 30, [0, 0, 0]), P(as - 25, ah - 24))]));
    K.add('Console panel', finish('source', '#101113', .2, .3), K.span(P(as - 40, ah + 36, -x + 90), P(as + 60, ah + 37.2, x - 90)));
    K.add('Console panel', finish('source', '#2b2d30', .1, .5), K.span(P(as + 65, ah + 20, -150), P(as + 85, ah + 36, 150)));
    K.add('Stop key', c.accent, K.disc(P(as + 10, ah + 40, 0), 'z', 34, 8, 24));
    const d = display(K, t, finish('source', '#111214', .1, .45), t.display.h * .1);
    const bar = t.display.h * .22;
    d.strip(-t.display.h / 2 + bar / 2 + 6, t.display.w - 14, bar, finish('source', '#2d2f32', 0, .95), 'Speaker bar fabric');
    K.add('Display mount', finish('source', '#141517', .1, .5), K.bar(P(d.back + 20, ah + 30), P(d.back + 20, d.z - t.display.h / 2 + 10), 90, 40, 10));
    const w = K.word('NordicTrack', 18, [0, d.back - K.L / 2 + t.display.t + 1.3, d.z + t.display.h / 2 - 20], [1, 0, 0], [0, 0, 1], .6, 150);
    if (w) K.add('Console lettering', finish('source', '#c9cbcd', .1, .5), w);
  },
  /** NordicTrack T 6.5 S: black console with silver side panels and blue LCD, handrails, tablet shelf. */
  nt65(K, t, c) {
    const P = K.P, W = t.W, u = t.upright, silver = finish('source', '#b8bcc0', .7, .3);
    K.add('Console', F.plastic, K.hull([K.move(K.pad(640, 120, 60, 30, [0, 0, 0]), P(u.s1 + 60, u.h1 - 10)), K.move(K.pad(420, 110, 60, 30, [0, 0, 0]), P(150, t.H - 60))]));
    for (const x of [-1, 1]) K.add('Console side panels', silver, K.hull([K.move(K.pad(60, 90, 50, 14, [0, 0, 0]), P(u.s1 + 40, u.h1 + 20, x * 250)), K.move(K.pad(50, 80, 50, 14, [0, 0, 0]), P(175, t.H - 70, x * 190))]));
    for (const x of [-1, 1]) K.add('Console wings', finish('source', '#27292c', .1, .55), K.hull([K.move(K.pad(150, 200, 60, 30, [0, 0, 0]), P(u.s1 + 60, u.h1 - 40, x * 340)), K.move(K.pad(120, 140, 50, 30, [0, 0, 0]), P(u.s1 - 60, u.h1 + 90, x * 330))]));
    display(K, t, finish('source', '#16181b', .1, .4));
    K.add('LCD backlight', finish('source', '#3f7fd6', .1, .2), K.span(P(t.display.s - 1, 1210, -52), P(t.display.s + 1.5, 1270, 52)));
    for (const x of [-1, 1]) {
      K.add('Handrails', finish('source', '#1d1e20', .2, .5), K.pipe([P(u.s1 + 40, u.h1 + 20, x * 330), P(u.s1 + 130, u.h1 + 10, x * (W / 2 - 24)), P(820, u.h1 - 20, x * (W / 2 - 24))], 44, 18));
      K.add('Handrail grips', silver, K.rod(P(560, u.h1 + 3, x * (W / 2 - 24)), P(700, u.h1 - 10, x * (W / 2 - 24)), 48, 18));
    }
    K.add('Stop key', c.accent, K.disc(P(u.s1 + 110, u.h1 + 36, 0), 'z', 26, 8, 20));
  },
  /** ProForm Pro 2000: tall console with silver speaker grilles, blue LCD, accessory tray and tablet holder; handrails. */
  proform(K, t, c) {
    const P = K.P, W = t.W, u = t.upright, silver = finish('source', '#b3b7bb', .75, .3);
    K.add('Console', F.plastic, K.hull([K.move(K.pad(700, 130, 70, 30, [0, 0, 0]), P(u.s1 + 90, u.h1 - 20)), K.move(K.pad(520, 110, 50, 30, [0, 0, 0]), P(170, 1330))]));
    for (const x of [-1, 1]) K.add('Speaker grilles', silver, K.hull([K.move(K.pad(170, 120, 20, 20, [0, 0, 0]), P(u.s1 + 60, u.h1 + 48, x * 250)), K.move(K.pad(120, 90, 20, 20, [0, 0, 0]), P(u.s1 - 30, u.h1 + 100, x * 230))]));
    K.add('Console panel', finish('source', '#101113', .2, .3), K.hull([K.move(K.pad(330, 40, 4, 8, [0, 0, 0]), P(u.s1 - 30, u.h1 + 118)), K.move(K.pad(340, 40, 4, 8, [0, 0, 0]), P(200, 1380))]));
    K.add('LCD', finish('source', '#3f7fd6', .1, .2), K.hull([K.move(K.pad(200, 20, 3, 4, [0, 0, 0]), P(u.s1 - 110, u.h1 + 180)), K.move(K.pad(200, 20, 3, 4, [0, 0, 0]), P(230, 1370))]));
    K.add('Accessory tray', F.plastic, K.span(P(u.s1 + 150, u.h1 - 140, -300), P(u.s1 + 260, u.h1 - 110, 300)));
    for (const x of [-1, 1]) {
      K.add('Handrails', finish('source', '#1d1e20', .2, .5), K.pipe([P(u.s1 + 60, u.h1 + 10, x * 330), P(u.s1 + 170, u.h1, x * (W / 2 - 24)), P(900, u.h1 - 25, x * (W / 2 - 24))], 46, 18));
      K.add('Handrail grips', silver, K.rod(P(600, u.h1 - 8, x * (W / 2 - 25)), P(760, u.h1 - 16, x * (W / 2 - 25)), 50, 18));
    }
    K.add('Stop key', c.accent, K.disc(P(u.s1 + 120, u.h1 + 58, 0), 'z', 30, 8, 20));
    const d = display(K, t, F.plastic);
    K.add('Tablet cradle', F.plastic, K.bar(P(d.back + 20, 1360), P(d.back + 10, d.z - 30), 60, 24, 8));
  },
  /** Peloton Tread: round-tube handlebar loop across the front, screen on its post. */
  peloton(K, t, c) {
    const P = K.P, [as, ah] = c.armTop, x = c.ux - 10, d = t.upright.depth * .8;
    K.add('Uprights', c.frame, K.pipe([P(as + 40, ah, -x), P(as + 12, ah + 6, -x + 60), P(as, ah + 8, 0), P(as + 12, ah + 6, x - 60), P(as + 40, ah, x)].map(q => [q[0], q[1], q[2]] as Vec3), d * .82, 20));
    K.add('Handrail grips', F.foam, K.rod(P(as + 180, ah - 4, -x), P(as + 420, ah - 20, -x), d + 3, 20), K.rod(P(as + 180, ah - 4, x), P(as + 420, ah - 20, x), d + 3, 20));
    K.add('Console panel', finish('source', '#101113', .2, .3), K.span(P(as + 210, ah + 10, -150), P(as + 300, ah + 40, 150)));
    K.add('Speed knobs', finish('source', '#2d2f33', .6, .35), K.disc(P(as + 300, ah + 12, -x + 70), 'z', 58, 30, 24), K.disc(P(as + 300, ah + 12, x - 70), 'z', 58, 30, 24));
    K.add('Stop key', c.accent, K.span(P(as + 250, ah + 40, -40), P(as + 280, ah + 42, 40)));
    const dd = display(K, t, finish('source', '#141517', .1, .45));
    K.add('Display mount', c.frame, K.bar(P(dd.back + 30, ah + 10), P(dd.back + 30, dd.z - 60), 70, 50, 14));
    K.add('Speaker bar fabric', finish('source', '#4a4c50', 0, .95), K.span(P(t.display.s - 1, t.display.top - 40, -t.display.w / 2 + 8), P(t.display.s + .8, t.display.top - 4, t.display.w / 2 - 8)));
  },
};
