import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly, resolveAssembly, validateAssembly, unpairAccessory } from './assembly.ts';
import type { PartId } from './types.ts';

const layouts = [
  ['front-left', 'rear-left', 'left', 'right'],
  ['front-right', 'rear-right', 'left', 'right'],
  ['front-left', 'front-right', 'left', 'right'],
  ['front-right', 'front-left', 'right', 'left'],
  ['alpha', 'beta', 'left', 'right'],
  ['front-right', 'beta', 'left', 'right'],
  ['alpha', 'rear-left', 'left', 'right'],
  ['front-right', 'alpha', 'left', 'right'],
] as const;
for (const part of ['voltra-sliding', 'voltra-adaptive', 'voltra-fixed', 'darko-dock', 'darko-j', 'darko-double-j', 'j-hook-standard'] as PartId[]) {
  test(`${part} explicit upright pairs retain unique physical IDs, paint and finishes`, () => {
    for (const [first, second, firstSuffix, secondSuffix] of layouts) {
      const doc = createAssembly({ emptyAccessories: true });
      doc.uprights.alpha = { ...doc.uprights['front-left'], x: -1500 };
      doc.uprights.beta = { ...doc.uprights['rear-right'], x: 1500 };
      doc.accessories.push({ id: 'pair', part, target: { uprightId: first, face: 'front', hole: 12 }, paired: true, pairTo: second, params: {} });
      const paired = validateAssembly(doc);
      const instances = resolveAssembly(paired).filter(p => p.ownerId === 'pair');
      assert.deepEqual(instances.map(p => p.id), [`pair:${firstSuffix}`, `pair:${secondSuffix}`], `${first}/${second}`);
      assert.deepEqual(instances.map(p => p.mount!.uprightId), [first, second]);
      paired.appearance = { overrides: { [instances[0].id]: '#123456', [instances[1].id]: '#abcdef' }, finishOverrides: { [instances[0].id]: 'stainless', [instances[1].id]: 'clear-grind' } };
      const restored = validateAssembly(JSON.parse(JSON.stringify(paired)));
      assert.deepEqual(resolveAssembly(restored).filter(p => p.ownerId === 'pair').map(p => p.id), instances.map(p => p.id));
      const split = unpairAccessory(restored, 'pair');
      assert.equal(split.appearance!.overrides![split.accessories[0].id], '#123456');
      assert.equal(split.appearance!.overrides![split.accessories[1].id], '#abcdef');
      assert.equal(split.appearance!.overrides!['pair:left'], undefined);
      assert.equal(split.appearance!.overrides!['pair:right'], undefined);
      assert.deepEqual(split.appearance!.finishOverrides, {
        [split.accessories[0].id]: 'stainless', [split.accessories[1].id]: 'clear-grind',
      });
    }
  });
}
