import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {POWER_BAR_PRODUCTS, PARTS, collarLength, powerBarModel} from './floor-parts/power-bars.ts';
import {buildPowerBar, knurlZones} from './parts/power-bars.ts';
import {BAR, BARBELL, DEFAULT_BAR_SPEC, barSleeves} from './floor-parts/barbell.ts';
import {barCradles, barSpec, freeCradles, parkedPose, settleBarbells, suggestCradle} from './barbell-cradles.ts';
import {coerceFloorParams, defineFloorPart, floorOptions, registerFloorPart, resolveBy, validateFloorParams} from './floor-registry.ts';
import {addFloorItem, floorWarnings} from './floor-items.ts';
import {createAssembly, removeInstance, resolveAssembly, validateAssembly} from './assembly.ts';
import type {Manifold, NumericParams, RackDoc, SolidPart} from './types.ts';
const api=await Module();api.setup();
const inch=(v:number)=>v*25.4;
/** Published specs, re-typed from the manufacturer pages (research/power-bars.md), independent of the model constants:
 * overall length, inner-collar span (null = not published), loadable sleeve, shaft (mm), centre knurl. */
const PUBLISHED:Record<string,{length:number;inside:number|null;sleeve:number;shaft:number;center:boolean}>={
 'rogue-ohio-power-bar':{length:inch(86.52),inside:inch(51.5),sleeve:inch(16.25),shaft:29,center:true},
 'texas-deadlift-bar':{length:inch(92.5),inside:inch(56.5),sleeve:inch(15.5),shaft:27,center:false},
 'rogue-ohio-bar':{length:inch(86.75),inside:null,sleeve:inch(16.4),shaft:28.5,center:false},
 'texas-power-bar':{length:inch(86),inside:inch(52),sleeve:inch(15),shaft:28.5,center:true},
 'rogue-bella-bar':{length:inch(79.13),inside:null,sleeve:inch(13),shaft:25,center:false},
 'rogue-ohio-power-bar-20kg':{length:inch(86.52),inside:inch(51.5),sleeve:inch(16.875),shaft:29,center:true},
 'texas-power-bar-pro':{length:inch(86.5),inside:inch(51.625),sleeve:inch(16),shaft:29,center:true},
 'rogue-ohio-deadlift-bar':{length:inch(90.5),inside:inch(56),sleeve:inch(15.5),shaft:27,center:false},
 'rep-colorado-bar':{length:inch(86.6),inside:null,sleeve:inch(16.1),shaft:28.5,center:false},
 'rep-double-black-diamond-power-bar':{length:inch(86.6),inside:null,sleeve:inch(16.3),shaft:29,center:true},
 'rogue-boneyard-bar':{length:inch(86.75),inside:null,sleeve:inch(16.4),shaft:28.5,center:false},
 'rep-black-diamond-power-bar':{length:inch(86.6),inside:null,sleeve:inch(16.3),shaft:29,center:true},
 'american-barbell-chewy-bar':{length:2200,inside:null,sleeve:inch(16.338),shaft:29,center:true},
 'texas-squat-bar':{length:inch(96.5),inside:inch(57.5),sleeve:inch(16.875),shaft:31.75,center:true},
};
const bbox=(parts:SolidPart[],pick:(p:SolidPart)=>boolean=()=>true)=>{const s=parts.filter(pick);const all=api.Manifold.union(s.map(p=>p.solid)),b=all.boundingBox();all.delete();return b;};
/** Bounding box of `solid` clipped to x > 0 (the +X half of a mirrored pair). */
const plusHalf=(solid:Manifold)=>{const cut=api.Manifold.cube([4000,400,400]).translate([0,-200,-200]),h=solid.intersect(cut),b=h.boundingBox(),v=h.volume();cut.delete();h.delete();return {...b,volume:v};};
const cases=(part:(typeof PARTS)[number])=>{
 const out:NumericParams[]=[{...part.defaults}];
 for(const p of part.params){const opts=floorOptions(p,part.defaults);for(const v of new Set([opts[0],opts[opts.length>>1],opts.at(-1)!]))out.push({...part.defaults,[p.key]:v});}
 return out;
};
test('the catalog lists the fourteen #107 bars, most-owned first, as parking Barbells with vendor credit',()=>{
 assert.deepEqual(PARTS.map(p=>p.id),Object.keys(PUBLISHED));
 for(const part of PARTS){
  assert.equal(part.section,'Barbells');assert.equal(part.parks,true);assert.equal(part.noun,'barbell');
  assert.ok(part.vendor && part.vendor.url.startsWith('https://') && part.vendor.trademark && /Published:.*Estimated:/.test(part.vendor.reconstruction),part.id);
  assert.match(part.description!,/Independent reconstruction .*; .+ trademarks belong to .+\.$/);
 }
});
test('every bar and param extreme builds closed solids whose bounds are the footprint (collars on the floor)',()=>{
 for(const part of PARTS)for(const params of cases(part)){
  const parts=buildPowerBar(api,part.id,params),tag=`${part.id} ${JSON.stringify(params)}`;
  try{
   for(const p of parts){assert.ok(!p.solid.isEmpty() && p.solid.status()==='NoError' && p.solid.volume()>0,`${tag} ${p.name}`);assert.notEqual(p.role,'frame','factory finishes, not rack paint');}
   const b=bbox(parts),{width,depth}=resolveBy(part.footprint,params);
   assert.ok(Math.abs(b.max[0]-b.min[0]-width)<1e-6 && Math.abs(b.max[1]-b.min[1]-depth)<1e-6 && Math.abs(b.min[2])<1e-6 && Math.abs(b.max[2]-depth)<1e-6,`${tag} footprint`);
   const tris=parts.reduce((n,p)=>n+p.solid.numTri(),0);assert.ok(tris<80000,`${tag}: ${tris} triangles`);
  }finally{parts.forEach(p=>p.solid.delete());}
 }
});
test('published length, collar span, sleeve length, shaft diameter and centre knurl come out of the build',()=>{
 for(const part of PARTS){
  const spec=PUBLISHED[part.id],parts=buildPowerBar(api,part.id,part.defaults),m=powerBarModel(POWER_BAR_PRODUCTS.find(p=>p.id===part.id)!,part.defaults);
  try{
   const all=bbox(parts);assert.ok(Math.abs(all.max[0]-all.min[0]-spec.length)<(part.id==='texas-power-bar'?12:1),`${part.id} overall length`);
   const shaft=bbox(parts,p=>p.role==='rod');assert.ok(Math.abs(shaft.max[1]-shaft.min[1]-spec.shaft)<.05,`${part.id} shaft diameter`);
   const sleeve=plusHalf(parts.find(p=>/loadable sleeves/.test(p.name))!.solid);
   assert.ok(Math.abs(sleeve.max[0]-sleeve.min[0]-spec.sleeve)<1,`${part.id} loadable sleeve ${sleeve.max[0]-sleeve.min[0]} vs ${spec.sleeve}`);
   assert.ok(Math.abs(sleeve.max[1]-sleeve.min[1]-50)<.05,`${part.id} 50 mm sleeves`);
   const collar=plusHalf(parts.find(p=>/collars|shoulders/i.test(p.name))!.solid);
   assert.ok(Math.abs(2*collar.min[0]-(spec.inside ?? 1310))<(spec.inside?1:12),`${part.id} inner collar span`);
   assert.ok(collarLength(m)>15,`${part.id} shoulders close the published length with a plausible collar`);
   const knurl=parts.find(p=>p.role==='handle')!.solid,centre=api.Manifold.cube([30,60,80],true).translate([0,0,30]),hit=knurl.intersect(centre);
   assert.equal(hit.volume()>1,spec.center,`${part.id} centre knurl`);hit.delete();centre.delete();
   // Grip knurl stops short of the collars, and the IPF ring mark (81 cm) is smooth.
   const zones=knurlZones(m);assert.ok(zones.every(([a,b])=>b>a && Math.abs(b)<m.inside/2 && Math.abs(a)<m.inside/2));
   assert.ok(!zones.some(([a,b])=>a<405 && b>405),`${part.id} IPF mark`);
  }finally{parts.forEach(p=>p.solid.delete());}
 }
 // Variants: Boneyard shafts carry their platform geometry; the Texas PRO medium knurl is shallower than aggressive.
 const bone=POWER_BAR_PRODUCTS.find(p=>p.id==='rogue-boneyard-bar')!;
 assert.deepEqual([0,1,2,3].map(shaft=>powerBarModel(bone,{shaft,finish:0}).shaft),[28.5,28,29,25]);
 const pro=POWER_BAR_PRODUCTS.find(p=>p.id==='texas-power-bar-pro')!;
 assert.ok(powerBarModel(pro,{knurl:1}).knurl.depth<powerBarModel(pro,{knurl:0}).knurl.depth);
});
test('params validate strictly and coerce to the nearest option',()=>{
 for(const part of PARTS){
  assert.deepEqual(validateFloorParams(part,{}),part.defaults);
  assert.throws(()=>validateFloorParams(part,{bogus:1}),/barbell/);
  for(const p of part.params)assert.throws(()=>validateFloorParams(part,{[p.key]:999}),/barbell/);
  if(part.params.length)assert.deepEqual(coerceFloorParams(part,{[part.params[0].key]:999})[part.params[0].key],floorOptions(part.params[0],part.defaults).at(-1));
 }
 assert.throws(()=>buildPowerBar(api,'rogue-ohio-bar',{finish:42}),/finish/);
 assert.throws(()=>buildPowerBar(api,'rogue-boneyard-bar',{shaft:9,finish:0}),/shaft/);
});
test('each bar declares its own cradle geometry; the Olympic bar and undeclared parking parts keep the defaults',()=>{
 assert.deepEqual(barSpec(BARBELL.id),DEFAULT_BAR_SPEC);assert.deepEqual(barSpec('no-such-part'),DEFAULT_BAR_SPEC);
 assert.deepEqual(DEFAULT_BAR_SPEC,{shaft:28.5,shaftHalf:655,sleeveStart:685,sleeveLength:415,sleeveDiameter:50,axisZ:28});
 const dl=barSpec('texas-deadlift-bar'),sq=barSpec('texas-squat-bar'),bella=barSpec('rogue-bella-bar');
 assert.equal(dl.shaft,27);assert.ok(Math.abs(dl.shaftHalf-inch(56.5)/2)<.1);assert.ok(Math.abs(dl.sleeveLength-inch(15.5))<.1);assert.equal(sq.shaft,31.75);assert.equal(bella.shaft,25);
 assert.deepEqual(barSpec('rogue-boneyard-bar',{shaft:3}),barSpec('rogue-bella-bar'),'Boneyard 25 mm follows the Bella platform');
 // Plate stacks: sleeves start at the published collar face and run the published loadable length.
 const sleeves=barSleeves({position:[0,0,1000],rotation:[0,0,0]},dl);
 assert.deepEqual(sleeves.map(s=>Math.round(s.length*10)/10),[393.7,393.7]);assert.ok(Math.abs(sleeves[0].origin[0]-dl.sleeveStart)<1e-9 && sleeves[0].origin[2]===1000+dl.axisZ && sleeves[1].axis[0]===-1);
 assert.deepEqual(barSleeves({position:[0,0,0],rotation:[0,0,0]}).map(s=>s.length),[415,415],'default path unchanged');
});
const park=(doc:RackDoc,part:string)=>{const next=addFloorItem(doc,part as never),bar=next.floorItems!.at(-1)!,c=suggestCradle(freeCradles(resolveAssembly(doc),next.floorItems,bar.id))!;bar.cradle=c.key;return {doc:validateAssembly(next),cradle:c};};
test('power bars park on the J-cups with their own shaft radius, and follow the generalised cradle contract',()=>{
 const doc=createAssembly(),[jcups]=barCradles(resolveAssembly(doc));
 for(const id of ['texas-squat-bar','texas-deadlift-bar','rogue-bella-bar','rogue-ohio-power-bar']){
  const {doc:parked,cradle}=park(doc,id),bar=resolveAssembly(parked).find(e=>e.part===id)!,spec=barSpec(id);
  assert.equal(cradle.key,jcups.key);
  // The shaft bottom sits where the 28.5 mm reference shaft's does: axis rises/drops by the radius difference.
  assert.ok(Math.abs(bar.position[2]+spec.axisZ-spec.shaft/2-(jcups.center[2]-BAR.shaft/2))<1e-9,`${id} shaft rests on the cup floor`);
  assert.deepEqual(bar.position,parkedPose(jcups,spec).position);assert.ok(!floorWarnings(parked).length);
  const {doc:settled,dropped}=settleBarbells(parked,resolveAssembly(parked));assert.deepEqual(dropped,[],`${id} stays parked`);assert.equal(settled,parked);
  const gone=removeInstance(parked,'jhooks-front');assert.equal(settleBarbells(gone,resolveAssembly(gone),resolveAssembly(parked)).dropped.length,1);
 }
 // A bar whose collars sit inside the J-cup span cannot use that cradle, and drops if it was parked there.
 const span=Math.abs(jcups.supports[0].point[0]-jcups.supports[1].point[0]);
 registerFloorPart(defineFloorPart({id:'test-short-bar',name:'Short bar',title:'Short bar',noun:'barbell',params:[],footprint:{width:1200,depth:50},parks:true,
  bar:{...DEFAULT_BAR_SPEC,shaftHalf:span/2}}));
 assert.equal(freeCradles(resolveAssembly(doc),[],null,barSpec('test-short-bar')).length,0);
 assert.equal(freeCradles(resolveAssembly(doc)).length,1,'Olympic default still fits');
 const {doc:olympic}=park(doc,BARBELL.id),swapped=structuredClone(olympic);swapped.floorItems![0].part='test-short-bar' as never;swapped.floorItems![0].params={};
 assert.deepEqual(settleBarbells(swapped,resolveAssembly(swapped)).dropped,[swapped.floorItems![0].id]);
 assert.equal(resolveAssembly(swapped).find(e=>(e.part as string)==='test-short-bar')!.position[2],0,'unseatable bar stays at its floor spot');
});
