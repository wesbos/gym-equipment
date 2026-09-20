import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {
 PARTS, IN, ROGUE_PLATE_TREE, REP_PLATE_TREE, TITAN_PLATE_TREE, TITAN_BARBELL_HOLDER, REP_DUMBBELL_RACK, ROGUE_DUMBBELL_RACK, REP_DUMBBELL_CART,
 TITAN_DUMBBELL_STAND, REP_KETTLEBELL_RACK, rogueTreeSpec, REP_TREE, TITAN_TREE, treeBox, hornLoad, titanHolderSleeves, TITAN_HOLDER,
 repRackLayout, rogueRackWeights, REP_DB_RACK, REP_KB_RACKS, REP_KB, packBells, repKbLoad, titanStandPegLoad, TITAN_STAND, REP_CART, repCartBox,
 YES4ALL_BARBELL_HOLDER, YES4ALL_HOLDER, yes4allSleeves, CAP_A_FRAME_PLATE_RACK, CAP_RK2A, CAP_RK2BB, aFramePegRoot,
} from './floor-parts/floor-storage.ts';
import {definitions} from './parts/floor-storage.ts';
import {floorPart, FLOOR_PART_IDS} from './floor-registry.ts';
import {coerceFloorParams, floorOptions, resolveBy, validateFloorParams} from './floor-part.ts';
import {vendorAttribution} from './vendor-metadata.ts';
import {partAttribution} from './attribution.ts';
import {PLATE_SPECS, PLATE_GAP} from './plates.ts';
import {repBell} from './floor-parts/kettlebells.ts';
import {BUILD_BUDGET_MS} from './test-budget.ts';
import type {NumericParams, SolidPart} from './types.ts';
const api=await Module();api.setup();
type Box={min:number[];max:number[]};
const build=(id:string,params:NumericParams)=>definitions.find(d=>d.id===id)!.build(api,params);
const bounds=(parts:SolidPart[],filter=(p:SolidPart)=>true):Box=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of parts.filter(filter)){const b=p.solid.boundingBox();for(let i=0;i<3;i++){min[i]=Math.min(min[i],b.min[i]);max[i]=Math.max(max[i],b.max[i]);}}return {min,max};};
const free=(parts:SolidPart[])=>{for(const p of parts)p.solid.delete();};
const near=(a:number,b:number,tol:number,msg:string)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a.toFixed(2)} vs ${b.toFixed(2)}`);
const stored=/^Stored|lettering|Stored plates/;
/** Defaults plus first, middle and last option of every param, and every param at its last option. */
function combos(part:(typeof PARTS)[number]){
 const out:NumericParams[]=[{...part.defaults}];
 for(const p of part.params){const o=floorOptions(p,part.defaults);for(const v of [o[0],o[o.length>>1],o.at(-1)!])out.push(coerceFloorParams(part,{...part.defaults,[p.key]:v}));}
 const max={...part.defaults};for(const p of part.params){const o=floorOptions(p,max);max[p.key]=o.at(-1)!;}out.push(max);
 return out;
}
test('eleven floor-storage products are registered under Floor storage with vendor credit',()=>{
 assert.equal(PARTS.length,11);
 for(const part of PARTS){
  assert.equal(part.section,'Floor storage');assert.ok(FLOOR_PART_IDS.includes(part.id as never));assert.equal(floorPart(part.id),part);
  const def=definitions.find(d=>d.id===part.id)!;assert.ok(def,`${part.id} has a builder`);assert.equal(def.name,part.title);assert.equal(def.category,'Floor storage');
  assert.deepEqual(vendorAttribution(part.id),part.vendor);assert.deepEqual(partAttribution(part.id),part.vendor);
  const v=part.vendor!;assert.ok(v.vendor && /^https:\/\//.test(v.url) && v.credit && v.trademark && v.reconstruction,part.id);
  assert.match(part.description!,/Independent reconstruction .*trademarks belong to/);
  assert.deepEqual(validateFloorParams(part,{}),part.defaults);
  assert.throws(()=>validateFloorParams(part,{bogus:1}));
  for(const p of part.params)assert.throws(()=>validateFloorParams(part,{[p.key]:-7.5}),`${part.id} rejects junk ${p.key}`);
 }
 assert.equal(new Set(PARTS.map(p=>p.id)).size,11);
});
test('every param extreme builds valid closed solids on the floor, inside the footprint, frame matching it',()=>{
 for(const part of PARTS)for(const params of combos(part)){
  const parts=build(part.id,params),tag=`${part.id} ${JSON.stringify(params)}`;
  for(const p of parts){assert.ok(!p.solid.isEmpty() && p.solid.status()==='NoError' && p.solid.volume()>0,`${tag} ${p.name}`);assert.notEqual(p.role,'frame',`${tag}: factory colours`);}
  const b=bounds(parts),{width,depth}=resolveBy(part.footprint,params);
  assert.ok(b.min[2]>=-1e-6 && Math.abs(b.min[2])<1,`${tag} rests on the floor ${b.min[2]}`);
  assert.ok(b.min[0]>=-width/2-1 && b.max[0]<=width/2+1 && b.min[1]>=-depth/2-1 && b.max[1]<=depth/2+1,`${tag} inside ${width}×${depth}: ${b.min} ${b.max}`);
  const frame=bounds(parts,p=>!stored.test(p.name));
  if(!(part.id==='rep-dumbbell-storage-cart' && params.hooks))near(frame.max[0]-frame.min[0],width,1,`${tag} width`);
  near(frame.max[1]-frame.min[1],depth,1,`${tag} depth`);
  const tris=parts.reduce((s,p)=>s+p.solid.numTri(),0);assert.ok(tris<90000,`${tag} ${tris} triangles`);
  free(parts);
 }
});
test('defaults build within the shared runaway ceiling',()=>{
 for(const part of PARTS){const t=performance.now(),parts=build(part.id,part.defaults),ms=performance.now()-t;free(parts);assert.ok(ms<BUILD_BUDGET_MS,`${part.id} ${ms.toFixed(0)} ms`);}
});
test('plate trees: published envelopes, horn tiers and loaded plates on the horns',()=>{
 const rogue=rogueTreeSpec({wheels:0});
 near(treeBox(rogue).width,26*IN,.01,"Rogue length");near(treeBox(rogue).depth,24*IN,.01,"Rogue width");near(rogue.tiers[1]-rogue.tiers[0],18.275*IN,.01,'Rogue tier spacing');near(rogue.hornD,1.9*IN,.01,'Schedule 40 OD');
 near(treeBox(REP_TREE).width,24*IN,.01,'REP length');near(treeBox(TITAN_TREE).width,24.5*IN,.01,'Titan length');near(TITAN_TREE.tiers[1]-TITAN_TREE.tiers[0],18.5*IN,.01,'Titan tiers');
 near(REP_TREE.usable,8*IN,.01,'REP usable horn');near(TITAN_TREE.usable,8.25*IN,.01,'Titan sleeve');
 for(const [part,spec,H] of [[ROGUE_PLATE_TREE,rogue,50],[REP_PLATE_TREE,REP_TREE,50],[TITAN_PLATE_TREE,TITAN_TREE,57.625]] as const){
  const parts=build(part.id,part.defaults),b=bounds(parts);near(b.max[2],H*IN,2,`${part.id} height`);free(parts);
  // Full: every horn carries as many plates as fit the usable length; nothing collides with the base (plates stay above the feet).
  for(const kind of [0,1]){
   for(let t=0;t<3;t++){const s=hornLoad(spec.usable,t,3,2,kind),len=s.reduce((a,p,i)=>a+PLATE_SPECS[p].width+(i?PLATE_GAP:0),0);assert.ok(s.length>=2 && len<=spec.usable,`${part.id} tier ${t}`);assert.ok(hornLoad(spec.usable,t,3,1,kind).length<s.length);}
   const loaded=build(part.id,{...part.defaults,loaded:2,plates:kind}),plateSolids=loaded.filter(p=>/^Stored plates/.test(p.name)),frame=loaded.find(p=>/steel frame/.test(p.name))!;
   const all=api.Manifold.union(plateSolids.map(p=>p.solid)),hit=all.intersect(frame.solid);assert.ok(hit.volume()<1,`${part.id} plates clear the frame: ${hit.volume()}`);all.delete();hit.delete();
   assert.equal(loaded.filter(p=>/^Stored plates/.test(p.name)&&!/hub/.test(p.name)).length>=1,true);free(loaded);
  }
 }
 const wheels=build(ROGUE_PLATE_TREE.id,{loaded:0,plates:0,wheels:1}),bw=bounds(wheels);near(bw.max[2],50*IN+4*IN,1,'casters lift the tree');assert.ok(wheels.some(p=>/caster wheels/.test(p.name)));free(wheels);
 const bars=build(REP_PLATE_TREE.id,{loaded:0,plates:0,bars:2}),bb=bounds(bars,p=>/bar sleeves|bar shafts/.test(p.name));assert.ok(bb.max[2]>2200,'two bars stand in the sleeves');free(bars);
});
test('Titan barbell holder: 12″/19″ × 9″ boxes, 51 mm lined sleeves and stored bars',()=>{
 assert.equal(titanHolderSleeves({size:0}).length,5);assert.equal(titanHolderSleeves({size:1}).length,9);
 assert.deepEqual(floorOptions(TITAN_BARBELL_HOLDER.params[1],{size:1}),[0,1,2,3,4,5,6,7,8,9]);
 assert.deepEqual(coerceFloorParams(TITAN_BARBELL_HOLDER,{size:0,loaded:9}),{size:0,loaded:5});
 for(const size of [0,1]){
  const parts=build(TITAN_BARBELL_HOLDER.id,{size,loaded:0}),b=bounds(parts,p=>!/liners|inserts/.test(p.name));near(b.max[2],9*IN,.5,'9″ tall');free(parts);
  const full=build(TITAN_BARBELL_HOLDER.id,{size,loaded:titanHolderSleeves({size}).length}),bars=bounds(full,p=>/bar sleeves|end caps/.test(p.name));
  near(bars.min[2],TITAN_HOLDER.base,1,'bars stand on the base plate');assert.ok(bars.max[2]>2200);free(full);
 }
 near(TITAN_HOLDER.bore,51,.01,'bar hole');
});
test('dumbbell racks: REP 48×24×36 with the 5–50 set, Rogue 93×30×33 with 30 positions',()=>{
 const empty=build(REP_DUMBBELL_RACK.id,REP_DUMBBELL_RACK.defaults),b=bounds(empty);near(b.max[2],36*IN,1,'REP height');free(empty);
 const layout=repRackLayout(2);assert.equal(layout.length,20);assert.ok(layout.every(s=>s.tier<3));
 for(let t=0;t<3;t++){const row=layout.filter(s=>s.tier===t);if(row.length)assert.ok(row.at(-1)!.x-row[0].x<=REP_DB_RACK.usable,`tier ${t} fits the usable shelf`);}
 assert.equal(repRackLayout(1).length,10);assert.equal(repRackLayout(0).length,0);
 const loaded=build(REP_DUMBBELL_RACK.id,{color:0,loaded:2});assert.ok(loaded.some(p=>/Stored REP hex/.test(p.name)));free(loaded);
 const rogue=build(ROGUE_DUMBBELL_RACK.id,{loaded:0}),rb=bounds(rogue);near(rb.max[2],33*IN,1,'Rogue height');near(rb.max[0]-rb.min[0],93*IN,1,'Rogue length');near(rb.max[1]-rb.min[1],30*IN,1,'Rogue depth');
 assert.equal(rogue.find(p=>/saddles/.test(p.name))!.solid.decompose().length,60,'ten saddle positions × front/rear rows × 3 tiers');free(rogue);
 assert.equal(rogueRackWeights(2).length*2,30);assert.equal(rogueRackWeights(2).at(-1),75);
});
test('REP cart: 32″ × 23.3″, 20.75″ to the top lip, hooks widen it, PÉPIN pair on the deck',()=>{
 const parts=build(REP_DUMBBELL_CART.id,{color:0,hooks:0,dumbbells:0,set:0}),b=bounds(parts);near(b.max[2],REP_CART.height,.5,'top lip');free(parts);
 assert.ok(repCartBox({hooks:1}).width>REP_CART.width);
 assert.deepEqual(coerceFloorParams(REP_DUMBBELL_CART,{color:0,hooks:0,dumbbells:2,set:85}),{color:0,hooks:0,dumbbells:2,set:60},'switching to QuickDraw snaps the set size');
 const full=build(REP_DUMBBELL_CART.id,{color:1,hooks:1,dumbbells:1,set:125}),db=bounds(full,p=>/PÉPIN/.test(p.name));near(db.min[2],REP_CART.height,.5,'cradles sit on the liner');assert.ok(full.some(p=>/White/.test(p.name)));free(full);
 const qd=build(REP_DUMBBELL_CART.id,{color:2,hooks:0,dumbbells:2,set:60}),qb=bounds(qd,p=>/QuickDraw/.test(p.name));near(qb.min[2],REP_CART.height,.5,'QuickDraw cradles on the liner');free(qd);
});
test('Titan stand: 28.125″ × 26″ × 23.5″, pegs 6.5″ long carrying standard plates',()=>{
 const parts=build(TITAN_DUMBBELL_STAND.id,{dumbbells:0,loaded:0}),b=bounds(parts);near(b.max[2],TITAN_STAND.height,3,'height');free(parts);
 for(let peg=0;peg<4;peg++)assert.ok(titanStandPegLoad(peg,2).length>=1);
 for(const d of [1,2]){const l=build(TITAN_DUMBBELL_STAND.id,{dumbbells:d,loaded:2});assert.ok(l.some(p=>/Stored/.test(p.name)));assert.ok(l.some(p=>/standard plates/.test(p.name)));free(l);}
});
test('REP Kettlebell Rack 2.0: published heights, both sets fit, heaviest bells on the bottom',()=>{
 for(const [tiers,rack] of REP_KB_RACKS.entries()){
  const parts=build(REP_KETTLEBELL_RACK.id,{tiers,loaded:0}),b=bounds(parts);near(b.max[2],rack.height,1,`${rack.label} height`);near(b.max[0]-b.min[0],REP_KB.length,1,'length');free(parts);
  for(const loaded of [1,2]){
   const slots=packBells(repKbLoad(loaded),rack.tiers,REP_KB.shelf-2*IN);assert.ok(slots.every(Boolean),`${rack.label} holds the ${loaded===2?'double':'single'} set`);
   const s=slots.filter(Boolean) as NonNullable<(typeof slots)[number]>[];assert.ok(s[0].tier===0 && s[0].kg===24);
   for(const [i,a] of s.entries())for(const c of s.slice(i+1))if(a.tier===c.tier){const ra=repBell(0,a.kg).layout.R,rc=repBell(0,c.kg).layout.R;assert.ok(Math.hypot(a.x-c.x,a.y-c.y)>=ra+rc,`${a.kg}/${c.kg} bodies clear`);}
  }
 }
});
test('Yes4All vertical barbell holder: 12″ × 12″ × 7.5″, 6.05″ box, five 2″ liners in a quincunx, stored bars on the tray',()=>{
 const parts=build(YES4ALL_BARBELL_HOLDER.id,{loaded:0}),b=bounds(parts);
 near(b.max[0]-b.min[0],12*IN,.5,'12″ wide');near(b.max[1]-b.min[1],12*IN,.5,'12″ deep');near(b.max[2],7.5*IN,.5,'7.5″ to the liner tops');
 const steel=bounds(parts,p=>/powder-coated/.test(p.name));near(steel.max[2],6.05*IN,.5,'6.05″ box');free(parts);
 const s=yes4allSleeves();assert.equal(s.length,5);assert.deepEqual(s[0],[0,0]);near(Math.abs(s[1][0]-s[2][0]),152,.5,'6″ corner pitch');near(YES4ALL_HOLDER.bore,2*IN,.5,'2″ liner bore');
 const full=build(YES4ALL_BARBELL_HOLDER.id,{loaded:5}),bars=bounds(full,p=>/bar sleeves|end caps/.test(p.name));near(bars.min[2],YES4ALL_HOLDER.base,1,'bars stand on the tray');assert.ok(bars.max[2]>2200);free(full);
});
test('CAP A-frame plate racks: RK-2A 37″ × 19″ × 22″ with seven posts, RK-2BB 30″ × 19.9″ × 12″ with 4″ pegs, plates stay clear of each other',()=>{
 for(const [model,s] of [CAP_RK2A,CAP_RK2BB].entries()){
  const parts=build(CAP_A_FRAME_PLATE_RACK.id,{model,loaded:0}),b=bounds(parts);
  near(b.max[2],s.height,1,`${s.name} height`);near(b.max[0]-b.min[0],s.width,1,`${s.name} width`);near(b.max[1]-b.min[1],s.depth,1,`${s.name} depth`);free(parts);
  assert.equal(s.pegs.length+s.posts.length,model?5:7,'post count');
  const full=build(CAP_A_FRAME_PLATE_RACK.id,{model,loaded:2}),plates=full.filter(p=>/Stored plates/.test(p.name));assert.ok(plates.length,'plates loaded');
  const u=api.Manifold.union(plates.map(p=>p.solid)),v=plates.reduce((a,p)=>a+p.solid.volume(),0);near(u.volume(),v,v*1e-3,`${s.name} plates do not intersect`);u.delete();free(full);
 }
 // RK-2BB: 4″ usable side pegs (saddle root to tip) and a 4″ centre post.
 for(const peg of CAP_RK2BB.pegs)near(peg.tip-aFramePegRoot(CAP_RK2BB,peg),4*IN,10,'4″ peg');
 near(CAP_RK2BB.posts[0].h,4*IN,.01,'4″ centre post');
});
