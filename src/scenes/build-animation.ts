import * as THREE from 'three';
type V3 = [number, number, number];
/** Structural fields only: unknown kinds (barbells, plates, wall panels…) fall into the dressing pass. */
export interface BuildPiece { id: string; part: string; kind: string; ownerId: string; position: readonly number[]; mount?: { face: string } | null }
export type BuildPass = 'structure' | 'accessory' | 'dressing';
export interface BuildCue { id: string; pass: BuildPass; start: number; duration: number; from: V3; heavy: boolean; glide: boolean }
export interface BuildPlan { cues: BuildCue[]; impacts: Float64Array; buildEnd: number; duration: number }
// Assembly-local (Z up, mm). Seconds throughout.
const INTRO = 0.6, GAP = 0.3, STAGGER = 0.05, FINALE = 3.5, MIN_TOTAL = 8, MAX_TOTAL = 15;
export const SETTLE = 0.2;
const normals: Record<string, V3> = { front: [0, -1, 0], back: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0] };
// Ranks: uprights, feet, other frame, pull-up bars, accessories, dressing.
const ranks = [
  { pass: 'structure', budget: 2, min: 0.25, max: 0.45, duration: 0.24, drop: 1500, heavy: true },
  { pass: 'structure', budget: 1, min: 0.08, max: 0.15, duration: 0.16, drop: 300, heavy: false },
  { pass: 'structure', budget: 2, min: 0.12, max: 0.3, duration: 0.2, drop: 550, heavy: true },
  { pass: 'structure', budget: 0.8, min: 0.15, max: 0.3, duration: 0.2, drop: 450, heavy: false },
  { pass: 'accessory', budget: 5, min: 0.1, max: 0.35, duration: 0.16, drop: 380, heavy: false },
  { pass: 'dressing', budget: 2.5, min: 0.15, max: 0.4, duration: 0.42, drop: 600, heavy: false },
] as const;
const rankOf = (p: BuildPiece) => p.part === 'upright' ? 0 : p.part.startsWith('foot') ? 1 : p.kind === 'structure' ? 2
  : p.part.startsWith('pullup') ? 3 : p.kind === 'accessory' ? 4 : 5;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Precomputed choreography: posts slam in one per beat, frame snaps between them, accessories staccato, dressing last. */
export function planBuild(pieces: readonly BuildPiece[]): BuildPlan {
  const posts = pieces.filter(p => p.part === 'upright'), kinds: string[] = [];
  const cx = posts.reduce((s, p) => s + p.position[0], 0) / (posts.length || 1), cy = posts.reduce((s, p) => s + p.position[1], 0) / (posts.length || 1);
  const beats = new Map<string, { rank: number; kind: number; z: number; index: number; pieces: BuildPiece[] }>();
  pieces.forEach((p, index) => {
    const rank = rankOf(p), key = `${rank}|${p.ownerId}`;
    if (rank === 5 && !kinds.includes(p.kind)) kinds.push(p.kind);
    const beat = beats.get(key);
    if (beat) beat.pieces.push(p);
    else beats.set(key, { rank, kind: rank === 5 ? kinds.indexOf(p.kind) : 0, z: rank === 2 ? p.position[2] : 0, index, pieces: [p] });
  });
  const ordered = [...beats.values()].sort((a, b) => a.rank - b.rank || a.kind - b.kind || a.z - b.z || a.index - b.index);
  const cues: BuildCue[] = [];
  let t = INTRO, previous: string | null = null;
  for (let r = 0; r < ranks.length; r++) {
    const group = ordered.filter(b => b.rank === r), spec = ranks[r];
    if (!group.length) continue;
    if (previous && previous !== spec.pass) t += GAP;
    previous = spec.pass;
    const spacing = clamp(spec.budget / group.length, spec.min, spec.max);
    group.forEach((beat, j) => beat.pieces.forEach((p, k) => {
      const n = normals[p.mount?.face ?? ''], glide = r === 5 && !p.mount && Math.abs(p.position[2]) < 1;
      let from: V3 = [0, 0, spec.drop];
      if (r === 4 && n) from = [n[0] * 160, n[1] * 160, spec.drop];
      if (glide) { const dx = p.position[0] - cx, dy = p.position[1] - cy, l = Math.hypot(dx, dy); from = l > 1 ? [dx / l * 700, dy / l * 700, 0] : [0, -700, 0]; }
      cues.push({ id: p.id, pass: spec.pass, start: t + j * spacing + k * STAGGER, duration: spec.duration, from, heavy: spec.heavy, glide });
    }));
    t += group.length * spacing;
  }
  // Huge racks compress their beats rather than overrunning the showcase length.
  const end = () => cues.reduce((m, c) => Math.max(m, c.start + c.duration + SETTLE), INTRO);
  const last = cues.reduce((m, c) => Math.max(m, c.start), INTRO), room = MAX_TOTAL - FINALE - INTRO - Math.max(...ranks.map(r => r.duration)) - SETTLE;
  if (end() + FINALE > MAX_TOTAL) for (const c of cues) c.start = INTRO + (c.start - INTRO) * room / (last - INTRO);
  const buildEnd = end();
  return { cues, buildEnd, duration: Math.max(MIN_TOTAL, buildEnd + FINALE),
    impacts: Float64Array.from(cues.filter(c => c.heavy).map(c => c.start + c.duration)).sort() };
}
const flashColor = new THREE.Color('#ffd79a');
const easeInOut = (s: number) => 0.5 - Math.cos(Math.PI * s) / 2, easeCubic = (s: number) => s < 0.5 ? 4 * s ** 3 : 1 - (-2 * s + 2) ** 3 / 2;
/**
 * Presentation-only transform layer over existing instance groups: every
 * piece's final pose, material emissive and the user's camera are captured
 * up front and restored exactly by finish(). update() does not allocate.
 */
export class BuildAnimation {
  readonly focus = new THREE.Vector3();
  private objects: THREE.Object3D[] = [];
  private cues: BuildCue[] = [];
  private finals: THREE.Vector3[] = [];
  private scales: THREE.Vector3[] = [];
  private visible: boolean[] = [];
  private materials: THREE.MeshStandardMaterial[][] = [];
  private emissive: THREE.Color[][] = [];
  private flash: Float32Array;
  private savedPosition: THREE.Vector3;
  private savedQuaternion: THREE.Quaternion;
  private end = new THREE.Spherical();
  private spherical = new THREE.Spherical();
  private offset = new THREE.Vector3();
  constructor(private plan: BuildPlan, groups: ReadonlyMap<string, THREE.Object3D>, private camera: THREE.Camera, private target: THREE.Vector3, private center: THREE.Vector3) {
    for (const cue of plan.cues) {
      const object = groups.get(cue.id);
      if (!object) continue;
      const materials: THREE.MeshStandardMaterial[] = [];
      object.traverse(o => { if (o instanceof THREE.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m instanceof THREE.MeshStandardMaterial && !materials.includes(m)) materials.push(m); });
      this.cues.push(cue); this.objects.push(object);
      this.finals.push(object.position.clone()); this.scales.push(object.scale.clone()); this.visible.push(object.visible);
      this.materials.push(materials); this.emissive.push(materials.map(m => m.emissive.clone()));
    }
    this.flash = new Float32Array(this.cues.length);
    this.savedPosition = camera.position.clone(); this.savedQuaternion = camera.quaternion.clone();
    this.end.setFromVector3(this.offset.subVectors(camera.position, target));
  }
  get duration() { return this.plan.duration; }
  /** Pose everything for `time` seconds in; false once the showcase is over. */
  update(time: number) {
    const t = Math.min(time, this.plan.duration);
    for (let i = 0; i < this.cues.length; i++) {
      const c = this.cues[i], o = this.objects[i], f = this.finals[i], s = this.scales[i], d = t - c.start;
      o.visible = d >= 0 && this.visible[i];
      const u = d / c.duration, v = (d - c.duration) / SETTLE;
      if (u < 1) {
        // Aggressive ease-in slam, or an ease-out glide for floor dressing.
        const k = u < 0 ? 1 : c.glide ? (1 - u) ** 3 : 1 - u ** 4;
        o.position.set(f.x + c.from[0] * k, f.y + c.from[1] * k, f.z + c.from[2] * k); o.scale.copy(s); this.setFlash(i, 0);
      } else if (v < 1 && !c.glide) {
        const squash = 0.045 * Math.exp(-4 * v) * Math.cos(3 * Math.PI * v);
        o.position.copy(f); o.scale.set(s.x * (1 + squash / 2), s.y * (1 + squash / 2), s.z * (1 - squash));
        this.setFlash(i, v < 0.3 ? 1 - v / 0.3 : 0);
      } else { o.position.copy(f); o.scale.copy(s); this.setFlash(i, 0); }
    }
    // One full orbit, rising low/close → the user's own view, which it lands on exactly.
    const p = t / this.plan.duration, rise = easeCubic(p), e = this.end;
    this.spherical.set(e.radius * (0.72 + 0.28 * rise), THREE.MathUtils.lerp(1.45, e.phi, rise), e.theta - 2 * Math.PI * (1 - easeInOut(p)));
    this.focus.lerpVectors(this.center, this.target, rise);
    this.camera.position.copy(this.focus).add(this.offset.setFromSpherical(this.spherical));
    let impact = -Infinity;
    for (let i = 0; i < this.plan.impacts.length && this.plan.impacts[i] <= t; i++) impact = this.plan.impacts[i];
    const since = t - impact;
    if (since < 0.3) this.camera.position.y += this.spherical.radius * 0.004 * Math.exp(-since * 18) * Math.sin(since * 70);
    this.camera.lookAt(this.focus);
    return time < this.plan.duration;
  }
  /** Snap to the finished rack and the user's camera. */
  finish() {
    for (let i = 0; i < this.cues.length; i++) {
      const o = this.objects[i];
      o.position.copy(this.finals[i]); o.scale.copy(this.scales[i]); o.visible = this.visible[i]; this.setFlash(i, 0);
    }
    this.camera.position.copy(this.savedPosition); this.camera.quaternion.copy(this.savedQuaternion);
  }
  private setFlash(i: number, k: number) {
    if (this.flash[i] === k) return;
    this.flash[i] = k;
    const materials = this.materials[i], originals = this.emissive[i];
    for (let j = 0; j < materials.length; j++) materials[j].emissive.copy(originals[j]).lerp(flashColor, k * 0.55);
  }
}
