import { connectUprights, extendUpright, type Direction } from './graph-edits.ts';
import { replaceStructurePart, resolveAssembly } from './assembly.ts';
import type { RackDoc, PartId, ResolvedInstance, Vec3 } from './types.ts';

export interface StructureCandidate {
  key: string; anchorId: string; ownerId: string; label: string;
  position: Vec3; doc: RackDoc; entries: ResolvedInstance[];
}
export const addsStructure = (part: PartId | null) => part === 'upright' || !!part?.startsWith('crossmember-');
/** Derived proposals only: the graph operations remain the sole topology authority. */
export function structureCandidates(doc: RackDoc, part: PartId): StructureCandidate[] {
  if (!addsStructure(part)) return [];
  const posts = Object.entries(doc.uprights).filter(([id]) => !doc.removed.includes(id));
  const base = new Set(resolveAssembly(doc).map(r => r.id));
  const result: StructureCandidate[] = [];
  function offer(key: string, anchorId: string, label: string, position: Vec3, build: () => RackDoc) {
    try {
      const next = build(), entries = resolveAssembly(next).filter(r => !base.has(r.id));
      if (entries.length) result.push({ key, anchorId, label, position, doc: next, entries, ownerId: entries.find(r => r.part === part)?.ownerId || entries[0].ownerId || entries[0].id });
    } catch { /* Invalid cells are never offered. */ }
  }
  if (part === 'upright') {
    for (const [id, p] of posts) for (const [direction, dx, dy] of [ ['left', -1, 0], ['right', 1, 0], ['front', 0, -1], ['rear', 0, 1] ] as const) {
      // Only outside faces: do not extend through a post already on this ray.
      if (posts.some(([other,q]) => other !== id && (dx ? q.y === p.y && (q.x-p.x)*dx > 0 : q.x === p.x && (q.y-p.y)*dy > 0))) continue;
      offer(`${id}:${direction}`, id, `+ Upright ${direction}`, [p.x + dx*160, p.y + dy*160, doc.rack.height*0.55], () => extendUpright(doc, id, direction as Direction, doc.rack.depth));
    }
  } else {
    for (let i=0; i<posts.length; i++) for (const [to,b] of posts.slice(i+1)) {
      const [from,a] = posts[i];
      if (a.x !== b.x && a.y !== b.y) continue;
      if (posts.some(([id,p]) => id !== from && id !== to && (a.x === b.x ? p.x === a.x && p.y > Math.min(a.y,b.y) && p.y < Math.max(a.y,b.y) : p.y === a.y && p.x > Math.min(a.x,b.x) && p.x < Math.max(a.x,b.x)))) continue;
      for (const level of ['upper','lower'] as const) offer(`${from}:${to}:${level}`, from, `+ Crossmember ${level}`, [(a.x+b.x)/2, (a.y+b.y)/2, level === 'upper' ? doc.rack.height-100 : 100], () => {
        const next = connectUprights(doc, from, to, level);
        return replaceStructurePart(next, next.connections.at(-1)!.id, part);
      });
    }
  }
  return result;
}
