import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {PARTS, MONSTER_BANDS} from './hang-parts/hanging-accessories.ts';
import {definitions as familyDefinitions, drape, monsterBandDrape, elitePackDrapes, gripzPose, TITAN, BOS, ROGUE_USA, HG, MAGPIN, PILLOW, INZER, WRAPS, OHIO, SR1, RINGS} from './parts/hanging-accessories.ts';
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
const measure=(id:string,filter?:(s:SolidPart)=>boolean)=>{const s=build(id),b=bounds(s,filter);free(s);return b;};

test('every hanging accessory is registered, credited, sectioned and described',()=>{
 assert.equal(PARTS.length,28);
 assert.deepEqual(familyDefinitions.map(d=>d.id),PARTS.map(p=>p.id),'one builder per entry, same order');
 for(const part of PARTS){
  assert.ok(isHangPart(part.id)&&HANG_PARTS.includes(part as never),part.id);
  assert.equal(part.section,'Hanging accessories');
  assert.equal(definitions.find(d=>d.id===part.id)?.category,'Hanging accessories');
  const v=vendorAttribution(part.id)!;assert.deepEqual(v,part.vendor);
  assert.ok(v.vendor&&v.credit&&v.trademark&&/^Independent Manifold reconstruction\. Published: /.test(v.reconstruction),part.id);
  assert.match(v.url,/^https:\/\/(www\.)?(roguefitness|elitefts|fatgripz|ironmind|keppifitness|titan\.fitness|bellsofsteel|fringesport|oakclubmfg|trxtraining|repfitness|markbellslingshot|spud-inc-straps|inzernet)\.com\/|^https:\/\/www\.titan\.fitness\//);
  assert.match(part.description!,/Independent reconstruction/);
  assert.deepEqual(part.defaults,{hook:0});
 }
 assert.equal(new Set(definitions.map(d=>d.id)).size,definitions.length,'no id collisions with the rest of the catalog');
 assert.deepEqual(PARTS.filter(p=>p.id.startsWith('rogue-monster-band-')).map(p=>p.id),MONSTER_BANDS.map(b=>`rogue-monster-band-${b.n}`),'one entry per Monster Band strength');
});

test('both poses build valid closed solids inside a tight envelope, threaded on the hook peg',()=>{
 for(const part of PARTS)for(const hook of [0,1]){
  const t0=performance.now(),solids=build(part.id,hook),ms=performance.now()-t0;
  for(const s of solids){assert.ok(!s.solid.isEmpty()&&s.solid.status()==='NoError'&&s.solid.volume()>0,`${part.id} ${s.name}`);assert.notEqual(s.role,'frame','fixed factory colours, not rack paint');}
  const own=bounds(solids,s=>s.name!=='Pegboard hook'),all=bounds(solids),{width,above,drop}=part.envelope;
  assert.ok(all.min[0]>=-width/2&&all.max[0]<=width/2&&all.min[2]>=-drop&&all.max[2]<=above,`${part.id} fits its envelope`);
  if(!hook){
   assert.ok(width/2-Math.max(-own.min[0],own.max[0])<=6,`${part.id} envelope width is tight`);
   assert.ok(drop+own.min[2]<=12,`${part.id} envelope drop is tight`);
   assert.ok(above<=26||above-own.max[2]<=6,`${part.id} envelope top is tight`);
   assert.ok(solids.reduce((n,s)=>n+s.solid.numTri(),0)<80000,`${part.id} triangle budget`);
   // Budget is 1.5 s on an idle machine (measured ≤ 0.4 s); tests only guard runaway builds (test-budget.ts).
   assert.ok(ms<BUILD_BUDGET_MS,`${part.id} builds in ${ms.toFixed(0)} ms`);
  }
  assert.ok(own.min[2]<0&&own.max[2]>0&&own.min[1]<0,`${part.id} straddles the anchor`);
  assert.ok(all.max[1]<=(hook?HOOK_REACH+19:HOOK_REACH),`${part.id} clears the panel face`);
  assert.equal(solids.some(s=>s.name==='Pegboard hook'),!!hook);
  free(solids);
 }
 assert.throws(()=>build('keppi-opencollar',2),/pose/);
 assert.ok(PARTS.every(p=>p.envelope.width<=hangPart('rep-lat-bar-48')!.envelope.width),'no accessory is wider than a 48″ lat bar');
});

test('loops rest on the rod: bands, collars, rings and the belt touch the rod top from inside',()=>{
 // Inner top of every loop (drape inner radius a - t/2) sits on the Ø6 rod.
 for(const n of [0,3,7]){const d=monsterBandDrape(n);near(d.a-d.thick/2,3,1e-9,`band #${n} inner top radius`);}
 const band=measure('rogue-monster-band-4',s=>/latex/.test(s.name));near(band.max[2],3+.18*IN,.05,'#4 band top = rod top + thickness');
 // A collar bore rests on the rod: the bore top is at z = +3.
 for(const [id,innerR] of [['titan-twistlock-pro-collars',TITAN.bore],['bells-of-steel-magnetic-clamp-collars',BOS.bore-BOS.lining],['rogue-usa-aluminum-collars',ROGUE_USA.bore-ROGUE_USA.lining],['rogue-hg-2-collars',HG.bore-HG.pad]] as const){
  const s=build(id),probe=api.Manifold.cylinder(200,.4,.4,8).rotate([90,0,0]).translate([0,100,3-.45]);
  assert.ok(s.every(p=>p.solid.intersect(probe).isEmpty()),`${id} bore is clear just under the rod top`);
  const lifted=probe.translate([0,0,-2*innerR-.9]);assert.ok(s.some(p=>!p.solid.intersect(lifted).isEmpty()),`${id} bore bottom at 2r below the rod top`);
  probe.delete();lifted.delete();free(s);
 }
 // Nested elitefts loops share the arc spacing, so none crosses another.
 const loops=elitePackDrapes();for(let i=1;i<loops.length;i++){near(loops[i].drape.D,loops[0].drape.D,1e-9,'shared spacing');assert.ok(loops[i].drape.a-loops[i-1].drape.a>=loops[i].thick,'outer loop clears inner loop');}
 // The drape solver closes the loop at the requested perimeter.
 const d=drape(5,20,1000);assert.ok(d.D>400&&d.D<500);
});

test('published dimensions come out of the builds',()=>{
 // Rogue Monster Bands: 41″ flat length (drop ≈ 41″ incl. the bends), published width along the peg and thickness.
 for(const b of MONSTER_BANDS){
  const s=build(`rogue-monster-band-${b.n}`),latex=bounds(s,x=>/latex/.test(x.name));
  near(size(latex,1),b.width*IN,.01,`#${b.n} width`);near(-latex.min[2]+3,41*IN,.012*41*IN,`#${b.n} hanging length ≈ 41″`);
  const d=monsterBandDrape(b.n);near(d.thick,b.thick*IN,1e-9,`#${b.n} thickness`);free(s);
 }
 // elitefts pack: widths 0.5 / 1.25 / 1.75 / 2.5″ along the peg, eight bands.
 const pack=build('elitefts-pro-resistance-band-pack');
 for(const [re,w] of [[/Mini/,.5],[/Light/,1.25],[/Average/,1.75],[/Strong/,2.5]] as const)near(size(bounds(pack,s=>re.test(s.name)),1),w*IN,.01,`elitefts ${re} width`);
 assert.equal(elitePackDrapes().length,8);free(pack);
 // Fat Gripz: 2.25″ / 2.75″ OD, 1.1″ bore, 4.75″ long (measured along the tilted axis).
 for(const [id,od] of [['fat-gripz',2.25],['fat-gripz-extreme',2.75]] as const){
  const pose=gripzPose(od*IN);near(pose.ro*2,od*IN,1e-9,`${id} OD`);near(pose.rb*2,1.1*IN,1e-9,`${id} bore`);
  const s=build(id),b=bounds(s,x=>/sleeve/.test(x.name)),th=pose.theta*Math.PI/180;
  near(size(b,0),od*IN,1.5,`${id} width across`);near((size(b,1)-od*IN*Math.sin(th))/Math.cos(th),4.75*IN,1,`${id} length`);free(s);
 }
 // Collars: Titan 3.675″ × 1.5″, Rogue USA 1.5″, HG 1.875″, BoS 1″ × 3″ (each of the pair).
 let b=measure('titan-twistlock-pro-collars',s=>/faces|rims/.test(s.name));near(size(b,0),3.675*IN,.5,'Titan OD');near(size(b,1),2*1.5*IN+1.5,.5,'Titan pair width');
 b=measure('rogue-usa-aluminum-collars',s=>/billet/.test(s.name));near(size(b,1),2*1.5*IN+1.5,.3,'Rogue USA pair width');
 b=measure('rogue-hg-2-collars',s=>/bodies/.test(s.name));near(size(b,1),2*1.875*IN,.3,'HG pair width');
 b=measure('bells-of-steel-magnetic-clamp-collars',s=>/bodies/.test(s.name));near(size(b,0),3*IN,1.5,'BoS OD');near(size(b,1),2*IN+1,.3,'BoS pair width');
 // Magpin: 24.5 mm × 5.5″ pin, 2″ × ¾″ cap.
 const mp=build('fringe-sport-magpin'),pin=bounds(mp,s=>/pin$/.test(s.name)&&/Stainless/.test(s.name)),cap=bounds(mp,s=>/cap/.test(s.name));
 near(size(pin,0),MAGPIN.pin,.2,'magpin pin diameter');near(size(pin,2),5.5*IN,.5,'magpin pin length');near(size(cap,0),2*IN,.1,'magpin cap diameter');near(size(cap,2),.75*IN,.1,'magpin cap thickness');free(mp);
 // Oak Club MagPin 3: 4-1/2″ usable shaft past the head.
 b=measure('oak-club-magpin-3',s=>/shafts/.test(s.name));assert.ok(size(b,0)>2*4.5*IN,'MagPin 3 shafts give 4-1/2″ each');
 // REP rings: 1.25″ grip.
 b=measure('rep-wood-gymnastic-rings',s=>/rings/.test(s.name));near(size(b,1),34.5+1.25*IN,.5,'two 1.25″ rings side by side');near(size(b,0),RINGS.id+2*RINGS.grip,.5,'ring OD');
 // Pillow belt: 36″ × 6.5″ × 1.5″ pad folded in half.
 b=measure('spud-pillow-belt-squat-belt',s=>/pad/.test(s.name));near(size(b,0),PILLOW.width,.5,'pillow width 6.5″');near(size(b,1),2*PILLOW.thick+3,.5,'two 1.5″ layers');
 // Inzer: 4″ × 10 mm belt.
 b=measure('inzer-forever-lever-belt-10mm',s=>/suede/.test(s.name));near(size(b,1),INZER.width,.1,'belt 4″ wide');
 // Wrist wraps 24″ × 3″ (plus the thumb loop), Ohio straps 22.5″ × 1.5″.
 b=measure('rogue-wrist-wraps-2',s=>/wraps$/.test(s.name));near(size(b,2),WRAPS.length-30,3,'wrap body length');
 b=measure('rogue-ohio-lifting-straps');near(-b.min[2]+3,OHIO.length,15,'Ohio strap hangs its 22.5″ length');
 // SR-1: 6.75″ handles (plus bearing cap).
 b=measure('rogue-sr-1-speed-rope',s=>/handles/.test(s.name));near(size(b,2),SR1.handleLen-20+3,1,'SR-1 grip length');
 // Captains of Crush: two 1″ knurled handles.
 const coc=build('ironmind-captains-of-crush-no-1'),handles=coc.find(s=>/handles/.test(s.name))!;near(handles.solid.volume(),2*Math.PI*12.7**2*(99-16.5)+2*Math.PI*((12.7**2+11.7**2+12.7*11.7)/3)*13,1500,'CoC handle volume');free(coc);
});

test('the family hangs on a pegboard, and long accessories reserve the hooks below them',()=>{
 const doc0=addWallItem(createAssembly(),'pegboard-panel',{wall:'back',position:[-1500,1500]});
 let doc=placeHang(doc0,'keppi-opencollar',{panel:'wall-1',slot:5});
 doc=placeHang(doc,'rogue-monster-band-4',{panel:'wall-1',slot:1});
 assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(doc))).hangItems,doc.hangItems);
 assert.throws(()=>validateHangItems([{id:'hang-9',part:'rogue-monster-band-9',panel:'wall-1',slot:0}],doc.wallItems!),/Unknown/);
 // A 41″ band drops past the bottom of the panel, so nothing else may hang below it in its column.
 assert.deepEqual(freeSlots(doc,'fringe-sport-magpin').filter(s=>s.slot%11===1),[],'the band blocks its column');
 assert.ok(freeSlots(doc,'ironmind-captains-of-crush-no-1').length>20,'small accessories still fit elsewhere');
});
