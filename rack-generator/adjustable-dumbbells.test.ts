/** Family contract for adjustable dumbbells and their stands, plus the PowerBlock stands. Per-brand geometry tests live in
 * adjustable-dumbbells-<brand>.test.ts. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {PARTS} from './floor-parts/adjustable-dumbbells.ts';
import {definitions} from './parts/adjustable-dumbbells.ts';
import {COLUMN_LOADS, COLUMN_STAND, COMPACT_LOADS, COMPACT_STAND, POWERBLOCK_COLUMN_STAND, POWERBLOCK_COMPACT_STAND, powerBlockLength} from './floor-parts/adjustable-dumbbells-powerblock.ts';
import {buildColumnStand, buildCompactStand} from './parts/adjustable-dumbbells-powerblock.ts';
import {POWERBLOCK_MODELS} from './floor-parts/powerblock.ts';
import {coerceFloorParams, floorOptions, resolveBy, validateFloorParams} from './floor-part.ts';
import type {SolidPart} from './types.ts';
const api=await Module();api.setup();
const inch=(v:number)=>v*25.4;
const bounds=(parts:SolidPart[],prefix?:string)=>{const b=parts.filter(p=>!prefix||p.name.startsWith(prefix)).map(p=>p.solid.boundingBox());return {min:[0,1,2].map(i=>Math.min(...b.map(x=>x.min[i]))),max:[0,1,2].map(i=>Math.max(...b.map(x=>x.max[i])))};};
const withParts=<T,>(parts:SolidPart[],fn:(parts:SolidPart[])=>T)=>{try{return fn(parts);}finally{parts.forEach(p=>p.solid.delete());}};
test('every family entry is registered once with a section, vendor attribution and a builder',()=>{
 const ids=PARTS.map(p=>p.id);assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(definitions.map(d=>d.id),ids,'one builder per entry, same order');
 for(const part of PARTS){
  assert.ok(['Dumbbells','Floor storage'].includes(part.section!),part.id);
  assert.ok(part.vendor?.vendor && part.vendor.url.startsWith('https://') && part.vendor.reconstruction,part.id);
  assert.match(part.description!,/Independent reconstruction.*trademarks belong to/,part.id);
  assert.deepEqual(validateFloorParams(part,part.defaults),part.defaults,part.id);
  assert.throws(()=>validateFloorParams(part,{...part.defaults,bogus:1}),part.id);
  for(const p of part.params)assert.throws(()=>validateFloorParams(part,{...part.defaults,[p.key]:-12345}),`${part.id} ${p.key}`);
 }
});
test('every family entry builds valid solids for the first, middle and last option of every param, inside its footprint',()=>{
 for(const part of PARTS){
  const def=definitions.find(d=>d.id===part.id)!;
  const combos=[part.defaults,...part.params.flatMap(p=>{const opts=floorOptions(p,part.defaults);return [opts[0],opts[opts.length>>1],opts.at(-1)!].map(v=>coerceFloorParams(part,{...part.defaults,[p.key]:v}));})];
  for(const params of combos)withParts(def.build(api,params),parts=>{
   const label=`${part.id} ${JSON.stringify(params)}`;
   assert.ok(parts.length>0,label);
   for(const p of parts){assert.equal(p.solid.status(),'NoError',`${label} ${p.name}`);assert.ok(!p.solid.isEmpty() && p.solid.volume()>0,`${label} ${p.name}`);assert.notEqual(p.role,'frame',`${label} ${p.name}: factory colours`);}
   const b=bounds(parts),{width,depth}=resolveBy(part.footprint,params);
   assert.ok(b.min[2]>=-1e-6,`${label} above the floor`);
   assert.ok(Math.abs(b.max[0]-b.min[0]-width)<1e-3 && Math.abs(b.max[1]-b.min[1]-depth)<1e-3,`${label} footprint ${width}×${depth} vs ${b.max[0]-b.min[0]}×${b.max[1]-b.min[1]}`);
   assert.ok(Math.abs(b.max[0]+b.min[0])<1e-3 && Math.abs(b.max[1]+b.min[1])<1e-3,`${label} centred on its origin`);
  });
 }
});
test('PowerBlock stands: published envelopes, and a loaded pair rests on the tray beside the micro-weight channel',()=>{
 assert.equal(COLUMN_LOADS[0],0);assert.ok(!COLUMN_LOADS.includes(2) && !COMPACT_LOADS.includes(2),'the Pro 100 EXP is over the 90 lb rating');
 assert.ok(COMPACT_LOADS.includes(POWERBLOCK_MODELS.findIndex(m=>m.name==='Commercial Pro 90')+1));
 for(const finish of [0,1])withParts(buildColumnStand(api,{finish,load:0}),parts=>{
  const b=bounds(parts);assert.ok(Math.abs(b.max[0]-b.min[0]-inch(22))<.01 && Math.abs(b.max[1]-b.min[1]-inch(18))<.01 && Math.abs(b.max[2]-inch(28))<.5,'22" × 18" × 28"');
  assert.ok(parts.some(p=>p.name.startsWith(finish?'Black powder-coated steel column':'Brushed silver steel column')));
 });
 withParts(buildCompactStand(api,{load:0}),parts=>{const b=bounds(parts);assert.ok(Math.abs(b.max[0]-b.min[0]-inch(18))<.01 && Math.abs(b.max[1]-b.min[1]-432)<.01 && Math.abs(b.max[2]-inch(26))<.5,'18" × 17" × 26"');});
 const elite=1+POWERBLOCK_MODELS.findIndex(m=>m.name==='Elite USA 90');
 withParts(buildCompactStand(api,{load:elite}),parts=>{
  const plates=bounds(parts,'Engaged plates'),tray=inch(26)-COMPACT_STAND.channelRise;
  assert.ok(Math.abs(plates.min[2]-tray-1.5)<1e-6,'plates sit on the tray mats');
  assert.ok(Math.abs(plates.max[1]-plates.min[1]-POWERBLOCK_MODELS[elite-1].length)<1,'Elite USA 90 plate nest 16.25"');
  assert.ok(plates.max[0]-plates.min[0]>2*POWERBLOCK_MODELS[elite-1].width+COMPACT_STAND.channel,'two dumbbells, one each side of the channel');
 });
 withParts(buildColumnStand(api,{finish:0,load:elite}),parts=>{const b=bounds(parts,'Engaged plates');assert.ok(b.min[2]>inch(22) && b.max[1]-b.min[1]<inch(18),'pair on the angled tray');});
 assert.equal(resolveBy(POWERBLOCK_COLUMN_STAND.footprint,{finish:0,load:0}).depth,COLUMN_STAND.depth);
 assert.equal(resolveBy(POWERBLOCK_COMPACT_STAND.footprint,{load:COMPACT_LOADS.at(-1)!}).depth,Math.max(COMPACT_STAND.depth,powerBlockLength(COMPACT_LOADS.at(-1)!)));
});
