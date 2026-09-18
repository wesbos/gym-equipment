import { validateAssembly, resolveAssembly } from '../../rack-generator/assembly.ts';
import type { RackDoc } from '../../rack-generator/types.ts';

export type HistoryCategory = 'add' | 'remove' | 'move' | 'dimension' | 'appearance' | 'logo' | 'structure' | 'preset' | 'restore' | 'edit';
export interface HistoryMetadata { label?: string; category?: HistoryCategory; replacement?: boolean }
export interface HistoryEntry { id: number; label: string; category: HistoryCategory }
type Segment = string | { id: string };
export interface HistoryOp { path: Segment[]; before?: unknown; after?: unknown; index?: number }
export interface HistoryEvent extends HistoryEntry { parent: number; ops: HistoryOp[] }
export interface TimelineData { version: 1; base: RackDoc; events: HistoryEvent[]; applied: number; redo: number[]; keyframes: { step: number; json: string }[] }
export interface SessionDocument { format: 'bos-strength-session'; version: 1; doc: RackDoc; timeline: TimelineData }
export interface TimelineSnapshot { entries: readonly HistoryEntry[]; position: number; latest: number; applied: number; viewing: boolean }
const fields = ['version','rack','uprights','connections','profileId','removed','structure','accessories','nextId','appearance','logo','floorItems','systems','wallItems','room','hangItems'] as const;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** Never copy unknown document fields (notably an embedded timeline) into geometry or keyframes. */
export function cleanDocument(input: unknown): RackDoc {
  if (!record(input)) return validateAssembly(input);
  const plain = Object.fromEntries(fields.filter(k => input[k] !== undefined).map(k => [k, input[k]]));
  return validateAssembly(plain);
}
const keyed = (v: unknown[]): boolean => v.every(x => record(x) && typeof x.id === 'string') && new Set(v.map(x => (x as {id:string}).id)).size === v.length;
export function diffDocuments(before: unknown, after: unknown, path: Segment[] = []): HistoryOp[] {
  if (equal(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after) && keyed(before) && keyed(after)) {
    const a = new Map(before.map(x => [x.id, x])), b = new Map(after.map(x => [x.id, x]));
    // Preserve order for imports that reorder owners.
    const commonA = before.filter(x => b.has(x.id)).map(x => x.id), commonB = after.filter(x => a.has(x.id)).map(x => x.id);
    if (!equal(commonA, commonB)) return [{ path, before, after }];
    // Remove from right to left so inverse insertion restores original order.
    const ids = [...a.keys()].filter(id => !b.has(id)).reverse().concat([...b.keys()]);
    return ids.flatMap(id => {
      const changes = diffDocuments(a.get(id), b.get(id), [...path, { id }]);
      if (!a.has(id) || !b.has(id)) changes.forEach(op => op.index = (!a.has(id) ? after : before).findIndex(x => x.id === id));
      return changes;
    });
  }
  if (record(before) && record(after)) return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => diffDocuments(before[key], after[key], [...path, key]));
  return [{ path, ...(before !== undefined ? { before: structuredClone(before) } : {}), ...(after !== undefined ? { after: structuredClone(after) } : {}) }];
}
/** Merge newly introduced optional containers only for a view-origin edit, never replay. */
function mergeIntroduced(current: unknown, intended: unknown): unknown {
  if (!record(current) || !record(intended)) return structuredClone(intended);
  const result = structuredClone(current);
  for (const [key, value] of Object.entries(intended)) result[key] = mergeIntroduced(result[key], value);
  return result;
}
/** Removing an old optional map removes its known fields, not newer siblings. */
function removeViewedFields(current: unknown, viewed: unknown): unknown {
  if (!record(current) || !record(viewed)) return undefined;
  const result = structuredClone(current);
  for (const [key, value] of Object.entries(viewed)) {
    const remaining = removeViewedFields(result[key], value);
    if (remaining === undefined) delete result[key];
    else result[key] = remaining;
  }
  return Object.keys(result).length ? result : undefined;
}
export function applyOps(input: RackDoc, ops: readonly HistoryOp[], reverse = false, strict = false, rebase = false): RackDoc {
  const doc = structuredClone(input);
  for (const op of reverse ? [...ops].reverse() : ops) {
    let node: any = doc;
    for (const part of op.path.slice(0, -1)) {
      node = typeof part === 'string' ? node?.[part] : Array.isArray(node) ? node.find(x => x.id === part.id) : undefined;
      if (!node || typeof node !== 'object') throw Error('History edit target no longer exists.');
    }
    const last = op.path.at(-1)!;
    const key = typeof last === 'string' ? last : Array.isArray(node) ? node.findIndex(x => x.id === last.id) : -1;
    const previous = reverse ? op.after : op.before;
    let value = reverse ? op.before : op.after;
    if (rebase && typeof last === 'string' && value === undefined && record(previous)) value = removeViewedFields(node[key], previous);
    if (rebase && previous === undefined && value !== undefined) value = mergeIntroduced(node[key], value);
    if (rebase && typeof last !== 'string' && Number(key) < 0 && previous !== undefined && value !== undefined) throw Error('History edit target no longer exists.');
    if (strict && !equal(node[key], previous)) throw Error('Invalid timeline operation precondition.');
    if (typeof last !== 'string') {
      if (!Array.isArray(node)) throw Error('Invalid timeline owner path.');
      if (value === undefined) { if (Number(key) >= 0) node.splice(Number(key), 1); }
      else if (Number(key) < 0) node.splice(op.index ?? node.length, 0, structuredClone(value));
      else node[Number(key)] = structuredClone(value);
    } else if (value === undefined) delete node[key];
    else node[key] = structuredClone(value);
  }
  return cleanDocument(doc);
}
export function describeChange(before: RackDoc, after: RackDoc): Required<Pick<HistoryMetadata, 'label' | 'category'>> {
  for (const key of Object.keys(after.rack) as (keyof RackDoc['rack'])[]) if (before.rack[key] !== after.rack[key]) return { category: 'dimension', label: `${key} ${before.rack[key]}→${after.rack[key]}` };
  if (!equal(before.logo, after.logo)) return { category: 'logo', label: after.logo ? 'Update logo' : 'Remove logo' };
  if (!equal(before.appearance, after.appearance)) return { category: 'appearance', label: 'Color / finish' };
  for (const key of ['accessories','floorItems','wallItems','hangItems','systems'] as const) {
    const a = before[key] ?? [], b = after[key] ?? [];
    const added = b.filter(x => !a.some(y => y.id === x.id)), removed = a.filter(x => !b.some(y => y.id === x.id));
    if (added.length) return { category: 'add', label: `+ ${added.length > 1 ? `${added.length} parts` : (added[0] as any).part ?? 'system'}` };
    if (removed.length) return { category: 'remove', label: `− ${removed.length > 1 ? `${removed.length} parts` : (removed[0] as any).part ?? 'system'}` };
    if (!equal(a, b)) return { category: 'move', label: 'Edit / move part' };
  }
  if (!equal(before.uprights, after.uprights) || !equal(before.connections, after.connections) || !equal(before.structure, after.structure) || !equal(before.removed, after.removed)) return { category: 'structure', label: 'Edit structure' };
  return { category: 'edit', label: 'Edit rack' };
}
export class DocumentHistory {
  data: TimelineData;
  private cache = new Map<number, RackDoc>();
  constructor(doc: RackDoc, data?: TimelineData) { this.data = data ?? { version: 1, base: cleanDocument(doc), events: [], applied: 0, redo: [], keyframes: [] }; }
  seek(step: number): RackDoc {
    if (!Number.isInteger(step) || step < 0 || step > this.data.events.length) throw Error('Invalid history step.');
    const cached = this.cache.get(step); if (cached) return structuredClone(cached);
    const frame = [...this.data.keyframes].reverse().find(frame => frame.step <= step);
    let doc = frame ? JSON.parse(frame.json) as RackDoc : this.data.base;
    for (let i = frame?.step ?? 0; i < step; i++) doc = applyOps(doc, this.data.events[i].ops);
    if (this.cache.size >= 8) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(step, doc);
    return structuredClone(doc);
  }
  append(doc: RackDoc, metadata: HistoryMetadata = {}, force = false) {
    const applied = this.seek(this.data.applied);
    if (!force && equal(applied, doc)) return false;
    const id = this.data.events.length + 1;
    const description = { ...describeChange(applied, doc), ...metadata };
    const event: HistoryEvent = { id, parent: this.data.applied, label: description.label, category: description.category, ops: diffDocuments(this.seek(id - 1), doc) };
    delete (event as HistoryEvent & HistoryMetadata).replacement;
    this.data.events.push(event); this.data.applied = id; this.data.redo = [];
    if (id % 32 === 0) this.data.keyframes.push({ step: id, json: JSON.stringify(doc) });
    this.cache.clear();
    return true;
  }
  snapshot(position: number): TimelineSnapshot { return { entries: this.data.events.map(({id,label,category}) => ({id,label,category})), position, latest: this.data.events.length, applied: this.data.applied, viewing: position !== this.data.applied }; }
  undo() { const current = this.data.applied; if (!current) return false; this.data.redo.push(current); this.data.applied = this.data.events[current - 1].parent; return true; }
  redo() { const next = this.data.redo.pop(); if (next === undefined) return false; this.data.applied = next; return true; }
}
const categories = new Set<HistoryCategory>(['add','remove','move','dimension','appearance','logo','structure','preset','restore','edit']);
export function validateTimeline(input: unknown, expected: RackDoc): TimelineData {
  if (!record(input) || input.version !== 1 || !Array.isArray(input.events) || !Array.isArray(input.redo) || !Array.isArray(input.keyframes)) throw Error('Invalid timeline.');
  const base = cleanDocument(input.base), data: TimelineData = { version: 1, base, events: [], applied: input.applied as number, redo: [], keyframes: [] };
  if (!Number.isInteger(data.applied) || data.applied < 0 || data.applied > input.events.length) throw Error('Invalid timeline cursor.');
  let doc = base, applied = base;
  const frames = new Map<number, string>();
  for (const frame of input.keyframes) {
    if (!record(frame) || !Number.isInteger(frame.step) || Number(frame.step) <= 0 || Number(frame.step) % 32 || Number(frame.step) > input.events.length || typeof frame.json !== 'string' || frames.has(Number(frame.step))) throw Error('Invalid history keyframe.');
    frames.set(Number(frame.step), frame.json);
  }
  for (let i = 0; i < input.events.length; i++) {
    const event = input.events[i];
    if (!record(event) || event.id !== i + 1 || !Number.isInteger(event.parent) || Number(event.parent) < 0 || Number(event.parent) > i || typeof event.label !== 'string' || event.label.length > 200 || !categories.has(event.category as HistoryCategory) || !Array.isArray(event.ops)) throw Error('Invalid history event.');
    for (const op of event.ops) {
      if (!record(op) || !Array.isArray(op.path) || !op.path.length || op.path.length > 32 || !fields.includes(op.path[0] as any) || op.path.some(p => typeof p === 'string' ? ['__proto__','prototype','constructor','timeline','history'].includes(p) : !record(p) || typeof p.id !== 'string' || Object.keys(p).length !== 1) || (!('before' in op) && !('after' in op)) || (op.index !== undefined && (!Number.isInteger(op.index) || Number(op.index) < 0))) throw Error('Invalid history operation.');
    }
    const cleanEvent = { id: i + 1, parent: Number(event.parent), label: event.label, category: event.category as HistoryCategory, ops: structuredClone(event.ops) as HistoryOp[] };
    doc = applyOps(doc, cleanEvent.ops, false, true); resolveAssembly(doc);
    data.events.push(cleanEvent);
    if (i + 1 === data.applied) applied = doc;
    if ((i + 1) % 32 === 0) {
      const json = JSON.stringify(doc);
      if (frames.has(i + 1) && !equal(cleanDocument(JSON.parse(frames.get(i + 1)!)), doc)) throw Error('History keyframe mismatch.');
      data.keyframes.push({ step: i + 1, json });
    }
  }
  let cursor = data.applied;
  for (const step of [...input.redo].reverse()) {
    if (!Number.isInteger(step) || step <= 0 || step > data.events.length || data.events[step - 1].parent !== cursor) throw Error('Invalid redo history.');
    cursor = step;
  }
  data.redo = [...input.redo];
  if (!equal(applied, expected)) throw Error('Timeline does not match saved document.');
  return data;
}
export function parseSession(input: unknown): { doc: RackDoc; timeline?: TimelineData } {
  if (record(input) && input.format === 'bos-strength-session') {
    if (input.version !== 1) throw Error('Unsupported session version.');
    const doc = cleanDocument(input.doc); resolveAssembly(doc);
    return { doc, timeline: validateTimeline(input.timeline, doc) };
  }
  const doc = cleanDocument(input); resolveAssembly(doc); return { doc };
}
