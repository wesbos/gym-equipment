import { useRef, useSyncExternalStore } from 'react';
import type { BuilderSnapshot, BuilderStore } from './builder-store.ts';

/** Shallow equality for plain objects and arrays: same keys, `Object.is` values. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.hasOwn(b, k) && Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Structural equality for plain JSON-like data. Document edits structured-clone the whole doc, so slices such as
 * `doc.rack` or `doc.appearance` get a new identity on every commit even when their content is unchanged. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b || Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === (b as unknown[]).length && a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Subscribes to one slice of the builder snapshot: the component re-renders only when `isEqual` says the slice changed.
 * The selector may be an inline closure; its result is kept while it stays equal, so derived objects stay stable. */
export function useStoreSelector<T>(store: BuilderStore, selector: (state: BuilderSnapshot) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const cache = useRef<{ state: BuilderSnapshot; selector: (state: BuilderSnapshot) => T; value: T } | null>(null);
  const read = () => {
    const state = store.getSnapshot(), prev = cache.current;
    if (prev && prev.state === state && prev.selector === selector) return prev.value;
    const value = selector(state);
    if (prev && isEqual(prev.value, value)) { cache.current = { state, selector, value: prev.value }; return prev.value; }
    cache.current = { state, selector, value };
    return value;
  };
  return useSyncExternalStore(store.subscribe, read, read);
}
