import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module, {type Manifold} from 'manifold-3d';
import {PEPIN, PEPIN_DUMBBELL, PEPIN_STAND, PEPIN_VARIANTS, STAND, STAND_HEIGHTS, pepinLength, pepinPlates, pepinSelection, pepinWeights} from './floor-parts/pepin.ts';
import {buildPepinDumbbell, buildPepinStand, pepinPinY} from './parts/pepin.ts';
import {coerceFloorParams, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorBounds, floorWarnings, validateFloorItems} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
import type {SolidPart} from './types.ts';
const api=await Module();api.setup();
const bounds=(solids:Manifold[])=>solids.map(s=>s.boundingBox()).reduce<{min:number[];max:number[]}>((a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
const named=(parts:SolidPart[],prefix:string)=>parts.find(p=>p.name.startsWith(prefix))?.solid;
const overlap=(a:Manifold,b:Manifold)=>{const i=api.Manifold.intersection([a,b]);try{return i.volume();}finally{i.delete();}};
const closed=(parts:SolidPart[],label:string)=>{for(const {solid,name,role} of parts){
  assert.ok(['frame','fastener','handle','rod','sleeve','liner','source'].includes(role),`${label} ${name}: role`);
  assert.equal(solid.status(),'NoError',`${label} ${name}`);assert.ok(solid.volume()>0,`${label} ${name}`);
  const mesh=solid.getMesh();assert.ok([...mesh.vertProperties].every(Number.isFinite),`${label} ${name}: finite`);
}};
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
test('published sizes: 65/85/105/125 lb sets, 5 lb settings from the 10 lb handle, 20 lb add-on per pair',()=>{
 assert.deepEqual(PEPIN_VARIANTS.map(pepinPlates),[5,7,9,11]);
 assert.deepEqual(PEPIN_VARIANTS.map(v=>pepinWeights(v).length),[12,16,20,24]);
 assert.equal(pepinWeights(125).at(-1),125);assert.equal(pepinWeights(65)[0],10);
 // 5 lb plates per side, two micro plates for the odd 5 lb: every setting is reachable and exact.
 for(const v of PEPIN_VARIANTS)for(const w of pepinWeights(v)){const s=pepinSelection(w);assert.ok(s.plates<=pepinPlates(v));assert.equal(10+s.plates*10+(s.micro?5:0),w);}
 // REP-published lengths: 36.8 / 41.7 / 46.5 cm (85 / 105 / 125 lb), 18.3" max.
 for(const [v,cm] of [[85,36.8],[105,41.7],[125,46.5]] as const)assert.ok(Math.abs(pepinLength(pepinPlates(v))-cm*10)<3,`${v} lb length`);
 assert.ok(pepinLength(11)<=18.3*25.4 && pepinLength(11)+2*PEPIN.cap<=PEPIN.cradleLength);
});
test('weight options follow the set size: strict for saved docs, snapped for UI edits',()=>{
 assert.deepEqual(validateFloorParams(PEPIN_DUMBBELL,{variant:125,weight:115,rest:1}),{variant:125,weight:115,rest:1});
 for(const bad of [{variant:85,weight:105},{weight:12},{variant:75},{rest:2},{colorway:1}])assert.throws(()=>validateFloorParams(PEPIN_DUMBBELL,bad),/dumbbell/);
 assert.deepEqual(coerceFloorParams(PEPIN_DUMBBELL,{variant:65,weight:125,rest:0}),{variant:65,weight:65,rest:0});
 assert.throws(()=>validateFloorParams(PEPIN_STAND,{height:22}),/dumbbell stand/);
 assert.throws(()=>validateFloorParams(PEPIN_STAND,{load:95}),/dumbbell stand/);
});
test('pairs sit side by side with a step-between gap and follow the set-down footprint',()=>{
 const doc=addFloorItem(createAssembly(),'rep-pepin-dumbbell',[0,3000],true),[a,b]=doc.floorItems!;
 assert.deepEqual([b.position[0]-a.position[0],b.position[1]-a.position[1]],[PEPIN.plate+400,0]);
 assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(doc.floorItems))),doc.floorItems);
 assert.deepEqual(floorBounds(a),{min:[-94,3000-245],max:[94,3000+245]});
 assert.deepEqual(floorBounds({...a,params:{...a.params,rest:1}}),{min:[-94,3000-245],max:[94+PEPIN.restGap+PEPIN.plate,3000+245]});
 assert.equal(floorWarnings(doc).length,0);
 const [stand]=addFloorItem(createAssembly(),'rep-pepin-stand',[0,3000]).floorItems!;
 assert.deepEqual(floorBounds(stand),{min:[-STAND.width/2,3000-STAND.length/2],max:[STAND.width/2,3000+STAND.length/2]});
});
test('every set size builds closed solids that match the footprint, cradle and published envelope',()=>{
 for(const variant of PEPIN_VARIANTS)for(const weight of [10,variant-5,variant])for(const rest of [0,1])withParts(buildPepinDumbbell(api,{variant,weight,rest}),parts=>{
  const label=`${variant}/${weight}/${rest}`,box=bounds(parts.map(p=>p.solid)),footprint=rest?[-94,94+PEPIN.restGap+PEPIN.plate]:[-94,94];
  closed(parts,label);
  assert.ok(box.min[0]>=footprint[0]-.01 && Math.abs(box.max[0]-footprint[1])<.01,`${label} width within the footprint`);
  assert.ok(Math.abs(box.max[1]-PEPIN.cradleLength/2)<.01 && Math.abs(box.min[2])<.01 && (rest ? box.max[2]<=205.01 : Math.abs(box.max[2]-205)<.01),`${label} 490 mm cradle, 205 mm loaded height`);
  const stack=bounds(['Aluminum','Selected','Plates left'].map(n=>named(parts,n)).filter(s=>s) as Manifold[]);
  if(!rest)assert.ok(Math.abs(stack.max[1]-stack.min[1]-pepinLength(pepinPlates(variant)))<.01,`${label} dumbbell length`);
  const cradle=named(parts,'Steel cradle')!;
  for(const name of ['Selected','Plates left','Aluminum','Cerakote','Nickel'])if(named(parts,name))assert.ok(overlap(cradle,named(parts,name)!)<.01,`${label} ${name} clears the cradle`);
  assert.equal(!!named(parts,'2.5 lb'),pepinSelection(weight).micro,`${label} micro plates`);
 });
});
test('the weight setting moves plates between handle and cradle and slides the pop-pin',()=>{
 const plateVolume=(parts:SolidPart[],name:string)=>named(parts,name)?.volume() ?? 0;
 const total=withParts(buildPepinDumbbell(api,{variant:105,weight:105,rest:0}),parts=>plateVolume(parts,'Selected'));
 for(const weight of [10,50,55,100])withParts(buildPepinDumbbell(api,{variant:105,weight,rest:1}),parts=>{
  const n=pepinSelection(weight).plates,carried=plateVolume(parts,'Selected'),resting=plateVolume(parts,'Plates left');
  assert.ok(Math.abs(carried+resting-total)<1,'plates are conserved');assert.ok(Math.abs(carried-total*n/9)<1,`${weight} lb carries ${n} plates per side`);
  if(n){const b=named(parts,'Selected')!.boundingBox();assert.ok(Math.abs(b.min[0]-PEPIN.plate-PEPIN.restGap+94)<.01 && Math.abs(b.min[2])<.01,'set down on the floor beside the cradle');}
  const pins=named(parts,'Magnetic')!,probe=api.Manifold.cube([10,4,4],true).translate([PEPIN.plate+PEPIN.restGap+46,pepinPinY(n),90-PEPIN.lift]);
  try{assert.ok(overlap(pins,probe)>1,`${weight} lb pin station`);}finally{probe.delete();}
 });
});
test('stand: published footprint and tray heights, loaded pair seated in the trays',()=>{
 for(const height of STAND_HEIGHTS)for(const load of [0,125])withParts(buildPepinStand(api,{height,load}),parts=>{
  const label=`${height}"/${load}`,H=height*25.4;closed(parts,label);
  const frame=bounds(['Powder-coated 11','Locking','Magnetic'].map(n=>named(parts,n)!)),trays=named(parts,'Powder-coated cradle trays')!.boundingBox();
  assert.ok(Math.abs(trays.max[0]-trays.min[0]-(2*STAND.trayWidth+STAND.opening))<.01 && frame.max[0]-frame.min[0]<=STAND.width && Math.abs(frame.max[1]-frame.min[1]-STAND.length)<.01,`${label} footprint`);
  assert.ok(Math.abs(named(parts,'Powder-coated cradle trays')!.boundingBox().max[2]-H)<.01 && Math.abs(frame.min[2])<.01,`${label} tray height`);
  assert.ok(Math.abs(named(parts,'Powder-coated 11-gauge')!.boundingBox().max[2]-H-157)<.01,`${label} add-on holder +6.2"`);
  if(load){
   const cradle=named(parts,'Steel cradle')!,trays=named(parts,'Powder-coated cradle')!;
   assert.ok(Math.abs(cradle.boundingBox().min[2]-(H-9))<.01);assert.ok(overlap(cradle,trays)<.01 && overlap(cradle,named(parts,'Powder-coated 11')!)<.01,`${label} cradles sit on the mats`);
   const all=bounds(parts.map(p=>p.solid));assert.ok(all.max[0]-all.min[0]<=STAND.width+.01,`${label} pair within the 31" width`);
  } else assert.equal(named(parts,'Steel cradle'),undefined);
 });
});
