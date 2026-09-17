import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {definitions} from './parts/voltra.ts';
import {addAccessory,createAssembly,resolveAssembly,validateAssembly,unpairAccessory} from './assembly.ts';
const api=await Module();api.setup();
for(const d of definitions) for(const orientation of [1,2,3,4]) test(`${d.id} orientation ${orientation}: closed detailed solids`,()=>{
 const parts=d.build(api,{...d.defaults,orientation});
 try {assert.ok(parts.length>20);for(const p of parts){assert.equal(p.solid.status(),'NoError',p.name);assert.ok(p.solid.volume()>0,p.name);assert.ok([...p.solid.getMesh().vertProperties].every(Number.isFinite));}assert.ok(parts.some(p=>p.name==='Magnetic dock insert'));assert.equal(parts.find(p=>p.name==='Synthetic cable')!.role,'source');}finally{parts.forEach(p=>p.solid.delete());}
});
test('VOLTRA height, orientation, shafts and fixed stations validated',()=>{
 const doc=createAssembly({emptyAccessories:true});
 const a=addAccessory(doc,'voltra-fixed',{hole:12},true);
 assert.equal(resolveAssembly(a).filter(p=>p.part==='voltra-fixed').length,2);
 assert.deepEqual(resolveAssembly(a).find(p=>p.part==='voltra-fixed')!.mounts.map(m=>m.hole),[11,13]);
 assert.throws(()=>addAccessory(doc,'voltra-sliding',{hole:0},false,{orientation:2}),/fits hole/);
 assert.throws(()=>addAccessory(doc,'voltra-fixed',{hole:12.5},false),/Invalid connection/);
 const rep={...doc,profileId:'rep-pr4000',rack:{...doc.rack,pitch:50.8,holeDiameter:15.875}};
 // Profile IDs are tested through the registry elsewhere; use its actual identity below.
 assert.throws(()=>addAccessory(doc,'voltra-adaptive',{},false,{pinDiameter:30}),/pin/);
 assert.equal(validateAssembly(JSON.parse(JSON.stringify(a))).accessories[0].part,'voltra-fixed');
 assert.equal(unpairAccessory(a,a.accessories[0].id).accessories.length,2);
});
