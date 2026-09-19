import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module, {type Manifold} from 'manifold-3d';
import {QUICK_LOCK as Q, QUICK_LOCK_DUMBBELL, QUICK_LOCK_KITS, QUICK_LOCK_STAND, QUICK_LOCK_STAND_LOADS, QUICK_LOCK_STAND_SIZE as S, quickLockLoading, quickLockWeights} from './floor-parts/adjustable-dumbbells-ironmaster.ts';
import {buildQuickLockDumbbell, buildQuickLockStand} from './parts/adjustable-dumbbells-ironmaster.ts';
import {coerceFloorParams, resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorWarnings, validateFloorItems} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
import type {SolidPart} from './types.ts';
const api=await Module();api.setup();
const inch=(v:number)=>v*25.4;
const bounds=(solids:Manifold[])=>solids.map(s=>s.boundingBox()).reduce<{min:number[];max:number[]}>((a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const named=(parts:SolidPart[],prefix:string)=>parts.find(p=>p.name.startsWith(prefix))?.solid;
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
const closed=(parts:SolidPart[],label:string)=>{for(const {solid,name,role} of parts){
  assert.notEqual(role,'frame',`${label} ${name}: factory colours, not rack paint`);
  assert.equal(solid.status(),'NoError',`${label} ${name}`);assert.ok(!solid.isEmpty() && solid.volume()>0,`${label} ${name}`);
}};
const pick=<T,>(all:T[])=>[...new Set([all[0],all[1],all[all.length>>1],all[all.length-2],all.at(-1)!])];
test('published weight ranges: 5–45 / 5–75 lb sets, 120 and 165 lb add-ons, Heavy Handle +15 lb',()=>{
 const w=(kit:number,heavy=0)=>quickLockWeights({kit,heavy,weight:0});
 assert.equal(w(1).length,29,'"represents 29 pairs": 5, 7.5 … 75');
 assert.deepEqual(w(1).slice(0,4),[5,7.5,10,12.5]);assert.equal(quickLockLoading({kit:1,heavy:0,weight:7.5}).screws,1,'7.5 lb: one screw');assert.equal(w(1).at(-1),75);
 assert.deepEqual([w(0).at(-1),w(2).at(-1),w(3).at(-1)],[45,120,165]);
 assert.deepEqual([w(1,1)[0],w(1,1).at(-1)],[20,90],'Heavy Handle: 20 lb empty, 75 set to 90');
 for(const [kit] of QUICK_LOCK_KITS.entries())for(const heavy of [0,1])for(const weight of w(kit,heavy)){
  const {ends,screws}=quickLockLoading({kit,heavy,weight});
  const plates=ends.reduce((s,e)=>s+22.5*e.big+5*e.five+2.5*e.small,0);
  assert.equal(5+15*heavy+2.5*screws+plates,weight,`${kit}/${heavy}/${weight} adds up`);
  assert.ok(ends.every(e=>e.five<=[3,6,6,6][kit] && e.small<=1 && e.big<=QUICK_LOCK_KITS[kit].big),'within the kit contents');
  assert.ok(Math.abs(ends[0].load-ends[1].load)<=2.5,'at most one 2.5 lb offset');
 }
 assert.deepEqual(quickLockLoading({kit:1,heavy:0,weight:75}).ends[0],{big:0,five:6,small:1,load:32.5});
 assert.deepEqual(quickLockLoading({kit:2,heavy:0,weight:120}).ends[1],{big:1,five:6,small:1,load:55});
});
test('published lengths: 9" at 20 lb, 14.5" at 75 lb, 18.25" at 120 lb; Heavy Handle keeps the length',()=>{
 const len=(kit:number,weight:number,heavy=0)=>quickLockLoading({kit,heavy,weight}).length;
 for(const [kit,weight,inches] of [[1,20,9],[1,75,14.5],[2,120,18.25]])assert.ok(Math.abs(len(kit,weight)-inch(inches))<2,`${weight} lb ≈ ${inches}"`);
 assert.equal(len(1,90,1),len(1,75));
 assert.ok(len(3,165)>len(2,120) && len(3,165)<inch(23.5),'165 lb follows the 120 lb block thickness (published 23.5", noted)');
});
test('params: strict for saved docs, snapped for UI edits',()=>{
 assert.deepEqual(validateFloorParams(QUICK_LOCK_DUMBBELL,{}),{kit:1,heavy:0,weight:75});
 assert.deepEqual(validateFloorParams(QUICK_LOCK_DUMBBELL,{kit:3,heavy:1,weight:180}),{kit:3,heavy:1,weight:180});
 for(const bad of [{kit:4},{heavy:2},{weight:76},{kit:0,weight:50},{heavy:1,weight:5},{heavy:1,weight:17.5},{plates:3}])assert.throws(()=>validateFloorParams(QUICK_LOCK_DUMBBELL,bad),/dumbbell/);
 assert.deepEqual(coerceFloorParams(QUICK_LOCK_DUMBBELL,{kit:0,heavy:0,weight:75}),{kit:0,heavy:0,weight:45});
 assert.deepEqual(validateFloorParams(QUICK_LOCK_STAND,{load:120}),{load:120});
 for(const bad of [{load:165},{load:50},{height:26}])assert.throws(()=>validateFloorParams(QUICK_LOCK_STAND,bad),/dumbbell stand/);
});
test('every kit builds closed solids whose bounds match the footprint, lying on the plate edges',()=>{
 for(const [kit] of QUICK_LOCK_KITS.entries())for(const heavy of [0,1])for(const weight of pick(quickLockWeights({kit,heavy,weight:0})))withParts(buildQuickLockDumbbell(api,{kit,heavy,weight}),parts=>{
  const label=`${kit}/${heavy}/${weight}`,b=bounds(parts.map(p=>p.solid)),{width,depth}=resolveBy(QUICK_LOCK_DUMBBELL.footprint,{kit,heavy,weight});
  closed(parts,label);
  assert.ok(Math.abs(b.max[0]-b.min[0]-width)<.01 && Math.abs(b.max[1]-b.min[1]-depth)<.01,`${label} footprint`);
  assert.ok(Math.abs(b.min[2])<.01 && Math.abs(b.max[2]-Q.plate)<.01,`${label} 6.7" square, on the floor`);
  const {screws,ends}=quickLockLoading({kit,heavy,weight});
  assert.equal(!!named(parts,'Chrome Quick-Lock'),screws>0);assert.equal(!!named(parts,'Heavy Handle'),!!heavy);
  assert.equal(!!named(parts,'Black cast-iron'),ends.some(e=>e.big+e.five+e.small>0));
 });
});
test('the grip is 1.25" with 6.5" inside (5.18" with the Heavy Handle kit)',()=>{
 for(const heavy of [0,1])withParts(buildQuickLockDumbbell(api,{kit:1,heavy,weight:heavy?20:5}),parts=>{
  const grip=named(parts,'Diamond-knurled')!.boundingBox();
  assert.ok(Math.abs(grip.max[1]-grip.min[1]-(heavy?inch(5.18):inch(6.5)))<1,`${heavy} inside grip`);
  assert.ok(Math.abs(grip.max[0]-grip.min[0]-inch(1.25))<1.5,'1.25" knurled grip');
 });
 const tris=withParts(buildQuickLockDumbbell(api,{kit:3,heavy:1,weight:180}),parts=>parts.reduce((n,p)=>n+p.solid.numTri(),0));
 assert.ok(tris<80000,`${tris} triangles`);
});
test('stand: published 14.5" × 19" × 26", the pair lies lengthwise on the matted top',()=>{
 for(const load of QUICK_LOCK_STAND_LOADS)withParts(buildQuickLockStand(api,{load}),parts=>{
  closed(parts,`stand ${load}`);
  const b=bounds(parts.map(p=>p.solid)),{width,depth}=resolveBy(QUICK_LOCK_STAND.footprint,{load});
  assert.ok(Math.abs(b.max[0]-b.min[0]-width)<.01 && Math.abs(b.max[1]-b.min[1]-depth)<.01 && Math.abs(b.min[2])<.01,`${load} footprint`);
  assert.ok(Math.abs(width-inch(14.5))<.01 && Math.abs(depth-inch(19))<.01);
  assert.ok(Math.abs(named(parts,'Diamond-texture')!.boundingBox().max[2]-S.height)<.01,'26" to the matted top');
  if(load){const db=named(parts,'Black cast-iron')!.boundingBox();assert.ok(Math.abs(db.min[2]-S.height)<.01 && db.max[1]-db.min[1]<=depth,'pair on top, within the 19" top');}
  else assert.equal(named(parts,'Black cast-iron'),undefined);
 });
});
test('pairs sit side by side and persist their kit and weight',()=>{
 const doc=addFloorItem(createAssembly(),'ironmaster-quick-lock-dumbbell',[0,3000],true),[a,b]=doc.floorItems!;
 assert.deepEqual([b.position[0]-a.position[0],b.position[1]-a.position[1]],[Q.plate+60,0]);
 assert.deepEqual(floorWarnings(doc),[]);
 const items=[{...a,params:{kit:2,heavy:1,weight:97.5}}];
 assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(items))),items);
});
