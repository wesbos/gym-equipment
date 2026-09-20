import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAssembly, resolveAssembly } from '../../rack-generator/assembly.ts';
import type { RackDoc } from '../../rack-generator/types.ts';
import { BuilderStore, toggled } from '../state/builder-store.ts';
import {
  allIn, buildOutline, descendantIds, filterOutline, flattenOutline, outlineSignature, rowOrder, treeKey, windowRows, type OutlineNode,
} from './Outliner/outliner-model.ts';
import { collectWarnings, focusWarning, sameWarnings, warningTargets } from './Warnings/warnings-model.ts';
import { focusParts, type EditorApi } from './CommandPalette/commands.ts';

const gym = (slug: string): RackDoc => JSON.parse(readFileSync(new URL(`../gyms/data/${slug}.json`, import.meta.url), 'utf8')).doc;
const name = (part: string) => part;
const leaves = (nodes: readonly OutlineNode[]) => nodes.flatMap(descendantIds);

test('outline groups the default rack into uprights, crossmembers and attachments', () => {
  const doc = createAssembly(), resolved = resolveAssembly(doc), tree = buildOutline(resolved, doc, name);
  assert.deepEqual(tree.map(n => n.label), ['Rack']);
  assert.deepEqual(tree[0].children.map(n => n.label), ['Uprights', 'Crossmembers', 'Attachments']);
  assert.equal(tree[0].children[0].children.length, 4);
  assert.ok(tree[0].children[0].children.every(n => n.part === 'upright' && n.detail));
  assert.deepEqual(leaves(tree).sort(), resolved.map(r => r.id).sort());
  // Paired pieces say which side they are.
  assert.ok(tree[0].children[2].children.some(n => n.id === 'jhooks-front:left' && n.detail === 'left'));
});

test("Coop's gym: floor, walls with pegboard hang items nested, every part exactly once", () => {
  const doc = gym('coop-garage-gym-reviews'), resolved = resolveAssembly(doc), tree = buildOutline(resolved, doc, name);
  assert.deepEqual(tree.map(n => n.label), ['Rack', 'Floor', 'Walls', 'Plates']);
  const ids = leaves(tree.filter(n => n.label !== 'Plates'));
  assert.equal(ids.length, resolved.length);
  assert.equal(new Set(ids).size, resolved.length);
  const walls = tree.find(n => n.label === 'Walls')!;
  const pegboard = walls.children.find(n => n.part === 'wall-control-pegboard')!;
  const hung = (doc.hangItems ?? []).filter(h => h.panel === pegboard.id).map(h => h.id);
  assert.ok(hung.length > 10);
  assert.deepEqual(pegboard.children.map(n => n.id).sort(), hung.sort());
  assert.ok(walls.children.every(n => !hung.includes(n.id!)), 'hang items are not listed at the wall level');
  // Four identical storage pins read apart.
  const pins = tree[0].children.find(n => n.label === 'Attachments')!.children.filter(n => n.part === 'storage-pin-long');
  assert.deepEqual(pins.map(n => n.detail), ['#1', '#2', '#3', '#4']);
});

test('systems get their own group; plates are split from the rest of the floor', () => {
  const doc = gym('cable-compound'), resolved = resolveAssembly(doc), tree = buildOutline(resolved, doc, name);
  assert.ok(tree.find(n => n.label === 'Systems')!.children.some(n => n.part === 'cable-athena'));
  // Plates: each loaded storage pin (and loaded bar) again, by its plate total; a click selects the holder.
  const coop = gym('coop-garage-gym-reviews'), coopResolved = resolveAssembly(coop);
  const plates = buildOutline(coopResolved, coop, name).find(n => n.label === 'Plates')!;
  const loaded = coop.accessories.filter(a => a.plates?.length).map(a => a.id);
  assert.ok(plates.children.length >= loaded.length && loaded.length > 0);
  assert.ok(plates.children.every(n => n.key === `plates:${n.id}` && /kg|lb/.test(n.label) && n.detail!.startsWith('on ')));
  assert.ok(plates.children.every(n => loaded.includes(coopResolved.find(r => r.id === n.id)!.ownerId)));
  const rows = flattenOutline(buildOutline(coopResolved, coop, name), new Set());
  assert.equal(rowOrder(rows).length, coopResolved.length, 'shift ranges see each part once');
});

test('flatten, collapse, window, tree keys, filter and signature', () => {
  const doc = gym('coop-garage-gym-reviews'), resolved = resolveAssembly(doc), tree = buildOutline(resolved, doc, name);
  const all = flattenOutline(tree, new Set());
  assert.ok(all.length > resolved.length, 'group rows plus every part');
  const collapsed = flattenOutline(tree, new Set(['group:rack']));
  assert.equal(collapsed.filter(r => r.depth === 0).length, 4);
  assert.ok(!collapsed.some(r => r.parent === 'group:rack'));
  assert.equal(rowOrder(all).length, resolved.length);
  assert.deepEqual(windowRows(200, 32, 0, 320, 2), [0, 12]);
  assert.deepEqual(windowRows(0, 32, 0, 320), [0, -1]);
  const [lo, hi] = windowRows(200, 32, 3200, 320, 2);
  assert.ok(lo === 98 && hi === 112);
  // → collapses nothing on an expanded row but steps in; ← collapses it; ← on a child goes to the parent.
  assert.deepEqual(treeKey(all, 0, 'ArrowRight'), { index: 1 });
  assert.deepEqual(treeKey(all, 0, 'ArrowLeft'), { index: 0, toggle: 'group:rack' });
  assert.deepEqual(treeKey(all, 2, 'ArrowLeft'), { index: 1 });
  assert.deepEqual(treeKey(all, 0, 'End'), { index: all.length - 1 });
  assert.equal(treeKey(all, 0, 'x'), null);
  const bands = filterOutline(tree, 'monster band');
  // Three bands, kept under their pegboard (an ancestor row, so it is listed too).
  assert.deepEqual(leaves(bands).map(id => resolveAssembly(doc).find(r => r.id === id)!.part).sort(),
    ['rogue-monster-band-1', 'rogue-monster-band-2', 'rogue-monster-band-3', 'wall-control-pegboard']);
  assert.deepEqual(bands.map(n => n.label), ['Walls']);
  // Signature ignores positions: moving a floor item keeps it.
  const moved = structuredClone(doc); moved.floorItems![0].position = [1234, 567];
  assert.equal(outlineSignature(buildOutline(resolveAssembly(moved), moved, name)), outlineSignature(tree));
  const removed = structuredClone(doc); removed.floorItems!.pop();
  assert.notEqual(outlineSignature(buildOutline(resolveAssembly(removed), removed, name)), outlineSignature(tree));
  assert.ok(allIn(['a', 'b'], new Set(['a', 'b', 'c'])) && !allIn(['a', 'x'], new Set(['a'])) && !allIn([], new Set()));
});

test('hide/lock: session-only UI state; hiding deselects; select-all skips hidden and locked; never saved', async () => {
  assert.deepEqual(toggled(['a'], ['b']), ['a', 'b']);
  assert.deepEqual(toggled(['a', 'b'], ['a', 'c']), ['b'], 'toggles together by the first id: a is on, so both go off');
  const same = ['a']; assert.equal(toggled(same, ['a'], true), same);
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  const store = new BuilderStore(storage); await store.ready;
  const ids = store.getSnapshot().resolved.map(r => r.id);
  store.selectMany(ids.slice(0, 3));
  store.setHidden([ids[0]]);
  assert.deepEqual(store.getSnapshot().hidden, [ids[0]]);
  assert.deepEqual(store.getSnapshot().selection, ids.slice(1, 3));
  const before = store.getSnapshot().hidden;
  store.setHidden([ids[0]], true);
  assert.equal(store.getSnapshot().hidden, before, 'no-op keeps identity (no scene or outliner wake-up)');
  store.setLocked([ids[1], ids[2]], true);
  store.selectAll();
  assert.deepEqual([...store.getSnapshot().selection].sort(), ids.slice(3).sort());
  // Locked parts can still be selected from the outliner (store.select), just not in the scene.
  store.select(ids[1]);
  assert.deepEqual(store.getSnapshot().selection, [ids[1]]);
  assert.equal(store.getSnapshot().canUndo, false, 'hiding and locking are not edits');
  await store.save('Hidden test');
  assert.doesNotMatch(values.get('bos-strength-configurations-v1') ?? '', /"hidden"|"locked"/);
  assert.doesNotMatch(store.exportJSON(), /"hidden"|"locked"/);
  store.showAll();
  assert.deepEqual(store.getSnapshot().hidden, []);
  // Opening another design starts with everything visible and unlocked.
  store.setHidden([ids[0]], true);
  store.importJSON(store.exportJSON());
  await store.openDesign(createAssembly(), 'Fresh');
  assert.deepEqual(store.getSnapshot().hidden, []);
  assert.deepEqual(store.getSnapshot().locked, []);
});

test('warnings: targets map owners to pieces and "rack" to the frame; clicking selects and frames', () => {
  const doc = gym('coop-garage-gym-reviews'), resolved = resolveAssembly(doc);
  const warnings = collectWarnings(doc, resolved);
  assert.equal(collectWarnings(doc, resolved), warnings, 'cached per doc and resolved');
  const pair = warningTargets({ ids: ['accessory-18', 'floor-28'], message: 'x' }, resolved);
  assert.deepEqual(pair.select, ['accessory-18:left', 'accessory-18:right', 'floor-28']);
  const rack = warningTargets({ ids: ['floor-30', 'rack'], message: 'overlaps the rack' }, resolved);
  assert.deepEqual(rack.select, ['floor-30']);
  assert.ok(rack.frame.includes('floor-30') && rack.frame.includes('front-left'));
  const wall = warningTargets({ ids: ['rack', 'back-wall'], message: 'Rack crosses the back wall.' }, resolved);
  assert.ok(wall.select.length > 4 && wall.select.every(id => resolved.find(r => r.id === id)!.kind === 'structure'));
  assert.ok(sameWarnings([{ ids: ['a'], message: 'm' }], [{ ids: ['a'], message: 'm' }]));
  assert.ok(!sameWarnings([{ ids: ['a'], message: 'm' }], [{ ids: ['b'], message: 'm' }]));

  const store = new BuilderStore();
  const focused: string[][] = [];
  const api: EditorApi = { store, scene: () => ({ focus: (ids: readonly string[]) => focused.push([...ids]) }) as never, view() {}, saveJSON() {}, loadJSON() {}, openGyms() {}, exportFile() {}, resetRack() {} };
  const ids = store.getSnapshot().resolved.map(r => r.id);
  store.startPlacement('j-hook-standard');
  focusWarning(api, { ids: ['jhooks-front', 'safeties:left'], message: 'Overlap' });
  assert.equal(store.getSnapshot().placing, null, 'a warning click leaves placement');
  assert.deepEqual(store.getSnapshot().selection, ['jhooks-front:left', 'jhooks-front:right', 'safeties:left']);
  assert.deepEqual(focused.at(-1), ['jhooks-front:left', 'jhooks-front:right', 'safeties:left']);
  focusParts(api, [ids[0]]);
  assert.deepEqual(store.getSnapshot().selection, [ids[0]]);
  assert.deepEqual(focused.at(-1), [ids[0]]);
});
