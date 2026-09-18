import type { RackDoc, UprightNode } from './types.ts';

const close = (a: number, b: number) => Math.abs(a - b) < 0.05;
type Row = [string, UprightNode][];

function layout(rows: Row[], tube: number) {
  const first = rows[0], last = rows.at(-1)!;
  return {
    rows, ids: rows.flatMap(row => row.map(([id]) => id)),
    width: first[1][1].x - first[0][1].x,
    mainDepth: rows[1][0][1].y - first[0][1].y - tube,
    rearDepth: rows.length === 3 ? last[0][1].y - rows[1][0][1].y - tube : 0,
    depth: last[0][1].y - first[0][1].y,
    origin: [(first[0][1].x + first[1][1].x) / 2, first[0][1].y, 0] as [number, number, number],
  };
}
export type SystemLayout = ReturnType<typeof layout>;

/** Bay anchors are ordered front-to-back, left-to-right; never reselect on removal. */
export function anchoredLayout(doc: RackDoc, anchor: unknown): SystemLayout {
  if (!Array.isArray(anchor) || ![4, 6].includes(anchor.length) ||
      anchor.some(id => typeof id !== 'string') || new Set(anchor).size !== anchor.length)
    throw Error('System bay must contain four or six distinct upright IDs in front-to-back, left-to-right order.');
  for (const id of anchor) if (!Object.hasOwn(doc.uprights, id) || doc.removed.includes(id))
    throw Error(`System bay requires upright ${id}. Restore that support or remove and reinstall the system in another bay.`);
  const rows: Row[] = [];
  for (let i = 0; i < anchor.length; i += 2)
    rows.push(anchor.slice(i, i + 2).map(id => [id, doc.uprights[id]]));
  if (!rows.every((r, i) => close(r[0][1].y, r[1][1].y) &&
      r[0][1].x < r[1][1].x && close(r[0][1].x, rows[0][0][1].x) &&
      close(r[1][1].x, rows[0][1][1].x) && (!i || r[0][1].y > rows[i - 1][0][1].y)))
    throw Error('System bay upright columns must align; restore the selected posts to two aligned columns.');
  return layout(rows, doc.rack.tube);
}

/** Discover connected rectangles, independent of names, insertion order and rack metadata.
 * Prefer complete six-post runs; their four-post subsets must not bypass rear-bay rules.
 */
export function candidateLayouts(doc: RackDoc): SystemLayout[] {
  const nodes = Object.entries(doc.uprights).filter(([id]) => !doc.removed.includes(id))
    .sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x || a[0].localeCompare(b[0]));
  const rows: Row[] = [];
  for (const a of nodes) for (const b of nodes)
    if (a[1].x < b[1].x && close(a[1].y, b[1].y)) rows.push([a, b]);
  const linked = (a: Row, b: Row) => a[0][1].y < b[0][1].y &&
    a.every((n, side) => close(n[1].x, b[side][1].x)) &&
    doc.connections.some(e => !doc.removed.includes(e.id) && a.some((n, side) =>
      [e.from, e.to].includes(n[0]) && [e.from, e.to].includes(b[side][0])));
  const pairs: Row[][] = [], triples: Row[][] = [];
  for (const a of rows) for (const b of rows) if (linked(a, b)) {
    pairs.push([a, b]);
    for (const c of rows) if (linked(b, c)) triples.push([a, b, c]);
  }
  return [...triples, ...pairs.filter(p => !triples.some(t => p.every(r => t.includes(r))))]
    .map(rows => layout(rows, doc.rack.tube));
}

export function validateBayStructure(doc: RackDoc, bay: SystemLayout) {
  for (let j = 0; j < bay.rows.length - 1; j++) for (let side = 0; side < 2; side++)
    for (const level of ['upper', 'lower'] as const) {
      const from = bay.rows[j][side][0], to = bay.rows[j + 1][side][0];
      const edge = doc.connections.find(e => !doc.removed.includes(e.id) && e.level === level &&
        [e.from, e.to].includes(from) && [e.from, e.to].includes(to));
      if (!edge) throw Error(`System bay needs a ${level} side crossmember between ${from} and ${to}. Add or restore that member.`);
      const variant = doc.structure[edge.id];
      // Straight variants resolve to the measured endpoint span, not the nominal part suffix.
      if (variant && !['crossmember-425', 'crossmember-725', 'crossmember-1075'].includes(variant.part))
        throw Error(`System bay ${level} member ${edge.id} must be a straight side crossmember; replace ${variant.part}.`);
    }
}
