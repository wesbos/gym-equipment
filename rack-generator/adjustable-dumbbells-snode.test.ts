import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module, {type Manifold} from 'manifold-3d';
import {SNODE, SNODE_AD80, SNODE_WEIGHTS, snodePlates} from './floor-parts/adjustable-dumbbells-snode.ts';
import {buildSnodeAd80, SNODE_CENTER} from './parts/adjustable-dumbbells-snode.ts';
import {DUMBBELL_LIFT} from './floor-parts/adjustable-dumbbells-common.ts';
import {coerceFloorParams, resolveBy, validateFloorParams} from './floor-registry.ts';
import type {SolidPart} from './types.ts';
const api=await Module();api.setup();
const bounds=(solids:Manifold[])=>solids.map(s=>s.boundingBox()).reduce<{min:number[];max:number[]}>((a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const named=(parts:SolidPart[],prefix:string)=>parts.find(p=>p.name.startsWith(prefix))?.solid;
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
test('Snode AD80: published 10–80 lb in 10 lb steps, seven 5 lb plates per side, 460 mm long at 80 lb',()=>{
 assert.deepEqual([...SNODE_WEIGHTS],[10,20,30,40,50,60,70,80]);
 for(const w of SNODE_WEIGHTS)assert.equal(10+2*5*snodePlates(w),w);
 assert.equal(SNODE.grip+2*(SNODE.cone+SNODE.hub+SNODE.plates*SNODE.pitch),460);
 assert.deepEqual(validateFloorParams(SNODE_AD80,{weight:80,caps:2,pose:1}),{weight:80,caps:2,pose:1});
 assert.deepEqual(validateFloorParams(SNODE_AD80,{}),SNODE_AD80.defaults);
 for(const bad of [{weight:85},{weight:5},{caps:3},{pose:2},{plates:1}])assert.throws(()=>validateFloorParams(SNODE_AD80,bad),/dumbbell/);
 assert.deepEqual(coerceFloorParams(SNODE_AD80,{weight:77,caps:0,pose:0}),{weight:80,caps:0,pose:0});
});
test('Snode AD80: closed solids at every setting, bounds = 490 × 190 mm cradle footprint, published envelope',()=>{
 const {width,depth}=resolveBy(SNODE_AD80.footprint,SNODE_AD80.defaults);
 for(const weight of SNODE_WEIGHTS)for(const caps of [0,1,2])for(const pose of [0,1])withParts(buildSnodeAd80(api,{weight,caps,pose}),parts=>{
  const label=`${weight}/${caps}/${pose}`,box=bounds(parts.map(p=>p.solid));
  for(const p of parts){assert.ok(!p.solid.isEmpty() && p.solid.status()==='NoError' && p.solid.volume()>0,`${label} ${p.name}`);assert.notEqual(p.role,'frame');}
  assert.ok(Math.abs(box.max[0]-box.min[0]-width)<1e-6 && Math.abs(box.max[1]-box.min[1]-depth)<1e-6 && Math.abs(box.min[2])<1e-6,`${label} footprint`);
  assert.ok(Math.abs(box.max[2]-(SNODE.plateBottom+SNODE.plate+(pose?0:DUMBBELL_LIFT)))<.01,`${label} height`);
  const cradle=named(parts,'Cast-iron cradle')!.boundingBox();
  assert.ok(Math.abs(cradle.max[0]-cradle.min[0]-SNODE.cradleWidth)<.01 && Math.abs(cradle.max[1]-cradle.min[1]-SNODE.cradleLength)<.01 && Math.abs(cradle.max[2]-SNODE.cradleHeight)<.01,`${label} 490 × 190 × 90 cradle`);
  // Racked at 80 lb: the full 460 × 170 × 170 dumbbell; grip 115 × Ø36.
  if(pose && weight===80 && !caps){const db=bounds(['Selected','Inner hub','Knurled'].map(n=>named(parts,n)!));
   assert.ok(Math.abs(db.max[1]-db.min[1]-460)<.5 && Math.abs(db.max[0]-db.min[0]-170)<.5 && Math.abs(db.max[2]-db.min[2]-170)<.5,'460 × 170 × 170');
   const grip=named(parts,'Knurled')!.boundingBox();assert.ok(Math.abs(grip.max[1]-grip.min[1]-117)<1 && Math.abs(grip.max[2]-grip.min[2]-36.8)<.1,'Ø36 grip');}
 });
});
test('Snode AD80: the dial setting moves plates between the lifted handle and the cradle',()=>{
 const total=withParts(buildSnodeAd80(api,{weight:80,caps:0,pose:1}),parts=>named(parts,'Selected')!.volume());
 for(const weight of [10,40,70])withParts(buildSnodeAd80(api,{weight,caps:0,pose:0}),parts=>{
  const n=snodePlates(weight),carried=named(parts,'Selected')?.volume() ?? 0,left=named(parts,'Plates left')?.volume() ?? 0;
  assert.ok(Math.abs(carried+left-total)<total*.01,'plates conserved');
  assert.ok(Math.abs(carried-total*n/7)<total*.02,`${weight} lb carries ${n} plates per side`);
  const rest=named(parts,'Plates left')!.boundingBox();assert.ok(Math.abs(rest.min[2]-SNODE.plateBottom)<.01,'left-behind plates stay seated');
  if(n){const up=named(parts,'Selected')!.boundingBox();assert.ok(Math.abs(up.min[2]-SNODE.plateBottom-DUMBBELL_LIFT)<.01,'selected plates ride up');
   // Selected plates are the inner ones: they end short of the plates left in the cradle.
   assert.ok(up.max[1]<rest.max[1]);}
  assert.ok(Math.abs(named(parts,'Knurled')!.boundingBox().min[2]-(SNODE_CENTER-18.4+DUMBBELL_LIFT))<.01);
 });
 withParts(buildSnodeAd80(api,{weight:80,caps:0,pose:0}),parts=>assert.equal(named(parts,'Plates left'),undefined));
});
