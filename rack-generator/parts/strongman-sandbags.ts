/** Strongman sandbags: Manifold builders for floor-parts/strongman-sandbags.ts. */
import type { Manifold } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { floorDefinition, resolveBy } from '../floor-part.ts';
import {
  BELLS_OF_STEEL_SANDBAG, BOS_HANDLE_REACH, BOS_SIZES, CERBERUS_DUAL_PLY, CERBERUS_DUAL_PLY_SIZES, CERBERUS_HUSAFELL_SANDBAG, CERBERUS_SANDSTONE, CERBERUS_THROWING_SANDBAG,
  CYCLONE_SIZES, FREEDOM_COLORS, FREEDOM_SIZES, FREEDOM_STRENGTH_SANDBAG, HUSAFELL_BAG_SIZES, REP_SANDBAG, REP_SANDBAG_COLORS, REP_SANDBAG_SIZES, REP_SLUMP,
  ROGUE_CYCLONE_SANDBAG, ROGUE_ECHO_SANDBAG, ROGUE_SANDBAG_SIZES, ROGUE_STRONGMAN_SANDBAG, SANDSTONE_SIZES, THROWING_SIZES, THROW_HANDLE, type BagSize,
} from '../floor-parts/strongman-sandbags.ts';
import { pick } from '../floor-parts/strongman-loads.ts';
import { noise3, withKit, type Finish, type Kit } from './strongman-kit.ts';
import { bagProfile, layer, rectOutline, sagWarp, sideRegion, softRevolve, webLoop } from './strongman-soft.ts';

const fabric = (color: string, roughness = .9): Finish => ({ color, metalness: 0, roughness });
const VELCRO = fabric('#141416', 1), WEB = fabric('#16171a', .85);
/** Organic fits: the warped shell is scaled back onto its nominal footprint (at most 7%). */
const SOFT_FIT = .07;

interface UprightStyle {
  body: string; /** Top panel colour and how far down the side it wraps (mm). */ top?: { color: string; drop: number };
  /** Zipper protection flap across the top: length/width as fractions of d, optional print bar colour. */ flap?: { color: string; l: number; w: number; print?: string };
  /** Hook-and-loop straps over the closure (Cerberus): count of straps across the top. */ straps?: number;
  /** Print or woven badge on the front (-Y) side: fractional width/height of d/h and centre height fraction. */ badge?: { color: string; w: number; h: number; z: number; shape?: 'rect' | 'shield' | 'eagle'; inner?: string };
  piping?: string; /** Bells of Steel: top grab strap and two side handles. */ handles?: boolean; seed: number;
}
/** Upright filled strongman bag with top closure details. */
function uprightBag(K: Kit, s: BagSize, st: UprightStyle) {
  const d = s.d, h = s.h, rb = (s.bottom ?? d) / 2, rt = (s.top ?? d) / 2, short = Math.min(1, h / d);
  const belly = .035 * d * (s.top ? .6 : 1), cb = Math.min(.1 * d, .3 * h), ct = Math.min(.17 * d, .42 * h);
  const trim = s.top ? -belly * .2 : belly * .6, profile = bagProfile({ rb: rb - trim, rt: rt - trim, h, cb, ct, belly, dome: .025 * d * short });
  const warp = sagWarp({ amp: .022, wrinkle: .006, scale: .45 * d, seed: st.seed, lean: .015 }, h);
  const shell = (t: number) => softRevolve(K, profile, t, warp);
  const bag = shell(0), big = d * 2 + 400;
  // Colour split: top panel wraps `drop` mm down the side.
  if (st.top) {
    const split = h - ct - st.top.drop;
    K.add('Bag body', K.inter(bag, K.box([-big, -big, -10], [big, big, split])), fabric(st.body));
    K.add('Top panel', K.inter(bag, K.box([-big, -big, split], [big, big, h + 100])), fabric(st.top.color));
  } else K.add('Bag body', bag, fabric(st.body));
  if (st.piping) for (const z of [cb * .45, h - ct * .5]) K.add('Seam piping', layer(K, shell, 2.5, K.box([-big, -big, z - 4], [big, big, z + 4])), fabric(st.piping, .8));
  const topBand = (w: number, l: number, angle = 0, drop = h * .45) => K.rot(K.move(K.slab(w, l, drop + 200, Math.min(w, l) * .12, [0, 0, 0]), [0, 0, h - drop]), [0, 0, angle]);
  if (st.flap) {
    const f = layer(K, shell, 5, topBand(st.flap.l * d, st.flap.w * d));
    K.add('Zipper flap', f, fabric(st.flap.color, .85));
    if (st.flap.print) K.add('Logo print', layer(K, shell, 6, topBand(st.flap.l * d * .55, st.flap.w * d * .28)), fabric(st.flap.print, .7));
  }
  if (st.straps) for (let i = 0; i < st.straps; i++) K.add('Hook-and-loop straps', layer(K, shell, 2.5, topBand(.2 * d, 1.2 * d, 90 + (i - (st.straps - 1) / 2) * 32, Math.min(h * .45, ct + .12 * d))), VELCRO);
  if (st.badge) {
    const b = st.badge, below = st.top ? h - ct - st.top.drop - 20 : h - ct * .6, bh = Math.min(b.h * d, .7 * h, (below - .08 * h)), cz = Math.min(b.z * h, below - bh / 2), bw = b.w * d;
    if (b.shape === 'eagle') {
      // Winged mark over a two-line wordmark (plain shapes, no artwork).
      const wy = cz + bh * .22, wing: Vec2[] = [[-bw / 2, wy + bh * .28], [-bw * .12, wy + bh * .04], [0, wy + bh * .2], [bw * .12, wy + bh * .04], [bw / 2, wy + bh * .28], [bw * .2, wy - bh * .12], [0, wy - bh * .26], [-bw * .2, wy - bh * .12]];
      for (const o of [wing, rectOutline(0, cz - bh * .16, bw * .95, bh * .17, 3), rectOutline(0, cz - bh * .38, bw * .72, bh * .14, 3)]) K.add('Print', layer(K, shell, 1.2, sideRegion(K, o, d, 0)), fabric(b.color, .75));
    } else {
    const outline: Vec2[] = b.shape === 'shield'
      ? [[-bw / 2, cz + bh * .5], [-bw * .18, cz + bh * .3], [0, cz + bh * .5], [bw * .18, cz + bh * .3], [bw / 2, cz + bh * .5], [bw * .42, cz - bh * .05], [0, cz - bh * .5], [-bw * .42, cz - bh * .05]]
      : rectOutline(0, cz, bw, bh, Math.min(bw, bh) * .08);
    K.add('Print', layer(K, shell, 1.2, sideRegion(K, outline, d, 0)), fabric(b.color, .75));
    if (b.inner) K.add('Print detail', layer(K, shell, 1.8, sideRegion(K, rectOutline(0, cz, bw * .78, bh * .36, 3), d, 0)), fabric(b.inner, .75));
    }
  }
  if (st.handles) {
    // Top grab strap across the closure with a raised loop, and two short side handles at the rim.
    K.add('Webbing handles', layer(K, shell, 3.5, topBand(.13 * d, 1.3 * d, 90, Math.min(h * .45, ct + .1 * d))), WEB);
    K.add('Webbing handles', K.move(K.rot(webLoop(K, .36 * d, 55, 40, 4), [90, 0, 0]), [0, 0, h - 3]), WEB);
    for (const sx of [-1, 1]) K.add('Webbing handles', K.move(K.rot(webLoop(K, 120, 42, 38, 4), [90, sx * 90, 0]), [sx * (rt + belly * .5 - 10), 0, h - ct - 70]), WEB);
  }
}
const bagBuild = (sizes: readonly BagSize[], style: (p: NumericParams) => UprightStyle, reach = 0) => (api: ManifoldAPI, p: NumericParams): SolidPart[] => withKit(api, K => {
  const s = pick(sizes, p.size, 'sandbag size'); uprightBag(K, s, style(p));
  return K.done({ width: s.d + 2 * reach, depth: s.d, fit: SOFT_FIT });
});
export const buildCerberusDualPly = bagBuild(CERBERUS_DUAL_PLY_SIZES, p => ({ body: '#d7262c', top: { color: '#161618', drop: 22 }, straps: 2, badge: { color: '#141414', w: .5, h: .42, z: .52, shape: 'shield' }, seed: 11 + p.size }));
const rogueStyle = (seed: number): UprightStyle => ({ body: '#1b1c1e', flap: { color: '#202124', l: .78, w: .3, print: '#f1f1ee' }, piping: '#111213', seed });
export const buildRogueStrongman = bagBuild(ROGUE_SANDBAG_SIZES, p => rogueStyle(21 + p.size));
export const buildRogueEcho = bagBuild(ROGUE_SANDBAG_SIZES, p => rogueStyle(31 + p.size));
export const buildRogueCyclone = bagBuild(CYCLONE_SIZES, p => rogueStyle(41 + p.size));
export const buildFreedom = bagBuild(FREEDOM_SIZES, p => { const c = pick(FREEDOM_COLORS, p.color, 'sandbag colour'); return { body: c.body, top: { color: c.top, drop: 6 }, badge: { color: c.logo, w: .46, h: .5, z: .45, shape: 'eagle' }, seed: 51 + p.size }; });
export const buildBellsOfSteel = bagBuild(BOS_SIZES, p => ({ body: '#1c1d1f', badge: { color: '#efefec', w: .36, h: .22, z: .5 }, handles: true, piping: '#121315', seed: 61 + p.size }), BOS_HANDLE_REACH);

/** REP duffel: horizontal shell along Y, slumped flat on the floor, wrap straps, seven handles, camo blotches. */
export function buildRepSandbag(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const s = pick(REP_SANDBAG_SIZES, p.size, 'sandbag size'), [, color] = pick(REP_SANDBAG_COLORS, p.color, 'sandbag colour');
    const R = s.d / 2, L = s.length, profile = bagProfile({ rb: R, rt: R, h: L, cb: R * .38, ct: R * .38, belly: R * .05, dome: R * .06 });
    const n = noise3(71 + p.size);
    // Revolved about Z, laid along Y, then slumped: the lower half flattens and spreads.
    const warp = (v: Vec3) => {
      const y = L / 2 - v[2], z = v[1], x = v[0]; // (x, y, z) -> (x, -z, y): a rotation, so volume stays positive
      const f = 1 + .025 * n(x / R, y / R, z / R), zz = z < 0 ? z * (REP_SLUMP * 2 - 1) : z, spread = 1 + .12 * Math.max(0, -z / R);
      v[0] = x * f * spread; v[1] = y; v[2] = (zz * f) + R * (REP_SLUMP * 2 - 1);
    };
    const shell = (t: number) => softRevolve(K, profile, t, warp, 48);
    const bag = shell(0), big = L * 2;
    K.add('Bag body', bag, fabric(color));
    if (p.color === 3) {
      // Woodland camo: flattened blotches scattered over the tan shell.
      const rnd = (k: number) => { const v = Math.sin(k * 91.7 + 3.1) * 43758.5453; return v - Math.floor(v); };
      for (let i = 0; i < 26; i++) {
        const a = rnd(i) * Math.PI * 2, y = (rnd(i + 50) - .5) * L * .95, r = R * (.28 + .3 * rnd(i + 90));
        K.add(['Camo blotches · olive', 'Camo blotches · brown', 'Camo blotches · green'][i % 3], layer(K, shell, .8 + (i % 3) * .3, K.move(K.k(K.sphere(r, [0, 0, 0], 16).scale([1, 1.9, 1])), [Math.cos(a) * R * 1.1, y, R * .56 + Math.sin(a) * R])), fabric(['#556038', '#6b4a2e', '#2f3b25'][i % 3]));
      }
    }
    // Two wrap straps with grab loops on top, a centre front handle, end loops and a top zipper tape.
    const zTop = R * (REP_SLUMP * 2) - 2;
    for (const sy of [-1, 1]) {
      K.add('Webbing straps', layer(K, shell, 3, K.box([-big, sy * L * .3 - 25, -10], [big, sy * L * .3 + 25, big])), WEB);
      K.add('Webbing straps', K.move(K.rot(webLoop(K, R * .7, 45, 40, 4), [90, 0, 0]), [0, sy * L * .3, zTop]), WEB);
      K.add('Webbing straps', K.move(K.rot(webLoop(K, R * .8, 40, 40, 4), [0, 0, sy > 0 ? 0 : 180]), [0, sy * (L / 2 - 12), R * .75]), WEB);
    }
    K.add('Webbing straps', layer(K, shell, 3, K.box([-big, -L * .3, R * .45], [-R * .5, L * .3, R * .8])), WEB);
    K.add('Webbing straps', K.move(K.rot(webLoop(K, L * .22, 30, 38, 4), [0, 0, 90]), [-R * 1.02, 0, R * .62]), WEB);
    K.add('Zipper tape', layer(K, shell, 2, K.box([-14, -L * .36, R], [14, L * .36, big])), fabric('#0f1011', .6));
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) K.add('Rivet plates', layer(K, shell, 4.5, K.box([sx * 22 - 16, sy * L * .3 - 16, -10], [sx * 22 + 16, sy * L * .3 + 16, big])), fabric('#121314', .5));
    K.add('Print', layer(K, shell, 1.2, K.box([-R * .35, -L * .12, zTop - 20], [R * .35, L * .12, big])), fabric(p.color === 0 ? '#e9e9e6' : '#1a1a1a', .75));
    return K.done({ ...resolveBy(REP_SANDBAG.footprint, p), fit: .12 });
  });
}
/** Cerberus throwing bag: squat kettle bag, black webbing up both sides to the silicone handle. */
export function buildThrowingBag(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const s = pick(THROWING_SIZES, p.size, 'sandbag size'), R = s.d / 2, h = s.h;
    const profile = bagProfile({ rb: R * .82, rt: R * .78, h, cb: h * .28, ct: h * .42, belly: R * .14, dome: h * .06 });
    const warp = sagWarp({ amp: .03, wrinkle: .008, scale: .5 * s.d, seed: 81 + p.size }, h);
    const shell = (t: number) => { const m = softRevolve(K, profile, t, warp, 64); return K.k(m.scale([1, .92, 1])); };
    const bag = shell(0), big = s.d * 2;
    K.add('Bag body', bag, fabric('#d8262d'));
    K.add('Print', layer(K, shell, 1.2, sideRegion(K, [[-R * .62, h * .72], [0, h * .6], [R * .62, h * .72], [R * .5, h * .3], [0, h * .1], [-R * .5, h * .3]], s.d, 0)), fabric('#141414', .75));
    K.add('Zipper and strap', layer(K, shell, 3, K.box([-R * .42, -26, h * .7], [R * .42, 26, big])), VELCRO);
    for (const sx of [-1, 1]) K.add('Webbing', layer(K, shell, 3, K.box([sx > 0 ? R * .45 : -big, -19, h * .3], [sx > 0 ? big : -R * .45, 19, big])), WEB);
    // Handle: webbing loop rising from the bag top, silicone grip across its crown.
    const top = h * .98, span = R * 1.45;
    K.add('Webbing', K.move(K.rot(webLoop(K, span, THROW_HANDLE.rise, 38, 4), [90, 0, 0]), [0, 0, top - h * .22]), WEB);
    K.add('Silicone handle', K.bar('x', -THROW_HANDLE.length / 2 * Math.min(1, span / THROW_HANDLE.length), THROW_HANDLE.length / 2 * Math.min(1, span / THROW_HANDLE.length), THROW_HANDLE.d, 0, top - h * .22 + THROW_HANDLE.rise - 4, 24), { color: '#141416', metalness: 0, roughness: .55, role: 'handle' });
    return K.done({ ...resolveBy(CERBERUS_THROWING_SANDBAG.footprint, p), fit: .12 });
  });
}
/** Cerberus Húsafell sandbag lying face up: coffin-hexagon pillow, red face, black walls and piping, Velcro strap. */
export function buildHusafellBag(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const s = pick(HUSAFELL_BAG_SIZES, p.size, 'sandbag size'), W = s.w, H = s.h, T = s.t;
    // Outline in the floor plane (x across, y along the stone, narrow bottom at -Y) from the front-view photos.
    const outline = (inset: number): Vec2[] => [[-.31 * W, H / 2], [.31 * W, H / 2], [W / 2, .22 * H], [.29 * W, -H / 2], [-.29 * W, -H / 2], [-W / 2, .22 * H]].map(([x, y]) => [x * (1 - 2 * inset / W), y * (1 - 2 * inset / H)] as Vec2);
    const n = noise3(91 + p.size);
    const e = T * .3;
    // Rounded pillow: hull of spheres at the inset outline corners, top and bottom, refined so the sag warp has vertices.
    const pillow = (t: number) => {
      const balls = outline(e).flatMap(([x, y]) => [e, T - e].map(z => K.sphere(e + t, [x, y, z], 40)));
      const m = K.k(K.hull(balls).refine(6));
      return K.k(m.warp(v => { const f = .02 * T * n(v[0] / W * 3, v[1] / H * 3, 0); v[2] = v[2] > T / 2 ? v[2] + f - .06 * T * ((v[0] / W) ** 2 + (v[1] / H) ** 2) : Math.max(v[2], 0); }));
    };
    const bag = pillow(0), big = W * 3;
    K.add('Red face', K.inter(bag, K.box([-big, -big, T * .62], [big, big, big])), fabric('#d8262d'));
    K.add('Black walls', K.inter(bag, K.box([-big, -big, -10], [big, big, T * .62])), fabric('#17181a'));
    K.add('Seam piping', layer(K, pillow, 3, K.box([-big, -big, T * .6], [big, big, T * .66])), fabric('#0f1011', .8));
    K.add('Print', layer(K, pillow, 1.2, K.prism([[-.2 * W, .32 * H], [0, .24 * H], [.2 * W, .32 * H], [.16 * W, .1 * H], [0, -.02 * H], [-.16 * W, .1 * H]], big, T * .5)), fabric('#141414', .75));
    K.add('Hook-and-loop straps', layer(K, pillow, 4, K.box([-.3 * W, .42 * H, T * .2], [.3 * W, big, big])), VELCRO);
    return K.done({ ...resolveBy(CERBERUS_HUSAFELL_SANDBAG.footprint, p), fit: SOFT_FIT });
  });
}
/** Cerberus Sandstone: slumped panelled ball, black logo band on the front, black strap flap on top. */
export function buildSandstone(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  return withKit(api, K => {
    const s = pick(SANDSTONE_SIZES, p.size, 'sandbag size'), R = s.d / 2, h = s.h, n = noise3(101 + p.size);
    const ball = (t: number) => {
      const m = K.move(K.k(K.sphere(R + t, [0, 0, 0], 48).scale([1, 1, h / s.d])), [0, 0, h / 2]);
      const zf = h * .1;
      return K.k(m.warp(v => { const f = 1 + .02 * n(v[0] / R * 1.5, v[1] / R * 1.5, v[2] / R * 1.5); let z = v[2]; if (z < zf) z = zf - (zf - z) * .3; v[0] *= f; v[1] *= f; v[2] = z - zf * .7; }));
    };
    const bag = ball(0), big = s.d * 2;
    K.add('Bag body', bag, fabric('#e3342f'));
    // Six-panel seams: four vertical seams between the side panels and the rounded-square rings round the top and bottom panels.
    const SEAM = fabric('#c42b27', .85), ring = (z0: number, z1: number, half: number) => K.cut(K.move(K.slab(2 * half + 6, 2 * half + 6, z1 - z0, half * .45, [0, 0, 0]), [0, 0, z0]), [K.move(K.slab(2 * half, 2 * half, z1 - z0 + 2, half * .43, [0, 0, 0]), [0, 0, z0 - 1])]);
    K.add('Panel seams', layer(K, ball, 1.6, ring(h * .5, big, R * .64)), SEAM);
    K.add('Panel seams', layer(K, ball, 1.6, ring(-10, h * .5, R * .64)), SEAM);
    for (const a of [45, 135, 225, 315]) K.add('Panel seams', layer(K, ball, 1.6, K.rot(K.box([0, -3, h * .2], [big, 3, h * .8]), [0, 0, a])), SEAM);
    K.add('Logo band', layer(K, ball, 1.5, sideRegion(K, rectOutline(0, h * .52, R * 1.05, h * .2, 3), s.d, 0)), fabric('#141414', .75));
    K.add('Logo print', layer(K, ball, 2, sideRegion(K, rectOutline(0, h * .52, R * .8, h * .075, 2), s.d, 0)), fabric('#e3342f', .7));
    K.add('Hook-and-loop flap', layer(K, ball, 4, K.move(K.slab(R * .9, R * .75, big, R * .1, [0, 0, 0]), [0, R * .1, h * .72])), VELCRO);
    return K.done({ ...resolveBy(CERBERUS_SANDSTONE.footprint, p), fit: SOFT_FIT });
  });
}
export const SANDBAG_DEFINITIONS = [
  floorDefinition(CERBERUS_DUAL_PLY, buildCerberusDualPly), floorDefinition(ROGUE_STRONGMAN_SANDBAG, buildRogueStrongman),
  floorDefinition(ROGUE_ECHO_SANDBAG, buildRogueEcho), floorDefinition(ROGUE_CYCLONE_SANDBAG, buildRogueCyclone),
  floorDefinition(FREEDOM_STRENGTH_SANDBAG, buildFreedom), floorDefinition(BELLS_OF_STEEL_SANDBAG, buildBellsOfSteel),
  floorDefinition(REP_SANDBAG, buildRepSandbag), floorDefinition(CERBERUS_THROWING_SANDBAG, buildThrowingBag),
  floorDefinition(CERBERUS_HUSAFELL_SANDBAG, buildHusafellBag), floorDefinition(CERBERUS_SANDSTONE, buildSandstone),
];
export type { Manifold };
