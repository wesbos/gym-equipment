import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {WALL_PARTS, WALL_PART_IDS, wallPart, isWallPart, wallFace} from './wall-registry.ts';
import {addWallItem, clampWallPosition, resolveWallItems, validateWallItems, wallRect, wallWarnings} from './wall-items.ts';
import {ROOM_DEFAULTS, WALL_IDS, validateRoom, wallFrames, wallHit, wallPlaneHit, facesInside} from './walls.ts';
import {createAssembly, validateAssembly, resizeAssembly, removeInstance, resolveAssembly} from './assembly.ts';
import {buildPegboard, pegboardHoles} from './parts/pegboard.ts';
import {definitions} from './catalog.ts';
import {cleanDocument} from '../src/state/history.ts';
import type {Vec3, WallItem} from './types.ts';
const near=(a:number[],b:number[])=>a.every((v,i)=>Math.abs(v-b[i])<1e-9);
test('every registered wall part is complete: catalog builder under Wall storage, valid defaults and face',()=>{
 assert.deepEqual(definitions.filter(d=>d.category==='Wall storage').map(d=>d.id).sort(),[...WALL_PART_IDS].sort(),'register in both wall-registry.ts and catalog.ts');
 for(const part of WALL_PARTS){
  const def=definitions.find(d=>d.id===part.id)!;
  assert.equal(def.name,part.title);assert.deepEqual(def.defaults,part.defaults);assert.ok(isWallPart(part.id));
  const face=wallFace(part,part.defaults);assert.ok(face.width>0 && face.height>0 && part.depth>0);
 }
 assert.equal(wallPart('upright'),undefined);assert.equal(isWallPart('rep-nighthawk'),false);
});
test('wall frames turn a part front (local -Y) into the room and local +X along the wall',()=>{
 for(const frame of Object.values(wallFrames())){
  const c=Math.cos(frame.rotation),s=Math.sin(frame.rotation);
  // Source (x, y) -> world floor (x, -y).
  assert.ok(near([c,-s],frame.along),`${frame.id} along`);assert.ok(near([s,c],frame.normal),`${frame.id} normal`);
  assert.ok(facesInside(frame,[0,1000,0]),`${frame.id} faces the rack`);
 }
 const {back,left}=wallFrames();assert.deepEqual([back.center,back.length,left.center,left.length],[[0,-1500],6000,[-3000,750],4500]);
 // From the default iso camera the front and right walls cut away; the ray to the back wall lands on it.
 const camera:Vec3=[3500,2200,3600],target:Vec3=[-1000,1500,-1500],dir=target.map((v,i)=>v-camera[i]) as Vec3;
 assert.ok(!facesInside(wallFrames().front,camera) && !facesInside(wallFrames().right,camera));
 const hit=wallHit(ROOM_DEFAULTS,camera,dir)!;assert.equal(hit.wall,'back');assert.ok(near([hit.u,hit.h],[-1000,1500]));
 assert.equal(wallHit(ROOM_DEFAULTS,camera,[1,0,0]),null,'rays leaving the room miss');
 assert.ok(near([wallPlaneHit(left,[0,1200,0],[-1,0,.5])!.u],[-750]),'drags use the infinite plane');
});
test('wall items validate strictly, persist in the doc and survive rack edits',()=>{
 const doc=addWallItem(createAssembly(),'pegboard-panel',{wall:'right',position:[312,1490]});
 const item=doc.wallItems![0];assert.deepEqual(item,{id:'wall-1',part:'pegboard-panel',wall:'right',position:[300,1500],params:{width:1219}});
 const restored=validateAssembly(JSON.parse(JSON.stringify({...doc,room:{back:2000}})));
 assert.deepEqual(restored.wallItems,doc.wallItems);assert.deepEqual(restored.room,{...ROOM_DEFAULTS,back:2000});
 assert.deepEqual(cleanDocument(restored).wallItems,doc.wallItems,'history keeps wall items and room');assert.deepEqual(cleanDocument(restored).room,restored.room);
 assert.deepEqual(resizeAssembly(restored,{width:1075}).wallItems,doc.wallItems);
 for(const bad of [{wall:'ceiling'},{part:'upright'},{params:{width:900}},{params:{depth:1}},{position:[0,-1]},{position:[0]},{id:'floor-1'}])
  assert.throws(()=>validateWallItems([{...item,...bad}]),JSON.stringify(bad));
 assert.throws(()=>validateWallItems([item,item]),/duplicate/);
 assert.throws(()=>validateAssembly({...doc,wallItems:[{...item,id:'wall-1'}],floorItems:[{id:'wall-1'}]} as never));
 for(const room of [{back:100},{height:9000},{attic:1},[]]) assert.throws(()=>validateRoom(room),JSON.stringify(room));
 assert.equal(removeInstance(doc,'wall-1').wallItems!.length,0);
});
test('resolved wall items sit on their wall plane, face the room and are excluded from the rack structure',()=>{
 const items:WallItem[]=WALL_IDS.map((wall,i)=>({id:`wall-${i+1}`,part:'pegboard-panel',wall,position:[200,1400],params:{width:610}}));
 const room={...ROOM_DEFAULTS,left:2500},frames=wallFrames(room);
 for(const [i,entry] of resolveWallItems(items,room).entries()){
  const frame=frames[items[i].wall],floor=[entry.position[0],-entry.position[1]];
  assert.ok(near(floor,[frame.center[0]+frame.along[0]*200,frame.center[1]+frame.along[1]*200]));assert.equal(entry.position[2],1400);
  assert.deepEqual([entry.kind,entry.rotation[2]],['wall-item',frame.rotation]);
 }
 assert.equal(resolveAssembly({...createAssembly(),wallItems:items}).filter(r=>r.kind==='wall-item').length,4);
});
test('clamping keeps the face on the wall; suggestions face the rack and step clear; warnings cover overlap, edges and the rack',()=>{
 const panel={part:'pegboard-panel' as const,params:{width:1219}};
 assert.deepEqual(clampWallPosition(ROOM_DEFAULTS,panel,'back',[4000,5000]),[3000-609.5,3000-305]);
 assert.deepEqual(clampWallPosition(ROOM_DEFAULTS,panel,'left',[-12.4,10],false),[-12.4,305]);
 let doc=addWallItem(createAssembly(),'pegboard-panel');
 assert.deepEqual([doc.wallItems![0].wall,doc.wallItems![0].position],['left',[750,1500]],'left wall, square to the default view');
 doc=addWallItem(doc,'pegboard-panel');doc=addWallItem(doc,'pegboard-panel');
 const [a,b,c]=doc.wallItems!;
 assert.ok(b.wall==='left' && wallRect(b).max[0]<=wallRect(a).min[0]-50,'steps along the wall');
 assert.deepEqual([c.wall,c.position],['back',[-2125,1500]],'then the back wall, 900 mm left of the rack');
 assert.deepEqual(wallWarnings(doc),[]);
 const overlapping={...doc,wallItems:[a,{...b,position:[a.position[0]+100,a.position[1]] as [number,number]}]};
 assert.deepEqual(wallWarnings(overlapping).map(w=>w.message),['Wall items overlap.']);
 assert.deepEqual(wallWarnings({...doc,wallItems:[a],room:{...ROOM_DEFAULTS,height:2100,left:600}}).map(w=>w.message),['Rack crosses the left wall.']);
 assert.deepEqual(wallWarnings({...doc,wallItems:[{...a,position:[2000,1500]}]}).map(w=>w.message),['Panel extends past the left wall.']);
});
test('pegboard builds both sizes on the wall surface with a symmetric 1″ hole grid',async()=>{
 const api=await Module();api.setup();
 for(const width of [1219,610]){
  const [panel]=buildPegboard(api,{width}),box=panel.solid.boundingBox(),{columns,rows}=pegboardHoles(width);
  assert.deepEqual([box.min[1],box.max[1]],[-19,0]);assert.ok(Math.abs(box.max[0]-width/2)<1e-6 && Math.abs(box.max[2]-305)<1e-6);
  assert.ok(columns.includes(0) && near([columns[0]+columns.at(-1)!,rows[0]+rows.at(-1)!],[0,0]));
  assert.equal(panel.role,'source');panel.solid.delete();
 }
 assert.deepEqual([pegboardHoles(1219).columns.length,pegboardHoles(610).columns.length,pegboardHoles(610).rows.length],[47,23,24]);
 assert.throws(()=>buildPegboard(api,{width:900}),/Unsupported panel size/);
});
