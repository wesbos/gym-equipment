import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module, {type Manifold} from 'manifold-3d';
import {EISENLINK as E, EISENLINK_SETS, EISENLINK_SQUARE, eisenlinkLength, eisenlinkSelection, eisenlinkWeights} from './floor-parts/adjustable-dumbbells-eisenlink.ts';
import {buildEisenlink} from './parts/adjustable-dumbbells-eisenlink.ts';
import {coerceFloorParams, resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorBounds, floorWarnings, validateFloorItems} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
import type {SolidPart} from './types.ts';
const api=await Module();api.setup();
const bounds=(solids:Manifold[])=>solids.map(s=>s.boundingBox()).reduce<{min:number[];max:number[]}>((a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const named=(parts:SolidPart[],prefix:string)=>parts.find(p=>p.name.startsWith(prefix))?.solid;
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
test('published Eisenlink kits: 10 lb handle, 2.5 lb screws, symmetric 5 lb plates, 9 settings on the 50 lb set',()=>{
  assert.deepEqual(eisenlinkWeights(50),[10,15,20,25,30,35,40,45,50]);
  assert.equal(eisenlinkWeights(80).length,15);
  assert.deepEqual(eisenlinkSelection(10),{screws:false,plates:0,small:false});
  assert.deepEqual(eisenlinkSelection(50),{screws:true,plates:3,small:true},'50 lb kit: 3 × 5 lb + 2.5 lb per side');
  assert.deepEqual(eisenlinkSelection(80),{screws:true,plates:6,small:true},'80 lb kit: 6 × 5 lb + 2.5 lb per side');
  for(const w of eisenlinkWeights(80)){const s=eisenlinkSelection(w);assert.equal(10+(s.screws?5:0)+10*s.plates+(s.small?5:0),w);}
  // Published 11.2" at 50 lb; the length only grows as plates go on.
  assert.ok(Math.abs(eisenlinkLength(50)-11.2*25.4)<1.5);
  const lengths=eisenlinkWeights(80).map(eisenlinkLength);assert.ok(lengths.every((l,i)=>!i || l>=lengths[i-1]));
});
test('params: strict for saved docs, snapped for UI edits, footprint follows the loaded length',()=>{
  assert.deepEqual(validateFloorParams(EISENLINK_SQUARE,{}),EISENLINK_SQUARE.defaults);
  assert.deepEqual(validateFloorParams(EISENLINK_SQUARE,{set:80,weight:75}),{set:80,weight:75});
  for(const bad of [{set:50,weight:55},{weight:12.5},{set:60},{pose:1}])assert.throws(()=>validateFloorParams(EISENLINK_SQUARE,bad),/dumbbell/);
  assert.deepEqual(coerceFloorParams(EISENLINK_SQUARE,{set:50,weight:80}),{set:50,weight:50});
  const doc=addFloorItem(createAssembly(),'eisenlink-square-dumbbell',[0,3000],true),[a,b]=doc.floorItems!;
  assert.deepEqual([b.position[0]-a.position[0],b.position[1]-a.position[1]],[E.plate+60,0]);
  assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(doc.floorItems))),doc.floorItems);
  assert.equal(floorWarnings(doc).length,0);
  const box=floorBounds({...a,params:{set:80,weight:80}});assert.ok(Math.abs(box.max[1]-box.min[1]-eisenlinkLength(80))<1e-6);
});
test('every setting builds closed solids whose bounds equal the footprint; only loaded plates are on the handle',()=>{
  for(const set of EISENLINK_SETS)for(const weight of eisenlinkWeights(set))withParts(buildEisenlink(api,{set,weight}),parts=>{
    const label=`${set}/${weight}`,box=bounds(parts.map(p=>p.solid)),{width,depth}=resolveBy(EISENLINK_SQUARE.footprint,{set,weight});
    for(const {solid,name,role} of parts){assert.notEqual(role,'frame');assert.equal(solid.status(),'NoError',`${label} ${name}`);assert.ok(solid.volume()>0,`${label} ${name}`);}
    assert.ok(Math.abs(box.max[0]-box.min[0]-width)<1e-6 && Math.abs(box.max[1]-box.min[1]-depth)<1e-6 && Math.abs(box.min[2])<1e-6,`${label} footprint`);
    assert.ok(Math.abs(width-E.plate)<1e-6 && Math.abs(box.max[2]-E.plate)<1e-6,`${label} 7.2" square`);
    const {plates,small,screws}=eisenlinkSelection(weight),five=named(parts,'5 lb');
    assert.equal(!!five,plates>0);assert.equal(!!named(parts,'2.5 lb'),small);assert.equal(!!named(parts,'Chrome'),screws);
    // 6.8" (173 mm) clear handle between the fixed end plates, 35.5 mm grip.
    const ends=named(parts,'Handle end plates')!,grip=named(parts,'Black knurled')!.boundingBox();
    assert.ok(Math.abs(ends.boundingBox().max[1]-ends.boundingBox().min[1]-(E.grip+2*E.endT))<1e-6);
    assert.ok(Math.abs(grip.max[0]-grip.min[0]-45)<1e-6,'weld collar');
  });
  const volume=(weight:number)=>withParts(buildEisenlink(api,{set:80,weight}),parts=>named(parts,'5 lb')?.volume() ?? 0);
  assert.ok(Math.abs(volume(75)-6*volume(25))<1,'75 lb carries six 5 lb plates per side, 25 lb one');
});
