import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {POWERBLOCK, POWERBLOCK_MODELS, POWERBLOCK_LIFT, POWERBLOCK_CRADLE_MARGIN, powerBlockWeights, powerBlockSelection} from './floor-parts/powerblock.ts';
import {buildPowerBlock, powerBlockLayout} from './parts/powerblock.ts';
import {coerceFloorParams, resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorBounds, floorWarnings, validateFloorItems} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
const api=await Module();api.setup();
const box=(parts:ReturnType<typeof buildPowerBlock>,name?:string)=>{const s=parts.filter(p=>!name||p.name===name);if(!s.length)return undefined;const all=api.Manifold.union(s.map(p=>p.solid)),b=all.boundingBox();all.delete();return b;};
test('selector weights follow the published PowerBlock charts',()=>{
 const elite=powerBlockWeights(POWERBLOCK_MODELS[0]);
 assert.deepEqual(elite.slice(0,4),[15,17.5,20,25]);assert.equal(elite.at(-1),90);assert.equal(elite.length,24);
 assert.deepEqual(powerBlockSelection(POWERBLOCK_MODELS[0],50),{plates:3,adders:2},'white, purple, green on the pin + two adders');
 assert.deepEqual(powerBlockWeights(POWERBLOCK_MODELS[3]),[4,8,12,16,20,24,28,32]);
 assert.deepEqual(powerBlockWeights(POWERBLOCK_MODELS[4]),[3,6,9,12,15,18,21,24]);
 assert.equal(powerBlockWeights(POWERBLOCK_MODELS[1]).at(-1),100);assert.equal(powerBlockWeights(POWERBLOCK_MODELS[2]).length,19);
 for(const m of POWERBLOCK_MODELS)assert.equal(m.handleLb+m.rails.length*m.plateLb+m.adders*m.adderLb>=m.max,true,m.name);
 assert.deepEqual(validateFloorParams(POWERBLOCK,{model:4,weight:9}),{model:4,weight:9});
 for(const bad of [{weight:52.5},{model:POWERBLOCK_MODELS.length},{model:3,weight:50},{model:0,weight:12.5}])assert.throws(()=>validateFloorParams(POWERBLOCK,bad),/dumbbell/);
 assert.deepEqual(coerceFloorParams(POWERBLOCK,{model:4,weight:50}),{model:4,weight:24},'switching model snaps the weight into range');
});
test('EXP stage presets and the Commercial Pro 90 follow the published charts and lengths',()=>{
 const byName=(prefix:string)=>POWERBLOCK_MODELS.map((m,i)=>[m,i] as const).filter(([m])=>m.name.startsWith(prefix));
 // Stage 1: 2.5 (adder), 5, 7.5, 10, 15, 17.5, 20, 25 … 45, 47.5, 50; Stage 2 adds 55–70, Stage 3 adds 75–90 (Rogue / PowerBlock charts).
 for(const family of ['Elite EXP','Sport EXP']){
  const stages=byName(family);assert.equal(stages.length,3,family);
  assert.deepEqual(powerBlockWeights(stages[0][0]),[5,7.5,10,15,17.5,20,25,27.5,30,35,37.5,40,45,47.5,50]);
  assert.deepEqual(stages.map(([m])=>[m.max,m.rails.length,Math.round(m.length/25.4)]),[[50,4,12],[70,6,14],[90,8,16]],`${family} stages`);
  assert.deepEqual(powerBlockWeights(stages[2][0]).slice(-6),[75,77.5,80,85,87.5,90]);
 }
 assert.deepEqual(byName('PowerBlock EXP').map(([m])=>m.max),[90]);
 const [[pro90,index]]=byName('Commercial Pro 90');
 assert.deepEqual(powerBlockWeights(pro90),Array.from({length:18},(_,i)=>5+5*i),'5–90 lb in 5 lb steps: 5 lb or 10 lb handle');
 assert.deepEqual(powerBlockSelection(pro90,55),{plates:5,adders:0});assert.deepEqual(powerBlockSelection(pro90,60),{plates:5,adders:1});
 const parts=buildPowerBlock(api,{model:index,weight:90});assert.ok(!parts.some(p=>p.name==='Micro adder weights'),'handle swap, no chrome adders');
 const b=box(parts,'Engaged plates · lifted with handle')!;for(const p of parts)p.solid.delete();
 assert.ok(Math.abs(Math.max(b.max[0]-b.min[0],b.max[1]-b.min[1])-17*25.4)<1,'17" long');
});
test('every model and weight builds closed solids inside the cradle footprint',()=>{
 // Every Elite USA 90 pin position; first, middle and last for the other presets.
 for(const [model,m] of POWERBLOCK_MODELS.entries())for(const weight of powerBlockWeights(m).filter((_,i,all)=>!model || [0,all.length>>1,all.length-1].includes(i))){
  const parts=buildPowerBlock(api,{model,weight});
  for(const p of parts){assert.ok(!p.solid.isEmpty() && p.solid.status()==='NoError' && p.solid.volume()>0,`${m.name} ${weight} ${p.name}`);assert.notEqual(p.role,'frame','fixed factory colours, not rack paint');}
  const b=box(parts)!,{width,depth}=resolveBy(POWERBLOCK.footprint,{model,weight});
  assert.ok(b.min[2]>=-1e-6 && Math.abs(b.max[0]-b.min[0]-width)<1e-6 && Math.abs(b.max[1]-b.min[1]-depth)<1e-6,`${m.name} ${weight} footprint`);
  assert.ok(b.max[2]<m.height+POWERBLOCK_LIFT+30,`${m.name} height`);
  for(const p of parts)p.solid.delete();
 }
});
test('the pin setting moves plates between the lifted handle and the cradle',()=>{
 const rest=(weight:number)=>{const parts=buildPowerBlock(api,{model:0,weight}),lifted=box(parts,'Engaged plates · lifted with handle'),left=box(parts,'Plates left in cradle');const r={lifted,left,names:parts.map(p=>p.name)};for(const p of parts)p.solid.delete();return r;};
 const empty=rest(15),mid=rest(50),full=rest(90),{base,top}=powerBlockLayout({model:0,weight:50});
 assert.equal(empty.lifted,undefined);assert.equal(full.left,undefined,'all seven plates on the pin');
 assert.ok(mid.lifted && mid.left);
 assert.ok(Math.abs(mid.left!.min[2]-base)<1e-6 && mid.left!.max[2]<=top+1e-6,'left-behind plates sit in the cradle');
 assert.ok(mid.lifted!.min[2]>=base+POWERBLOCK_LIFT-1e-6 && Math.abs(mid.lifted!.max[2]-top-POWERBLOCK_LIFT)<1e-6,'engaged plates ride up with the handle');
 // Engaged plates are the inner nest: shorter along the dumbbell than the outer plates left behind.
 assert.ok(mid.lifted!.max[1]<mid.left!.max[1]);
 assert.ok(mid.names.includes('Micro adder weights') && !rest(45).names.includes('Micro adder weights'));
 assert.ok(full.lifted!.max[1]-full.lifted!.min[1]>mid.lifted!.max[1]-mid.lifted!.min[1]);
});
test('dumbbells add as a pair beside each other and persist their selector setting',()=>{
 const doc=addFloorItem(createAssembly(),'powerblock',undefined,true),[a,b]=doc.floorItems!;
 const {width}=resolveBy(POWERBLOCK.footprint,POWERBLOCK.defaults);
 assert.equal(width,Math.round(6*25.4)+2*POWERBLOCK_CRADLE_MARGIN);
 assert.deepEqual([b.position[0]-a.position[0],b.position[1]-a.position[1]],[width+60,0]);
 const rackLeft=Math.min(...Object.values(doc.uprights).map(u=>u.x))-doc.rack.tube/2;
 assert.ok(Math.abs(Math.max(floorBounds(a).max[0],floorBounds(b).max[0])-(rackLeft-300))<1e-6,'suggested 300 mm left of the rack');
 assert.deepEqual(floorWarnings(doc),[]);
 const items=[{...a,params:{model:1,weight:72.5}}];
 assert.deepEqual(validateFloorItems(JSON.parse(JSON.stringify(items))),items);
});
