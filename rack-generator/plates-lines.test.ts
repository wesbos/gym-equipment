import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { addAccessory, createAssembly, resolveAssembly, setPlateStack, validateAssembly } from './assembly.ts';
import { definitions } from './parts/attachments.ts';
import { buildPlateStack } from './parts/plates.ts';
import {
  PLATE_GAP, PLATE_IDS, PLATE_LINES, isPlateId, lineSet, linePlates, plateFits, plateId, plateLine, plateParams, plateParts, plateSpec,
  platesFromParams, plateStackLength, plateTitle, plateTotals, validatePlateFloor, validatePlateStack, type PlateId,
} from './plates.ts';
const api = await Module(); api.setup();
const inch = (v: number) => v * 25.4;
const near = (a: number, b: number, e = .01, msg = '') => assert.ok(Math.abs(a - b) <= e, `${msg} ${a} != ${b} ±${e}`);
const pin = (part = 'storage-pin-long', hole = 20) => addAccessory(createAssembly({ emptyAccessories: true }), part, { uprightId: 'rear-left', face: 'left', hole });
const brandLines = PLATE_LINES.filter(l => !l.legacy);
const every = brandLines.flatMap(l => [...linePlates(l.id), ...(l.finishes ?? []).slice(1).map(f => linePlates(l.id, f.id)[0])]);

test('lines have unique stable codes, unique weight keys and vendor attribution', () => {
  assert.equal(new Set(PLATE_LINES.map(l => l.id)).size, PLATE_LINES.length);
  assert.equal(new Set(PLATE_LINES.map(l => l.code)).size, PLATE_LINES.length);
  assert.ok(brandLines.length >= 30, `${brandLines.length} brand lines`);
  for (const l of PLATE_LINES) {
    assert.equal(new Set(l.weights.map(w => w.key)).size, l.weights.length, l.id);
    assert.ok(l.weights.every(w => w.diameter > 50 && w.diameter <= 700 && w.width > 3 && w.width < 110 && w.weight > 0), l.id);
    if (l.legacy) continue;
    assert.ok(l.vendor && l.url.startsWith('https://') && l.trademark.includes('belong to') && l.reconstruction.length > 60, l.id);
  }
  // Codes stay within the geometry worker's (0, 4000] numeric parameter domain.
  const codes = every.map(id => plateSpec(id)!.code);
  assert.equal(new Set(codes).size, new Set(every.map(id => id.split('@')[0])).size);
  assert.ok(codes.every(c => Number.isInteger(c) && c > 8 && c <= 4000));
});

test('the eight default ids are the two default lines and keep their table', () => {
  assert.deepEqual(linePlates('standard-kg'), ['kg25', 'kg20', 'kg15', 'kg10']);
  assert.deepEqual(linePlates('standard-lb'), ['lb45', 'lb35', 'lb25', 'lb10']);
  assert.equal(plateId('standard-kg', '25'), 'kg25');
  assert.ok(PLATE_IDS.every(id => isPlateId(id) && plateParts(id)!.line.legacy));
  assert.equal(isPlateId('standard-kg:25'), false, 'default plates have one canonical id');
  assert.deepEqual(PLATE_IDS.map(id => plateSpec(id)!.code), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('ids parse, round-trip and reject junk', () => {
  for (const id of every) {
    assert.ok(isPlateId(id), id);
    const { line, weight, finish } = plateParts(id)!;
    assert.equal(plateId(line.id, weight.key, finish?.id), id);
    assert.equal(plateSpec(id)!.width, weight.width);
    assert.equal(plateSpec(id)!.diameter, weight.diameter);
    assert.match(plateTitle(id), new RegExp(line.brand.replace('.', '\\.')));
  }
  for (const junk of ['rogue-echo-v2:99', 'nope:45', 'rogue-echo-v2', 'wio-machined:45@black', 'wio-machined:45@chartreuse', 'ROGUE-ECHO-V2:45', 'kg30', 7, null, 'x'.repeat(200)])
    assert.equal(isPlateId(junk), false, String(junk));
  assert.throws(() => plateId('rogue-echo-v2', '99'), /Unknown plate/);
  assert.throws(() => plateId('wio-machined', '45', 'chartreuse'), /finish/);
  assert.equal(plateId('wio-machined', '45', 'black'), 'wio-machined:45', 'default finish is implicit');
  assert.equal(plateId('wio-machined', '45', 'red'), 'wio-machined:45@red');
  assert.equal(plateSpec('wio-machined:45@red')!.color, '#b8232a');
  assert.equal(plateSpec('microgainz-olympic:0.5@color')!.color, '#c7282f', 'multi-colour finish colours per weight');
});

test('published dimensions per weight are in the table', () => {
  const spec = (id: string) => plateSpec(id)!;
  const cases: [string, number, number, number?][] = [
    // id, diameter, width (mm), tolerance
    ['rogue-echo-v2:45', 450, inch(2.4)], ['rogue-echo-v2:10', 450, inch(.83)], ['rogue-color-echo:55', 450, inch(2.75)],
    ['rogue-mil-echo:45', 450, inch(2.72)], ['rogue-fleck:55', 450, inch(3.02)], ['rogue-hg2-kg:25', 450, inch(3.5)], ['rogue-hg2-kg:5', 450, inch(1)],
    ['rogue-hg2-lb:55', 450, inch(3.75)], ['rogue-lb-competition:45', 450, inch(2.15)], ['rogue-deep-dish:100', 450, 75], ['rogue-deep-dish:25', 276, 34.5],
    ['rogue-deep-dish-arnold:45', 450, 50], ['rogue-calibrated-kg:25', 450, 27], ['rogue-calibrated-kg:15', 400, 21], ['rogue-calibrated-lb:0.25', 90, 5],
    ['rogue-lb-change:1.25', 133.3, 10], ['rogue-lb-change:10', 230, 26], ['rogue-26er:70', inch(26), inch(3.97)],
    ['strength-co-iron:45', inch(17.75), inch(1.25)], ['strength-co-iron:100', inch(17.75), inch(2.25)], ['cap-olympic-iron:100', inch(17.75), inch(2.5)],
    ['cap-olympic-iron:25', inch(11), inch(1.5)], ['york-legacy-milled:35', inch(14.875), inch(1.375)], ['wio-machined:45', inch(17.72), inch(.75)],
    ['wio-machined:100', inch(17.72), inch(1.75)], ['ivanko-om:45', inch(17.75), inch(1.5625)], ['ivanko-om:1.25', inch(5.25), inch(.5)],
    ['rep-equalizer:45', inch(17.7), inch(1.8)], ['rep-change:5', inch(8.25), inch(.75)], ['rep-black-bumper:45', inch(17.7), inch(2.8)],
    ['rep-old-school:25', inch(10.7), inch(1.5)], ['fringe-black:55', 450, inch(3.2)], ['fringe-savage:10', 445, inch(1.05)],
    ['cap-bumper:45', inch(17.75), inch(2.6)], ['balancefrom-bumper:55', inch(17.75), inch(3.66)], ['homegrown-bumper:45ht', inch(17.72), inch(2.4)],
    ['homegrown-bumper:45', inch(17.72), inch(3.6)], ['microgainz-olympic:1.25', inch(3.5), inch(.815)], ['microgainz-olympic:2.5', 177.8, inch(.25)],
    ['titan-wagon-wheel:45', inch(26), inch(2)],
  ];
  for (const [id, d, w, e = .02] of cases) { near(spec(id).diameter, d, e, `${id} diameter`); near(spec(id).width, w, e, `${id} width`); }
  // Fitness Gear publishes no sizes: the 45 lb photo measurement must agree with the owner's "about 15.5 in" within 3 %,
  // and the line carries the six weights Dick's sells, tri-grip windows and no kg marking.
  const fg = plateLine('fitness-gear-olympic-cast')!;
  assert.deepEqual(fg.weights.map(w => w.weight), [45, 35, 25, 10, 5, 2.5]);
  near(spec('fitness-gear-olympic-cast:45').diameter, inch(15.5), inch(15.5) * .03, 'Fitness Gear 45 lb vs owner measurement');
  assert.ok(fg.face.grips?.kind === 'tri' && fg.face.grips.n === 3 && fg.weights.every(w => w.est) && !fg.markings.some(m => m.text.includes('{k')));
});

test('every plate of every line and finish builds valid closed solids that match its table size', () => {
  for (const id of every) {
    const s = plateSpec(id)!, parts = buildPlateStack(api, [id], { origin: [0, 0, 0], axis: [0, 0, 1] });
    try {
      assert.ok(parts.length >= 1 && parts.every(p => p.role === 'source' && p.solid.status() === 'NoError' && !p.solid.isEmpty() && p.solid.volume() > 0), id);
      const boxes = parts.map(p => p.solid.boundingBox());
      near(Math.min(...boxes.map(b => b.min[2])), 0, .01, `${id} back face`);
      near(Math.max(...boxes.map(b => b.max[2])), s.width, .01, `${id} front face`);
      near(Math.max(...boxes.map(b => b.max[0])) - Math.min(...boxes.map(b => b.min[0])), s.diameter, .6, `${id} diameter`);
      assert.ok(parts.reduce((n, p) => n + p.solid.numTri(), 0) < 40000, `${id} triangle budget`);
      // Every plate leaves the 50.4 mm Olympic bore clear.
      for (const p of parts) assert.equal(p.solid.intersect(api.Manifold.cylinder(s.width + 2, 25.1, 25.1, 32).translate([0, 0, -1])).volume(), 0, `${id}${p.name} bore`);
    } finally { parts.forEach(p => p.solid.delete()); }
  }
});

test('recognisable features: hubs, discs, markings, grips and patterns land where the recipe says', () => {
  const names = (id: PlateId) => { const parts = buildPlateStack(api, [id], { origin: [0, 0, 0], axis: [0, 0, 1] }); const n = parts.map(p => p.name); parts.forEach(p => p.solid.delete()); return n; };
  assert.ok(names('rogue-echo-v2:45').some(n => n.endsWith(' hub')) && names('rogue-echo-v2:45').some(n => n.endsWith(' markings')));
  assert.ok(names('rogue-lb-competition:45').some(n => n.endsWith(' steel disc')));
  assert.ok(names('rogue-fleck:45').some(n => n.endsWith(' pattern')) && names('homegrown-bumper:25').some(n => n.endsWith(' pattern')));
  assert.ok(names('balancefrom-bumper:45').some(n => n.endsWith(' markings')));
  // Grip cut-outs remove material: an Equalizer 45 weighs less (volume) than the same revolve without holes would.
  const vol = (id: PlateId) => { const parts = buildPlateStack(api, [id], { origin: [0, 0, 0], axis: [0, 0, 1] }); const v = parts[0].solid.volume(); parts.forEach(p => p.solid.delete()); return v; };
  const equalizer = plateSpec('rep-equalizer:45')!, disc = Math.PI * ((equalizer.diameter / 2) ** 2 - 39 ** 2) * equalizer.width;
  assert.ok(vol('rep-equalizer:45') < disc * .8, 'six hex windows');
  const titan = plateSpec('titan-wagon-wheel:45')!;
  assert.ok(vol('titan-wagon-wheel:45') < Math.PI * (titan.diameter / 2) ** 2 * 9.525, 'wedge windows in the 3/8" disc');
  // Simple detail drops markings and patterns but keeps the plate size.
  const simple = buildPlateStack(api, ['rogue-fleck:45'], { origin: [0, 0, 0], axis: [0, 0, 1], detail: 'simple' });
  try {
    assert.equal(simple.length, 2);
    assert.ok(simple[1].name.endsWith(' hub') && simple.every(p => !/ (markings|pattern)/.test(p.name)));
    near(simple[0].solid.boundingBox().max[2], plateSpec('rogue-fleck:45')!.width);
  } finally { simple.forEach(p => p.solid.delete()); }
});

test('stack options stay backward compatible: facing, clock and gap', () => {
  const plates: PlateId[] = ['rogue-echo-v2:45', 'kg10', 'rogue-lb-competition:25'];
  const base = buildPlateStack(api, plates, { origin: [0, 0, 0], axis: [1, 0, 0] });
  const flipped = buildPlateStack(api, plates, { origin: [0, 0, 0], axis: [1, 0, 0], facing: 'in', clock: Math.PI / 5, gap: 2 });
  try {
    const span = (parts: typeof base) => { const b = parts.map(p => p.solid.boundingBox()); return [Math.min(...b.map(x => x.min[0])), Math.max(...b.map(x => x.max[0]))]; };
    near(span(base)[0], 0); near(span(base)[1], plateStackLength(plates));
    near(span(flipped)[1], plateStackLength(plates, 2));
    assert.equal(plateStackLength(plates, 2) - plateStackLength(plates), 2 * 1.5);
    // Facing 'in' puts the competition disc (front face) toward the origin side of its slot.
    const disc = (parts: typeof base) => parts.find(p => p.name.endsWith(' steel disc'))!.solid.boundingBox();
    const slot = plateStackLength(plates.slice(0, 2)) + PLATE_GAP;
    near(disc(base).max[0], slot + plateSpec('rogue-lb-competition:25')!.width, .01);
    near(disc(flipped).min[0], plateStackLength(plates.slice(0, 2), 2) + 2, .01);
    assert.equal(base.length, flipped.length);
  } finally { [...base, ...flipped].forEach(p => p.solid.delete()); }
});

test('geometry params round-trip lines and finishes, and pins render them concentric', () => {
  const plates: PlateId[] = ['rogue-hg2-lb:45', 'wio-machined:25@red', 'kg15', 'microgainz-olympic:0.25@color', 'microgainz-olympic:0.25'];
  const params = plateParams(plates);
  assert.ok(Object.values(params).every(v => v > 0 && v <= 4000));
  assert.equal(params.plate2c, 3); assert.equal(params.plate4c, 1); assert.equal(params.plate5c, undefined);
  assert.deepEqual(platesFromParams(params), plates);
  assert.throws(() => platesFromParams({ plate1: plateSpec('wio-machined:25')!.code, plate1c: 42 }), /finish/);
  const def = definitions.find(d => d.id === 'storage-pin-long')!, load: PlateId[] = ['rogue-hg2-lb:45', 'rogue-hg2-lb:45', 'rogue-lb-competition:45'];
  const parts = def.build(api, { ...def.defaults, ...plateParams(load) });
  try {
    const rod = parts.find(p => p.role === 'rod')!.solid.boundingBox(), plates3 = parts.filter(p => p.name.startsWith('plate-')).map(p => p.solid.boundingBox());
    near(Math.min(...plates3.map(b => b.min[0])), -122.5); near(Math.max(...plates3.map(b => b.max[0])), -122.5 + plateStackLength(load));
    assert.ok(Math.max(...plates3.map(b => b.max[0])) < rod.max[0]);
    near((plates3[0].min[2] + plates3[0].max[2]) / 2, (rod.min[2] + rod.max[2]) / 2, .1);
  } finally { parts.forEach(p => p.solid.delete()); }
});

test('storage-peg capacity uses the per-weight widths', () => {
  const hg45 = plateId('rogue-hg2-lb', '45'), cal45 = plateId('rogue-calibrated-lb', '45');
  assert.deepEqual(validatePlateStack('storage-pin-short', [hg45, hg45]).length, 2);
  assert.throws(() => validatePlateStack('storage-pin-short', [hg45, hg45, hg45]), /Over capacity: these plates need 248.7 mm but the short storage pin holds 235 mm/);
  assert.equal(plateFits('storage-pin-short', [], cal45), 10);
  assert.equal(validatePlateStack('storage-pin-short', Array(10).fill(cal45)).length, 10);
  assert.throws(() => validatePlateStack('storage-pin-short', Array(11).fill(cal45)), /Over capacity/);
  assert.equal(plateFits('storage-pin-long', [hg45], hg45), 3);
  for (const id of [hg45, cal45, 'microgainz-olympic:0.25' as PlateId, 'rogue-26er:70' as PlateId]) {
    const n = plateFits('storage-pin-long', [], id);
    assert.doesNotThrow(() => validatePlateStack('storage-pin-long', Array(Math.min(n, 16)).fill(id)));
    if (n < 16) assert.throws(() => validatePlateStack('storage-pin-long', Array(n + 1).fill(id)), /Over capacity/);
  }
  assert.throws(() => validatePlateFloor(['rogue-26er:70'], 300), /660.4 mm plates would reach through the floor/);
  assert.doesNotThrow(() => validatePlateFloor(['rogue-26er:70'], 331));
  assert.deepEqual(plateTotals(['rogue-hg2-kg:25', 'rogue-hg2-lb:45', 'microgainz-olympic:0.25', 'microgainz-olympic:0.5']), { kg: 25, lb: 45.75 });
  assert.deepEqual(lineSet('rogue-deep-dish').map(id => plateSpec(id)!.weight), [100, 45, 35, 25, 10, 5]);
  assert.deepEqual(lineSet('homegrown-bumper').map(id => plateSpec(id)!.key), ['45ht', '35', '25', '15', '10']);
});

test('brand plates persist in saved documents, resolve on both pins and reject unknown ids on load', () => {
  const stack: PlateId[] = ['rogue-color-echo:55', 'rogue-color-echo:45', 'wio-machined:10@purple'];
  const doc = setPlateStack(pin(), 'accessory-1:left', stack);
  const loaded = validateAssembly(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(loaded.accessories[0].plates, stack);
  const pins = resolveAssembly(loaded).filter(r => r.ownerId === 'accessory-1');
  assert.equal(pins.length, 2);
  for (const r of pins) assert.deepEqual(platesFromParams(r.params), stack);
  assert.throws(() => validateAssembly({ ...doc, accessories: [{ ...doc.accessories[0], plates: ['rogue-color-echo:65'] }] }), /Unknown weight plate/);
  // Legacy documents keep loading identically.
  const legacy = setPlateStack(pin(), 'accessory-1', ['kg25', 'kg25', 'lb45']);
  assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(legacy))).accessories[0].plates, ['kg25', 'kg25', 'lb45']);
  assert.deepEqual(plateParams(['kg25', 'lb45']), { plate1: 1, plate2: 5 });
  assert.ok(plateLine('rogue-color-echo')!.weights.length === 6);
});
