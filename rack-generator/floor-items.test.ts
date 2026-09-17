import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {addFloorItem, resolveFloorItems, validateFloorItems, floorWarnings, BACKREST_ANGLES, SEAT_ANGLES} from './floor-items.ts';
import {createAssembly,validateAssembly,resizeAssembly,removeInstance,resolveAssembly} from './assembly.ts';
import {buildNighthawk, nighthawkContacts} from './parts/nighthawk.ts';
import {resolveMaterial,HARDWARE_FINISHES} from './appearance.ts';
test('floor items validate, persist independently of graph, and use explicit coordinate conversion',()=>{
 const doc=addFloorItem(createAssembly(),[1300,-900]);doc.floorItems![0].rotation=Math.PI/2;
 const restored=validateAssembly(JSON.parse(JSON.stringify(doc)));
 assert.deepEqual(restored.floorItems,doc.floorItems);
 assert.deepEqual(resizeAssembly(restored,{width:1200}).floorItems,doc.floorItems);
 const [entry]=resolveFloorItems(doc.floorItems);
 assert.deepEqual(entry.position,[1300,900,0]);assert.deepEqual(entry.rotation,[0,0,Math.PI/2]);
 assert.equal(entry.kind,'floor-item');assert.deepEqual(entry.connectedTo,[]);assert.equal(entry.mount,null);
 assert.ok(resolveAssembly(doc).some(i=>i.id===entry.id));
 assert.equal(removeInstance(doc,entry.id).floorItems!.length,0);
 for(const patch of [{position:[NaN,0]},{position:[0]},{rotation:Infinity},{part:'upright'},{params:{seatAngle:15}},{params:{backrestAngle:5}},{params:{wat:2}},{id:'front-left'}])assert.throws(()=>validateFloorItems([{...doc.floorItems![0],...patch}]));
 assert.throws(()=>validateFloorItems([doc.floorItems![0],doc.floorItems![0]]));
});
test('suggestions find room and collisions warn without blocking edits',()=>{
 let doc=addFloorItem(createAssembly());doc=addFloorItem(doc);assert.equal(floorWarnings(doc).length,0);
 doc.floorItems![1].position=[...doc.floorItems![0].position];assert.equal(floorWarnings(doc).length,1);
 doc.floorItems![0].position=[0,0];assert.ok(floorWarnings(validateAssembly(doc)).some(w=>w.ids.includes('rack')));
});
const api=await Module();api.setup();
test('all 28 bench settings produce finite positive closed Manifold solids with articulated pads',()=>{
 let flatBounds:ReturnType<import('manifold-3d').Manifold['boundingBox']>|undefined;
 for(const backrestAngle of BACKREST_ANGLES)for(const seatAngle of SEAT_ANGLES){
  const parts=buildNighthawk(api,{backrestAngle,seatAngle});
  try {
   assert.ok(parts.length>=7);
   for(const {solid,name} of parts){assert.equal(solid.status(),'NoError',name);assert.ok(solid.volume()>0,name);assert.ok([...solid.getMesh().vertProperties].every(Number.isFinite),name);}
   const pad=parts.find(p=>p.name.startsWith('Back pad'))!;
   if(backrestAngle===0){flatBounds=pad.solid.boundingBox();assert.ok(Math.abs(flatBounds.max[2]-424)<.01);assert.ok(Math.abs(flatBounds.max[1]-flatBounds.min[1]-914)<.01);assert.ok(Math.abs(flatBounds.max[0]-flatBounds.min[0]-300)<.01);}
   if(backrestAngle===85)assert.ok(pad.solid.boundingBox().max[2]>1250);
   const seat=parts.find(p=>p.name.startsWith('Seat pad'))!;
   if(seatAngle===0)assert.ok(Math.abs(seat.solid.boundingBox().max[1]-seat.solid.boundingBox().min[1]-330)<.1);
   const contacts=nighthawkContacts(backrestAngle,seatAngle);
   const intersectionVolume=(a:import('manifold-3d').Manifold,b:import('manifold-3d').Manifold)=>{const intersection=api.Manifold.intersection([a,b]);try{return intersection.volume();}finally{intersection.delete();}};
   const named=(name:string)=>parts.find(p=>p.name===name)!.solid;
   for(const [prefix,top,bottom,length,angle,localY,localZ,radius,pinHalf] of [
     ['Back',contacts.backTop,contacts.backBottom,450,backrestAngle,28,341,11,95],
     ['Seat',contacts.seatTop,contacts.seatBottom,115,-seatAngle,-440,340,10,100],
   ] as const){
     const label=`${prefix} at back=${backrestAngle}, seat=${seatAngle}`;
     // Independently undo the pad transform: attachment must remain fixed in rail coordinates.
     const radians=angle*Math.PI/180,y=top[1]+272,z=top[2]-366;
     assert.ok(Math.abs(y*Math.cos(radians)+z*Math.sin(radians)-272-localY)<1e-8,label+' local Y');
     assert.ok(Math.abs(-y*Math.sin(radians)+z*Math.cos(radians)+366-localZ)<1e-8,label+' local Z');
     assert.ok(Math.abs(Math.hypot(...top.map((v,i)=>v-bottom[i]))-length)<1e-8,label+' fixed link length');
     const link=named(`${prefix} support link`),rail=named(`${prefix} pad steel rail`),pin=named(`${prefix} ladder pin`),gauge=named('Closed ladder gauges');
     // Check actual generated CAD, not just matching endpoint formulas.
     assert.ok(intersectionVolume(link,rail)>1,label+' link reaches articulated rail');
     assert.ok(intersectionVolume(link,pin)>1,label+' link reaches retaining pin');
     assert.ok(intersectionVolume(pin,gauge)<0.001,label+' pin fits slot without steel penetration');
     const expanded=api.Manifold.cylinder(pinHalf*2,radius+.1,radius+.1,32).rotate([0,90,0]).translate([-pinHalf,bottom[1],bottom[2]]);
     try{assert.ok(intersectionVolume(expanded,gauge)>.01,label+' pin seats against gauge within 0.1 mm');}finally{expanded.delete();}
   }
   const hardware=parts.find(p=>p.role==='fastener')!;
   assert.equal(resolveMaterial(hardware).color,'#343638');assert.deepEqual(resolveMaterial(hardware,{hardwareFinish:'gold'}),HARDWARE_FINISHES.gold);
   assert.equal(resolveMaterial(pad,{frameColor:'#ffffff',hardwareFinish:'gold'}).metalness,0);
  } finally{parts.forEach(p=>p.solid.delete());}
 }
});
