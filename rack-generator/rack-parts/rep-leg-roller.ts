/** REP Fitness Leg Roller, original 1.0 (#131 proof entry). Metadata only (main bundle): never import Manifold builders here.
 * Research: research/rack-registry.md. The Leg Roller 2.0 belongs to the rollers & pads family (#132). */
import { defineRackPart, PIN_1IN, PIN_5_8IN } from '../rack-part.ts';
import type { LocalBox, NumericParams } from '../types.ts';
const inch = (v: number) => v * 25.4;
/** Published per series (repfitness.com/products/leg-roller-attachment): overall length, pad length, pad diameter. */
export const LEG_ROLLER_SERIES = [
  { name: '5000 Series · 1 in pin', length: inch(20.1), pad: inch(15.4), padDiameter: inch(4.8) },
  { name: '4000 Series · 5/8 in hanger', length: inch(33.4), pad: inch(17.4), padDiameter: inch(4.9) },
] as const;
/** Estimated from photos. 5000: chrome shaft, steel collar disc at the pad, lynch pin behind the upright.
 * 4000: hanger plate with a top pin and a red pop-pin one station lower; 1-1/4 in arm that leaves the plate toward
 * -X, U-bends outward and runs +X along the face, the pad on its end (centred in the rack from the front face). */
export const LEG_ROLLER = { shaft: 24.5, collar: 50, collarThick: 8, plate: [76, 126, 6.35], plateTop: 22, popPin: 15.9, /** Pad-end washer + bolt head proud of the vinyl */ endBolt: 7, arm: 31.75, armZ: -86, bendRadius: 32, back: 55 } as const;
export const legRollerSeries = (p: NumericParams) => { const s = LEG_ROLLER_SERIES[p.series ?? 0]; if (!s) throw Error('Unsupported leg roller series.'); return s; };
/** 5000 stack along local +Y from the mounting face: collar, pad, end bolt; the shaft end behind the far face. */
export function legRoller5000(p: NumericParams) {
  const s = LEG_ROLLER_SERIES[0], pad0 = (p.upright ?? 75) / 2 + LEG_ROLLER.collarThick, pad1 = pad0 + s.pad, end = pad1 + LEG_ROLLER.endBolt;
  return { pad0, pad1, end, back: end - s.length };
}
/** 4000 layout along local X (before the pair mirror): arm tip reach and pad span; the end bolt sits past `tip`. */
export function legRoller4000(p: NumericParams) {
  const s = LEG_ROLLER_SERIES[1], face = (p.upright ?? 75) / 2, { plate, arm, bendRadius, back } = LEG_ROLLER;
  const bendX = -back, outerX = bendX - bendRadius - arm / 2, tip = outerX + s.length - LEG_ROLLER.endBolt;
  const nearY = face + plate[2] + arm / 2 + 2, farY = nearY + 2 * bendRadius;
  return { bendX, outerX, tip, padStart: tip - s.pad, nearY, farY };
}
export const REP_LEG_ROLLER = defineRackPart({
  id: 'rep-leg-roller', name: 'REP Leg Roller', title: 'REP Fitness Leg Roller', noun: 'leg roller', section: 'Rollers & pads',
  description: 'Single-pin rack leg roller for Nordics, split squats and hip work · 5000 Series 20.1 in / 15.4 in pad · 4000 Series 33.4 in / 17.4 in pad. Independent reconstruction; REP Fitness trademarks belong to REP Fitness.',
  params: [{ key: 'series', label: 'Series', default: 0, options: [0, 1], format: v => LEG_ROLLER_SERIES[v]?.name ?? String(v) }],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/leg-roller-attachment',
    credit: 'REP Fitness — Leg Roller (PRA-5712 / PRA-4710)', trademark: 'REP Fitness is a trademark of REP Fitness.',
    reconstruction: 'Published overall length, pad length and pad diameter per series. Shaft, collar, lynch pin, 4000 hanger plate, pop-pin and arm bend are estimated from product and review photos; physical fit unverified.',
  },
  mount: {
    pin: p => p.series ? PIN_5_8IN : PIN_1IN,
    // The 4000 hanger locks with a pop-pin one station below its top pin.
    holes: p => p.series ? [0, -1] : [0],
    extent: p => p.series ? { below: -LEG_ROLLER.armZ + LEG_ROLLER_SERIES[1].padDiameter / 2, above: LEG_ROLLER.plateTop + 3 } : { below: LEG_ROLLER_SERIES[0].padDiameter / 2, above: LEG_ROLLER_SERIES[0].padDiameter / 2 },
  },
  bodies: p => {
    const s = legRollerSeries(p), face = (p.upright ?? 75) / 2, r = s.padDiameter / 2;
    if (!p.series) return [{ min: [-r, face + LEG_ROLLER.collarThick, -r], max: [r, face + LEG_ROLLER.collarThick + s.pad, r] }];
    const g = legRoller4000(p), hand = p.mirror === 1 ? -1 : 1, z = LEG_ROLLER.armZ, a = LEG_ROLLER.arm / 2;
    const x = (lo: number, hi: number): [number, number] => hand > 0 ? [lo, hi] : [-hi, -lo];
    const box = ([x0, x1]: [number, number], y0: number, y1: number, z0: number, z1: number): LocalBox => ({ min: [x0, y0, z0], max: [x1, y1, z1] });
    return [
      box(x(g.padStart, g.tip), g.farY - r, g.farY + r, z - r, z + r),
      box(x(g.bendX, g.padStart), g.farY - a, g.farY + a, z - a, z + a),
      box(x(g.outerX, g.bendX), g.nearY - a, g.farY + a, z - a, z + a),
    ];
  },
  pair: { default: false },
  handed: true,
  // 5000: pad beside the upright, inside the rack. 4000: hung inside the front uprights so the arm reaches the centre.
  placement: p => p.series ? { height: 265, face: 'back' } : { height: 215, face: 'inside' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 1 : 0 }),
});
