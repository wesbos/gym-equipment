import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';
import { catalog } from '../../rack-generator/catalog.ts';
import { createAssembly, addAccessory } from '../../rack-generator/assembly.ts';
import { exportPrint3MF } from './print-3mf.ts';
const api = await Module(); api.setup();
test('front/rear Darko pair exports unique physical objects, wordmarks and registered credits', () => {
 const doc=createAssembly({emptyAccessories:true});
 doc.connections.push({id:'front-width',from:'front-left',to:'front-right',level:'upper'});
 const paired=addAccessory(doc,'darko-anchor',{kind:'crossmember-top',connectionId:'front-width',station:4,side:1,uprightId:'front-left',face:'front',hole:0},true);
 // Isolate vendor export semantics; the catalog-wide test exercises full frame CAD.
 const builders=catalog.definitions.map(def=>def.id.startsWith('darko-')?def:{...def,build:()=>[{name:'Frame fixture',solid:api.Manifold.cube([1,1,1]),role:'frame' as const}]});
 const result=exportPrint3MF(api,paired,builders,{layout:'assembled'},undefined,catalog.attribution);
 const parts=result.report.parts.filter(p=>p.part==='darko-anchor' && p.plate==='Parts');
 assert.equal(parts.length,2);assert.equal(new Set(parts.map(p=>p.id)).size,2);
 const files=unzipSync(result.bytes),xml=strFromU8(files['3D/3dmodel.model']);
 assert.equal((xml.match(/name="Darko Lifting official wordmark"/g)??[]).length,2);
 const credits=JSON.parse(strFromU8(files['Metadata/print-report.json'])).vendorCredits;
 assert.deepEqual(credits,[{part:'darko-anchor',attribution:catalog.attribution!('darko-anchor')}]);
 assert.ok(xml.includes('Darko Lifting'));assert.ok(xml.includes('Copyright'));
});
