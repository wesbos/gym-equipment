import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGalleryItems } from './PartGallery/gallery-model.ts';
import { COMMANDS, availableCommands } from './CommandPalette/commands.ts';
import {
  commandEntry, fuzzyScore, loadPaletteRecents, mergedRecents, paletteScore, parseQuery, partEntries, pushPaletteRecent, rankPalette,
  savePaletteRecents, PALETTE_PREFS_KEY, PALETTE_RECENT_LIMIT,
} from './CommandPalette/palette-model.ts';
import { searchTokens } from './PartGallery/gallery-model.ts';
import { BuilderStore } from '../state/builder-store.ts';

const items = buildGalleryItems();
const parts = partEntries(items);
const commands = COMMANDS.map(commandEntry);
const top = (query: string, recents: string[] = []) => rankPalette(query, commands, parts, recents).flatMap(s => s.entries);

test('every catalog part is one palette entry, cached per catalog; every command is searchable', () => {
  assert.equal(parts.length, items.length);
  assert.ok(parts.length > 400);
  assert.equal(partEntries(items), parts);
  assert.equal(new Set(parts.map(p => p.key)).size, parts.length);
  assert.ok(parts.every(p => p.label.startsWith('Add ')));
  for (const c of commands) assert.ok(top(c.name).some(e => e.key === c.key), `${c.id} is findable by its label`);
});

test('ranking: "add rogue echo bike" finds the Echo Bike first; parts and actions mix by relevance', () => {
  const echo = top('add Rogue Echo Bike');
  assert.equal(echo[0].id, 'rogue-echo-bike');
  assert.ok(echo.every(e => e.kind === 'part'), '"add …" searches parts only');
  assert.equal(top('rogue echo bike')[0].id, 'rogue-echo-bike');
  assert.equal(top('undo')[0].id, 'undo');
  assert.equal(top('export glb')[0].id, 'export-glb');
  assert.equal(top('top view')[0].id, 'view-top');
  assert.equal(top('room')[0].id, 'room');
  assert.ok(top('> echo').every(e => e.kind === 'command'), '"> …" searches actions only');
  assert.ok(top('zzzzqqq').length === 0);
  assert.ok(top('j hook').length <= 60);
});

test('fuzzy fallback: letters in order still match, weaker than a real match', () => {
  assert.ok(fuzzyScore('echo bike', 'echbk') > 0);
  assert.equal(fuzzyScore('echo bike', 'kbe'), 0);
  assert.ok(fuzzyScore('echo bike', 'ech') > fuzzyScore('echo bike', 'eik'));
  const bike = parts.find(p => p.id === 'rogue-echo-bike')!;
  assert.ok(paletteScore(bike, searchTokens('echbk')) > 0);
  assert.ok(paletteScore(bike, searchTokens('echo')) > paletteScore(bike, searchTokens('echbk')));
  assert.ok(top('rogechobik').some(e => e.id === 'rogue-echo-bike') || top('echobik').some(e => e.id === 'rogue-echo-bike'));
});

test('recents first: no query lists recents then actions; a recent entry wins close matches', () => {
  const recents = ['part:rogue-echo-bike', 'command:view-top'];
  const [recent, actions] = rankPalette('', commands, parts, recents);
  assert.equal(recent.label, 'Recent');
  assert.deepEqual(recent.entries.map(e => e.key), recents);
  assert.equal(actions.label, 'Actions');
  assert.ok(actions.entries.every(e => e.kind === 'command' && !recents.includes(e.key)));
  // Two views match "view"; the recent one ranks first.
  assert.equal(top('view', ['command:view-side'])[0].id, 'view-side');
  const [only] = rankPalette('add ', commands, parts, recents);
  assert.equal(only.entries[0].id, 'rogue-echo-bike');
  assert.deepEqual(parseQuery('add  bench'), { mode: 'parts', text: 'bench' });
  assert.deepEqual(parseQuery('>undo'), { mode: 'commands', text: 'undo' });
  assert.deepEqual(parseQuery('address'), { mode: 'all', text: 'address' });
});

test('palette recents persist tolerantly and merge gallery recents after their own', () => {
  let list: string[] = [];
  for (let i = 0; i < 20; i++) list = pushPaletteRecent(list, `command:c${i}`);
  assert.equal(list.length, PALETTE_RECENT_LIMIT);
  assert.equal(list[0], 'command:c19');
  assert.deepEqual(pushPaletteRecent(['a', 'b'], 'b'), ['b', 'a']);
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  savePaletteRecents(storage, ['command:undo', 'part:rogue-echo-bike']);
  assert.deepEqual(loadPaletteRecents(storage), ['command:undo', 'part:rogue-echo-bike']);
  values.set(PALETTE_PREFS_KEY, '{"recent":["junk",3,"command:undo","command:undo"]}');
  assert.deepEqual(loadPaletteRecents(storage), ['command:undo']);
  values.set(PALETTE_PREFS_KEY, 'not json');
  assert.deepEqual(loadPaletteRecents(storage), []);
  assert.deepEqual(mergedRecents(['part:a', 'command:x'], ['a', 'b']), ['part:a', 'command:x', 'part:b']);
});

test('availability hides commands that cannot run now', () => {
  const store = new BuilderStore();
  const ids = () => availableCommands(store.getSnapshot(), store).map(c => c.id);
  assert.ok(!ids().includes('undo') && !ids().includes('delete') && !ids().includes('show-all'));
  store.select(store.getSnapshot().resolved[0].id);
  assert.ok(ids().includes('delete') && ids().includes('hide') && ids().includes('frame-selection') && ids().includes('reposition'));
  // Rotate follows the store's rotationSubject (#204): an upright does not rotate; a J-hook does.
  assert.ok(!ids().includes('rotate'));
  store.select('jhooks-front:left');
  assert.equal(ids().includes('rotate'), !!store.rotationSubject());
  store.setHidden([store.getSnapshot().resolved[1].id], true);
  assert.ok(ids().includes('show-all'));
});
