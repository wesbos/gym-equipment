import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHORTCUTS, SHORTCUT_GROUPS, ariaKeys, comboLabel, conflicts, dispatchShortcut, historyKeyStep, isTyping, matches, overlayGroups, shortcut,
  type ShortcutDef, type ShortcutId,
} from './shortcuts.ts';
import { COMMANDS, builderShortcutHandlers, type EditorApi } from '../components/CommandPalette/commands.ts';
import { BuilderStore } from './builder-store.ts';

const list = SHORTCUTS as readonly ShortcutDef[];
const key = (k: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) =>
  ({ key: k, metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt });

test('registry: unique ids, known groups, every entry has keys or a gesture label, no clashing combos', () => {
  assert.equal(new Set(list.map(s => s.id)).size, list.length);
  for (const s of list) {
    assert.ok(SHORTCUT_GROUPS.includes(s.group), s.id);
    assert.ok(s.combos.length || s.display?.length, `${s.id} has nothing to show`);
    assert.ok(s.label.length > 2, s.id);
  }
  assert.deepEqual(conflicts(), []);
});

test('overlay lists every registry entry exactly once, in group order, with key caps', () => {
  const groups = overlayGroups(true);
  const rows = groups.flatMap(g => g.rows);
  assert.deepEqual(rows.map(r => r.id).sort(), list.map(s => s.id).sort());
  assert.deepEqual(groups.map(g => g.group), SHORTCUT_GROUPS.filter(g => list.some(s => s.group === g)));
  const undo = rows.find(r => r.id === 'undo')!;
  assert.deepEqual(undo.keys, [['⌘', 'Z']]);
  assert.deepEqual(rows.find(r => r.id === 'redo')!.keys, [['⌘', '⇧', 'Z'], ['⌘', 'Y']]);
  assert.deepEqual(overlayGroups(false).flatMap(g => g.rows).find(r => r.id === 'redo')!.keys[0], ['Ctrl', 'Shift', 'Z']);
  assert.deepEqual(rows.find(r => r.id === 'snap-off')!.keys, [['Alt']]);
  assert.equal(comboLabel(shortcut('command-palette').combos[0], true), '⌘K');
  assert.equal(comboLabel(shortcut('command-palette').combos[0], false), 'Ctrl+K');
  assert.equal(ariaKeys('command-palette'), 'Meta+K Control+K');
});

test('existing shortcuts keep their keys: undo/redo, history arrows, Delete, Escape, gallery, R rotate, structure cycling', () => {
  assert.ok(matches('undo', key('z', { meta: true })) && matches('undo', key('z', { ctrl: true })) && matches('undo', key('Z', { meta: true })));
  assert.ok(!matches('undo', key('z', { meta: true, shift: true })) && matches('redo', key('z', { meta: true, shift: true })));
  assert.ok(!matches('undo', key('z')));
  for (const k of ['Delete', 'Backspace']) assert.ok(matches('delete', key(k)) && matches('delete', key(k, { meta: true })));
  assert.ok(matches('escape', key('Escape')) && matches('escape', key('Escape', { shift: true })));
  assert.ok(matches('open-gallery', key('/')) && matches('open-gallery', key('a')) && matches('open-gallery', key('A', { shift: true })));
  assert.ok(!matches('open-gallery', key('a', { meta: true })) && matches('select-all', key('a', { meta: true })));
  assert.ok(matches('shortcuts', key('?', { shift: true })) && !matches('open-gallery', key('?', { shift: true })));
  assert.ok(matches('rotate', key('r')) && !matches('rotate', key('r', { shift: true })) && matches('rotate-back', key('R', { shift: true })));
  assert.ok(!matches('rotate', key('r', { ctrl: true })));
  for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Alt']) assert.ok(matches('structure-cycle', key(k, { alt: k === 'Alt' })), k);
  assert.ok(!matches('history-back', key('ArrowLeft', { shift: true })));
  assert.equal(historyKeyStep('Home', 5, 9), 0);
  assert.equal(historyKeyStep('End', 5, 9), 9);
  assert.equal(historyKeyStep('ArrowLeft', 0, 9), 0);
  assert.equal(historyKeyStep('ArrowRight', 9, 9), 9);
  assert.equal(historyKeyStep('ArrowRight', 4, 9), 5);
  assert.equal(historyKeyStep('x', 4, 9), undefined);
});

const fakeEvent = (k: string, init: { target?: unknown; defaultPrevented?: boolean; meta?: boolean; shift?: boolean } = {}) => {
  const event = { ...key(k, { meta: init.meta, shift: init.shift }), target: init.target ?? { tagName: 'BODY', closest: () => null }, isComposing: false,
    defaultPrevented: !!init.defaultPrevented, prevented: false, preventDefault() { this.prevented = true; } };
  return event as typeof event & KeyboardEvent;
};
test('dispatcher: never fires plain keys while typing or inside dialogs/menus; Escape and ⌘K still do', () => {
  const ran: string[] = [];
  const handlers = Object.fromEntries(list.filter(s => s.scope === 'builder').map(s => [s.id, () => { ran.push(s.id); }]));
  const input = { tagName: 'INPUT', closest: () => null }, dialog = { tagName: 'DIV', closest: () => ({}) };
  assert.equal(dispatchShortcut(fakeEvent('h', { target: input }), handlers), null);
  assert.equal(dispatchShortcut(fakeEvent('Delete', { target: input }), handlers), null);
  assert.equal(dispatchShortcut(fakeEvent('z', { target: input, meta: true }), handlers), null);
  assert.equal(dispatchShortcut(fakeEvent('Escape', { target: input }), handlers), 'escape');
  assert.equal(dispatchShortcut(fakeEvent('k', { target: input, meta: true }), handlers), 'command-palette');
  assert.equal(dispatchShortcut(fakeEvent('/', { target: dialog }), handlers), null);
  assert.equal(dispatchShortcut(fakeEvent('Escape', { target: dialog }), handlers), 'escape');
  assert.equal(dispatchShortcut(fakeEvent('ArrowLeft', { defaultPrevented: true }), handlers), null);
  const h = fakeEvent('h');
  assert.equal(dispatchShortcut(h, handlers), 'hide');
  assert.ok(h.prevented);
  // Escape is never prevented (widgets that close on it keep their default).
  const escape = fakeEvent('Escape');
  dispatchShortcut(escape, handlers);
  assert.ok(!escape.prevented);
  // A declining handler lets the key through unprevented.
  const declined = fakeEvent('ArrowLeft');
  assert.equal(dispatchShortcut(declined, { 'history-back': () => false }), null);
  assert.ok(!declined.prevented);
  assert.ok(isTyping({ tagName: 'TEXTAREA' } as unknown as EventTarget) && isTyping({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget));
  assert.ok(!isTyping({ tagName: 'BUTTON' } as unknown as EventTarget) && !isTyping(null));
});

test('every builder shortcut has a handler, every command shortcut is registered, and the page has no other key handling', () => {
  const store = new BuilderStore();
  const api: EditorApi = { store, scene: () => null, view() {}, saveJSON() {}, loadJSON() {}, openGyms() {}, exportFile() {}, resetRack() {} };
  const handlers = builderShortcutHandlers(api);
  for (const s of list.filter(s => s.scope === 'builder')) assert.equal(typeof handlers[s.id as ShortcutId], 'function', `no handler for ${s.id}`);
  const ids = new Set(list.map(s => s.id));
  for (const c of COMMANDS) if (c.shortcut) assert.ok(ids.has(c.shortcut), `${c.id} → ${c.shortcut}`);
  assert.equal(new Set(COMMANDS.map(c => c.id)).size, COMMANDS.length);
  // BuilderPage owns exactly one keydown listener, the registry dispatcher.
  const page = readFileSync(new URL('../pages/BuilderPage.tsx', import.meta.url), 'utf8');
  assert.equal(page.match(/addEventListener\("keydown"/g)?.length, 1);
  assert.match(page, /dispatchShortcut\(e, handlers\)/);
  assert.doesNotMatch(page, /\be(vent)?\.key\s*===/);
  // The scene matches its keys through the registry.
  const scene = readFileSync(new URL('../scenes/builder-scene.ts', import.meta.url), 'utf8');
  for (const id of ['rotate', 'rotate-back', 'structure-cycle', 'escape', 'undo']) assert.match(scene, new RegExp(`matches\\('${id}'`), id);
});

test('shortcut handlers act on the store: history keys decline while adding structure; Delete needs a selection', () => {
  const store = new BuilderStore();
  const api: EditorApi = { store, scene: () => null, view() {}, saveJSON() {}, loadJSON() {}, openGyms() {}, exportFile() {}, resetRack() {} };
  const handlers = builderShortcutHandlers(api);
  assert.equal(dispatchShortcut(fakeEvent('Delete'), handlers), null);
  const upright = store.getSnapshot().resolved.find(r => r.part === 'upright')!.id;
  store.select(upright);
  assert.equal(dispatchShortcut(fakeEvent('h'), handlers), 'hide');
  assert.deepEqual(store.getSnapshot().hidden, [upright]);
  assert.deepEqual(store.getSnapshot().selection, []);
  assert.equal(dispatchShortcut(fakeEvent('H', { shift: true }), handlers), 'show-all');
  assert.deepEqual(store.getSnapshot().hidden, []);
  store.startPlacement('upright');
  assert.ok(store.getSnapshot().structureChoice);
  assert.equal(dispatchShortcut(fakeEvent('ArrowLeft'), handlers), null);
  assert.ok(store.getSnapshot().structureChoice, 'arrows cycle structure candidates instead of seeking history');
});
