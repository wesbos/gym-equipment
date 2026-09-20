/** Catalog sections: the sidebar headings and library categories that floor, wall and hang parts file under.
 * Order here is sidebar order. A part picks one with `section` in its define*Part spec; the part's
 * PartDefinition.category is its section, so the library groups the same way. */
export const FLOOR_SECTIONS = ['Benches', 'Barbells', 'Dumbbells', 'Kettlebells', 'Plates', 'Machines', 'Cardio', 'Strongman', 'Floor storage', 'Accessories', 'Room decor'] as const;
export const WALL_SECTIONS = ['Wall storage', 'Wall decor'] as const;
export const HANG_SECTIONS = ['Cable attachments', 'Hanging accessories'] as const;
/** Brand attachments that mount on the rack itself (rack-registry.ts, #131). */
export const RACK_SECTIONS = ['J-cups & safeties', 'Rollers & pads', 'Dips & landmines', 'Levers & belt squat', 'Band pegs & grip', 'Digital & cable'] as const;
export type FloorSection = (typeof FLOOR_SECTIONS)[number];
export type WallSection = (typeof WALL_SECTIONS)[number];
export type HangSection = (typeof HANG_SECTIONS)[number];
export type RackSection = (typeof RACK_SECTIONS)[number];
/** Fallbacks for parts that do not name a section. */
export const DEFAULT_FLOOR_SECTION = 'Floor items', DEFAULT_WALL_SECTION: WallSection = 'Wall storage', DEFAULT_HANG_SECTION: HangSection = 'Cable attachments', DEFAULT_RACK_SECTION = 'Rack attachments';
/** Registry entries grouped by section in the given order, plus a trailing fallback group; empty sections are dropped. */
export function sectionGroups<Id extends string>(parts: readonly { id: Id; section?: string }[], order: readonly string[], fallback: string): [string, Id[]][] {
  const labels = [...order, ...(order.includes(fallback) ? [] : [fallback])];
  return labels.map(label => [label, parts.filter(p => (p.section ?? fallback) === label).map(p => p.id)] as [string, Id[]]).filter(([, ids]) => ids.length);
}
