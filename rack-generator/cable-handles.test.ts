import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {PARTS} from './hang-parts/cable-handles.ts';
import {definitions as familyDefinitions} from './parts/cable-handles.ts';
import {HANG_PARTS, HOOK_REACH, hangPart, isHangPart} from './hang-registry.ts';
import {definitions} from './catalog.ts';
import {vendorAttribution} from './vendor-metadata.ts';
import {freeSlots, placeHang, validateHangItems} from './hang-items.ts';
import {addWallItem} from './wall-items.ts';
import {createAssembly, validateAssembly} from './assembly.ts';
import type {SolidPart} from './types.ts';
import {BUILD_BUDGET_MS} from './test-budget.ts';
const api=await Module();api.setup();
const IN=25.4;
type Box={min:number[];max:number[]};
const bounds=(solids:SolidPart[],filter:(s:SolidPart)=>boolean=()=>true):Box=>{
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const s of solids.filter(filter)){const b=s.solid.boundingBox();for(let i=0;i<3;i++){min[i]=Math.min(min[i],b.min[i]);max[i]=Math.max(max[i],b.max[i]);}}
 return {min,max};
};
const build=(id:string,hook=0)=>definitions.find(d=>d.id===id)!.build(api,{hook});
const free=(solids:SolidPart[])=>{for(const s of solids)s.solid.delete();};
const size=(b:Box,i:number)=>b.max[i]-b.min[i];
const near=(actual:number,expected:number,tol:number,what:string)=>assert.ok(Math.abs(actual-expected)<=tol,`${what}: ${actual.toFixed(1)} vs ${expected.toFixed(1)} ±${tol}`);

test('every cable-handles entry is registered, credited, sectioned and described',()=>{
 assert.equal(PARTS.length,21);
 assert.deepEqual(familyDefinitions.map(d=>d.id),PARTS.map(p=>p.id),'one builder per entry, same order');
 for(const part of PARTS){
  assert.ok(isHangPart(part.id)&&HANG_PARTS.includes(part as never),part.id);
  assert.equal(part.section,'Cable attachments');
  assert.equal(definitions.find(d=>d.id===part.id)?.category,'Cable attachments');
  const v=vendorAttribution(part.id)!;assert.deepEqual(v,part.vendor);
  assert.ok(v.vendor&&v.credit&&v.trademark&&/^Independent Manifold reconstruction\. Published: /.test(v.reconstruction),part.id);
  assert.match(v.url,/^https:\/\/(www\.)?(roguefitness|spud-inc-straps|amazon|gymreapers|bellsofsteel|beyond-power)\.com\//);
  assert.match(part.description!,/Independent reconstruction/);
  assert.deepEqual(part.defaults,{hook:0});
 }
 assert.equal(new Set(definitions.map(d=>d.id)).size,definitions.length,'no id collisions with the rest of the catalog');
});

test('both poses build valid closed solids inside a tight envelope, anchored on the hook rod',()=>{
 for(const part of PARTS)for(const hook of [0,1]){
  const t0=performance.now(),solids=build(part.id,hook),ms=performance.now()-t0;
  for(const s of solids){assert.ok(!s.solid.isEmpty()&&s.solid.status()==='NoError'&&s.solid.volume()>0,`${part.id} ${s.name}`);assert.notEqual(s.role,'frame','fixed factory colours, not rack paint');}
  const own=bounds(solids,s=>s.name!=='Pegboard hook'),all=bounds(solids),{width,above,drop}=part.envelope;
  assert.ok(all.min[0]>=-width/2&&all.max[0]<=width/2&&all.min[2]>=-drop&&all.max[2]<=above,`${part.id} fits its envelope`);
  if(!hook){
   assert.ok(width/2-Math.max(-own.min[0],own.max[0])<=6,`${part.id} envelope width is tight`);
   assert.ok(drop+own.min[2]<=12,`${part.id} envelope drop is tight`);
   assert.ok(solids.reduce((n,s)=>n+s.solid.numTri(),0)<80000,`${part.id} triangle budget`);
   // Budget is 1.5 s on an idle machine (measured ≤ 0.6 s); the full suite runs many agents at once, so only guard runaway builds.
   assert.ok(ms< BUILD_BUDGET_MS,`${part.id} builds in ${ms.toFixed(0)} ms`);
  }
  assert.ok(own.min[2]<0&&own.max[2]>0&&own.min[1]<0,`${part.id} straddles the anchor`);
  assert.ok(all.max[1]<=(hook?HOOK_REACH+19:HOOK_REACH),`${part.id} clears the panel face`);
  assert.equal(solids.some(s=>s.name==='Pegboard hook'),!!hook);
  free(solids);
 }
 assert.throws(()=>build('rogue-rotating-v-grip',2),/pose/);
 assert.ok(PARTS.every(p=>p.envelope.width<=hangPart('rep-lat-bar-48')!.envelope.width),'no attachment is wider than a 48″ lat bar');
});

test('published dimensions come out of the builds',()=>{
 const measure=(id:string,filter?:(s:SolidPart)=>boolean)=>{const s=build(id),b=bounds(s,filter);free(s);return b;};
 // Rogue Rotating V-Grip: 14.4″ × 5.8″, 5″ × 32 mm handles.
 let b=measure('rogue-rotating-v-grip');near(size(b,0),14.4*IN,.03*14.4*IN,'V-grip width');near(size(b,2),5.8*IN,.03*5.8*IN,'V-grip height');
 const v=build('rogue-rotating-v-grip'),grips=v.find(s=>/H-5/.test(s.name))!;
 near(grips.solid.volume()/2,Math.PI*16**2*132,.02*Math.PI*16**2*132,'32 mm H-5 handle (132 mm incl. the plate seat)');free(v);
 // Rogue single handle: 8.5″ from the top of the ring to the handle centre, 5″ × 28.5 mm handle.
 const single=build('rogue-single-handle'),ring=bounds(single,s=>/ring/i.test(s.name)),handle=bounds(single,s=>/handle/i.test(s.name));
 near(ring.max[2]-(handle.min[2]+handle.max[2])/2,8.5*IN,1,'ring top to handle centre');near(size(handle,0),5*IN,.5,'handle length');near(size(handle,2),28.5,.5,'handle diameter');free(single);
 // Bars: tip-to-tip lengths and bar diameters.
 for(const [id,len,d] of [['rogue-lat-bar',48,1.125*IN],['rogue-curl-bar-cable-attachment',35.5,28.5],['rogue-stainless-straight-lat-bar-40',40,28.5],['rogue-stainless-straight-lat-bar-20',20,28.5]] as const){
  const solids=build(id),bar=bounds(solids,s=>/knurl/i.test(s.name));
  near(size(bounds(solids),0),len*IN,.006*len*IN,`${id} length`);near(size(bar,1),d,.3,`${id} diameter`);free(solids);
 }
 // BLUSLM set: published widths across the grips, every piece 4″ (10 cm) tall, 17 mm rubber-dipped steel.
 for(const [id,w] of [['bluslm-wave-lat-bar-84',841],['bluslm-wave-lat-bar-78',780],['bluslm-v-lat-bar-62',623],['bluslm-v-lat-bar-60',595],['bluslm-v-lat-bar-56',555],['bluslm-close-grip-24',245],['bluslm-close-grip-26',265],['bluslm-close-grip-22',220]] as const){
  const solids=build(id),all=bounds(solids),frame=bounds(solids,s=>/frame/.test(s.name));
  near(size(all,0),w,1,`${id} width`);near(size(all,2),4*IN,5,`${id} height`);near(frame.max[1],17/2,.01,`${id} 17 mm frame`);free(solids);
 }
 // Beyond Power carabiner: 75.5 × 40.3 mm outside.
 b=measure('beyond-power-premium-carabiner',s=>/frames/.test(s.name));near(size(b,0),40.3,.3,'carabiner width');near(size(b,2),75.5,.3,'carabiner length');
 // Bells of Steel swivel shackle: 70 mm total length (steel body, pull rings excluded).
 b=measure('bells-of-steel-swivel-shackles',s=>/316/.test(s.name));near(size(b,2),70,1,'shackle length');
 // Straps: Spud 32″ ring to loop ends; MANUEKLEAR 24″; daisy chain legs are half a 1.1 m chain (plus the end loop).
 near(size(measure('spud-long-ab-strap'),2),32*IN,.02*32*IN,'Spud long ab strap length');
 near(size(measure('manueklear-tricep-straps'),2),24*IN,.02*24*IN,'MANUEKLEAR strap length');
 b=measure('generic-daisy-chains');assert.ok(size(b,2)>500&&size(b,2)<600,'daisy chain folded in half');
 near(size(measure('rogue-ankle-cuff',s=>s.name==='Cordura cuff and ring tabs'),0),4*IN,.5,'Rogue cuff width 4″');
});

test('the family hangs on a pegboard like any other attachment and long straps reserve the hooks below them',()=>{
 const doc0=addWallItem(createAssembly(),'pegboard-panel',{wall:'back',position:[-1500,1500]});
 let doc=placeHang(doc0,'rogue-rotating-v-grip',{panel:'wall-1',slot:5});
 doc=placeHang(doc,'spud-long-ab-strap',{panel:'wall-1',slot:1});
 assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(doc))).hangItems,doc.hangItems);
 assert.throws(()=>validateHangItems([{id:'hang-9',part:'rogue-nope',panel:'wall-1',slot:0}],doc.wallItems!),/Unknown/);
 // The 32″ ab strap drops past the bottom of a 24″ panel, so no other attachment may hang below it in its column.
 const below=freeSlots(doc,'beyond-power-premium-carabiner').filter(s=>s.slot%11===1);
 assert.deepEqual(below,[],'the strap blocks its whole column');
 assert.ok(freeSlots(doc,'beyond-power-premium-carabiner').length>20,'small hardware still fits elsewhere');
});
