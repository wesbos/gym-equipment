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
const api = await Module(); api.setup();
for (const scale of [10,20] as const) test(`1:${scale} custom nameplate 3MF preserves CAD volume, through-cuts and watertight topology`, () => {
  const doc = replaceStructurePart(createAssembly({ emptyAccessories: true }), 'rear-crossmember', 'nameplate');
  const source = { kind: 'text' as const, text: 'BOS', font: 'helvetiker' as const };
  doc.logo = finalizeLogo(api, source, textContours(source), true);
  doc.removed = [...new Set(resolveAssembly(doc).map(r=>r.ownerId))].filter(id=>!['rear-left','rear-right','rear-crossmember'].includes(id));
  const instance = resolveAssembly(doc).find(r=>r.part==='nameplate')!, def = definitions.find(d=>d.id==='nameplate')!;
  const custom = def.build(api, {...def.defaults,...instance.params}, instance.logo), stock = def.build(api, {...def.defaults,...instance.params});
  try {
    const result = exportPrint3MF(api,doc,definitions,{layout:'laid-out',scale});
    const xml = strFromU8(unzipSync(result.bytes)['3D/3dmodel.model']);
    const model = new XMLParser({ignoreAttributes:false,attributeNamePrefix:'',parseAttributeValue:true}).parse(xml).model;
    const panel = model.resources.object.find((o:{name:string})=>o.name.includes('stencil'));
    const vertices = panel.mesh.vertices.vertex.flatMap((v:{x:number;y:number;z:number})=>[v.x,v.y,v.z]);
    const indices = panel.mesh.triangles.triangle.flatMap((t:{v1:number;v2:number;v3:number})=>[t.v1,t.v2,t.v3]);
    const exported = new api.Manifold(new api.Mesh({numProp:3,vertProperties:new Float32Array(vertices),triVerts:new Uint32Array(indices)}));
    try {
      assert.equal(exported.status(),'NoError');
      assert.ok(Math.abs(exported.volume()-custom[0].solid.volume()/scale**3)<.0001, 'custom CAD volume survives XML/Float32 and print orientation');
      assert.ok(Math.abs(exported.volume()-stock[0].solid.volume()/scale**3)>1000/scale**3, 'export did not silently use stock lettering');
      const shells = exported.decompose(); try { assert.equal(shells.length,1); } finally { shells.forEach(s=>s.delete()); }
    } finally { exported.delete(); }
  } finally { [...custom,...stock].forEach(p=>p.solid.delete()); }
});
