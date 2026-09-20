import * as THREE from 'three';
import { resolveMaterial, type Appearance, type MaterialSource } from '../../rack-generator/appearance.ts';
import type { ResolvedInstance } from '../../rack-generator/types.ts';

/** One displayed instance: its group (per-instance materials, shared cached geometry) and what it was built from. */
interface InstanceRecord { group: THREE.Group; model: THREE.Group; look: string }

/** The resolved material of every mesh: equal looks give identical `cloneInstanceMaterials` output. */
export function instanceLook(model: THREE.Group, appearance: Appearance | undefined, instanceId: string) {
  let look = '';
  model.traverse(object => {
    if (object instanceof THREE.Mesh) look += JSON.stringify(resolveMaterial(object.userData.materialSource as MaterialSource, appearance, instanceId)) + '|';
  });
  return look;
}

export function placeInstance(group: THREE.Object3D, entry: ResolvedInstance, attribution?: unknown) {
  group.position.set(...entry.position);
  group.rotation.set(...entry.rotation);
  group.userData = { id: entry.id, ownerId: entry.ownerId || entry.id, ...(attribution ? { vendorAttribution: attribution } : {}) };
}

/**
 * Keyed document -> scene reconciliation (#perf). An instance whose cached model (part + params + logo) and resolved
 * materials are unchanged keeps its group, meshes and materials and only moves; new or changed ones are built with
 * `build`, and instances that disappeared are disposed. The root keeps the resolved order.
 */
export class InstanceSync {
  private records = new Map<string, InstanceRecord>();
  constructor(
    private root: THREE.Object3D,
    /** Id -> displayed group, shared with selection, picking and the build animation. */
    readonly instances: Map<string, THREE.Group>,
    private build: (model: THREE.Group, entry: ResolvedInstance) => THREE.Group,
    private disposeGroup: (group: THREE.Group) => void,
  ) {}

  /** Returns how many instances were (re)built. */
  sync(entries: readonly ResolvedInstance[], models: readonly THREE.Group[], appearance: Appearance | undefined, attribution: (part: string) => unknown) {
    const next = new Map<string, InstanceRecord>(), children: THREE.Group[] = [], stale = new Set<THREE.Object3D>();
    let built = 0;
    for (const [i, entry] of entries.entries()) {
      const model = models[i], look = instanceLook(model, appearance, entry.id), previous = this.records.get(entry.id);
      let record: InstanceRecord;
      if (previous && !next.has(entry.id) && previous.model === model && previous.look === look) {
        record = previous;
        placeInstance(record.group, entry, attribution(entry.part));
      } else {
        record = { group: this.build(model, entry), model, look };
        built++;
      }
      // A duplicate id keeps the last group in the id map, as the full rebuild did.
      next.set(entry.id, record);
      children.push(record.group);
    }
    const kept = new Set(children);
    for (const record of this.records.values()) if (!kept.has(record.group)) stale.add(record.group);
    for (const child of this.root.children) if (!kept.has(child as THREE.Group)) stale.add(child);
    for (const group of stale) this.disposeGroup(group as THREE.Group);
    const current = this.root.children;
    if (current.length !== children.length || children.some((g, i) => current[i] !== g)) {
      this.root.clear();
      for (const g of children) this.root.add(g);
    }
    this.records = next;
    this.instances.clear();
    for (const g of children) this.instances.set(String(g.userData.id), g);
    return built;
  }

  clear() {
    for (const child of [...this.root.children]) this.disposeGroup(child as THREE.Group);
    this.root.clear();
    this.records.clear();
    this.instances.clear();
  }
}
