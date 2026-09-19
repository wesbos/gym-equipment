import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import type {Manifold} from 'manifold-3d';
import {
 PARTS, IN, WALL_CONTROL, WC_SIZES, wallControlHoles, wallControlSlots, ROGUE_BELT_HANGER, ROGUE_MULTI_HANGER, PRONG_PANEL,
 ROGUE_V2_GUN_RACK, ROGUE_3_GUN_RACK, TITAN_6_BAR_RACK, REP_GUN_RACK, ROGUE_V2_SPEC, REP_GUN_SPECS, gunRackRungs,
 ROGUE_VERTICAL_BAR_HANGER, ROGUE_9_BAR_HOLDER, REP_9_BAR_STORAGE, REP_WALL_PLATE_STORAGE, REP_HORN, REP_HORN_LOADS, stackLength,
 SDS_CHANGE_PLATE_STORAGE, BOS_CHANGE_PLATE_PEGS, SDS_TREE, treePegs, ROGUE_SWISS_BRACKETS, SWISS,
} from './wall-parts/wall-storage.ts';
import {definitions} from './parts/wall-storage.ts';
import {wallFace, wallPart, WALL_PART_IDS} from './wall-registry.ts';
import {coerceFloorParams, floorOptions, validateFloorParams} from './floor-part.ts';
import {vendorAttribution} from './vendor-metadata.ts';
import {partAttribution} from './attribution.ts';
import {addWallItem, validateWallItems} from './wall-items.ts';
import {freeSlots, hookAnchor, placeHang} from './hang-items.ts';
import {HANG_PART_IDS} from './hang-registry.ts';
import {createAssembly, validateAssembly} from './assembly.ts';
import type {NumericParams, SolidPart} from './types.ts';
const api=await Module();api.setup();
type Box={min:number[];max:number[]};
const build=(id:string,params:NumericParams)=>definitions.find(d=>d.id===id)!.build(api,params);
const bounds=(parts:SolidPart[],filter=(p:SolidPart)=>true):Box=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const p of parts.filter(filter)){const b=p.solid.boundingBox();for(let i=0;i<3;i++){min[i]=Math.min(min[i],b.min[i]);max[i]=Math.max(max[i],b.max[i]);}}return {min,max};};
const free=(parts:SolidPart[])=>{for(const p of parts)p.solid.delete();};
const near=(a:number,b:number,tol:number,msg:string)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a.toFixed(2)} vs ${b.toFixed(2)}`);
/** Components of the named solids inside a box (e.g. prongs or cradle tips cut by a slab). */
const pieces=(parts:SolidPart[],name:RegExp,min:[number,number,number],max:[number,number,number])=>{
 const slab=api.Manifold.cube([max[0]-min[0],max[1]-min[1],max[2]-min[2]]).translate(min);let n=0;
 for(const p of parts.filter(p=>name.test(p.name))){const cut=p.solid.intersect(slab),list=cut.decompose();n+=list.filter((m:Manifold)=>m.volume()>1).length;for(const m of list)m.delete();cut.delete();}
 slab.delete();return n;
};
/** Defaults plus first, middle and last option of every param (dependent options resolved against the defaults). */
function combos(part:(typeof PARTS)[number]){
 const out:NumericParams[]=[{...part.defaults}];
 for(const p of part.params){const o=floorOptions(p,part.defaults);for(const v of [o[0],o[o.length>>1],o.at(-1)!])out.push(coerceFloorParams(part,{...part.defaults,[p.key]:v}));}
 const max={...part.defaults};for(const p of part.params){const o=floorOptions(p,max);max[p.key]=o.at(-1)!;}out.push(max);
 return out;
}
test('fourteen wall-storage products are registered under Wall storage with vendor credit',()=>{
 assert.equal(PARTS.length,14);
 for(const part of PARTS){
  assert.equal(part.section,'Wall storage');assert.ok(WALL_PART_IDS.includes(part.id as never));assert.equal(wallPart(part.id),part);
  const def=definitions.find(d=>d.id===part.id)!;assert.ok(def,`${part.id} has a builder`);assert.equal(def.name,part.title);assert.equal(def.category,'Wall storage');
  assert.deepEqual(vendorAttribution(part.id),part.vendor);assert.deepEqual(partAttribution(part.id),part.vendor);
  const v=part.vendor!;assert.ok(v.vendor && /^https:\/\//.test(v.url) && v.credit && v.trademark && v.reconstruction,part.id);
  assert.match(part.description!,/Independent reconstruction .*trademarks belong to/);
 }
 assert.equal(new Set(PARTS.map(p=>p.id)).size,14);
});
test('every param extreme builds valid closed solids inside the face, on the wall plane and within the standoff',()=>{
 for(const part of PARTS)for(const params of combos(part)){
  const parts=build(part.id,params),tag=`${part.id} ${JSON.stringify(params)}`;
  for(const p of parts){assert.ok(!p.solid.isEmpty() && p.solid.status()==='NoError' && p.solid.volume()>0,`${tag} ${p.name}`);assert.notEqual(p.role,'frame',`${tag}: factory colours`);}
  const b=bounds(parts),{width,height}=wallFace(part,params);
  assert.ok(b.min[0]>=-width/2-.5 && b.max[0]<=width/2+.5 && b.min[2]>=-height/2-.5 && b.max[2]<=height/2+.5,`${tag} inside face ${width}×${height}: ${b.min} ${b.max}`);
  assert.ok(Math.abs(b.max[1])<1e-6,`${tag} backs onto the wall`);assert.ok(b.min[1]>=-part.depth-10,`${tag} standoff ${b.min[1]}`);
  const tris=parts.reduce((s,p)=>s+p.solid.numTri(),0);assert.ok(tris<90000,`${tag} ${tris} triangles`);
  free(parts);
 }
});
test('loaded envelopes fill the reserved face exactly, so loading never moves an item on the wall',()=>{
 const fills:[string,NumericParams,('x'|'z')[]][]=[
  ['rogue-v2-gun-rack',{...ROGUE_V2_GUN_RACK.defaults,loaded:6},['x','z']],['titan-wall-mounted-6-barbell-rack',{...TITAN_6_BAR_RACK.defaults,loaded:6},['x','z']],
  ['rep-gun-rack-barbell-storage',{...REP_GUN_RACK.defaults,size:1,loaded:8},['x','z']],['rogue-vertical-bar-hanger',{size:1,loaded:3},['x','z']],
  ['rogue-9-bar-holder',{loaded:9},['x','z']],['rep-9-bar-storage',{loaded:9},['x','z']],['rep-wall-mounted-plate-storage',{variant:0,loaded:1},['x','z']],
  ['rep-wall-mounted-plate-storage',{variant:1,loaded:3},['x','z']],['stray-dog-change-plate-storage',{bolt:0,loaded:1},['x','z']],
  ['bells-of-steel-change-plate-pegs',{version:1,loaded:1},['x','z']],['rogue-wall-mount-swiss-brackets',{...ROGUE_SWISS_BRACKETS.defaults,loaded:4},['x','z']],
 ];
 for(const [id,params,axes] of fills){
  const part=wallPart(id)!,parts=build(id,params),b=bounds(parts),{width,height}=wallFace(part,params);
  if(axes.includes('x'))near(Math.max(-b.min[0],b.max[0]),width/2,1.5,`${id} width`);
  if(axes.includes('z'))near(Math.max(-b.min[2],b.max[2]),height/2,1.5,`${id} height`);
  free(parts);
 }
 // Floor-standing holders sit on the floor at their suggested height; the vertical hanger's bars clear it by 25 mm.
 for(const part of [ROGUE_9_BAR_HOLDER,REP_9_BAR_STORAGE]){const parts=build(part.id,part.defaults),b=bounds(parts);near(b.min[2]+part.height!,0,1e-6,`${part.id} on the floor`);free(parts);}
 const hanger=build('rogue-vertical-bar-hanger',{size:1,loaded:3});near(bounds(hanger).min[2]+ROGUE_VERTICAL_BAR_HANGER.height!,25,1e-6,'bar ends above the floor');free(hanger);
});
test('Wall Control panels: published size and 3/4″ flange, the photo-measured slots-and-dots grid, and hook slots on real slots',()=>{
 const {dots,slots,mounts}=wallControlHoles(16,32);
 assert.deepEqual([dots.length,slots.length,mounts.length],[15*31,14*16,6],'1/4″ dots on 1″ centres; 1″ slots between them on every other row');
 assert.ok(dots.some(([x,z])=>x===0 && z===0),'grid centred on the panel');
 for(const size of [0,1,2]){
  const params={...WALL_CONTROL.defaults,size,panels:1},parts=build(WALL_CONTROL.id,params),b=bounds(parts,p=>/pegboard/.test(p.name)),s=WC_SIZES[size];
  near(b.max[0]-b.min[0],s.w*IN,.01,'panel width');near(b.max[2]-b.min[2],s.h*IN,.01,'panel height');near(-b.min[1],.75*IN,.01,'3/4″ flange');free(parts);
 }
 const params={...WALL_CONTROL.defaults,panels:2},hooks=wallControlSlots(params),real=new Set([-8*IN,8*IN].flatMap(cx=>slots.map(([x,z])=>`${(cx+x).toFixed(3)},${z.toFixed(3)}`)));
 assert.equal(hooks.length,8*28);assert.ok(hooks.every(([x,z])=>real.has(`${x.toFixed(3)},${z.toFixed(3)}`)),'every hook slot is a real slot centre');
 assert.ok(hooks[0][1]>hooks.at(-1)![1],'top row first');
 // Existing hang items hang on its slots.
 let doc=addWallItem(createAssembly(),WALL_CONTROL.id,{wall:'back',position:[-1500,1500]});
 const panel=doc.wallItems![0],attachment=HANG_PART_IDS[0],open=freeSlots(doc,attachment);
 assert.ok(open.length>0 && open.every(t=>t.panel===panel.id));
 doc=placeHang(doc,attachment,open[0]);assert.equal(doc.hangItems!.length,1);
 assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(doc))).hangItems,doc.hangItems);
 near(-hookAnchor(panel,open[0].slot)[1],WALL_CONTROL.depth+75,1e-6,'hook peg from the panel face');
 const colours=new Set(WALL_CONTROL.params[2].options as number[]);assert.equal(colours.size,13);
 for(const c of [0,1,12]){const parts=build(WALL_CONTROL.id,{...WALL_CONTROL.defaults,color:c,panels:1});assert.equal(parts.filter(p=>p.role==='source').length,1);free(parts);}
});
test('prong hangers: 23.5″ × 4″ panel, 10 × 1″ or 6 × 2″ prongs, 5″ or 8″ deep',()=>{
 for(const [part,n] of [[ROGUE_BELT_HANGER,10],[ROGUE_MULTI_HANGER,6]] as const)for(const depth of [5*IN,8*IN]){
  const parts=build(part.id,{depth}),b=bounds(parts);
  near(b.max[0]-b.min[0],PRONG_PANEL.width,.01,'width');near(b.max[2]-b.min[2],4*IN,.01,'height');near(-b.min[1],depth,.5,'prong depth');
  assert.equal(pieces(parts,/steel/,[-400,-depth+30,-60],[400,-depth+60,60]),n,`${part.id} prong count`);free(parts);
 }
});
test('gun racks: published bracket height and depth, rung counts, and bars resting in the cradles',()=>{
 const cases:[string,NumericParams,number,number,number][]=[
  [ROGUE_V2_GUN_RACK.id,{...ROGUE_V2_GUN_RACK.defaults,loaded:6},31.75,5,6],[ROGUE_3_GUN_RACK.id,{...ROGUE_3_GUN_RACK.defaults,loaded:3},17,5,3],
  [TITAN_6_BAR_RACK.id,{...TITAN_6_BAR_RACK.defaults,loaded:6},32,5.4,6],[REP_GUN_RACK.id,{...REP_GUN_RACK.defaults,loaded:3},21.7,5.5,3],[REP_GUN_RACK.id,{...REP_GUN_RACK.defaults,size:1,loaded:8},53.1,5.5,8],
 ];
 for(const [id,params,height,depth,rungs] of cases){
  const parts=build(id,params),steel=bounds(parts,p=>/brackets/.test(p.name));
  near(steel.max[2]-steel.min[2],height*IN,.01,`${id} bracket height`);near(-steel.min[1],depth*IN,.01,`${id} depth`);
  assert.equal(pieces(parts,/brackets/,[-2000,-depth*IN+2,-1000],[2000,-depth*IN+8,1000]),2*rungs,`${id} two brackets × ${rungs} rung tips`);
  assert.equal(pieces(parts,/bar shafts/,[-100,-200,-1000],[100,0,1000]),rungs,`${id} stored bars`);
  // Every bar sits above its notch floor and clear of the wall.
  const bars=bounds(parts,p=>/sleeves/.test(p.name));assert.ok(bars.max[1]<-10,`${id} bars clear of the wall`);
  free(parts);
 }
 assert.deepEqual(gunRackRungs(ROGUE_V2_SPEC).map(z=>Math.round(z)),[346,212,78,-56,-190,-324]);
 assert.equal(REP_GUN_SPECS[1].rungs,8);
 // Liner toggle and on-sleeve storage.
 const bare=build(ROGUE_V2_GUN_RACK.id,{...ROGUE_V2_GUN_RACK.defaults,liners:0});assert.ok(!bare.some(p=>p.role==='liner'));free(bare);
 const lined=build(ROGUE_V2_GUN_RACK.id,ROGUE_V2_GUN_RACK.defaults);assert.ok(lined.some(p=>p.role==='liner'));free(lined);
});
test('vertical bar hanger, 9-bar holders, horns, change-plate trees and Swiss brackets match published dimensions',()=>{
 for(const [size,length] of [[0,6],[1,12]]){const parts=build(ROGUE_VERTICAL_BAR_HANGER.id,{size,loaded:0}),b=bounds(parts,p=>/Rogue black/.test(p.name));
  near(b.max[0]-b.min[0],length*IN,.01,'hanger length');near(-b.min[1],4.25*IN,.01,'hanger depth');near(b.max[2]-b.min[2],3*IN,.01,'hanger height');free(parts);}
 for(const part of [ROGUE_9_BAR_HOLDER,REP_9_BAR_STORAGE]){const parts=build(part.id,{loaded:0}),b=bounds(parts);
  near(b.max[0]-b.min[0],18*IN,.01,`${part.id} width`);near(-b.min[1],18*IN,1,`${part.id} depth`);near(b.max[2]-b.min[2],(part===ROGUE_9_BAR_HOLDER?8.5:7.5)*IN,.01,`${part.id} height`);
  assert.equal(pieces(parts,/DOM/,[-300,-500,-2000],[300,0,2000]),9,`${part.id} nine tubes`);free(parts);}
 const horn=build(REP_WALL_PLATE_STORAGE.id,{variant:0,loaded:0});near(-bounds(horn).min[1],REP_HORN.steel+8.25*IN,.01,'8.25″ horn');free(horn);
 for(const load of REP_HORN_LOADS)for(const stack of load.stacks)assert.ok(stackLength(stack)<=8.25*IN-REP_HORN.boss,`${load.label} fits the horn`);
 const pegs=treePegs(SDS_TREE);near(pegs[1].x-pegs[0].x,9*IN,1e-9,'SDS pegs 9″ apart');near(pegs[0].z-pegs[2].z,9*IN,1e-9,'bottom peg 9″ below');assert.equal(pegs[0].tilt,3);
 for(const part of [SDS_CHANGE_PLATE_STORAGE,BOS_CHANGE_PLATE_PEGS]){const parts=build(part.id,part.defaults);assert.equal(pieces(parts,/steel/,[-300,-part.spec.length+10,-400],[300,-part.spec.length+30,400]),3,`${part.id} three pegs`);free(parts);}
 const swiss=build(ROGUE_SWISS_BRACKETS.id,ROGUE_SWISS_BRACKETS.defaults),pipes=bounds(swiss,p=>/pipes/.test(p.name)),brk=bounds(swiss,p=>/Rogue black/.test(p.name));
 near(pipes.max[0]-pipes.min[0],52*IN,.01,'52″ pipes');near(-brk.min[1],15.5*IN,.01,'15.5″ reach');near(brk.max[2]-brk.min[2],SWISS.height,.01,'8″ bracket');free(swiss);
});
test('params validate strictly, coerce dependent options and persist as wall items',()=>{
 for(const part of PARTS){
  assert.deepEqual(validateFloorParams(part,part.defaults),part.defaults);
  for(const bad of [{bogus:1},{[part.params[0].key]:9999},null,[]])assert.throws(()=>validateFloorParams(part,bad),`${part.id} ${JSON.stringify(bad)}`);
 }
 assert.throws(()=>validateFloorParams(REP_GUN_RACK,{...REP_GUN_RACK.defaults,size:0,loaded:8}),/stored barbells/);
 assert.equal(coerceFloorParams(REP_GUN_RACK,{...REP_GUN_RACK.defaults,size:0,loaded:8}).loaded,3,'switching to the 3 bar snaps the load');
 assert.equal(coerceFloorParams(REP_WALL_PLATE_STORAGE,{variant:0,loaded:3}).loaded,2,'change plates only on the double horn');
 assert.throws(()=>validateFloorParams(REP_WALL_PLATE_STORAGE,{variant:1,loaded:1}),/stored plates/);
 assert.throws(()=>validateFloorParams(WALL_CONTROL,{...WALL_CONTROL.defaults,size:2,panels:4}),/panels/);
 assert.throws(()=>validateFloorParams(ROGUE_VERTICAL_BAR_HANGER,{size:0,loaded:3}),/hanging barbells/);
 const doc=addWallItem(createAssembly(),ROGUE_V2_GUN_RACK.id,{wall:'left',position:[0,1400]}),item={...doc.wallItems![0],params:{...ROGUE_V2_GUN_RACK.defaults,loaded:4}};
 assert.deepEqual(validateWallItems(JSON.parse(JSON.stringify([item]))),[item]);
});
