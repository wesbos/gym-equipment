import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module, {type Manifold} from 'manifold-3d';
import {TRULAP, TRULAP_8592, TRULAP_KG, TRULAP_LB, trulapLength, trulapPlates} from './floor-parts/adjustable-dumbbells-trulap.ts';
import {buildTrulap8592} from './parts/adjustable-dumbbells-trulap.ts';
import {DUMBBELL_LIFT} from './floor-parts/adjustable-dumbbells-common.ts';
import {coerceFloorParams, floorOptions, resolveBy, validateFloorParams} from './floor-registry.ts';
import type {SolidPart} from './types.ts';
const api=await Module();api.setup();
const bounds=(solids:Manifold[])=>solids.map(s=>s.boundingBox()).reduce<{min:number[];max:number[]}>((a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const named=(parts:SolidPart[],prefix:string)=>parts.find(p=>p.name.startsWith(prefix))?.solid;
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
const handle=['Selected','Handle cores','Knurled'];
test('Trulap 8592 G4: 26 settings 4–41.5 kg (8.5–92 lb), one 1.5 kg plate per step alternating ends, 267 → 441 mm',()=>{
 assert.equal(TRULAP_KG.length,26);assert.equal(TRULAP_LB.length,26);assert.equal(TRULAP_KG[0],4);assert.equal(TRULAP_KG.at(-1),41.5);
 assert.deepEqual(trulapPlates(41.5),[13,12]);assert.deepEqual(trulapPlates(4),[0,0]);assert.deepEqual(trulapPlates(5.5),[1,0]);
 for(const kg of TRULAP_KG){const [a,b]=trulapPlates(kg);assert.ok(Math.abs(4+1.5*(a+b)-kg)<1e-9 && a-b>=0 && a-b<=1);}
 assert.ok(Math.abs(trulapLength(4)-267)<1 && Math.abs(trulapLength(41.5)-441)<2,'published lengths');
 const param=TRULAP_8592.params[0];assert.equal(param.format!(41.5),'41.5 kg · 92 lb');assert.deepEqual(floorOptions(param,TRULAP_8592.defaults),TRULAP_KG);
 assert.deepEqual(validateFloorParams(TRULAP_8592,{weight:41.5,pose:1}),{weight:41.5,pose:1});
 for(const bad of [{weight:42},{weight:92},{pose:3},{kg:4}])assert.throws(()=>validateFloorParams(TRULAP_8592,bad),/dumbbell/);
 assert.deepEqual(coerceFloorParams(TRULAP_8592,{weight:20,pose:0}),{weight:20.5,pose:0});
});
test('Trulap 8592 G4: closed solids, bounds = 500 × 215 mm dock, 195 mm plates, 127 × Ø34 grip',()=>{
 const {width,depth}=resolveBy(TRULAP_8592.footprint,TRULAP_8592.defaults);
 for(const weight of [4,5.5,20.5,40,41.5])for(const pose of [0,1])withParts(buildTrulap8592(api,{weight,pose}),parts=>{
  const label=`${weight}/${pose}`,box=bounds(parts.map(p=>p.solid));
  for(const p of parts){assert.ok(!p.solid.isEmpty() && p.solid.status()==='NoError' && p.solid.volume()>0,`${label} ${p.name}`);assert.notEqual(p.role,'frame');}
  assert.ok(Math.abs(box.max[0]-box.min[0]-width)<1e-6 && Math.abs(box.max[1]-box.min[1]-depth)<1e-6 && Math.abs(box.min[2])<1e-6,`${label} footprint`);
  const dock=named(parts,'Reinforced nylon dock')!.boundingBox();
  assert.ok(Math.abs(dock.max[0]-dock.min[0]-215)<.01 && Math.abs(dock.max[1]-dock.min[1]-500)<.01,`${label} dock`);
  const grip=named(parts,'Knurled')!.boundingBox();assert.ok(Math.abs(grip.max[1]-grip.min[1]-129)<.1 && Math.abs(grip.max[2]-grip.min[2]-34.8)<.1,`${label} grip`);
  // The lifted handle with its selected plates is the published length for the setting.
  const lifted=bounds(handle.map(n=>named(parts,n)).filter(Boolean) as Manifold[]);
  assert.ok(Math.abs(lifted.max[1]-lifted.min[1]-trulapLength(weight))<2,`${label} length (seams)`);
  const plates=bounds(['Selected','Plates left'].map(n=>named(parts,n)).filter(Boolean) as Manifold[]);
  assert.ok(Math.abs(plates.max[0]-plates.min[0]-195)<.01,`${label} 195 mm plates`);
 });
});
test('Trulap 8592 G4: selected plates ride up with the handle, the rest stay in the dock',()=>{
 const total=withParts(buildTrulap8592(api,{weight:41.5,pose:1}),parts=>named(parts,'Selected')!.volume());
 for(const weight of [4,13,28,40])withParts(buildTrulap8592(api,{weight,pose:0}),parts=>{
  const [a,b]=trulapPlates(weight),carried=named(parts,'Selected')?.volume() ?? 0,left=named(parts,'Plates left')!.volume();
  assert.ok(Math.abs(carried+left-total)<total*.01,'plates conserved');
  assert.ok(Math.abs(carried-total*(a+b)/25)<total*.02,`${weight} kg carries ${a}+${b}`);
  assert.ok(Math.abs(named(parts,'Plates left')!.boundingBox().min[2]-TRULAP.plateBottom)<.01);
  if(a)assert.ok(Math.abs(named(parts,'Selected')!.boundingBox().min[2]-TRULAP.plateBottom-DUMBBELL_LIFT)<.01);
 });
});
