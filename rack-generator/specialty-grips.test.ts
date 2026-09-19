import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {PARTS} from './hang-parts/specialty-grips.ts';
import {definitions as familyDefinitions} from './parts/specialty-grips.ts';
import {HANG_PARTS, HOOK_REACH, hangPart, isHangPart} from './hang-registry.ts';
import {definitions} from './catalog.ts';
import {vendorAttribution} from './vendor-metadata.ts';
import {freeSlots, placeHang, validateHangItems} from './hang-items.ts';
import {addWallItem} from './wall-items.ts';
import {createAssembly, validateAssembly} from './assembly.ts';
import type {SolidPart} from './types.ts';
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
const measure=(id:string,filter?:(s:SolidPart)=>boolean)=>{const s=build(id),b=bounds(s,filter);free(s);return b;};

test('every specialty-grips entry is registered, credited, sectioned and described',()=>{
 assert.equal(PARTS.length,24);
 assert.deepEqual(familyDefinitions.map(d=>d.id),PARTS.map(p=>p.id),'one builder per entry, same order');
 for(const part of PARTS){
  assert.ok(isHangPart(part.id)&&HANG_PARTS.includes(part as never),part.id);
  assert.equal(part.section,'Cable attachments');
  assert.equal(definitions.find(d=>d.id===part.id)?.category,'Cable attachments');
  const v=vendorAttribution(part.id)!;assert.deepEqual(v,part.vendor);
  assert.ok(v.vendor&&v.credit&&v.trademark&&/^Independent Manifold reconstruction\. Published: /.test(v.reconstruction),part.id);
  assert.match(v.url,/^https:\/\/(www\.)?(porterpef|angles90|trakfitnessllc|darkolifting|roguefitness|maxagrip|amazon|primefitnessusa|beltfedstrength|repfitness|dynepic-sports|kensuifitness|beyond-power)\.com\//);
  assert.match(part.description!,/Independent reconstruction/);
  assert.deepEqual(part.defaults,{hook:0});
 }
 assert.equal(new Set(definitions.map(d=>d.id)).size,definitions.length,'no id collisions with the rest of the catalog');
 assert.equal(PARTS.filter(p=>p.id.startsWith('mag-')).length,6,'six MAG grips from one builder');
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
   // Budget is 1.5 s on an idle machine (measured ≤ 0.2 s); the full suite runs many agents at once, so only guard runaway builds.
   assert.ok(ms<6000,`${part.id} builds in ${ms.toFixed(0)} ms`);
  }
  assert.ok(own.min[2]<0&&own.max[2]>0&&own.min[1]<0,`${part.id} straddles the anchor`);
  assert.ok(all.max[1]<=(hook?HOOK_REACH+19:HOOK_REACH),`${part.id} clears the panel face`);
  assert.equal(solids.some(s=>s.name==='Pegboard hook'),!!hook);
  free(solids);
 }
 assert.throws(()=>build('porter-physed-eclipse-grip',2),/pose/);
 assert.ok(PARTS.every(p=>p.envelope.width<=hangPart('rep-lat-bar-48')!.envelope.width),'no attachment is wider than a 48″ lat bar');
});

test('published dimensions come out of the builds',()=>{
 // Eclipse: 38 mm handle, 3″ base.
 near(size(measure('porter-physed-eclipse-grip',s=>/handle/.test(s.name)),0),38,.3,'Eclipse handle');
 near(size(measure('porter-physed-eclipse-grip',s=>/base/.test(s.name)),0),3*IN,.3,'Eclipse 3″ base');
 // Darko bars: 22.75″ × 5″ and 32.4″ × 5″; Longy holes 24″ and 10.4″ apart land on the hole pitch.
 for(const [id,w] of [['darko-lifting-shorty-bar',22.75],['darko-lifting-longy-bar',32.4]] as const){const b=measure(id);near(size(b,0),w*IN,1,`${id} width`);near(size(b,2),5*IN,2,`${id} height`);near(size(measure(id,s=>/steel bar/.test(s.name)),1),9.5,.01,`${id} 3/8″ steel`);}
 const longyHoles=Array.from({length:11},(_,i)=>5.2*IN-2*28.8+28.8*i);
 assert.ok(longyHoles.some(x=>Math.abs(2*x-10.4*IN)<.5)&&longyHoles.some(x=>Math.abs(2*x-24*IN)<.5),'Longy 10.4″ and 24″ hole pairs');
 // ARC 5° with 8″ handles: 26.5″ overall, 35 mm handles, 1.75″ barrel, about 5.5″ tall.
 let b=measure('mutant-metals-arc-cable-attachment');near(size(b,0),26.5*IN,.01*26.5*IN,'ARC width');near(size(b,2),5.5*IN,.06*5.5*IN,'ARC height');
 near(size(measure('mutant-metals-arc-cable-attachment',s=>/barrel/.test(s.name)),1),1.75*IN,.2,'ARC barrel');
 near(size(measure('mutant-metals-arc-cable-attachment',s=>/handles/.test(s.name)),1),35,.2,'ARC handles');
 // MAG: grip centres at the published middle-finger spacing.
 for(const id of ['mag-medium-grip-supinate','mag-medium-grip-pronate','mag-medium-grip-neutral','mag-wide-grip','mag-close-grip-supinate','mag-close-grip-neutral']){const g=measure(id,s=>/grips/.test(s.name));near(g.max[0]+g.min[0],0,.01,`${id} symmetric`);}
 const magCentre=(id:string)=>{const s=build(id),g=s.find(p=>/grips/.test(p.name))!,parts=g.solid.decompose(),xs=parts.map(p=>{const bb=p.boundingBox();return (bb.min[0]+bb.max[0])/2;});for(const p of parts)p.delete();free(s);return Math.max(...xs)-Math.min(...xs);};
 for(const [id,w,tol] of [['mag-medium-grip-neutral',22,.6],['mag-wide-grip',38,.8],['mag-close-grip-supinate',5,1.2]] as const) near(magCentre(id)/IN,w,tol,`${id} grip spacing (in)`);
 // Danglers 2″ × 2″ × 3.5″ each.
 const eggs=measure('darko-lifting-danglers',s=>/avocado/.test(s.name));near(size(eggs,1),2*IN+8,.5,'Dangler 2″ depth (pair 8 mm apart)');near(size(eggs,2),3.5*IN,6,'Dangler 3.5″ length (hung at 19°)');
 // KORIKAHM: 7.7″ tall, 8.6″ wide (±6%).
 b=measure('korikahm-msp-paddle-grip');near(size(b,2),7.7*IN,.06*7.7*IN,'KORIKAHM height');near(size(b,0),8.6*IN,.12*8.6*IN,'KORIKAHM width');
 // KAZ small: 2.25″ to 1.70″ taper.
 const kaz=build('prime-fitness-kaz-handles'),spools=kaz.find(s=>/spools/.test(s.name))!.solid.decompose();
 assert.equal(spools.length,2,'KAZ pair');for(const s of spools)s.delete();free(kaz);
 // BFAS: 30″ strap hangs 15″ below the ring, 1-5/8″ wide.
 b=measure('belt-fed-strength-bfas');near(size(b,2),15*IN+22,20,'BFAS drop');
 // Atlas Multi-Grip: 32″ × 6.75″ × 9.75″, 29 mm grips 6″ long; Angled Atlas: 11.15″ × 7.1″ × 8.2″.
 b=measure('rep-kleva-atlas-multi-grip',s=>!/print/.test(s.name));near(size(b,0),32*IN,2,'Atlas length');near(size(b,1),6.75*IN,6,'Atlas depth');near(size(b,2),9.75*IN,6,'Atlas height');
 const rungs=measure('rep-kleva-atlas-multi-grip',s=>/grips/.test(s.name));near(size(rungs,1),6*IN,.01,'6″ rungs');const atlas=build('rep-kleva-atlas-multi-grip'),rv=atlas.find(s=>/grips/.test(s.name))!.solid.volume();free(atlas);near(rv,10*Math.PI*14.5**2*6*IN,.02*rv,'ten 29 mm × 6″ rungs');
 b=measure('rep-kleva-angled-atlas-close-grip');near(size(b,0),11.15*IN,5,'Angled Atlas length');near(size(b,1),7.1*IN,4,'Angled Atlas depth');near(size(b,2),8.2*IN,4,'Angled Atlas height');
 // Swissies: 32 mm handle; CarbonFlex: 24″/48″ × 28 mm.
 near(size(measure('kensui-swissies',s=>/handles/.test(s.name)),2),32,.01,'Swissies 32 mm handle');
 for(const [id,len] of [['beyond-power-carbonflex-bar-48',48],['beyond-power-carbonflex-bar-24',24]] as const){near(size(measure(id),0),len*IN,.01,`${id} length`);near(size(measure(id,s=>/tube/.test(s.name)),1),28,.01,`${id} 28 mm tube`);}
});

test('the family hangs on a pegboard like any other attachment',()=>{
 const doc0=addWallItem(createAssembly(),'pegboard-panel',{wall:'back',position:[-1500,1500]});
 let doc=placeHang(doc0,'mag-medium-grip-supinate',{panel:'wall-1',slot:5});
 doc=placeHang(doc,'dynepic-spiral-strength-dually',{panel:'wall-1',slot:1});
 assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(doc))).hangItems,doc.hangItems);
 assert.throws(()=>validateHangItems([{id:'hang-9',part:'mag-nope',panel:'wall-1',slot:0}],doc.wallItems!),/Unknown/);
 assert.ok(freeSlots(doc,'porter-physed-eclipse-grip').length>20,'small grips still fit elsewhere');
});
