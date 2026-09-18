/** Hang-part registry (#85): attachments persisted in doc.hangItems as children of a slotted wall item
 * ({panel, slot}), so they follow the panel. GLB yes, 3MF no.
 *
 * To add a hang part:
 *  1. rack-generator/hang-parts/<file>.ts — `export const MY_PART = defineHangPart({ id, name, title, noun, envelope, vendor })`.
 *     Metadata only (main bundle): never import Manifold builders here.
 *  2. rack-generator/parts/<file>.ts — builder with the carabiner anchor at the origin; `hook: 1` adds the panel peg.
 *     `export const definitions = [hangDefinition(MY_PART, build)]`.
 *  3. Register: add MY_PART to HANG_PARTS below, and spread its `definitions` into catalog.ts. */
import type { HangPart } from './hang-part.ts';
import { LAT_BAR, STRAIGHT_BAR, TRICEP_ROPE, D_HANDLES, TRIANGLE_ROW, PUSHDOWN_BAR, CURL_BAR, ANKLE_CUFF } from './hang-parts/cable-attachments.ts';
export * from './hang-part.ts';
export const HANG_PARTS = [LAT_BAR, STRAIGHT_BAR, TRICEP_ROPE, D_HANDLES, TRIANGLE_ROW, PUSHDOWN_BAR, CURL_BAR, ANKLE_CUFF] as const;
export type HangPartId = (typeof HANG_PARTS)[number]['id'];
export const HANG_PART_IDS: HangPartId[] = HANG_PARTS.map(p => p.id);
const registry = new Map<string, HangPart>(HANG_PARTS.map(p => [p.id, p]));
export const hangPart = (id: string) => registry.get(id);
export const isHangPart = (id: string | null | undefined): id is HangPartId => !!id && registry.has(id);
