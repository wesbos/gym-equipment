/** NÜOBELL, MX Select EVO MX100 and Kensui AdaptaBELL (adjustable-dumbbells family, group B). */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module, {type Manifold} from 'manifold-3d';
import {NUOBELL, NUOBELL_COLORWAYS, NUOBELL_DUMBBELL, NUOBELL_SETS, nuobellCradleLength, nuobellLength, nuobellWeights} from './floor-parts/adjustable-dumbbells-nuobell.ts';
import {buildNuobell, NUOBELL_AXIS} from './parts/adjustable-dumbbells-nuobell.ts';
import {MX100, MX100_DUMBBELL, mx100Length, mx100Selection, mx100Weights} from './floor-parts/adjustable-dumbbells-mx-select.ts';
import {buildMx100, MX100_AXIS} from './parts/adjustable-dumbbells-mx-select.ts';
import {ADAPTABELL_DUMBBELL, ADAPTABELL_MODELS, adaptabellEnvelope, adaptabellLoads, adaptabellStack} from './floor-parts/adjustable-dumbbells-kensui.ts';
import {buildAdaptabell} from './parts/adjustable-dumbbells-kensui.ts';
import {coerceFloorParams, resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorWarnings, validateFloorItems} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
import type {NumericParams, SolidPart} from './types.ts';
import type {FloorPart} from './floor-part.ts';
const api=await Module();api.setup();
type Box={min:number[];max:number[]};
const bounds=(solids:Manifold[]):Box=>solids.map(s=>s.boundingBox()).reduce<Box>((a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const named=(parts:SolidPart[],prefix:string)=>parts.find(p=>p.name.startsWith(prefix))?.solid;
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
const firstMidLast=<T,>(a:readonly T[])=>[...new Set([a[0],a[a.length>>1],a[a.length-1]])];
/** Every solid closed and valid, never rack paint, bounding box exactly the footprint and on the floor. */
function checkBuild(part:FloorPart,build:(p:NumericParams)=>SolidPart[],p:NumericParams,label:string){
  return withParts(build(p),parts=>{
    for(const {solid,name,role} of parts){assert.equal(solid.status(),'NoError',`${label} ${name}`);assert.ok(!solid.isEmpty() && solid.volume()>0,`${label} ${name}`);assert.notEqual(role,'frame',`${label} ${name}: factory colours`);}
    const b=bounds(parts.map(p=>p.solid)),{width,depth}=resolveBy(part.footprint,p);
    assert.ok(Math.abs(b.max[0]-b.min[0]-width)<.01 && Math.abs(b.max[1]-b.min[1]-depth)<.01,`${label} footprint ${b.max[0]-b.min[0]}×${b.max[1]-b.min[1]} vs ${width}×${depth}`);
    assert.ok(b.min[2]>=-1e-6,`${label} above the floor`);
    const tris=parts.reduce((n,p)=>n+p.solid.numTri(),0);assert.ok(tris<80000,`${label} ${tris} triangles`);
    return b;
  });
}
test('NÜOBELL: published 5 lb steps, lengths and cradle',()=>{
  assert.deepEqual(nuobellWeights(80),Array.from({length:16},(_,i)=>5+5*i));assert.deepEqual(nuobellWeights(50).at(-1),50);
  assert.equal(nuobellLength(80),485);assert.equal(nuobellLength(50),395);
  for(const set of NUOBELL_SETS)for(const weight of firstMidLast(nuobellWeights(set)))for(const colorway of [0,NUOBELL_COLORWAYS.length-1])for(const pose of [0,1]){
    const b=checkBuild(NUOBELL_DUMBBELL,p=>buildNuobell(api,p),{set,weight,colorway,pose},`NÜOBELL ${set}/${weight}/${colorway}/${pose}`);
    assert.equal(b.max[1]-b.min[1],nuobellCradleLength(set));
    if(pose)assert.ok(Math.abs(b.max[2]-NUOBELL.clearance-NUOBELL.height)<.01,'195 mm racked height');
  }
  // Racked at max: the discs and handset span the published 485 × 193 × 185 mm.
  withParts(buildNuobell(api,{set:80,weight:80,colorway:0,pose:1}),parts=>{
    const bell=bounds(['Selected','Handset','Interlocking'].map(n=>named(parts,n)!));
    assert.ok(Math.abs(bell.max[1]-bell.min[1]-485)<.5 && Math.abs(bell.max[0]-bell.min[0]-193)<.5 && Math.abs(bell.max[2]-bell.min[2]-185)<.5,`${bell.max.map((v,i)=>v-bell.min[i])}`);
    const grip=named(parts,'Knurled aluminium grip')!.boundingBox();
    assert.ok(Math.abs(grip.max[2]-grip.min[2]-32.9)<.2 && Math.abs(grip.min[2]-(NUOBELL_AXIS-16.45))<.2,'Ø32 grip on the disc axis');
  });
});
test('NÜOBELL: twisting to a weight lifts the inner discs and leaves the rest in the cradle',()=>{
  const vol=(parts:SolidPart[],prefix:string)=>named(parts,prefix)?.volume() ?? 0;
  const all=withParts(buildNuobell(api,{set:80,weight:80,colorway:0,pose:0}),parts=>vol(parts,'Selected'));
  for(const weight of [5,40,75])withParts(buildNuobell(api,{set:80,weight,colorway:0,pose:0}),parts=>{
    const n=(weight-5)/5,carried=vol(parts,'Selected'),left=vol(parts,'Discs left');
    assert.ok(Math.abs(carried+left-all)<1,`${weight}: discs conserved`);assert.ok(Math.abs(carried-all*n/15)<all*.02,`${weight}: ${n} discs per side lifted`);
    const grip=named(parts,'Knurled')!.boundingBox();assert.ok(Math.abs(grip.min[2]-(NUOBELL_AXIS-16.45+80))<.2,'handle rides 80 mm up');
    if(left){const b=named(parts,'Discs left')!.boundingBox();assert.ok(Math.abs(b.min[2]-NUOBELL.clearance)<.01,'left-behind discs stay seated');}
  });
});
test('NÜOBELL: params validate strictly and coerce on set change; pairs add side by side',()=>{
  assert.deepEqual(validateFloorParams(NUOBELL_DUMBBELL,{set:50,weight:45}),{set:50,weight:45,colorway:0,pose:0});
  for(const bad of [{set:50,weight:55},{weight:42.5},{set:60},{colorway:9},{pose:2},{handle:1}])assert.throws(()=>validateFloorParams(NUOBELL_DUMBBELL,bad),/dumbbell/);
  assert.deepEqual(coerceFloorParams(NUOBELL_DUMBBELL,{set:50,weight:80,colorway:0,pose:0}),{set:50,weight:50,colorway:0,pose:0});
  const doc=addFloorItem(createAssembly(),NUOBELL_DUMBBELL.id,[0,3000],true),[a,b]=doc.floorItems!;
  assert.deepEqual([b.position[0]-a.position[0],b.position[1]-a.position[1]],[NUOBELL.cradleWidth+60,0]);
  assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(doc.floorItems))),doc.floorItems);assert.equal(floorWarnings(doc).length,0);
});
test('MX100: 10 dial settings, published 243 → 432 mm lengths, 202 × 182 plates, 475 × 211 mm in the cradle',()=>{
  assert.deepEqual(mx100Weights(),[10,20,30,40,50,60,70,80,90,100]);
  assert.ok(Math.abs(mx100Length(0)-243)<.01 && Math.abs(mx100Length(10)-432)<.01);
  assert.deepEqual(mx100Weights().map(mx100Selection),[1,2,3,4,5,6,7,8,9,10]);
  for(const weight of firstMidLast(mx100Weights()))for(const grip of [0,1])for(const pose of [0,1]){
    const b=checkBuild(MX100_DUMBBELL,p=>buildMx100(api,p),{weight,grip,pose},`MX100 ${weight}/${grip}/${pose}`);
    if(pose)assert.ok(Math.abs(b.max[2]-MX100.height)<.01,`${b.max[2]} mm racked height`);
  }
  withParts(buildMx100(api,{weight:100,grip:0,pose:1}),parts=>{
    const plates=named(parts,'Selected')!.boundingBox(),head=named(parts,'Steel and ABS')!.boundingBox();
    assert.ok(Math.abs(plates.max[1]-plates.min[1]-432)<.6,'432 mm at 100 lb');assert.ok(Math.abs(head.max[1]-head.min[1]-243)<1,'243 mm handset');
    assert.ok(Math.abs(plates.max[0]-plates.min[0]-202)<.2 && Math.abs(plates.max[2]-plates.min[2]-182)<.5,'202 × 182 plate face');
    const grip=named(parts,'Knurled steel grip')!.boundingBox();assert.ok(Math.abs(grip.max[1]-grip.min[1]-154)<.5 && Math.abs(grip.min[2]-(MX100_AXIS-14.9))<.2,'152 × Ø29 grip');
  });
  // Dial 5: the handset carries five plates per side and leaves five in each pocket; dial 1 already carries the inner pair.
  withParts(buildMx100(api,{weight:50,grip:0,pose:0}),parts=>{
    const carried=named(parts,'Selected')!,left=named(parts,'Plates left')!;
    assert.ok(Math.abs(carried.volume()/left.volume()-1)<.03);assert.ok(Math.abs(left.boundingBox().min[2]-MX100.plateBottom)<.01 && Math.abs(carried.boundingBox().min[2]-MX100.plateBottom-80)<.01);
  });
  assert.deepEqual(validateFloorParams(MX100_DUMBBELL,{weight:70}),{weight:70,grip:0,pose:0});
  for(const bad of [{weight:75},{weight:0},{grip:2},{pose:-1},{set:80}])assert.throws(()=>validateFloorParams(MX100_DUMBBELL,bad),/dumbbell/);
  assert.deepEqual(coerceFloorParams(MX100_DUMBBELL,{weight:74,grip:1,pose:0}),{weight:70,grip:1,pose:0});
  const doc=addFloorItem(createAssembly(),MX100_DUMBBELL.id,[0,3000],true),[a,b]=doc.floorItems!;
  assert.equal(b.position[0]-a.position[0]+MX100.cradleWidth,415,'published 475 × 415 mm pair footprint');
});
test('AdaptaBELL: PRO / MAX grips and pegs, plate stacks that fit the loadable length, lying on the floor',()=>{
  const [pro,max]=ADAPTABELL_MODELS;
  assert.deepEqual([pro.gripD,max.gripD,pro.peg,max.peg],[34,38,90,107.5]);
  assert.equal(adaptabellLoads(pro).at(-1),30);assert.ok(!adaptabellLoads(pro).includes(27.5));assert.equal(adaptabellLoads(max).at(-1),35);
  assert.deepEqual(adaptabellStack(17.5).map(([lb])=>lb),[10,5,2.5]);
  for(const [model,m] of ADAPTABELL_MODELS.entries())for(const load of firstMidLast(adaptabellLoads(m))){
    const b=checkBuild(ADAPTABELL_DUMBBELL,p=>buildAdaptabell(api,p),{model,load},`AdaptaBELL ${model}/${load}`);
    const e=adaptabellEnvelope({model,load});assert.ok(Math.abs(b.max[2]-e.diameter)<.01,'rests on its largest disc');
    assert.ok(e.gap<=m.loadable && e.gap>=m.minGap);
  }
  withParts(buildAdaptabell(api,{model:1,load:0}),parts=>{const g=named(parts,'Knurled aluminium grip')!.boundingBox();assert.ok(Math.abs(g.max[0]-g.min[0]-38.8)<.2,'Ø38 MAX grip');});
  withParts(buildAdaptabell(api,{model:0,load:25}),parts=>{const pl=named(parts,'Loaded')!.boundingBox(),e=adaptabellEnvelope({model:0,load:25});assert.equal(e.gap,60);assert.ok(Math.abs(pl.max[0]-pl.min[0]-229)<1,'10 lb plates innermost');});
  assert.deepEqual(validateFloorParams(ADAPTABELL_DUMBBELL,{model:1,load:35}),{model:1,load:35});
  for(const bad of [{load:35},{load:3},{model:2},{weight:10}])assert.throws(()=>validateFloorParams(ADAPTABELL_DUMBBELL,bad),/dumbbell/);
  assert.deepEqual(coerceFloorParams(ADAPTABELL_DUMBBELL,{model:0,load:35}),{model:0,load:30});
});
