import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {unzipSync,strFromU8} from 'fflate';
import {exportPrint3MF} from './print-3mf.ts';
import {addWallItem} from '../../rack-generator/wall-items.ts';
import {createAssembly,resolveAssembly} from '../../rack-generator/assembly.ts';
import type {PartDefinition} from '../../rack-generator/types.ts';
const api=await Module();api.setup();
test('both print scales exclude wall items (GLB-only scenery) before CAD and plate/XML metadata',()=>{
 const doc=addWallItem(addWallItem(createAssembly(),'pegboard-panel'),'pegboard-panel');let panelBuilds=0;
 const definitions:PartDefinition[]=[...new Set(resolveAssembly(doc).map(e=>e.part))].map(id=>({id,name:id,category:'test',defaults:{},build:()=>{if(id==='pegboard-panel'){panelBuilds++;throw Error('Wall panels must not build for printing');}return [{name:id,role:'frame',solid:api.Manifold.cube([10,10,10])}];}}));
 for(const scale of [10,20] as const){const {bytes,report}=exportPrint3MF(api,doc,definitions,{layout:'laid-out',scale});assert.equal(panelBuilds,0);assert.deepEqual(report.excludedInstances,['wall-1','wall-2']);assert.equal(report.instances,14);for(const [name,data]of Object.entries(unzipSync(bytes)))if(name.endsWith('.model')||name.endsWith('.config'))assert.ok(!strFromU8(data).includes('pegboard'));}
});
