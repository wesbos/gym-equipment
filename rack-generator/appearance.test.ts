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

test('steel finishes retain legacy paint, physical side overrides and flat export colors', () => {
  const doc = createAssembly();
  doc.appearance = { frameFinish: 'stainless', frameColor: '#ff0000', overrides: { 'jhooks-front:left': '#0000ff' }, finishOverrides: { 'jhooks-front:right': 'clear-grind' } };
  const appearance = validateAssembly(doc).appearance!;
  assert.notEqual(appearance.finishOverrides, doc.appearance.finishOverrides);
  assert.equal(resolveMaterial({ role: 'frame' }, appearance, 'front-left').color, '#c5c9cc');
  assert.equal(resolveMaterial({ role: 'frame' }, appearance, 'jhooks-front:left').color, '#0000ff');
  assert.equal(resolveMaterial({ role: 'frame' }, appearance, 'jhooks-front:right').finish, 'clear-grind');
  const next = unpairAccessory(doc, 'jhooks-front');
  const hooks = resolveAssembly(next).filter(r => r.part === 'j-hook-standard');
  assert.deepEqual(hooks.map(r => resolveMaterial({ role: 'frame' }, next.appearance, r.id).color).sort(), ['#0000ff', '#aaa59a']);
  assert.equal(resolveMaterial({ role: 'rod', color: '#123456' }, appearance).color, '#123456');
  for (const invalid of [{ frameFinish: '__proto__' }, { finishOverrides: { x: 'chrome' } }, { finishOverrides: JSON.parse('{"__proto__":"paint"}') }, { finishOverrides: Array(3) }]) {
    assert.throws(() => validateAssembly({ ...doc, appearance: invalid }));
  }
});

test('powder coat is dielectric even when source CAD assigns metallic PBR', () => {
  for (const color of ['#ffffff', '#ffff00', '#17191a']) {
    const material = resolveMaterial({ role: 'frame', metalness: 0.9, roughness: 0.1 }, { frameColor: color });
    assert.equal(material.color, color);
    assert.equal(material.metalness, 0);
    assert.equal(material.roughness, 0.55);
  }
  assert.equal(resolveMaterial({ role: 'frame' }, { frameFinish: 'stainless' }).metalness, 1);
  assert.equal(resolveMaterial({ role: 'frame' }, { frameFinish: 'clear-grind' }).metalness, 1);
});
