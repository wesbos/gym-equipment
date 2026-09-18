import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {definitions} from './catalog.ts';
import {BAR, BARBELL, barSleeves} from './floor-parts/barbell.ts';
import {CRADLE_PARTS, barCradles, barSupports, freeCradles, parkBarbells, settleBarbells, suggestCradle} from './barbell-cradles.ts';
import {addAccessory, createAssembly, moveAccessory, removeInstance, resolveAssembly, unpairAccessory, validateAssembly} from './assembly.ts';
import {addFloorItem, floorWarnings} from './floor-items.ts';
import {rotateMountedPoint} from './mounted-rotation.ts';
import type {CrossmemberTopTarget, RackDoc, ResolvedInstance, Vec3} from './types.ts';
const api=await Module();api.setup();
const shaft=BAR.shaft/2;
/** A shaft segment along `axis` through `point`, in the builder's local frame. */
const rod=(point:Vec3,axis:Vec3,radius:number,length=260)=>{const c=api.Manifold.cylinder(length,radius,radius,48,true),o=Math.abs(axis[0])>.5?c.rotate([0,90,0]):c.rotate([90,0,0]),t=o.translate(point);c.delete();o.delete();return t;};
test('every cradle rest point seats the 28.5 mm shaft on its generated solid without penetrating it',()=>{
 for(const part of CRADLE_PARTS)for(const mirror of part.startsWith('darko-')?[0,1]:[0]){
  const def=definitions.find(d=>d.id===part)!,params={...def.defaults,...(part.startsWith('darko-')?{upright:75,mountSpacing:50,mirror}:{})};
  const solids=def.build(api,params),body=api.Manifold.union(solids.map(s=>s.solid));
  const entry={id:part,ownerId:part,part,params,position:[0,0,0],rotation:[0,0,0],kind:'accessory'} as unknown as ResolvedInstance;
  for(const s of barSupports([entry])){
   const bar=rod(s.point,s.axis,shaft),near=rod(s.point,s.axis,shaft+1.5);
   const hit=bar.intersect(body),touch=near.intersect(body);
   assert.ok(hit.volume()<3,`${part} ${s.id} mirror ${mirror}: shaft penetrates ${hit.volume().toFixed(1)} mm³`);
   assert.ok(touch.volume()>1,`${part} ${s.id}: shaft is not resting on the cradle`);
   // Bars cross Darko plates beside their upright: they must clear the 75 mm tube.
   if(part.startsWith('darko-j')||part==='darko-double-j'){const post=api.Manifold.cube([75,75,600],true).translate([0,0,-150]),long=rod(s.point,s.axis,shaft,600),clash=long.intersect(post);assert.ok(clash.volume()<1,`${part} bar clears its upright`);[post,long,clash].forEach(m=>m.delete());}
   [bar,near,hit,touch].forEach(m=>m.delete());
  }
  body.delete();solids.forEach(s=>s.solid.delete());
 }
});
test('the barbell builds closed solids at 2200 mm with 415 mm sleeves, and exposes world sleeve axes for plates',()=>{
 const def=definitions.find(d=>d.id===BARBELL.id)!;
 for(const finish of [0,1]){
  const parts=def.build(api,{finish}),all=api.Manifold.union(parts.map(p=>p.solid)),box=all.boundingBox();
  try{
   for(const p of parts){assert.equal(p.solid.status(),'NoError',p.name);assert.ok(p.solid.volume()>0,p.name);}
   assert.deepEqual([box.min[0],box.max[0]].map(Math.round),[-1100,1100]);assert.ok(Math.abs(box.min[2])<1e-6,'collars rest on the floor');
   assert.equal(parts.filter(p=>p.name==='415 mm loadable Olympic sleeve').length,2);assert.ok(parts.some(p=>p.role==='handle'));
  }finally{all.delete();parts.forEach(p=>p.solid.delete());}
 }
 assert.throws(()=>def.build(api,{finish:3}),/finish/);
 const sleeves=barSleeves({position:[100,200,1000],rotation:[0,0,Math.PI/2]});
 assert.deepEqual(sleeves.map(s=>s.length),[415,415]);
 for(const [i,side] of [1,-1].entries()){assert.ok(Math.abs(sleeves[i].origin[1]-(200+side*685))<1e-9 && sleeves[i].origin[2]===1000+BAR.axisZ);assert.ok(Math.abs(sleeves[i].axis[1]-side)<1e-12);}
});
const park=(doc:RackDoc,key?:string)=>{const next=addFloorItem(doc,BARBELL.id),bar=next.floorItems!.at(-1)!,cradle=key??suggestCradle(freeCradles(resolveAssembly(doc),doc.floorItems))!.key;bar.cradle=cradle;return validateAssembly(next);};
const barOf=(doc:RackDoc)=>resolveAssembly(doc).find(e=>e.part===BARBELL.id)!;
test('default J-cups form one level cradle; a parked bar follows moves, persists, and drops to the floor when it goes',()=>{
 const doc=createAssembly(),cradles=barCradles(resolveAssembly(doc));
 assert.equal(cradles.length,1);assert.equal(cradles[0].key,'jhooks-front:left#0+jhooks-front:right#0');assert.match(cradles[0].label,/^J-cups · \d+ mm$/);
 const parked=park(doc),bar=barOf(parked),c=cradles[0];
 assert.deepEqual(bar.position,[c.center[0],c.center[1],c.center[2]-BAR.axisZ]);assert.equal(bar.rotation[2],0);assert.deepEqual(bar.connectedTo,['jhooks-front']);
 assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(parked))),parked,'JSON round trip keeps the cradle');
 assert.ok(!floorWarnings(parked).length,'a parked bar is not a floor footprint');
 const moved=moveAccessory(parked,'jhooks-front',{hole:20});assert.equal(barOf(moved).position[2],bar.position[2]-4*doc.rack.pitch,'bar follows its cradle');
 assert.throws(()=>park(parked,c.key),/One barbell per cradle/);assert.equal(freeCradles(resolveAssembly(parked),parked.floorItems).length,0);
 assert.equal(freeCradles(resolveAssembly(parked),parked.floorItems,parked.floorItems![0].id).length,1,'the moving bar keeps its own cradle');
 for(const gone of [removeInstance(parked,'jhooks-front'),unpairAccessory(parked,'jhooks-front'),removeInstance(parked,'front-right')]){
  const floorBar=barOf(gone);assert.equal(floorBar.position[2],0,'unresolved cradle falls back to the floor spot');
  const {doc:settled,dropped}=settleBarbells(gone,resolveAssembly(gone),resolveAssembly(parked));
  assert.deepEqual(dropped,[parked.floorItems![0].id]);assert.equal(settled.floorItems![0].cradle,undefined);
  assert.deepEqual(settled.floorItems![0].position,[bar.position[0],-bar.position[1]],'drops straight down');
 }
 assert.throws(()=>validateAssembly({...parked,floorItems:[{...parked.floorItems![0],cradle:'Bad key!'}]}),/cradle/);
 assert.throws(()=>validateAssembly({...parked,floorItems:[{id:'floor-9',part:'rep-nighthawk',position:[0,0],rotation:0,params:{},cradle:c.key}]}),/cradle/);
});
test('monolift, roller and sandwich J-cups park across the rack; suggestion prefers the highest working cradle',()=>{
 let doc=createAssembly({emptyAccessories:true});
 doc=addAccessory(doc,'monolift',{uprightId:'front-left',face:'front',hole:20},true);
 doc=addAccessory(doc,'j-hook-roller',{uprightId:'front-left',face:'front',hole:28},true);
 doc=addAccessory(doc,'j-hook-sandwich',{uprightId:'rear-left',face:'back',hole:10},true);
 const cradles=barCradles(resolveAssembly(doc));
 assert.deepEqual(cradles.map(c=>c.label.split(' · ')[0]).sort(),['Monolift arms','Roller J-cups','Sandwich J-cups']);
 for(const c of cradles){assert.ok(Math.abs(c.yaw)<1e-9,'bars span left-right');assert.ok(Math.abs(c.supports[0].point[2]-c.supports[1].point[2])<1e-9);}
 assert.match(suggestCradle(cradles)!.label,/^Roller/);
 const parked=cradles.reduce((d,c)=>park(d,c.key),doc);
 assert.equal(resolveAssembly(parked).filter(e=>e.part===BARBELL.id&&e.position[2]>0).length,3);
});
test('Darko anchors cross paired rails (both tiers) and Dock J-Anchor pairs mirror into coaxial cradles',()=>{
 const target:CrossmemberTopTarget={kind:'crossmember-top',connectionId:'left-upper-crossmember',station:4,side:1,uprightId:'front-left',face:'front',hole:0};
 const base=createAssembly({emptyAccessories:true});
 const top=barCradles(resolveAssembly(addAccessory(base,'darko-double-decker',target,true)));
 assert.equal(top.length,4,'two notches × two tiers');assert.ok(top.every(c=>c.kind==='storage' && Math.abs(c.yaw)<1e-9));
 const anchor=addAccessory(base,'darko-anchor',target,true);assert.equal(barCradles(resolveAssembly(anchor)).length,2);
 const flipped=structuredClone(anchor);flipped.accessories[0].rotation=Math.PI;assert.equal(barCradles(resolveAssembly(validateAssembly(flipped))).length,2,'flipped rail side still pairs');
 for(const part of ['darko-j','darko-double-j'] as const){
  const dock=addAccessory(base,part,{uprightId:'front-left',face:'right',hole:24},true),resolved=resolveAssembly(dock);
  assert.deepEqual(resolved.filter(e=>e.part===part).map(e=>e.params.mirror??0),[0,1]);
  assert.equal(barCradles(resolved).length,part==='darko-j'?1:2);
  const bar=barOf(park(dock));assert.ok(bar.position[2]>1000);
 }
 const front=addAccessory(base,'darko-j',{uprightId:'front-left',face:'front',hole:24},true);
 assert.equal(barCradles(resolveAssembly(front)).length,0,'front-face Docks are not coaxial');
 assert.ok(resolveAssembly(front).every(e=>e.params.mirror===undefined),'only mirrored side-face pairs are handed');
});
test('parkBarbells ignores docs without parked bars and yaw is normalized for front-back cradles',()=>{
 let doc=createAssembly({emptyAccessories:true});
 doc=addAccessory(doc,'j-hook-standard',{uprightId:'front-left',face:'right',hole:24},false);
 doc=addAccessory(doc,'j-hook-standard',{uprightId:'rear-left',face:'right',hole:24},false);
 const [c]=barCradles(resolveAssembly(doc));assert.ok(Math.abs(Math.abs(c.yaw)-Math.PI/2)<1e-9);
 const bar=barOf(park(doc));assert.equal(bar.rotation[2],c.yaw);
 const r=resolveAssembly(doc),copy=structuredClone(r);parkBarbells(r,[]);assert.deepEqual(r,copy);
 const tip=rotateMountedPoint([1,0,0],bar.rotation);assert.ok(Math.abs(tip[0])<1e-9,'bar runs front to back');
});
