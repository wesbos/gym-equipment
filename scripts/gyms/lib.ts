/** Shared helpers for the gym gallery generators (#184): `npx tsx scripts/gyms/<slug>.ts` rebuilds
 * `src/gyms/data/<slug>.json` from the real builder APIs, then `npx tsx scripts/render-gym-previews.ts <slug>`
 * renders its preview. Generators build the RackDoc with presets, addAccessory, addFloorItem, addWallItem,
 * placeHang and friends; `writeGym` normalises it exactly as the builder does on open and refuses anything the
 * gallery test would reject. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cleanDocument } from '../../src/state/history.ts';
import { definitions } from '../../rack-generator/catalog.ts';
import { resolveAssembly } from '../../rack-generator/assembly.ts';
import { detectCollisions } from '../../rack-generator/assembly-collisions.ts';
import { floorWarnings } from '../../rack-generator/floor-items.ts';
import { wallWarnings } from '../../rack-generator/wall-items.ts';
import { hangWarnings } from '../../rack-generator/hang-items.ts';
import type { GymEntry } from '../../src/gyms/types.ts';
import type { RackDoc } from '../../rack-generator/types.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const partIds = new Set(definitions.map(d => d.id));

/** Builder warnings (collisions, floor/wall overlaps, hooks) for a document; generators print these. */
export function gymWarnings(doc: RackDoc): string[] {
  return [
    ...detectCollisions(resolveAssembly(doc)).map(w => w.message),
    ...floorWarnings(doc).map(w => w.message),
    ...wallWarnings(doc).map(w => w.message),
    ...hangWarnings(doc).map(w => w.message),
  ];
}

export function writeGym(entry: GymEntry): GymEntry {
  const doc = cleanDocument(entry.doc);
  const used = [
    ...Object.values(doc.structure).map(v => v.part),
    ...doc.accessories.map(a => a.part),
    ...(doc.floorItems ?? []).map(f => f.part),
    ...(doc.wallItems ?? []).map(w => w.part),
    ...(doc.hangItems ?? []).map(h => h.part),
  ];
  const missing = used.filter(p => !partIds.has(p));
  if (missing.length) throw Error(`${entry.slug}: not catalog parts: ${[...new Set(missing)].join(', ')}`);
  for (const key of ['accessories', 'floorItems', 'wallItems', 'hangItems'] as const)
    if ((doc[key]?.length ?? 0) !== (entry.doc[key]?.length ?? 0)) throw Error(`${entry.slug}: validation dropped ${key}`);
  const out: GymEntry = { slug: entry.slug, title: entry.title, owner: entry.owner, sourceUrl: entry.sourceUrl, summary: entry.summary, highlights: entry.highlights, equipment: entry.equipment, doc };
  const file = `${root}src/gyms/data/${entry.slug}.json`;
  writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
  const warnings = gymWarnings(doc);
  console.log(`${entry.slug}: ${resolveAssembly(doc).length} rack pieces, ${doc.floorItems?.length ?? 0} floor, ${doc.wallItems?.length ?? 0} wall, ${doc.hangItems?.length ?? 0} hung → ${file}`);
  for (const warning of warnings) console.warn(`  warning: ${warning}`);
  return out;
}
