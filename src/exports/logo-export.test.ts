import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { createAssembly, replaceStructurePart, resolveAssembly } from '../../rack-generator/assembly.ts';
import { definitions } from '../../rack-generator/catalog.ts';
import { finalizeLogo } from '../../rack-generator/logos/contours.ts';
import { textContours } from '../../rack-generator/logos/sources.ts';
import { exportPrint3MF } from './print-3mf.ts';
import { printMinFeature } from '../../rack-generator/print-detail.ts';
const api = await Module(); api.setup();
for (const scale of [10,20] as const) for (const part of ['nameplate', 'branded-crossmember', 'branded-crossmember-lite'] as const) test(`1:${scale} custom ${part} 3MF preserves CAD volume, through-cuts and watertight topology`, () => {
  const doc = replaceStructurePart(createAssembly({ emptyAccessories: true }), 'rear-crossmember', part);
  const source = { kind: 'text' as const, text: 'BOS', font: 'helvetiker' as const };
  doc.logo = finalizeLogo(api, source, textContours(source), true);
  doc.removed = [...new Set(resolveAssembly(doc).map(r=>r.ownerId))].filter(id=>!['rear-left','rear-right','rear-crossmember'].includes(id));
  const instance = resolveAssembly(doc).find(r=>r.part===part)!, def = definitions.find(d=>d.id===part)!;
  // Compare against the print-detail CAD build the exporter makes (#89).
  const params = {...def.defaults,...instance.params,printMinFeature:printMinFeature(scale)};
  const custom = def.build(api, params, instance.logo), stock = def.build(api, params);
  const index = custom.findIndex(p=>/stencil|branded/.test(p.name));
  // The export contract removes overlaps owned by later components (end flanges).
  const expected = api.Manifold.difference(custom.slice(index).map(p=>p.solid));
  const stockExpected = api.Manifold.difference(stock.slice(index).map(p=>p.solid));
  try {
    const result = exportPrint3MF(api,doc,definitions,{layout:'laid-out',scale});
    const xml = strFromU8(unzipSync(result.bytes)['3D/3dmodel.model']);
    const model = new XMLParser({ignoreAttributes:false,attributeNamePrefix:'',parseAttributeValue:true}).parse(xml).model;
    const panel = model.resources.object.find((o:{name:string})=>/stencil|branded/.test(o.name));
    const vertices = panel.mesh.vertices.vertex.flatMap((v:{x:number;y:number;z:number})=>[v.x,v.y,v.z]);
    const indices = panel.mesh.triangles.triangle.flatMap((t:{v1:number;v2:number;v3:number})=>[t.v1,t.v2,t.v3]);
    const exported = new api.Manifold(new api.Mesh({numProp:3,vertProperties:new Float32Array(vertices),triVerts:new Uint32Array(indices)}));
    try {
      assert.equal(exported.status(),'NoError');
      // Float32 tolerance scales with volume; retain the full-size one-ppm budget.
      const expectedVolume = expected.volume()/scale**3;
      const tolerance = Math.max(.1, expected.volume() * 1e-6)/scale**3;
      assert.ok(Math.abs(exported.volume()-expectedVolume)<tolerance, `custom CAD volume survives XML/Float32: exported ${exported.volume()}, CAD ${expectedVolume}`);
      // The lite logo's ~3 mm strokes are sub-nozzle at both scales, so print
      // detail suppresses it just like the stock lettering (#89).
      const suppressed = part === 'branded-crossmember-lite';
      assert.equal(Math.abs(exported.volume()-stockExpected.volume()/scale**3)>1000/scale**3, !suppressed, 'export did not silently use stock lettering');
      const shells = exported.decompose(); try { assert.equal(shells.length,1); } finally { shells.forEach(s=>s.delete()); }
    } finally { exported.delete(); }
  } finally { expected.delete(); stockExpected.delete(); [...custom,...stock].forEach(p=>p.solid.delete()); }
});
