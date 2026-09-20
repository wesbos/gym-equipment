import type { GymEntry } from "./types.ts";

/**
 * Every `data/<slug>.json` becomes its own lazily loaded chunk; nothing is fetched until a page asks.
 * Adding a gym is only a matter of dropping its JSON (and preview image) in place.
 */
const modules = import.meta.glob<GymEntry>("./data/*.json", { import: "default" });
const slugOf = (path: string) => path.replace(/^.*\/([^/]+)\.json$/, "$1");
const loaders = new Map(Object.entries(modules).map(([path, load]) => [slugOf(path), load]));

export const GYM_SLUGS: readonly string[] = [...loaders.keys()].sort();

export async function loadGym(slug: string): Promise<GymEntry | null> {
  const load = loaders.get(slug);
  return load ? load() : null;
}

/** All gyms, in slug order. */
export async function loadGyms(): Promise<GymEntry[]> {
  const gyms = await Promise.all(GYM_SLUGS.map(loadGym));
  return gyms.filter((gym): gym is GymEntry => !!gym);
}
