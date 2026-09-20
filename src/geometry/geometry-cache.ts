import type { ResolvedInstance } from '../../rack-generator/types.ts';

type KeyedEntry = Pick<ResolvedInstance, 'part' | 'logo' | 'params'>;
// Keys are recomputed several times per document change (pin, fetch, trim); logo loops can be large.
const entryKeys = new WeakMap<object, string>(), loopKeys = new WeakMap<object, string>();
const loopsKey = (loops: NonNullable<ResolvedInstance['logo']>['loops'] | undefined) => {
  if (!loops) return 'null';
  let key = loopKeys.get(loops);
  if (key === undefined) loopKeys.set(loops, key = JSON.stringify(loops));
  return key;
};
/** Resolved entries are treated as immutable: the key of one entry object is computed once. */
export const geometryKey = (entry: KeyedEntry) => {
  let key = entryKeys.get(entry);
  if (key === undefined) {
    const params = JSON.stringify(Object.fromEntries(Object.entries(entry.params).sort(([a], [b]) => a.localeCompare(b))));
    key = `[${JSON.stringify(entry.part)},${loopsKey(entry.logo?.loops)},${params}]`;
    entryKeys.set(entry, key);
  }
  return key;
};

/** Cached geometry owns its buffers; async batches and displayed clones borrow them. */
export class GeometryCache<T> {
  private values = new Map<string, Promise<T>>();
  private pins = new Map<string, number>();
  /** Values whose promise has resolved and is still cached: lets callers skip loading states for cached batches. */
  private settled = new Map<string, T>();
  constructor(private disposeValue: (value: T) => void, private limit = 32) {}

  get(key: string, create: () => Promise<T>) {
    let value = this.values.get(key);
    if (!value) {
      const created: Promise<T> = create().then(result => {
        if (this.values.get(key) === created) this.settled.set(key, result);
        return result;
      }, error => {
        if (this.values.get(key) === created) this.values.delete(key);
        throw error;
      });
      value = created;
    }
    this.values.delete(key);
    this.values.set(key, value);
    return value;
  }

  /** True when `key` is cached and already resolved. */
  isReady(key: string) {
    return this.settled.has(key);
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
      this.settled.delete(key);
      void value.then(this.disposeValue, () => {});
    }
  }

  dispose() {
    for (const value of this.values.values()) void value.then(this.disposeValue, () => {});
    this.values.clear();
    this.settled.clear();
    this.pins.clear();
  }
}
