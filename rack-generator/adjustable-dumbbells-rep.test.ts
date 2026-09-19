import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module, {type Manifold} from 'manifold-3d';
import {QUICKDRAW as Q, QUICKDRAW_SETS, REP_QUICKDRAW, quickDrawLength, quickDrawPlates, quickDrawSelection, quickDrawWeights} from './floor-parts/adjustable-dumbbells-rep.ts';
import {buildQuickDraw} from './parts/adjustable-dumbbells-rep.ts';
import {DUMBBELL_LIFT} from './floor-parts/adjustable-dumbbells-common.ts';
import {coerceFloorParams, resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorWarnings, validateFloorItems} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
import type {SolidPart} from './types.ts';
const api=await Module();api.setup();
const bounds=(solids:Manifold[])=>solids.map(s=>s.boundingBox()).reduce<{min:number[];max:number[]}>((a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const named=(parts:SolidPart[],prefix:string)=>parts.find(p=>p.name.startsWith(prefix))?.solid;
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
const closed=(parts:SolidPart[],label:string)=>{for(const {solid,name,role} of parts){
  assert.notEqual(role,'frame',`${label} ${name}: factory colours, not rack paint`);
  assert.equal(solid.status(),'NoError',`${label} ${name}`);assert.ok(!solid.isEmpty() && solid.volume()>0,`${label} ${name}`);
}};
test('published QuickDraw sets: 5 lb handle, micro plates for the odd 5, one 5 lb plate per side per 10 lb',()=>{
  assert.deepEqual(QUICKDRAW_SETS.map(quickDrawPlates),[2,3,4,5]);
  assert.deepEqual(quickDrawWeights(60),[5,10,15,20,25,30,35,40,45,50,55,60]);
  for(const set of QUICKDRAW_SETS)for(const w of quickDrawWeights(set)){const s=quickDrawSelection(w);assert.ok(s.plates<=quickDrawPlates(set));assert.equal(5+(s.micro?5:0)+10*s.plates,w);}
  // REP spec table: 12.2 / 14.3 / 16.4 / 18.5" dumbbell lengths.
  for(const [set,inches] of [[30,12.2],[40,14.3],[50,16.4],[60,18.5]] as const)assert.ok(Math.abs(quickDrawLength(quickDrawPlates(set))-inches*25.4)<2,`${set} lb length`);
});
test('params: strict for saved docs, snapped for UI edits',()=>{
  assert.deepEqual(validateFloorParams(REP_QUICKDRAW,{}),REP_QUICKDRAW.defaults);
  assert.deepEqual(validateFloorParams(REP_QUICKDRAW,{set:60,weight:55,pose:1}),{set:60,weight:55,pose:1});
  for(const bad of [{set:30,weight:40},{weight:12.5},{set:45},{pose:2},{plates:3}])assert.throws(()=>validateFloorParams(REP_QUICKDRAW,bad),/dumbbell/);
  assert.deepEqual(coerceFloorParams(REP_QUICKDRAW,{set:30,weight:60,pose:0}),{set:30,weight:30,pose:0});
  const doc=addFloorItem(createAssembly(),'rep-quickdraw-dumbbell',[0,3000],true),[a,b]=doc.floorItems!;
  assert.deepEqual([b.position[0]-a.position[0],b.position[1]-a.position[1]],[Q.cradleWidth+80,0]);
  assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(doc.floorItems))),doc.floorItems);
  assert.equal(floorWarnings(doc).length,0);
});
test('every set builds closed solids matching the 523 × 215 mm cradle and published heights',()=>{
  const {width,depth}=resolveBy(REP_QUICKDRAW.footprint,REP_QUICKDRAW.defaults);
  for(const set of QUICKDRAW_SETS)for(const weight of [5,set/2+(set/2%10===5?0:5),set])for(const pose of [0,1])withParts(buildQuickDraw(api,{set,weight,pose}),parts=>{
    const label=`${set}/${weight}/${pose}`,box=bounds(parts.map(p=>p.solid));closed(parts,label);
    assert.ok(Math.abs(box.max[0]-box.min[0]-width)<1e-6 && Math.abs(box.max[1]-box.min[1]-depth)<1e-6 && Math.abs(box.min[2])<1e-6,`${label} footprint`);
    assert.ok(Math.abs(box.max[2]-(pose?Q.rackedHeight:Q.rackedHeight+DUMBBELL_LIFT))<.01,`${label} 7.9" racked height`);
    const cradle=bounds([named(parts,'Molded cradle')!]);assert.ok(set<60 || Math.abs(cradle.max[2]-Q.cradleHeight)<1,`${label} 4.7" cradle (spacers stand taller on smaller sets)`);
    // Handle frame: 185 mm headplates, 137 mm clear grip (124 with the micros), dumbbell length per set in the racked pose.
    const head=named(parts,'Handle headplates')!.boundingBox();assert.ok(Math.abs(head.max[0]-head.min[0]-Q.plate)<.01,`${label} 7.3" plates`);
    assert.ok(Math.abs(head.max[1]-head.min[1]-(Q.grip+2*Q.head))<.01);
    assert.equal(!!named(parts,'2.5 lb'),quickDrawSelection(weight).micro,`${label} micro plates`);
    if(pose){const stack=bounds(['Handle','Locked','Unlocked'].map(n=>named(parts,n)).filter(s=>s) as Manifold[]);assert.ok(Math.abs(stack.max[1]-stack.min[1]-quickDrawLength(quickDrawPlates(set)))<.5,`${label} length`);}
    const grip=named(parts,'Nickel')!.boundingBox();assert.ok(Math.abs(grip.max[0]-grip.min[0]-Q.gripDiameter)<.01);
  });
});
test('switches decide which plates lift with the handle; the rest stay seated on the tubes',()=>{
  const vol=(parts:SolidPart[],n:string)=>named(parts,n)?.volume() ?? 0;
  const total=withParts(buildQuickDraw(api,{set:60,weight:60,pose:0}),parts=>vol(parts,'Locked'));
  for(const weight of [5,10,25,40,55,60])withParts(buildQuickDraw(api,{set:60,weight,pose:0}),parts=>{
    const {plates}=quickDrawSelection(weight),locked=vol(parts,'Locked'),unlocked=vol(parts,'Unlocked');
    assert.ok(Math.abs(locked+unlocked-total)<1,'plates are conserved');assert.ok(Math.abs(locked-total*plates/5)<1,`${weight} lb locks ${plates} per side`);
    if(plates)assert.ok(Math.abs(named(parts,'Locked')!.boundingBox().max[2]-Q.rackedHeight-DUMBBELL_LIFT)<.01,'locked plates ride up');
    if(plates<5)assert.ok(Math.abs(named(parts,'Unlocked')!.boundingBox().max[2]-Q.rackedHeight)<.01,'unlocked plates stay racked');
  });
  // Smaller sets fill the fixed cradle with 5 − N spacer blocks per side.
  const spacers=(set:number)=>withParts(buildQuickDraw(api,{set,weight:set,pose:1}),parts=>vol(parts,'Molded cradle'));
  assert.ok(spacers(30)>spacers(40) && spacers(40)>spacers(50) && spacers(50)>spacers(60));
});
