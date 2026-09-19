/** Ladder-style adjustable benches (Rogue AB-3/AB-2/Manta Ray, Freak Athlete ABX, APEX, PRIME Shorty, Major PLT01, Titan FID):
 * one parametric tripod builder driven by ../floor-parts/benches-specs.ts. The back pad and seat hinge about their pivots;
 * fixed-length support links land on ladder/leg stations solved from the linkage, so every published angle is a real pose. */
import type { Manifold, ManifoldAPI, NumericParams, SolidPart, Vec3 } from '../types.ts';
import {
  ABX_HEADREST, ABX_LEG_DEV, APEX_STRYKER, MANTA_FOOT_CATCH, PRIME_HEADREST, PRIME_PREACHER, TITAN_FID_ROLLERS,
  adjustableLayout, along, rotYZ, type AdjustableSpec, type Colorway, type Pt,
} from '../floor-parts/benches-specs.ts';
import { ADJUSTABLE_LOOKS, type AdjustableLook } from '../floor-parts/benches.ts';
import { buildBench, CHROME, RUBBER, STAINLESS, STEEL, VINYL, ZINC, type Kit } from './benches-kit.ts';
export function buildAdjustable(api: ManifoldAPI, id: keyof typeof ADJUSTABLE_LOOKS, p: NumericParams): SolidPart[] {
  const look: AdjustableLook = ADJUSTABLE_LOOKS[id];
  const s = look.spec, lay = adjustableLayout(s);
  if (!s.backAngles.includes(p.backAngle) || !s.seatAngles.includes(p.seatAngle)) throw Error('Unsupported bench angle.');
  const color: Colorway = look.colors[p.color ?? 0] ?? look.colors[0];
  return buildBench(api, kit => {
    const frame = STEEL(color.hex, .5, .3);
    const { tube, tubeYZ, cyl, box, span, add, hinge, pad, taperPts, plateYZ, planSlab, wheel, boltX, cut } = kit;
    const [th, tw] = s.tube, padB = s.top - s.back.t, seatB = s.top - s.seat.t;
    const F: Manifold[] = [], rub: Manifold[] = [], hw: Manifold[] = [], tyres: Manifold[] = [], hubs: Manifold[] = [];
    const ladderColor = look.kind === 'rogue-ab3' && p.plates ? 'stainless' : look.ladderColor;
    const ladderFinish = ladderColor === 'frame' ? frame : ladderColor === 'stainless' ? STAINLESS : STEEL(ladderColor, .45, .35);
    const accent = look.accent ? STEEL(look.accent, .4, .1) : ZINC;
    const vinyl = VINYL(look.padColor ?? '#17181a');
    const sp = (s0: number, h: number): Pt => along(along(s.joint, lay.u, s0), lay.n, h); // spine frame → (y,z)
    const lp = (s0: number, h: number): Pt => along(along(s.foot, lay.v, s0), lay.m, h);  // front-leg frame → (y,z)
    // ── Base: front foot/leg, spine, rear foot, wheels ─────────────────────────────────────────────
    const legTop = along(s.joint, lay.v, th / 2), spineStart = along(s.joint, lay.u, -th / 2);
    if (look.front === 'splay') {
      for (const x of [-1, 1]) {
        F.push(tube([x * 34, s.joint[0], s.joint[1]], [x * look.frontSpan / 2, s.foot[0], s.foot[1] + 18], th, tw));
        rub.push(box([90, 70, s.foot[1] + 10], [x * (look.frontSpan / 2), s.foot[0], (s.foot[1] + 10) / 2]));
      }
    } else {
      F.push(tubeYZ(0, [s.foot[0], s.foot[1]], legTop, th, tw));
      if (look.front === 'post') {
        rub.push(planSlab(kit.rectPts(230, 230, 0, s.foot[0]), 0, 4, 12));
        F.push(planSlab(kit.rectPts(224, 224, 0, s.foot[0]), 4, s.foot[1] - 4, 12));
      } else if (look.front === 'manta') {
        const y = s.foot[0], wing: Pt[] = [[-70, y - 95], [70, y - 95], [175, y + 45], [160, y + 90], [-160, y + 90], [-175, y + 45]];
        rub.push(planSlab(wing, 0, 4, 10)); F.push(planSlab(wing.map(([x, yy]) => [x * .97, yy] as Pt), 4, s.foot[1] - 4, 10));
      } else {
        const fw = look.frontSpan, fd = 170, y = s.foot[0];
        rub.push(planSlab(kit.rectPts(fw, fd, 0, y), 0, 4, 14)); F.push(planSlab(kit.rectPts(fw - 6, fd - 6, 0, y), 4, s.foot[1] - 4, 14));
      }
    }
    let spine = tubeYZ(0, spineStart, s.spineEnd, th, tw);
    const [rh, rd] = s.rearTube, rz = s.rubber + rh / 2, cap = 46;
    if (look.rear === 'splay') {
      for (const x of [-1, 1]) {
        F.push(tube([x * 30, s.spineEnd[0], s.spineEnd[1]], [x * (s.W / 2 - 45), s.rearY, s.rubber + 20], th, tw));
        rub.push(box([90, 64, s.rubber + 12], [x * (s.W / 2 - 45), s.rearY, (s.rubber + 12) / 2]));
      }
      F.push(tube([-(s.W / 2 - 60), s.rearY, s.rubber + 26], [s.W / 2 - 60, s.rearY, s.rubber + 26], 34, 34));
    } else {
      F.push(tube([-(s.W / 2 - cap), s.rearY, rz], [s.W / 2 - cap, s.rearY, rz], rh, rd));
      for (const x of [-1, 1]) {
        // Moulded rubber foot: tapered wedge cap over the tube end, down to the floor.
        const x0 = x * (s.W / 2 - cap - 6), x1 = x * s.W / 2;
        rub.push(kit.k(kit.M.hull([box([4, rd + 8, rh + s.rubber], [x0, s.rearY, (rh + s.rubber) / 2]), box([2, rd + 8, rh * .6], [x1 - x, s.rearY, rh * .3])])));
      }
    }
    const wy = s.L - s.wheel.d / 2;
    for (const x of [-1, 1]) {
      wheel(x * s.wheel.x, wy, s.wheel.z, s.wheel.d, s.wheel.w, tyres, hubs);
      for (const side of [-1, 1]) F.push(span([x * s.wheel.x + side * (s.wheel.w / 2 + 3) - 2.5, s.rearY, s.wheel.z - 22], [x * s.wheel.x + side * (s.wheel.w / 2 + 3) + 2.5, wy, s.wheel.z + 22]));
    }
    if (look.storagePost) {
      const top = look.storagePost;
      F.push(tube([0, s.rearY, rz + rh / 2 - 4], [0, s.rearY, top], th, tw));
      rub.push(box([tw + 4, th + 4, 8], [0, s.rearY, top + 4]));
      F.push(span([-tw / 2 - 10, s.rearY + th / 2, top - 60], [tw / 2 + 10, s.rearY + th / 2 + 6, top - 10]));
    }
    // ── Front handle ─────────────────────────────────────────────────────────────────────────────
    const plateFront = look.front === 'manta' ? s.foot[0] - 95 : s.foot[0] - 85;
    if (look.handle === 'grip') {
      add('Front pull handle grip', { color: '#141516', role: 'handle', metalness: 0, roughness: .8 }, cyl([-look.handleW / 2, 16, 26], [look.handleW / 2, 16, 26], 32, 28));
      for (const x of [-1, 1]) F.push(span([x * (look.handleW / 2 - 18) - 5, 14, 8], [x * (look.handleW / 2 - 18) + 5, plateFront + 10, 36]));
    } else if (look.handle === 'loop') {
      for (const x of [-1, 1]) F.push(span([x * look.handleW / 2 - 5, 0, 6], [x * look.handleW / 2 + 5, plateFront + 10, 36]));
      F.push(span([-look.handleW / 2, 0, 6], [look.handleW / 2, 10, 36]));
      add('Handle liner', RUBBER, span([-look.handleW / 2 + 12, -0, 8], [look.handleW / 2 - 12, 11, 34]));
    } else if (look.handle === 'major') {
      // Round-bar D handle off the front legs, below the seat.
      const hz = 150, y0 = 15, yl = s.foot[0] + 70;
      for (const x of [-1, 1]) F.push(cyl([x * 70, yl, hz + 60], [x * 70, y0, hz], 25, 16));
      F.push(cyl([-70, y0, hz], [70, y0, hz], 25, 16));
      add('Front pull handle grip', { color: '#141516', role: 'handle', metalness: 0, roughness: .8 }, cyl([-55, y0, hz], [55, y0, hz], 30, 20));
    } else if (look.handle === 'post') {
      // Titan FID: foam leg-hold rollers on a U-tube off the front post (front roller pair sets the footprint front).
      const R = TITAN_FID_ROLLERS, y1 = R.d / 2, y2 = R.d / 2 + 110;
      F.push(tubeYZ(0, [s.foot[0] - th / 2, R.z[0]], [y1 + 20, R.z[0]], 51, 51));
      F.push(tubeYZ(0, [y1 + 10, R.z[0] - 25], [y2, R.z[1] + 10], 51, 51));
      for (const [y, z] of [[y1, R.z[0]], [y2, R.z[1]]] as Pt[]) {
        hw.push(cyl([-(R.len + 30), y, z], [R.len + 30, y, z], 25, 16));
        for (const x of [-1, 1]) add('Leg-hold foam rollers', VINYL('#151617'), cut(cyl([x * 32, y, z], [x * (R.len + 32), y, z], R.d, 32), []));
      }
      add('Knurled front handle', { color: '#2b2c2e', role: 'handle', metalness: .7, roughness: .45 }, cyl([-95, s.foot[0] - th / 2 - 30, 70], [95, s.foot[0] - th / 2 - 30, 70], 32, 20));
      for (const x of [-1, 1]) F.push(cyl([x * 80, s.foot[0] - th / 2 - 30, 70], [x * 60, s.foot[0] - th / 2 + 2, 120], 25, 12));
    }
    // ── Ladder ───────────────────────────────────────────────────────────────────────────────────
    const angles = s.backAngles, stations = angles.map(a => lay.backStation(a)), pinD = look.pinD ?? 25;
    const pinH = th / 2 + s.ladder.rise, fullPlates = look.ladderSpan;
    const from = fullPlates ? Math.min(fullPlates[0], lay.ladder.from) : lay.ladder.from, to = fullPlates ? Math.max(lay.spineLen - fullPlates[1], lay.ladder.to) : lay.ladder.to;
    if (look.ladder === 'internal') {
      // Manta Ray: pin rides inside the tube; laser-cut rounded windows through both side walls.
      const windows = stations.map(st => {
        const c = sp(st, pinH), w = pinD + 30, h = pinD + 8, a = Math.atan2(lay.u[1], lay.u[0]) * 180 / Math.PI;
        const slot = kit.k(kit.k(kit.k(kit.C.square([w - h, .01], true)).offset(h / 2, 'Round', 2, 20)).extrude(tw + 20, 0, 0, [1, 1], true));
        return kit.move(kit.rot(kit.rot(slot, [0, 90, 0]), [a, 0, 0]), [0, c[0], c[1]]);
      });
      spine = cut(spine, windows);
    } else {
      const pt = look.ladderT ?? 6, top = pinH + pinD / 2 + (look.ladder === 'enclosed' ? 34 : 14), bottom = look.ladderLow ?? -th / 2 + 8;
      const outline: Pt[] = [sp(from, bottom), sp(to, bottom), sp(to, top)];
      const holes: Pt[][] = [];
      const sorted = [...stations].sort((a, b) => b - a), nw = pinD / 2 + 2;
      for (const st of sorted) {
        if (look.ladder === 'enclosed') {
          const ring: Pt[] = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ring.push(sp(st + Math.cos(a) * (nw + 5), pinH + Math.sin(a) * nw)); }
          holes.push(ring);
        } else {
          // Hook notch: vertical slot from the top edge to the pin seat, leaning toward the pivot like the photographed teeth.
          outline.push(sp(st + nw + 10, top), sp(st + nw, pinH), sp(st + nw * .6, pinH - nw * .9), sp(st - nw * .6, pinH - nw * .9), sp(st - nw, pinH), sp(st - nw - 2, top));
        }
      }
      outline.push(sp(from, top));
      const plates = [-1, 1].map(x => plateYZ(x * (tw / 2 + pt / 2), outline, pt, holes));
      add('Ladder plates', ladderFinish, ...plates);
      for (const x of [-1, 1]) for (const st of [from + 20, (from + to) / 2, to - 20]) { const c = sp(st, 0); hw.push(boltX(x * (tw / 2 + pt), c[0], c[1], x as 1 | -1, 17, 6)); }
    }
    F.push(spine);
    // ── Pivot brackets, back pad, rail, support link ─────────────────────────────────────────────
    const P = lay.pivot, a = p.backAngle, railW = look.railW ?? 60;
    const jTop = sp(0, th / 2);
    for (const x of [-1, 1]) {
      const bx = x * (Math.max(tw, railW) / 2 + 5);
      F.push(plateYZ(bx, [sp(-th / 2, th / 2 - 20), sp(170, th / 2 - 20), [P[0] + 30, P[1] - 18], [P[0], P[1] + 22], [P[0] - 40, P[1] + 5], [jTop[0] - 40, jTop[1]]], 8));
      hw.push(boltX(bx + x * 4, P[0], P[1], x as 1 | -1, 24, 8));
    }
    hw.push(cyl([-(Math.max(tw, railW) / 2 + 12), P[0], P[1]], [Math.max(tw, railW) / 2 + 12, P[0], P[1]], 16, 16));
    const backPts = taperPts(lay.backFront, lay.backEnd, s.back.w, s.back.wEnd ?? s.back.w);
    const backPad = hinge(pad(backPts, s.back.t, s.back.r, s.back.e, padB), P, a);
    const backRail = hinge(tubeYZ(0, [lay.backFront + 25, padB - s.rail / 2], [lay.backEnd - 40, padB - s.rail / 2], s.rail, railW), P, a);
    const backTabs = [-1, 1].map(x => hinge(plateYZ(x * (railW / 2 + 5), [[P[0] - 45, padB], [P[0] + 110, padB], [P[0] + 110, padB - s.rail], [P[0] + 10, P[1] - 30], [P[0] - 30, P[1] - 20]], 7), P, a));
    add(look.padName, vinyl, backPad);
    add('Pad rails and brackets', frame, backRail, ...backTabs);
    // Support link: forked bars from the rail lug down to the ladder pin.
    const T = lay.backTop(a), pin = lay.backPin(a), lx = tw / 2 + (look.ladder === 'internal' ? 12 : (look.ladderT ?? 6) + 12);
    for (const x of [-1, 1]) F.push(tube([x * lx, T[0], T[1]], [x * lx, pin[0], pin[1]], 44, 10));
    F.push(cyl([-lx - 5, T[0], T[1]], [lx + 5, T[0], T[1]], 26, 16));
    add('Ladder pin', STEEL('#26282b', .4, .6), cyl([-(lx + 34), pin[0], pin[1]], [lx + 34, pin[0], pin[1]], pinD, 20));
    add('Pin grips', { color: '#141516', role: 'handle', metalness: 0, roughness: .8 }, cyl([lx + 8, pin[0], pin[1]], [lx + 40, pin[0], pin[1]], pinD + 8, 20), cyl([-(lx + 40), pin[0], pin[1]], [-(lx + 8), pin[0], pin[1]], pinD + 8, 20));
    // ── Seat, seat hinge, seat adjuster ──────────────────────────────────────────────────────────
    const H = lay.seatHinge, sa = p.seatAngle;
    const seatPts = taperPts(s.seatFront, s.seatFront + s.seat.len, s.seat.wEnd ?? s.seat.w, s.seat.w);
    add(look.padName, vinyl, hinge(pad(seatPts, s.seat.t, s.seat.r, s.seat.e, seatB), H, -sa));
    add('Pad rails and brackets', frame, hinge(tubeYZ(0, [s.seatFront + 20, seatB - s.rail / 2], [H[0] + 12, seatB - s.rail / 2], s.rail, railW), H, -sa));
    for (const x of [-1, 1]) {
      F.push(plateYZ(x * (railW / 2 + 5), [[H[0] - 40, H[1] - s.rail - 10], [H[0] + 22, H[1] - 10], [H[0] + 10, H[1] + 18], [H[0] - 25, H[1] + 4], jTop, [jTop[0] - 60, jTop[1] - 20]], 7));
      hw.push(boltX(x * (railW / 2 + 9), H[0], H[1], x as 1 | -1, 20, 7));
    }
    if (look.seatAdjust === 'link') {
      const ST = lay.seatTop(sa), SP = lay.seatPin(sa), st = s.seatAngles.map(lay.seatStation), sl = lay.seatLadder, pt = 6, mx = tw / 2 + pt / 2;
      const outline: Pt[] = [lp(sl.from, -th / 2 + 6), lp(sl.to, -th / 2 + 6), lp(sl.to, th / 2 + 34)];
      for (const x of [...st].sort((q, r) => r - q)) outline.push(lp(x + 20, th / 2 + 34), lp(x + 14, th / 2 + 10), lp(x - 14, th / 2 + 10), lp(x - 20, th / 2 + 34));
      outline.push(lp(sl.from, th / 2 + 34));
      add('Ladder plates', ladderFinish, ...[-1, 1].map(x => plateYZ(x * mx, outline, pt)));
      for (const x of [-1, 1]) F.push(tube([x * (tw / 2 + 17), ST[0], ST[1]], [x * (tw / 2 + 17), SP[0], SP[1]], 36, 9));
      F.push(cyl([-(tw / 2 + 22), ST[0], ST[1]], [tw / 2 + 22, ST[0], ST[1]], 22, 16));
      add('Ladder pin', STEEL('#26282b', .4, .6), cyl([-(tw / 2 + 30), SP[0], SP[1]], [tw / 2 + 30, SP[0], SP[1]], 20, 16));
    } else {
      // Sundial: arc plate on the seat, a pop-pin through the frame bracket picks the hole for each seat angle.
      const R = look.sundialR ?? 200, alphaPin = 235, pinPt: Pt = rotYZ([H[0] + R, H[1]], alphaPin, H);
      const toSeat = (deg: number, r: number): Pt => rotYZ([H[0] + r, H[1]], deg, H);
      const lo = alphaPin + Math.min(...s.seatAngles) - 9, hi = alphaPin + Math.max(...s.seatAngles) + 9, arc: Pt[] = [];
      for (let i = 0; i <= 24; i++) arc.push(toSeat(lo + (hi - lo) * i / 24, R + 24));
      for (let i = 24; i >= 0; i--) arc.push(toSeat(lo + (hi - lo) * i / 24, R - 24));
      arc.push(toSeat(hi, R - 60), [H[0] - 30, H[1] - s.rail], [H[0] - 150, H[1] - s.rail], toSeat(lo, R - 40));
      const holes = s.seatAngles.map(sa2 => { const c = toSeat(alphaPin + sa2, R), ring: Pt[] = []; for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; ring.push([c[0] + Math.cos(t) * 8, c[1] + Math.sin(t) * 8]); } return ring; });
      const dial = plateYZ(-(tw / 2 + 8), arc, 8, holes);
      add('Seat adjuster dial', look.dialColor ? STEEL(look.dialColor, .45, .35) : ladderFinish, hinge(dial, H, -sa));
      // Frame bracket from the leg top to the pin, pop-pin with a knurled knob.
      // Leg station under the pin: match y on a raked leg, height on a vertical post.
      const guess = Math.abs(lay.v[0]) > .3 ? (pinPt[0] - s.foot[0]) / lay.v[0] : pinPt[1] - s.foot[1] - 70;
      const legPt = lp(Math.min(lay.legLen - 30, Math.max(40, guess)), th / 2);
      F.push(plateYZ(-(tw / 2 + 18), [[legPt[0] - 30, legPt[1] - 30], [legPt[0] + 30, legPt[1] - 20], [pinPt[0] + 22, pinPt[1]], [pinPt[0], pinPt[1] + 22], [pinPt[0] - 22, pinPt[1]]], 8));
      add('Pop-pin knobs', accent, cyl([-(tw / 2 + 60), pinPt[0], pinPt[1]], [-(tw / 2 + 22), pinPt[0], pinPt[1]], 34, 20));
      hw.push(cyl([-(tw / 2 + 24), pinPt[0], pinPt[1]], [tw / 2 - 4, pinPt[0], pinPt[1]], 14, 12));
    }
    // ── Product details and attachments ──────────────────────────────────────────────────────────
    extras(kit, look, s, lay, p, { frame, accent, vinyl, F, hw, rub, padB });
    add(`Frame · ${color.name}`, frame, ...F);
    add('Rubber feet', RUBBER, ...rub);
    add('Wheels', RUBBER, ...tyres);
    add('Wheel hubs', STEEL('#3a3c3f', .35, .7), ...hubs);
    add('Hardware', ZINC, ...hw);
    return kit.collect([0, -s.L / 2, 0]);
  });
}
type Layout = ReturnType<typeof adjustableLayout>;
interface Ctx { frame: ReturnType<typeof STEEL>; accent: ReturnType<typeof STEEL>; vinyl: ReturnType<typeof VINYL>; F: Manifold[]; hw: Manifold[]; rub: Manifold[]; padB: number }
function extras(kit: Kit, look: AdjustableLook, s: AdjustableSpec, lay: Layout, p: NumericParams, c: Ctx) {
  const { cyl, box, span, add, hinge, pad, plateYZ, tube, tubeYZ, rectPts } = kit;
  const P = lay.pivot, a = p.backAngle, [th, tw] = s.tube;
  const badge = (fin: ReturnType<typeof STEEL>, w: number, h: number, at: Vec3) => add('Logo badges', fin, box([w, 3, h], at));
  switch (look.kind) {
    case 'rogue-ab3': case 'rogue-ab2': {
      // Laser-cut "R" badge plate on the seat post; ROGUE cut-out plate on the back rail side.
      const j = along(s.joint, lay.v, -40);
      badge(STAINLESS, 58, 66, [0, j[0] - th / 2 - 4, j[1] + 10]);
      add('Logo badges', STEEL('#0e0f10', .6), hinge(plateYZ(-(look.railW ?? 60) / 2 - 9, [[P[0] + 20, c.padB - 6], [P[0] + 200, c.padB - 6], [P[0] + 200, c.padB - s.rail + 6], [P[0] + 20, c.padB - s.rail + 6]], 2), P, a));
      break;
    }
    case 'rogue-manta': {
      badge(STAINLESS, 58, 66, [0, along(s.joint, lay.v, -40)[0] - th / 2 - 4, along(s.joint, lay.v, -40)[1] + 10]);
      if (p.footCatch) {
        const R = MANTA_FOOT_CATCH, near: Pt = [lay.backEnd + R.near[0], s.top + R.near[1]], far: Pt = [lay.backEnd + R.far[0], s.top + R.far[1]];
        const arm = [tubeYZ(0, [lay.backEnd - 120, c.padB - s.rail / 2], [lay.backEnd + 10, c.padB - s.rail / 2], s.rail - 6, 50), tubeYZ(0, [lay.backEnd, c.padB - s.rail / 2], near, 50, 50), tubeYZ(0, near, far, 50, 50)];
        const rollers: Manifold[] = [], shafts: Manifold[] = [];
        for (const q of [near, far]) {
          shafts.push(cyl([-(R.len + 45), q[0], q[1]], [R.len + 45, q[0], q[1]], 25, 16));
          for (const x of [-1, 1]) rollers.push(cyl([x * 30, q[0], q[1]], [x * (R.len + 30), q[0], q[1]], R.d, 36));
          for (const x of [-1, 1]) shafts.push(cyl([x * (R.len + 30), q[0], q[1]], [x * (R.len + 44), q[0], q[1]], 40, 20));
        }
        add('Foot catch arm', c.frame, ...arm.map(m => hinge(m, P, a)));
        add('Foot catch rollers', VINYL('#141516'), ...rollers.map(m => hinge(m, P, a)));
        add('Foot catch collars', STEEL('#2a2b2d', .35, .8), ...shafts.map(m => hinge(m, P, a)));
      }
      break;
    }
    case 'abx': {
      // Fold-down headrest on a hinged bracket at the head end; FA plate on the ladder.
      const Hh = ABX_HEADREST, h0 = lay.backEnd + Hh.gap, hp: Pt = [lay.backEnd + Hh.gap / 2, c.padB - 10];
      const fold = p.headrest ? -100 : 0;
      const head = hinge(hinge(pad(kit.taperPts(h0, h0 + Hh.len, Hh.w, Hh.w), Hh.t, 22, 16, s.top - Hh.t), hp, fold), P, a);
      const headRail = hinge(hinge(tubeYZ(0, [h0 + 10, c.padB - 16], [h0 + Hh.len - 30, c.padB - 16], 30, 50), hp, fold), P, a);
      add(look.padName, c.vinyl, head);
      add('Pad rails and brackets', c.frame, headRail, hinge(tubeYZ(0, [lay.backEnd - 80, c.padB - 18], [lay.backEnd + 6, c.padB - 18], 34, 54), P, a));
      add('Hardware', ZINC, hinge(cyl([-40, hp[0], hp[1]], [40, hp[0], hp[1]], 16, 12), P, a));
      // Front attachment port (receiver) under the seat front with a knurled tension knob.
      const port: Pt = [70, 250];
      c.F.push(tubeYZ(0, [port[0], port[1]], along(s.joint, lay.v, -130), 64, 64));
      add('Pop-pin knobs', c.accent, cyl([-70, port[0] + 30, port[1]], [-34, port[0] + 30, port[1]], 30, 16));
      if (p.legDeveloper) {
        const D = ABX_LEG_DEV, y0 = -D.reach, rz = D.pivotZ, arm: Manifold[] = [], roll: Manifold[] = [];
        // U-shaped floor base with two small wheels, twin uprights, pivot hub, thigh and shin rollers, plate horn.
        arm.push(tube([-D.baseW / 2 + 30, y0 + 30, 30], [D.baseW / 2 - 30, y0 + 30, 30], 51, 60));
        for (const x of [-1, 1]) arm.push(tube([x * (D.baseW / 2 - 30), y0 + 30, 30], [x * 110, port[0] - 20, 30], 51, 51));
        for (const x of [-1, 1]) arm.push(tube([x * 60, y0 + 150, 50], [x * 60, 30, rz], 64, 38));
        arm.push(tubeYZ(0, [port[0] + 60, port[1]], [-10, port[1]], 51, 51), tube([0, 20, port[1]], [0, 20, rz + 40], 51, 51));
        const piv: Pt = [30, rz], shin: Pt = [-180, 140], thigh: Pt = [120, rz + 60];
        arm.push(tubeYZ(0, piv, shin, 51, 38), tube([0, shin[0] + 60, shin[1] + 180], [0, -330, shin[1] + 150], 32, 32));
        for (const q of [shin, thigh, [-20, rz + 100] as Pt]) for (const x of [-1, 1]) roll.push(cyl([x * 30, q[0], q[1]], [x * (D.rollerLen + 30), q[0], q[1]], D.roller, 32));
        add('Leg Developer frame', c.frame, ...arm);
        add('Leg Developer rollers', VINYL('#141516'), ...roll);
        add('Leg Developer plate horn', CHROME, cyl([0, -330, shin[1] + 150], [0, y0 + 12, shin[1] + 150], 50, 24));
        for (const x of [-1, 1]) add('Wheels', RUBBER, cyl([x * (D.baseW / 2 - 30) - 12, y0 + 30, 26], [x * (D.baseW / 2 - 30) + 12, y0 + 30, 26], 52, 24));
      }
      break;
    }
    case 'apex': {
      // Head-end receiver on the rear of the frame; optional Stryker pad on a telescoping chrome post.
      c.F.push(tubeYZ(0, [s.rearY - 40, 150], [s.L - 50, 150], 64, 64));
      add('Pop-pin knobs', c.accent, cyl([-60, s.L - 90, 150], [-32, s.L - 90, 150], 34, 20));
      if (p.stryker) {
        const S = APEX_STRYKER, y = s.L + 60, z0 = 150, top = z0 + S.post + 190;
        c.F.push(tubeYZ(0, [s.L - 80, z0], [y + 32, z0], 51, 51), tube([0, y, z0 - 25], [0, y, z0 + S.post], 64, 64));
        add('Stryker post', CHROME, tube([0, y, z0 + S.post - 10], [0, y, top - S.t - 30], 51, 51));
        add('Pop-pin knobs', c.accent, cyl([-66, y, z0 + S.post - 40], [-32, y, z0 + S.post - 40], 34, 20));
        c.F.push(span([-40, y - 40, top - S.t - 32], [40, y + 40, top - S.t]));
        add('Stryker pad', c.vinyl, pad(rectPts(S.w, S.len, 0, y), S.t, 20, 18, top - S.t));
      }
      break;
    }
    case 'prime': {
      // Removable head-rest extension / Preacher Curl Pad on twin rods at the head end; lime knobs.
      const rods = [-1, 1].map(x => hinge(cyl([x * 60, lay.backEnd - 150, c.padB - 22], [x * 60, lay.backEnd + 60, c.padB - 22], 25, 16), P, a));
      if (p.headEnd === 0) {
        const Hh = PRIME_HEADREST, h0 = lay.backEnd + 12;
        add(look.padName, c.vinyl, hinge(pad(rectPts(Hh.w, Hh.len, 0, h0 + Hh.len / 2), Hh.t, 34, 14, s.top - Hh.t), P, a));
        add('Pad rails and brackets', c.frame, ...rods, hinge(span([-80, h0 + 10, c.padB - 34], [80, h0 + Hh.len - 30, c.padB - 6]), P, a));
      } else if (p.headEnd === 2) {
        const Q = PRIME_PREACHER, y0 = lay.backEnd + 20;
        const pads = [-1, 1].map(x => hinge(pad(rectPts(210, Q.len, x * (Q.w / 2 - 105), y0 + Q.len / 2), Q.t, 30, 16, s.top + Q.rise), P, a));
        add(look.padName, c.vinyl, ...pads);
        add('Pad rails and brackets', c.frame, ...rods, hinge(span([-Q.w / 2 + 30, y0 + 20, s.top + Q.rise - 30], [Q.w / 2 - 30, y0 + 70, s.top + Q.rise]), P, a),
          hinge(span([-40, y0 - 10, c.padB - 30], [40, y0 + 60, s.top + Q.rise - 20]), P, a));
        add('Pop-pin knobs', c.accent, hinge(cyl([-20, y0 + 30, s.top + Q.rise + 10], [20, y0 + 30, s.top + Q.rise + 10], 44, 20), P, a));
      }
      // PRIME arrow plate on the front leg and lime pop-pin knob.
      const j = along(s.joint, lay.v, -120);
      badge(STEEL('#e8e8e4', .5), 70, 46, [tw / 2 + 2, j[0], j[1]]);
      add('Pop-pin knobs', c.accent, cyl([tw / 2 + 60, lay.backPin(a)[0], lay.backPin(a)[1]], [tw / 2 + 110, lay.backPin(a)[0], lay.backPin(a)[1]], 30, 16));
      // Curved lower brace under the spine (the Shorty's signature bent tube), in two straight runs.
      const b0 = along(s.joint, lay.v, -150), b1: Pt = [s.rearY - 260, 90];
      c.F.push(tubeYZ(0, b0, [(b0[0] + b1[0]) / 2, 70], 44, 44), tubeYZ(0, [(b0[0] + b1[0]) / 2, 70], b1, 44, 44), tubeYZ(0, b1, [s.rearY, s.rubber + s.rearTube[0] / 2], 44, 44));
      break;
    }
    case 'major': {
      // MAJOR logo print on the back pad head end.
      add('Logo badges', STEEL('#8d939b', .7, 0), hinge(box([46, 58, .6], [0, lay.backEnd - 110, s.top - .1]), P, a));
      break;
    }
    case 'titan-fid': {
      // TITAN laser-cut side plates on the seat post.
      for (const x of [-1, 1]) c.F.push(plateYZ(x * (tw / 2 + 5), [[s.joint[0] - 40, s.joint[1] - 90], [s.joint[0] + 170, s.joint[1] + 20], [s.joint[0] + 170, s.joint[1] + 60], [s.joint[0] - 40, s.joint[1] + 60]], 6));
      for (const x of [-1, 1]) add('Logo badges', STEEL('#0c0d0e', .7), plateYZ(x * (tw / 2 + 8.5), [[s.joint[0] + 10, s.joint[1] + 10], [s.joint[0] + 150, s.joint[1] + 10], [s.joint[0] + 150, s.joint[1] + 40], [s.joint[0] + 10, s.joint[1] + 40]], 1));
      break;
    }
  }
}
