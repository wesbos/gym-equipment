/** Touch input helpers for the builder canvas: tap / long-press classification and tolerant picking. */

/** A finger that travels less than this (CSS px) is still a tap or a long-press. */
export const TOUCH_SLOP = 10;
/** Longer presses are not taps (the long-press fires at LONG_PRESS_MS; this covers a slow lift). */
export const TAP_MAX_MS = 600;
export const LONG_PRESS_MS = 500;
/** Screen-space pick radius for fingers: roughly a fingertip's contact patch. */
export const TOUCH_PICK_RADIUS = 22;
/** Mount dots, hooks and cradles: how far (CSS px) a finger may land from a target and still choose it. */
export const TOUCH_TARGET_RADIUS = 44;

export interface TouchPoint { pointerId: number; clientX: number; clientY: number }

/**
 * Tracks the fingers on the canvas. A gesture is a tap only when exactly one finger touched, it stayed within
 * TOUCH_SLOP and lifted within TAP_MAX_MS; any second finger (pinch/pan) or travel (orbit) disqualifies it.
 */
export class TouchTracker {
  private fingers = new Map<number, [number, number]>();
  /** The gesture's first finger. */
  primary: { id: number; x: number; y: number; t: number } | null = null;
  multi = false;
  moved = false;
  get count() { return this.fingers.size; }
  down(event: TouchPoint, now: number) {
    if (!this.fingers.size) { this.primary = { id: event.pointerId, x: event.clientX, y: event.clientY, t: now }; this.multi = false; this.moved = false; }
    else this.multi = true;
    this.fingers.set(event.pointerId, [event.clientX, event.clientY]);
    return this.fingers.size;
  }
  /** True when this move took the primary finger past the slop for the first time. */
  move(event: TouchPoint) {
    if (!this.fingers.has(event.pointerId)) return false;
    this.fingers.set(event.pointerId, [event.clientX, event.clientY]);
    const p = this.primary;
    if (!p || p.id !== event.pointerId || this.moved) return false;
    this.moved = Math.hypot(event.clientX - p.x, event.clientY - p.y) > TOUCH_SLOP;
    return this.moved;
  }
  /** Lift a finger; `tap` is set on the primary finger's lift when the whole gesture was a tap. */
  up(event: TouchPoint, now: number) {
    const known = this.fingers.delete(event.pointerId), p = this.primary;
    const primary = !!p && p.id === event.pointerId;
    const tap = known && primary && !this.multi && !this.moved && now - p!.t <= TAP_MAX_MS
      && Math.hypot(event.clientX - p!.x, event.clientY - p!.y) <= TOUCH_SLOP;
    if (!this.fingers.size) this.primary = null;
    return { tap, primary, remaining: this.fingers.size };
  }
  reset() { this.fingers.clear(); this.primary = null; this.multi = false; this.moved = false; }
}

/** Screen offsets probed around a finger: the centre, then two rings (8 and 16 directions). */
export function pickOffsets(radius = TOUCH_PICK_RADIUS): [number, number, number][] {
  const out: [number, number, number][] = [[0, 0, 0]];
  for (const [r, n] of [[radius / 2, 8], [radius, 16]] as const)
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push([Math.cos(a) * r, Math.sin(a) * r, r]); }
  return out;
}

/** Lower wins: distance from the finger (px) plus a penalty that grows with on-screen size (capped at 200 px). */
export const pickScore = (distance: number, screenSize: number) => distance + 0.15 * Math.min(screenSize, 200);

/** Parts smaller than a fingertip on screen (CSS px) may win a tap that lands just beside them. */
export const SMALL_PART_PX = 48;

/**
 * Choose among the parts found around a finger (`distance` 0 is the part under the centre). The centre part wins
 * unless a part smaller than a fingertip (a J-hook, pin or collar) sits within the radius: fingers cover small
 * parts entirely, so they get priority over the large upright behind them. With nothing under the centre, the
 * nearest part wins, small ones first.
 */
export function choosePick<T>(hits: readonly { item: T; distance: number; screenSize: number }[]): T | null {
  let best: T | null = null, score = Infinity;
  const centre = hits.some(hit => hit.distance === 0);
  for (const hit of hits) {
    if (centre && hit.distance > 0 && hit.screenSize >= SMALL_PART_PX) continue;
    const s = pickScore(hit.distance, hit.screenSize);
    if (s < score) { score = s; best = hit.item; }
  }
  return best;
}
