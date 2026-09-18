import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FLOOR_PARTS, FLOOR_PART_IDS, defineFloorPart, registerFloorPart, floorPart, isFloorPart, validateFloorParams, coerceFloorParams, resolveBy} from './floor-registry.ts';
import {addFloorItem, floorBounds, floorWarnings, moveFloorGroup, floorOffset, validateFloorItems} from './floor-items.ts';
import {createAssembly, validateAssembly} from './assembly.ts';
import {definitions} from './catalog.ts';
import {vendorAttribution} from './vendor-metadata.ts';
import type {FloorItem} from './types.ts';
test('every registered floor part is complete: catalog builder, valid defaults, footprint and attribution',()=>{
 assert.deepEqual(definitions.filter(d=>d.category==='Floor items').map(d=>d.id).sort(),[...FLOOR_PART_IDS].sort(),'register in both floor-registry.ts and catalog.ts');
 for(const part of FLOOR_PARTS){
  const def=definitions.find(d=>d.id===part.id)!;
  assert.equal(def.name,part.title);assert.deepEqual(def.defaults,part.defaults);assert.ok(isFloorPart(part.id));
  assert.deepEqual(validateFloorParams(part,{}),part.defaults);
  assert.ok(part.params.length===Object.keys(part.defaults).length && /^[a-z][a-z ]*$/.test(part.noun),part.id);
  const box=resolveBy(part.footprint,part.defaults);assert.ok(box.width>0 && box.depth>0,part.id);
  assert.deepEqual(vendorAttribution(part.id),part.vendor);
 }
 assert.equal(floorPart('upright'),undefined);assert.equal(isFloorPart('upright'),false);
});
test('Nighthawk keeps its #47 document, bounds and suggested placement',()=>{
 const legacy:FloorItem={id:'floor-7',part:'rep-nighthawk',position:[1162.5,0],rotation:0.5,params:{backrestAngle:85,seatAngle:-15}};
 assert.deepEqual(validateFloorItems([JSON.parse(JSON.stringify(legacy))]),[legacy]);
 assert.deepEqual(validateFloorItems([{...legacy,params:{}}])[0].params,{backrestAngle:0,seatAngle:0});
 for(const rotation of [0,Math.PI/6,Math.PI/2,-2]){
  const item={...legacy,rotation},c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation)),x=(658*c+1295*s)/2,z=(1295*c+658*s)/2;
  assert.deepEqual(floorBounds(item),{min:[1162.5-x,-z],max:[1162.5+x,z]});
 }
 let doc=addFloorItem(createAssembly(),'rep-nighthawk',undefined,true);doc=addFloorItem(doc,'rep-nighthawk');
 assert.deepEqual(doc.floorItems!.map(i=>i.position),[[1162.5,0],[1162.5,1400]],'unpairable parts ignore the pair flag');
 assert.equal(floorWarnings({...doc,floorItems:[{...doc.floorItems![0],position:[0,0]}]})[0].message,'Bench overlaps the rack footprint.');
});
// Dummy pairable part: weight options depend on variant, off-centre footprint, use clearance, front placement.
const DUMMY=defineFloorPart({id:'test-dumbbell',name:'Test dumbbell',title:'Test dumbbell pair',noun:'dumbbell',
 params:[{key:'variant',label:'Variant',default:0,options:[0,1],format:v=>['Light','Heavy'][v]},{key:'weight',label:'Weight',default:10,options:p=>p.variant ? [10,20,30] : [10,20]}],
 footprint:p=>({width:200,depth:400+p.weight*10,offset:[0,50]}),clearance:{width:1000,depth:1400},placement:{side:'front',gap:300},pair:{gap:50}});
registerFloorPart(DUMMY);
test('registry validation is strict for docs and coerces dependent options for UI edits',()=>{
 assert.ok(isFloorPart('test-dumbbell'));
 assert.deepEqual(validateFloorParams(DUMMY,{variant:1,weight:30}),{variant:1,weight:30});
 for(const bad of [{weight:30},{variant:2},{mass:1},[],null,{weight:'10'}])assert.throws(()=>validateFloorParams(DUMMY,bad),/dumbbell/);
 assert.deepEqual(coerceFloorParams(DUMMY,{variant:0,weight:30}),{variant:0,weight:20});
 assert.throws(()=>validateFloorItems([{id:'floor-1',part:'test-nope',position:[0,0],rotation:0,params:{}}]),/Unknown floor item/);
});
test('pairs add two independent units beside each other that move and rotate rigidly',()=>{
 const doc=validateAssembly(JSON.parse(JSON.stringify(addFloorItem(createAssembly(),'test-dumbbell',undefined,true))));
 const [a,b]=doc.floorItems!;
 assert.equal(doc.floorItems!.length,2);assert.notEqual(a.id,b.id);assert.equal(b.part,'test-dumbbell');
 assert.deepEqual([b.position[0]-a.position[0],b.position[1]-a.position[1]],[250,0],'width + gap along local X');
 // Front side: nearest footprint edge 300 mm beyond the front tube face, pair centred on the rack.
 const rackFront=400+37.5;assert.equal(Math.min(floorBounds(a).min[1],floorBounds(b).min[1]),rackFront+300);
 assert.equal((floorBounds(a).min[0]+floorBounds(b).max[0])/2,0);
 assert.ok(!floorWarnings(doc).some(w=>w.message==='Floor items overlap.'));
 assert.ok(floorWarnings(doc).some(w=>w.ids.join()===[a.id,b.id].join() && w.message==='Dumbbell use clearance overlaps another floor item.'));
 assert.ok(floorWarnings(doc).some(w=>w.ids.join()===[a.id,'rack'].join() && w.message==='Dumbbell use clearance overlaps the rack.'));
 const single=addFloorItem(doc,'test-dumbbell');assert.equal(single.floorItems!.length,3,'pair defaults off');
 assert.ok(floorBounds(single.floorItems![2]).min[0]>=floorBounds(b).max[0]+100,'suggestion steps clear of existing items');
 const items=structuredClone(doc.floorItems!);moveFloorGroup(items,[1000,2000],Math.PI/2);
 assert.deepEqual(items[0].position,[1000,2000]);assert.ok(items.every(i=>Math.abs(i.rotation-a.rotation-Math.PI/2)<1e-12));
 const expected=floorOffset(Math.PI/2,[250,0]);assert.ok(items[1].position.every((v,i)=>Math.abs(v-items[0].position[i]-expected[i])<1e-9));
 assert.ok(Math.abs(floorOffset(Math.PI/2,[250,0])[1]+250)<1e-9,'quarter turn maps local +X to floor -Z');
});
