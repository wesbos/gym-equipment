/** Outliner model (#206): the resolved scene as a tree — Rack (uprights, crossmembers, attachments), Systems, Floor,
 * Walls (hang items nested under their pegboard), Room decor, Plates — plus the flattening, windowing and selection-order helpers
 * the virtualised tree renders. Pure and unit tested (src/components/outliner.test.ts). */
import type { RackDoc, ResolvedInstance } from '../../../rack-generator/types.ts';
import { isSystemPart } from '../../../rack-generator/system-types.ts';
import { plateTotalLabel, type PlateId } from '../../../rack-generator/plates.ts';
import { floorPart } from '../../../rack-generator/floor-registry.ts';
import { wallPart } from '../../../rack-generator/wall-registry.ts';

export interface OutlineNode {
  /** Unique tree key: `group:rack`, `group:rack:uprights`, or the physical instance id for parts. */
  key: string;
  label: string;
  detail?: string;
  /** Physical instance id (selectable part rows only). */
  id?: string;
  part?: string;
  children: OutlineNode[];
}
export type NameOf = (part: string, instance: ResolvedInstance) => string;

const words = (id: string) => id.replaceAll('-', ' ');
/** Row detail: where the part sits (paired side, structure position, wall), so four identical pins are told apart. */
function detailOf(instance: ResolvedInstance, doc: RackDoc) {
  if (instance.kind === 'structure') return words(instance.id);
  const side = /:(left|right)$/.exec(instance.id)?.[1];
  if (side) return side;
  if (instance.kind === 'wall-item') { const wall = doc.wallItems?.find(w => w.id === instance.id)?.wall; return wall ? `${wall} wall` : ''; }
  return '';
}
const group = (key: string, label: string, children: OutlineNode[]): OutlineNode => ({ key: `group:${key}`, label, children });
/** Rows with the same name and detail in one group get "#2", "#3" so they read apart. */
function numberDuplicates(nodes: OutlineNode[]) {
  const seen = new Map<string, number>(), total = new Map<string, number>();
  for (const n of nodes) if (n.id) total.set(`${n.label}|${n.detail}`, (total.get(`${n.label}|${n.detail}`) ?? 0) + 1);
  for (const n of nodes) {
    if (!n.id) continue;
    const k = `${n.label}|${n.detail}`;
    if ((total.get(k) ?? 0) < 2) continue;
    const i = (seen.get(k) ?? 0) + 1; seen.set(k, i);
    n.detail = n.detail ? `${n.detail} · #${i}` : `#${i}`;
  }
  return nodes;
}

/** Scene tree in fixed group order; empty groups are dropped. Every resolved instance appears exactly once in the
 * part groups; the Plates group then lists each loaded storage pin and bar again, by its plate total (`plates:` keys),
 * so "where are my plates" is one glance and a click selects the holder (whose inspector edits the stack). */
export function buildOutline(resolved: readonly ResolvedInstance[], doc: RackDoc, nameOf: NameOf): OutlineNode[] {
  const leaf = (r: ResolvedInstance): OutlineNode => ({ key: r.id, id: r.id, part: r.part, label: nameOf(r.part, r), detail: detailOf(r, doc), children: [] });
  const uprights: OutlineNode[] = [], crossmembers: OutlineNode[] = [], attachments: OutlineNode[] = [], systems: OutlineNode[] = [];
  const floor: OutlineNode[] = [], plates: OutlineNode[] = [], walls: OutlineNode[] = [], decor: OutlineNode[] = [], byId = new Map<string, OutlineNode>();
  // Room decor (#201: windows, doors, lights, fans, furniture) gets its own group, so equipment lists stay equipment.
  const isDecor = (r: ResolvedInstance) => (r.kind === 'floor-item' ? floorPart(r.part)?.section : wallPart(r.part)?.section)?.endsWith(' decor') ?? false;
  const hangPanel = new Map((doc.hangItems ?? []).map(h => [h.id, h.panel]));
  const panels = new Map<string, OutlineNode>(), hung: [string, OutlineNode][] = [];
  for (const r of resolved) {
    const node = leaf(r);
    byId.set(r.id, node);
    if (r.kind === 'structure') (r.part === 'upright' ? uprights : crossmembers).push(node);
    else if (r.kind === 'accessory') (isSystemPart(r.part) ? systems : attachments).push(node);
    else if (isDecor(r) && !hangPanel.has(r.id)) decor.push(node);
    else if (r.kind === 'floor-item') floor.push(node);
    else if (hangPanel.has(r.id)) hung.push([hangPanel.get(r.id)!, node]);
    else { walls.push(node); panels.set(r.id, node); }
  }
  // Hang items nest under their pegboard; one whose panel is gone (mid-edit) stays visible at the wall level.
  for (const [panel, node] of hung) (panels.get(panel)?.children ?? walls).push(node);
  for (const panel of panels.values()) numberDuplicates(panel.children);
  const rack = [group('rack:uprights', 'Uprights', numberDuplicates(uprights)), group('rack:crossmembers', 'Crossmembers', numberDuplicates(crossmembers)),
    group('rack:attachments', 'Attachments', numberDuplicates(attachments))].filter(g => g.children.length);
  numberDuplicates(systems); numberDuplicates(floor); numberDuplicates(walls); numberDuplicates(decor);
  const loaded = (id: string, stack: readonly PlateId[]) => {
    const holder = byId.get(id);
    if (!holder || !stack.length) return;
    plates.push({ key: `plates:${id}`, id, part: holder.part, label: plateTotalLabel(stack), detail: `on ${holder.label}${holder.detail ? ` · ${holder.detail}` : ''}`, children: [] });
  };
  for (const a of doc.accessories) if (a.plates?.length) for (const r of resolved) if (r.ownerId === a.id) loaded(r.id, a.plates);
  for (const f of doc.floorItems ?? []) if (f.plates) loaded(f.id, 'both' in f.plates ? [...f.plates.both, ...f.plates.both] : [...f.plates.right, ...f.plates.left]);
  return [group('rack', 'Rack', rack), group('systems', 'Systems', systems), group('floor', 'Floor', floor),
    group('walls', 'Walls', walls), group('decor', 'Room decor', decor), group('plates', 'Plates', plates)].filter(g => g.children.length);
}
/** Physical ids under a node (itself included), in tree order. */
export function descendantIds(node: OutlineNode): string[] {
  const out: string[] = [];
  const walk = (n: OutlineNode) => { if (n.id) out.push(n.id); n.children.forEach(walk); };
  walk(node);
  return out;
}
/** Change detector: the outline only re-renders when names, ids or nesting change, never when parts just move. */
export function outlineSignature(nodes: readonly OutlineNode[]): string {
  const parts: string[] = [];
  const walk = (n: OutlineNode, depth: number) => { parts.push(`${depth}\u0001${n.key}\u0001${n.label}\u0001${n.detail ?? ''}`); n.children.forEach(c => walk(c, depth + 1)); };
  nodes.forEach(n => walk(n, 0));
  return parts.join('\u0002');
}

export interface OutlineRow { node: OutlineNode; depth: number; expandable: boolean; expanded: boolean; parent: string | null; posinset: number; setsize: number }
/** Rows in display order; nodes with children are expanded unless their key is in `collapsed`. */
export function flattenOutline(nodes: readonly OutlineNode[], collapsed: ReadonlySet<string>): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const walk = (list: readonly OutlineNode[], depth: number, parent: string | null) => list.forEach((node, i) => {
    const expandable = node.children.length > 0, expanded = expandable && !collapsed.has(node.key);
    rows.push({ node, depth, expandable, expanded, parent, posinset: i + 1, setsize: list.length });
    if (expanded) walk(node.children, depth + 1, node.key);
  });
  walk(nodes, 0, null);
  return rows;
}
/** Visible part ids in row order (each once): the order shift-click ranges select along. */
export const rowOrder = (rows: readonly OutlineRow[]) => [...new Set(rows.flatMap(r => r.node.id ? [r.node.id] : []))];
/** Row index window for a fixed row height, with overscan. */
export function windowRows(count: number, rowHeight: number, scrollTop: number, viewport: number, overscan = 6): [number, number] {
  if (!count) return [0, -1];
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(count - 1, Math.ceil((scrollTop + viewport) / rowHeight) + overscan);
  return [first, last];
}
/** Tree keys: ↑/↓ move, → expands (or enters), ← collapses (or goes to the parent), Home/End. The next active row
 * index and, for →/←, the key to expand or collapse. Null for keys the tree does not handle. */
export function treeKey(rows: readonly OutlineRow[], index: number, key: string): { index: number; toggle?: string } | null {
  const row = rows[index];
  if (!rows.length) return null;
  if (key === 'ArrowDown') return { index: Math.min(rows.length - 1, index + 1) };
  if (key === 'ArrowUp') return { index: Math.max(0, index - 1) };
  if (key === 'Home') return { index: 0 };
  if (key === 'End') return { index: rows.length - 1 };
  if (!row) return null;
  if (key === 'ArrowRight') return row.expandable && !row.expanded ? { index, toggle: row.node.key } : row.expanded ? { index: index + 1 } : { index };
  if (key === 'ArrowLeft') {
    if (row.expanded) return { index, toggle: row.node.key };
    const parent = rows.findIndex(r => r.node.key === row.parent);
    return { index: parent >= 0 ? parent : index };
  }
  return null;
}
/** Nodes whose label or detail contains every word of `query` (with their ancestors, so matches keep their place). */
export function filterOutline(nodes: readonly OutlineNode[], query: string): OutlineNode[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [...nodes];
  const hit = (n: OutlineNode) => { const text = `${n.label} ${n.detail ?? ''} ${n.part ?? ''}`.toLowerCase(); return tokens.every(t => text.includes(t)); };
  const prune = (list: readonly OutlineNode[]): OutlineNode[] => list.flatMap(n => {
    if (n.id && hit(n)) return [n];
    const children = prune(n.children);
    return children.length ? [{ ...n, children }] : [];
  });
  return prune(nodes);
}
/** Group rows' hidden/locked summary: every descendant part hidden (or locked). */
export const allIn = (ids: readonly string[], set: ReadonlySet<string>) => ids.length > 0 && ids.every(id => set.has(id));
