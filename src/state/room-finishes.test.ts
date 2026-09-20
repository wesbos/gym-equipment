import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuilderStore } from './builder-store.ts';
import { ROOM_DEFAULTS } from '../../rack-generator/walls.ts';
const memory = () => { const values = new Map<string, string>(); return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } }; };

test('room finishes are one labelled undo step each, and resetting them all leaves the document as it was', async () => {
  const store = new BuilderStore(memory()); await store.ready;
  const before = structuredClone(store.getSnapshot().doc), labels = () => store.getSnapshot().timeline.entries.map(e => e.label);
  assert.equal(before.room, undefined);
  store.setRoomFinish({ walls: { finish: 'wainscot', color: '#f2f1ec', wainscot: 1220 } });
  assert.deepEqual(store.getSnapshot().doc.room, { ...ROOM_DEFAULTS, walls: { finish: 'wainscot', color: '#f2f1ec', wainscot: 1220 } });
  store.setRoomFinish({ floor: 'grey-fleck' });
  store.setRoomFinish({ turf: [{ position: [-2300, 1200], size: [1800, 4000], lines: true }] });
  store.setRoomFinish({ ceiling: { lights: { count: 4, along: 'z' } } });
  store.setRoomFinish({ walls: { finish: 'wainscot', color: '#27354a', wainscot: 1220 } });
  assert.deepEqual(labels().slice(-5), ['Walls · Birch wainscot, painted above', 'Floor · Grey-fleck rubber', '+ Turf lane', 'Add ceiling', 'Walls · colour']);
  assert.ok(store.getSnapshot().timeline.entries.slice(-5).every(e => e.category === 'appearance'));
  store.history('undo');
  assert.equal(store.getSnapshot().doc.room!.walls!.color, '#f2f1ec', 'undo restores the colour');
  store.history('undo');
  assert.equal(store.getSnapshot().doc.room!.ceiling, undefined, 'undo removes the ceiling');
  store.history('redo');
  assert.deepEqual(store.getSnapshot().doc.room!.ceiling, { lights: { count: 4, along: 'z' } });
  store.setRoomFinish({ walls: null, floor: null, turf: null, ceiling: null });
  assert.deepEqual(store.getSnapshot().doc, before, 'no finishes and a default-size room is no room at all');
  // A resized room keeps its size when its finishes are reset.
  store.setRoom({ left: 2000 }); store.setRoomFinish({ floor: 'concrete' }); store.setRoomFinish({ floor: null });
  assert.deepEqual(store.getSnapshot().doc.room, { ...ROOM_DEFAULTS, left: 2000 });
  // Invalid finishes never reach the document.
  const doc = store.getSnapshot().doc;
  assert.throws(() => store.setRoomFinish({ floor: 'shag' as never }), /Floor finish/);
  assert.equal(store.getSnapshot().doc, doc);
});

test('a colour drag is one history entry and the room inspector yields to selection and placement', async () => {
  const store = new BuilderStore(memory()); await store.ready;
  store.setRoomFinish({ walls: { finish: 'drywall', color: '#ffffff' } });
  const entries = store.getSnapshot().timeline.entries.length;
  store.beginGesture();
  for (const color of ['#eeeeee', '#dddddd', '#cccccc']) store.setRoomFinish({ walls: { finish: 'drywall', color } });
  store.endGesture();
  assert.equal(store.getSnapshot().timeline.entries.length, entries + 1);
  assert.equal(store.getSnapshot().doc.room!.walls!.color, '#cccccc');
  store.history('undo'); assert.equal(store.getSnapshot().doc.room!.walls!.color, '#ffffff');
  store.openRoom(); assert.equal(store.getSnapshot().roomInspector, true);
  store.setRoomFinish({ floor: 'wood' }); assert.equal(store.getSnapshot().roomInspector, true, 'editing keeps it open');
  store.history('undo'); assert.equal(store.getSnapshot().roomInspector, true, 'so does undo');
  const id = store.getSnapshot().resolved[0].id;
  store.select(id); assert.equal(store.getSnapshot().roomInspector, false, 'selecting a part closes it');
  store.openRoom(); assert.deepEqual(store.getSnapshot().selection, [], 'opening it clears the selection');
  store.escape(); assert.equal(store.getSnapshot().roomInspector, false, 'ESC closes it');
  store.openRoom(); store.startPlacement('pegboard-panel'); assert.equal(store.getSnapshot().roomInspector, false, 'placement closes it');
  store.openRoom(); assert.equal(store.getSnapshot().roomInspector, false, 'and it cannot open mid-placement');
});
