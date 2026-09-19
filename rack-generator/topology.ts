import type { RackDimensions, UprightNode, ConnectionEdge, RackDoc } from './types.ts';
export function legacyGraph(r: RackDimensions): { uprights: Record<string, UprightNode>; connections: ConnectionEdge[] } {
  const x = (r.width + r.tube) / 2, y = (r.depth + (r.tubeDepth ?? r.tube)) / 2;
  return { uprights: {
    'front-left': { x: -x, y: -y }, 'front-right': { x, y: -y },
    'rear-left': { x: -x, y }, 'rear-right': { x, y },
  }, connections: [
    ...(['left', 'right'] as const).flatMap(side => (['upper', 'lower'] as const).map(level => ({ id: `${side}-${level}-crossmember`, from: `front-${side}`, to: `rear-${side}`, level }))),
    { id: 'rear-crossmember', from: 'rear-left', to: 'rear-right', level: 'upper' },
  ] };
}
export function validateGraph(input: Record<string, unknown>): { uprights: Record<string, UprightNode>; connections: ConnectionEdge[] } {
  const nodes = input.uprights;
  if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes) || !Array.isArray(input.connections)) throw new Error('Missing upright registry or connection edges.');
  const uprights = structuredClone(nodes) as Record<string, UprightNode>;
  const entries = Object.entries(uprights);
  const validId = (id: string) => /^[a-z][a-z0-9-]{0,79}$/.test(id) && !['constructor', 'prototype', '__proto__'].includes(id);
  if (!entries.length || entries.length > 64) throw new Error('Use 1–64 uprights.');
  for (const [id, node] of entries) {
    if (!validId(id) || !node || !Number.isFinite(node.x) || !Number.isFinite(node.y) || Math.max(Math.abs(node.x), Math.abs(node.y)) > 15000) throw new Error('Invalid upright coordinates or ID.');
    if (entries.some(([other, p]) => other !== id && Math.hypot(p.x - node.x, p.y - node.y) < 75)) throw new Error('Uprights overlap.');
    if (node.height !== undefined && (!Number.isFinite(node.height) || node.height < 1000 || node.height > 4000)) throw new Error('Upright height must be between 1000 and 4000.');
  }
  const ids = new Set(entries.map(([id]) => id));
  if (input.connections.length > 128) throw new Error('Too many connections.');
  const pairs = new Set<string>();
  const connections = input.connections.map(value => {
    const edge = value as ConnectionEdge;
    if (!edge || typeof edge.id !== 'string' || !validId(edge.id) || ids.has(edge.id) || !Object.hasOwn(uprights, edge.from) || !Object.hasOwn(uprights, edge.to) || edge.from === edge.to || !['upper', 'lower'].includes(edge.level)) throw new Error('Invalid connection edge.');
    ids.add(edge.id);
    const pair = [...[edge.from,edge.to].sort(),edge.level].join(':');
    if (pairs.has(pair)) throw new Error('Duplicate connection endpoints and level.');
    pairs.add(pair);
    const a = uprights[edge.from], b = uprights[edge.to];
    if ((a.x !== b.x && a.y !== b.y) || Math.hypot(b.x - a.x, b.y - a.y) < 375) throw new Error('Connections must be axis-aligned with at least 300 mm clear span.');
    return structuredClone(edge);
  });
  return { uprights, connections };
}
export function structureSlots(doc: Pick<RackDoc, 'uprights' | 'connections'>) {
  return [
    ...Object.keys(doc.uprights).map(id => ({ id, part: 'upright' as const, connectedTo: [] as string[] })),
    ...doc.connections.map(e => ({ id: e.id, part: e.id === 'rear-crossmember' ? 'crossmember-1075' as const : 'crossmember-725' as const, connectedTo: [e.from, e.to] })),
  ];
}
