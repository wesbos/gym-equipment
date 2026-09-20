/** Sled builders: Torque TANK M1, Rogue Slice / Echo Dog / Dog Sled 1.2 and the Titan Pro Sled.
 * Frame: X across, Y along the sled (push poles / rear axle at +Y… except the TANK, whose nose housing is +Y), Z up,
 * origin on the floor at the footprint centre. Loaded plates come from the shared buildPlateStack on the horn. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { buildPlateStack } from './plates.ts';
import { conditioningKit, type ConditioningKit, type Mat } from './conditioning-kit.ts';
import { ECHO_SLED, SLED_LOADS, SLICE_SLED, type TubeSledSpec } from '../floor-parts/conditioning.ts';
import { TANK, tankLayout } from '../floor-parts/conditioning-layouts.ts';
const ROGUE_BLACK: Mat = ['Black textured powder coat', 'source', '#1d1e20', .35, .72];
const TITAN_BLACK: Mat = ['Black powder coat', 'source', '#1b1c1e', .3, .62];
const ZINC: Mat = ['Zinc-plated hardware', 'fastener', '#c3c7cb', .9, .3];
const WHITE_PRINT: Mat = ['White printed branding', 'source', '#ecebe6', 0, .55];
const CUT_THROUGH: Mat = ['Laser-cut lettering', 'source', '#060606', 0, .9];
const PLASTIC_CAP: Mat = ['Black plastic end caps', 'liner', '#121314', 0, .55];
function loadPlates(api: ManifoldAPI, t: ConditioningKit, load: number, at: Vec3) {
  const l = SLED_LOADS[load]; if (!l) throw Error('Unsupported sled load.');
  if (l.plates.length) t.adopt(buildPlateStack(api, l.plates, { origin: at, axis: [0, 0, 1], name: 'plate', segments: 72 }));
}
/** Side profile of a bent skid strip of thickness `th`: flat run on the floor, both ends turned up at 45° to height `rise`. */
function bentStrip(L: number, rise: number, th: number): Vec2[] {
  const r2 = Math.SQRT2 * th, e = rise, h = L / 2;
  return [[-h + e, 0], [h - e, 0], [h, rise], [h - r2, rise], [h - e + th - r2 + th * 0, th], [-h + e - th + r2, th], [-h + r2, rise], [-h, rise]];
}
/** Hollow pole sleeve (receiver) standing on z0. */
function sleeve(t: ConditioningKit, x: number, y: number, z0: number, h: number, d: number) {
  return t.cut(t.cyl('z', z0, z0 + h, d, x, y, 40), [t.cyl('z', z0 + 8, z0 + h + 1, d - 9.5, x, y, 40)]);
}
/** Push pole with a plastic end cap whose top is exactly `top`. */
function pole(t: ConditioningKit, mat: Mat, x: number, y: number, z0: number, top: number, d: number) {
  t.add(mat, t.cyl('z', z0, top - 10, d, x, y, 40));
  t.add(PLASTIC_CAP, t.cyl('z', top - 12, top - 2.5, d + 1.2, x, y, 40), t.cyl('z', top - 2.6, top, d - 3, x, y, 40, d - 6));
}
/** Centre horn: base collar, tube and cap (top = z0 + loadable + 14). */
function horn(t: ConditioningKit, mat: Mat, y: number, z0: number, d: number, loadable: number) {
  t.add(mat, t.cyl('z', z0 - 2, z0 + loadable + 10, d, 0, y, 40), t.cyl('z', z0 - 2, z0 + 14, d + 16, 0, y, 40, d + 4));
  t.add(PLASTIC_CAP, t.cyl('z', z0 + loadable + 8, z0 + loadable + 14, d + 1, 0, y, 40));
}
/** Hex bolt head + washer on a face whose outward normal is ±X at x. */
function bolt(t: ConditioningKit, x: number, y: number, z: number, side: 1 | -1, af = 19) {
  const span = (a: number, b: number) => side > 0 ? [x + a, x + b] as const : [x - b, x - a] as const;
  const [w0, w1] = span(0, 2.5), [h0, h1] = span(2.5, 10);
  t.add(ZINC, t.cyl('x', w0, w1, af * 1.9, y, z, 28), t.cyl('x', h0, h1, af * 1.15, y, z, 6));
}
// ------------------------------------------------------------------------------------------------ Dog Sled 1.2 / Titan Pro Sled
export function buildTubeSled(api: ManifoldAPI, s: TubeSledSpec, p: NumericParams): SolidPart[] {
  const t = conditioningKit(api), steel = s.brand === 'rogue' ? ROGUE_BLACK : TITAN_BLACK, L = s.L, W = s.W, tw = s.tube.w, th = s.tube.h;
  const UHMW: Mat = ['Black UHMW ski shoes', 'liner', '#151516', 0, .58];
  return t.finish(s.brand === 'rogue' ? 'Rogue Dog Sled' : 'Titan Pro Sled', [0, 0, 0], () => {
    const base = s.ends === 'skid' ? 6.35 : 12.7, top = base + th, xc = W / 2 - s.skid / 2, deckTop = top - s.deck.drop;
    for (const side of [-1, 1] as const) {
      const x0 = side * xc, xo = x0 + side * tw / 2, xi = x0 - side * tw / 2;
      // Runner tube with 45° chamfered ends sitting on the skid / shoes.
      const strip = bentStrip(L, top, base), tubePoly: Vec2[] = [strip[5], strip[4], strip[3], strip[6]];
      let tubeSolid = t.profileX(tubePoly, x0 - tw / 2, x0 + tw / 2);
      const holes: Manifold[] = [], zc = base + th / 2;
      for (let y = -L / 2 + 150; y <= L / 2 - 150; y += s.holes.pitch) {
        if (Math.abs(y) < (s.brand === 'rogue' ? 175 : 150)) continue;
        if (s.brand === 'rogue' && Math.abs(Math.abs(y) - 205) < 30) continue;
        holes.push(t.cyl('x', x0 - tw / 2 - 1, x0 + tw / 2 + 1, s.holes.d, y, zc, 20));
      }
      tubeSolid = t.cut(tubeSolid, holes);
      if (s.brand === 'titan') {
        // Laser-cut •TITAN• through the outer wall: recessed, with the dark tube interior behind.
        const letters = t.fitText('TITAN', 200, th * .42, .1), u: Vec3 = [0, side, 0], v: Vec3 = [0, 0, 1];
        const recess = t.decal(letters, [xo + side * .01, 0, zc], u, v, 3, 2.99);
        const dots = [-1, 1].map(e => t.cyl('x', side > 0 ? xo - 3 : xo - .01, side > 0 ? xo + .01 : xo + 3, 9, e * 122, zc, 16));
        tubeSolid = t.cut(tubeSolid, [...(recess ? [recess] : []), ...dots]);
        t.add(CUT_THROUGH, t.decal(letters, [xo, 0, zc], u, v, 1, 2.6), ...[-1, 1].map(e => t.cyl('x', side > 0 ? xo - 2.6 : xo + 1.6, side > 0 ? xo - 1.6 : xo + 2.6, 9, e * 122, zc, 16)));
      } else {
        t.add(WHITE_PRINT, t.decal(t.fitText('ROGUE', 190, th * .36, .06), [xo, 0, zc + 6], [0, side, 0], [0, 0, 1], .5, .2),
          t.decal(t.fitText('MADE IN THE U.S.A.', 110, 5), [xo, 0, zc - 17], [0, side, 0], [0, 0, 1], .5, .2));
        for (const y of [-205, 205]) bolt(t, xo, y, zc, side);
      }
      if (s.brand === 'titan') for (const y of [-205, 205]) bolt(t, xo, y, zc, side, 17);
      t.add(steel, tubeSolid);
      // Skid plate (Rogue) or UHMW shoes at the ends (Titan).
      const skid = t.profileX(strip, x0 - s.skid / 2, x0 + s.skid / 2);
      if (s.ends === 'skid') t.add(steel, skid);
      else {
        for (const e of [-1, 1]) {
          const zone = t.box([x0 - s.skid / 2 - 1, e > 0 ? L / 2 - 250 : -L / 2 - 1, -1], [x0 + s.skid / 2 + 1, e > 0 ? L / 2 + 1 : -L / 2 + 250, top + 1]);
          t.add(UHMW, t.meet(skid, zone));
          for (const k of [0, 1]) { const y = e * (L / 2 - 175 - k * 45); t.add(ZINC, t.cyl('z', base, base + 7, 13, x0 + (k ? 1 : -1) * (tw / 2 + 5), y, 6)); }
        }
      }
      // Pole sleeves on the inner face at both ends; push poles in the +Y (rear) pair.
      for (const e of [-1, 1]) {
        const y = e * (L / 2 - s.receiver.inset), rx = xi - side * (s.receiver.d / 2 - 6);
        t.add(steel, sleeve(t, rx, y, base + th * .35, th * .65 + s.receiver.h, s.receiver.d));
        if (e > 0) pole(t, steel, rx, y, base + th * .35 + 8, s.H, s.pole);
      }
    }
    // Deck plate between the runners, with the front carabiner tab and slot.
    const dw = s.deck.w / 2, dl = s.deck.l / 2, tab = 34, deckOutline: Vec2[] = [[-dw, -dl], [-38, -dl], [-30, -dl - tab], [30, -dl - tab], [38, -dl], [dw, -dl], [dw, dl], [-dw, dl]];
    const slot = t.planProfile([[-18, -dl - tab + 8], [18, -dl - tab + 8], [18, -dl - tab + 18], [-18, -dl - tab + 18]], deckTop - 10, deckTop + 1);
    t.add(steel, t.cut(t.planProfile(deckOutline, deckTop - 6.35, deckTop), [slot]));
    let z0 = deckTop;
    if (s.disc) { t.add(['Rubber divider disc', 'liner', '#161617', 0, .88], t.cyl('z', deckTop, deckTop + s.disc.t, s.disc.d, 0, 0, 72)); z0 += s.disc.t; }
    horn(t, steel, 0, z0, s.horn.d, s.horn.loadable);
    loadPlates(api, t, p.load, [0, 0, z0]);
  });
}
// ------------------------------------------------------------------------------------------------ Rogue Echo Dog Sled
export function buildEchoSled(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = conditioningKit(api), s = ECHO_SLED, L = s.L, W = s.W, th = s.t, steel = ROGUE_BLACK;
  return t.finish('Rogue Echo Dog Sled', [0, 0, 0], () => {
    const rise = 46, sl = 584, deckZ = s.deckZ, bend = 70;
    for (const side of [-1, 1] as const) {
      const xo = side * (W / 2 - th), xs = xo - side * s.skid;
      // Formed runner: skid with upturned tips and an outer wall.
      t.add(steel, t.profileX(bentStrip(L, rise, th), Math.min(xo, xs), Math.max(xo, xs)));
      const wall: Vec2[] = [[-L / 2 + rise + 6, th], [L / 2 - rise - 6, th], [L / 2 - rise - 20, s.wall], [-L / 2 + rise + 20, s.wall]];
      t.add(steel, t.profileX(wall, Math.min(xo, xo - side * th), Math.max(xo, xo - side * th)));
      // Saddle side flange: bent down over the runner wall, ROGUE cut through, four bolts.
      const topSlab = t.box([side > 0 ? W / 2 - bend - th : -(W / 2 - bend), -sl / 2, deckZ - th], [side > 0 ? W / 2 - bend : -(W / 2 - bend - th), sl / 2, deckZ]);
      const lowSlab = t.box([side > 0 ? W / 2 - th : -W / 2, -sl / 2 + 44, s.wall + 2], [side > 0 ? W / 2 : -(W / 2 - th), sl / 2 - 44, s.wall + 2 + th]);
      const zc = (deckZ + s.wall + 2) / 2, xm = side * (W / 2 - bend / 2 - th / 2), slope = Math.atan2(deckZ - th - s.wall - 2, bend);
      const up: Vec3 = [-side * Math.cos(slope), 0, Math.sin(slope)];
      // ROGUE laser-cut clean through the flange.
      const letters = t.decal(t.fitText('ROGUE', 200, 38, .06), [xm, 0, zc], [0, side, 0], up, 30, 15);
      t.add(steel, t.cut(t.hull([topSlab, lowSlab]), letters ? [letters] : []));
      for (const y of [-150, 150]) for (const dz of [-15, 15]) {
        const bz = zc + dz * Math.sin(slope), bx = xm - side * dz * Math.cos(slope) + side * 3;
        t.add(ZINC, t.cyl('x', side > 0 ? bx : bx - 8, side > 0 ? bx + 8 : bx, 20, y, bz, 6));
      }
      // Sleeves at the four corners on the skid; poles in the rear pair.
      for (const e of [-1, 1]) {
        const x = side * (W / 2 - th * 2 - s.skid / 2 + 4), y = e * (L / 2 - rise - 58);
        t.add(steel, sleeve(t, x, y, th, s.receiver.h, s.receiver.d));
        if (e > 0) pole(t, steel, x, y, th + 8, s.H, s.pole);
      }
    }
    // Deck: spine between two windows, carabiner slot at the front.
    const dw = W / 2 - bend, deck = t.planProfile([[-dw, -sl / 2], [dw, -sl / 2], [dw, sl / 2], [-dw, sl / 2]], deckZ - th, deckZ);
    const win = (sx: number) => t.planProfile(([[-(dw - 38), -215], [-52, -215], [-34, -40], [-34, 40], [-52, 215], [-(dw - 38), 215]] as Vec2[]).map(([x, y]) => [x * sx, y] as Vec2), deckZ - th - 1, deckZ + 1);
    const slot = t.planProfile([[-7, -sl / 2 + 22], [7, -sl / 2 + 22], [7, -sl / 2 + 52], [-7, -sl / 2 + 52]], deckZ - th - 1, deckZ + 1);
    t.add(steel, t.cut(deck, [win(1), win(-1), slot]));
    horn(t, steel, 0, deckZ, s.horn.d, s.horn.loadable);
    loadPlates(api, t, p.load, [0, 0, deckZ]);
  });
}
// ------------------------------------------------------------------------------------------------ Rogue Slice Sled
export function buildSliceSled(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = conditioningKit(api), s = SLICE_SLED, L = s.L, W = s.W, th = s.t, steel = ROGUE_BLACK;
  return t.finish('Rogue Slice Sled', [0, 0, 0], () => {
    const yPost = L / 2 - s.postFromRear, folded = !!p.post;
    // Base plate: tapered runners (RA1266 outline) joined by the deck, front strap tab.
    const inFront = W / 2 - 62, inRear = W / 2 - 118, deckFront = -L / 2 + 92;
    const outline: Vec2[] = [[-W / 2, L / 2], [-W / 2, -L / 2 + 34], [-W / 2 + 26, -L / 2], [-inFront, -L / 2], [-inFront + 8, deckFront], [-34, deckFront], [-26, deckFront - 40], [26, deckFront - 40], [34, deckFront], [inFront - 8, deckFront], [inFront, -L / 2], [W / 2 - 26, -L / 2], [W / 2, -L / 2 + 34], [W / 2, L / 2]];
    const windows = [
      t.planProfile([[-46, L / 2 - 120], [46, L / 2 - 120], [46, L / 2 - 36], [-46, L / 2 - 36]], -1, th + 1),
      t.planProfile([[-34, yPost - 60], [34, yPost - 60], [34, deckFront + 70], [-34, deckFront + 70]], -1, th + 1),
      t.cyl('z', -1, th + 1, 22, 0, deckFront - 18, 24),
    ];
    t.add(steel, t.cut(t.planProfile(outline, 0, th), windows));
    for (const side of [-1, 1] as const) {
      // Runner fin: tall at the rear, tapering to the front, ROGUE laser-cut; a folded ledge along the rear top.
      const xo = side * (W / 2 - .5), xi = xo - side * th, wallH = (y: number) => s.wallFront + (s.wallRear - s.wallFront) * (y + L / 2 - 30) / (L - 30);
      const fin: Vec2[] = [[-L / 2 + 30, th], [L / 2, th], [L / 2, s.wallRear], [-L / 2 + 30 + 40, wallH(-L / 2 + 70)], [-L / 2 + 30, s.wallFront]];
      const letters = t.decal(t.fitText('ROGUE', 190, 30, .06), [xo, 60, th + 26], [0, side, 0], [0, 0, 1], 20, 10);
      t.add(steel, t.cut(t.profileX(fin, Math.min(xo, xi), Math.max(xo, xi)), letters ? [letters] : []));
      const ledge = (y: number) => t.box([side > 0 ? W / 2 - 52 : -(W / 2 - .5), y - 1, wallH(y) - th], [side > 0 ? W / 2 - .5 : -(W / 2 - 52), y + 1, wallH(y)]);
      t.add(steel, t.hull([ledge(L / 2 - 250), ledge(L / 2 - 58)]));
      // Front ski lip, inner cheek plate and the rear pole sleeve with its push pole.
      t.add(steel, t.hull([t.box([side > 0 ? inFront - 4 : -W / 2 + 20, -L / 2, 0], [side > 0 ? W / 2 - 20 : -inFront + 4, -L / 2 + 8, th]), t.box([side > 0 ? inFront + 6 : -W / 2 + 26, -L / 2 + 4, 16], [side > 0 ? W / 2 - 26 : -inFront - 6, -L / 2 + 10, 22])]));
      const rx = side * (W / 2 - 50), ry = L / 2 - 44;
      t.add(steel, sleeve(t, rx, ry, th, s.receiver.h, s.receiver.d));
      pole(t, steel, rx, ry, th + 8, s.H, s.pole);
    }
    // Folding weight post on a clevis at the rear of the deck.
    const pz = th + 30, d = s.horn.d, ear = (sx: number) => t.box([sx > 0 ? d / 2 + 2 : -d / 2 - 10, yPost - 28, th], [sx > 0 ? d / 2 + 10 : -d / 2 - 2, yPost + 28, pz + 22]);
    t.add(steel, ear(1), ear(-1));
    t.add(ZINC, t.cyl('x', d / 2 + 10, d / 2 + 20, 30, yPost, pz, 6), t.cyl('x', -d / 2 - 16, -d / 2 - 10, 26, yPost, pz, 28));
    if (!folded) {
      horn(t, steel, yPost, th, d, s.horn.loadable);
      loadPlates(api, t, p.load, [0, yPost, th]);
    } else {
      const len = s.horn.loadable + 24;
      t.add(steel, t.cyl('y', yPost - len, yPost + 26, d, 0, pz, 40));
      t.add(PLASTIC_CAP, t.cyl('y', yPost - len - 6, yPost - len + 2, d + 1, 0, pz, 40));
    }
  });
}
// ------------------------------------------------------------------------------------------------ Torque TANK M1
export function buildTankM1(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const t = conditioningKit(api), T = TANK, lay = tankLayout(p.bar);
  const FRAME: Mat = ['Black textured chassis', 'source', '#1f2022', .3, .7];
  const HOUSING: Mat = ['Black moulded resistance housing', 'source', '#18191b', .05, .42];
  const PANEL: Mat = ['Graphite housing panels', 'source', '#43464a', .1, .5];
  const ORANGE: Mat = ['Orange adjusters and caps', 'source', '#f06a1b', 0, .45];
  const RUBBER: Mat = ['Knobby airless tyres', 'liner', '#151515', 0, .9];
  const FOAM: Mat = ['Textured foam grips', 'handle', '#161718', 0, .92];
  return t.finish('TANK M1', lay.shift, () => {
    t.add(RUBBER, t.mesh(lay.meshes.tyres));
    t.add(['Zinc rear wheel hubs', 'source', '#b9bec3', .85, .32], t.mesh(lay.meshes.rearHubs));
    t.add(['Black front wheel hub', 'source', '#222325', .3, .5], t.mesh(lay.meshes.frontHub));
    t.add(FRAME, t.mesh(lay.meshes.posts), t.mesh(lay.meshes.bar), t.mesh(lay.meshes.dring));
    t.add(FOAM, t.mesh(lay.meshes.grips));
    // Rear frame: crossbar, axle stubs, push-handle receivers and the centre tow loop.
    const cb = T.crossbar, rw = T.rearWheel;
    t.add(FRAME, t.box([-cb.x, -cb.w, cb.z0], [cb.x, cb.w, cb.z1]));
    for (const sx of [-1, 1]) {
      t.add(ZINC, t.cyl('x', sx > 0 ? cb.x : -(rw.x - rw.w / 2 + 6), sx > 0 ? rw.x - rw.w / 2 + 6 : -cb.x, 25, 0, T.axleZ, 24));
      t.add(FRAME, t.cyl('z', cb.z1 - 2, T.receiver.top, T.receiver.d, sx * T.receiver.x, 0, 40));
      t.add(ZINC, t.cyl('y', -T.receiver.d / 2 - 2.5, -T.receiver.d / 2 + 1, 16, sx * T.receiver.x, cb.z1 + 44, 16));
    }
    t.add(FRAME, t.hull([t.box([-16, -8, cb.z1], [16, 8, cb.z1 + 6]), t.box([-12, -6, cb.z1 + 34], [12, 6, cb.z1 + 40])]));
    // Chassis rails, deck plate and the plate horn.
    const r = T.rails;
    for (const sx of [-1, 1]) t.add(FRAME, t.box([sx > 0 ? r.x0 : -r.x1, r.w0, r.z0], [sx > 0 ? r.x1 : -r.x0, r.w1, r.z1]));
    t.add(FRAME, t.box([-r.x0, T.deck.w0, T.deck.z0], [r.x0, T.deck.w1, r.z1]));
    const h = T.horn;
    t.add(FRAME, t.cyl('z', r.z1, h.top, h.d, 0, h.w, 40), t.cyl('z', r.z1, r.z1 + 12, h.d + 18, 0, h.w, 40));
    t.add(ORANGE, t.cyl('z', h.top, h.top + h.cap, h.d + 2, 0, h.w, 40));
    loadPlates(api, t, p.load, [0, h.w, r.z1]);
    // Nose housing over the Mag-Force wheel: slot for the tyre, graphite side and top panels, orange resistance T-handle.
    const hx = T.housing.x, prof = T.housing.profile;
    const housing = t.cut(t.profileX(prof, -hx, hx), [t.box([-43, 790, 170], [43, T.nose + 1, 400])]);
    t.add(HOUSING, housing);
    for (const sx of [-1, 1] as const) {
      const xf = sx * hx;
      t.add(PANEL, t.box([sx > 0 ? xf : xf - .6, 520, 196], [sx > 0 ? xf + .6 : xf, 770, 298]));
      const u: Vec3 = [0, sx, 0], v: Vec3 = [0, 0, 1];
      t.add(WHITE_PRINT, t.decal(t.fitText('TANK', 105, 38), [xf + sx * .6, 645 - sx * 42, 262], u, v, .5, .2));
      t.add(ORANGE, t.decal(t.fitText('M1', 58, 38), [xf + sx * .6, 645 + sx * 58, 262], u, v, .5, .2));
      t.add(ORANGE, t.decal(t.fitText('ALL SURFACE SLED', 150, 9), [xf + sx * .6, 645, 222], u, v, .5, .2));
      // Rail decals.
      t.add(WHITE_PRINT, t.decal(t.fitText('TORQUE', 130, 30), [sx * r.x1, 300, (r.z0 + r.z1) / 2], u, v, .5, .2));
      // Pivot boss, bracket, bolt and orange spring pin for the push/pull bar.
      const pv = T.pivot;
      t.add(PANEL, t.cyl('x', sx > 0 ? hx : -hx - 8, sx > 0 ? hx + 8 : -hx, 104, pv.w, pv.z, 48));
      t.add(FRAME, t.box([sx > 0 ? hx : -pv.x + 12, pv.w - 34, pv.z - 30], [sx > 0 ? pv.x - 12 : -hx, pv.w + 34, pv.z + 30]));
      t.add(ZINC, t.cyl('x', sx > 0 ? hx : -pv.x - 26, sx > 0 ? pv.x + 26 : -hx, 17, pv.w, pv.z, 16));
      t.add(ORANGE, t.cyl('x', sx > 0 ? pv.x + 20 : -pv.x - 34, sx > 0 ? pv.x + 34 : -pv.x - 20, 22, pv.w + 44, pv.z + 12, 20));
      t.add(FRAME, t.cyl('x', sx > 0 ? hx : -pv.x - 20, sx > 0 ? pv.x + 20 : -hx, 14, pv.w + 44, pv.z + 12, 16));
      // Nose bumpers.
      t.add(RUBBER, t.box([sx > 0 ? 60 : -120, T.nose - 26, 40], [sx > 0 ? 120 : -60, T.nose, r.z1]));
    }
    const topZ = 322;
    t.add(PANEL, t.box([-62, 560, topZ], [62, 780, topZ + .8]));
    t.add(HOUSING, t.box([-7, 590, topZ + .5], [7, 740, topZ + 1.4]));
    t.add(ORANGE, t.box([-8, 690, topZ], [8, 704, topZ + 20]), t.cyl('x', -26, 26, 13, 697, topZ + 24, 16));
  });
}
