import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Euler, Matrix4, Vector3} from 'three';
import {addAccessory,createAssembly,resolveAssembly,rotateAccessory,setAccessoryRotation,validateAssembly,unpairAccessory,moveAccessory,previewAccessoryRotation,rotationMode} from './assembly.ts';
import {getAttachmentAnchor} from './attachment-mounts.ts';
import {detectCollisions} from './assembly-collisions.ts';
import {mountedOrientationCandidates} from './mounted-rotation.ts';
import type {CrossmemberTopTarget,Vec3} from './types.ts';
const target:CrossmemberTopTarget={kind:'crossmember-top',connectionId:'left-upper-crossmember',station:4,side:1,uprightId:'front-left',face:'front',hole:0};
const near=(a:number[],b:number[])=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-7,`${a} != ${b}`));
function anchorDoc(){return addAccessory(createAssembly({emptyAccessories:true}),'darko-anchor',target,true);}
test('Darko half turn remounts both cradles with seated tabs and aligned shafts; quarter turns reject',()=>{
 const doc=anchorDoc(),id=doc.accessories[0].id,before=resolveAssembly(doc).filter(i=>i.ownerId===id);
 const next=rotateAccessory(doc,id,180),after=resolveAssembly(next).filter(i=>i.ownerId===id);
 assert.equal(doc.accessories[0].rotation,undefined);
 for(let i=0;i<2;i++){
  near(after[i].position,before[i].position);
  near(after[i].mount!.pinAxis!,before[i].mount!.pinAxis!.map(x=>-x));
  assert.equal((after[i].mount as CrossmemberTopTarget).side,-(before[i].mount as CrossmemberTopTarget).side);
  const tab=new Vector3(0,0,37.5).applyEuler(new Euler(...after[i].rotation)).add(new Vector3(...after[i].position));
  assert.equal(tab.z,after[i].mount!.center[2]+37.5);
 }
 for(const angle of [15,90,270,0.000001])assert.throws(()=>rotateAccessory(doc,id,angle),/hole alignment/);
 const restored=validateAssembly(JSON.parse(JSON.stringify(next)));
 assert.deepEqual(resolveAssembly(restored),resolveAssembly(next));
 const unpaired=resolveAssembly(unpairAccessory(next,id)).filter(i=>i.part==='darko-anchor');
 after.forEach((v,i)=>{near(v.position,unpaired[i].position);near(v.rotation,unpaired[i].rotation);});
 assert.equal(moveAccessory(next,id,{...target,station:5}).accessories[0].rotation,Math.PI);
 assert.deepEqual(mountedOrientationCandidates(next.accessories[0]).map(t=>t.orientation),[0,Math.PI]);
});
test('storage pin spins around source shaft on every face while preserving anchor, axis and shoulder',()=>{
 for(const part of ['storage-pin-short','storage-pin-long'])for(const face of ['front','back','left','right'] as const){
  const doc=addAccessory(createAssembly({emptyAccessories:true}),part,{hole:8,face},true),id=doc.accessories[0].id;
  const next=setAccessoryRotation(doc,id,0.731),entries=resolveAssembly(next).filter(i=>i.ownerId===id);
  assert.equal(rotationMode(next,id).kind,'continuous');
  for(const entry of entries){
   const anchor=getAttachmentAnchor(part),matrix=new Matrix4().makeRotationFromEuler(new Euler(...entry.rotation)).setPosition(...entry.position);
   near(new Vector3(...anchor.point).applyMatrix4(matrix).toArray(),entry.mount!.center);
   near(new Vector3(...anchor.pinAxis).transformDirection(matrix).toArray(),entry.mount!.pinAxis!);
   near(new Vector3(...anchor.matingFacePoint).applyMatrix4(matrix).toArray(),entry.mount!.position);
  }
  assert.equal(validateAssembly(JSON.parse(JSON.stringify(next))).accessories[0].rotation,next.accessories[0].rotation);
 }
});
test('fixed bases and malformed imports reject rotation; failed preview leaves input intact',()=>{
 for(const part of ['darko-dock','landmine','j-hook-standard']){
  const doc=addAccessory(createAssembly({emptyAccessories:true}),part,{hole:8},false),id=doc.accessories[0].id;
  assert.equal(rotationMode(doc,id).supported,false);
  assert.throws(()=>setAccessoryRotation(doc,id,.1),/fix|stud/);
 }
 const doc=anchorDoc(),id=doc.accessories[0].id;
 for(const value of [NaN,Infinity,'90',null]){
  const invalid=structuredClone(doc);(invalid.accessories[0] as unknown as {rotation:unknown}).rotation=value;
  assert.throws(()=>validateAssembly(invalid),/finite/);
 }
 assert.equal(previewAccessoryRotation(doc,id,Math.PI/2).valid,false);
 assert.equal(doc.accessories[0].rotation,undefined);
 const mismatch=structuredClone(doc);mismatch.accessories[0].rotation=Math.PI;mismatch.accessories[0].target.orientation=0;
 assert.throws(()=>validateAssembly(mismatch),/agree/);
});
test('3D oriented collision boxes detect roll and pitch without using yaw-only envelopes',()=>{
 const bar={id:'bar',part:'test',kind:'accessory' as const,position:[0,0,0] as Vec3,rotation:[0,0,0] as Vec3,collisionBoxes:[{min:[-10,-60,-5] as Vec3,max:[10,60,5] as Vec3}]};
 const neighbor={id:'other',part:'test',kind:'accessory' as const,position:[0,0,45] as Vec3,rotation:[0,0,0] as Vec3,collisionBoxes:[{min:[-9,-9,-9] as Vec3,max:[9,9,9] as Vec3}]};
 assert.equal(detectCollisions([bar,neighbor]).length,0);
 assert.equal(detectCollisions([{...bar,rotation:[Math.PI/2,0,0]},neighbor]).length,1);
 const pitched={...bar,collisionBoxes:[{min:[-60,-10,-5],max:[60,10,5]}],rotation:[0,Math.PI/2,0]};
 assert.equal(detectCollisions([pitched,neighbor]).length,1);
});
