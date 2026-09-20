/** Builders for parts that span two uprights (#133): strap safeties, REP Flip-Down Safeties and pull-up bars. Source frame
 * (rack-part.ts): origin on the target upright centreline at the pin, +Y out of the (inner side) face, X across it, Z up.
 * The far post sits `uprightSpan` away along local X (safeties) or +Y (bars); see rack-parts/rack-jcups-safeties-spans.ts. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec2, Vec3 } from '../types.ts';
import { buildWith, FINISH, faceOf, widthOf, type Finish, type Kit } from './rack-jcups-safeties-kit.ts';
import {
  REP_STRAP, ROGUE_STRAP, BOS_STRAP, BOS_STRAP_COLORS, strapSpan, FLIP_DOWN, pullSpan, REP_PULLUP, REP_MULTI, multiRearX, ROGUE_FAT_SKINNY, type StrapSpec,
  REP_STRAP_SAFETIES, ROGUE_MONSTER_STRAP_SAFETY_2, ROGUE_MONSTER_LITE_STRAP_SAFETY_2, BOS_SAFETY_STRAPS, REP_FLIP_DOWN_SAFETIES, REP_PULL_UP_BAR, REP_MULTI_GRIP_PULL_UP_BAR, ROGUE_FAT_SKINNY_PULL_UP_BAR,
} from '../rack-parts/rack-jcups-safeties-spans.ts';

const RED: Finish = { color: '#d3222a', metalness: .1, roughness: .45 };
const pinAlongY = (k: Kit, x: number, z: number, y0: number, y1: number, r: number) =>
  k.revolve([[0, 0], [r - 1.2, 0], [r, 1.2], [r, y1 - y0], [0, y1 - y0]], [x, y0, z], 'y', 28);

interface StrapStyle { steel: Finish; strap: Finish; sleeve?: Finish; pinR: number; version?: number }
/** One bracket (at post centre xc, strap leaving toward `dir`) plus its hardware; returns the bolt position. */
function strapBracket(k: Kit, p: NumericParams, s: StrapSpec, xc: number, dir: number, st: StrapStyle, steel: Manifold[]) {
  const f = faceOf(p), w = widthOf(p) / 2, t = s.plate, pitch = p.mountSpacing ?? 50, wrap = s.claspBack > 0;
  const half = wrap ? w + .6 + t : s.plateW / 2, earX = xc + dir * (w + s.earOut), ez0 = s.earZ - s.earH / 2, ez1 = s.earZ + s.earH / 2;
  const yOuter = f + t + 8 + s.strapW;
  steel.push(k.rbox([xc - half, f, s.bottom], [xc + half, f + t, s.top], 6, 'y'));
  if (wrap) for (const side of [1, -1]) steel.push(k.rbox([side > 0 ? xc + w + .6 : xc - w - .6 - t, f - s.claspBack, s.bottom], [side > 0 ? xc + w + .6 + t : xc - w - .6, f + t, s.top], 5, 'x'));
  // Ears beyond the post edge carry the strap bolt: the web extension, a bottom plate and the outer ear.
  const e0 = Math.min(xc + dir * (half - 2), earX), e1 = Math.max(xc + dir * (half - 2), earX);
  steel.push(k.rbox([e0, f, ez0], [e1, f + t, ez1], 8, 'y'), k.box([e0, f, ez0], [e1, yOuter + t, ez0 + t]), k.rbox([e0, yOuter, ez0], [e1, yOuter + t, ez1], 8, 'y'));
  const bx = earX - dir * 17;
  k.put('Strap bolt', k.union([k.rod([bx, f + t, s.earZ], [bx, yOuter + t + 6, s.earZ], s.bolt / 2, 20), k.hexHead([bx, yOuter + t, s.earZ], 'y', s.bolt * 1.5, s.bolt * .65)]), FINISH.zinc, 'fastener');
  k.put(st.pinR > 10 ? '1 in bracket pin' : '5/8 in bracket pin', pinAlongY(k, xc, 0, f - 70, f, st.pinR), st.steel.color === FINISH.black.color ? FINISH.blackZinc : FINISH.zinc, 'rod');
  if (s.lowerPin) k.put('Lower bracket pin', pinAlongY(k, xc, -s.lowerPin * pitch, f - 70, f, st.pinR), FINISH.blackZinc, 'rod');
  return bx;
}
function buildStrapSafety(api: ManifoldAPI, p: NumericParams, s: StrapSpec, st: StrapStyle): SolidPart[] {
  const f = faceOf(p), S = strapSpan(p), sx = Math.sign(S) || -1;
  return buildWith(api, k => {
    const steel: Manifold[] = [];
    const xa = strapBracket(k, p, s, 0, sx, st, steel), xb = strapBracket(k, p, s, S, -sx, st, steel);
    k.put('Steel strap brackets', k.union(steel), st.steel);
    // Webbing: loops around both bolts and a slightly sagging run between them, width along +Y.
    const y0 = f + s.plate + 4, y1 = y0 + s.strapW, T = s.strapT, rIn = s.bolt / 2 + .8, rOut = rIn + T;
    const loop = (x: number) => k.k(k.k(k.k(k.k(k.k(k.C.circle(rOut, 32)).subtract(k.k(k.C.circle(rIn, 32)))).extrude(s.strapW)).rotate([-90, 0, 0])).translate([x, y0, s.earZ]));
    const zc = s.earZ - rIn - T / 2, N = 28, lo = Math.min(xa, xb), hi = Math.max(xa, xb);
    const seg = (u0: number, u1: number) => {
      const top: Vec2[] = [], bot: Vec2[] = [];
      for (let i = 0; i <= N; i++) { const u = u0 + (u1 - u0) * i / N, x = lo + (hi - lo) * u, z = zc - s.sag * 4 * u * (1 - u); top.push([x, z + T / 2]); bot.push([x, z - T / 2]); }
      return k.prism([...bot, ...top.reverse()], y0, y1, 'y');
    };
    if (st.sleeve) {
      k.put('3 in reinforced nylon strap', k.union([loop(xa), loop(xb), seg(0, .2), seg(.8, 1)]), st.strap, 'source');
      const sl = (u0: number, u1: number) => {
        const top: Vec2[] = [], bot: Vec2[] = [];
        for (let i = 0; i <= N; i++) { const u = u0 + (u1 - u0) * i / N, x = lo + (hi - lo) * u, z = zc - s.sag * 4 * u * (1 - u); top.push([x, z + T / 2 + 1]); bot.push([x, z - T / 2 - 1]); }
        return k.prism([...bot, ...top.reverse()], y0 - 1, y1 + 1, 'y');
      };
      k.put('Grey wear sleeve', sl(.2, .8), st.sleeve, 'source');
    } else k.put('Reinforced nylon strap', k.union([loop(xa), loop(xb), seg(0, 1)]), st.strap, 'source');
    // Stitched end loops: flat bands of bar-tack stitching near each bracket.
    const stitch = (u: number) => { const x = lo + (hi - lo) * u, z = zc - s.sag * 4 * u * (1 - u); return k.box([x - 18, y0 + 6, z + T / 2], [x + 18, y1 - 6, z + T / 2 + .4]); };
    k.put('Bar-tack stitching', k.union([stitch(.06), stitch(.94)]), { color: '#d7d8d6', metalness: 0, roughness: .8 });
  });
}
export const buildRepStraps = (api: ManifoldAPI, params: NumericParams) => {
  const p = { ...REP_STRAP_SAFETIES.defaults, ...params }, s = REP_STRAP[p.version]; if (!s || ![0, 1].includes(p.series)) throw Error('Unsupported REP strap safety option.');
  return buildStrapSafety(api, p, s, { steel: p.version ? FINISH.black : { color: '#1c1d20', metalness: .55, roughness: .35 }, strap: { color: '#2a2b2d', metalness: 0, roughness: .9 }, pinR: p.series ? 12.4 : 7.9 });
};
export const buildRogueStraps = (lite: boolean) => (api: ManifoldAPI, params: NumericParams) => {
  const p = { ...(lite ? ROGUE_MONSTER_LITE_STRAP_SAFETY_2 : ROGUE_MONSTER_STRAP_SAFETY_2).defaults, ...params };
  return buildStrapSafety(api, p, ROGUE_STRAP, { steel: FINISH.black, strap: { color: '#1f2021', metalness: 0, roughness: .9 }, sleeve: { color: '#a9abad', metalness: 0, roughness: .85 }, pinR: lite ? 7.9 : 12.4 });
};
export const buildBosStraps = (api: ManifoldAPI, params: NumericParams) => {
  const p = { ...BOS_SAFETY_STRAPS.defaults, ...params }, c = BOS_STRAP_COLORS[p.color]; if (!c || ![0, 1].includes(p.rack)) throw Error('Unsupported Bells of Steel safety strap option.');
  return buildStrapSafety(api, p, BOS_STRAP, { steel: { color: '#8a8e93', metalness: .55, roughness: .45 }, strap: { color: c[1], metalness: 0, roughness: .85 }, pinR: p.rack ? 12.4 : 7.9 });
};

export function buildFlipDown(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_FLIP_DOWN_SAFETIES.defaults, ...params }; if (![0, 1].includes(p.series)) throw Error('Unsupported flip-down safety series.');
  const f = faceOf(p), w = widthOf(p) / 2, S = strapSpan(p), sx = Math.sign(S) || -1, pitch = p.mountSpacing ?? 50, c = FLIP_DOWN, pinR = p.series ? 12.4 : 7.9;
  const zc = -c.centerStations * pitch, ya = f + c.tabT, yb = ya + c.tubeW, xa = -sx * (w - c.overhang), xb = S + sx * (w - c.overhang), lo = Math.min(xa, xb), hi = Math.max(xa, xb);
  return buildWith(api, k => {
    const outer = k.box([lo, ya, zc - c.tubeH / 2], [hi, yb, zc + c.tubeH / 2]), inner = k.box([lo - 1, ya + c.wall, zc - c.tubeH / 2 + c.wall], [hi + 1, yb - c.wall, zc + c.tubeH / 2 - c.wall]);
    const holes: Manifold[] = [inner];
    const clear0 = Math.min(0, S) + w + 40, clear1 = Math.max(0, S) - w - 40;
    for (let x = clear0; x <= clear1; x += 50.8) holes.push(k.rod([x, ya - 1, zc], [x, yb + 1, zc], 12.7, 20));
    const steel = [k.minus(outer, ...holes)];
    // Pivot tab with the welded pin at the target hole; lock tab at the far post for the clevis pin.
    steel.push(k.rbox([-c.tabW / 2, f, zc - c.tubeH / 2], [c.tabW / 2, ya, 30], 8, 'y'), k.rbox([S - c.tabW / 2, f, zc - c.tubeH / 2], [S + c.tabW / 2, ya, zc + c.tubeH / 2], 8, 'y'));
    k.put('11-gauge safety tube and pin tabs', k.union(steel), FINISH.black);
    k.put('Plastic top liner', k.box([clear0 - 30, ya + 3, zc + c.tubeH / 2], [clear1 + 30, yb - 3, zc + c.tubeH / 2 + c.liner]), FINISH.uhmw, 'liner');
    k.put(p.series ? '1 in welded pivot pin' : '5/8 in welded pivot pin', pinAlongY(k, 0, 0, f - 70, f, pinR), FINISH.black, 'rod');
    k.put('Clevis quick-release pin', pinAlongY(k, S, zc, f - 70, yb + 14, pinR), FINISH.zinc, 'rod');
    const ring = k.k(k.k(k.k(k.C.circle(24, 36)).subtract(k.k(k.C.circle(16, 36)))).extrude(6));
    k.put('Red clevis pin handle', k.k(k.k(ring.rotate([0, 90, 0])).translate([S - 3, yb + 14 + 20, zc])), RED, 'handle');
  });
}

/** Two end plates bolted through the posts (bolts along Y at the given stations) for bars spanning local +Y. */
function barEnds(k: Kit, p: NumericParams, S: number, plate: { w: number; t: number; z0: number; z1: number }, stations: number[], boltR: number, steel: Manifold[]) {
  const f = faceOf(p), pitch = p.mountSpacing ?? 50, u = p.upright ?? 75;
  steel.push(k.rbox([-plate.w / 2, f, plate.z0], [plate.w / 2, f + plate.t, plate.z1], 6, 'y'), k.rbox([-plate.w / 2, S - f - plate.t, plate.z0], [plate.w / 2, S - f, plate.z1], 6, 'y'));
  const bolts: Manifold[] = [];
  for (const st of stations) for (const [y0, dir] of [[f + plate.t, 1], [S - f - plate.t, -1]] as const) {
    const z = -st * pitch, yEnd = y0 - dir * (plate.t + u + 12);
    bolts.push(k.rod([0, y0 + dir * 1, z], [0, yEnd, z], boltR, 20), k.hexHead([0, y0, z], dir > 0 ? 'y' : '-y', boltR * 3, boltR * 1.2), k.hexHead([0, y0 - dir * (plate.t + u), z], dir > 0 ? '-y' : 'y', boltR * 3, boltR * 1.3));
  }
  k.put('Bolts, washers and nuts', k.union(bolts), FINISH.zinc, 'fastener');
}
export function buildRepPullUp(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_PULL_UP_BAR.defaults, ...params }; if (![0, 1].includes(p.series)) throw Error('Unsupported REP pull-up bar series.');
  const f = faceOf(p), S = pullSpan(p, REP_PULLUP.usable), c = REP_PULLUP, pitch = p.mountSpacing ?? 50, zc = -c.holeStations * pitch / 2;
  return buildWith(api, k => {
    const steel: Manifold[] = [];
    barEnds(k, p, S, { w: c.plateW, t: c.plateT, z0: -c.holeStations * pitch - c.plateBelow, z1: c.plateAbove }, [0, c.holeStations], p.series ? 12.4 : 7.9, steel);
    k.put('Welded end plates', k.union(steel), FINISH.black);
    k.put('1.25 in pull-up bar', k.rod([0, f + c.plateT - .5, zc], [0, S - f - c.plateT + .5, zc], c.bar / 2, 40), FINISH.black, 'handle');
  });
}
export function buildRepMultiGrip(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...REP_MULTI_GRIP_PULL_UP_BAR.defaults, ...params }; if (![0, 1].includes(p.series) || ![0, 1].includes(p.grips)) throw Error('Unsupported multi-grip option.');
  const f = faceOf(p), c = REP_MULTI, S = pullSpan(p, c.length - 2 * c.plateT), d = p.grips ? 1 : -1, pitch = p.mountSpacing ?? 50;
  const yA = f + c.plateT, yB = S - f - c.plateT, mid = (yA + yB) / 2, r = c.bar / 2, zF = -20, zR = c.height - 40 - c.fat / 2, xR = d * multiRearX();
  return buildWith(api, k => {
    const steel: Manifold[] = [];
    barEnds(k, p, S, { w: c.plateW, t: c.plateT, z0: -(c.plateH - 40), z1: 40 }, [0, c.holeStations], p.series ? 12.4 : 7.9, steel);
    k.put('Bolt-on end plates', k.union(steel), FINISH.black);
    // Arched side rails from the front bar ends up and back to the fat rear bar; straight 1.25 in front bar.
    const rail = (y: number): Vec3[] => [[0, y, zF], [d * 70, y, zF + 70], [d * 170, y, zR - 12], [xR, y, zR]];
    const frame: Manifold[] = [k.path(rail(yA + r), r, 28), k.path(rail(yB - r), r, 28), k.rod([0, yA - .5, zF], [0, yB + .5, zF], r, 32)];
    // Neutral grips (6.1 in apart) and angled grips (28.4 in at the front bar to 11.1 in at the rear bar).
    for (const s of [1, -1]) {
      frame.push(k.rod([0, mid + s * c.neutral / 2, zF], [xR, mid + s * c.neutral / 2, zR], r, 28));
      frame.push(k.rod([0, mid + s * c.wide / 2, zF], [xR, mid + s * c.close / 2, zR], r, 28));
    }
    k.put('14-gauge frame, 1.25 in bar and grips', k.union(frame), FINISH.black, 'handle');
    k.put('2 in fat rear bar', k.rod([xR, yA + 2 * r, zR], [xR, yB - 2 * r, zR], c.fat / 2, 40), FINISH.black, 'handle');
    k.put('End caps', k.union([k.rod([xR, yA + 2 * r - 1.5, zR], [xR, yA + 2 * r, zR], c.fat / 2 + .6, 40), k.rod([xR, yB - 2 * r, zR], [xR, yB - 2 * r + 1.5, zR], c.fat / 2 + .6, 40)]), FINISH.uhmw, 'liner');
    void pitch;
  });
}
export function buildRogueFatSkinny(api: ManifoldAPI, params: NumericParams): SolidPart[] {
  const p = { ...ROGUE_FAT_SKINNY_PULL_UP_BAR.defaults, ...params }, f = faceOf(p), c = ROGUE_FAT_SKINNY, S = pullSpan(p, c.usable);
  return buildWith(api, k => {
    const steel: Manifold[] = [];
    barEnds(k, p, S, { w: c.flangeW, t: c.flangeT, z0: c.topHole - c.flangeH, z1: c.topHole }, [0, c.holeStations], 7.9, steel);
    k.put('3/8 in bolt-on flanges', k.union(steel), FINISH.black);
    k.put('1.25 in OD skinny bar', k.rod([0, f + c.flangeT - .5, c.topHole - c.skinnyZ], [0, S - f - c.flangeT + .5, c.topHole - c.skinnyZ], c.skinny / 2, 40), FINISH.black, 'handle');
    k.put('2 in OD fat bar', k.rod([0, f + c.flangeT - .5, c.topHole - c.fatZ], [0, S - f - c.flangeT + .5, c.topHole - c.fatZ], c.fat / 2, 48), FINISH.black, 'handle');
  });
}
