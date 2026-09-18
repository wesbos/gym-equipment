import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {ROWERG, ROWERG_SPECS} from './floor-parts/rowerg.ts';
import {buildRowErg} from './parts/rowerg.ts';
import {resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorBounds, floorWarnings, clearanceBounds} from './floor-items.ts';
import {createAssembly} from './assembly.ts';
const api=await Module();api.setup();
const IN=25.4,near=(a:number,b:number,tol=.5)=>Math.abs(a-b)<=tol;
test('RowErg metadata carries the published envelopes, 9 × 4 ft use clearance and strict legs/pose params',()=>{
 assert.deepEqual(resolveBy(ROWERG.footprint,{legs:0,pose:0}),{width:24*IN,depth:96*IN});
 assert.deepEqual(resolveBy(ROWERG.footprint,{legs:1,pose:0}),{width:24*IN,depth:96*IN});
 assert.deepEqual(resolveBy(ROWERG.footprint,{legs:0,pose:1}),{width:25*IN,depth:33*IN});
 assert.deepEqual(resolveBy(ROWERG.footprint,{legs:1,pose:1}),{width:27*IN,depth:47*IN});
 assert.deepEqual(resolveBy(ROWERG.clearance!,{legs:0,pose:0}),{width:48*IN,depth:108*IN});
 for(const legs of [0,1])assert.deepEqual(resolveBy(ROWERG.clearance!,{legs,pose:1}),resolveBy(ROWERG.footprint,{legs,pose:1}),'stored pieces need no use clearance');
 assert.deepEqual(validateFloorParams(ROWERG,{}),{legs:0,pose:0});
 for(const bad of [{legs:2},{pose:-1},{legs:.5},{damper:5}])assert.throws(()=>validateFloorParams(ROWERG,bad),/rower/);
 assert.throws(()=>buildRowErg(api,{legs:3,pose:0}),/rower/);
});
const bbox=(parts:ReturnType<typeof buildRowErg>)=>{const b=parts.map(p=>p.solid.boundingBox());return {min:[0,1,2].map(i=>Math.min(...b.map(x=>x.min[i]))),max:[0,1,2].map(i=>Math.max(...b.map(x=>x.max[i])))};};
const RAIL=/^(Monorail|Rear |Seat)/;
test('every legs × pose builds closed solids inside its published footprint with the named components',()=>{
 for(const legs of [0,1])for(const pose of [0,1]){
  const parts=buildRowErg(api,{legs,pose}),label=`legs ${legs} pose ${pose}`;
  try{
   for(const {solid,name} of parts){assert.equal(solid.status(),'NoError',name);assert.ok(solid.volume()>0,name);assert.ok([...solid.getMesh().vertProperties].every(Number.isFinite),name);}
   const names=parts.map(p=>p.name);
   for(const n of ['Flywheel housing','Flywheel housing intake mesh','Damper lever','Front frame','Monorail · aluminium beam','Monorail stainless seat track','Seat · molded','Seat carriage and rollers','Rear legs · steel','Footrests','Foot straps','Handle and chain','Handle grips','Monitor arm','PM5 monitor','PM5 display'])assert.ok(names.includes(n),`${label}: ${n}`);
   assert.ok(names.includes(legs ? 'Front legs · steel' : 'Front legs · aluminium'),label+' front-leg material follows legs');
   assert.ok(parts.every(p=>p.role!=='frame'),'black colorway ignores the rack paint');
   const box=resolveBy(ROWERG.footprint,{legs,pose}),{min,max}=bbox(parts);
   assert.ok(near(min[2],0,.01),label+' stands on the floor');
   assert.ok(max[0]-min[0]<=box.width+.01 && max[1]-min[1]<=box.depth+.01,`${label}: ${(max[0]-min[0]).toFixed(1)} × ${(max[1]-min[1]).toFixed(1)} fits ${box.width} × ${box.depth}`);
   assert.ok(near(max[0],-min[0],.01) && (pose ? near(max[1],-min[1],.01) : near(min[1],-ROWERG_SPECS.length/2,.01)),label+' centred on its footprint (in use: rear end flush)');
   if(pose){
    assert.ok(max[2]<=ROWERG_SPECS.storageHeight+.01 && max[2]>ROWERG_SPECS.storageHeight-10,label+' storage height is the upright monorail');
    // Two separate pieces that do not interpenetrate.
    const rail=api.Manifold.union(parts.filter(p=>RAIL.test(p.name)).map(p=>p.solid)),front=api.Manifold.union(parts.filter(p=>!RAIL.test(p.name)).map(p=>p.solid)),both=api.Manifold.intersection([rail,front]);
    try{assert.ok(both.volume()<1,label+' pieces separated');const r=rail.boundingBox();assert.ok(r.max[2]-r.min[2]>1360,label+' monorail upright');}finally{for(const m of [rail,front,both])m.delete();}
   } else {
    assert.ok(near(max[0]-min[0],ROWERG_SPECS.width,.01),label+' 24 in wide');
    assert.ok(max[1]-min[1]>.98*ROWERG_SPECS.length,label+' 96 in long');
   }
  }finally{for(const p of parts)p.solid.delete();}
 }
});
test('seat dish sits at the published 14 in / 20 in seat heights in use',()=>{
 for(const legs of [0,1]){
  const parts=buildRowErg(api,{legs,pose:0}),seat=parts.find(p=>p.name==='Seat · molded')!.solid,b=seat.boundingBox(),cy=(b.min[1]+b.max[1])/2-10;
  const probe=api.Manifold.cylinder(1000,4,4,12).translate([0,cy,0]),hit=api.Manifold.intersection([seat,probe]);
  try{assert.ok(near(hit.boundingBox().max[2],ROWERG_SPECS.seatHeight[legs],1),`legs ${legs}: ${hit.boundingBox().max[2]}`);}finally{probe.delete();hit.delete();for(const p of parts)p.solid.delete();}
 }
});
test('RowErg is placed left of the rack clear of its use clearance, and warns softly when crowded',()=>{
 const doc=addFloorItem(createAssembly(),'concept2-rowerg',undefined,true),[item]=doc.floorItems!;
 assert.equal(doc.floorItems!.length,1,'not pairable');assert.deepEqual(item.params,{legs:0,pose:0});
 assert.deepEqual(floorWarnings(doc),[]);
 const rackLeft=Math.min(...Object.values(doc.uprights).map(p=>p.x))-doc.rack.tube/2;assert.ok(near(floorBounds(item).max[0],rackLeft-450,.01));assert.ok(clearanceBounds(item)!.max[0]<rackLeft);
 const crowd=(position:[number,number],pose=0)=>floorWarnings({...doc,floorItems:[{...item,position,params:{legs:0,pose}}]}).map(w=>w.message);
 assert.deepEqual(crowd([rackLeft-400,0]),['Rower use clearance overlaps the rack.']);
 assert.deepEqual(crowd([rackLeft-400,0],1),[],'separated storage only needs its own footprint');
 assert.deepEqual(crowd([rackLeft-200,0]),['Rower overlaps the rack footprint.']);
});
