/** Kettlebells: Manifold builders for the entries in ../floor-parts/kettlebells.ts.
 * Family slot: catalog.ts already spreads `definitions`; add one `floorDefinition(PART, build)` per entry. */
import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import {
  BOS_ADJUSTABLE_KETTLEBELL, BOWFLEX_840_KETTLEBELL, CAP_KETTLEBELL, FREAK_KETTLEBELL, FRINGE_PRIME_KETTLEBELL, FRINGE_SAVAGE_KETTLEBELL, IRONMASTER_KETTLEBELL,
  KBK_COMPETITION_KETTLEBELL, ONNIT_PRIMAL_KETTLEBELL, REP_ADJUSTABLE_KETTLEBELL, REP_KETTLEBELL, ROGUE_KETTLEBELL, ROGUE_USA_FINISHES, ROGUE_USA_KETTLEBELL,
  TITAN_CAST_KETTLEBELL, TITAN_COMPETITION_KETTLEBELL, YES4ALL_KETTLEBELL,
  capBell, fringePrimeBell, fringeSavageBell, kbkBell, repBell, rogueBell, titanCastBell, titanCompBell, yes4allBell,
  type CastBellModel, type CompetitionModel,
} from '../floor-parts/kettlebells.ts';
import { kettlebellKit, shade, type KettlebellKit } from './kettlebells-kit.ts';
import { buildBosAdjustable, buildBowflex840, buildFreakAthlete, buildIronmaster, buildRepAdjustable } from './kettlebells-adjustable.ts';
import { buildOnnitPrimal } from './kettlebells-onnit.ts';


/** Front (-Y) and back (+Y) markings of a cast body of radius R centred at zc; returns cuts, raised iron and ink solids. */
function castMarkings(t: KettlebellKit, m: CastBellModel) {
  const l = m.layout, R = l.R, D = l.body, F = m.front, zf = l.zc - R * .04;
  const cuts: Manifold[] = [], raised: Manifold[] = [], ink: Manifold[] = [], badge: Manifold[] = [];
  const two = F.lines.length > 1, h = D * (two ? .1 : .135) * (F.brandBar ? .85 : 1);
  const sections: CrossSection[] = [];
  const lines = t.textBlock(F.lines, h, h * .6); if (lines) sections.push(F.brandBar ? t.k(lines.translate([0, -h * .45])) : lines);
  if (F.divider && two) sections.push(t.roundRect(Math.max(D * .36, F.lines[0].length * h * .87), Math.max(1.8, D * .014), .6));
  if (F.brandBar) sections.push(t.k(t.roundRect(D * .3, h * .55, h * .12).translate([0, h * 1.05])));
  const cs = sections.length ? t.k(t.C.union(sections)) : undefined;
  const ringR = D * .29, ring = F.ring ? t.k(t.C.difference([t.k(t.C.circle(ringR, 64)), t.k(t.C.circle(ringR - Math.max(1.8, D * .013), 64))])) : undefined;
  if (F.badge) {
    // Printed badge disc (Savage): white disc standing just proud of the coating, ring and numerals printed in the bell colour.
    const bd = t.k(t.C.circle(D * .27, 64));
    badge.push(t.cut(t.meet(t.faceSolid(bd, -1, R * .5, R + 1, zf), t.sphere([0, 0, l.zc], R + .45, 72)), [t.sphere([0, 0, l.zc], R - .5, 72)]));
    const shell = (s: CrossSection) => t.cut(t.meet(t.faceSolid(s, -1, R * .5, R + 1, zf), t.sphere([0, 0, l.zc], R + .75, 72)), [t.sphere([0, 0, l.zc], R, 72)]);
    if (cs) ink.push(shell(cs)); if (ring) ink.push(shell(t.k(t.C.difference([t.k(t.C.circle(D * .245, 64)), t.k(t.C.circle(D * .232, 64))]))));
    return { cuts, raised, ink, badge };
  }
  if (!F.disc) {
    // Debossed straight into the sphere (Rogue, REP): cut the section 0.9 mm deep, following the curvature.
    for (const s of [cs, ring]) if (s) cuts.push(t.cut(t.faceSolid(s, -1, R * .5, R + 6, zf), [t.sphere([0, 0, l.zc], R - 1.5, 72)]));
  } else {
    // Flat machined panel; CAP adds a raised disc on it. Features stay inside the sphere radius.
    const raisedDisc = F.disc === 'raised', rp = R * (raisedDisc ? .36 : .43), yp = Math.sqrt(R * R - rp * rp);
    cuts.push(t.box([-R - 2, -R - 2, 0], [R + 2, -yp, l.zc + R + 2]));
    let top = yp;
    if (raisedDisc) { raised.push(t.cylY(-(yp + 2.2), -yp + 1, R * .31, 0, l.zc, 64)); top = yp + 2.2; }
    if (F.panel) badge.push(t.cylY(-(yp + .3), -yp + .5, rp - 1.5, 0, l.zc, 64));
    if (cs) {
      if (F.ink) ink.push(t.faceSolid(cs, -1, top - .6, top + .6, l.zc));
      else if (F.relief === 'deboss') cuts.push(t.faceSolid(cs, -1, top - 1.2, top + 3, l.zc));
      else raised.push(t.faceSolid(cs, -1, top - .6, top + 1.1, l.zc));
    }
  }
  const B = m.back;
  if (B) {
    const plate = t.roundRect(B.width, B.height, B.height * .22), zb = l.zc - R * .02;
    const txt = B.lines ? t.textBlock(B.lines, B.height * .5) : undefined;
    const withText = txt ? t.k(t.C.union([t.k(plate.translate([0, -B.height * .45])), t.k(txt.translate([0, B.height * .65]))])) : plate;
    if (B.plate === 'deboss') cuts.push(t.cut(t.faceSolid(withText, 1, R * .5, R + 6, zb), [t.sphere([0, 0, l.zc], R - .8, 72)]));
    else if (B.plate === 'raised') raised.push(t.cut(t.meet(t.faceSolid(withText, 1, R * .5, R + 2, zb), t.sphere([0, 0, l.zc], R + .6, 72)), [t.sphere([0, 0, l.zc], R - 1, 72)]));
    else badge.push(t.cut(t.meet(t.faceSolid(t.k(t.C.circle(B.width / 2, 64)), 1, R * .5, R + 1, zb), t.sphere([0, 0, l.zc], R + .45, 72)), [t.sphere([0, 0, l.zc], R - .5, 72)]));
  }
  return { cuts, raised, ink, badge };
}
/** Pseudo-random marbling (Savage): stretched, twisted blobs scattered over the body and handle, clipped to a thin skin. */
function streaks(t: KettlebellKit, seed: number, l: CastBellModel['layout'], count: number) {
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const handle = l.path.filter(p => p.s > 0);
  return t.union(Array.from({ length: count }, (_, i) => {
    let c: [number, number, number];
    if (i % 3 === 2 && handle.length) { const p = handle[Math.floor(rnd() * handle.length)]; c = [(rnd() < .5 ? -1 : 1) * p.x, (rnd() - .5) * p.r * 2, p.z]; }
    else { const th = rnd() * Math.PI * 2, ph = Math.acos(1 - 1.7 * rnd()); c = [l.R * Math.sin(ph) * Math.cos(th), l.R * Math.sin(ph) * Math.sin(th), l.zc + l.R * Math.cos(ph)]; }
    const blob = t.k(t.k(t.M.sphere(1, 12)).scale([26 + rnd() * 50, 2 + rnd() * 5, 6 + rnd() * 16]));
    return t.move(t.k(blob.rotate([rnd() * 180, rnd() * 180, rnd() * 180])), c);
  }));
}
export function buildCastBell(api: ManifoldAPI, m: CastBellModel, label = 'kettlebell'): SolidPart[] {
  const t = kettlebellKit(api), l = m.layout, R = l.R;
  try {
    let body = t.meet(t.sphere([0, 0, l.zc], R, 96), t.box([-R - 1, -R - 1, 0], [R + 1, R + 1, l.zc + R + 1]));
    const mk = castMarkings(t, m);
    body = t.cut(body, mk.cuts);
    const handle = t.tube(l.path, true, 32);
    const iron = t.union([body, handle, ...mk.raised]);
    const f = m.finish;
    t.add(`${f.name} body and handle`, iron, 'source', f.color, f.metalness, f.roughness);
    if (m.band) {
      const s0 = 1;
      t.add('Colour-coded handle band', t.band(l.path, s0, s0 + (m.bandWidth ?? 12)), 'source', m.band, .05, .6);
    }
    if (mk.ink.length) t.add('Printed markings', t.union(mk.ink), 'source', m.front.ink ?? m.coat?.color ?? '#e9e9e6', 0, .5);
    if (mk.badge.length) t.add('Printed badges', t.union(mk.badge), 'source', m.front.panel ?? m.front.badge ?? m.back?.color ?? '#f3f1ea', m.front.panel ? .2 : 0, m.front.panel ? .3 : .55);
    if (m.coat) {
      const skin = t.cut(t.union([t.sphere([0, 0, l.zc], R + .25, 64), t.tube(l.path, true, 16, .25)]), [t.sphere([0, 0, l.zc], R - .6, 48), t.tube(l.path, true, 12, -.6), t.box([-R - 2, -R - 2, -R - 5], [R + 2, R + 2, .01])]);
      const clear = t.cylY(-R - 5, R + 5, l.body * .28, 0, l.zc - R * .03, 48);
      const marble = t.cut(t.meet(skin, streaks(t, Math.round(l.body), l, 64)), [clear]);
      t.add('Marbled streaks', marble, 'source', m.coat.streak, 0, .72);
    }
    const out = t.finish(label);
    return m.flip ? out.map(p => { const solid = p.solid.rotate([0, 0, 180]); p.solid.delete(); return { ...p, solid }; }) : out;
  } catch (e) { t.release(); throw e; }
}
export function buildCompetitionBell(api: ManifoldAPI, c: CompetitionModel, label = 'competition kettlebell'): SolidPart[] {
  const t = kettlebellKit(api), l = c.layout, D = l.body, { eq, crown, base } = c;
  try {
    let body = t.compBody(D, base, eq, crown);
    // Hollow-core casting: shallow ring recess and fill-plug bore under the base.
    body = t.cut(body, [t.rod([0, 0, -1], [0, 0, 3], base * .36, 64), t.rod([0, 0, -1], [0, 0, 22], 15, 32)]);
    const stripeH = c.stripe ? 14 : 0, [painted, steel] = t.splitAtZ(l.path, c.paintTop);
    const [below, stripe] = stripeH ? t.splitAtZ(painted, c.paintTop - stripeH) : [painted, []];
    t.add('Painted steel body', t.union([body, t.tube(below, true, 32)]), 'source', c.color, .1, .32);
    if (stripe.length) t.add('Odd-weight black stripe', t.tube(stripe, true, 32), 'source', c.stripe!, .1, .4);
    t.add('Bare steel handle', t.tube(steel, true, 32), 'handle', c.steel, .8, .34);
    // Logo ring on the front, weight numerals on the back: thin printed skins over the paint.
    const outer = t.compBody(D + .7, base + .7, eq, crown + .35, 96), inner = t.compBody(D - .6, base - .6, eq, crown - .3, 96);
    const skin = (cs: CrossSection, side: -1 | 1, z: number) => t.cut(t.meet(t.faceSolid(cs, side, D / 2 - 30, D / 2 + 1, z), outer), [inner]);
    if (c.logoRing) {
      const ring = (r: number, w: number) => t.k(t.C.difference([t.k(t.C.circle(r, 72)), t.k(t.C.circle(r - w, 72))]));
      t.add('Logo ring', skin(t.k(t.C.union([ring(D * .23, 2.4), ring(D * .16, 1.4)])), -1, eq + D * .08), 'source', c.logoColor.length > 7 ? shade(c.color, .7) : c.logoColor, .2, .45);
    }
    const nums = t.textBlock(c.front, D * .1);
    if (nums) t.add('Weight numerals', skin(nums, 1, eq + D * .08), 'source', c.weightColor ?? shade(c.color, c.color === '#eeede8' || c.color === '#f1f0ec' ? .78 : .7), .1, .4);
    return t.finish(label);
  } catch (e) { t.release(); throw e; }
}

const buildRogue = (api: ManifoldAPI, p: NumericParams) => buildCastBell(api, rogueBell(p.weight), 'Rogue kettlebell');
const buildRogueUsa = (api: ManifoldAPI, p: NumericParams) => { const f = ROGUE_USA_FINISHES[p.finish]; if (!f) throw Error('Unsupported kettlebell finish.'); return buildCastBell(api, rogueBell(p.weight, f, false), 'Rogue USA kettlebell'); };
export const definitions: PartDefinition[] = [
  floorDefinition(ROGUE_KETTLEBELL, buildRogue),
  floorDefinition(REP_KETTLEBELL, (api, p) => buildCastBell(api, repBell(p.unit, p.weight), 'REP kettlebell')),
  floorDefinition(ROGUE_USA_KETTLEBELL, buildRogueUsa),
  floorDefinition(CAP_KETTLEBELL, (api, p) => buildCastBell(api, capBell(p.weight), 'CAP kettlebell')),
  floorDefinition(IRONMASTER_KETTLEBELL, buildIronmaster),
  floorDefinition(FREAK_KETTLEBELL, buildFreakAthlete),
  floorDefinition(REP_ADJUSTABLE_KETTLEBELL, buildRepAdjustable),
  floorDefinition(YES4ALL_KETTLEBELL, (api, p) => buildCastBell(api, yes4allBell(p.weight), 'Yes4All kettlebell')),
  floorDefinition(BOS_ADJUSTABLE_KETTLEBELL, buildBosAdjustable),
  floorDefinition(ONNIT_PRIMAL_KETTLEBELL, buildOnnitPrimal),
  floorDefinition(BOWFLEX_840_KETTLEBELL, buildBowflex840),
  floorDefinition(KBK_COMPETITION_KETTLEBELL, (api, p) => buildCompetitionBell(api, kbkBell(p.weight), 'Kettlebell Kings kettlebell')),
  floorDefinition(FRINGE_PRIME_KETTLEBELL, (api, p) => buildCastBell(api, fringePrimeBell(p.weight), 'Fringe Prime kettlebell')),
  floorDefinition(FRINGE_SAVAGE_KETTLEBELL, (api, p) => buildCastBell(api, fringeSavageBell(p.weight), 'Fringe Savage kettlebell')),
  floorDefinition(TITAN_CAST_KETTLEBELL, (api, p) => buildCastBell(api, titanCastBell(p.weight), 'Titan kettlebell')),
  floorDefinition(TITAN_COMPETITION_KETTLEBELL, (api, p) => buildCompetitionBell(api, titanCompBell(p.weight), 'Titan competition kettlebell')),
];
