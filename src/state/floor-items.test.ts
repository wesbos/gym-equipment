import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BuilderStore} from './builder-store.ts';
test('floor suggestion commits once, transforms group into one undo, ESC restores redo, named Save reloads',async()=>{
 const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
 const store=new BuilderStore(storage);await store.ready;
 store.startPlacement('rep-nighthawk');assert.equal(store.getSnapshot().doc.floorItems,undefined);assert.equal(store.getSnapshot().proposal!.entries[0].kind,'floor-item');
 store.previewFloor([1200,700],Math.PI/2);store.acceptProposal();
 const id=store.getSnapshot().selected!,original=structuredClone(store.getSnapshot().doc);
 store.beginGesture();store.updateFloor(id,{position:[1250,800]});store.updateFloor(id,{rotation:0});store.endGesture();
 store.history('undo');assert.deepEqual(store.getSnapshot().doc,original);assert.equal(store.getSnapshot().canRedo,true);
 store.beginGesture();store.updateFloor(id,{position:[-500,900]});store.escape();assert.deepEqual(store.getSnapshot().doc,original);assert.equal(store.getSnapshot().canRedo,true);
 store.select(id);store.paintSelection('#a9232c');store.updateFloor(id,{params:{backrestAngle:85,seatAngle:-15}});await store.save('Bench floor');await store.flushStorage();
 const restored=new BuilderStore(storage);await restored.ready;assert.deepEqual(restored.getSnapshot().doc,store.getSnapshot().doc);
 store.selectMany([id,'front-left']);store.removeSelected();assert.equal(store.getSnapshot().doc.floorItems!.length,0);assert.ok(store.getSnapshot().doc.removed.includes('front-left'));store.history('undo');assert.equal(store.getSnapshot().doc.floorItems!.length,1);
});
