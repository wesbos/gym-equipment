/** Reproducible two-plate, six-color slicer acceptance fixtures. */
import Module from 'manifold-3d';
import { mkdirSync, writeFileSync } from 'node:fs';
import { catalog } from '../rack-generator/catalog.ts';
import { createAssembly } from '../rack-generator/assembly.ts';
import { exportPrint3MF } from '../src/exports/print-3mf.ts';
const directory = process.argv[2] ?? '.verification';
mkdirSync(directory, { recursive: true });
const api = await Module(); api.setup();
const doc = createAssembly();
doc.appearance = { frameColor: '#285A32', hardwareFinish: 'gold', overrides: { 'front-left': '#C83240' } };
for (const scale of [10,20] as const) for (const layout of ['laid-out', 'assembled'] as const) {
  const result = exportPrint3MF(api, doc, catalog.definitions, { layout, scale }, undefined, catalog.attribution);
  writeFileSync(`${directory}/rack-${layout}-1-${scale}.3mf`, result.bytes);
  writeFileSync(`${directory}/rack-${layout}-1-${scale}-report.json`, JSON.stringify(result.report, null, 2));
  console.log(`${layout}: ${result.report.instances} objects, ${result.report.volumes} volumes, ${result.report.triangles} triangles`);
}
