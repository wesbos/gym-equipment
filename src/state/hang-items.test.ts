import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BuilderStore} from './builder-store.ts';
const memory=()=>{const values=new Map<string,string>();return {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};};
test('hanging: needs a panel, ghost on a free hook, one per slot, moves between hooks, follows and leaves with its panel',async()=>{
 const storage=memory(),store=new BuilderStore(storage);await store.ready;
 store.startPlacement('rep-lat-bar-48');
 assert.equal(store.getSnapshot().proposal,null);assert.match(store.getSnapshot().placementText,/Add a wall panel first/);
 store.escape();
 store.startPlacement('pegboard-panel');store.acceptProposal();const panel=store.getSnapshot().selected!;
 store.startPlacement('rep-lat-bar-48');
 assert.deepEqual(store.getSnapshot().proposal!.doc.hangItems!.map(h=>[h.panel,h.slot]),[[panel,5]],'suggested: top centre hook');
 assert.equal(store.getSnapshot().doc.hangItems,undefined,'the ghost lives only in the proposal');
 store.previewHang(panel,16);store.escape();assert.equal(store.getSnapshot().doc.hangItems,undefined,'ESC cancels');
 store.startPlacement('rep-lat-bar-48');store.previewHang(panel,16);store.acceptProposal();
 const bar=store.getSnapshot().selected!,placed=structuredClone(store.getSnapshot().doc);
 assert.deepEqual(placed.hangItems,[{id:bar,part:'rep-lat-bar-48',panel,slot:16}]);
 store.startPlacement('rep-tricep-rope');store.previewHang(panel,16);store.acceptProposal();
 assert.equal(store.getSnapshot().doc.hangItems!.length,1,'one attachment per slot');assert.match(store.getSnapshot().status,/already used/);
 store.escape();
 // Drag/double-click reposition = a move placement on the same attachment; one undo step.
 store.pickup(bar);assert.equal(store.getSnapshot().placing!.movingId,bar);store.previewHang(panel,5);store.acceptProposal();
 assert.deepEqual(store.getSnapshot().doc.hangItems!.map(h=>[h.id,h.slot]),[[bar,5]]);
 store.history('undo');assert.deepEqual(store.getSnapshot().doc,placed);store.history('redo');
 // Moving the panel stages its attachments in the ghost, and the bar follows on commit.
 store.pickup(panel);assert.deepEqual(store.getSnapshot().proposal!.entries.map(e=>e.id),[panel,bar]);
 store.previewWall('back',[-1000,1600]);store.acceptProposal();
 const resolved=store.getSnapshot().resolved,[p,b]=[resolved.find(r=>r.id===panel)!,resolved.find(r=>r.id===bar)!];
 assert.deepEqual([b.rotation,Math.round(b.position[0]-p.position[0]),Math.round(b.position[2]-p.position[2])],[p.rotation,0,241]);
 // Shrinking keeps same-spot hooks; a second attachment off the narrow grid is dropped with a notice.
 store.startPlacement('rep-ankle-cuff');store.previewHang(panel,65);store.acceptProposal();
 store.updateWall(panel,{params:{width:610}});
 assert.deepEqual(store.getSnapshot().doc.hangItems!.map(h=>[h.part,h.slot]),[['rep-lat-bar-48',2]]);assert.match(store.getSnapshot().status,/1 hung attachment had no matching hook/);
 store.history('undo');
 await store.save('Cable wall');await store.flushStorage();
 const restored=new BuilderStore(storage);await restored.ready;assert.deepEqual(restored.getSnapshot().doc,store.getSnapshot().doc);
 // Removing the panel removes its attachments (no orphans) and says so; undo restores both.
 store.select(panel);store.removeSelected();
 assert.deepEqual([store.getSnapshot().doc.wallItems,store.getSnapshot().doc.hangItems],[[],[]]);assert.match(store.getSnapshot().status,/Removed 2 hung attachments with the panel/);
 store.history('undo');assert.equal(store.getSnapshot().doc.hangItems!.length,2);
 store.selectMany([panel,bar]);store.removeSelected();assert.deepEqual(store.getSnapshot().doc.hangItems,[]);
});
