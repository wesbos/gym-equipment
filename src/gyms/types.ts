import type { RackDoc } from "../../rack-generator/types.ts";

/**
 * A ready-made gym in the gallery (#184), recreated from a real Gym Radar gym.
 * Stored as `src/gyms/data/<slug>.json`; its preview render is `public/gyms/<slug>.webp`.
 */
export interface GymEntry {
  /** Matches the file name and the Gym Radar URL slug. */
  slug: string;
  title: string;
  /** Gym Radar display name of the owner. */
  owner: string;
  /** The gym's Gym Radar page. */
  sourceUrl: string;
  summary: string;
  highlights: string[];
  /** What the owner has, as recreated; notes where a closest catalog match stands in. */
  equipment: string[];
  doc: RackDoc;
}

export const GYM_FIELDS = ["slug", "title", "owner", "sourceUrl", "summary", "highlights", "equipment", "doc"] as const;

/** Public URL of a gym's rendered preview image. */
export const gymPreviewUrl = (slug: string) => `/gyms/${slug}.webp`;
