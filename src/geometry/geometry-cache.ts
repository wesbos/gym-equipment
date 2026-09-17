import type { ResolvedInstance } from '../../rack-generator/types.ts';

export const geometryKey = (entry: Pick<ResolvedInstance, 'part' | 'logo' | 'params'>) => JSON.stringify([
  entry.part,
  entry.logo?.loops ?? null,
  Object.fromEntries(Object.entries(entry.params).sort(([a], [b]) => a.localeCompare(b))),
]);

/** Cached geometry owns its buffers; async batches and displayed clones borrow them. */
export class GeometryCache<T> {
  private values = new Map<string, Promise<T>>();
  private pins = new Map<string, number>();
  constructor(private disposeValue: (value: T) => void, private limit = 32) {}

  get(key: string, create: () => Promise<T>) {
    let value = this.values.get(key);
    if (!value) {
      const created = create().catch(error => {
        if (this.values.get(key) === created) this.values.delete(key);
        throw error;
      });
      value = created;
    }
    this.values.delete(key);
    this.values.set(key, value);
    return value;
  }

  pin(keys: Iterable<string>) {
    const unique = new Set(keys);
    for (const key of unique) this.pins.set(key, (this.pins.get(key) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const key of unique) {
        const remaining = (this.pins.get(key) ?? 1) - 1;
        if (remaining) this.pins.set(key, remaining);
        else this.pins.delete(key);
      }
    };
  }

  trim(active: Iterable<string> = []) {
    const protectedKeys = new Set(active);
    for (const [key, value] of this.values) {
      if (this.values.size <= this.limit) break;
      if (protectedKeys.has(key) || this.pins.has(key)) continue;
      this.values.delete(key);
      void value.then(this.disposeValue, () => {});
    }
  }

  dispose() {
    for (const value of this.values.values()) void value.then(this.disposeValue, () => {});
    this.values.clear();
    this.pins.clear();
  }
}
