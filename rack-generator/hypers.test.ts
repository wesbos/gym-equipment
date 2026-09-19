import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {PARTS, HYPER_LOADS, hyperLoadOptions, SCOUT, RH2, HPND, ECON_HPND, GH1, ABRAM, REP_GHD_SPEC, DONKEY_SPEC, REVERSE_HAMMER_SPEC, TITAN_RC_SPEC, BODY_SOLID_SPEC, HYPER_PRO, hyperProStations, inch} from './floor-parts/hypers.ts';
import {definitions} from './parts/hypers.ts';
import {coerceFloorParams, floorOptions, resolveBy, validateFloorParams} from './floor-registry.ts';
import {plateStackLength} from './plates.ts';
import type {NumericParams, SolidPart} from './types.ts';
const api=await Module();api.setup();
const part=(id:string)=>{const p=PARTS.find(x=>x.id===id);assert.ok(p,id);return p!;};
const build=(id:string,params:NumericParams={})=>definitions.find(d=>d.id===id)!.build(api,{...part(id).defaults,...params});
const bbox=(parts:SolidPart[],filter?:(p:SolidPart)=>boolean)=>{const s=parts.filter(p=>!filter||filter(p));if(!s.length)return undefined;const u=api.Manifold.union(s.map(p=>p.solid)),b=u.boundingBox();u.delete();return b;};
const free=(parts:SolidPart[])=>{for(const p of parts)p.solid.delete();};
const near=(a:number,b:number,tol:number,msg:string)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a.toFixed(1)} vs ${b.toFixed(1)}`);
/** Defaults, then first / middle / last of every param (dependent options resolved against the defaults). */
function sweep(id:string){
 const p=part(id),sets:NumericParams[]=[p.defaults];
 for(const param of p.params){const o=floorOptions(param,p.defaults) as readonly number[];for(const v of [o[0],o[o.length>>1],o.at(-1)!])sets.push(coerceFloorParams(p,{...p.defaults,[param.key]:v}));}
 return sets;
}
test('every hyper, GHD and back extension builds closed solids whose bounds equal the footprint',()=>{
 for(const p of PARTS){
  assert.equal(p.section,'Machines',p.id);assert.ok(p.vendor?.reconstruction && /trademarks belong to/.test(p.description ?? ''),p.id);
  for(const params of sweep(p.id)){
   const t=performance.now(),parts=build(p.id,params),ms=performance.now()-t,tag=`${p.id} ${JSON.stringify(params)}`;
   for(const s of parts){assert.ok(!s.solid.isEmpty() && s.solid.status()==='NoError' && s.solid.volume()>0,`${tag} ${s.name}`);assert.notEqual(s.role,'frame',`${tag} ${s.name}: factory colours`);}
   const b=bbox(parts)!,fp=resolveBy(p.footprint,params),tris=parts.reduce((n,s)=>n+s.solid.numTri(),0);
   near(b.max[0]-b.min[0],fp.width,.5,`${tag} width`);near(b.max[1]-b.min[1],fp.depth,.5,`${tag} depth`);
   near(b.min[0],-b.max[0],.5,`${tag} centred X`);near(b.min[1],-b.max[1],.5,`${tag} centred Y`);
   assert.ok(b.min[2]>=-1e-6,`${tag} above the floor`);assert.ok(tris<80000,`${tag} ${tris} triangles`);assert.ok(ms<3000,`${tag} ${ms.toFixed(0)} ms`);
   free(parts);
  }
 }
});
test('params validate strictly and coerce dependent options',()=>{
 for(const p of PARTS){
  assert.deepEqual(validateFloorParams(p,{}),p.defaults,p.id);
  for(const bad of [{bogus:1},{[p.params[0].key]:-999},{[p.params[0].key]:'1'}])assert.throws(()=>validateFloorParams(p,bad),/./,`${p.id} ${JSON.stringify(bad)}`);
 }
 const pro=part('freak-athlete-hyper-pro');
 assert.deepEqual(validateFloorParams(pro,{setup:0,incline:45,station:1}),{setup:0,incline:45,station:1});
 assert.throws(()=>validateFloorParams(pro,{setup:1,incline:20}),/incline/i,'GHD setup has no incline');
 assert.deepEqual(coerceFloorParams(pro,{setup:1,incline:30,station:1}),{setup:1,incline:0,station:1});
 assert.ok(hyperProStations({setup:0,incline:45}).length<hyperProStations({setup:0,incline:0}).length,'steep inclines drop the stations that would push the footplate into the floor');
 assert.equal(hyperProStations({setup:0,incline:0}).length,12);
});
test('plate loads respect horn length and swing-arm capacity',()=>{
 const idx=(label:string)=>HYPER_LOADS.findIndex(l=>l.label===label);
 const scout=hyperLoadOptions(SCOUT.horn,SCOUT.capacity);
 assert.ok(scout.includes(idx('45 lb per side')) && !scout.includes(idx('2 × 45 lb per side')),'Scout: 176 lb arm limit');
 assert.ok(!scout.includes(idx('2 × 20 kg bumpers per side')),'Scout: 5.25 in posts');
 assert.ok(hyperLoadOptions(RH2.pend.horn,RH2.pend.capacity).includes(idx('2 × 20 kg bumpers per side')),'RH-2: 10.5 in horns take two bumpers');
 for(const l of HYPER_LOADS)if(l.plates.length)assert.ok(plateStackLength(l.plates)>0);
 // Loaded plates hang on the horns and swing back with the arm.
 const rest=build('rogue-rh-2-reverse-hyper',{load:idx('45 lb per side')}),swung=build('rogue-rh-2-reverse-hyper',{load:idx('45 lb per side'),swing:45});
 const plates=(ps:SolidPart[])=>bbox(ps,s=>/^Horn .* plate-/.test(s.name))!;
 const a=plates(rest),b=plates(swung),shift=(ps:SolidPart[])=>(bbox(ps)!.max[1]+bbox(ps)!.min[1])/2;
 near(a.max[0]-a.min[0],2*(RH2.pend.arm[0]/2+RH2.pend.collar+38.1),.5,'two 45 lb plates straddle the arm');
 assert.ok(b.max[2]>a.max[2]+100,'swinging back lifts the plates');
 assert.ok((b.min[1]+b.max[1])/2-shift(swung)<(a.min[1]+a.max[1])/2-shift(rest)-200,'and moves them rearward');
 free(rest);free(swung);
});
test('published dimensions come out of the builds',()=>{
 const vinyl=(s:SolidPart)=>/upholstery|vinyl pads/i.test(s.name);
 const check=(id:string,params:NumericParams,fn:(parts:SolidPart[],b:ReturnType<typeof bbox>)=>void)=>{const parts=build(id,params);fn(parts,bbox(parts));free(parts);};
 check('rogue-westside-scout-hyper',{},(ps,b)=>{
  near(b!.max[2],inch(46.5),.5,'Scout pad top 46.5 in');near(b!.max[0]-b!.min[0],inch(32),.5,'32 in over the pop pins');
  const pad=bbox(ps,vinyl)!;near(pad.max[0]-pad.min[0],inch(27.5),.5,'pad 27.5 in wide');near(pad.max[1]-pad.min[1],inch(21.5),.5,'pad 21.5 in deep');near(pad.max[2]-pad.min[2],inch(2),.5,'pad 2 in thick');
  const grips=bbox(ps,s=>/foam/i.test(s.name))!;near(grips.max[1]-pad.min[1],inch(38),30,'38 in long including the handles');
  const posts=bbox(ps,s=>/horns/i.test(s.name))!;near((posts.max[0]-posts.min[0])/2-SCOUT.arm/2-SCOUT.collar,inch(5.25),.5,'5.25 in loadable posts');
 });
 check('freak-athlete-hyper-pro',{},(_,b)=>{near(b!.max[1]-b!.min[1],inch(60),.5,'Hyper Pro 60 in long');near(b!.max[0]-b!.min[0],inch(22),.5,'22 in wide');near(b!.max[2],inch(23),.5,'23 in high flat');});
 check('freak-athlete-hyper-pro',{incline:45},(_,b)=>assert.ok(b!.max[2]>1000,'45° incline lifts the pad end'));
 check('freak-athlete-hyper-pro',{setup:1},(_,b)=>assert.ok(b!.max[2]>1000,'GHD setup raises the carriage'));
 {const lo=build('freak-athlete-hyper-pro',{station:1}),hi=build('freak-athlete-hyper-pro',{station:12}),fp=(ps:SolidPart[])=>bbox(ps,s=>/etch/i.test(s.name))!;near(fp(lo).min[1]-fp(hi).min[1],11*HYPER_PRO.pitch,.5,'12 roller stations');free(lo);free(hi);}
 for(const [id,spec] of [['rogue-rh-2-reverse-hyper',RH2],['titan-h-pnd-reverse-hyper',HPND],['titan-economy-h-pnd',ECON_HPND]] as const)check(id,{},(ps,b)=>{
  near(b!.max[0]-b!.min[0],2*(spec.base.railX+spec.base.rail[0]/2),.5,`${id} width`);near(bbox(ps,vinyl)!.max[2],inch(44.5),.5,`${id} 44.5 in pad`);
  const horn=bbox(ps,s=>/horns/i.test(s.name))!;near((horn.max[0]-horn.min[0])/2-spec.pend.arm[0]/2-spec.pend.collar,spec.pend.horn,.5,`${id} loadable horn`);
 });
 check('rogue-rh-2-reverse-hyper',{},(_,b)=>near(b!.max[0]-b!.min[0],inch(40),.5,'RH-2 40 in wide'));
 check('rogue-rh-2-reverse-hyper',{},(ps)=>{const pad=bbox(ps,vinyl)!;near(pad.max[2]-pad.min[2],inch(3),.5,'RH-2 3 in pad');});
 check('titan-h-pnd-reverse-hyper',{},(_,b)=>near(b!.max[0]-b!.min[0],inch(41),.5,'H-PND 41 in'));
 check('titan-economy-h-pnd',{},(_,b)=>near(b!.max[0]-b!.min[0],inch(39),.5,'Economy 39 in'));
 check('rogue-gh-1-ghd',{},(ps,b)=>{near(b!.max[1]-b!.min[1],inch(68.5),.5,'GH-1 68.5 in');near(b!.max[0]-b!.min[0],inch(45),.5,'45 in');near(b!.max[2],inch(49),.5,'49 in footplate');near(bbox(ps,vinyl)!.max[2],inch(43),.5,'43 in pad');});
 check('rogue-abram-ghd-2',{},(ps,b)=>{near(b!.max[0]-b!.min[0],inch(44.5),.5,'Abram 44.5 in');near(b!.max[1]-b!.min[1],inch(73),60,'Abram 73 in long (plus wheels)');const pad=bbox(ps,vinyl)!;near(pad.max[2]-pad.min[2],inch(9),.5,'9 in to apex');near(pad.max[1]-pad.min[1],inch(16),.5,'16 in pad');near(pad.max[0]-pad.min[0],2*inch(10.5)+ABRAM.pad.gap,.5,'2 × 10.5 in');});
 check('rep-glute-ham-developer',{},(ps,b)=>{near(b!.max[0]-b!.min[0],inch(36),.5,'REP 36 in');near(b!.max[1]-b!.min[1],inch(70),60,'REP 70 in (plus wheels)');near(bbox(ps,vinyl)!.max[2],inch(42),.5,'42 in pads');});
 check('rogue-donkey',{},(ps,b)=>{near(b!.max[1]-b!.min[1],inch(73),.5,'Donkey 73 in');near(b!.max[0]-b!.min[0],inch(44),.5,'44 in');near(b!.max[2],inch(54.5),.5,'54.5 in footplate');near(bbox(ps,vinyl)!.max[2],inch(45),.5,'45 in pad');const pad=bbox(ps,vinyl)!;near(pad.max[0]-pad.min[0],inch(34),.5,'34 in across');});
 check('bells-of-steel-reverse-hammer',{},(ps)=>near(bbox(ps,vinyl)!.max[2],inch(42),.5,'Reverse Hammer pad (42 in estimate)'));
 check('titan-roman-chair-back-hyperextension',{},(_,b)=>{near(b!.max[1]-b!.min[1],inch(52),.5,'Titan 52 in');near(b!.max[0]-b!.min[0],inch(32),.5,'32 in');});
 check('body-solid-ghyp345-back-hyperextension',{},(_,b)=>{near(b!.max[1]-b!.min[1],inch(53),.5,'Body-Solid 53 in');near(b!.max[0]-b!.min[0],inch(29),.5,'29 in');near(b!.max[2],inch(36),40,'about 36 in high');});
 // 45° pads travel along the published footplate-to-pad range.
 for(const [id,spec] of [['titan-roman-chair-back-hyperextension',TITAN_RC_SPEC],['body-solid-ghyp345-back-hyperextension',BODY_SOLID_SPEC]] as const){
  const lo=build(id,{setting:spec.settings[0]}),hi=build(id,{setting:spec.settings.at(-1)!}),top=(ps:SolidPart[])=>bbox(ps,vinyl)!.max[2];
  near(top(hi)-top(lo),inch(spec.settings.at(-1)!-spec.settings[0])*Math.SQRT1_2,1,`${id} 45° travel`);free(lo);free(hi);
 }
 // GHD roller stations move the carriage by the published pitch.
 for(const [id,spec] of [['rogue-gh-1-ghd',GH1],['rogue-abram-ghd-2',ABRAM],['rep-glute-ham-developer',REP_GHD_SPEC],['rogue-donkey',{stations:DONKEY_SPEC.ghd.stations}],['bells-of-steel-reverse-hammer',{stations:REVERSE_HAMMER_SPEC.ghd.stations}]] as const){
  const a=build(id,{station:1}),z=build(id,{station:spec.stations.n}),rollers=(ps:SolidPart[])=>bbox(ps,s=>/roller end caps/i.test(s.name))!;
  near(rollers(z).min[1]-rollers(a).min[1],(spec.stations.n-1)*spec.stations.pitch,.5,`${id} stations`);free(a);free(z);
 }
});
