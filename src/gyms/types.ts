import type { RackDoc } from "../../rack-generator/types.ts";

/**
 * A ready-made gym in the gallery (#184), recreated from a real Gym Radar gym.
 * Stored as `src/gyms/data/<slug>.json`; its preview render is `public/gyms/<slug>.webp`.
 */
export interface GymEntry {
  /** Matches the file name (and, for a Gym Radar gym, its URL slug). */
  slug: string;
  title: string;
  /** The owner's display name on the source. */
  owner: string;
  /** Where the real gym is shown: its Gym Radar page (`https://gymradar.com/gym/<slug>`) or another https page, such as a YouTube gym tour. */
  sourceUrl: string;
  summary: string;
  highlights: string[];
  /** What the owner has, as recreated; notes where a closest catalog match stands in. */
  equipment: string[];
  doc: RackDoc;
}

export const GYM_FIELDS = ["slug", "title", "owner", "sourceUrl", "summary", "highlights", "equipment", "doc"] as const;

/** The site a gym's `sourceUrl` points at, for its credit link ("on Gym Radar", "on YouTube"). */
export function sourceName(sourceUrl: string): string {
  const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
  if (host === "gymradar.com") return "Gym Radar";
  if (host === "youtube.com" || host === "youtu.be") return "YouTube";
  return host;
}

/** Public URL of a gym's rendered preview image. */
export const gymPreviewUrl = (slug: string) => `/gyms/${slug}.webp`;
