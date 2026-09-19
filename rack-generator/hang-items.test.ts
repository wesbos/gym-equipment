import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {HANG_PARTS, HANG_PART_IDS, hangPart, isHangPart, HOOK_REACH} from './hang-registry.ts';
import {freeSlots, hangWarnings, hookAnchor, panelSlots, placeHang, reslotHangs, resolveHangItems, validateHangItems} from './hang-items.ts';
import {pegboardSlots} from './wall-parts/pegboard.ts';
import {pegboardHoles} from './parts/pegboard.ts';
import {addWallItem} from './wall-items.ts';
import {createAssembly, validateAssembly, removeInstance, resolveAssembly} from './assembly.ts';
import {definitions} from './catalog.ts';
import {HANG_SECTIONS} from './catalog-sections.ts';
import {vendorAttribution} from './vendor-metadata.ts';
import {cleanDocument} from '../src/state/history.ts';
import type {RackDoc} from './types.ts';
const api=await Module();api.setup();
const panelDoc=(width=1219)=>{const doc=addWallItem(createAssembly(),'pegboard-panel',{wall:'back',position:[-1500,1500]});doc.wallItems![0].params.width=width;return doc;};
test('the eight v1 attachments are registered, credited to REP and build in both poses inside their envelopes',()=>{
 assert.deepEqual(HANG_PART_IDS,['rep-lat-bar-48','rep-straight-bar-25','rep-tricep-rope','rep-d-handles','rep-triangle-row','rep-pushdown-bar','rep-curl-bar','rep-ankle-cuff']);
 assert.deepEqual(definitions.filter(d=>(HANG_SECTIONS as readonly string[]).includes(d.category)).map(d=>d.id),HANG_PART_IDS,'register in both hang-registry.ts and catalog.ts');
 for(const part of HANG_PARTS){
  assert.ok(isHangPart(part.id));assert.deepEqual(vendorAttribution(part.id),part.vendor);assert.match(part.vendor!.url,/^https:\/\/repfitness\.com\/products\//);
  const def=definitions.find(d=>d.id===part.id)!;assert.deepEqual(def.defaults,{hook:0});
  for(const hook of [0,1]){
   const solids=def.build(api,{hook}),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(const s of solids){const b=s.solid.boundingBox();for(let i=0;i<3;i++){min[i]=Math.min(min[i],b.min[i]);max[i]=Math.max(max[i],b.max[i]);}s.solid.delete();}
   const {width,above,drop}=part.envelope;
   assert.ok(min[0]>=-width/2 && max[0]<=width/2 && min[2]>=-drop && max[2]<=above,`${part.id} fits its envelope`);
   // The anchor is the model origin: eye/ring material straddles it, and the peg reaches back to the panel face without crossing it.
   assert.ok(min[2]<0 && max[2]>0 && min[1]<0,`${part.id} anchor`);assert.ok(max[1]<=(hook ? HOOK_REACH+19 : HOOK_REACH),`${part.id} clears the panel face`);
   assert.equal(solids.some(s=>s.name==='Pegboard hook'),!!hook);
  }
 }
 const lat=hangPart('rep-lat-bar-48')!.envelope.width;assert.ok(HANG_PARTS.every(p=>p.envelope.width<=lat),'the 48″ lat bar dominates the panel');
 assert.throws(()=>definitions.find(d=>d.id==='rep-tricep-rope')!.build(api,{hook:2}),/pose/);
});
test('pegboard slots sit on hole centres, and centred slots exist on both sizes',()=>{
 const wide=pegboardSlots(1219),narrow=pegboardSlots(610),{columns,rows}=pegboardHoles(1219);
 assert.deepEqual([wide.length,narrow.length],[66,30]);
 for(const [x,z] of wide) assert.ok(columns.some(c=>Math.abs(c-x)<1e-9) && rows.some(r=>Math.abs(r-z)<1e-9));
 for(const slot of narrow) assert.ok(wide.some(w=>w[0]===slot[0] && w[1]===slot[1]));
});
test('hung attachments validate strictly as children of a slotted panel and persist',()=>{
 let doc=placeHang(panelDoc(),'rep-lat-bar-48',{panel:'wall-1',slot:5});
 doc=placeHang(doc,'rep-tricep-rope',{panel:'wall-1',slot:56});
 assert.deepEqual(doc.hangItems,[{id:'hang-2',part:'rep-lat-bar-48',panel:'wall-1',slot:5},{id:'hang-3',part:'rep-tricep-rope',panel:'wall-1',slot:56}]);
 const restored=validateAssembly(JSON.parse(JSON.stringify(doc)));assert.deepEqual(restored.hangItems,doc.hangItems);assert.deepEqual(cleanDocument(restored).hangItems,doc.hangItems);
 const item=doc.hangItems![0],panels=doc.wallItems!;
 for(const [bad,message] of [[{panel:'wall-9'},/missing panel/],[{slot:66},/does not exist/],[{slot:1.5},/does not exist/],[{part:'upright'},/Unknown/],[{id:'wall-1'},/ID/]] as const)
  assert.throws(()=>validateHangItems([{...item,...bad}],panels),message);
 assert.throws(()=>validateHangItems([item,{...item,id:'hang-9'}],panels),/already used/);
 assert.throws(()=>validateAssembly({...doc,wallItems:[]}),/missing panel/,'orphans never load');
});
test('attachments follow their panel on every wall; free slots respect envelopes and exclude the moving item',()=>{
 let doc=placeHang(panelDoc(),'rep-lat-bar-48',{panel:'wall-1',slot:5});
 for(const wall of ['back','left','right','front'] as const){
  const moved:RackDoc={...doc,wallItems:[{...doc.wallItems![0],wall,position:[300,1400]}]};
  const [panel]=resolveAssembly(moved).filter(r=>r.id==='wall-1'),[bar]=resolveHangItems(moved),a=panel.rotation[2],[x,y,z]=hookAnchor(moved.wallItems![0],5);
  assert.ok([panel.position[0]+x*Math.cos(a)-y*Math.sin(a)-bar.position[0],panel.position[1]+x*Math.sin(a)+y*Math.cos(a)-bar.position[1],panel.position[2]+z-bar.position[2]].every(v=>Math.abs(v)<1e-9),wall);
  assert.deepEqual([bar.rotation,bar.kind,bar.ownerId,bar.connectedTo,bar.params],[panel.rotation,'wall-item','hang-2',['wall-1'],{hook:1}]);
 }
 assert.equal(y0(doc),-(19+HOOK_REACH),'anchor sits at the peg reach in front of the face');
 const free=freeSlots(doc,'rep-straight-bar-25');
 assert.ok(!free.some(t=>t.slot<22),'the lat bar blocks the top two rows for another bar');
 assert.deepEqual(free[0],{panel:'wall-1',slot:27},'suggestion: highest free row, centre first');
 assert.deepEqual(freeSlots(doc,'rep-lat-bar-48','hang-2')[0],{panel:'wall-1',slot:5},'moving item frees its own hook');
 assert.equal(freeSlots(createAssembly(),'rep-lat-bar-48').length,0);
 doc=placeHang(doc,'rep-straight-bar-25',{panel:'wall-1',slot:27});
 assert.deepEqual(hangWarnings(doc),[]);
 assert.deepEqual(hangWarnings({...doc,hangItems:[doc.hangItems![0],{...doc.hangItems![1],slot:16}]}).map(w=>w.message),['Hung attachments overlap.']);
});
const y0=(doc:RackDoc)=>hookAnchor(doc.wallItems![0],0)[1];
test('removing a panel takes its attachments; resizing keeps same-spot hooks and drops the rest',()=>{
 let doc=placeHang(panelDoc(),'rep-lat-bar-48',{panel:'wall-1',slot:5});
 doc=placeHang(doc,'rep-ankle-cuff',{panel:'wall-1',slot:65});doc=placeHang(doc,'rep-d-handles',{panel:'wall-1',slot:61});
 const removed=removeInstance(doc,'wall-1');assert.deepEqual([removed.wallItems,removed.hangItems],[[],[]]);
 assert.equal(removeInstance(doc,'hang-3').hangItems!.length,2);
 const next=structuredClone(doc),previous=next.wallItems![0].params;next.wallItems![0].params={width:610};
 assert.deepEqual(reslotHangs(next,'wall-1',previous),['hang-3']);
 const narrow=panelSlots(next.wallItems![0]),keep=next.hangItems!.map(h=>narrow[h.slot]);
 assert.deepEqual(keep,[pegboardSlots(1219)[5],pegboardSlots(1219)[61]]);assert.doesNotThrow(()=>validateAssembly(next));
});
