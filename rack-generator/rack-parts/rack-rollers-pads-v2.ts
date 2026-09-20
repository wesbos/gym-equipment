/** Rollers, seats and pads that needed the rack-part registry v2 (#178, from #132): the Rogue Multi-Use Rack Roller
 * (spans the front uprights, wraps the front face), the REP Utility Seat (spans a pair of spotter arms or safeties) and
 * the Darko Lifting Thresher Pad (pinned through a spotter arm). Metadata only (main bundle): no Manifold imports.
 * Builders: parts/rack-rollers-pads-v2.ts. Research, sources and every estimate: research/rack-registry-v2.md.
 * Layout helpers are shared by the builders, the collision bodies, the extents and the fit rules. */
import { defineRackPart, PIN_1IN, PIN_5_8IN, type RackPart } from '../rack-part.ts';
import type { LocalBox, NumericParams, RackDimensions, Vec2, Vec3 } from '../types.ts';
const inch = (v: number) => v * 25.4;
const box = (min: Vec3, max: Vec3): LocalBox => ({ min, max });
const faceWidth = (p: NumericParams) => p.uprightWidth ?? p.upright ?? 75;
const END = (brand: string) => `Independent reconstruction; ${brand} trademarks belong to ${brand}.`;

// ───────────────────────────── Rogue Multi-Use Rack Roller ─────────────────────────────
/** Published (RA3136 Monster / RA3173 Monster Lite): 41 in x 6 in pad on a 1.5 in Sch 40 core, 12 in deep, 8 in tall
 * 1/4 in formed brackets lined with UHMW, 50.5 / 49.5 in overall, two 1 in x 4.5 in (or 5/8 in) pins per side, 31 / 32
 * lb, 43 in inside-width Monster racks only. Estimated from the to-scale instruction drawing (IS0596) and 20 photos:
 * the 4 in peg-to-detent spacing, the roller axis 6.4 in ahead of the front face and 4.25 in below the peg, the ear. */
export const RACK_ROLLER = {
  pad: inch(41), padDiameter: inch(6), core: inch(1.9), plate: inch(.25), liner: 3, bracketTop: inch(1.25), bracketBottom: -inch(6.75),
  axisAhead: inch(6.4), axisZ: -inch(4.25), webTop: -inch(2.1), earInset: inch(1), earRadius: inch(1.75), earFrom: inch(1.6), peg: inch(3.5),
  detentStations: 2, gap: inch(43), boss: inch(2.5),
} as const;
export const RACK_ROLLER_SERIES = ['Monster · 1 in pins (RA3136)', 'Monster Lite · 5/8 in pins (RA3173)'] as const;
/** Post-to-post span along +Y; without a facing post (the viewer) Rogue's 43 in inside width. */
export const rollerSpan = (p: NumericParams) => p.uprightSpan ?? RACK_ROLLER.gap + (p.upright ?? 75);
export function rackRollerLayout(p: NumericParams) {
  const r = RACK_ROLLER, face = (p.upright ?? 75) / 2, w = faceWidth(p) / 2, s = (p.acrossOut ?? 1) < 0 ? -1 : 1, S = rollerSpan(p);
  // Pin plate flat on the inner side face (UHMW between), a diagonal gusset forward and inward to the ear plate that carries the roller.
  const plate0 = face + r.liner, plate1 = plate0 + r.plate, axisX = s * (w + r.axisAhead), earX = s * (w + r.earFrom), ear0 = face + r.earInset, ear1 = S - face - r.earInset;
  return { face, w, s, S, plate0, plate1, axisX, earX, ear0, ear1, pad0: ear0 + 4, pad1: ear1 - 4, detentZ: -r.detentStations * (p.mountSpacing ?? 50) };
}
export const ROGUE_MULTI_USE_RACK_ROLLER = defineRackPart({
  id: 'rogue-multi-use-rack-roller', name: 'Rogue Multi-Use Rack Roller', title: 'Rogue Multi-Use Rack Roller', noun: 'rack roller', section: 'Rollers & pads',
  description: 'Full-width 41 x 6 in vinyl roller across the front uprights on two UHMW-lined 1/4 in formed brackets, each pinned side to side through its upright with a welded peg and a detent pin · 12 in deep, 8 in brackets · Monster (1 in) or Monster Lite (5/8 in). ' + END('Rogue Fitness'),
  params: [{ key: 'series', label: 'Series', default: 0, options: [0, 1], format: v => RACK_ROLLER_SERIES[v] ?? String(v) }],
  vendor: {
    vendor: 'Rogue Fitness', url: 'https://www.roguefitness.com/rogue-multi-use-rack-roller', credit: 'Rogue Fitness — Multi-Use Rack Roller (RA3136 Monster / RA3173 Monster Lite)', trademark: 'Rogue, Monster and Monster Lite are trademarks of Rogue Fitness.',
    reconstruction: 'Published 41 in x 6 in pad, 12 in depth, 8 in brackets of 1/4 in formed steel with UHMW, 50.5 / 49.5 in overall and 1 in x 4.5 in / 5/8 in detent pins for 43 in inside-width Monster racks. Peg-to-detent spacing, roller axis position, web and ear outlines are estimated from Rogue\'s to-scale instructions (IS0596, IS0607) and 20 Rogue photos; the roller follows the actual post spacing; physical fit unverified.',
  },
  mount: {
    pin: p => p.series ? PIN_5_8IN : PIN_1IN, holes: [0, -RACK_ROLLER.detentStations], mainStations: true, span: 'normal', faces: ['left', 'right'],
    extent: { below: -RACK_ROLLER.axisZ + RACK_ROLLER.padDiameter / 2 + 2, above: RACK_ROLLER.bracketTop + 2 },
    validate: (_r: RackDimensions, p: NumericParams) => {
      const w = faceWidth(p); if (Math.abs(w - inch(3)) > 2.5) throw Error(`The Multi-Use Rack Roller brackets fit 3 in uprights, not ${(w / 25.4).toFixed(2)} in.`);
      if (p.uprightSpan !== undefined) { const gap = p.uprightSpan - (p.upright ?? 75); if (gap < 1060 || gap > 1110) throw Error(`The Multi-Use Rack Roller is a fixed 41 in roller for 43 in inside-width racks; these uprights are ${(gap / 25.4).toFixed(1)} in apart.`); }
    },
  },
  bodies: p => {
    const l = rackRollerLayout(p), r = RACK_ROLLER.padDiameter / 2, z = RACK_ROLLER.axisZ;
    return [box([l.axisX - r, l.pad0 + 2, z - r], [l.axisX + r, l.pad1 - 2, z + r])];
  },
  placement: { height: 515, face: 'inside' },
  autoFit: rack => ({ series: rack.holeDiameter < 20 ? 1 : 0 }),
  context: ['acrossOut'],
});

// ───────────────────────────── REP Fitness Utility Seat ─────────────────────────────
/** Published (PRA-5440): 32.75 x 11.6 in usable top, 1000 lb, 52.8 lb, 11-gauge steel, rubber mat, fits 3x3 racks 47 in
 * (or 49 in with the extra liners) outside, rests on flip-down safeties, spotter arms, crossmembers or ISO arms, pinned
 * with 1 in or 5/8 in pins. Estimated from 32 REP photos and REP's build video: 40.25 in steel tray, 12.25 in wide, 3.25 in
 * deep, 3 in end plates over each member, the liner thicknesses. */
export const UTILITY_SEAT = {
  top: [inch(32.75), inch(11.6)] as const, width: inch(12.25), depth: inch(3.25), steel: 3.05, overhang: inch(3), liner: [inch(.35), inch(1.35)] as const,
  mat: 5, slot: [inch(5), inch(1.5)] as const, pin: [PIN_1IN, PIN_5_8IN] as const, gap: [inch(41), inch(43)] as const,
} as const;
export const SEAT_LINERS = ['Standard liners · 47 in racks (41 in between members)', 'Thick liners · 49 in racks (43 in between members)'] as const;
/** Member-to-member layout along local X (toward the matching arm, `hostSpan`), from the near member's axis. */
export function utilitySeatLayout(p: NumericParams) {
  const u = UTILITY_SEAT, hw = (p.hostWidth ?? inch(3)) / 2, top = p.hostTop ?? hw, liner = u.liner[p.liners ?? 0] ?? u.liner[0];
  const span = p.hostSpan ?? (u.gap[p.liners ?? 0] + 2 * hw), s = span < 0 ? -1 : 1, near = s * hw, far = span - s * hw;
  const wall0 = near + s * liner, wall1 = far - s * liner, deck0 = top + 3, deckTop = deck0 + u.steel;
  return { s, hw, top, liner, span, near, far, wall0, wall1, gap: Math.abs(far - near), deck0, deckTop, bottom: deckTop - u.depth, plate0: near - s * u.overhang, plate1: far + s * u.overhang, halfW: u.width / 2 };
}
export const REP_UTILITY_SEAT = defineRackPart({
  id: 'rep-utility-seat', name: 'REP Utility Seat', title: 'REP Fitness Utility Seat', noun: 'utility seat', section: 'Rollers & pads',
  description: '11-gauge steel utility platform that spans a pair of flip-down safeties, spotter arms or crossmembers, pinned through their side holes · 32.75 x 11.6 in rubber-mat top, 1,000 lb, optional CleanGrip pad. ' + END('REP Fitness'),
  params: [
    { key: 'pad', label: 'Pad', default: 0, options: [0, 1], format: v => v ? 'Utility Seat Pad (CleanGrip)' : 'Rubber mat only' },
    { key: 'liners', label: 'Liners', default: 0, options: [0, 1], format: v => SEAT_LINERS[v] ?? String(v) },
    { key: 'pin', label: 'Pins', default: 0, options: [0, 1], format: v => ['1 in quick-release pins', '5/8 in quick-release pins'][v] ?? String(v) },
  ],
  vendor: {
    vendor: 'REP Fitness', url: 'https://repfitness.com/products/utility-seat', credit: 'REP Fitness — Utility Seat (PRA-5440)', trademark: 'REP Fitness and CleanGrip are trademarks of REP Fitness.',
    reconstruction: 'Published 32.75 x 11.6 in usable top, 1,000 lb, 52.8 lb, 11-gauge steel, rubber mat, 3x3 racks 47 in (49 in with the extra liners) wide, and the 1 in / 5/8 in pins. Tray depth, end plates, ribs, hand slots and liner thicknesses are estimated from 32 REP photos and REP\'s build video; the tray follows the actual member spacing; physical fit unverified.',
  },
  mount: {
    targets: ['spotter-arm'], faces: [],
    pin: p => UTILITY_SEAT.pin[p.pin ?? 0] ?? PIN_1IN,
    extent: p => { const l = utilitySeatLayout(p); return { below: Math.max(-l.bottom, 43) + 2, above: l.deckTop + UTILITY_SEAT.mat + (p.pad ? inch(2.5) : 0) + 2 }; },
    hostReach: () => ({ back: UTILITY_SEAT.width / 2, front: UTILITY_SEAT.width / 2 }),
    validate: (_r: RackDimensions, p: NumericParams) => {
      if (p.hostWidth === undefined) return;
      if (p.hostSpan === undefined) throw Error('The Utility Seat spans two matching spotter arms or safeties; add the pair across the rack first.');
      const gap = utilitySeatLayout(p).gap;
      if (gap < 1000 || gap > 1160) throw Error(`The Utility Seat spans 41–43 in between members; these are ${(gap / 25.4).toFixed(1)} in apart.`);
    },
  },
  bodies: p => {
    const l = utilitySeatLayout(p), x0 = Math.min(l.plate0, l.plate1), x1 = Math.max(l.plate0, l.plate1), w0 = Math.min(l.wall0, l.wall1), w1 = Math.max(l.wall0, l.wall1);
    return [box([x0 + 1, -l.halfW + 1, l.deck0], [x1 - 1, l.halfW - 1, l.deckTop + UTILITY_SEAT.mat]), box([w0 + 1, -l.halfW + 1, l.bottom], [w1 - 1, l.halfW - 1, l.deck0])];
  },
  placement: { height: 610, target: 'spotter-arm' },
  autoFit: rack => ({ liners: rack.width > inch(42) ? 1 : 0, pin: rack.holeDiameter < 20 ? 1 : 0 }),
  family: 'rack:seats',
});

// ───────────────────────────── Darko Lifting Thresher Pad ─────────────────────────────
/** Published: 8.5 x 13 in pad, 10 lb, 3/16 in steel, five angles 0/15/30/45/60°, 3x3 spotter arms with 1 in holes, two
 * 0.98 in Magpins (sold separately), wrinkle black, grippy seat, liners. Estimated (inches, pivot-pin frame: y along the
 * arm toward its tip, z up) from Darko's 4 images, 3 Gym Radar owner photos and two YouTube reviews: the side-plate
 * shield outline, the pad 3.6 in above the pivot and 2.5 in rack-ward, the lock-hole arc at two hole pitches. */
export const THRESHER = {
  pad: [inch(8.5), inch(13), inch(3)] as const, cushion: inch(2.5), padZ: inch(3.6), padY: -inch(2.5), steel: inch(.187), liner: inch(.125),
  // Round 2 (0° GIF frame, 31.5 px/in): straight rack-side edge 0.7 in past the lock pin, scalloped arc (the lock holes break
  // through it), nose 1.8 in rack-ward of and 4.1 in below the pivot, straight tip-side edge 1 in past the pivot.
  outline: [[1, 3.6], [-4.7, 3.6], [-4.72, .35]] as Vec2[], edgeR: 4.6, arc: [4, 66] as const, tip: [[-1.25, -4.28], [-.2, -3.95], [.7, -3.1], [1, -2.2]] as Vec2[],
  hole: inch(1.03), pairHoles: [[-3.45, 1.75], [.1, 1.4]] as Vec2[], logo: [-1.95, -.2, .8] as const, flange: inch(1), magpin: inch(.98), knob: [38, 28] as const,
  angles: [0, 15, 30, 45, 60] as const,
} as const;
export const THRESHER_LINERS = [['Black liners', '#26272a'], ['Red liners', '#b3161d'], ['Yellow liners', '#e3b21b']] as const;
/** Plate outline (mm, pivot frame) before rotation: shield with the scalloped lock arc along its rack-side bottom. */
export function thresherOutline(): Vec2[] {
  const t = THRESHER, arc: Vec2[] = [];
  for (let a = t.arc[0]; a <= t.arc[1] + 1e-9; a += (t.arc[1] - t.arc[0]) / 24) arc.push([-t.edgeR * Math.cos(a * Math.PI / 180), -t.edgeR * Math.sin(a * Math.PI / 180)]);
  return [...t.outline, ...arc, ...t.tip].map(([y, z]) => [inch(y), inch(z)] as Vec2);
}
/** Rotation that raises the rack-side (−Y) end by `deg` about the pivot pin (the X axis). */
export const thresherTurn = (deg: number) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return ([y, z]: Vec2): Vec2 => [y * c + z * s, -y * s + z * c]; };
export function thresherLayout(p: NumericParams) {
  const t = THRESHER, deg = t.angles[p.angle ?? 0] ?? 0, turn = thresherTurn(deg), pitch = p.hostPitch ?? inch(2);
  const hw = (p.hostWidth ?? inch(3)) / 2, x0 = hw + t.liner, x1 = x0 + t.steel;
  const [pw, pl, ph] = t.pad, y0 = t.padY - pl / 2, y1 = t.padY + pl / 2;
  const padCorners: Vec2[] = ([[y0, t.padZ], [y1, t.padZ], [y0, t.padZ + ph], [y1, t.padZ + ph]] as Vec2[]).map(turn);
  const plate = thresherOutline().map(turn), all = [...padCorners, ...plate];
  const ys = plate.map(q => q[0]), zs = all.map(q => q[1]);
  return { deg, turn, pitch, lockR: 2 * pitch, hw, x0, x1, padW: pw, padCorners, plate, back: -Math.min(...ys), front: Math.max(...ys), zMin: Math.min(...zs), zMax: Math.max(...zs),
    padBox: box([-pw / 2 + 4, Math.min(...padCorners.map(q => q[0])) + 4, Math.min(...padCorners.map(q => q[1])) + 4], [pw / 2 - 4, Math.max(...padCorners.map(q => q[0])) - 4, Math.max(...padCorners.map(q => q[1])) - 4]) };
}
export const DARKO_THRESHER_PAD = defineRackPart({
  id: 'darko-thresher-pad', name: 'Darko Thresher Pad', title: 'Darko Lifting Thresher Pad', noun: 'thresher pad', section: 'Rollers & pads',
  description: 'Spotter-arm seat and chest pad: an 8.5 x 13 in grippy pad on two 3/16 in wrinkle-black shield plates that straddle a 3x3 arm and pin through its 1 in holes with two 0.98 in Magpins · five angles, 0 to 60°. ' + END('Darko Lifting'),
  params: [
    { key: 'angle', label: 'Angle', default: 0, options: [0, 1, 2, 3, 4], format: v => `${THRESHER.angles[v] ?? v}°` },
    { key: 'liner', label: 'Liners', default: 0, options: [0, 1, 2], format: v => THRESHER_LINERS[v]?.[0] ?? String(v) },
  ],
  vendor: {
    vendor: 'Darko Lifting', url: 'https://darkolifting.com/products/thresher-utility-pad', credit: 'Darko Lifting — Thresher Pad · Made in USA', trademark: 'Darko Lifting products shown with credit.',
    reconstruction: 'Published 8.5 x 13 in pad, 10 lb, 3/16 in steel, five 15° angles, two 0.98 in Magpins through a 3x3 arm\'s 1 in holes. Side-plate outline, hole positions, pad offset and liner are estimated from Darko\'s 4 images, 3 Gym Radar owner photos and two review videos (20 frames); the Magpins are sold separately; physical fit unverified.',
  },
  mount: {
    targets: ['spotter-arm'], faces: [], pin: PIN_1IN,
    extent: p => { const l = thresherLayout(p); return { below: -l.zMin + 2, above: l.zMax + 2 }; },
    // The lock pin sits two holes rack-ward of the pivot; the plates must stay on the flat of the arm.
    hostReach: p => { const l = thresherLayout(p); return { back: Math.max(l.back, 2 * l.pitch + inch(.6)), front: l.front }; },
    validate: (_r: RackDimensions, p: NumericParams) => {
      if (p.hostWidth !== undefined && (p.hostWidth < inch(2) - 2 || p.hostWidth > inch(3) + 4)) throw Error(`The Thresher Pad plates straddle 2–3 in spotter arms, not a ${(p.hostWidth / 25.4).toFixed(2)} in tube.`);
    },
  },
  bodies: p => {
    const l = thresherLayout(p), ys = l.plate.map(q => q[0]), zs = l.plate.map(q => q[1]);
    return [l.padBox, box([-l.x1, Math.min(...ys) + 3, Math.min(...zs) + 3], [-l.x0, Math.max(...ys) - 3, Math.max(...zs) - 3]), box([l.x0, Math.min(...ys) + 3, Math.min(...zs) + 3], [l.x1, Math.max(...ys) - 3, Math.max(...zs) - 3])];
  },
  pair: { default: false },
  placement: { height: 815, target: 'spotter-arm' },
  family: 'rack:seats',
});
export const REGISTRY_V2_PARTS = [ROGUE_MULTI_USE_RACK_ROLLER, REP_UTILITY_SEAT, DARKO_THRESHER_PAD] as const satisfies readonly RackPart[];
