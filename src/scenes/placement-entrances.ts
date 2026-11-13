import * as THREE from 'three';

type EntranceKind = 'equipment' | 'banner' | 'turf' | 'plate';

interface Entrance {
  objects: THREE.Object3D[];
  kind: EntranceKind;
  start: number;
  travel: number;
  side: number;
  landed: boolean;
}

/** Recording-mode transforms. The authored poses are restored before picking, framing or exporting. */
export class PlacementEntrances {
  private cues: Entrance[] = [];
  private delta = new THREE.Matrix4();
  private tilt = new THREE.Matrix4();

  constructor(private impact: (kind: EntranceKind, side: number) => void) {}

  private add(objects: THREE.Object3D[], kind: EntranceKind, travel: number, delay = 0, side = 0) {
    this.cues.push({ objects, kind, travel, side, start: performance.now() + delay, landed: false });
  }

  turf(group: THREE.Group) {
    this.add([group], 'turf', 820);
  }

  parts(before: Map<string, THREE.Group>, after: Map<string, THREE.Group>) {
    for (const [id, group] of after) {
      const previous = before.get(id);
      if (!previous) {
        this.add([group], id.startsWith('wall-') ? 'banner' : 'equipment', 560);
        continue;
      }
      if (group === previous) continue;
      // A model rebuild replaces the entire bar. Keep existing plates still and move each new rim, hub and face together.
      const existing = new Set(previous.children.map(mesh => mesh.name));
      const plates = new Map<string, { meshes: THREE.Object3D[]; index: number; side: number }>();
      for (const mesh of group.children) {
        const match = /^plate-([RL])-(\d+) /.exec(mesh.name);
        if (!match || existing.has(mesh.name)) continue;
        const key = match[0];
        const plate = plates.get(key) ?? { meshes: [], index: Number(match[2]), side: match[1] === 'R' ? 1 : -1 };
        plate.meshes.push(mesh);
        plates.set(key, plate);
      }
      const ordered = [...plates.values()].sort((a, b) => a.index - b.index || b.side - a.side);
      ordered.forEach((plate, i) => this.add(plate.meshes, 'plate', 370, i * 200, plate.side));
    }
  }

  draw(drawScene: () => void, shadowsDirty: () => void): boolean {
    if (!this.cues.length) { drawScene(); return false; }
    const now = performance.now();
    const restore: { object: THREE.Object3D; matrix: THREE.Matrix4; auto: boolean; visible: boolean }[] = [];
    // The falling body accelerates into contact, rebounds once and settles. Turf touches down edge-first.
    for (const cue of this.cues) {
      const elapsed = now - cue.start, sinceImpact = elapsed - cue.travel;
      if (sinceImpact >= 0 && !cue.landed) { cue.landed = true; this.impact(cue.kind, cue.side); }
      if (sinceImpact >= 320) continue;
      const t = THREE.MathUtils.clamp(elapsed / cue.travel, 0, 1);
      const remaining = 1 - t * t * t;
      const settle = THREE.MathUtils.clamp(sinceImpact / 320, 0, 1);
      const bounce = Math.sin(Math.PI * settle) * (1 - settle) ** 2;
      if (cue.kind === 'plate') {
        this.delta.makeTranslation(cue.side * (640 * remaining + 38 * bounce), 0, 0);
      } else if (cue.kind === 'turf') {
        this.delta.makeTranslation(0, 2800 * remaining + 110 * bounce, 0);
        this.delta.multiply(this.tilt.makeRotationX(-0.23 * remaining + 0.021 * bounce));
      } else {
        const wall = cue.kind === 'banner';
        this.delta.makeTranslation(0, 0, (wall ? 850 : 1750) * remaining + (wall ? 20 : 90) * bounce);
        this.delta.multiply(this.tilt.makeRotationY((wall ? 0.075 : -0.038) * remaining));
      }
      for (const object of cue.objects) {
        if (object.matrixAutoUpdate) object.updateMatrix();
        restore.push({ object, matrix: object.matrix.clone(), auto: object.matrixAutoUpdate, visible: object.visible });
        object.matrixAutoUpdate = false;
        // Equipment pivots at its own foot. Plate geometry is authored in the bar's sleeve coordinate system.
        object.matrix.multiply(this.delta);
        object.matrixWorldNeedsUpdate = true;
        if (elapsed < 0) object.visible = false;
      }
    }
    this.cues = this.cues.filter(cue => now < cue.start + cue.travel + 320);
    shadowsDirty();
    try { drawScene(); }
    finally {
      for (const { object, matrix, auto, visible } of restore) {
        object.matrix.copy(matrix);
        object.matrixAutoUpdate = auto;
        object.visible = visible;
        object.matrixWorldNeedsUpdate = true;
        object.updateWorldMatrix(true, true);
      }
    }
    return this.cues.length > 0;
  }
}
