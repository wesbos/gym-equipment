/** Adjustable dumbbells family: Kensui AdaptaBELL builder. */
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
import { floorDefinition } from '../floor-part.ts';
import { ADAPTABELL_DUMBBELL, adaptabellEnvelope, adaptabellLoads } from '../floor-parts/adjustable-dumbbells-kensui.ts';
import { dumbbellKit, type Mat, type Pt } from './adjustable-dumbbells-kit.ts';
/** Handle lying on the floor, resting on its largest disc: X along the handle, axis at half that diameter. */
export function buildAdaptabell(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const e = adaptabellEnvelope(p), { m, stack, gap } = e;
  if (!adaptabellLoads(m).includes(p.load)) throw Error('Unsupported dumbbell plates per side.');
  const t = dumbbellKit(api), cz = e.diameter / 2, g = m.grip / 2, f0 = g + m.cone, f1 = f0 + m.flangeT, d0 = f1 + gap, d1 = d0 + m.discT;
  const body: Mat = m.metal ? ['Black-anodised aluminium body and flanges', 'source', '#18191b', .5, .45] : ['DuraCore reinforced polymer body and flanges', 'source', '#151617', .05, .75];
  const M = {
    body,
    grip: [m.metal ? 'Knurled aluminium grip' : 'Knurled polymer grip', 'handle', '#1b1c1e', m.metal ? .45 : .05, .7],
    pegs: ['ACME-thread pegs and knurled end discs', 'source', '#141516', m.metal ? .5 : .1, .55],
    plates: ['Loaded change plates · standard cast iron', 'source', '#222325', .35, .68],
  } as const satisfies Record<string, Mat>;
  return t.finish('AdaptaBELL', () => {
    // Knurled grip: core plus fine rings (built once, centred).
    t.add(M.grip, t.cylX(-g - .5, g + .5, 0, cz, m.gripD, 40));
    for (let x = -g + 4; x < g - 4; x += 3.2) t.add(M.grip, t.cylX(x, x + 1.1, 0, cz, m.gripD + .8, 40));
    // Flange collars: the MAX flares from the grip on a conical fillet; the PRO flange carries four small through holes.
    const flange = t.lathe([[0, g - .5], [m.gripD / 2, g - .5], ...(m.cone ? [[m.gripD / 2 + 2, g + 1], [m.flangeD / 2 - 14, f0]] as Pt[] : []), [m.flangeD / 2 - 1, f0], [m.flangeD / 2, f0 + 1], [m.flangeD / 2, f1 - 1], [m.flangeD / 2 - 1, f1], [0, f1]] as Pt[], 0, cz, 64);
    const holes = m.holes ? [45, 135, 225, 315].map(a => t.cylX(f0 - 1, f1 + 1, 26 * Math.cos(a * Math.PI / 180), cz + 26 * Math.sin(a * Math.PI / 180), 6, 16)) : [];
    t.both(M.body, t.cut(flange, holes));
    // Screw-in peg: ACME thread across the gap, then the flat end disc with a knurled rim that clamps the plates flush.
    t.both(M.pegs, t.cylX(f1 - 1, d0 + 1, 0, cz, m.threadD - 5, 32));
    for (let x = f1 + 1.5; x < d0 - 2; x += 5) t.both(M.pegs, t.cylX(x, x + 2.6, 0, cz, m.threadD, 32));
    const rim = Array.from({ length: 40 }, (_, i) => { const a = i * 9; return t.rot(t.boxC([m.discT - 3, 2, 3], [d0 + m.discT / 2 + .5, 0, m.discD / 2]), [a, 0, 0]); }).map(s => t.move(s, [0, 0, cz]));
    t.both(M.pegs, t.cut(t.lathe([[0, d0], [m.discD / 2 - 1, d0], [m.discD / 2, d0 + 1], [m.discD / 2, d1 - 1.5], [m.discD / 2 - 1.5, d1], [0, d1]] as Pt[], 0, cz, 72), rim));
    // Loaded plates, heaviest innermost: raised rim, recessed outer face and a hub boss around the 28 mm bore.
    let x = f1;
    for (const [, d, th] of stack) {
      const R = d / 2;
      t.both(M.plates, t.lathe([[14.5, x], [R - 1.5, x], [R, x + 1.5], [R, x + th - 1.5], [R - 1.5, x + th], [R - 9, x + th], [R - 11, x + th - 2.5], [26, x + th - 2.5], [24, x + th], [14.5, x + th]] as Pt[], 0, cz, 72));
      x += th;
    }
  });
}
export const definitions: PartDefinition[] = [floorDefinition(ADAPTABELL_DUMBBELL, buildAdaptabell)];
