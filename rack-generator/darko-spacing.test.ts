import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { addAccessory, createAssembly, getMounts, resolveAssembly } from './assembly.ts';
import { detectCollisions } from './assembly-collisions.ts';
import { darkoTopMount } from './darko-mounts.ts';
import { darkoTopCollisionBoxes, definitions } from './parts/darko.ts';
import { definitions as structureDefinitions } from './parts/structure.ts';
import type { CollisionInstance, CrossmemberTopTarget, RackDoc } from './types.ts';

const target: CrossmemberTopTarget = { kind:'crossmember-top', connectionId:'rear-crossmember', station:3, side:1, uprightId:'rear-left', face:'back', hole:0 };
function rail(pitch=50):RackDoc {
 const doc=createAssembly({emptyAccessories:true});
 if(pitch===50.8){doc.profileId='rep-pr-5000';doc.rack.pitch=pitch;doc.rack.holeDiameter=25.4;}
 return doc;
}
for(const pitch of [50,50.8]){
 test(`same-side Darko pair clears at five ${pitch} mm stations, but four stations collide`,()=>{
  const first=addAccessory(rail(pitch),'darko-anchor',target,false);
  const snug=addAccessory(first,'darko-anchor',{...target,station:8},false);
  assert.deepEqual(detectCollisions(resolveAssembly(snug)),[]);
  const parts=resolveAssembly(snug).filter(i=>i.part==='darko-anchor');
  assert.equal(Math.round(Math.hypot(...parts[0].position.map((v,i)=>v-parts[1].position[i]))*10)/10,5*pitch);
  const overlap=addAccessory(first,'darko-anchor',{...target,station:7},false);
  const warnings=detectCollisions(resolveAssembly(overlap));
  assert.equal(warnings.length,1);
  assert.match(warnings[0].message,/overlap/);
 });
 test(`opposite faces can use adjacent ${pitch} mm stations, but cannot duplicate a through bolt`,()=>{
  const first=addAccessory(rail(pitch),'darko-anchor',target,false);
  const adjacent=addAccessory(first,'darko-anchor',{...target,station:4,side:-1},false);
  assert.deepEqual(detectCollisions(resolveAssembly(adjacent)),[]);
  const same=addAccessory(first,'darko-anchor',{...target,side:-1},false);
  const warnings=detectCollisions(resolveAssembly(same));
  assert.equal(warnings.length,1);
  assert.match(warnings[0].message,/share mounting station 4 on rear-crossmember/);
 });
 test(`two Double Deckers and an Anchor fit the 1075 mm rail on the ${pitch} mm grid`,()=>{
  let doc=rail(pitch);
  for(const [station,part] of [[2,'darko-double-decker'],[7,'darko-double-decker'],[12,'darko-anchor']] as const)
   doc=addAccessory(doc,part,{...target,station},false);
  assert.equal(resolveAssembly(doc).filter(i=>i.part.startsWith('darko-')).length,3);
  assert.deepEqual(detectCollisions(resolveAssembly(doc)),[]);
 });
 test(`Darko end stations match the generated rail bores at ${pitch} mm pitch`,()=>{
  const doc=rail(pitch),mounts=getMounts(doc,'darko-anchor').filter(m=>m.kind==='crossmember-top'&&m.connectionId===target.connectionId&&m.side===1);
  const last=Math.floor((1075-50-62.5)/pitch);
  assert.equal(mounts.length,last+1);
  assert.equal((mounts.at(-1) as CrossmemberTopTarget).station,last);
  assert.doesNotThrow(()=>darkoTopMount(doc,{...target,station:0}));
  assert.throws(()=>darkoTopMount(doc,{...target,station:last+1}),/outside the perforated rail/);
  assert.throws(()=>darkoTopMount(doc,{...target,station:3.5}),/station/);
 });
}

test('rail station zero is distinct from its endpoint upright hole zero',()=>{
 const top=resolveAssembly(addAccessory(rail(),'darko-anchor',{...target,station:0},false)).find(i=>i.part==='darko-anchor')!;
 const upright:CollisionInstance={id:'upright-accessory',part:'custom',kind:'accessory',mount:{kind:'upright',uprightId:target.uprightId,hole:0,face:'front'}};
 assert.deepEqual(detectCollisions([top,upright]),[]);
});

test('first and last Darko bolt axes pass through actual CAD side holes, not solid steel',async()=>{
 const api=await Module();api.setup();
 for(const pitch of [50,50.8]){
  const doc=rail(pitch),beam=resolveAssembly(doc).find(i=>i.id===target.connectionId)!;
  const definition=structureDefinitions.find(d=>d.id===beam.part)!,parts=definition.build(api,{...definition.defaults,...beam.params});
  try{
   const solid=parts.find(p=>p.name==='Rounded hollow crossmember with four-face holes')!.solid;
   const last=Math.floor((1075-50-62.5)/pitch);
   for(const station of [0,last]){
    const world=darkoTopMount(doc,{...target,station}).center;
    const local=world.map((v,i)=>v-beam.position[i]); // rear rail runs along world +X
    const raw=api.Manifold.cylinder(100,7.75,7.75,32,true),shaft=raw.rotate([90,0,0]);
    const aligned=shaft.translate(local as [number,number,number]);
    const between=shaft.translate([local[0]-pitch/2,local[1],local[2]]);
    const clear=solid.intersect(aligned),blocked=solid.intersect(between);
    try{assert.ok(clear.volume()<1e-6);assert.ok(blocked.volume()>100,'half-station offset puts the shaft in steel');}
    finally{clear.delete();blocked.delete();aligned.delete();between.delete();shaft.delete();raw.delete();}
   }
  }finally{parts.forEach(p=>p.solid.delete());}
 }
});

test('physical Darko profiles preserve open cradle space and exact 211 mm width',async()=>{
 const api=await Module();api.setup();
 for(const id of ['darko-anchor','darko-double-decker']){
  const definition=definitions.find(d=>d.id===id)!,parts=definition.build(api,definition.defaults);
  try{
   const steel=parts.find(p=>p.name==='Laser-cut anchor steel')!.solid.boundingBox();
   const boxes=darkoTopCollisionBoxes(id,75);
   assert.equal(steel.max[0]-steel.min[0],211);
   assert.equal(Math.min(...boxes.map(b=>b.min[0])),steel.min[0]);
   assert.equal(Math.max(...boxes.map(b=>b.max[0])),steel.max[0]);
   assert.ok(Math.abs(Math.min(...boxes.map(b=>b.min[2]))-steel.min[2])<1e-7);
   const anchor:CollisionInstance={id:'anchor',part:id,kind:'accessory',collisionBoxes:boxes};
   const probe=(min:[number,number,number],max:[number,number,number]):CollisionInstance=>({id:'probe',part:'custom',kind:'accessory',collisionBoxes:[{min,max}]});
   // Between the central stem and upturned outer hook: there is no stored bar.
   assert.deepEqual(detectCollisions([anchor,probe([45,39,-80],[70,46,-70])]),[]);
   assert.equal(detectCollisions([anchor,probe([95,39,-115],[103,46,-105])]).length,1);
  }finally{parts.forEach(p=>p.solid.delete());}
 }
});
