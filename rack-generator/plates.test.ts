import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { addAccessory, createAssembly, resolveAssembly, setPlateStack, unpairAccessory, validateAssembly } from './assembly.ts';
import { definitions } from './parts/attachments.ts';
import { buildPlateStack } from './parts/plates.ts';
import { swapCandidate } from './swap.ts';
import { PLATE_GAP, PLATE_PRESETS, PLATE_SPECS, expandRuns, plateParams, plateRoom, plateRuns, platesFromParams, plateStackLength, validatePlateStack, withoutPlateParams, type LegacyPlateId, type PlateId } from './plates.ts';
import { buildPrintInstance } from '../src/exports/print-build.ts';
const api = await Module(); api.setup();
const near = (a: number, b: number, e = .01) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const pin = (part = 'storage-pin-short', hole = 20) => addAccessory(createAssembly({ emptyAccessories: true }), part, { uprightId: 'rear-left', face: 'left', hole });

test('plate table uses IWF colors, 450 mm bumpers and published Rogue widths', () => {
  assert.deepEqual(['kg25', 'kg20', 'kg15', 'kg10'].map(id => PLATE_SPECS[id as LegacyPlateId].width), [88.9, 82.55, 66.675, 44.45]);
  assert.ok(['kg25', 'kg20', 'kg15', 'kg10'].every(id => PLATE_SPECS[id as LegacyPlateId].diameter === 450));
  assert.deepEqual(['lb45', 'lb35', 'lb25', 'lb10'].map(id => PLATE_SPECS[id as LegacyPlateId].diameter), [448, 360, 300, 228]);
  assert.equal(new Set(Object.values(PLATE_SPECS).map(s => s.code)).size, 8);
  near(plateStackLength(['kg15', 'kg15', 'kg10']), 66.675 * 2 + 44.45 + 2 * PLATE_GAP);
});

test('stacks are capped by the usable peg length with a clear error', () => {
  assert.deepEqual(validatePlateStack('storage-pin-short', ['kg15', 'kg15', 'kg10']), ['kg15', 'kg15', 'kg10']);
  assert.throws(() => validatePlateStack('storage-pin-short', ['kg25', 'kg25', 'kg25']), /Over capacity: these plates need 267.7 mm but the short storage pin holds 235 mm/);
  assert.deepEqual(validatePlateStack('storage-pin-long', ['kg25', 'kg25', 'kg15', 'kg15']).length, 4);
  assert.throws(() => validatePlateStack('storage-pin-long', ['kg25', 'kg25', 'kg25', 'kg25']), /long storage pin holds 350 mm/);
  assert.throws(() => validatePlateStack('landmine', ['kg10']), /Only weight storage pins/);
  assert.throws(() => validatePlateStack('storage-pin-short', ['kg30']), /Unknown weight plate/);
  assert.throws(() => validatePlateStack('storage-pin-short', 'kg10'), /at most/);
  near(plateRoom('storage-pin-short', ['kg15', 'kg15', 'kg10']), 235 - plateStackLength(['kg15', 'kg15', 'kg10']) - PLATE_GAP);
  assert.deepEqual(PLATE_PRESETS.filter(p => plateStackLength(p.plates) <= 235).map(p => p.id), ['fifteens-ten', 'pair-25', 'lb-set']);
  assert.ok(PLATE_PRESETS.every(p => plateStackLength(p.plates) <= 350));
});

test('weight × count runs and numeric geometry params round-trip', () => {
  const plates: PlateId[] = ['kg25', 'kg25', 'kg15', 'kg25'];
  assert.deepEqual(plateRuns(plates), [{ plate: 'kg25', count: 2 }, { plate: 'kg15', count: 1 }, { plate: 'kg25', count: 1 }]);
  assert.deepEqual(expandRuns(plateRuns(plates)), plates);
  assert.deepEqual(expandRuns([{ plate: 'kg10', count: 0 }]), []);
  assert.deepEqual(plateParams(plates), { plate1: 1, plate2: 1, plate3: 3, plate4: 1 });
  assert.deepEqual(platesFromParams({ width: 1, ...plateParams(plates) }), plates);
  assert.deepEqual(withoutPlateParams({ width: 1, ...plateParams(plates) }), { width: 1 });
  assert.throws(() => platesFromParams({ plate1: 99 }), /Unknown plate code/);
});

test('stack persists per storage-pin accessory, validates on load and resolves on both paired pins', () => {
  const doc = setPlateStack(pin(), 'accessory-1:left', ['kg15', 'kg15', 'kg10']);
  assert.deepEqual(doc.accessories[0].plates, ['kg15', 'kg15', 'kg10']);
  const loaded = validateAssembly(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(loaded.accessories[0].plates, ['kg15', 'kg15', 'kg10']);
  const pins = resolveAssembly(loaded).filter(r => r.ownerId === 'accessory-1');
  assert.equal(pins.length, 2);
  for (const r of pins) assert.deepEqual(platesFromParams(r.params), ['kg15', 'kg15', 'kg10']);
  assert.equal(setPlateStack(doc, 'accessory-1', []).accessories[0].plates, undefined);
  assert.equal(validateAssembly({ ...doc, accessories: [{ ...doc.accessories[0], plates: [] }] }).accessories[0].plates, undefined);
  assert.throws(() => setPlateStack(doc, 'accessory-1', ['kg25', 'kg25', 'kg25']), /Over capacity/);
  assert.throws(() => validateAssembly({ ...doc, accessories: [{ ...doc.accessories[0], plates: ['kg25', 'kg25', 'kg25'] }] }), /Over capacity/);
  assert.throws(() => validateAssembly({ ...doc, accessories: [{ ...doc.accessories[0], plates: ['kg99'] }] }), /Unknown weight plate/);
  const hook = addAccessory(createAssembly({ emptyAccessories: true }), 'landmine', { hole: 10 });
  assert.throws(() => setPlateStack(hook, 'accessory-1', ['kg10']), /Select a weight storage pin/);
  assert.throws(() => validateAssembly({ ...hook, accessories: [{ ...hook.accessories[0], plates: ['kg10'] }] }), /Only weight storage pins/);
  const split = unpairAccessory(doc, 'accessory-1');
  assert.deepEqual(split.accessories.map(a => a.plates), [['kg15', 'kg15', 'kg10'], ['kg15', 'kg15', 'kg10']]);
});

test('450 mm plates cannot pass through the floor, and swaps respect the shorter pin', () => {
  assert.throws(() => setPlateStack(pin('storage-pin-short', 2), 'accessory-1', ['kg10']), /reach through the floor/);
  assert.ok(setPlateStack(pin('storage-pin-short', 4), 'accessory-1', ['kg10']));
  const long = setPlateStack(pin('storage-pin-long'), 'accessory-1', ['kg25', 'kg25', 'kg15', 'kg15']);
  const swap = swapCandidate(long, 'accessory-1', 'storage-pin-short');
  assert.equal(swap.valid, false);
  assert.match(swap.valid ? '' : swap.reason, /Over capacity/);
  assert.equal(swapCandidate(setPlateStack(long, 'accessory-1', ['kg25']), 'accessory-1', 'storage-pin-short').valid, true);
});

const bounds = (solid: { boundingBox(): { min: number[]; max: number[] } }) => solid.boundingBox();
test('plate stack builder places closed solids from the origin along any axis', () => {
  const parts = buildPlateStack(api, ['kg25', 'lb45'], { origin: [10, 20, 30], axis: [0, 0, 2], name: 'bar' });
  try {
    assert.deepEqual(parts.map(p => p.name), ['bar-1 25 kg', 'bar-1 25 kg hub', 'bar-2 45 lb']);
    assert.ok(parts.every(p => p.role === 'source' && p.solid.status() === 'NoError' && p.solid.volume() > 0 && p.solid.genus() === 1));
    assert.equal(parts[0].color, PLATE_SPECS.kg25.color);
    const all = parts.map(p => bounds(p.solid));
    near(Math.min(...all.map(b => b.min[2])), 30); near(Math.max(...all.map(b => b.max[2])), 30 + 88.9 + PLATE_GAP + 38.1);
    near(all[0].max[0] - all[0].min[0], 450, 1); near((all[0].max[1] + all[0].min[1]) / 2, 20, .1);
    near(all[1].min[0], 10 - 45, .1); near(all[2].max[0] - all[2].min[0], 448, 1);
  } finally { parts.forEach(p => p.solid.delete()); }
  const side = buildPlateStack(api, ['kg10'], { origin: [0, 0, 0], axis: [-1, 0, 0] });
  try { near(bounds(side[0].solid).min[0], -44.45); near(bounds(side[0].solid).max[0], 0); } finally { side.forEach(p => p.solid.delete()); }
});

test('storage pins render their stack concentric on the peg; prints omit it', () => {
  for (const [part, start] of [['storage-pin-short', -65], ['storage-pin-long', -122.5]] as const) {
    const def = definitions.find(d => d.id === part)!, params = { ...def.defaults, ...plateParams(['kg15', 'kg15', 'kg10']) };
    const parts = def.build(api, params);
    try {
      const rod = bounds(parts.find(p => p.role === 'rod')!.solid), plates = parts.filter(p => p.name.startsWith('plate-')).map(p => bounds(p.solid));
      assert.equal(plates.length, 6);
      near(Math.min(...plates.map(b => b.min[0])), start); near(Math.max(...plates.map(b => b.max[0])), start + plateStackLength(['kg15', 'kg15', 'kg10']));
      assert.ok(Math.max(...plates.map(b => b.max[0])) < rod.max[0]);
      near((plates[0].min[1] + plates[0].max[1]) / 2, (rod.min[1] + rod.max[1]) / 2, .1);
      near((plates[0].min[2] + plates[0].max[2]) / 2, (rod.min[2] + rod.max[2]) / 2, .1);
    } finally { parts.forEach(p => p.solid.delete()); }
    const printed = buildPrintInstance(api, def, { params });
    try { assert.ok(!printed.some(p => p.name.startsWith('plate-'))); } finally { printed.forEach(p => p.solid.delete()); }
  }
});
