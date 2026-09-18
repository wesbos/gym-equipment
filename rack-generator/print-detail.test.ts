import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { definitions } from './parts/structure.ts';
import { printMinFeature } from './print-detail.ts';
import type { ValidatedLogo } from './logos/types.ts';
import type { NumericParams, SolidPart } from './types.ts';
const api = await Module(); api.setup();
const def = (id: string) => definitions.find(d => d.id === id)!;
const build = <T>(id: string, extra: NumericParams, read: (parts: SolidPart[]) => T, logo?: ValidatedLogo) => {
  const parts = def(id).build(api, { ...def(id).defaults, ...extra }, logo);
  try { return read(parts); } finally { parts.forEach(p => p.solid.delete()); }
};
const volume = (id: string, extra: NumericParams, logo?: ValidatedLogo) => build(id, extra, parts => parts[0].solid.volume(), logo);
test('print min feature is 2 × 0.4 mm nozzle at print scale, in source millimetres', () => {
  assert.equal(printMinFeature(10), 8); assert.equal(printMinFeature(20), 16);
});
test('simplified upright has no station-number cuts: every face opening is a bore', () => {
  // Slice through the numbered face wall (y = −width/2 + wall/2).
  const faceLoops = (extra: NumericParams) => build('upright', extra, parts => {
    const rotated = parts[0].solid.rotate([-90, 0, 0]), slice = rotated.slice(36);
    try {
      return slice.toPolygons().map(loop => {
        const xs = loop.map(p => p[0]), zs = loop.map(p => p[1]);
        return [Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)];
      });
    } finally { rotated.delete(); slice.delete(); }
  });
  const holes = (loops: number[][]) => loops.filter(([w, h]) => h < 1000 && w < 70);
  const full = holes(faceLoops({})), simplified = holes(faceLoops({ printMinFeature: 8 }));
  const bore = ([w, h]: number[]) => Math.abs(w - 25) < .1 && Math.abs(h - 25) < .1;
  assert.ok(full.some(l => !bore(l)), 'on-screen build keeps the laser-cut digits');
  assert.ok(simplified.length && simplified.every(bore), 'print build keeps only the hole column');
  assert.equal(simplified.length, full.filter(bore).length);
  assert.ok(volume('upright', { printMinFeature: 8 }) > volume('upright', {}));
});
test('stencil cuts below the printable width are removed; printable lettering and full detail stay', () => {
  const none = { printMinFeature: 1e6 }, full = volume('nameplate', {});
  assert.ok(volume('nameplate', { printMinFeature: 8 }) < volume('nameplate', none) - 50_000, '1:10 keeps the large stencil');
  assert.ok(volume('nameplate', { printMinFeature: 8 }) > full, 'bridges widen and thin strokes close');
  assert.ok(Math.abs(volume('nameplate', { printMinFeature: 16 }) - volume('nameplate', none)) < 1e-6, '1:20 stencil is sub-nozzle');
  assert.ok(Math.abs(volume('branded-crossmember-lite', { printMinFeature: 8 }) - volume('branded-crossmember-lite', none)) < 1e-6, 'lite stencil is sub-nozzle at 1:10');
  assert.ok(volume('branded-crossmember-lite', {}) < volume('branded-crossmember-lite', none) - 1000);
});
test('user logo cuts narrower than the printable width are suppressed, wider ones kept', () => {
  const bar = (x0: number, x1: number, h: number) => [[x0, -h / 2], [x1, -h / 2], [x1, h / 2], [x0, h / 2], [x0, -h / 2]] as [number, number][];
  const logo = (loops: [number, number][][]): ValidatedLogo => ({ version: 1, source: { kind: 'text', text: 'X', font: 'helvetiker' }, loops, minimum: .8, bridges: 0, warnings: [] });
  // Nameplate logo scale is 10/3: the 1.5 mm bar is 5 mm (0.5 mm printed at 1:10).
  const thin = bar(-60, -50, 1.5), thick = bar(20, 50, 6);
  const plain = volume('nameplate', { printMinFeature: 8 }, logo([thin, thick]));
  const without = volume('nameplate', { printMinFeature: 8 }, logo([thick]));
  const fullBoth = volume('nameplate', {}, logo([thin, thick])), fullThick = volume('nameplate', {}, logo([thick]));
  assert.ok(Math.abs(plain - without) < 1e-3, 'thin logo feature suppressed');
  assert.ok(fullThick - fullBoth > 800, 'on-screen build keeps the thin cut');
  assert.ok(volume('nameplate', { printMinFeature: 1e6 }, logo([thick])) - without > 9_000, 'wide logo cut kept');
});
