import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addAccessory, createAssembly, resolveAssembly, resizeAssembly } from './assembly.ts';
import { detectCollisions } from './assembly-collisions.ts';
import type { ResolvedInstance, Vec3 } from './types.ts';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function world(instance: ResolvedInstance, [x, y, z]: Vec3): Vec3 {
  const a = instance.rotation[2];
  return [x * Math.cos(a) - y * Math.sin(a) + instance.position[0],
    x * Math.sin(a) + y * Math.cos(a) + instance.position[1], z + instance.position[2]];
}

test('sphere grips face outward while all four anchors retain upper-rail stations', () => {
  for (const depth of [425, 725, 1075]) for (const row of ['front', 'rear']) {
    const base = resizeAssembly(createAssembly({ emptyAccessories: true }), { depth });
    const doc = addAccessory(base, 'pullup-sphere', { uprightId: `${row}-left`, face: 'right' });
    const instances = resolveAssembly(doc), bar = instances.find(x => x.kind === 'accessory')!;
    const outward = row === 'front' ? -1 : 1;
    const center = outward * (depth / 2 - 212.5);
    assert.equal(bar.rotation[2], row === 'front' ? Math.PI : 0);
    // Source plate center and large/small sphere centers, in decoded millimetres.
    close(world(bar, [0, -46.194, 30])[1], center);
    for (const [x, y] of [[350, 158.806], [200, 108.806]]) {
      const grip = world(bar, [x, y, 99.639]);
      assert.ok(outward * (grip[1] - center) > 0, 'grip projects toward the user');
      assert.ok(Math.abs(grip[1]) < depth / 2, 'sphere center remains reachable inside the rack');
    }
    assert.equal(bar.mounts.length, 4);
    for (const m of bar.mounts) {
      const point = world(bar, m.localAnchor!);
      point.forEach((v, i) => close(v, m.position[i]));
      close(point[0], (m.connectorId === 'left-upper-crossmember' ? -1 : 1) * doc.rack.width / 2);
      close(Math.abs(point[1] - center), 150);
      // Rail bores begin 62.5 mm in from the clear span end, on a 50 mm pitch.
      close((point[1] + depth / 2 - 62.5) / 50, Math.round((point[1] + depth / 2 - 62.5) / 50));
      const rail = instances.find(x => x.id === m.connectorId)!;
      close(point[2], world(rail, [0, 0, 75])[2]);
    }
    if (row === 'front') assert.deepEqual(detectCollisions(instances), []);
    else {
      // The unchanged rear placement still warns about the rear width beam.
      assert.deepEqual(detectCollisions(instances).map(c => c.ids), [[bar.id, 'rear-crossmember']]);
      assert.deepEqual(detectCollisions(instances.filter(x => x.id !== 'rear-crossmember')), []);
    }
    // Collision envelopes follow the same rotation as the rendered solid.
    const grip = world(bar, [350, 158.806, 99.639]);
    assert.equal(detectCollisions([bar, { id: 'obstruction', part: 'custom', kind: 'accessory',
      position: grip, rotation: [0, 0, 0], collisionBoxes: [{ min: [-5, -5, -5], max: [5, 5, 5] }] }]).length, 1);
  }
});

test('straight and ordinary multi-grip placements retain their original transforms', () => {
  for (const row of ['front', 'rear']) for (const part of ['pullup-straight', 'pullup-multigrip']) {
    const doc = addAccessory(createAssembly({ emptyAccessories: true }), part, { uprightId: `${row}-left`, face: 'right' });
    const bar = resolveAssembly(doc).find(x => x.kind === 'accessory')!;
    assert.equal(bar.rotation[2], 0);
    close(bar.position[1], (row === 'front' ? -1 : 1) * (part === 'pullup-straight' ? 400 : 175));
    for (const m of bar.mounts) world(bar, m.localAnchor!).forEach((v, i) => close(v, m.position[i]));
  }
});
