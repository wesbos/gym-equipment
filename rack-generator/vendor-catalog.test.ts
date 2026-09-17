import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definitions } from './catalog.ts';
import { DARKO_IDS, VOLTRA_IDS, vendorAttribution } from './vendor-metadata.ts';
import { createAssembly, addAccessory } from './assembly.ts';
import { partDefaults, placementDefaults, resetPart } from './reset.ts';
import { swapCandidate } from './swap.ts';
test('shared render/print catalog registers every vendor builder and credit', () => {
 assert.equal(new Set(definitions.map(d=>d.id)).size,definitions.length);
 for(const id of [...DARKO_IDS,...VOLTRA_IDS]) {
  assert.ok(definitions.find(d=>d.id===id)?.build);
  assert.ok(vendorAttribution(id)?.trademark);
 }
});
test('vendor reset and swap retain typed targets and defaults', () => {
 let doc=addAccessory(createAssembly({emptyAccessories:true}),'darko-anchor',{kind:'crossmember-top',connectionId:'left-upper-crossmember',station:3,side:1,uprightId:'front-left',face:'front',hole:0},true,{finish:2});
 const a=doc.accessories[0];
 assert.deepEqual(placementDefaults(doc,a).target,a.target);
 assert.equal(partDefaults(doc,a.part).finish,1);
 assert.equal(resetPart(doc,a.id,'finish').accessories[0].params.finish,1);
 const swap=swapCandidate(doc,a.id,'darko-double-decker');assert.equal(swap.valid,true);
 if(swap.valid){assert.deepEqual(swap.doc.accessories[0].target,a.target);assert.deepEqual(swap.doc.accessories[0].pairTarget,a.pairTarget);}
 assert.equal(swapCandidate(doc,a.id,'darko-j').valid,false);
});
