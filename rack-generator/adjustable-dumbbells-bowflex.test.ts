import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {BOWFLEX_552, BOWFLEX_1090, SELECTTECH_552, SELECTTECH_1090, selectTechSelection} from './floor-parts/adjustable-dumbbells-bowflex.ts';
import {buildBowflex552, buildBowflex1090, selectTechLayout} from './parts/adjustable-dumbbells-bowflex.ts';
import {coerceFloorParams, resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorWarnings, validateFloorItems} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
import {DUMBBELL_LIFT} from './floor-parts/adjustable-dumbbells-common.ts';
import type {SolidPart} from './types.ts';
const api=await Module();api.setup();
const MODELS=[[BOWFLEX_552,SELECTTECH_552,buildBowflex552],[BOWFLEX_1090,SELECTTECH_1090,buildBowflex1090]] as const;
const bounds=(parts:SolidPart[],prefix?:string)=>{const s=parts.filter(p=>!prefix||p.name.startsWith(prefix));if(!s.length)return undefined;const all=api.Manifold.union(s.map(p=>p.solid)),b=all.boundingBox();all.delete();return b;};
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
test('published settings and plate lists: every cam setting sums to the dial weight',()=>{
 assert.deepEqual(SELECTTECH_552.weights,[5,7.5,10,12.5,15,17.5,20,22.5,25,30,35,40,45,50,52.5]);
 assert.deepEqual(SELECTTECH_1090.weights,Array.from({length:17},(_,i)=>10+5*i));
 assert.deepEqual(SELECTTECH_552.plates.map(p=>p.lb),[7.5,7.5,5,2.5,1.25],'BD552 manual: C5…C1, innermost first');
 assert.deepEqual(SELECTTECH_1090.plates.map(p=>p.lb),[15,10,7.5,5,2.5],'BD1090 manual: C5…C1, innermost first');
 for(const [,m] of MODELS){
  assert.equal(m.cam.length,m.weights.length);
  assert.equal(m.handleLb+2*m.plates.reduce((a,p)=>a+p.lb,0),m.weights.at(-1));
  for(const w of m.weights){const idx=selectTechSelection(m,w);assert.equal(new Set(idx).size,idx.length);assert.equal(m.handleLb+2*idx.reduce((a,i)=>a+m.plates[i].lb,0),w,`${m.name} ${w} lb`);}
  // Plates taper outward (tallest next to the grip) and the handle fits inside the tray.
  for(let i=1;i<m.plates.length;i++)assert.ok(m.plates[i].r<=m.plates[i-1].r);
  assert.ok(selectTechLayout(m).dumbbellLength<m.length);
 }
});
test('params: strict validation for saved docs, snapping for UI edits',()=>{
 assert.deepEqual(validateFloorParams(BOWFLEX_552,{}),{colorway:0,weight:25,pose:0});
 assert.deepEqual(validateFloorParams(BOWFLEX_1090,{colorway:1,weight:85,pose:1}),{colorway:1,weight:85,pose:1});
 for(const bad of [{weight:27.5},{weight:55},{colorway:2},{pose:2},{plates:3}])assert.throws(()=>validateFloorParams(BOWFLEX_552,bad),/dumbbell/);
 assert.throws(()=>validateFloorParams(BOWFLEX_1090,{weight:52.5}),/dumbbell/);
 assert.deepEqual(coerceFloorParams(BOWFLEX_552,{colorway:0,weight:27,pose:0}),{colorway:0,weight:25,pose:0});
 assert.deepEqual(coerceFloorParams(BOWFLEX_1090,{colorway:5,weight:120,pose:0}),{colorway:1,weight:90,pose:0});
});
test('every model, colourway, pose and first/middle/last weight builds closed solids matching the footprint',()=>{
 for(const [part,m,build] of MODELS)for(const colorway of [0,1])for(const pose of [0,1])for(const weight of [m.weights[0],m.weights[m.weights.length>>1],m.weights.at(-1)!])withParts(build(api,{colorway,weight,pose}),parts=>{
  const label=`${m.name} ${colorway}/${weight}/${pose}`;
  for(const p of parts){assert.ok(!p.solid.isEmpty() && p.solid.status()==='NoError' && p.solid.volume()>0,`${label} ${p.name}`);assert.notEqual(p.role,'frame');}
  const b=bounds(parts)!,{width,depth}=resolveBy(part.footprint,{colorway,weight,pose});
  assert.ok(Math.abs(b.max[0]-b.min[0]-width)<1e-6 && Math.abs(b.max[1]-b.min[1]-depth)<1e-6,`${label} footprint`);
  assert.ok(Math.abs(b.min[0]+width/2)<1e-6 && Math.abs(b.min[1]+depth/2)<1e-6 && b.min[2]>=-1e-6,`${label} centred on the floor`);
  // Published L × W × H envelope (dumbbell racked in its tray), within 1 mm.
  assert.ok(pose ? Math.abs(b.max[2]-m.height)<1 : b.max[2]>=m.height-1 && b.max[2]<=m.height+DUMBBELL_LIFT+1e-6,`${label} height ${b.max[2]}`);
  assert.equal(width,m.width);assert.equal(depth,m.length);
 });
});
test('the dial setting moves plates between the lifted handle and the tray',()=>{
 for(const [,m,build] of MODELS){
  const volume=(parts:SolidPart[],prefix:string)=>parts.filter(p=>p.name.startsWith(prefix)).reduce((a,p)=>a+p.solid.volume(),0);
  const total=withParts(build(api,{colorway:0,weight:m.weights.at(-1)!,pose:0}),parts=>{assert.equal(bounds(parts,'Plates left'),undefined,'max setting carries every plate');return volume(parts,'Selected');});
  withParts(build(api,{colorway:0,weight:m.weights[0],pose:0}),parts=>{assert.equal(bounds(parts,'Selected'),undefined,'handle only');assert.ok(Math.abs(volume(parts,'Plates left')-total)<1);});
  const mid=m.weights[9];
  withParts(build(api,{colorway:0,weight:mid,pose:0}),parts=>{
   const lifted=bounds(parts,'Selected')!,left=bounds(parts,'Plates left')!,tray=bounds(parts,'Moulded')!;
   assert.ok(Math.abs(volume(parts,'Selected')+volume(parts,'Plates left')-total)<1,'plates are conserved');
   assert.ok(Math.abs(left.min[2]-m.floor)<1e-6,'unselected plates stand on the well floor');
   assert.ok(Math.abs(lifted.min[2]-m.floor-DUMBBELL_LIFT)<1e-6,'selected plates ride up with the handle');
   assert.ok(tray.max[2]<m.axis,'tray stays below the handle axis');
   assert.equal(parts.find(p=>p.name.startsWith('Moulded'))!.solid.genus(),0,'tray wells keep a closed floor above the arched underside');
  });
  withParts(build(api,{colorway:0,weight:mid,pose:1}),parts=>assert.ok(Math.abs(bounds(parts,'Selected')!.min[2]-m.floor)<1e-6,'racked: everything seated'));
 }
});
test('builds stay within the triangle budget',()=>{
 for(const [part,,build] of MODELS)withParts(build(api,part.defaults),parts=>{const tris=parts.reduce((a,p)=>a+p.solid.numTri(),0);assert.ok(tris<80000,`${part.id} ${tris}`);});
});
test('pairs sit side by side and persist their dial setting',()=>{
 const doc=addFloorItem(createAssembly(),'bowflex-selecttech-1090',[0,3000],true),[a,b]=doc.floorItems!;
 assert.deepEqual([b.position[0]-a.position[0],b.position[1]-a.position[1]],[SELECTTECH_1090.width+80,0]);
 assert.equal(floorWarnings(doc).length,0);
 const items=[{...a,params:{colorway:1,weight:65,pose:1}}];
 assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(items))),items);
});
