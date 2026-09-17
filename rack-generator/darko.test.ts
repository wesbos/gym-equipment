import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {definitions} from './parts/darko.ts';
import {addAccessory,createAssembly,resolveAssembly,validateAssembly,getMounts,removeInstance,unpairAccessory} from './assembly.ts';
import {darkoTopMount,darkoGuidance} from './darko-mounts.ts';
import {vendorAttribution} from './vendor-metadata.ts';
import {gridProfile} from './profiles.ts';
import type {CrossmemberTopTarget} from './types.ts';
const api=await Module();api.setup();
for(const d of definitions)test(`${d.id}: detailed solid cradles and extruded official wordmark`,()=>{
 for(const finish of [1,2]){
 const parts=d.build(api,{...d.defaults,finish});
 try{assert.ok(parts.length>=4);for(const {solid,name}of parts){assert.equal(solid.status(),'NoError',name);assert.ok(solid.volume()>0,name);const mesh=solid.getMesh();const edges=new Map<string,number>();for(let i=0;i<mesh.triVerts.length;i+=3)for(let j=0;j<3;j++){const a=mesh.triVerts[i+j],b=mesh.triVerts[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)??0)+1);}assert.ok([...edges.values()].every(n=>n===2),name);}
 assert.ok(parts.find(p=>p.name==='Darko Lifting official wordmark')!.solid.volume()>1);
 assert.ok(vendorAttribution(d.id)!.trademark.includes('© Darko'));
 }finally{parts.forEach(p=>p.solid.delete());}
 }
});
const target:CrossmemberTopTarget={kind:'crossmember-top',connectionId:'left-upper-crossmember',station:4,side:1,uprightId:'front-left',face:'front',hole:0};
test('top anchors follow actual rail stations, paired topology and removal',()=>{
 const doc=createAssembly({emptyAccessories:true}),a=addAccessory(doc,'darko-anchor',target,true);
 const parts=resolveAssembly(a).filter(p=>p.part==='darko-anchor');assert.equal(parts.length,2);
 const m=darkoTopMount(doc,target);assert.deepEqual(parts[0].mount!.center,m.center);
 assert.equal(parts[0].connectedTo[0],target.connectionId);
 assert.equal(removeInstance(a,'rear-left').accessories.length,0);
 assert.equal(unpairAccessory(a,a.accessories[0].id).accessories.length,2);
 assert.equal(validateAssembly(JSON.parse(JSON.stringify(a))).accessories[0].target.kind,'crossmember-top');
 assert.ok(getMounts(doc,'darko-anchor').every(m=>m.kind==='crossmember-top'));
 assert.throws(()=>addAccessory(doc,'darko-anchor',{hole:10},false),/crossmember-top/);
 assert.throws(()=>addAccessory(doc,'voltra-adaptive',target,false),/upright/);
 assert.throws(()=>addAccessory(doc,'darko-anchor',{...target,station:100},false),/station/);
 const changed=structuredClone(a);changed.structure[target.connectionId]={part:'angled-crossmember',params:{rise:200}};assert.throws(()=>validateAssembly(changed),/straight/);
 assert.match(darkoGuidance(a)!,/fewer than 6/);
});
test('Darko and VOLTRA match manufacturer bores and 50.8 mm rails',()=>{
 for(const profileId of ['rep-pr-4000','rep-pr-5000']){
 const profile=gridProfile(profileId);assert.notEqual(profile.id,'generic-75');
 const doc={...createAssembly({emptyAccessories:true}),profileId,rack:{...createAssembly().rack,pitch:profile.pitch,holeDiameter:profile.holeDiameter}};
 for(const part of ['darko-j','voltra-fixed','voltra-adaptive','voltra-sliding'])assert.doesNotThrow(()=>addAccessory(doc,part,{hole:12},false));
 assert.doesNotThrow(()=>addAccessory(doc,'darko-double-decker',target,true));
 if(profile.holeDiameter<24.8)for(const part of ['darko-j','voltra-fixed'])assert.throws(()=>addAccessory(doc,part,{hole:12},false,{pinDiameter:24.8}),/exceeds/);
 const m=darkoTopMount(doc,target),next=darkoTopMount(doc,{...target,station:5});assert.ok(Math.abs(Math.hypot(...m.center.map((v,i)=>v-next.center[i]))-50.8)<.001);
 }
});
test('arbitrary post IDs preserve paired anchors, physical paint IDs and moving graph',()=>{
 const source=createAssembly({emptyAccessories:true});
 const mapping:Record<string,string>={'front-left':'alpha','rear-left':'beta','front-right':'gamma','rear-right':'delta'};
 source.uprights=Object.fromEntries(Object.entries(source.uprights).map(([id,p])=>[mapping[id],p]));
 source.connections=source.connections.map(e=>({...e,from:mapping[e.from],to:mapping[e.to]}));
 const doc=addAccessory(source,'darko-anchor',{...target,uprightId:'alpha'},true);
 const a=doc.accessories[0];doc.appearance={overrides:{[`${a.id}:left`]:'#112233',[`${a.id}:right`]:'#334455'}};
 const before=resolveAssembly(doc).filter(p=>p.part==='darko-anchor');
 for(const node of Object.values(doc.uprights))node.y+=50;
 const after=resolveAssembly(doc).filter(p=>p.part==='darko-anchor');
 assert.equal(after[0].position[1]-before[0].position[1],50);
 const unpaired=unpairAccessory(doc,a.id);assert.equal(unpaired.appearance!.overrides![a.id],'#112233');
 assert.equal(unpaired.appearance!.overrides![unpaired.accessories[1].id],'#334455');
 const bad=structuredClone(doc);bad.accessories[0].pairTarget!.station+=1;assert.throws(()=>validateAssembly(bad),/align/);
});
