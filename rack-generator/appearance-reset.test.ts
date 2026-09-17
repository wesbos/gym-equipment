import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FRAME_COLOR, type Appearance, type FrameFinish } from './appearance.ts';
import { physicalFinish, resetAppearanceField } from './appearance-reset.ts';
import { BuilderStore } from '../src/state/builder-store.ts';

const id = 'jhooks-front:left', other = 'jhooks-front:right';
const finishes: FrameFinish[] = ['paint', 'stainless', 'clear-grind'];
test('physical color resets preserve effective finish, fasteners and the other paired side', () => {
  for (const frameFinish of finishes) for (const finish of [undefined, ...finishes]) {
    const before: Appearance = { frameFinish, hardwareFinish: 'gold', frameColor: '#112233',
      overrides: { [id]: '#ff0000', [other]: '#00ff00' }, finishOverrides: { [other]: 'clear-grind', ...(finish ? { [id]: finish } : {}) } };
    const saved = structuredClone(before), next = resetAppearanceField(before, 'color', id);
    assert.equal(next.overrides?.[id], undefined);
    assert.equal(physicalFinish(next, id), physicalFinish(before, id));
    assert.equal(next.overrides?.[other], '#00ff00');
    assert.equal(next.finishOverrides?.[other], 'clear-grind');
    assert.equal(next.hardwareFinish, 'gold');
    assert.equal(next.frameColor, '#112233');
    assert.deepEqual(before, saved);
  }
});
test('physical finish reset inherits rack finish while retaining custom color', () => {
  for (const frameFinish of finishes) for (const finish of [undefined, ...finishes]) {
    const before: Appearance = { frameFinish, overrides: { [id]: '#ff0000' }, finishOverrides: finish ? { [id]: finish } : {} };
    const next = resetAppearanceField(before, 'finish', id);
    assert.equal(physicalFinish(next, id), frameFinish);
    assert.deepEqual(next.overrides, before.overrides);
    assert.deepEqual(resetAppearanceField(next, 'finish', id), next);
  }
});
test('global resets and physical resets each undo as one edit without disturbing other appearance', () => {
  const store = new BuilderStore();
  store.commit({ ...store.getSnapshot().doc, appearance: { frameColor: '#ff0000', frameFinish: 'stainless', hardwareFinish: 'gold', overrides: { [id]: '#0000ff' } } });
  for (const instance of [undefined, id]) for (const field of ['color', 'finish'] as const) {
    const before = store.getSnapshot().doc;
    const appearance = resetAppearanceField(before.appearance!, field, instance);
    store.commit({ ...before, appearance });
    if (!instance) {
      assert.equal(appearance.frameColor, field === 'color' ? DEFAULT_FRAME_COLOR : '#ff0000');
      assert.equal(appearance.frameFinish, field === 'finish' ? 'paint' : 'stainless');
      assert.deepEqual(appearance.overrides, before.appearance!.overrides);
    }
    store.history('undo');
    assert.deepEqual(store.getSnapshot().doc, before);
  }
});
