import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMaterial, HARDWARE_FINISHES, type MaterialRole } from './appearance.ts';
import { createAssembly, validateAssembly, resizeAssembly, unpairAccessory, resolveAssembly } from './assembly.ts';
import { attachmentMaterialRole } from './parts/attachment-materials.ts';

test('appearance is optional, validated, detached and preserved by assembly edits', () => {
  const old = createAssembly();
  assert.equal(validateAssembly(old).appearance, undefined);
  old.appearance = { frameColor: '#ff0000', hardwareFinish: 'gold', overrides: { 'jhooks-front:left': '#0000ff' } };
  const next = resizeAssembly(old, { width: 1200 });
  assert.deepEqual(next.appearance, old.appearance);
  assert.notEqual(next.appearance?.overrides, old.appearance.overrides);
  assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(next))), next);
  for (const appearance of [null, [], { frameColor: 'red' }, { hardwareFinish: 'silver' }, { hardwareFinish: '__proto__' }, { overrides: { x: 'bad' } }, { overrides: JSON.parse('{"__proto__":"#ffffff"}') }]) {
    assert.throws(() => validateAssembly({ ...old, appearance }));
  }
});
test('only semantic fasteners use hardware finish; non-frame materials retain source PBR', () => {
  for (const finish of ['chrome', 'gold', 'oxide'] as const) {
    assert.deepEqual(resolveMaterial({ role: 'fastener', color: '#123456' }, { hardwareFinish: finish }), HARDWARE_FINISHES[finish]);
    for (const role of ['handle', 'rod', 'sleeve', 'liner', 'source'] as MaterialRole[]) {
      assert.deepEqual(resolveMaterial({ role, color: '#123456', metalness: 0.91, roughness: 0.31 }, { frameColor: '#ff0000', hardwareFinish: finish, overrides: { a: '#ffffff' } }, 'a'), { color: '#123456', metalness: 0.91, roughness: 0.31 });
    }
  }
  assert.deepEqual(resolveMaterial({ role: 'fastener' }), HARDWARE_FINISHES.chrome);
});
test('global changes preserve independent side overrides and unpairing transfers them', () => {
  const doc = createAssembly();
  doc.appearance = { frameColor: '#ff0000', overrides: { 'jhooks-front:left': '#0000ff', 'jhooks-front:right': '#00ff00' } };
  doc.appearance.frameColor = '#ffff00';
  assert.equal(resolveMaterial({ role: 'frame' }, doc.appearance, 'jhooks-front:left').color, '#0000ff');
  assert.equal(resolveMaterial({ role: 'frame' }, doc.appearance, 'jhooks-front:right').color, '#00ff00');
  assert.equal(resolveMaterial({ role: 'frame' }, doc.appearance, 'front-left').color, '#ffff00');
  const unpaired = unpairAccessory(doc, 'jhooks-front');
  const hooks = resolveAssembly(unpaired).filter(r => r.part === 'j-hook-standard');
  assert.deepEqual(hooks.map(r => resolveMaterial({ role: 'frame' }, unpaired.appearance, r.id).color).sort(), ['#0000ff', '#00ff00']);
});
test('mixed CAD groups and metallic accessories are explicitly classified', () => {
  assert.equal(attachmentMaterialRole('dip-horn', 'bolts-and-metal-plates', 6), 'frame');
  assert.equal(attachmentMaterialRole('dip-horn', 'bolts-and-metal-plates', 9), 'fastener');
  assert.equal(attachmentMaterialRole('j-hook-roller', 'roller.012', 0), 'sleeve');
  assert.equal(attachmentMaterialRole('storage-pin-long', 'solid.042', 2), 'rod');
  assert.equal(attachmentMaterialRole('dip-bar-adjustable', 'Arm.003', 12), 'handle');
  assert.equal(attachmentMaterialRole('new-part', 'metallic-bolts', 0), 'source');
});
