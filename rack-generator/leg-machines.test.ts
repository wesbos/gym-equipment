import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {PARTS} from './floor-parts/leg-machines.ts';
import {buildLegMachine} from './parts/leg-machines.ts';
import {definitions} from './parts/leg-machines.ts';
import {coerceFloorParams, floorOptions, resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorBounds, validateFloorItems} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
import {PLATE_SPECS} from './plates.ts';
import type {NumericParams, SolidPart} from './types.ts';
import {printableMesh} from '../src/exports/print-mesh.ts';
import {BUILD_BUDGET_MS} from './test-budget.ts';
const api=await Module();api.setup();
const inch=(v:number)=>v*25.4;
/** Published envelopes (research/leg-machines.md), re-typed from the product pages independent of the model constants:
 * [length (floor depth), width (floor X), height] in inches, each with a tolerance in mm and the pose it is measured in. */
const PUBLISHED:Record<string,{l?:number;w?:number;h:number;tol:number;pose?:NumericParams}>={
 'titan-leg-extension-curl':{l:36,w:42,h:39,tol:60},
 'mikolo-taweret-leg-extension-curl':{l:49.6,w:30.6,h:43.5,tol:60},
 'gmwd-le08-leg-extension-curl':{l:54.6,w:55.4,h:38.8,tol:60},
 'lionscool-leg-extension-curl-v4':{l:40.8,w:33,h:38.3,tol:60},
 'ritfit-plc01-leg-extension-curl':{l:50.9,w:43.5,h:42.7,tol:60},
 'tog-selectorized-leg-extension-seated-curl-v3':{l:46.5,w:38.8,h:61,tol:80},
 'titan-selectorized-leg-extension-curl':{l:60,w:36,h:63,tol:80},
 'force-usa-compact-leg-press-hack-squat':{l:65,w:52,h:57,tol:80},
 'tog-quadsend-leg-press-hack-squat':{l:99.3,w:66.2,h:56.2,tol:80},
 'titan-leg-press-hack-squat':{l:84,w:40,h:53,tol:80},
};
const bbox=(parts:SolidPart[],pick:(p:SolidPart)=>boolean=()=>true)=>{const s=parts.filter(pick);if(!s.length)return undefined;const all=api.Manifold.union(s.map(p=>p.solid)),b=all.boundingBox();all.delete();return b;};
const cases=(part:(typeof PARTS)[number])=>{
 const out:NumericParams[]=[{...part.defaults}];
 for(const p of part.params){const opts=floorOptions(p,part.defaults);for(const v of new Set([opts[0],opts[opts.length>>1],opts.at(-1)!]))out.push(coerceFloorParams(part,{...part.defaults,[p.key]:v}));}
 // Heaviest, fully posed: every pose param at its last option.
 out.push(coerceFloorParams(part,Object.fromEntries(part.params.map(p=>[p.key,floorOptions(p,part.defaults).at(-1)!]))));
 return out;
};
const build=(id:string,p:NumericParams)=>buildLegMachine(api,id,p);
test('the catalog lists the #120 machines, most-owned first, as Machines with vendor credit',()=>{
 assert.deepEqual(PARTS.map(p=>p.id),Object.keys(PUBLISHED));
 assert.deepEqual(definitions.map(d=>d.id),PARTS.map(p=>p.id));
 for(const part of PARTS){
  assert.equal(part.section,'Machines');assert.equal(part.noun,'machine');
  assert.ok(part.vendor && part.vendor.url.startsWith('https://') && part.vendor.trademark && /Published.*Estimated/s.test(part.vendor.reconstruction),part.id);
  assert.match(part.description!,/Independent reconstruction .*; .+ trademarks belong to .+\.$/);
 }
});
test('every machine and param extreme builds closed, printable solids whose bounds are the footprint',()=>{
 for(const part of PARTS)for(const params of cases(part)){
  const t0=performance.now(),parts=build(part.id,params),ms=performance.now()-t0,tag=`${part.id} ${JSON.stringify(params)}`;
  try{
   for(const p of parts){assert.ok(!p.solid.isEmpty() && p.solid.status()==='NoError' && p.solid.volume()>0,`${tag} ${p.name}`);assert.notEqual(p.role,'frame','factory finishes, not rack paint');printableMesh(p.solid,`${tag} ${p.name}`);}
   const b=bbox(parts)!,box=resolveBy(part.footprint,params),[ox,oz]=box.offset??[0,0];
   // Footprint = exact bounds of the ideal shapes; polygonal cylinders may sit up to ~1 mm inside them.
   assert.ok(Math.abs(b.max[0]-b.min[0]-box.width)<1.5 && Math.abs(b.max[1]-b.min[1]-box.depth)<1.5,`${tag} footprint ${box.width}×${box.depth} vs ${(b.max[0]-b.min[0]).toFixed(1)}×${(b.max[1]-b.min[1]).toFixed(1)}`);
   assert.ok(Math.abs((b.min[0]+b.max[0])/2-ox)<1 && Math.abs(-(b.min[1]+b.max[1])/2-oz)<1,`${tag} footprint offset`);
   assert.ok(b.min[2]>=-1e-6 && b.min[2]<1,`${tag} stands on the floor`);
   const tris=parts.reduce((n,p)=>n+p.solid.numTri(),0);assert.ok(tris<80000,`${tag}: ${tris} triangles`);
   assert.ok(ms<BUILD_BUDGET_MS,`${tag}: ${ms.toFixed(0)} ms`);
  }finally{parts.forEach(p=>p.solid.delete());}
 }
});
test('published overall length, width and height come out of the default build',()=>{
 for(const part of PARTS){
  const spec=PUBLISHED[part.id],params={...part.defaults,...spec.pose},parts=build(part.id,params);
  try{
   const b=bbox(parts)!,size=[b.max[0]-b.min[0],b.max[1]-b.min[1],b.max[2]];
   if(spec.w)assert.ok(Math.abs(size[0]-inch(spec.w))<=spec.tol,`${part.id} width ${size[0].toFixed(0)} vs ${inch(spec.w).toFixed(0)}`);
   if(spec.l)assert.ok(Math.abs(size[1]-inch(spec.l))<=spec.tol,`${part.id} length ${size[1].toFixed(0)} vs ${inch(spec.l).toFixed(0)}`);
   assert.ok(Math.abs(size[2]-inch(spec.h))<=spec.tol,`${part.id} height ${size[2].toFixed(0)} vs ${inch(spec.h).toFixed(0)}`);
  }finally{parts.forEach(p=>p.solid.delete());}
 }
});
test('plate horns load real Olympic plates and grow the footprint; unloaded horns carry none',()=>{
 for(const part of PARTS.filter(p=>p.params.some(q=>q.key==='plates'))){
  const max=floorOptions(part.params.find(p=>p.key==='plates')!,part.defaults).at(-1)!;
  const empty=build(part.id,{...part.defaults,plates:0}),full=build(part.id,{...part.defaults,plates:max});
  try{
   assert.equal(empty.filter(p=>/-\d+ 45 lb$/.test(p.name)).length,0,part.id);
   const plates=full.filter(p=>/-\d+ 45 lb$/.test(p.name)),horns=new Set(plates.map(p=>p.name.replace(/-\d+ 45 lb$/,''))).size;
   assert.equal(plates.length,max*horns,`${part.id}: ${max} plates on each of ${horns} horn(s)`);
   const disc=bbox(full,p=>p===plates[0])!,d=Math.max(...[0,1,2].map(i=>disc.max[i]-disc.min[i]));
   assert.ok(Math.abs(d-PLATE_SPECS.lb45.diameter)<3,`${part.id}: 45 lb plates are ${PLATE_SPECS.lb45.diameter} mm`);
   const a=resolveBy(part.footprint,{...part.defaults,plates:0}),b=resolveBy(part.footprint,{...part.defaults,plates:max});
   assert.ok(b.width*b.depth>=a.width*a.depth-1e-6,`${part.id}: loaded footprint covers the plates`);
  }finally{[...empty,...full].forEach(p=>p.solid.delete());}
 }
});
test('lever and sled poses move the arms and carriages along their real paths',()=>{
 const at=(id:string,p:NumericParams,pick:RegExp)=>{const parts=build(id,{...PARTS.find(x=>x.id===id)!.defaults,...p});try{return bbox(parts,s=>pick.test(s.name))!;}finally{parts.forEach(s=>s.solid.delete());}};
 // Leg extension: the shin roller swings forward and up from start to peak contraction.
 for(const id of ['titan-leg-extension-curl','mikolo-taweret-leg-extension-curl','gmwd-le08-leg-extension-curl','lionscool-leg-extension-curl-v4','ritfit-plc01-leg-extension-curl','tog-selectorized-leg-extension-seated-curl-v3','titan-selectorized-leg-extension-curl']){
  const start=at(id,{mode:0,rep:0},/Foam roller/),peak=at(id,{mode:0,rep:2},/Foam roller/);
  assert.ok(peak.min[2]>start.min[2]+100,`${id}: roller rises at peak contraction`);
  assert.ok(peak.min[1]<start.min[1]-100,`${id}: roller swings out in front`);
 }
 // Selectorized: the pin sets how many plates ride up with the headplate at peak contraction.
 for(const [id,light,heavy] of [['titan-selectorized-leg-extension-curl',10,250],['tog-selectorized-leg-extension-seated-curl-v3',5,120]] as const){
  const rest=at(id,{rep:0,pin:heavy},/^Weight stack plates$/),lifted=at(id,{rep:2,pin:heavy},/^Weight stack plates$/),one=at(id,{rep:2,pin:light},/^Weight stack plates$/);
  assert.ok(lifted.max[2]>rest.max[2]+150,`${id}: stack rises at peak`);
  assert.ok(Math.abs(one.max[2]-lifted.max[2])<1,`${id}: headplate height follows the lever, not the pin`);
  const pin=(w:number)=>at(id,{rep:0,pin:w},/^Selector pin$/);
  if(light>5)assert.ok(pin(light+10).min[2]>pin(heavy).min[2]+300,`${id}: a light pin sits high in the stack`);
 }
 // Leg press sleds climb their rails; plates ride with them.
 for(const id of ['force-usa-compact-leg-press-hack-squat','tog-quadsend-leg-press-hack-squat','titan-leg-press-hack-squat']){
  const low=at(id,{sled:0,plates:2},/Loaded plate/),high=at(id,{sled:4,plates:2},/Loaded plate/);
  assert.ok(high.max[2]>low.max[2]+150 && high.max[1]>low.max[1]+150,`${id}: sled climbs the incline`);
 }
});
test('params validate strictly and coerce to the nearest real setting; the machines place beside the rack',()=>{
 for(const part of PARTS){
  assert.deepEqual(validateFloorParams(part,{}),part.defaults);
  assert.throws(()=>validateFloorParams(part,{plates:99}),/machine/);
  assert.throws(()=>validateFloorParams(part,{bogus:1}),/machine/);
  assert.throws(()=>validateFloorParams(part,{mode:7}),/machine/);
 }
 const titan=PARTS.find(p=>p.id==='titan-selectorized-leg-extension-curl')!;
 assert.equal(coerceFloorParams(titan,{pin:137}).pin,140);
 assert.deepEqual(floorOptions(titan.params.find(p=>p.key==='pin')!,titan.defaults),Array.from({length:25},(_,i)=>(i+1)*10),'10 lb start, 250 lb in 10 lb steps');
 const doc=addFloorItem(createAssembly(),'titan-leg-extension-curl'),item=doc.floorItems![0];
 const b=floorBounds(item),box=resolveBy(PARTS[0].footprint,item.params);
 assert.ok(Math.abs(b.max[0]-b.min[0]-box.width)<1e-6);
 const moved=[{...item,params:{...item.params,rep:2,plates:3}}];
 assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(moved))),moved);
});
