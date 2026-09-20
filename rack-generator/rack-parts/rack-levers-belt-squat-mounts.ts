/** Rogue Velocidor and the Get RXd RX3 Center Post (#135). Metadata only (main bundle): never import Manifold builders
 * here. Research: research/rack-levers-belt-squat.md. Builders: parts/rack-levers-belt-squat-mounts.ts. */
import { defineRackPart, PIN_1IN, PIN_5_8IN } from '../rack-part.ts';
import type { LocalBox, NumericParams } from '../types.ts';
const inch = (v: number) => v * 25.4;
const face = (p: NumericParams) => (p.upright ?? 75) / 2;
const pitch = (p: NumericParams) => p.mountSpacing ?? 50;
const threeByThree = (name: string) => (rack: { tube: number }) => { if (rack.tube < 74 || rack.tube > 78) throw Error(`${name} fits 3x3 uprights only.`); };

// ================================================================ Rogue Velocidor
/** Published: 25-3/16" wide, 12" tall, ~29" deep, 3x3 7 ga crossbar, 1/4" plate, 44.5 lb; 1.9" handles with 16" usable
 * length in three sockets per side (13.5 / 17.25 / 21" apart at the root), clocked 7° out (standard), parallel, 7° down
 * or 7° up; 5/8" (Monster Lite) or 1" (Monster) detent pin. Bracket profile and the 7° chevron are measured off the
 * side elevation and front renders (3" tube as scale). */
export const VELOCIDOR = {
  width: inch(25.1875), tube: inch(3), plate: inch(0.25), top: 30, bracketDrop: inch(12), frontFromFace: inch(9.25), chevron: 7,
  handle: inch(1.9), usable: inch(16), collar: inch(2.25), collarLength: inch(2), sockets: [inch(13.5), inch(17.25), inch(21)], guard: [inch(8.2), inch(2.4)] as const,
} as const;
export const VELOCIDOR_SERIES = [{ name: 'Monster Lite · 5/8 in pin', pin: PIN_5_8IN }, { name: 'Monster · 1 in pin', pin: PIN_1IN }] as const;
export const VELOCIDOR_SPACINGS = ['Narrow · 13.5 in', 'Standard · 17.25 in', 'Wide · 21 in'] as const;
export const VELOCIDOR_ANGLES = [{ name: 'Standard · 7° out, level', splay: 7, pitch: 0 }, { name: 'Straight · parallel', splay: 0, pitch: 0 }, { name: 'Down 7°', splay: 0, pitch: -7 }, { name: 'Up 7°', splay: 0, pitch: 7 }] as const;
export const VELOCIDOR_FINISHES = ['Texture black smooth', 'Texture black knurled'] as const;
export const velocidorSeries = (p: NumericParams) => { const s = VELOCIDOR_SERIES[p.series ?? 0]; if (!s) throw Error('Unsupported Velocidor series.'); return s; };
export const velocidorAngle = (p: NumericParams) => { const a = VELOCIDOR_ANGLES[p.angle ?? 0]; if (!a) throw Error('Unsupported handle angle.'); return a; };
/** Crossbar centreline: apex nearest the lifter, each half swept back 7° toward the rack; handle root points per side. */
export function velocidorLayout(p: NumericParams) {
  const V = VELOCIDOR, f = face(p), zc = V.top - V.tube / 2, apexY = f + V.frontFromFace - V.tube / 2, t = Math.tan(V.chevron * Math.PI / 180);
  const barY = (x: number) => apexY - Math.abs(x) * t;
  const root = (V.sockets[p.spacing ?? 1] ?? V.sockets[1]) / 2, a = velocidorAngle(p);
  const handles = [-1, 1].map(s => {
    // Handle axis: perpendicular to its crossbar half (7° out) for the standard clock, else parallel; pitched up/down.
    const yaw = (a.splay ? V.chevron : 0) * s * Math.PI / 180, pt = a.pitch * Math.PI / 180;
    const dir = [Math.sin(yaw) * Math.cos(pt), Math.cos(yaw) * Math.cos(pt), Math.sin(pt)] as [number, number, number];
    const start = [s * root, barY(root) + V.tube / 2, zc] as [number, number, number];
    const len = V.collarLength + V.usable;
    return { s, start, dir, end: start.map((v, i) => v + dir[i] * len) as [number, number, number] };
  });
  return { f, zc, apexY, barY, handles };
}
function velocidorBodies(p: NumericParams): LocalBox[] {
  const V = VELOCIDOR, L = velocidorLayout(p), w = V.width / 2, r = V.handle / 2;
  const boxes: LocalBox[] = [{ min: [-w, L.barY(w) - V.tube / 2, L.zc - V.tube / 2], max: [w, L.apexY + V.tube / 2, V.top] }];
  for (const h of L.handles) boxes.push({ min: [Math.min(h.start[0], h.end[0]) - r, h.start[1], Math.min(h.start[2], h.end[2]) - r], max: [Math.max(h.start[0], h.end[0]) + r, Math.max(h.start[1], h.end[1]), Math.max(h.start[2], h.end[2]) + r] });
  return boxes;
}
export const ROGUE_VELOCIDOR = defineRackPart({
  id: 'rogue-velocidor', name: 'Rogue Velocidor', title: 'Rogue Velocidor', noun: 'dip station', section: 'Levers & belt squat',
  description: 'Rack-mounted dip station: 3x3 7 ga chevron crossbar on a gusseted bracket with clockable 1.9 in handles in three widths · 25-3/16 in wide · 12 in tall. Independent reconstruction; Rogue trademarks belong to Rogue Fitness.',
  params: [
    { key: 'series', label: 'Series', default: 0, options: [0, 1], format: v => VELOCIDOR_SERIES[v]?.name ?? String(v) },
    { key: 'spacing', label: 'Handle sockets', default: 1, options: [0, 1, 2], format: v => VELOCIDOR_SPACINGS[v] ?? String(v) },
    { key: 'angle', label: 'Handle clock', default: 0, options: [0, 1, 2, 3], format: v => VELOCIDOR_ANGLES[v]?.name ?? String(v) },
    { key: 'finish', label: 'Handles', default: 0, options: [0, 1], format: v => VELOCIDOR_FINISHES[v] ?? String(v) },
  ],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-velocidor',
    credit: 'Rogue Fitness — Velocidor (RA2789) · Made in USA', trademark: 'Rogue, Velocidor and Monster are trademarks of Rogue Fitness.',
    reconstruction: 'Published 25-3/16 in width, 12 in height, 3x3 7 ga crossbar, 1/4 in plate, 1.9 in x 16 in handles, 13.5/17.25/21 in socket spacings, handle clock settings and pin sizes. Bracket profile, chevron angle, guard plates and caps estimated from product renders; laser-cut lettering omitted; physical fit unverified.',
  },
  mount: {
    pin: p => velocidorSeries(p).pin, pinAxis: 'across',
    extent: p => { const L = velocidorLayout(p), hz = Math.max(...L.handles.map(h => h.end[2])) + VELOCIDOR.collar / 2; return { below: VELOCIDOR.bracketDrop - VELOCIDOR.top + 1, above: Math.max(VELOCIDOR.top + 16, hz + 1) }; },
    validate: threeByThree('The Velocidor'),
  },
  bodies: velocidorBodies,
  pair: { default: false },
  placement: { height: 1115, face: 'front' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 0 : 1 }),
});

// ================================================================ Get RXd RX3 Center Post
/** Published: 3x3 (75 mm) 11 ga L-shaped post, 576 mm (23") W x 390 mm (15") H x 230 mm (9") D, offset 1" holes at 2"
 * spacing on all four sides, two 1" chrome pins with knurled nuts, black powder coat, laser-cut logo plate. Pin spacing
 * (two stations), gusset length and knob size estimated from the product renders. */
export const RX3_POST = { width: 576, height: 390, plateHeight: 230, tube: 75, wall: 3, plate: 10, plateWidth: 100, gusset: 90, knob: 50, knobThick: 26, holeDiameter: 25.4, holeStep: 50.8 } as const;
/** Arm centre height (between the two pins) and the far leg centreline, in the part frame. */
export function rx3Layout(p: NumericParams) {
  const R = RX3_POST, f = face(p), z = -pitch(p), y0 = f + R.plate, legY = f + R.width - R.tube / 2;
  return { f, z, y0, legY, top: z + R.tube / 2, bottom: z + R.tube / 2 - R.height };
}
export const GETRXD_RX3_CENTER_POST = defineRackPart({
  id: 'getrxd-rx3-center-post', name: 'Get RXd RX3 Center Post', title: 'Get RXd RX3 Center Post', noun: 'center post', section: 'Levers & belt squat',
  description: 'L-shaped 3x3 attachment post that pins to one upright and drops a second post at the centre of the rack for 3x3, 1 in attachments · 576 x 390 x 230 mm. Independent reconstruction; Get RXd trademarks belong to Get RXd.',
  params: [],
  vendor: {
    vendor: 'Get RXd', url: 'https://www.getrxd.com/products/rx3-center-post-bundle',
    credit: 'Get RXd — RX3 Center Post (RX3-CNTR)', trademark: 'Get RXd and RX3 are trademarks of Get RXd.',
    reconstruction: 'Published 3x3 11 ga tube, 576 x 390 x 230 mm, 1 in holes at 2 in spacing on all four sides, two 1 in chrome pins with knurled nuts and the logo plate. Pin spacing, gusset outline and knob size estimated from product renders; physical fit unverified.',
  },
  mount: {
    pin: PIN_1IN, holes: [0, -2], mainStations: true,
    extent: p => { const L = rx3Layout(p); return { below: -L.bottom + 1, above: Math.max(L.z + RX3_POST.plateHeight / 2, RX3_POST.knob / 2) + 1 }; },
    validate: threeByThree('The RX3 Center Post'),
  },
  bodies: p => {
    const R = RX3_POST, L = rx3Layout(p), h = R.tube / 2;
    return [{ min: [-h, L.y0 + R.gusset, L.z - h], max: [h, L.legY + h, L.z + h] }, { min: [-h, L.legY - h, L.bottom], max: [h, L.legY + h, L.z - h] }];
  },
  pair: { default: false },
  // On the inner side face, so the post drops at the centre of the bay.
  placement: { height: 915, face: 'inside' },
});
