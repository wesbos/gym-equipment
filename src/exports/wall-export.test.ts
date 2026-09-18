import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {unzipSync,strFromU8} from 'fflate';
import {exportPrint3MF} from './print-3mf.ts';
import {addWallItem} from '../../rack-generator/wall-items.ts';
import {placeHang} from '../../rack-generator/hang-items.ts';
import {createAssembly,resolveAssembly} from '../../rack-generator/assembly.ts';
import type {PartDefinition} from '../../rack-generator/types.ts';
const api=await Module();api.setup();
test('both print scales exclude wall items and hung attachments (GLB-only scenery) before CAD and plate/XML metadata',()=>{
 const doc=placeHang(addWallItem(addWallItem(createAssembly(),'pegboard-panel'),'pegboard-panel'),'rep-lat-bar-48',{panel:'wall-1',slot:5});let panelBuilds=0;
 const definitions:PartDefinition[]=[...new Set(resolveAssembly(doc).map(e=>e.part))].map(id=>({id,name:id,category:'test',defaults:{},build:()=>{if(id==='pegboard-panel'||id==='rep-lat-bar-48'){panelBuilds++;throw Error('Wall panels must not build for printing');}return [{name:id,role:'frame',solid:api.Manifold.cube([10,10,10])}];}}));
 for(const scale of [10,20] as const){const {bytes,report}=exportPrint3MF(api,doc,definitions,{layout:'laid-out',scale});assert.equal(panelBuilds,0);assert.deepEqual(report.excludedInstances,['wall-1','wall-2','hang-3']);assert.equal(report.instances,14);for(const [name,data]of Object.entries(unzipSync(bytes)))if(name.endsWith('.model')||name.endsWith('.config'))assert.ok(!/pegboard|lat-bar/.test(strFromU8(data)));}
});
