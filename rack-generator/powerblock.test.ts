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
 for(const bad of [{weight:52.5},{model:5},{model:3,weight:50},{model:0,weight:12.5}])assert.throws(()=>validateFloorParams(POWERBLOCK,bad),/dumbbell/);
 assert.deepEqual(coerceFloorParams(POWERBLOCK,{model:4,weight:50}),{model:4,weight:24},'switching model snaps the weight into range');
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
